import logging
import signal
import sys
import datetime
import time
import requests
import cv2
import uuid
import threading
import subprocess
from urllib.parse import urlparse
from config import config
from capture import RTSPCapture
from face_detector import FaceDetector
from uploader import BackendUploader
from health import HealthReporter

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__)

def start_ffmpeg_push(local_rtsp_url, central_url, camera_id):
    # Gunakan STREAM_PUSH_RTSP_URL dari .env jika ada, atau gunakan stream utama
    push_source_url = config.stream_push_rtsp_url or local_rtsp_url

    # If MEDIAMTX_HOST is explicitly set, use it. Otherwise extract from central_url
    if config.mediamtx_host:
        central_ip = config.mediamtx_host
    else:
        parsed = urlparse(central_url)
        central_ip = parsed.hostname or "localhost"
    
    # Push to MediaMTX on the central server via IP/Domain
    push_url = f"rtsp://{central_ip}:8554/{camera_id}"
    
    cmd = [
        "ffmpeg",
        "-nostdin",
        "-use_wallclock_as_timestamps", "1",
        "-fflags", "+genpts+nobuffer",
        "-rtsp_transport", "tcp",
        "-stimeout", "5000000",
        "-i", push_source_url,
        "-c:v", "copy",
        "-an",
        "-rtsp_transport", "tcp",
        "-f", "rtsp",
        push_url
    ]
    logger.info(f"[FFmpeg] Starting push stream: {push_source_url} -> {push_url}")
    return subprocess.Popen(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

class StreamSupervisor:
    """
    Autonomous background watchdog that ensures FFmpeg RTSP streaming to MediaMTX
    stays alive 24/7 without needing container restarts.
    """
    def __init__(self):
        self.process = None
        self.running = False
        self.thread = None
        self.lock = threading.Lock()
        
        # State params
        self.is_enabled = False
        self.local_rtsp_url = ""
        self.central_url = ""
        self.camera_id = ""

    def update_params(self, enabled: bool, local_rtsp_url: str, central_url: str, camera_id: str):
        with self.lock:
            url_changed = (self.local_rtsp_url != local_rtsp_url or self.camera_id != camera_id)
            self.is_enabled = enabled
            self.local_rtsp_url = local_rtsp_url
            self.central_url = central_url
            self.camera_id = camera_id
            
            # If URL or Camera ID changed, restart FFmpeg immediately
            if url_changed and self.process:
                logger.info("[StreamSupervisor] Config changed, terminating existing FFmpeg process.")
                try:
                    self.process.terminate()
                    self.process.wait(timeout=2)
                except Exception:
                    pass
                self.process = None

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True, name="StreamSupervisor")
        self.thread.start()
        logger.info("[StreamSupervisor] Background FFmpeg watchdog active.")

    def _run(self):
        while self.running:
            try:
                with self.lock:
                    enabled = self.is_enabled
                    local_rtsp = self.local_rtsp_url
                    central_url = self.central_url
                    cam_id = self.camera_id

                if not config.stream_push_enabled or not enabled or not local_rtsp or not cam_id:
                    if self.process:
                        logger.info("[StreamSupervisor] Stream push disabled or camera unready, stopping FFmpeg.")
                        try:
                            self.process.terminate()
                            self.process.wait(timeout=2)
                        except Exception:
                            pass
                        self.process = None
                    time.sleep(2)
                    continue

                if self.process is None or self.process.poll() is not None:
                    if self.process is not None:
                        err_msg = ""
                        try:
                            if self.process.stderr:
                                err_msg = self.process.stderr.read().decode('utf-8', errors='ignore').strip()
                        except Exception:
                            pass
                        logger.warning(f"[StreamSupervisor] FFmpeg exited (code {self.process.returncode}). {('Error: ' + err_msg[-300:]) if err_msg else ''}. Auto-restarting in 2s...")
                        time.sleep(2)
                    
                    if self.running:
                        self.process = start_ffmpeg_push(local_rtsp, central_url, cam_id)

                time.sleep(2)
            except Exception as e:
                logger.error(f"[StreamSupervisor] Watchdog error: {e}")
                time.sleep(3)

    def stop(self):
        self.running = False
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=3)
            except Exception:
                try:
                    self.process.kill()
                except Exception:
                    pass
            self.process = None
        logger.info("[StreamSupervisor] Watchdog stopped.")

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
    
    # 1. Start Health Reporter (hits /api/v1/camera-agent/heartbeat in background)
    health_reporter = HealthReporter()
    health_reporter.start()
    
    # 2. Start Autonomous FFmpeg Stream Supervisor
    stream_supervisor = StreamSupervisor()
    stream_supervisor.start()

    detector = None
    uploader = BackendUploader()
    capture = None
    
    current_etag = None
    current_fps = 1
    is_enabled = False
    active_rtsp_url = ""
    active_camera_id = ""
    
    def signal_handler(sig, frame):
        logger.info("Shutting down Camera Agent...")
        health_reporter.stop()
        stream_supervisor.stop()
        if capture:
            capture.release()
        sys.exit(0)
        
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        while True:
            # Poll config from backend
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
                
                credentials = backend_config.get("credentials", {})
                
                # Determine RTSP URL (local override has priority)
                rtsp_url = config.rtsp_url
                if not rtsp_url:
                    stream_url = credentials.get("streamUrl")
                    if stream_url:
                        parsed = urlparse(stream_url)
                        netloc = parsed.netloc
                        if credentials.get('username') and credentials.get('password'):
                            if '@' in netloc:
                                netloc = netloc.split('@')[1]
                            import urllib.parse
                            safe_pass = urllib.parse.quote(credentials['password'])
                            netloc = f"{credentials['username']}:{safe_pass}@{netloc}"
                        rtsp_url = parsed._replace(netloc=netloc).geturl()
                        
                        camera_id = backend_config.get("cameraId")
                        if camera_id:
                            rtsp_url = f"rtsp://mediamtx:8554/{camera_id}"
                
                active_rtsp_url = rtsp_url
                active_camera_id = (backend_config.get("cameraId") if backend_config else None) or config.camera_id
                
                if capture:
                    current_rtsp = getattr(capture, 'rtsp_url', None)
                    if current_rtsp != active_rtsp_url:
                        capture.release()
                        capture = None

                if is_enabled and not capture and active_rtsp_url:
                    capture = RTSPCapture(rtsp_url=active_rtsp_url, fps=5)
                    capture.connect()
                    logger.info(f"Connected to RTSP stream at 5 FPS (Tracking), ML Inference throttled to {current_fps} FPS")

                # Update stream supervisor with latest settings
                stream_supervisor.update_params(
                    enabled=is_enabled,
                    local_rtsp_url=active_rtsp_url,
                    central_url=config.backend_url,
                    camera_id=active_camera_id
                )

            if not is_enabled or not capture:
                time.sleep(5)
                continue
                
            # Read frames for the next 15 seconds, then re-poll config
            end_time = time.time() + 15
            last_ml_upload_time = 0
            
            for frame in capture.read_frames():
                if time.time() > end_time:
                    break
                    
                capture_id = str(uuid.uuid4())
                timestamp = datetime.datetime.utcnow().isoformat() + "Z"
                
                # Detect faces and extract embeddings
                faces, thumb_bytes, dims = detector.process_frame(frame)
                
                # --- LIVE TRACKING (Canvas Bounding Box) ---
                bboxes = [[int(f.bbox.x), int(f.bbox.y), int(f.bbox.w), int(f.bbox.h), round(float(f.confidence), 2)] for f in faces]
                if len(bboxes) > 0:
                    uploader.upload_live_tracking(bboxes, timestamp, frame.shape[1], frame.shape[0])
                
                # --- ML INFERENCE (Throttled) ---
                if time.time() - last_ml_upload_time >= (1.0 / current_fps):
                    last_ml_upload_time = time.time()
                    
                    if int(time.time()) % 5 == 0:
                        preview_frame = frame
                        if config.face_box_overlay_enabled:
                            from face_detector import draw_face_boxes
                            preview_frame = draw_face_boxes(frame, faces)
                        cv2.imwrite(f"debug_frame.jpg", preview_frame)

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
        stream_supervisor.stop()
        health_reporter.stop()

if __name__ == "__main__":
    main()
