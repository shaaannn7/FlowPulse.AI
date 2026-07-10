from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Dict

class CongestionPoint(BaseModel):
    timestamp: datetime
    congestion_score: float
    total_vehicles: int

class CongestionHistoryResponse(BaseModel):
    junction_id: str
    points: List[CongestionPoint]

class SummaryStatsResponse(BaseModel):
    total_vehicles_today: int = Field(..., example=1204)
    average_congestion_score: float = Field(..., example=0.34)
    co2_saved_kg: float = Field(..., example=45.2)
    emergency_preemptions_triggered: int = Field(..., example=5)
    active_connections: int = Field(..., example=3)
