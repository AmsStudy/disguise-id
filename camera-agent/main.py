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
from face_detector import FaceDetector, draw_face_boxes
from uploader import BackendUploader
from health import HealthReporter

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__)

def start_ffmpeg_pipe(width: int, height: int, fps: int, central_url: str, camera_id: str):
    """
    Starts an FFmpeg process that accepts raw BGR frames via stdin,
    encodes them with ultrafast zero-latency H.264, and pushes the stream to MediaMTX.
    This enables real-time edge rendering of bounding boxes directly into the video stream.
    """
    if config.mediamtx_host:
        central_ip = config.mediamtx_host
    else:
        parsed = urlparse(central_url)
        central_ip = parsed.hostname or "localhost"
    
    push_url = f"rtsp://{central_ip}:8554/{camera_id}"

    cmd = [
        "ffmpeg",
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-pix_fmt", "bgr24",
        "-s", f"{width}x{height}",
        "-r", str(fps),
        "-i", "-",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-b:v", "2000k",
        "-pix_fmt", "yuv420p",
        "-g", str(fps),
        "-an",
        "-rtsp_transport", "tcp",
        "-f", "rtsp",
        push_url
    ]

    logger.info(f"[FFmpeg Pipe] Starting push stream: stdin ({width}x{height} @ {fps}fps) -> {push_url}")
    return subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

def fetch_backend_config(current_etag=None):
    """
    Fetches the latest camera config from the backend.
    """
    url = f"{config.backend_url.rstrip('/')}/api/v1/camera-agent/config"
    headers = {
        "X-Api-Key": config.api_key,
        "X-Camera-Id": config.camera_id
    }
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
    logger.info("Starting Edge Camera Agent...")
    try:
        config.validate_config()
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)

    uploader = BackendUploader()
    detector = FaceDetector(det_size=(config.det_size, config.det_size), min_confidence=config.min_confidence)
    health_reporter = HealthReporter(interval_seconds=15)
    health_reporter.start()

    stop_event = threading.Event()
    def handle_signal(sig, frame):
        logger.info("Shutting down Camera Agent...")
        stop_event.set()
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    current_etag = None
    capture = None
    ffmpeg_pipe_proc = None
    stream_fps = 15
    last_ml_upload_time = 0

    try:
        while not stop_event.is_set():
            # 1. Fetch config from backend
            backend_config, current_etag = fetch_backend_config(current_etag)
            
            is_enabled = True
            active_camera_id = config.camera_id
            
            if backend_config:
                is_enabled = backend_config.get("enabled", True)
                rtsp_url = backend_config.get("credentials", {}).get("streamUrl") or config.rtsp_url
                active_camera_id = backend_config.get("cameraId") or config.camera_id
                
                # Update model params if changed
                model_params = backend_config.get("modelParams", {})
                if "threshold" in model_params:
                    detector.min_confidence = float(model_params["threshold"])
            else:
                rtsp_url = config.rtsp_url

            if not is_enabled or not rtsp_url:
                if capture:
                    capture.release()
                    capture = None
                if ffmpeg_pipe_proc:
                    try:
                        ffmpeg_pipe_proc.stdin.close()
                        ffmpeg_pipe_proc.terminate()
                    except Exception:
                        pass
                    ffmpeg_pipe_proc = None
                time.sleep(5)
                continue

            if capture is None:
                capture = RTSPCapture(rtsp_url=rtsp_url, fps=stream_fps)
                capture.connect()
                logger.info(f"Connected to video source at {stream_fps} FPS (Live Edge Rendering & RetinaFace Cropping)")

            # Read frames for the next 15 seconds, then re-poll config
            end_time = time.time() + 15

            for frame in capture.read_frames():
                if stop_event.is_set() or time.time() > end_time:
                    break

                h, w = frame.shape[:2]

                # Initialize or verify FFmpeg pipe process
                if ffmpeg_pipe_proc is None or ffmpeg_pipe_proc.poll() is not None:
                    if ffmpeg_pipe_proc is not None:
                        try:
                            ffmpeg_pipe_proc.terminate()
                        except Exception:
                            pass
                    ffmpeg_pipe_proc = start_ffmpeg_pipe(w, h, stream_fps, config.backend_url, active_camera_id)

                # 2. Run fast RetinaFace face detection
                faces, thumb_bytes, dims = detector.process_frame(frame)

                # 3. Render real-time tactical bounding boxes on frame
                if len(faces) > 0:
                    render_frame = draw_face_boxes(frame, faces)
                else:
                    render_frame = frame

                # 4. Stream rendered frame with bounding boxes to MediaMTX
                if ffmpeg_pipe_proc and ffmpeg_pipe_proc.stdin:
                    try:
                        ffmpeg_pipe_proc.stdin.write(render_frame.tobytes())
                    except Exception as e:
                        logger.warning(f"FFmpeg stdin write error: {e}")
                        try:
                            ffmpeg_pipe_proc.terminate()
                        except Exception:
                            pass
                        ffmpeg_pipe_proc = None

                # 5. Capture & upload face crops to central backend (throttled at 1 FPS)
                current_time = time.time()
                if len(faces) > 0 and (current_time - last_ml_upload_time >= 1.0):
                    last_ml_upload_time = current_time
                    capture_id = str(uuid.uuid4())
                    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
                    logger.info(f"Captured {len(faces)} face(s) for backend biometric verification (Capture: {capture_id})")

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
        if ffmpeg_pipe_proc:
            try:
                ffmpeg_pipe_proc.stdin.close()
                ffmpeg_pipe_proc.terminate()
            except Exception:
                pass
        health_reporter.stop()

if __name__ == "__main__":
    main()
