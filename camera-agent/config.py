import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class AgentConfig(BaseModel):
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:3000")
    api_key: str = os.getenv("API_KEY", "")
    
    # Detector settings
    det_size: int = int(os.getenv("DET_SIZE", "640"))
    min_confidence: float = float(os.getenv("MIN_CONFIDENCE", "0.5"))

    def validate_config(self):
        if not self.api_key:
            raise ValueError("API_KEY is missing. It is required to authenticate with the backend.")
        if not self.backend_url:
            raise ValueError("BACKEND_URL is missing.")

config = AgentConfig()
