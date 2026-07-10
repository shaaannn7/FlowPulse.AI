"""
File: lane_detector.py
Purpose: Lane assignment logic for vehicle bounding boxes.
Why it exists: Maps pixel coordinates of detected vehicles to named directional lanes
               (NORTH, SOUTH, EAST, WEST) for per-lane occupancy tracking.
"""

from typing import Any


class LaneDetector:
    """
    Assigns vehicles to named lanes based on their bounding box position
    relative to the frame dimensions using quadrant-based partitioning.

    Frame quadrant layout (approximate intersection view from above):
        ┌──────────┬──────────┐
        │  NORTH   │   EAST   │
        │  (top-L) │  (top-R) │
        ├──────────┼──────────┤
        │  WEST    │  SOUTH   │
        │  (bot-L) │  (bot-R) │
        └──────────┴──────────┘
    """

    VALID_LANES = ("NORTH", "SOUTH", "EAST", "WEST")

    def assign_lane(
        self, box: list[int], frame_width: int, frame_height: int
    ) -> str:
        """
        Assigns a vehicle to a named lane based on its bounding box centroid.

        Args:
            box: Bounding box as [x_min, y_min, x_max, y_max] in pixels.
            frame_width: Width of the video frame in pixels.
            frame_height: Height of the video frame in pixels.

        Returns:
            Lane name string: 'NORTH', 'EAST', 'WEST', or 'SOUTH'.
        """
        if not box or len(box) < 4:
            return "NORTH"

        cx = (box[0] + box[2]) / 2.0
        cy = (box[1] + box[3]) / 2.0

        mid_x = frame_width / 2.0
        mid_y = frame_height / 2.0

        if cx < mid_x and cy < mid_y:
            return "NORTH"
        elif cx >= mid_x and cy < mid_y:
            return "EAST"
        elif cx < mid_x and cy >= mid_y:
            return "WEST"
        else:
            return "SOUTH"

    def get_lane_occupancy(
        self,
        tracked_objects: list[dict[str, Any]],
        frame_width: int,
        frame_height: int,
    ) -> dict[str, int]:
        """
        Computes the number of vehicles currently in each lane.

        Args:
            tracked_objects: List of detection dicts with 'box' key.
            frame_width: Frame width in pixels.
            frame_height: Frame height in pixels.

        Returns:
            Dict mapping lane name to vehicle count.
        """
        occupancy: dict[str, int] = {lane: 0 for lane in self.VALID_LANES}
        for obj in tracked_objects:
            box = obj.get("box", [])
            lane = self.assign_lane(box, frame_width, frame_height)
            occupancy[lane] += 1
        return occupancy
