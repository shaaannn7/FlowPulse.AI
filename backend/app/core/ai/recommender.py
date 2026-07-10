"""
File: recommender.py
Purpose: AI Traffic Recommendation engine.
Why it exists: Analyses computed analytics snapshots and produces human-readable
               signal optimization recommendations with severity, confidence,
               and expected improvement metrics.
"""

import time
from typing import Any
import uuid
import threading
import logging

try:
    import google.generativeai as genai
except ImportError:
    genai = None

from app.config import settings

logger = logging.getLogger(__name__)


class AIRecommender:
    """
    Rule-based AI recommendation engine that generates signal optimization
    and emergency response recommendations from real-time traffic analytics.

    In future phases this will be replaced by a trained ML model using
    historical junction data to predict optimal phase timing.
    """

    def __init__(self):
        self._gemini_configured = False
        if genai and settings.GEMINI_API_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.model = genai.GenerativeModel('gemini-2.5-flash')
                self._gemini_configured = True
                logger.info("Gemini AI integration successfully configured.")
            except Exception as e:
                logger.error(f"Failed to configure Gemini API: {e}")
                
        self._gemini_lock = threading.Lock()
        self._is_fetching_gemini = False
        self._gemini_response_reason = None
        self._gemini_response_improvement = None
        self._last_emergency_type = None

    def _fetch_gemini_recommendation_async(self, emergency_type: str, congestion: float, health_score: int):
        def _fetch():
            with self._gemini_lock:
                self._is_fetching_gemini = True
            
            try:
                prompt = (
                    f"You are a Smart City Traffic Intelligence AI. An emergency vehicle '{emergency_type}' is approaching an intersection. "
                    f"Current intersection stats: Health Score {health_score}/100, Congestion {int(congestion*100)}%. "
                    "Generate a tactical recommendation for the smart city operator. "
                    "Provide two short paragraphs separated by a pipe character (|). "
                    "Paragraph 1: The Reason (e.g. why we need to clear the road, taking traffic conditions into account). "
                    "Paragraph 2: The Improvement (e.g. actionable steps taken, estimated clearance time, impact on cross-traffic). "
                    "Keep each paragraph concise (1-2 sentences). Do not use markdown."
                )
                response = self.model.generate_content(prompt)
                text = response.text.strip()
                if "|" in text:
                    reason, improvement = text.split("|", 1)
                else:
                    reason = text
                    improvement = "AI Green Corridor activated based on Gemini analysis."
                    
                with self._gemini_lock:
                    self._gemini_response_reason = reason.strip()
                    self._gemini_response_improvement = improvement.strip()
            except Exception as e:
                logger.error(f"Gemini API error: {e}")
            finally:
                with self._gemini_lock:
                    self._is_fetching_gemini = False

        threading.Thread(target=_fetch, daemon=True, name="Gemini-Recommendation").start()

    def generate(
        self,
        analytics: dict[str, Any],
        emergency_detected: bool = False,
        emergency_type: str = "",
    ) -> list[dict[str, Any]]:
        """
        Generates a prioritized list of traffic recommendations.

        Args:
            analytics: Latest analytics snapshot from TrafficAnalytics.get_summary().
            emergency_detected: True if an emergency vehicle is currently detected.
            emergency_type: The class label of the detected emergency vehicle.

        Returns:
            List of recommendation dicts with keys:
            id, title, severity, confidence, reason, improvement, timestamp.
        """
        recommendations: list[dict[str, Any]] = []
        health_score: int = analytics.get("health_score", 100)
        congestion: float = analytics.get("congestion_score", 0.0)
        lane_util: dict[str, int] = analytics.get("lane_utilization", {})
        total: int = analytics.get("total_count", 0)
        now = time.time()

        # --- Emergency override recommendation ---
        if emergency_detected:
            vtype = emergency_type.upper() if emergency_type else "EMERGENCY VEHICLE"
            
            reason = f"{vtype} detected approaching northbound lane. All cross-traffic signals should hold RED immediately."
            improvement = "AI Green Corridor activated. Estimated clearance time: 12 seconds. Cross-traffic delay: ~28 seconds."
            
            if self._gemini_configured:
                with self._gemini_lock:
                    if self._last_emergency_type != vtype:
                        self._last_emergency_type = vtype
                        self._gemini_response_reason = None
                        self._gemini_response_improvement = None
                        self._fetch_gemini_recommendation_async(vtype, congestion, health_score)
                    
                    if self._gemini_response_reason and self._gemini_response_improvement:
                        reason = self._gemini_response_reason
                        improvement = self._gemini_response_improvement
                    elif self._is_fetching_gemini:
                        reason = f"Gemini Intelligence is analyzing the {vtype} approach and calculating optimal clearance corridors..."
                        improvement = "Calculating dynamic cross-traffic delay and rerouting plans. Please wait."

            recommendations.append({
                "id": str(uuid.uuid4()),
                "title": "Emergency Priority Preemption (Gemini AI)",
                "severity": "ALERT",
                "confidence": 0.99,
                "reason": reason,
                "improvement": improvement,
                "timestamp": now,
            })
            return recommendations  # Emergency recommendation is singular and highest priority
        else:
            if self._last_emergency_type is not None:
                with self._gemini_lock:
                    self._last_emergency_type = None
                    self._gemini_response_reason = None
                    self._gemini_response_improvement = None

        # --- Critical congestion ---
        if health_score < 40:
            recommendations.append({
                "id": str(uuid.uuid4()),
                "title": "Critical Congestion Detected",
                "severity": "ALERT",
                "confidence": 0.92,
                "reason": f"Health score has dropped to {health_score}/100. "
                          f"Density exceeds {int(congestion * 100)}% threshold. "
                          f"Active vehicle count: {total}.",
                "improvement": "Recommend maximum green extension on primary corridor. "
                               "Estimated queue clearance: +45 seconds.",
                "timestamp": now,
            })

        # --- Heavy congestion ---
        elif health_score < 65:
            # Find most congested lane
            most_congested = max(lane_util, key=lane_util.get) if lane_util else "NORTH"
            count = lane_util.get(most_congested, 0)
            recommendations.append({
                "id": str(uuid.uuid4()),
                "title": f"Extend {most_congested} Green Phase",
                "severity": "RECOMMENDATION",
                "confidence": 0.82,
                "reason": f"{most_congested} lane shows highest occupancy: {count} vehicles. "
                          f"Overall health score: {health_score}/100.",
                "improvement": f"Extending green phase by 15 seconds reduces {most_congested} "
                               f"queue by ~{count * 2} vehicles. Expected wait reduction: 24s.",
                "timestamp": now,
            })

        # --- Moderate state ---
        elif health_score < 80:
            recommendations.append({
                "id": str(uuid.uuid4()),
                "title": "Adaptive Timing Active",
                "severity": "RECOMMENDATION",
                "confidence": 0.74,
                "reason": f"Moderate traffic density detected. "
                          f"Health score: {health_score}/100. Total vehicles: {total}.",
                "improvement": "Minor phase adjustment recommended. "
                               "Standard adaptive cycle running within optimal parameters.",
                "timestamp": now,
            })

        # --- Optimal state ---
        else:
            co2 = round(analytics.get("co2_saved_kg", 0.0), 2)
            recommendations.append({
                "id": str(uuid.uuid4()),
                "title": "AI Adaptive Flow Optimal",
                "severity": "OPTIMAL",
                "confidence": 0.94,
                "reason": f"All lanes operating within optimal parameters. "
                          f"Health score: {health_score}/100. "
                          f"Vehicle count nominal at {total}.",
                "improvement": f"Estimated CO2 reduction: 14% this hour. "
                               f"Session CO2 savings: {co2} kg. "
                               "Standard light loop proceeding normally.",
                "timestamp": now,
            })

        return recommendations
