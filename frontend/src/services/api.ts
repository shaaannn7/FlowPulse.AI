import axios from 'axios';
import type { Camera, Junction, SignalStatus, SummaryStats, CongestionPoint } from '../types';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Junctions
  getJunctions: async (): Promise<Junction[]> => {
    const response = await apiClient.get<Junction[]>('/cameras/junctions');
    return response.data;
  },
  
  createJunction: async (name: string, latitude: number, longitude: number): Promise<Junction> => {
    const response = await apiClient.post<Junction>('/cameras/junctions', { name, latitude, longitude });
    return response.data;
  },

  // Cameras
  getCameras: async (): Promise<Camera[]> => {
    const response = await apiClient.get<Camera[]>('/cameras');
    return response.data;
  },

  addCamera: async (junctionId: string, cameraId: string, streamUrl: string): Promise<Camera> => {
    const response = await apiClient.post<Camera>('/cameras', {
      junction_id: junctionId,
      camera_id: cameraId,
      stream_url: streamUrl,
    });
    return response.data;
  },

  removeCamera: async (cameraId: string): Promise<{ status: string; camera_id: string }> => {
    const response = await apiClient.delete<{ status: string; camera_id: string }>(`/cameras/${cameraId}`);
    return response.data;
  },

  // Signals
  getSignalStatus: async (): Promise<SignalStatus> => {
    const response = await apiClient.get<SignalStatus>('/signals/status');
    return response.data;
  },

  overrideSignal: async (junctionId: string, activePhase: string): Promise<SignalStatus> => {
    const response = await apiClient.post<SignalStatus>(`/signals/${junctionId}/override`, {
      mode: 'MANUAL',
      target_phase: activePhase,
    });
    return response.data;
  },

  resumeSignal: async (junctionId: string): Promise<SignalStatus> => {
    const response = await apiClient.post<SignalStatus>(`/signals/${junctionId}/resume`);
    return response.data;
  },

  // Statistics
  getStatsSummary: async (junctionId: string = 'junction_central_01'): Promise<SummaryStats> => {
    const response = await apiClient.get<SummaryStats>(`/stats/summary?junction_id=${junctionId}`);
    return response.data;
  },

  getCongestionHistory: async (junctionId: string = 'junction_central_01', hoursBack: number = 6): Promise<{ junction_id: string; points: CongestionPoint[] }> => {
    const response = await apiClient.get<{ junction_id: string; points: CongestionPoint[] }>(
      `/stats/congestion?junction_id=${junctionId}&hours_back=${hoursBack}`
    );
    return response.data;
  },
};
