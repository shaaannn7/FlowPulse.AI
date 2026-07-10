"""
File: pipeline.py
Purpose: Camera Stream Ingestion Pipeline.
Why it exists: Manages OpenCV capture streams, loops recorded videos, executes YOLOv11
and centroid track matchers, runs lane detection, traffic analytics and AI recommendations,
then broadcasts all outputs over WebSocket routes in real-time.
"""

import asyncio
import base64
import logging
import os
import queue
import threading
import time
from typing import Any, Dict, List, Optional

import cv2
import numpy as np

from app.core.ai.model import YOLO11Detector
from app.core.ai.recommender import AIRecommender
from app.core.ai.tracker import VehicleTracker
from app.core.video.analytics import TrafficAnalytics
from app.core.video.lane_detector import LaneDetector
from app.core.websockets.manager import manager

logger = logging.getLogger(__name__)

EMERGENCY_CLASSES: set = {"ambulance", "fire truck", "police car", "emergency vehicle"}
PLAYBACK_FPS: int = 30
RECOMMENDATION_INTERVAL: int = 60  # at 30fps playback, approx every 2 seconds


class StreamProcessor(threading.Thread):
    """
    Optimised Dual-Thread Camera Frame Processor running as a daemon thread.
    Separates high-frequency video decoding and broadcasting (30 FPS)
    from heavy YOLOv11 object detection and tracking (async background thread).
    """

    def __init__(self, camera_id: str, source: str) -> None:
        super().__init__(daemon=True, name=f"StreamProcessor-{camera_id}")

        self.camera_id: str = camera_id
        self.source: str = source
        self.running: bool = False

        # AI subsystems
        self.detector: YOLO11Detector = YOLO11Detector()
        self.tracker: VehicleTracker = VehicleTracker()
        self.analytics: TrafficAnalytics = TrafficAnalytics()
        self.lane_detector: LaneDetector = LaneDetector()
        self.recommender: AIRecommender = AIRecommender()

        # Thread synchronization
        self.lock = threading.Lock()
        self.frame_queue: queue.Queue = queue.Queue(maxsize=1)
        
        # Shared telemetry outputs (protected by self.lock)
        self.shared_tracked_objects: List[Dict[str, Any]] = []
        self.shared_analytics: Dict[str, Any] = {
            "congestion_score": 0.0,
            "total_count": 0,
            "vehicle_classes": {},
            "health_score": 100,
            "lane_utilization": {},
        }
        self.shared_recommendations: List[Dict[str, Any]] = []
        self.shared_emergency_detected: bool = False
        self.shared_emergency_type: str = ""

        # Velocity tracking for ByteTrack-like movement interpolation
        # track_id -> { "last_box": [x1,y1,x2,y2], "vx": float, "vy": float, "frames_since": int }
        self.track_telemetry: Dict[int, Dict[str, Any]] = {}

        # Emergency override state
        self._emergency_override: bool = False
        self._emergency_vehicle_type: str = ""

        # Performance metrics
        self.total_count: int = 0
        self.current_fps: float = float(PLAYBACK_FPS)  # Video Playback FPS
        self.inference_fps: float = 0.0                # AI Inference FPS
        self.processing_time_ms: float = 0.0

        # Background worker thread handles
        self.inference_thread: Optional[threading.Thread] = None

    def start(self) -> None:
        if self.running:
            logger.warning("StreamProcessor for camera %s is already running.", self.camera_id)
            return
        self.running = True
        
        # Start the background inference loop first
        self.inference_thread = threading.Thread(
            target=self._inference_loop,
            daemon=True,
            name=f"InferenceWorker-{self.camera_id}"
        )
        self.inference_thread.start()

        # Start the main playback thread (this class run method)
        super().start()
        logger.info("AI Ingestion Pipeline started for camera %s", self.camera_id)

    def stop(self) -> None:
        self.running = False
        self.join(timeout=3.0)
        if self.inference_thread:
            self.inference_thread.join(timeout=3.0)
        logger.info("AI Ingestion Pipeline stopped for camera %s", self.camera_id)

    def set_emergency_override(self, active: bool, vehicle_type: str = "") -> None:
        self._emergency_override = active
        self._emergency_vehicle_type = vehicle_type if active else ""
        logger.info(
            "Emergency override set to %s (type=%r) on camera %s",
            active,
            vehicle_type,
            self.camera_id,
        )

    def run(self) -> None:
        """
        Main thread entry point — delegating to the 30 FPS video playback loop.
        """
        try:
            self._playback_loop()
        except Exception as exc:
            logger.exception(
                "Unhandled exception in StreamProcessor playback loop for camera %s: %s",
                self.camera_id,
                exc,
            )

    def _playback_loop(self) -> None:
        """
        High-fidelity Video Playback thread running at a steady 30 FPS.
        Responsible for frame decoding, vehicle coordinate interpolation,
        visual annotation overlays, and high-frequency WebSocket delivery.
        """
        is_video_file: bool = (
            self.source != "simulated" and os.path.exists(self.source)
        )

        cap: Optional[cv2.VideoCapture] = None
        if is_video_file:
            logger.info("StreamProcessor[%s]: Opening playback video source: %s", self.camera_id, self.source)
            cap = cv2.VideoCapture(self.source)
        else:
            logger.info("StreamProcessor[%s]: Starting simulated generator stream.", self.camera_id)

        # Simulated vehicle state
        sim_vehicles: List[Dict[str, Any]] = [
            {"x": 80,  "y": 40,  "speed": 4, "label": "car",   "color": (0, 200, 0)},
            {"x": 200, "y": 130, "speed": 3, "label": "truck",  "color": (0, 180, 60)},
            {"x": 380, "y": 220, "speed": 5, "label": "car",   "color": (0, 200, 0)},
        ]

        fps_counter = 0
        fps_window_start = time.time()
        frame_index = 0

        while self.running:
            loop_start = time.time()

            # ---- Acquire frame ----
            frame: np.ndarray
            if is_video_file and cap is not None:
                ret, frame = cap.read()
                if not ret:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                frame = cv2.resize(frame, (640, 360))
            else:
                frame = self._render_simulated_frame(sim_vehicles)

            frame_h, frame_w = frame.shape[:2]

            # ---- Transfer to inference queue if ready ----
            if is_video_file:
                try:
                    # Non-blocking enqueue to keep playback fluid
                    self.frame_queue.put_nowait(frame.copy())
                except queue.Full:
                    # Drop frame if inference queue is saturated (ensures real-time keyframe alignment)
                    pass

            # ---- Read latest inference results (thread-safe copy) ----
            with self.lock:
                tracked_objects = [dict(obj) for obj in self.shared_tracked_objects]
                emergency_detected = self.shared_emergency_detected
                emergency_type = self.shared_emergency_type
                analytics_snapshot = dict(self.shared_analytics)
                recommendations = list(self.shared_recommendations)

            # ---- Override state configuration ----
            if self._emergency_override:
                emergency_detected = True
                emergency_type = self._emergency_vehicle_type

            # ---- ByteTrack-like Movement Interpolation ----
            if is_video_file:
                for obj in tracked_objects:
                    tid = obj.get("track_id")
                    if tid is not None and tid in self.track_telemetry:
                        tel = self.track_telemetry[tid]
                        tel["frames_since"] += 1
                        
                        # Apply velocity vector extrapolation
                        dx = tel["vx"] * tel["frames_since"]
                        dy = tel["vy"] * tel["frames_since"]
                        
                        box = list(obj["box"])
                        interpolated_box = [
                            int(box[0] + dx),
                            int(box[1] + dy),
                            int(box[2] + dx),
                            int(box[3] + dy)
                        ]
                        obj["box"] = interpolated_box
            else:
                # Simulated mode: fabricate objects live to synchronize positioning
                tracked_objects = self._sim_tracked_objects(sim_vehicles)

            # ---- Draw annotations on frame ----
            self._annotate_frame(frame, tracked_objects, emergency_detected)

            # ---- Encode frame to base64 JPEG ----
            _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            frame_b64: str = base64.b64encode(buffer).decode("utf-8")

            # ---- WebSocket Broadcasts ----
            ts = time.time()

            # 1. Video frame
            manager.broadcast_sync(
                {
                    "event": "stream:frame",
                    "timestamp": ts,
                    "data": {
                        "camera_id": self.camera_id,
                        "frame": frame_b64,
                        "fps": round(self.current_fps, 1),
                        "inference_fps": round(self.inference_fps, 1),
                    },
                }
            )

            # 2. Metrics update (broadcast at ~15 FPS to throttle socket load)
            if frame_index % 2 == 0:
                manager.broadcast_sync(
                    {
                        "event": "metrics:update",
                        "timestamp": ts,
                        "data": {
                            "camera_id": self.camera_id,
                            "congestion_score": analytics_snapshot["congestion_score"],
                            "total_count": analytics_snapshot["total_count"],
                            "vehicle_classes": analytics_snapshot["vehicle_classes"],
                            "health_score": analytics_snapshot["health_score"],
                            "lane_utilization": analytics_snapshot["lane_utilization"],
                            "emergency_detected": emergency_detected,
                            "fps": round(self.current_fps, 1),
                            "inference_fps": round(self.inference_fps, 1),
                            "processing_time_ms": self.processing_time_ms,
                        },
                    }
                )

            # 3. Emergency alert (conditional)
            if emergency_detected:
                manager.broadcast_sync(
                    {
                        "event": "alert:emergency",
                        "timestamp": ts,
                        "data": {
                            "camera_id": self.camera_id,
                            "emergency_type": emergency_type,
                            "message": (
                                f"Emergency vehicle detected: {emergency_type}. "
                                "Priority preemption active."
                            ),
                        },
                    }
                )

            # 4. AI recommendations (every RECOMMENDATION_INTERVAL frames)
            if frame_index % RECOMMENDATION_INTERVAL == 0:
                manager.broadcast_sync(
                    {
                        "event": "ai:recommendations",
                        "timestamp": ts,
                        "data": {
                            "camera_id": self.camera_id,
                            "recommendations": recommendations,
                        },
                    }
                )

            # ---- Performance tracking ----
            fps_counter += 1
            frame_index += 1
            elapsed_since_window = time.time() - fps_window_start
            if elapsed_since_window >= 1.0:
                self.current_fps = fps_counter / elapsed_since_window
                fps_counter = 0
                fps_window_start = time.time()

            # ---- Frame rate throttle (30 FPS target) ----
            processing_total = time.time() - loop_start
            target_frame_duration = 1.0 / PLAYBACK_FPS
            sleep_dur = max(0.001, target_frame_duration - processing_total)
            time.sleep(sleep_dur)

        if cap is not None:
            cap.release()
            logger.info("StreamProcessor[%s]: VideoCapture released.", self.camera_id)

    def _inference_loop(self) -> None:
        """
        Asynchronous background worker execution loop.
        Responsible for polling frames from the ingestion queue,
        running the YOLO model and track-centroid math, updating velocities,
        and calculating dynamic traffic optimization recommendations.
        """
        logger.info("Inference worker thread started for camera %s", self.camera_id)
        
        inf_fps_counter = 0
        inf_fps_start = time.time()

        while self.running:
            try:
                # Poll frame from queue
                frame = self.frame_queue.get(timeout=0.1)
            except queue.Empty:
                continue

            loop_start = time.time()
            frame_h, frame_w = frame.shape[:2]

            # ---- YOLO Object Detection ----
            raw_detections = self.detector.detect(frame)

            # ---- Lane Assignment ----
            for det in raw_detections:
                det["lane"] = self.lane_detector.assign_lane(det["box"], frame_w, frame_h)

            # ---- Tracker Update ----
            tracked_objects = self.tracker.update(raw_detections)

            # ---- Velocity Extraction (ByteTrack-like calculations) ----
            for obj in tracked_objects:
                tid = obj.get("track_id")
                box = obj["box"]
                if tid is not None:
                    if tid in self.track_telemetry:
                        tel = self.track_telemetry[tid]
                        # Calculate delta displacement since last inference cycle
                        dx = box[0] - tel["last_box"][0]
                        dy = box[1] - tel["last_box"][1]
                        frames = max(1, tel["frames_since"])
                        
                        # Compute base velocity
                        vx = dx / frames
                        vy = dy / frames
                        
                        # Exponential moving average filter to smooth jitter
                        tel["vx"] = 0.7 * tel["vx"] + 0.3 * vx
                        tel["vy"] = 0.7 * tel["vy"] + 0.3 * vy
                        tel["last_box"] = box
                        tel["frames_since"] = 0
                    else:
                        self.track_telemetry[tid] = {
                            "last_box": box,
                            "vx": 0.0,
                            "vy": 0.0,
                            "frames_since": 0
                        }

            # ---- Emergency Classification ----
            emergency_detected = self._emergency_override
            emergency_type = self._emergency_vehicle_type

            if not emergency_detected:
                for obj in tracked_objects:
                    lbl = obj.get("label", "").lower()
                    if lbl in EMERGENCY_CLASSES:
                        emergency_detected = True
                        emergency_type = lbl
                        break

            # ---- Traffic Analytics ----
            analytics_snapshot = self.analytics.update(tracked_objects, frame_w, frame_h)
            self.total_count = analytics_snapshot["total_count"]

            # ---- Recommendations ----
            recommendations = self.recommender.generate(
                analytics_snapshot, emergency_detected, emergency_type
            )

            # ---- Push results to shared registers ----
            with self.lock:
                self.shared_tracked_objects = tracked_objects
                self.shared_analytics = analytics_snapshot
                self.shared_recommendations = recommendations
                self.shared_emergency_detected = emergency_detected
                self.shared_emergency_type = emergency_type

            # ---- Performance tracking ----
            self.processing_time_ms = round((time.time() - loop_start) * 1000, 2)
            inf_fps_counter += 1
            elapsed_inf = time.time() - inf_fps_start
            if elapsed_inf >= 1.0:
                self.inference_fps = inf_fps_counter / elapsed_inf
                inf_fps_counter = 0
                inf_fps_start = time.time()

            self.frame_queue.task_done()

        logger.info("Inference worker thread stopped for camera %s", self.camera_id)

    # ------------------------------------------------------------------
    # Frame rendering helpers
    # ------------------------------------------------------------------

    def _render_simulated_frame(
        self, sim_vehicles: List[Dict[str, Any]]
    ) -> np.ndarray:
        canvas: np.ndarray = np.zeros((360, 640, 3), dtype=np.uint8)

        # Draw lane dividers — vertical lines
        cv2.line(canvas, (160, 0), (160, 360), (80, 80, 80), 1)
        cv2.line(canvas, (320, 0), (320, 360), (255, 255, 255), 2)  # centre
        cv2.line(canvas, (480, 0), (480, 360), (80, 80, 80), 1)

        # Draw horizontal mid-line
        cv2.line(canvas, (0, 180), (640, 180), (80, 80, 80), 1)

        for veh in sim_vehicles:
            # Advance vehicle position
            veh["y"] += veh["speed"]
            if veh["y"] > 360:
                veh["y"] = -30

            x1, y1 = veh["x"], veh["y"]
            x2, y2 = x1 + 40, y1 + 28

            color = veh.get("color", (0, 200, 0))
            cv2.rectangle(canvas, (x1, y1), (x2, y2), color, -1)
            cv2.rectangle(canvas, (x1, y1), (x2, y2), (255, 255, 255), 1)
            cv2.putText(
                canvas,
                veh["label"],
                (x1, max(0, y1 - 4)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.35,
                (255, 255, 255),
                1,
            )

        # Check for emergency override — render red ambulance
        if self._emergency_override:
            ev_x, ev_y = 300, 60
            cv2.rectangle(canvas, (ev_x, ev_y), (ev_x + 50, ev_y + 32), (0, 0, 220), -1)
            cv2.putText(
                canvas,
                self._emergency_vehicle_type or "ambulance",
                (ev_x, ev_y - 4),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.4,
                (0, 0, 255),
                1,
            )

        cv2.putText(
            canvas,
            f"SIMULATED | Cam: {self.camera_id}",
            (8, 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (0, 255, 255),
            1,
        )
        return canvas

    def _sim_tracked_objects(
        self, sim_vehicles: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        objects: List[Dict[str, Any]] = []
        for idx, veh in enumerate(sim_vehicles):
            x1, y1 = veh["x"], max(0, veh["y"])
            x2, y2 = x1 + 40, y1 + 28
            lane = self.lane_detector.assign_lane([x1, y1, x2, y2], 640, 360)
            objects.append(
                {
                    "box": [x1, y1, x2, y2],
                    "label": veh["label"],
                    "track_id": idx + 1,
                    "confidence": 0.90,
                    "lane": lane,
                }
            )

        if self._emergency_override:
            ev_x, ev_y = 300, 60
            lane = self.lane_detector.assign_lane(
                [ev_x, ev_y, ev_x + 50, ev_y + 32], 640, 360
            )
            objects.append(
                {
                    "box": [ev_x, ev_y, ev_x + 50, ev_y + 32],
                    "label": self._emergency_vehicle_type or "ambulance",
                    "track_id": 99,
                    "confidence": 0.99,
                    "lane": lane,
                }
            )

        return objects

    def _annotate_frame(
        self,
        frame: np.ndarray,
        tracked_objects: List[Dict[str, Any]],
        emergency_detected: bool,
    ) -> None:
        for obj in tracked_objects:
            box: List[int] = obj["box"]
            label: str = obj.get("label", "unknown")
            tid: int = obj.get("track_id", 0)
            conf: float = obj.get("confidence", 0.0)

            is_emergency: bool = label.lower() in EMERGENCY_CLASSES
            color: tuple = (0, 0, 255) if is_emergency else (0, 255, 0)
            thickness: int = 3 if is_emergency else 2

            # Clipping box boundaries
            bx0 = max(0, min(frame.shape[1] - 1, box[0]))
            by0 = max(0, min(frame.shape[0] - 1, box[1]))
            bx1 = max(0, min(frame.shape[1] - 1, box[2]))
            by1 = max(0, min(frame.shape[0] - 1, box[3]))

            cv2.rectangle(frame, (bx0, by0), (bx1, by1), color, thickness)
            annotation_text: str = f"{label} #{tid} {conf:.2f}"
            cv2.putText(
                frame,
                annotation_text,
                (bx0, max(0, by0 - 6)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.4,
                color,
                1,
            )

        # Status overlay bar showing Video FPS and Inference FPS
        status_text: str = (
            f"Cam: {self.camera_id} | V-FPS: {self.current_fps:.1f} "
            f"| I-FPS: {self.inference_fps:.1f} | Latency: {self.processing_time_ms:.1f}ms"
        )
        cv2.putText(
            frame,
            status_text,
            (8, frame.shape[0] - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.42,
            (0, 255, 255),
            1,
        )

        if emergency_detected:
            cv2.putText(
                frame,
                "WARNING: EMERGENCY ACTION PREEMPTION ACTIVE",
                (12, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 0, 255),
                2,
            )
