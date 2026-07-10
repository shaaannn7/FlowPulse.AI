"""
File: model.py
Purpose: YOLOv11 vehicle detection wrapper.
Why it exists: Loads YOLOv11 weights, manages GPU/CPU execution states, and extracts bounding boxes for vehicle categories.
"""

import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any
import numpy as np

logger = logging.getLogger(__name__)

class BaseDetector(ABC):
    """
    Abstract Base Class defining the contract for all frame object detectors.
    """
    @abstractmethod
    def load_model(self) -> None:
        pass

    @abstractmethod
    def detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        pass


class YOLO11Detector(BaseDetector):
    """
    Inference interface wrapper for YOLOv11 vehicle detection using the Ultralytics SDK.
    """
    def __init__(self, model_path: str = "yolo11n.pt", confidence: float = 0.25):
        self.model_path = model_path
        self.confidence = confidence
        self.device = self._detect_execution_device()
        self.model = None
        self.load_model()

    def _detect_execution_device(self) -> str:
        """
        Determines execution hardware capabilities.
        """
        try:
            import torch
            if torch.cuda.is_available():
                logger.info("NVIDIA CUDA GPU detected. Running YOLOv11 on GPU.")
                return "cuda"
        except ImportError:
            pass
        logger.info("CUDA not found. Running YOLOv11 on CPU fallback.")
        return "cpu"

    def load_model(self) -> None:
        """
        Loads YOLOv11 weights using Ultralytics.
        """
        try:
            from ultralytics import YOLO
            logger.info(f"Loading YOLOv11 model from {self.model_path}...")
            self.model = YOLO(self.model_path)
            logger.info("YOLOv11 model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load YOLOv11 model: {str(e)}. Fallback to simulation mode.")
            self.model = None

    def detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Runs object detection on a single frame and returns vehicle bounding boxes.
        Target classes (COCO): 2 (car), 3 (motorcycle), 5 (bus), 7 (truck).
        """
        if self.model is None:
            return []

        try:
            # Run inference
            results = self.model.predict(
                source=frame,
                conf=self.confidence,
                device=self.device,
                imgsz=320,
                verbose=False
            )
            
            detections = []
            if not results:
                return detections

            result = results[0]
            boxes = result.boxes
            
            # Map COCO indices to human-readable strings
            class_map = {
                2: "car",
                3: "motorcycle",
                5: "bus",
                7: "truck"
            }

            for box in boxes:
                cls_id = int(box.cls[0].item())
                if cls_id in class_map:
                    xyxy = box.xyxy[0].tolist()  # [xmin, ymin, xmax, ymax]
                    conf = float(box.conf[0].item())
                    detections.append({
                        "box": [int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])],
                        "confidence": conf,
                        "class_id": cls_id,
                        "label": class_map[cls_id]
                    })
                    
            return detections
        except Exception as e:
            logger.error(f"YOLOv11 Inference error: {str(e)}")
            return []
