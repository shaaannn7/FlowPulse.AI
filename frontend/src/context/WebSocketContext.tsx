import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { StreamFrameData, MetricsUpdateData, SignalStatus, EmergencyAlertData, WsEvent } from '../types';
import type { AIRecommendation } from '../types/video';


interface WebSocketContextType {
  lastFrame: StreamFrameData | null;
  lastMetrics: MetricsUpdateData | null;
  signalStatus: SignalStatus | null;
  alerts: EmergencyAlertData[];
  /** Server-pushed AI recommendation cards (event: 'ai:recommendations') */
  recommendations: AIRecommendation[];
  isConnected: boolean;
  clearAlerts: () => void;
  sendOverrideCommand: (phase: 'NORTH_SOUTH' | 'EAST_WEST') => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastFrame, setLastFrame] = useState<StreamFrameData | null>(null);
  const [lastMetrics, setLastMetrics] = useState<MetricsUpdateData | null>(null);
  const [signalStatus, setSignalStatus] = useState<SignalStatus | null>(null);
  const [alerts, setAlerts] = useState<EmergencyAlertData[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectDelayRef = useRef(1000); // Start reconnect timer at 1 second
  const lastFrameUpdateRef = useRef<number>(0);

  const connect = () => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws/dashboard_client';
    console.log(`Connecting to WebSocket: ${WS_URL}`);
    
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket Connection Established');
      setIsConnected(true);
      reconnectDelayRef.current = 1000; // Reset reconnection timer on success
    };

    ws.onmessage = (event) => {
      try {
        const payload: WsEvent = JSON.parse(event.data);
        
        switch (payload.event) {
          case 'stream:frame': {
            const now = performance.now();
            if (now - lastFrameUpdateRef.current > 500) {
              setLastFrame(payload.data);
              lastFrameUpdateRef.current = now;
            }
            break;
          }
          case 'metrics:update':
            setLastMetrics(payload.data);
            break;
          case 'signal:change':
            setSignalStatus(payload.data);
            break;
          case 'alert:emergency':
            setAlerts((prev) => [payload.data, ...prev].slice(0, 20)); // Keep last 20 alerts
            break;
          case 'ai:recommendations':
            if (payload.data && typeof payload.data === 'object' && 'recommendations' in payload.data) {
              setRecommendations(((payload.data as any).recommendations as AIRecommendation[]).slice(0, 10));
            } else {
              setRecommendations((payload.data as AIRecommendation[]).slice(0, 10));
            }
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.warn('WebSocket Connection Closed. Attempting Reconnect...');
      setIsConnected(false);
      triggerReconnect();
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error encountered:', err);
      ws.close();
    };
  };

  const triggerReconnect = () => {
    if (reconnectTimeoutRef.current) return;
    
    // Exponential backoff capped at 30 seconds
    const delay = reconnectDelayRef.current;
    reconnectDelayRef.current = Math.min(30000, delay * 2);
    
    reconnectTimeoutRef.current = window.setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connect();
    }, delay);
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const sendOverrideCommand = (phase: 'NORTH_SOUTH' | 'EAST_WEST') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        command: 'override',
        junction_id: 'junction_central_01',
        target_phase: phase
      }));
    }
  };

  useEffect(() => {
    connect();

    const handleMockMessage = (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload: WsEvent = customEvent.detail;
      
      switch (payload.event) {
        case 'stream:frame': {
          const now = performance.now();
          if (now - lastFrameUpdateRef.current > 500) {
            setLastFrame(payload.data);
            lastFrameUpdateRef.current = now;
          }
          break;
        }
        case 'metrics:update':
          setLastMetrics(payload.data);
          break;
        case 'signal:change':
          setSignalStatus(payload.data);
          break;
        case 'alert:emergency':
          setAlerts((prev) => [payload.data, ...prev].slice(0, 20));
          break;
        case 'ai:recommendations':
          if (payload.data && typeof payload.data === 'object' && 'recommendations' in payload.data) {
            setRecommendations(((payload.data as any).recommendations as AIRecommendation[]).slice(0, 10));
          } else {
            setRecommendations((payload.data as AIRecommendation[]).slice(0, 10));
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('mock-ws-message', handleMockMessage);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      window.removeEventListener('mock-ws-message', handleMockMessage);
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        lastFrame,
        lastMetrics,
        signalStatus,
        alerts,
        recommendations,
        isConnected,
        clearAlerts,
        sendOverrideCommand,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
