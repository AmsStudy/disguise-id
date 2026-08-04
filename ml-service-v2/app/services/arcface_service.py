import os
import cv2
import numpy as np
import onnxruntime as ort
from insightface.app import FaceAnalysis
from app.config import settings
import threading

class ArcFaceService:
    def __init__(self):
        self._lock = threading.Lock()
        
        available = ort.get_available_providers()
        self.providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if "CUDAExecutionProvider" in available
            else ["CPUExecutionProvider"]
        )
        
        if settings.require_cuda and self.providers[0] != "CUDAExecutionProvider":
            raise RuntimeError("REQUIRE_CUDA is True but CUDAExecutionProvider is not available in onnxruntime.")
            
        self.ctx_id = 0 if self.providers[0] == "CUDAExecutionProvider" else -1
        
        root_dir = os.path.expanduser(settings.insightface_root)
        
        # In production, ensure we don't try to download by checking if model exists
        if settings.environment == "production":
            model_path = os.path.join(root_dir, "models", settings.arcface_model)
            if not os.path.exists(model_path):
                raise RuntimeError(f"ArcFace model not found at {model_path}. Auto-download is disabled in production.")

        self.app = FaceAnalysis(
            name=settings.arcface_model,
            root=root_dir,
            allowed_modules=["detection", "recognition"],
            providers=self.providers,
        )
        self.app.prepare(
            ctx_id=self.ctx_id,
            det_thresh=settings.det_threshold,
            det_size=(settings.det_size, settings.det_size),
        )

    def select_primary_face(self, faces):
        if not faces:
            return None
        def area(face) -> float:
            bbox = np.asarray(face.bbox, dtype=np.float32)
            return float(max(0.0, bbox[2] - bbox[0]) * max(0.0, bbox[3] - bbox[1]))
        return max(faces, key=area)

    def detect_and_extract(self, image_rgb: np.ndarray):
        with self._lock:
            # insightface expects BGR
            image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
            faces = self.app.get(image_bgr)
            
            face = self.select_primary_face(faces)
            if face is None:
                return None, None
                
            embedding = np.asarray(face.normed_embedding, dtype=np.float32)
            norm = float(np.linalg.norm(embedding))
            if not np.isfinite(norm) or norm <= 0:
                raise RuntimeError("Invalid ArcFace embedding generated.")
            embedding = embedding / norm
            
            metadata = {
                "face_count": int(len(faces)),
                "det_score": float(face.det_score),
                "bbox": np.asarray(face.bbox, dtype=float).tolist(),
            }
            return embedding, metadata

    def crop_primary_face(self, image_rgb: np.ndarray, margin_ratio: float):
        with self._lock:
            image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
            faces = self.app.get(image_bgr)
            face = self.select_primary_face(faces)

            if face is None:
                return None, None

            height, width = image_rgb.shape[:2]
            x1, y1, x2, y2 = np.asarray(face.bbox, dtype=np.float32)

            box_width = x2 - x1
            box_height = y2 - y1
            margin_x = box_width * margin_ratio
            margin_y = box_height * margin_ratio

            left = max(0, int(np.floor(x1 - margin_x)))
            top = max(0, int(np.floor(y1 - margin_y)))
            right = min(width, int(np.ceil(x2 + margin_x)))
            bottom = min(height, int(np.ceil(y2 + margin_y)))

            if right <= left or bottom <= top:
                return None, None

            crop = image_rgb[top:bottom, left:right].copy()
            metadata = {
                "face_count": int(len(faces)),
                "selected_bbox_xyxy": [left, top, right, bottom],
                "det_score": float(face.det_score),
                "crop_shape": list(crop.shape),
            }
            return crop, metadata
