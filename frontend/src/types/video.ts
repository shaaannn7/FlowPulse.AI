/**
 * File: video.ts
 * Purpose: Type definitions for the video upload and real-time AI analytics pipeline.
 * Why it exists: Provides strict TypeScript interfaces for video state, detections,
 *                live metrics, and AI recommendations across the frontend.
 */

export interface VideoUploadState {
  file: File | null;
  status: 'idle' | 'uploading' | 'processing' | 'streaming' | 'error';
  progress: number;
  error: string | null;
  cameraId: string | null;
  filename: string | null;
  sizeMb: number;
}

export interface DetectionObject {
  track_id: number;
  label: string;
  confidence: number;
  box: [number, number, number, number];
  lane: string;
  is_emergency: boolean;
}

export interface LiveMetrics {
  camera_id: string;
  total_count: number;
  congestion_score: number;
  health_score: number;
  fps: number;
  processing_time_ms: number;
  emergency_detected: boolean;
  vehicle_classes: Record<string, number>;
  lane_utilization: Record<string, number>;
  timestamp: number;
  avg_speed_kmh?: number;
  flow_rate?: number;
  co2_saved_kg?: number;
}

/** Severity levels for AI-generated traffic management recommendations. */
export type RecommendationSeverity = 'OPTIMAL' | 'RECOMMENDATION' | 'ALERT';

export interface AIRecommendation {
  id: string;
  title: string;
  severity: RecommendationSeverity;
  confidence: number;
  reason: string;
  improvement: string;
  timestamp: number;
}
