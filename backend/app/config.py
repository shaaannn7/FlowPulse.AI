from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "FlowPulse AI"
    API_V1_STR: str = "/api/v1"
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ]
    
    # Database Settings
    DATABASE_URL: str = "sqlite:///./flowpulse.db"
    
    # AI Settings
    YOLO_MODEL_PATH: str = "weights/yolo11n.pt"
    INFERENCE_CONFIDENCE: float = 0.25
    GEMINI_API_KEY: str = ""
    
    # WebSocket/Video configurations
    FRAME_JPEG_QUALITY: int = 60
    MAX_QUEUE_SIZE: int = 30
    
    class Config:
        case_sensitive = True
        env_file = "../.env"
        extra = "ignore"

settings = Settings()
