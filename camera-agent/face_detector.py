import cv2
import numpy as np
from insightface.app import FaceAnalysis
from typing import List, Tuple
from models import BBox, DetectedFace, FrameDimensions
import logging

logger = logging.getLogger(__name__)

class FaceDetector:
    def __init__(self, det_size=(640, 640), min_confidence=0.5):
        # We use antelopev2 or buffalo_l, but only need detection ('det')
        self.app = FaceAnalysis(name='buffalo_l', root='~/.insightface', providers=['CPUExecutionProvider'])
        self.app.prepare(ctx_id=0, det_size=det_size)
        self.min_confidence = min_confidence
        logger.info(f"FaceDetector initialized with det_size={det_size}")

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

        faces = self.app.get(frame)
        detected_faces = []
        
        for face in faces:
            if face.det_score < self.min_confidence:
                continue
                
            box = face.bbox.astype(int)
            # Expand bbox slightly for better alignment later
            x1, y1, x2, y2 = box[0], box[1], box[2], box[3]
            
            # Ensure within frame bounds
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(w, x2)
            y2 = min(h, y2)
            
            crop_w = x2 - x1
            crop_h = y2 - y1
            
            if crop_w < 30 or crop_h < 30:
                continue # Skip faces that are too small
                
            crop = frame[y1:y2, x1:x2]
            _, crop_encoded = cv2.imencode('.jpg', crop, [cv2.IMWRITE_JPEG_QUALITY, 90])
            
            detected_faces.append(DetectedFace(
                confidence=float(face.det_score),
                bbox=BBox(x=x1, y=y1, w=crop_w, h=crop_h),
                face_crop_bytes=crop_encoded.tobytes()
            ))
            
        return detected_faces, thumb_bytes, dims
