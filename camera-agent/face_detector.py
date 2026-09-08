import cv2
import numpy as np
from insightface.app import FaceAnalysis
from typing import List, Tuple
from models import BBox, DetectedFace, FrameDimensions
import logging

logger = logging.getLogger(__name__)

class FaceDetector:
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

        # Pure face detection mode: ONLY run SCRFD det_10g (skip heavy 512D ArcFace, 3D landmarks, and genderage)
        self.app = FaceAnalysis(
            name='buffalo_l', 
            root='~/.insightface', 
            providers=providers,
            allowed_modules=['detection']
        )
        self.app.prepare(ctx_id=ctx_id, det_size=det_size)
        self.min_confidence = min_confidence
        logger.info(f"FaceDetector initialized (Pure Detection Mode), providers={providers}, ctx_id={ctx_id}, det_size={det_size}")

    def detect_faces_fast(self, frame: np.ndarray) -> List[Tuple[int, int, int, int, float]]:
        """
        Ultra-fast face detection for real-time tracking (zero image encoding, zero crop overhead).
        Returns: List of (x, y, w, h, confidence)
        """
        h, w = frame.shape[:2]
        faces = self.app.get(frame)
        fast_boxes = []

        for face in faces:
            conf = float(face.det_score)
            if conf < self.min_confidence:
                continue

            box = face.bbox.astype(int)
            x1, y1, x2, y2 = box[0], box[1], box[2], box[3]

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

            fast_boxes.append((int(x1), int(y1), int(crop_w), int(crop_h), float(round(conf, 2))))

        return fast_boxes

    def prepare_ml_payload(self, frame: np.ndarray, fast_boxes: List[Tuple[int, int, int, int, float]]) -> Tuple[List[DetectedFace], bytes, FrameDimensions]:
        """
        Prepares face crops and thumbnail for backend DPO matching (throttled 1 FPS).
        Performs FIQA blur check and JPEG encoding.
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

        detected_faces = []
        from config import config

        for (x1, y1, crop_w, crop_h, conf) in fast_boxes:
            x2 = x1 + crop_w
            y2 = y1 + crop_h
            crop = frame[y1:y2, x1:x2]

            # FIQA: Blur Detection using Laplacian Variance
            gray_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            variance = cv2.Laplacian(gray_crop, cv2.CV_64F).var()
            if variance < config.blur_threshold:
                logger.debug(f"FIQA Reject: Face is too blurry (variance: {variance:.1f} < threshold: {config.blur_threshold})")
                continue

            _, crop_encoded = cv2.imencode('.jpg', crop, [cv2.IMWRITE_JPEG_QUALITY, 95])

            detected_faces.append(DetectedFace(
                confidence=conf,
                bbox=BBox(x=x1, y=y1, w=crop_w, h=crop_h),
                face_crop_bytes=crop_encoded.tobytes(),
                edge_embedding=None,
                edge_embedding_metadata=None
            ))

        return detected_faces, thumb_bytes, dims

    def process_frame(self, frame: np.ndarray) -> Tuple[List[DetectedFace], bytes, FrameDimensions]:
        """
        Backward-compatible method.
        """
        fast_boxes = self.detect_faces_fast(frame)
        return self.prepare_ml_payload(frame, fast_boxes)

def draw_face_boxes(frame: np.ndarray, detected_faces: List[DetectedFace]) -> np.ndarray:
    """
    Draws bounding boxes and confidence scores on the frame for live preview.
    Uses Green (>=0.8), Yellow (0.5-0.8), Red (<0.5).
    """
    out_frame = frame.copy()
    for face in detected_faces:
        x, y, w, h = face.bbox.x, face.bbox.y, face.bbox.w, face.bbox.h
        conf = face.confidence
        
        # Color status based on confidence
        if conf >= 0.8:
            color = (0, 255, 0) # Green in BGR
        elif conf >= 0.5:
            color = (0, 255, 255) # Yellow in BGR
        else:
            color = (0, 0, 255) # Red in BGR
            
        cv2.rectangle(out_frame, (x, y), (x + w, y + h), color, 2)
        
        label = f"Face {conf:.2f}"
        (text_w, text_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        
        # Draw background rectangle for text
        cv2.rectangle(out_frame, (x, max(0, y - text_h - 10)), (x + text_w, max(0, y)), color, -1)
        cv2.putText(out_frame, label, (x, max(0, y - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
        
    return out_frame
