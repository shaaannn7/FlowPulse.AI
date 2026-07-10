"""
File: test_optimizer.py
Purpose: Verification unit tests for the traffic signal controller.
Why it exists: Validates the state machine initialization bounds.
"""

import pytest
from app.core.optimization.controller import TrafficSignalController

def test_controller_initial_state():
    controller = TrafficSignalController()
    assert controller.mode == "AUTO"
    assert controller.active_phase == "NORTH_SOUTH"
    assert controller.seconds_remaining == 30
    assert not controller.emergency_active
