/**
 * File: index.ts
 * Purpose: Frontend type maps referencing root shared models.
 * Why it exists: Binds UI configurations directly to the centralized data definitions.
 */

export * from '../../../shared/types';

// Front-end specific WebSocket event envelope
export type WsEvent =
  | { event: 'stream:frame'; timestamp: number; data: import('../../../shared/types').StreamFrameData }
  | { event: 'metrics:update'; timestamp: number; data: import('../../../shared/types').MetricsUpdateData }
  | { event: 'signal:change'; timestamp: number; data: import('../../../shared/types').SignalStatus }
  | { event: 'alert:emergency'; timestamp: number; data: import('../../../shared/types').EmergencyAlertData }
  | { event: 'ai:recommendations'; timestamp: number; data: import('./video').AIRecommendation[] };
