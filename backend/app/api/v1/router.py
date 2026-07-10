"""
File: router.py
Purpose: API v1 router registration.
Why it exists: Aggregates all endpoint routers under the /api/v1 prefix.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import cameras, signals, stats, upload, copilot

api_router = APIRouter()

api_router.include_router(cameras.router, prefix="/cameras", tags=["cameras"])
api_router.include_router(signals.router, prefix="/signals", tags=["signals"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(copilot.router, prefix="/copilot", tags=["copilot"])
