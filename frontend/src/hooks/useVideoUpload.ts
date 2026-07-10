/**
 * File: useVideoUpload.ts
 * Purpose: Custom hook managing video file selection, validation, and upload state.
 * Why it exists: Encapsulates all upload logic (drag events, file validation, POST to backend,
 *                DELETE to remove stream) so components stay clean and declarative.
 */

import { useState } from 'react';
import type { VideoUploadState } from '../types/video';

const API_BASE = 'http://localhost:8001/api/v1';
const ALLOWED_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv'];
const MAX_SIZE_MB = 500;

export function useVideoUpload() {
  const [uploadState, setUploadState] = useState<VideoUploadState>({
    file: null,
    status: 'idle',
    progress: 0,
    error: null,
    cameraId: null,
    filename: null,
    sizeMb: 0,
  });

  const [isDragging, setIsDragging] = useState(false);

  /** Validates the selected file and updates state accordingly. */
  const handleFileSelect = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadState((prev) => ({
        ...prev,
        error: `Unsupported format "${ext}". Accepted: MP4, AVI, MOV, MKV.`,
        status: 'error',
        file: null,
      }));
      return;
    }
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_SIZE_MB) {
      setUploadState((prev) => ({
        ...prev,
        error: `File too large (${sizeMb.toFixed(1)} MB). Maximum is ${MAX_SIZE_MB} MB.`,
        status: 'error',
        file: null,
      }));
      return;
    }
    setUploadState({
      file,
      status: 'idle',
      progress: 0,
      error: null,
      cameraId: null,
      filename: file.name,
      sizeMb: parseFloat(sizeMb.toFixed(2)),
    });
  };

  /** POSTs the selected file to the backend upload endpoint. */
  const handleUpload = async () => {
    if (!uploadState.file) return;

    setUploadState((prev) => ({ ...prev, status: 'uploading', progress: 10, error: null }));

    const formData = new FormData();
    formData.append('file', uploadState.file);

    try {
      // Simulate progress during upload (fetch doesn't expose upload progress)
      const progressTimer = setInterval(() => {
        setUploadState((prev) =>
          prev.progress < 85
            ? { ...prev, progress: prev.progress + 15 }
            : prev
        );
      }, 300);

      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressTimer);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();

      setUploadState((prev) => ({
        ...prev,
        status: 'processing',
        progress: 95,
        cameraId: data.camera_id,
      }));

      // Brief delay to let the pipeline spin up, then mark as streaming
      setTimeout(() => {
        setUploadState((prev) => ({ ...prev, status: 'streaming', progress: 100 }));
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadState((prev) => ({
        ...prev,
        status: 'error',
        error: msg,
        progress: 0,
      }));
    }
  };

  /** Sends a DELETE request to stop and remove the uploaded stream. */
  const handleRemove = async () => {
    try {
      await fetch(`${API_BASE}/upload`, { method: 'DELETE' });
    } catch {
      // Ignore network error on remove — state reset regardless
    }
    setUploadState({
      file: null,
      status: 'idle',
      progress: 0,
      error: null,
      cameraId: null,
      filename: null,
      sizeMb: 0,
    });
  };

  return {
    uploadState,
    handleFileSelect,
    handleUpload,
    handleRemove,
    isDragging,
    setIsDragging,
  };
}
