import React from 'react';
import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { playSynthesizedSound } from '../../lib/sound';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface NotificationStore {
  toasts: ToastMessage[];
  addToast: (message: string, type: ToastMessage['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useNotifications = create<NotificationStore>((set) => ({
  toasts: [],
  addToast: (message, type, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Play programmatic sound feedback
    if (type === 'error' || type === 'warning') {
      playSynthesizedSound('emergency');
    } else {
      playSynthesizedSound('notification');
    }

    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotifications();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bg = 'bg-slate-900 border-slate-800 text-slate-100';
          if (toast.type === 'success') bg = 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300';
          if (toast.type === 'error') bg = 'bg-rose-950/80 border-rose-500/30 text-rose-300';
          if (toast.type === 'warning') bg = 'bg-amber-950/80 border-amber-500/30 text-amber-300';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              onClick={() => removeToast(toast.id)}
              className={`flex items-center justify-between cursor-pointer rounded-xl border p-4 shadow-lg backdrop-blur-md text-xs font-semibold ${bg}`}
            >
              <span>{toast.message}</span>
              <button className="ml-4 text-slate-400 hover:text-slate-200">×</button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
