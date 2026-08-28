import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

def get_active_rtsp_url() -> str:
    # Priority 1: Check .active_video file written by switch_cctv_video.py
    for path in ["/app/.active_video", os.path.join(os.path.dirname(__file__), ".active_video")]:
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    v = f.read().strip()
                    if v:
                        return v
            except Exception:
                pass
    return os.getenv("RTSP_URL", "/stream-record/Highlight_Manusia_CCTV.mp4")

class AgentConfig(BaseModel):
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:3000")
    api_key: str = os.getenv("API_KEY", "")
    camera_id: str = os.getenv("CAMERA_ID", "")
    rtsp_url: str = get_active_rtsp_url()
    stream_push_rtsp_url: str = os.getenv("STREAM_PUSH_RTSP_URL", "")
    
    # Detector settings (Optimized for CCTV occlusion, glasses, & distance)
    det_size: int = int(os.getenv("DET_SIZE", "640"))
    min_confidence: float = float(os.getenv("MIN_CONFIDENCE", "0.30"))
    edge_embedding_shadow_enabled: bool = os.getenv("EDGE_EMBEDDING_SHADOW_ENABLED", "false").lower() == "true"
    face_box_overlay_enabled: bool = os.getenv("FACE_BOX_OVERLAY_ENABLED", "false").lower() == "true"
    blur_threshold: float = float(os.getenv("BLUR_THRESHOLD", "15.0"))
    stream_push_enabled: bool = os.getenv("STREAM_PUSH_ENABLED", "true").lower() == "true"
    mediamtx_host: str = os.getenv("MEDIAMTX_HOST", "")

    def get_rtsp_url(self) -> str:
        return get_active_rtsp_url()

    def validate_config(self):
        if not self.api_key:
            raise ValueError("API_KEY is missing. It is required to authenticate with the backend.")
        if not self.backend_url:
            raise ValueError("BACKEND_URL is missing.")

config = AgentConfig()
