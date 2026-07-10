"""
File: upload.py
Purpose: Video file upload and stream ingestion endpoint.
Why it exists: Allows operators to upload local video files (MP4, AVI, MOV, MKV)
which are then persisted to disk and immediately fed into the StreamProcessor
pipeline under the reserved camera ID 'cam_uploaded'.  A companion DELETE
endpoint allows the stream to be gracefully torn down and the stored file removed.
"""

import logging
import os
import shutil
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.ai.pipeline import StreamProcessor
from app.core.registry import active_processors

logger = logging.getLogger(__name__)

router = APIRouter()

# ------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------

UPLOAD_DIR: Path = Path(__file__).resolve().parents[4] / "uploads"
ALLOWED_EXTENSIONS: set = {".mp4", ".avi", ".mov", ".mkv"}
MAX_FILE_SIZE_BYTES: int = 500 * 1024 * 1024  # 500 MB
CAMERA_ID: str = "cam_uploaded"


def _ensure_upload_dir() -> None:
    """
    Creates the uploads directory (and any intermediate parents) if it does
    not already exist.  Called lazily on each upload request.
    """
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ------------------------------------------------------------------
# POST /upload — accept and stream a video file
# ------------------------------------------------------------------


@router.post("", summary="Upload a video file to the live stream pipeline")
async def upload_video(
    file: UploadFile = File(..., description="Video file to upload (.mp4/.avi/.mov/.mkv)"),
) -> Dict[str, Any]:
    """
    Accepts a multipart video file upload, validates it, persists it to the
    server's ``uploads/`` directory, and starts a :class:`StreamProcessor`
    thread that feeds frames through the full AI pipeline.

    Any previously running 'cam_uploaded' stream is stopped before the new
    one is started, ensuring only one uploaded stream runs at a time.

    Args:
        file: The multipart file uploaded by the client.  Must have an
              extension of ``.mp4``, ``.avi``, ``.mov``, or ``.mkv`` and
              must be smaller than 500 MB.

    Returns:
        JSON body containing:
            - ``camera_id``  (str)   : Always 'cam_uploaded'.
            - ``filename``   (str)   : Sanitised filename saved on disk.
            - ``size_mb``    (float) : Persisted file size in megabytes.
            - ``status``     (str)   : 'streaming' on success.

    Raises:
        HTTPException 400: If the file extension is not allowed.
        HTTPException 413: If the file size exceeds the 500 MB limit.
        HTTPException 500: If the file cannot be saved or the processor
                           fails to start.
    """
    # --- Validate extension ---
    suffix: str = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{suffix}'. "
                f"Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    # --- Read content with size guard ---
    content: bytes = await file.read()
    file_size: int = len(content)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File size {round(file_size / (1024**2), 2)} MB exceeds the "
                f"500 MB upload limit."
            ),
        )

    # --- Persist file ---
    _ensure_upload_dir()
    safe_filename: str = Path(file.filename or "upload").name
    dest_path: Path = UPLOAD_DIR / safe_filename

    try:
        with open(dest_path, "wb") as fh:
            fh.write(content)
        logger.info("Uploaded file saved to %s (%d bytes)", dest_path, file_size)
    except OSError as exc:
        logger.exception("Failed to write uploaded file: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save uploaded file: {exc}",
        ) from exc

    # --- Stop any existing cam_uploaded processor ---
    if CAMERA_ID in active_processors:
        try:
            active_processors[CAMERA_ID].stop()
            logger.info("Stopped previous StreamProcessor for %s", CAMERA_ID)
        except Exception as exc:
            logger.warning("Error stopping previous processor: %s", exc)
        del active_processors[CAMERA_ID]

    # --- Start new StreamProcessor ---
    try:
        processor = StreamProcessor(camera_id=CAMERA_ID, source=str(dest_path))
        active_processors[CAMERA_ID] = processor
        processor.start()
        logger.info("StreamProcessor started for %s (source: %s)", CAMERA_ID, dest_path)
    except Exception as exc:
        logger.exception("Failed to start StreamProcessor: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Stream processor failed to start: {exc}",
        ) from exc

    size_mb: float = round(file_size / (1024 * 1024), 2)
    return {
        "camera_id": CAMERA_ID,
        "filename": safe_filename,
        "size_mb": size_mb,
        "status": "streaming",
    }


# ------------------------------------------------------------------
# DELETE /upload — stop the running uploaded stream
# ------------------------------------------------------------------


@router.delete("", summary="Stop and remove the uploaded video stream")
async def delete_upload() -> Dict[str, Any]:
    """
    Gracefully stops the 'cam_uploaded' StreamProcessor (if running) and
    removes the corresponding uploaded video file from disk.

    Returns:
        JSON body with keys:
            - ``camera_id`` (str) : 'cam_uploaded'
            - ``status``    (str) : 'stopped'

    Raises:
        HTTPException 404: If no uploaded stream is currently active.
    """
    if CAMERA_ID not in active_processors:
        raise HTTPException(
            status_code=404,
            detail="No active uploaded stream found. Upload a video first.",
        )

    processor: StreamProcessor = active_processors[CAMERA_ID]
    source_path: str = processor.source

    # Stop the thread
    try:
        processor.stop()
        logger.info("Stopped StreamProcessor for %s", CAMERA_ID)
    except Exception as exc:
        logger.warning("Error while stopping StreamProcessor: %s", exc)

    del active_processors[CAMERA_ID]

    # Remove file from disk if it still exists within the uploads directory
    if source_path and os.path.isfile(source_path):
        try:
            os.remove(source_path)
            logger.info("Removed uploaded video file: %s", source_path)
        except OSError as exc:
            logger.warning("Could not remove uploaded file %s: %s", source_path, exc)

    return {"camera_id": CAMERA_ID, "status": "stopped"}
