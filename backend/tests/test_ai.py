"""
File: test_ai.py
Purpose: Verification unit tests for the YOLO and tracking modules.
Why it exists: Validates predictor initialization and tracking structures.
"""

import pytest
from app.core.ai.model import YOLO11Detector
from app.core.ai.tracker import VehicleTracker

def test_ai_detector_device():
    detector = YOLO11Detector()
    assert detector.device in ["cuda", "cpu"]

def test_tracker_initialization():
    tracker = VehicleTracker()
    assert tracker.max_missed_frames == 5
