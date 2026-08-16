import cv2
import numpy as np
from insightface.app import FaceAnalysis
from typing import List, Tuple
from models import BBox, DetectedFace, FrameDimensions
import logging

logger = logging.getLogger(__name__)

class FaceDetector:
    PAD_RATIO = 1.0
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

        # We use InsightFace buffalo_l for face detection
        self.app = FaceAnalysis(name='buffalo_l', root='~/.insightface', providers=providers)
        self.app.prepare(ctx_id=ctx_id, det_size=det_size)
        self.min_confidence = min_confidence
        logger.info(f"FaceDetector initialized with buffalo_l, providers={providers}, ctx_id={ctx_id}, det_size={det_size}")

    def process_frame(self, frame: np.ndarray) -> Tuple[List[DetectedFace], bytes, FrameDimensions]:
        """
        Detects faces in a frame, extracts crops, and generates a thumbnail.
        Returns: (List of DetectedFace, thumbnail bytes, FrameDimensions)
        """
        h, w = frame.shape[:2]
        dims = FrameDimensions(w=w, h=h)

        # Generate thumbnail (e.g. max 1280x720)
        scale = min(1280/w, 720/h, 1.0)
        if scale < 1.0:
            thumb = cv2.resize(frame, (int(w*scale), int(h*scale)))
        else:
            thumb = frame.copy()

        _, thumb_encoded = cv2.imencode('.jpg', thumb, [cv2.IMWRITE_JPEG_QUALITY, 60])
        thumb_bytes = thumb_encoded.tobytes()

        import time
        start_t = time.time()
        faces = self.app.get(frame)
        ext_ms = int((time.time() - start_t) * 1000)
        detected_faces = []

        from config import config

        for face in faces:
            if face.det_score < self.min_confidence:
                continue

            box = face.bbox.astype(int)
            x1, y1, x2, y2 = box[0], box[1], box[2], box[3]

            # --- FIX: Add padding around the tight bbox from InsightFace ---
            # Without padding, crops are too tight and miss chin/forehead
            face_w = x2 - x1
            face_h = y2 - y1
            pad_x = int(face_w * self.PAD_RATIO)
            pad_y = int(face_h * self.PAD_RATIO)
            x1 = max(0, x1 - pad_x)
            y1 = max(0, y1 - pad_y)
            x2 = min(w, x2 + pad_x)
            y2 = min(h, y2 + pad_y)
            # -----------------------------------------------------------------

            crop_w = x2 - x1
            crop_h = y2 - y1

            # FIX: Increase minimum face size (30px is too small for biometric accuracy)
            # At 80x80, the VAE model gets meaningful input. Below that, upscaling causes noise.
            if crop_w < self.MIN_FACE_SIZE or crop_h < self.MIN_FACE_SIZE:
                logger.debug(f"Skipping small face: {crop_w}x{crop_h}px (min {self.MIN_FACE_SIZE}x{self.MIN_FACE_SIZE})")
                continue

            crop = frame[y1:y2, x1:x2]
            
            # --- FIQA: Blur Detection using Laplacian Variance ---
            gray_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            variance = cv2.Laplacian(gray_crop, cv2.CV_64F).var()
            if variance < config.blur_threshold:
                logger.debug(f"FIQA Reject: Face is too blurry (variance: {variance:.1f} < threshold: {config.blur_threshold})")
                continue
                
            _, crop_encoded = cv2.imencode('.jpg', crop, [cv2.IMWRITE_JPEG_QUALITY, 95])
            
            edge_emb = None
            edge_meta = None
            if config.edge_embedding_shadow_enabled:
                if hasattr(face, 'normed_embedding') and face.normed_embedding is not None:
                    emb = face.normed_embedding
                    if emb.shape == (512,) and np.all(np.isfinite(emb)):
                        norm = float(np.linalg.norm(emb))
                        edge_emb = emb.astype(float).tolist()
                        edge_meta = {
                            "source": "edge",
                            "model": "w600k_r50",
                            "model_package": "buffalo_l",
                            "model_sha256": "4C06341C33C2CA1F86781DAB0E829F88AD5B64BE9FBA56E56BC9EBDEFC619E43",
                            "dimension": 512,
                            "metric": "cosine",
                            "normalized": True,
                            "preprocessing_version": "insightface_app",
                            "extraction_ms": ext_ms
                        }

            detected_faces.append(DetectedFace(
                confidence=float(face.det_score),
                bbox=BBox(x=x1, y=y1, w=crop_w, h=crop_h),
                face_crop_bytes=crop_encoded.tobytes(),
                edge_embedding=edge_emb,
                edge_embedding_metadata=edge_meta
            ))

        return detected_faces, thumb_bytes, dims

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
