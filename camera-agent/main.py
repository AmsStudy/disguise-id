import logging
import signal
import sys
import datetime
import time
import requests
import uuid
from config import config
from capture import RTSPCapture
from face_detector import FaceDetector
from uploader import BackendUploader
from health import HealthReporter

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__)

def fetch_backend_config(current_etag=None):
    """
    Fetches the latest camera config from the backend.
    """
    url = f"{config.backend_url.rstrip('/')}/api/v1/camera-agent/config"
    headers = {"X-Api-Key": config.api_key}
    if current_etag:
        headers["If-None-Match"] = current_etag
        
    try:
        response = requests.get(url, headers=headers, timeout=5.0)
        if response.status_code == 304:
            return None, current_etag
            
        response.raise_for_status()
        etag = response.headers.get("ETag", current_etag)
        data = response.json().get("data", {})
        return data, etag
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch config from backend: {e}")
        return None, current_etag

def main():
    logger.info("Starting Camera Agent...")
    
    # 1. Start Health Reporter (It hits /api/v1/camera-agent/heartbeat in background)
    health_reporter = HealthReporter()
    health_reporter.start()
    
    # We will instantiate these when we have the config
    detector = None
    uploader = BackendUploader()
    capture = None
    
    current_etag = None
    current_fps = 1
    is_enabled = False
    
    def signal_handler(sig, frame):
        logger.info("Shutting down Camera Agent...")
        health_reporter.stop()
        if capture:
            capture.release()
        sys.exit(0)
        
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        while True:
            # Poll config
            backend_config, current_etag = fetch_backend_config(current_etag)
            
            if backend_config:
                logger.info(f"Loaded new config from backend. Enabled: {backend_config.get('enabled')}")
                is_enabled = backend_config.get("enabled", False)
                current_fps = backend_config.get("sampleFps", 1)
                
                # Re-initialize detector if threshold changes
                if detector is None:
                    detector = FaceDetector(
                        det_size=(config.det_size, config.det_size), 
                        min_confidence=backend_config.get("modelParams", {}).get("threshold", 0.5)
                    )
                
                # Re-initialize capture if URL changes or started
                credentials = backend_config.get("credentials", {})
                stream_url = credentials.get("streamUrl")
                if stream_url:
                    # Construct URL with credentials
                    from urllib.parse import urlparse
                    parsed = urlparse(stream_url)
                    netloc = parsed.netloc
                    
                    if credentials.get('username') and credentials.get('password'):
                        # Remove existing auth if present in streamUrl string
                        if '@' in netloc:
                            netloc = netloc.split('@')[1]
                        import urllib.parse
                        safe_pass = urllib.parse.quote(credentials['password'])
                        netloc = f"{credentials['username']}:{safe_pass}@{netloc}"
                        
                    rtsp_url = parsed._replace(netloc=netloc).geturl()
                    
                    if capture:
                        capture.release()
                    
                    if is_enabled:
                        capture = RTSPCapture(rtsp_url=rtsp_url, fps=current_fps)
                        capture.connect()
                        logger.info(f"Connected to RTSP stream at {current_fps} FPS")

            if not is_enabled or not capture:
                time.sleep(5)
                continue
                
            # Read frames for the next 15 seconds, then re-poll config
            end_time = time.time() + 15
            for frame in capture.read_frames():
                if time.time() > end_time:
                    break
                    
                capture_id = str(uuid.uuid4())
                timestamp = datetime.datetime.utcnow().isoformat() + "Z"
                
                faces, thumb_bytes, dims = detector.process_frame(frame)
                
                if len(faces) > 0:
                    logger.info(f"Found {len(faces)} face(s) for capture {capture_id}")
                    face_index = 0
                    for face in faces:
                        uploader.upload_face(
                            face=face,
                            frame_thumb_bytes=thumb_bytes,
                            frame_dims=dims,
                            capture_id=capture_id,
                            timestamp=timestamp,
                            face_index=face_index
                        )
                        face_index += 1

    except Exception as e:
        logger.error(f"Fatal error in main loop: {e}", exc_info=True)
    finally:
        if capture:
            capture.release()
        health_reporter.stop()

if __name__ == "__main__":
    main()
