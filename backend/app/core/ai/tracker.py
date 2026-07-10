"""
File: tracker.py
Purpose: Centroid bounding box track matcher.
Why it exists: Associates objects across frames, maintaining consistent IDs for vehicle counting.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseTracker(ABC):
    """
    Abstract Base Class defining object tracker requirements.
    """
    @abstractmethod
    def update(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        pass


class IoUTracker(BaseTracker):
    """
    A simple tracker associating bounding boxes across frames using Intersection over Union.
    """
    def __init__(self, max_missed_frames: int = 5, min_iou: float = 0.3):
        self.max_missed_frames = max_missed_frames
        self.min_iou = min_iou
        self.active_tracks = {}  # track_id -> {"box": [], "label": "", "missed": 0}
        self.next_track_id = 1

    def _calculate_iou(self, boxA: List[int], boxB: List[int]) -> float:
        """
        Calculates Intersection over Union (IoU) of two bounding boxes.
        """
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interArea = max(0, xB - xA) * max(0, yB - yA)
        boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[0])
        boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[0])

        unionArea = boxAArea + boxBArea - interArea
        if unionArea == 0:
            return 0.0
        return interArea / float(unionArea)

    def update(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Associates incoming detections with existing tracks.
        """
        updated_tracks = []
        matched_detections = set()

        # Try to match detections with active tracks
        for track_id, track in list(self.active_tracks.items()):
            best_iou = -1.0
            best_det_idx = -1

            for idx, det in enumerate(detections):
                if idx in matched_detections:
                    continue
                iou = self._calculate_iou(track["box"], det["box"])
                if iou > best_iou and iou >= self.min_iou:
                    best_iou = iou
                    best_det_idx = idx

            if best_det_idx != -1:
                # Update existing track
                self.active_tracks[track_id]["box"] = detections[best_det_idx]["box"]
                self.active_tracks[track_id]["missed"] = 0
                matched_detections.add(best_det_idx)
                
                det_copy = dict(detections[best_det_idx])
                det_copy["track_id"] = track_id
                updated_tracks.append(det_copy)
            else:
                # Increment missed counter
                self.active_tracks[track_id]["missed"] += 1
                if self.active_tracks[track_id]["missed"] > self.max_missed_frames:
                    del self.active_tracks[track_id]

        # Initiate new tracks for unmatched detections
        for idx, det in enumerate(detections):
            if idx not in matched_detections:
                track_id = self.next_track_id
                self.next_track_id += 1
                
                self.active_tracks[track_id] = {
                    "box": det["box"],
                    "label": det["label"],
                    "missed": 0
                }
                
                det_copy = dict(det)
                det_copy["track_id"] = track_id
                updated_tracks.append(det_copy)

        return updated_tracks


class VehicleTracker(IoUTracker):
    """
    Subclass interface matching the solution design specifications.
    """
    pass
