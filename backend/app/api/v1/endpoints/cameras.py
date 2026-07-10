"""
File: cameras.py
Purpose: Route handlers for registering camera feeds.
Why it exists: Handles endpoint operations for camera registration, initiating active stream processors.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any
from app.core.ai.pipeline import StreamProcessor
from app.core.registry import active_processors

router = APIRouter()

class CameraCreate(BaseModel):
    camera_id: str
    source: str  # Simulated or path/to/file.mp4

class CameraResponse(BaseModel):
    camera_id: str
    source: str
    status: str

@router.get("/", response_model=List[CameraResponse])
def list_cameras():
    """
    Returns list of all active streaming camera nodes.
    """
    cameras = []
    for cid, proc in active_processors.items():
        cameras.append({
            "camera_id": cid,
            "source": proc.source,
            "status": "STREAMING" if proc.running else "STOPPED"
        })
    return cameras

@router.post("/", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
def add_camera_feed(feed: CameraCreate):
    """
    Adds a new camera feed source and starts its pipeline thread.
    """
    cid = feed.camera_id
    if cid in active_processors:
        # Stop existing
        active_processors[cid].stop()
        
    try:
        proc = StreamProcessor(camera_id=cid, source=feed.source)
        active_processors[cid] = proc
        proc.start()
        return {
            "camera_id": cid,
            "source": feed.source,
            "status": "STREAMING"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to start stream processor: {str(e)}"
        )

@router.delete("/{camera_id}", status_code=status.HTTP_200_OK)
def remove_camera_feed(camera_id: str):
    """
    Stops and removes an active camera feed.
    """
    if camera_id in active_processors:
        active_processors[camera_id].stop()
        del active_processors[camera_id]
        return {"message": "Camera feed stopped and removed successfully"}
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Camera ID not found"
    )
