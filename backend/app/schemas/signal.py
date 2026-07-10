from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class SignalOverrideRequest(BaseModel):
    mode: str = Field(..., example="MANUAL") # AUTO, MANUAL
    target_phase: Optional[str] = Field(None, example="NORTH_SOUTH") # NORTH_SOUTH, EAST_WEST

class SignalTimingResponse(BaseModel):
    id: int
    junction_id: str
    timestamp: datetime
    previous_phase: str
    active_phase: str
    green_duration_sec: int
    trigger_source: str

    class Config:
        from_attributes = True

class SignalStatusResponse(BaseModel):
    junction_id: str
    active_phase: str
    mode: str
    seconds_remaining: int
    emergency_active: bool
