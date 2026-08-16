import cv2
import time
import logging
from typing import Generator
import numpy as np

logger = logging.getLogger(__name__)

from urllib.parse import urlparse

def redact_url(url: str) -> str:
    try:
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
    def __init__(self, rtsp_url: str, fps: int = 1):
        import os
        # Force FFmpeg to use TCP for RTSP to prevent instant rejection, and disable buffering for zero-lag
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay"
        self.rtsp_url = rtsp_url
        self.fps = fps
        self.frame_interval = 1.0 / fps
        self.cap = None

    def _reader(self):
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
                logger.error(f"Error reading frame: {e}")
                self.running = False
                break

    def connect(self):
        if self.cap is not None:
            self.cap.release()

        redacted = redact_url(self.rtsp_url)
        logger.info(f"Connecting to RTSP stream: {redacted}")
        # Using environment variables or OpenCV options to prefer TCP
        # cv2.CAP_FFMPEG is default, we can pass ENV vars externally
        self.cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
        if not self.cap.isOpened():
            raise ConnectionError(f"Failed to open RTSP stream: {redacted}")
            
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        logger.info("Successfully connected to RTSP stream.")
        
        # Start background thread to keep buffer drained
        import threading
        self.running = True
        self.latest_frame = None
        self.thread = threading.Thread(target=self._reader, daemon=True)
        self.thread.start()

    def read_frames(self) -> Generator[np.ndarray, None, None]:
        last_yield_time = 0
        last_frame_update_time = time.time()
        last_frame_ref = None

        while True:
            if not self.running:
                logger.warning("RTSP reading thread stopped. Reconnecting...")
                if not self.reconnect_with_backoff():
                    return
                continue
                
            current_time = time.time()
            
            # Detect if the reader thread is stuck (frame hasn't changed for 5 seconds)
            if self.latest_frame is not None:
                if self.latest_frame is not last_frame_ref:
                    last_frame_ref = self.latest_frame
                    last_frame_update_time = current_time
                elif current_time - last_frame_update_time > 5.0:
                    logger.warning("RTSP frame is completely frozen (stale for >5s). Forcing reconnect...")
                    self.running = False # Force reader thread to exit
                    self.cap.release()
                    continue

            if current_time - last_yield_time >= self.frame_interval:
                if self.latest_frame is not None:
                    last_yield_time = current_time
                    yield self.latest_frame.copy()
                else:
                    time.sleep(0.01)
            else:
                time.sleep(0.01)

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
        if self.cap:
            self.cap.release()
