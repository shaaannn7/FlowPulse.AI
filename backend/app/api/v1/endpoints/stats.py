"""
File: stats.py
Purpose: Route handlers for aggregate statistics and metrics history.
Why it exists: Computes and returns CO2 savings metrics and historical charts timeline arrays.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.repository import DBRepository
from app.core.websockets.manager import manager
from typing import List, Dict, Any
import time

router = APIRouter()

@router.get("/summary")
def get_stats_summary(db: Session = Depends(get_db)):
    """
    Computes cumulative stats (vehicles tracked, CO2 saved, etc.) from DB.
    """
    # Fetch recent summaries or fallback to defaults
    summaries = DBRepository.get_analytics_summaries(db, "junction_central_01", limit=1)
    if summaries:
        latest = summaries[0]
        return {
            "total_vehicles_today": latest.total_vehicles,
            "average_congestion_score": latest.avg_congestion_score,
            "co2_saved_kg": latest.co2_saved_kg,
            "emergency_preemptions_triggered": latest.emergency_preemptions,
            "active_connections": len(manager.active_connections)
        }
    
    # Baseline defaults
    return {
        "total_vehicles_today": 1248,
        "average_congestion_score": 0.32,
        "co2_saved_kg": 54.2,
        "emergency_preemptions_triggered": 4,
        "active_connections": len(manager.active_connections)
    }

@router.get("/history")
def get_congestion_history(junction_id: str = "junction_central_01", db: Session = Depends(get_db)):
    """
    Returns time-series congestion data points for rendering metrics graphs.
    """
    # Fetch recent timeline rollups
    summaries = DBRepository.get_analytics_summaries(db, junction_id, limit=24)
    history = []
    
    if summaries:
        for idx, s in enumerate(reversed(summaries)):
            history.append({
                "hour": s.timestamp.hour,
                "congestion_score": s.congestion_score,
                "vehicle_count": s.total_vehicles
            })
        return history

    # Generate default history if database records are empty
    current_hour = time.localtime().tm_hour
    for i in range(12, 0, -1):
        target_hour = (current_hour - i) % 24
        # Simulated profile: peaks during rush hours
        is_rush = target_hour in [8, 9, 17, 18]
        score = 0.72 if is_rush else 0.28
        count = 420 if is_rush else 180
        history.append({
            "hour": target_hour,
            "congestion_score": score,
            "vehicle_count": count
        })
    return history
