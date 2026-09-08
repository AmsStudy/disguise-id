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
        self.tracking_url = f"{self.backend_url}/api/v1/camera-agent/tracking"
        self.headers = {
            "X-Api-Key": config.api_key
        }
        
        # Dedicated HTTP sessions for inference vs live tracking
        self.inference_session = requests.Session()
        self.inference_session.headers.update(self.headers)
        inf_adapter = requests.adapters.HTTPAdapter(pool_connections=5, pool_maxsize=10, max_retries=1)
        self.inference_session.mount('https://', inf_adapter)
        self.inference_session.mount('http://', inf_adapter)

        self.tracking_session = requests.Session()
        self.tracking_session.headers.update(self.headers)
        track_adapter = requests.adapters.HTTPAdapter(pool_connections=5, pool_maxsize=10, max_retries=0)
        self.tracking_session.mount('https://', track_adapter)
        self.tracking_session.mount('http://', track_adapter)

        # Bounded queues
        self.inference_queue = queue.Queue(maxsize=50)
        # Tracking queue size 2: strictly for real-time live frames
        self.tracking_queue = queue.Queue(maxsize=2)
        
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
                
                response = self.inference_session.post(
                    self.endpoint,
                    data=task['data'],
                    files=task['files'],
                    timeout=8.0
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
        """Background thread that pops the freshest tracking data and sends to backend."""
        while True:
            try:
                task = self.tracking_queue.get()
                if task is None:
                    break
                    
                resp = self.tracking_session.post(self.tracking_url, json=task['data'], timeout=2.5)
                if resp.status_code != 200:
                    logger.warning(f"[Tracking] HTTP error {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.warning(f"[Tracking] Failed to upload tracking: {e}")
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
        Pushes live tracking data to the queue.
        Always drops older frames so only the freshest coordinates are transmitted.
        """
        clean_bboxes = [[int(b[0]), int(b[1]), int(b[2]), int(b[3]), float(b[4])] for b in bboxes]
        data = {
            "timestamp": str(timestamp),
            "bboxes": clean_bboxes,
            "frame_w": int(frame_w),
            "frame_h": int(frame_h)
        }
        # Drop stale frames from queue so worker always transmits the newest frame
        while not self.tracking_queue.empty():
            try:
                self.tracking_queue.get_nowait()
                self.tracking_queue.task_done()
            except (queue.Empty, ValueError):
                break

        try:
            self.tracking_queue.put_nowait({'data': data})
        except queue.Full:
            pass
