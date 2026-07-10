"""
File: analytics.py
Purpose: Real-time traffic analytics computation engine.
Why it exists: Aggregates per-frame vehicle detection outputs into traffic metrics
               (congestion score, health score, vehicle class counts, lane utilization,
               speed estimates, CO2 savings) that are broadcast to the dashboard.
"""

import time
from typing import Any
from collections import defaultdict


class TrafficAnalytics:
    """
    Stateful analytics engine that ingests tracked object lists from each frame
    and maintains rolling metrics for the WebSocket broadcast pipeline.
    """

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        """Resets all analytics state for a new session."""
        self.frame_counter: int = 0
        self.session_start: float = time.time()
        self.track_history: dict[int, list[tuple[float, float, int]]] = {}
        self.total_vehicles_seen: int = 0
        self.total_vehicles_minute: list[tuple[float, int]] = []  # (timestamp, count)

        # Latest snapshot
        self._snapshot: dict[str, Any] = {
            "total_count": 0,
            "vehicle_classes": defaultdict(int),
            "congestion_score": 0.0,
            "health_score": 100,
            "avg_speed_kmh": 0.0,
            "lane_utilization": {"NORTH": 0, "SOUTH": 0, "EAST": 0, "WEST": 0},
            "queue_length": {"NORTH": 0, "SOUTH": 0, "EAST": 0, "WEST": 0},
            "flow_rate": 0.0,
            "co2_saved_kg": 0.0,
            "emergency_detected": False,
        }

    def update(
        self,
        tracked_objects: list[dict[str, Any]],
        frame_width: int,
        frame_height: int,
        emergency_detected: bool = False,
    ) -> dict[str, Any]:
        """
        Processes one frame's tracked objects and updates rolling metrics.

        Args:
            tracked_objects: List of detection dicts with keys:
                             box, label, confidence, track_id, lane
            frame_width: Width of the processed frame in pixels.
            frame_height: Height of the processed frame in pixels.
            emergency_detected: Flag raised when an emergency class is detected.

        Returns:
            Current analytics snapshot dict.
        """
        self.frame_counter += 1
        now = time.time()

        # --- Count vehicles ---
        vehicle_classes: dict[str, int] = defaultdict(int)
        lane_counts: dict[str, int] = {"NORTH": 0, "SOUTH": 0, "EAST": 0, "WEST": 0}

        for obj in tracked_objects:
            label = obj.get("label", "unknown")
            lane = obj.get("lane", "NORTH")
            vehicle_classes[label] += 1
            if lane in lane_counts:
                lane_counts[lane] += 1

            # Update track history for speed estimation
            track_id = obj.get("track_id", -1)
            box = obj.get("box", [0, 0, 0, 0])
            cx = (box[0] + box[2]) / 2.0
            cy = (box[1] + box[3]) / 2.0
            if track_id not in self.track_history:
                self.track_history[track_id] = []
            self.track_history[track_id].append((cx, cy, self.frame_counter))
            # Keep only last 10 positions
            if len(self.track_history[track_id]) > 10:
                self.track_history[track_id] = self.track_history[track_id][-10:]

        total_count = len(tracked_objects)

        # --- Congestion & Health ---
        congestion_score = round(min(1.0, total_count / 15.0), 3)
        health_score = max(0, 100 - int(congestion_score * 80))
        if emergency_detected:
            health_score = max(0, health_score - 15)

        # --- Speed estimate ---
        speeds: list[float] = []
        for history in self.track_history.values():
            if len(history) >= 2:
                prev = history[-2]
                curr = history[-1]
                dx = curr[0] - prev[0]
                dy = curr[1] - prev[1]
                pixel_displacement = (dx**2 + dy**2) ** 0.5
                # Scale factor: 0.15 px/frame → km/h (rough urban approximation)
                speed_kmh = pixel_displacement * 0.15 * 15  # 15 FPS assumed
                speeds.append(speed_kmh)
        avg_speed = round(sum(speeds) / len(speeds), 1) if speeds else 0.0

        # --- Flow rate (vehicles/minute) ---
        self.total_vehicles_minute.append((now, total_count))
        # Keep only last 60 seconds of data points
        cutoff = now - 60.0
        self.total_vehicles_minute = [
            (ts, cnt) for ts, cnt in self.total_vehicles_minute if ts >= cutoff
        ]
        if len(self.total_vehicles_minute) > 1:
            elapsed_min = (self.total_vehicles_minute[-1][0] - self.total_vehicles_minute[0][0]) / 60.0
            total_in_window = sum(cnt for _, cnt in self.total_vehicles_minute)
            flow_rate = round(total_in_window / max(elapsed_min, 0.01), 1)
        else:
            flow_rate = 0.0

        # --- CO2 savings estimation ---
        # Assumption: AI optimization saves ~0.002 kg CO2 per vehicle per minute vs unoptimized
        session_minutes = (now - self.session_start) / 60.0
        co2_saved = round(total_count * session_minutes * 0.002, 3)

        self._snapshot = {
            "total_count": total_count,
            "vehicle_classes": dict(vehicle_classes),
            "congestion_score": congestion_score,
            "health_score": health_score,
            "avg_speed_kmh": avg_speed,
            "lane_utilization": lane_counts,
            "queue_length": lane_counts.copy(),
            "flow_rate": flow_rate,
            "co2_saved_kg": co2_saved,
            "emergency_detected": emergency_detected,
        }

        return self._snapshot

    def get_summary(self) -> dict[str, Any]:
        """Returns the latest computed analytics snapshot."""
        return dict(self._snapshot)
