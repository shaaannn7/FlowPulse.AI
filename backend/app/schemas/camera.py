from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

# --- Junction Schemas ---
class JunctionBase(BaseModel):
    name: str = Field(..., example="Junction Broadway & 42nd")
    latitude: float = Field(..., example=40.758896)
    longitude: float = Field(..., example=-73.985130)
    status: Optional[str] = Field("ACTIVE", example="ACTIVE")

class JunctionCreate(JunctionBase):
    pass

class JunctionResponse(JunctionBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Camera / Session Schemas ---
class CameraBase(BaseModel):
    junction_id: str = Field(..., example="j-uuid")
    camera_id: str = Field(..., example="cam-north-01")
    stream_url: str = Field(..., example="rtsp://...")

class CameraCreate(CameraBase):
    pass

class CameraResponse(CameraBase):
    id: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None

    class Config:
        from_attributes = True
