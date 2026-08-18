import requests
import logging
import queue
import threading
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
        
        # Bounded queues to prevent memory leaks if backend is slow/offline
        self.inference_queue = queue.Queue(maxsize=50)
        self.tracking_queue = queue.Queue(maxsize=100)
        
        # Start background daemon threads
        self.worker_thread = threading.Thread(target=self._inference_worker, daemon=True)
        self.worker_thread.start()
        
        self.tracking_thread = threading.Thread(target=self._tracking_worker, daemon=True)
        self.tracking_thread.start()
        
    def _inference_worker(self):
        """Background thread that pops tasks from inference_queue and uploads them."""
        while True:
            try:
                task = self.inference_queue.get()
                if task is None: 
                    break
                
                response = requests.post(
                    self.endpoint,
                    headers=self.headers,
                    data=task['data'],
                    files=task['files'],
                    timeout=5.0
                )
                
                if response.status_code == 429:
                    logger.warning(f"Backend returned 429 Too Many Requests for capture {task['data'].get('capture_id')}")
                    import time
                    time.sleep(1.0)  # Back off 1 second when rate limited
                else:
                    response.raise_for_status()
                    job_id = response.json().get('data', {}).get('job_id')
                    logger.debug(f"Successfully uploaded face to backend. Job ID: {job_id}")
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to upload face to backend: {e}")
            except Exception as e:
                logger.error(f"Unexpected error in inference worker: {e}")
            finally:
                self.inference_queue.task_done()

    def _tracking_worker(self):
        """Background thread that pops tracking data and sends to backend."""
        while True:
            try:
                task = self.tracking_queue.get()
                if task is None:
                    break
                    
                url = f"{self.backend_url}/api/v1/camera-agent/tracking"
                requests.post(url, headers=self.headers, json=task['data'], timeout=1.0)
            except Exception:
                pass
            finally:
                self.tracking_queue.task_done()
                
    def upload_face(self, face: DetectedFace, frame_thumb_bytes: bytes, frame_dims: FrameDimensions, capture_id: str, timestamp: str, face_index: int):
        """
        Pushes a face upload task to the non-blocking bounded queue.
        If the queue is full (backend is slow), the frame is dropped to prevent freezing the camera.
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
        
        if face.edge_embedding and face.edge_embedding_metadata:
            import json
            data['edge_embedding'] = json.dumps(face.edge_embedding)
            data['edge_embedding_metadata'] = json.dumps(face.edge_embedding_metadata)
        
        try:
            self.inference_queue.put_nowait({'files': files, 'data': data})
            return True
        except queue.Full:
            logger.warning(f"Inference queue full! Dropping face upload for capture {capture_id} to prevent freezing.")
            return False

    def upload_live_tracking(self, bboxes, timestamp, frame_w, frame_h):
        """
        Pushes live tracking data to the non-blocking bounded queue.
        """
        data = {
            "timestamp": timestamp,
            "bboxes": bboxes,
            "frame_w": frame_w,
            "frame_h": frame_h
        }
        try:
            self.tracking_queue.put_nowait({'data': data})
        except queue.Full:
            pass # Silently drop tracking frames if backend is overwhelmed
