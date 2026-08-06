import cv2
import time
import logging
from typing import Generator
import numpy as np

logger = logging.getLogger(__name__)

class RTSPCapture:
    def __init__(self, rtsp_url: str, fps: int = 1):
        self.rtsp_url = rtsp_url
        self.fps = fps
        self.frame_interval = 1.0 / fps
        self.cap = None

    def connect(self):
        if self.cap is not None:
            self.cap.release()
            
        logger.info(f"Connecting to RTSP stream: {self.rtsp_url}")
        # Using environment variables or OpenCV options to prefer TCP
        # cv2.CAP_FFMPEG is default, we can pass ENV vars externally
        self.cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
        if not self.cap.isOpened():
            raise ConnectionError(f"Failed to open RTSP stream: {self.rtsp_url}")
            
        logger.info("Successfully connected to RTSP stream.")

    def read_frames(self) -> Generator[np.ndarray, None, None]:
        last_frame_time = 0
        
        while True:
            if not self.cap or not self.cap.isOpened():
                logger.warning("RTSP connection lost. Reconnecting...")
                self.reconnect_with_backoff()
                
            ret, frame = self.cap.read()
            if not ret:
                logger.warning("Empty frame received. Reconnecting...")
                self.reconnect_with_backoff()
                continue
                
            current_time = time.time()
            if current_time - last_frame_time >= self.frame_interval:
                last_frame_time = current_time
                yield frame

    def reconnect_with_backoff(self):
        retry_delay = 1
        max_delay = 60
        
        while True:
            try:
                time.sleep(retry_delay)
                self.connect()
                break
            except Exception as e:
                logger.error(f"Reconnect failed: {e}")
                retry_delay = min(retry_delay * 2, max_delay)

    def release(self):
        if self.cap:
            self.cap.release()
