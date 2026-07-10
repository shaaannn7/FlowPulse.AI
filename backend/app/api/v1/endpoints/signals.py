"""
File: signals.py
Purpose: Route handlers for managing traffic light timings.
Why it exists: Exposes endpoints for override commands and fetching live phase state.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.core.optimization.controller import traffic_controller

router = APIRouter()

class SignalOverrideRequest(BaseModel):
    mode: str  # MANUAL, AUTO
    target_phase: Optional[str] = None  # NORTH_SOUTH, EAST_WEST

@router.get("/status")
def get_signal_status():
    """
    Returns current active light phase, mode, and seconds remaining.
    """
    return traffic_controller.get_status()

@router.post("/override", status_code=status.HTTP_200_OK)
def trigger_signal_override(request: SignalOverrideRequest):
    """
    Forces the signal controller into manual phase override.
    """
    if request.mode.upper() == "MANUAL":
        if not request.target_phase:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="target_phase is required when setting MANUAL mode"
            )
        target = request.target_phase.upper()
        if target not in ["NORTH_SOUTH", "EAST_WEST"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid target_phase. Must be NORTH_SOUTH or EAST_WEST"
            )
        traffic_controller.force_override(target)
    elif request.mode.upper() == "AUTO":
        traffic_controller.resume_auto()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid mode. Must be AUTO or MANUAL"
        )
    return traffic_controller.get_status()

@router.post("/resume", status_code=status.HTTP_200_OK)
def resume_auto_cycle():
    """
    Resumes standard AI light loops.
    """
    traffic_controller.resume_auto()
    return traffic_controller.get_status()
