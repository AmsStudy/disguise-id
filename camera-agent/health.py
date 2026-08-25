import threading
import time
import requests
import logging
from config import config

logger = logging.getLogger(__name__)

class HealthReporter:
    def __init__(self, interval_seconds: int = 15):
        self.interval = interval_seconds
        self.backend_url = config.backend_url.rstrip('/')
        self.endpoint = f"{self.backend_url}/api/v1/camera-agent/heartbeat"
        self.headers = {
            "X-Api-Key": config.api_key,
            "X-Camera-Id": config.camera_id
        }
        self.thread = None
        self.running = False
        
    def _report_loop(self):
        while self.running:
            try:
                # Send heartbeat
                response = requests.post(
                    self.endpoint,
                    headers=self.headers,
                    json={"status": "online", "camera_id": config.camera_id},
                    timeout=5.0
                )
                response.raise_for_status()
                logger.debug("Heartbeat sent successfully.")
            except Exception as e:
                logger.warning(f"Failed to send heartbeat: {e}")
                
            time.sleep(self.interval)

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._report_loop, daemon=True)
        self.thread.start()
        logger.info("HealthReporter started.")

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=2.0)
        logger.info("HealthReporter stopped.")
