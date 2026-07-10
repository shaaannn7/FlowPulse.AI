"""
File: controller.py
Purpose: Signal Optimization Controller state machine.
Why it exists: Handles active phases, countdown clocks, dynamic pressure timings, emergency priority, and records timing logs to the DB.
"""

from typing import Dict, Any
from app.db.session import SessionLocal
from app.db.repository import DBRepository
import time
import logging

logger = logging.getLogger(__name__)

class TrafficSignalController:
    """
    Traffic signal state manager computing dynamic green cycles, preemption states, 
    and operator override command requests.
    """
    def __init__(self, junction_id: str = "junction_central_01"):
        self.junction_id = junction_id
        self.mode = "AUTO"  # AUTO, MANUAL
        self.active_phase = "NORTH_SOUTH"  # NORTH_SOUTH, EAST_WEST
        self.seconds_remaining = 30
        self.emergency_active = False
        self.last_tick = time.time()
        
        # Timing constants
        self.min_green = 10
        self.max_green = 60
        self.default_ns = 30
        self.default_ew = 20

        # Pressures computed from queue metrics
        self.lane_pressures = {
            "NORTH_SOUTH": 0.2,
            "EAST_WEST": 0.1
        }

    def force_override(self, target_phase: str) -> None:
        """
        Locks the signal controller into manual override mode.
        """
        previous_phase = self.active_phase
        self.mode = "MANUAL"
        self.active_phase = target_phase
        self.seconds_remaining = 999  # indefinite lock until AUTO is requested
        self.emergency_active = False
        
        logger.info(f"Signal Controller manually locked to phase: {target_phase}")
        self._log_transition(previous_phase, "MANUAL_OVERRIDE")

    def resume_auto(self) -> None:
        """
        Restores automated AI adaptive light cycles.
        """
        previous_phase = self.active_phase
        self.mode = "AUTO"
        self.seconds_remaining = 20  # reset timer
        self.emergency_active = False
        
        logger.info("Signal Controller restored to AUTO mode.")
        self._log_transition(previous_phase, "ALGORITHM")

    def trigger_emergency_preemption(self) -> None:
        """
        Overrides phase timer to clear approaching emergency vehicles.
        """
        previous_phase = self.active_phase
        self.emergency_active = True
        self.active_phase = "NORTH_SOUTH"  # Emergency lane is Broadway NS
        self.seconds_remaining = 30  # Hold green phase for 30 seconds
        
        logger.warning("EMERGENCY preemption override active on NORTH_SOUTH.")
        self._log_transition(previous_phase, "EMERGENCY_PREEMPT")

    def clear_emergency(self) -> None:
        """
        Clears emergency priority state.
        """
        self.emergency_active = False
        self.resume_auto()

    def update_metrics(self, metrics: Dict[str, Any]) -> None:
        """
        Updates internal lane pressure metrics and checks for emergency vehicle approaches.
        """
        # Check emergency approaches
        if metrics.get("emergency_detected", False) and not self.emergency_active:
            self.trigger_emergency_preemption()
            return
            
        # Update pressure coefficients
        lanes = metrics.get("lanes", {})
        ns_vehicles = lanes.get("lane_1", {}).get("queue_length", 0)
        # Assume static mock cross-traffic wait counts for simplicity
        ew_vehicles = 3
        
        self.lane_pressures["NORTH_SOUTH"] = min(1.0, ns_vehicles / 10.0)
        self.lane_pressures["EAST_WEST"] = min(1.0, ew_vehicles / 10.0)

    def tick(self) -> None:
        """
        Calculates timer decrements and triggers adaptive transitions when the timer expires.
        """
        now = time.time()
        elapsed = now - self.last_tick
        self.last_tick = now

        # Only tick down if elapsed is significant (ensuring sub-second ticks are ignored)
        if elapsed >= 0.5:
            if self.seconds_remaining > 0:
                self.seconds_remaining = max(0, self.seconds_remaining - 1)
            else:
                if self.mode == "AUTO":
                    self._cycle_phase()

    def _cycle_phase(self) -> None:
        """
        Transitions active light phase. Computes dynamic green durations 
        depending on traffic pressures.
        """
        previous_phase = self.active_phase
        next_phase = "EAST_WEST" if self.active_phase == "NORTH_SOUTH" else "NORTH_SOUTH"
        
        # Calculate dynamic pressure timing
        pressure = self.lane_pressures[next_phase]
        if pressure > 0.6:
            # High congestion: allocate maximum green extension
            duration = self.max_green
        elif pressure < 0.2:
            # Light congestion: allocate minimum green
            duration = self.min_green
        else:
            # Average congestion: allocate default timing
            duration = self.default_ns if next_phase == "NORTH_SOUTH" else self.default_ew

        self.active_phase = next_phase
        self.seconds_remaining = duration
        
        logger.info(f"Signal phase cycled: {previous_phase} -> {next_phase}. Allocated {duration}s.")
        self._log_transition(previous_phase, "ALGORITHM")

    def _log_transition(self, previous_phase: str, trigger_source: str) -> None:
        """
        Records the timing transition event to the database.
        """
        db = SessionLocal()
        try:
            DBRepository.log_signal_timing(
                db=db,
                junction_id=self.junction_id,
                active_phase=self.active_phase,
                previous_phase=previous_phase,
                green_duration_sec=self.seconds_remaining,
                trigger_source=trigger_source
            )
        except Exception as e:
            logger.error(f"Failed to write signal transition log: {str(e)}")
        finally:
            db.close()

    def get_status(self) -> Dict[str, Any]:
        return {
            "junction_id": self.junction_id,
            "active_phase": self.active_phase,
            "mode": self.mode,
            "seconds_remaining": self.seconds_remaining,
            "emergency_active": self.emergency_active
        }

traffic_controller = TrafficSignalController()
