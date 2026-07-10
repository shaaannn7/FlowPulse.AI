/**
 * File: types.ts
 * Purpose: Shared data contracts and type unions.
 * Why it exists: Enforces strict data models between the TypeScript UI and Python APIs.
 */

// --- Operational Type Unions ---

export type JunctionStatus = 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE';
export type CameraStatus = 'STREAMING' | 'DISCONNECTED' | 'COMPLETED';
export type SignalPhase = 'NORTH_SOUTH' | 'EAST_WEST';
export type TriggerSource = 'ALGORITHM' | 'EMERGENCY_PREEMPT' | 'MANUAL_OVERRIDE';

// --- Data Interfaces ---

export interface Junction {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: JunctionStatus;
  created_at: string;
}

export interface Camera {
  id: string;
  junction_id: string;
  camera_id: string;
  stream_url: string;
  status: CameraStatus;
  started_at: string;
  ended_at?: string;
}

export interface LaneMetric {
  queue_length: number;
  avg_wait_sec: number;
}

export interface MetricsUpdateData {
  junction_id?: string;
  camera_id: string;
  congestion_score: number;
  total_count: number;
  emergency_detected: boolean;
  lanes?: Record<string, LaneMetric>;
  // Extended AI pipeline fields
  health_score: number;
  fps: number;
  processing_time_ms: number;
  vehicle_classes: Record<string, number>;
  lane_utilization: Record<string, number>;
  avg_speed_kmh?: number;
  flow_rate?: number;
  co2_saved_kg?: number;
}

export interface StreamFrameData {
  camera_id: string;
  frame: string; // Base64 JPEG
  fps: number;
  inference_fps?: number;
}

export interface SignalStatus {
  junction_id: string;
  active_phase: SignalPhase;
  mode: 'AUTO' | 'MANUAL';
  seconds_remaining: number;
  emergency_active: boolean;
}

export interface EmergencyAlertData {
  camera_id: string;
  vehicle_type: 'ambulance' | 'fire_truck' | 'police_car';
  confidence: number;
  action_taken: string;
}

export interface SummaryStats {
  total_vehicles_today: number;
  average_congestion_score: number;
  co2_saved_kg: number;
  emergency_preemptions_triggered: number;
  active_connections: number;
}

export interface CongestionPoint {
  hour: number;
  congestion_score: number;
  vehicle_count: number;
}

// --- REST Payload DTOs ---

export interface SignalOverrideRequest {
  mode: 'MANUAL';
  target_phase: SignalPhase;
}

export interface CameraCreateRequest {
  junction_id: string;
  camera_id: string;
  stream_url: string;
}

export interface JunctionCreateRequest {
  name: string;
  latitude: number;
  longitude: number;
}
