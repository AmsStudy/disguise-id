import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class AgentConfig(BaseModel):
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:3000")
    api_key: str = os.getenv("API_KEY", "")
    rtsp_url: str = os.getenv("RTSP_URL", "")
    
    # Detector settings
    det_size: int = int(os.getenv("DET_SIZE", "640"))
    min_confidence: float = float(os.getenv("MIN_CONFIDENCE", "0.5"))
    edge_embedding_shadow_enabled: bool = os.getenv("EDGE_EMBEDDING_SHADOW_ENABLED", "false").lower() == "true"
    face_box_overlay_enabled: bool = os.getenv("FACE_BOX_OVERLAY_ENABLED", "false").lower() == "true"
    blur_threshold: float = float(os.getenv("BLUR_THRESHOLD", "80.0"))
    stream_push_enabled: bool = os.getenv("STREAM_PUSH_ENABLED", "true").lower() == "true"

    def validate_config(self):
        if not self.api_key:
            raise ValueError("API_KEY is missing. It is required to authenticate with the backend.")
        if not self.backend_url:
            raise ValueError("BACKEND_URL is missing.")

config = AgentConfig()
