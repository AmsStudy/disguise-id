from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    ml_service_api_key: str
    port: int = 8001
    environment: str = "development"
    
    # Model Config
    arcface_model: str = "buffalo_l"
    det_threshold: float = 0.05
    det_size: int = 640
    face_margin: float = 0.20
    top_k: int = 3
    
    # Policy Config
    possible_threshold: float = 0.288131
    high_threshold: float = 0.380334
    margin_threshold: float = 0.08
    
    # Paths
    base_dir: str = os.path.dirname(os.path.dirname(__file__))
    checkpoint_path: str = os.path.join(base_dir, "weights", "best_model.pt")
    gallery_csv_path: str = os.path.join(base_dir, "weights", "gallery.csv")
    insightface_root: str = "~/.insightface"
    
    # Feature Flags
    require_cuda: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
