"""
File: repository.py
Purpose: Database CRUD repository operations.
Why it exists: Handles transactions for insertions and lookups of junctions, logs, and analytics.
"""

from sqlalchemy.orm import Session
from app.db import models
import uuid
import datetime

class DBRepository:
    """
    CRUD repository transactions executing queries on SQLite/PostgreSQL connections.
    """
    @staticmethod
    def create_junction(db: Session, name: str, latitude: float, longitude: float) -> models.Junction:
        junction = models.Junction(
            id=str(uuid.uuid4()),
            name=name,
            latitude=latitude,
            longitude=longitude,
            status="ACTIVE"
        )
        db.add(junction)
        db.commit()
        db.refresh(junction)
        return junction

    @staticmethod
    def get_junctions(db: Session):
        return db.query(models.Junction).all()

    @staticmethod
    def create_session(db: Session, junction_id: str, camera_id: str, stream_url: str) -> models.TrafficSession:
        session = models.TrafficSession(
            id=str(uuid.uuid4()),
            junction_id=junction_id,
            camera_id=camera_id,
            stream_url=stream_url,
            status="STREAMING"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_sessions(db: Session):
        return db.query(models.TrafficSession).all()

    @staticmethod
    def log_detection(db: Session, camera_id: str, vehicle_class: str, confidence: float, track_id: int):
        det = models.Detection(
            camera_id=camera_id,
            vehicle_class=vehicle_class,
            confidence=confidence,
            track_id=track_id
        )
        db.add(det)
        db.commit()
        return det

    @staticmethod
    def log_emergency_event(db: Session, camera_id: str, vehicle_type: str, confidence: float, action_taken: str):
        evt = models.EmergencyEvent(
            camera_id=camera_id,
            vehicle_type=vehicle_type,
            confidence=confidence,
            action_taken=action_taken
        )
        db.add(evt)
        db.commit()
        return evt

    @staticmethod
    def log_signal_timing(db: Session, junction_id: str, active_phase: str, previous_phase: str, green_duration_sec: int, trigger_source: str):
        timing = models.SignalTiming(
            junction_id=junction_id,
            active_phase=active_phase,
            previous_phase=previous_phase,
            green_duration_sec=green_duration_sec,
            trigger_source=trigger_source
        )
        db.add(timing)
        db.commit()
        return timing

    @staticmethod
    def log_analytics_summary(db: Session, junction_id: str, total_vehicles: int, avg_congestion: float, co2_saved: float, emergency_preemptions: int):
        summary = models.AnalyticsSummary(
            junction_id=junction_id,
            total_vehicles=total_vehicles,
            avg_congestion_score=avg_congestion,
            co2_saved_kg=co2_saved,
            emergency_preemptions=emergency_preemptions
        )
        db.add(summary)
        db.commit()
        return summary

    @staticmethod
    def get_analytics_summaries(db: Session, junction_id: str, limit: int = 10):
        return db.query(models.AnalyticsSummary)\
                 .filter(models.AnalyticsSummary.junction_id == junction_id)\
                 .order_by(models.AnalyticsSummary.timestamp.desc())\
                 .limit(limit)\
                 .all()

    @staticmethod
    def get_signal_timings(db: Session, junction_id: str, limit: int = 10):
        return db.query(models.SignalTiming)\
                 .filter(models.SignalTiming.junction_id == junction_id)\
                 .order_by(models.SignalTiming.timestamp.desc())\
                 .limit(limit)\
                 .all()
