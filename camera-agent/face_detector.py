import cv2
import numpy as np
from insightface.app import FaceAnalysis
from typing import List, Tuple
from models import BBox, DetectedFace, FrameDimensions
import logging

logger = logging.getLogger(__name__)

class FaceDetector:
    """
    Ultra-lightweight Edge Face Detector.
    Strictly performs RetinaFace face detection and frame cropping.
    Does NOT load heavy ArcFace/Recognition models on the edge.
    """
    PAD_RATIO = 0.3
    MIN_FACE_SIZE = 40

    def __init__(self, det_size=(640, 640), min_confidence=0.5):
        import onnxruntime
        available_providers = onnxruntime.get_available_providers()

        providers = []
        ctx_id = -1
        if 'CUDAExecutionProvider' in available_providers:
            providers.append('CUDAExecutionProvider')
            ctx_id = 0
        providers.append('CPUExecutionProvider')

        # Load ONLY the lightweight detection module (RetinaFace)
        self.app = FaceAnalysis(
            name='buffalo_s',
            allowed_modules=['detection'],
            root='~/.insightface',
            providers=providers
        )
        try:
            self.app.prepare(ctx_id=ctx_id, det_size=det_size)
        except Exception:
            # Fallback to buffalo_l with detection only if buffalo_s is not cached
            self.app = FaceAnalysis(
                name='buffalo_l',
                allowed_modules=['detection'],
                root='~/.insightface',
                providers=providers
            )
            self.app.prepare(ctx_id=ctx_id, det_size=det_size)

        self.min_confidence = min_confidence
        logger.info(f"Ultra-lightweight FaceDetector initialized with allowed_modules=['detection'], det_size={det_size}")

    def process_frame(self, frame: np.ndarray) -> Tuple[List[DetectedFace], bytes, FrameDimensions]:
        """
        Detects faces in a frame, extracts padded crops, and generates a thumbnail.
        Returns: (List of DetectedFace, thumbnail bytes, FrameDimensions)
        """
        h, w = frame.shape[:2]
        dims = FrameDimensions(w=w, h=h)

        # Generate thumbnail (max 1280x720)
        scale = min(1280/w, 720/h, 1.0)
        if scale < 1.0:
            thumb = cv2.resize(frame, (int(w*scale), int(h*scale)))
        else:
            thumb = frame.copy()

        _, thumb_encoded = cv2.imencode('.jpg', thumb, [cv2.IMWRITE_JPEG_QUALITY, 60])
        thumb_bytes = thumb_encoded.tobytes()

        # Downscale for ultra-fast real-time detection on edge
        det_scale = min(640.0 / max(w, h), 1.0)
        if det_scale < 1.0:
            det_frame = cv2.resize(frame, (int(w * det_scale), int(h * det_scale)))
        else:
            det_frame = frame

        faces = self.app.get(det_frame)
        detected_faces = []

        from config import config

        for face in faces:
            if face.det_score < self.min_confidence:
                continue

            # Rescale box back to original frame dimensions
            box = (face.bbox / det_scale).astype(int)
            x1, y1, x2, y2 = box[0], box[1], box[2], box[3]

            # Add padding around tight bbox from RetinaFace
            face_w = x2 - x1
            face_h = y2 - y1
            pad_x = int(face_w * self.PAD_RATIO)
            pad_y = int(face_h * self.PAD_RATIO)
            x1 = max(0, x1 - pad_x)
            y1 = max(0, y1 - pad_y)
            x2 = min(w, x2 + pad_x)
            y2 = min(h, y2 + pad_y)

            crop_w = x2 - x1
            crop_h = y2 - y1

            if crop_w < self.MIN_FACE_SIZE or crop_h < self.MIN_FACE_SIZE:
                continue

            crop = frame[y1:y2, x1:x2]
            
            # FIQA: Blur Detection using Laplacian Variance
            gray_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            variance = cv2.Laplacian(gray_crop, cv2.CV_64F).var()
            if variance < config.blur_threshold:
                continue
                
            _, crop_encoded = cv2.imencode('.jpg', crop, [cv2.IMWRITE_JPEG_QUALITY, 95])

            detected_faces.append(DetectedFace(
                confidence=float(face.det_score),
                bbox=BBox(x=x1, y=y1, w=crop_w, h=crop_h),
                face_crop_bytes=crop_encoded.tobytes(),
                edge_embedding=None,
                edge_embedding_metadata=None
            ))

        return detected_faces, thumb_bytes, dims

def draw_face_boxes(frame: np.ndarray, detected_faces: List[DetectedFace]) -> np.ndarray:
    """
    Draws tactical bounding boxes, corner brackets, and detection labels directly on the video frame.
    """
    out_frame = frame.copy()
    for face in detected_faces:
        x, y, w, h = int(face.bbox.x), int(face.bbox.y), int(face.bbox.w), int(face.bbox.h)
        conf = float(face.confidence)
        
        # Color: Bright Cyan/Green in BGR
        color = (0, 255, 128) if conf >= 0.8 else (0, 229, 255) if conf >= 0.5 else (0, 120, 255)
        
        # Draw bounding box
        cv2.rectangle(out_frame, (x, y), (x + w, y + h), color, 2)
        
        # Draw corner brackets for tactical surveillance look
        corner_len = max(12, min(24, w // 4, h // 4))
        th = 3
        # Top-left
        cv2.line(out_frame, (x, y), (x + corner_len, y), color, th)
        cv2.line(out_frame, (x, y), (x, y + corner_len), color, th)
        # Top-right
        cv2.line(out_frame, (x + w, y), (x + w - corner_len, y), color, th)
        cv2.line(out_frame, (x + w, y), (x + w, y + corner_len), color, th)
        # Bottom-left
        cv2.line(out_frame, (x, y + h), (x + corner_len, y + h), color, th)
        cv2.line(out_frame, (x, y + h), (x, y + h - corner_len), color, th)
        # Bottom-right
        cv2.line(out_frame, (x + w, y + h), (x + w - corner_len, y + h), color, th)
        cv2.line(out_frame, (x + w, y + h), (x + w, y + h - corner_len), color, th)
        
        # Label Badge
        label = f"FACE {int(conf * 100)}%"
        (text_w, text_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
        badge_y = max(0, y - text_h - 8)
        cv2.rectangle(out_frame, (x, badge_y), (x + text_w + 10, badge_y + text_h + 8), color, -1)
        cv2.putText(out_frame, label, (x + 5, badge_y + text_h + 3), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
        
    return out_frame
