import cv2
import time
import logging
import os
from typing import Generator
import numpy as np

logger = logging.getLogger(__name__)

from urllib.parse import urlparse

def redact_url(url: str) -> str:
    try:
        if not url.startswith("rtsp://") and not url.startswith("http://"):
            return url
        parsed = urlparse(url)
        if parsed.password or parsed.username:
            redacted_netloc = f"***:***@{parsed.hostname}"
            if parsed.port:
                redacted_netloc += f":{parsed.port}"
            return parsed._replace(netloc=redacted_netloc).geturl()
        return url
    except Exception:
        return "***REDACTED_URL***"

class RTSPCapture:
    def __init__(self, rtsp_url: str, fps: int = 15):
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay"
        self.rtsp_url = rtsp_url
        self.fps = fps
        self.cap = None
        self.is_file = not rtsp_url.startswith("rtsp://") and not rtsp_url.startswith("http://")
        self.running = False
        self.thread = None
        self.latest_frame = None
        self.native_fps = float(fps)
        self.frame_interval = 1.0 / fps

    def _reader(self):
        """Used ONLY for live network RTSP streams to continuously drain the camera buffer."""
        while self.running:
            if not self.cap or not self.cap.isOpened():
                time.sleep(0.1)
                continue
            
            try:
                ret, frame = self.cap.read()
                if not ret:
                    self.running = False
                    break
                self.latest_frame = frame
            except Exception as e:
                logger.error(f"Error reading RTSP frame: {e}")
                self.running = False
                break

    def connect(self):
        if self.cap is not None:
            self.cap.release()

        redacted = redact_url(self.rtsp_url)
        logger.info(f"Connecting to video source: {redacted}")
        
        if self.is_file:
            self.cap = cv2.VideoCapture(self.rtsp_url)
        else:
            self.cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
            
        if not self.cap.isOpened():
            raise ConnectionError(f"Failed to open video source: {redacted}")
            
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        # Detect native video FPS
        file_fps = self.cap.get(cv2.CAP_PROP_FPS)
        if file_fps and not np.isnan(file_fps) and file_fps > 0:
            self.native_fps = round(float(file_fps), 2)
            self.frame_interval = 1.0 / self.native_fps
        else:
            self.native_fps = float(self.fps)
            self.frame_interval = 1.0 / self.fps

        logger.info(f"Connected to video source. Native FPS: {self.native_fps} (Frame interval: {self.frame_interval:.4f}s)")
        
        self.running = True
        self.latest_frame = None

        if not self.is_file:
            import threading
            self.thread = threading.Thread(target=self._reader, daemon=True)
            self.thread.start()

    def read_frames(self) -> Generator[np.ndarray, None, None]:
        if self.is_file:
            # Sequential frame-by-frame reading with strict real-time wallclock synchronization
            target_time = time.time()
            while self.running:
                ret, frame = self.cap.read()
                if not ret:
                    logger.info("Video file reached end. Looping to start...")
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = self.cap.read()
                    if not ret:
                        break
                
                yield frame

                # Strict 1.0x Real-time Pacing
                target_time += self.frame_interval
                now = time.time()
                sleep_time = target_time - now
                if sleep_time > 0:
                    time.sleep(sleep_time)
                elif sleep_time < -0.5:
                    # Reset target clock if fallen behind significantly
                    target_time = time.time()
        else:
            # Live RTSP mode
            last_yield_time = 0
            while True:
                if not self.running:
                    logger.warning("RTSP reading thread stopped. Reconnecting...")
                    if not self.reconnect_with_backoff():
                        return
                    continue
                    
                current_time = time.time()
                if current_time - last_yield_time >= self.frame_interval:
                    if self.latest_frame is not None:
                        last_yield_time = current_time
                        yield self.latest_frame.copy()
                    else:
                        time.sleep(0.005)
                else:
                    time.sleep(0.005)

    def reconnect_with_backoff(self) -> bool:
        retry_delay = 1
        max_delay = 60
        max_attempts = 5
        attempts = 0

        while attempts < max_attempts:
            try:
                time.sleep(retry_delay)
                self.connect()
                return True
            except Exception as e:
                logger.error(f"Reconnect failed: {e}")
                retry_delay = min(retry_delay * 2, max_delay)
                attempts += 1

        return False

    def release(self):
        self.running = False
        if self.cap:
            self.cap.release()
