import requests
import logging
from config import config
from models import DetectedFace, FrameDimensions

logger = logging.getLogger(__name__)

class BackendUploader:
    def __init__(self):
        self.backend_url = config.backend_url.rstrip('/')
        self.endpoint = f"{self.backend_url}/api/v1/inference/frame"
        self.headers = {
            "X-Api-Key": config.api_key
        }
        
    def upload_face(self, face: DetectedFace, frame_thumb_bytes: bytes, frame_dims: FrameDimensions, capture_id: str, timestamp: str, face_index: int):
        """
        Uploads a single face crop and the full frame thumbnail to the backend.
        We send one request per face to reuse the single-face inference pipeline.
        """
        files = {
            'face_crop': ('face_crop.jpg', face.face_crop_bytes, 'image/jpeg'),
            'frame_thumb': ('frame_thumb.jpg', frame_thumb_bytes, 'image/jpeg')
        }
        
        data = {
            'capture_id': capture_id,
            'captured_at': timestamp,
            'face_index': str(face_index),
            'confidence': str(face.confidence),
            'bbox_x': str(face.bbox.x),
            'bbox_y': str(face.bbox.y),
            'bbox_w': str(face.bbox.w),
            'bbox_h': str(face.bbox.h),
            'frame_w': str(frame_dims.w),
            'frame_h': str(frame_dims.h)
        }
        
        try:
            # We don't wait for inference (it's 202 async on backend)
            # Timeout is small to avoid blocking the agent
            response = requests.post(
                self.endpoint,
                headers=self.headers,
                data=data,
                files=files,
                timeout=5.0
            )
            if response.status_code == 429:
                logger.warning(f"Backend returned 429 Too Many Requests for capture {capture_id}")
                return False
                
            response.raise_for_status()
            logger.debug(f"Successfully uploaded face to backend. Job ID: {response.json().get('data', {}).get('job_id')}")
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to upload face to backend: {e}")
            return False
