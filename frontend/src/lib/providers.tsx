/**
 * File: providers.tsx
 * Purpose: Unified Context Provider wrapper.
 * Why it exists: Combines React Query client, custom WebSockets, error boundaries, and toast views.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketProvider } from '../context/WebSocketContext';
import { JudgeModeProvider } from '../context/JudgeModeContext';
import { ModalProvider } from '../context/ModalContext';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { ToastContainer } from '../components/ui/Notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <JudgeModeProvider>
            <ModalProvider>
              {children}
              <ToastContainer />
            </ModalProvider>
          </JudgeModeProvider>
        </WebSocketProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default AppProviders;
