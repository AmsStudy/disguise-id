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
    checkpoint_path: str = r"F:\PYTORCH_WORKSPACE\disguise-id\outputs\stage25_stage20b_fullskip_facenet_seed2026\best_model.pt"
    gallery_csv_path: str = r"F:\PENELITIAN\DISGUISE-ID\dataset\+ATRIBUT\DPO_SYSTEM_PREPARED\gallery.csv"
    insightface_root: str = "~/.insightface"
    
    # Feature Flags
    require_cuda: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
