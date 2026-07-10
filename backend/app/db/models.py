"""
File: models.py
Purpose: Database Schema models.
Why it exists: Defines SQLAlchemy database schemas for junctions, cameras, detections, and signal timelines.
"""

from sqlalchemy import Column, String, Float, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base
import datetime

class Junction(Base):
    __tablename__ = "junctions"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sessions = relationship("TrafficSession", back_populates="junction")


class TrafficSession(Base):
    __tablename__ = "traffic_sessions"

    id = Column(String, primary_key=True, index=True)
    junction_id = Column(String, ForeignKey("junctions.id"), nullable=False)
    camera_id = Column(String, nullable=False, unique=True)
    stream_url = Column(String, nullable=False)
    status = Column(String, default="STREAMING")
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    junction = relationship("Junction", back_populates="sessions")


class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    vehicle_class = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    track_id = Column(Integer, nullable=False)


class EmergencyEvent(Base):
    __tablename__ = "emergency_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    vehicle_type = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    action_taken = Column(String, nullable=False)


class AnalyticsSummary(Base):
    __tablename__ = "analytics_summaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    junction_id = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    total_vehicles = Column(Integer, nullable=False)
    avg_congestion_score = Column(Float, nullable=False)
    co2_saved_kg = Column(Float, nullable=False)
    emergency_preemptions = Column(Integer, nullable=False)


class SignalTiming(Base):
    __tablename__ = "signal_timings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    junction_id = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    active_phase = Column(String, nullable=False)
    previous_phase = Column(String, nullable=False)
    green_duration_sec = Column(Integer, nullable=False)
    trigger_source = Column(String, nullable=False)
