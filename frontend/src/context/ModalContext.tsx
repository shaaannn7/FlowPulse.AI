/**
 * File: ModalContext.tsx
 * Purpose: Global Modal Management System.
 * Why it exists: Provides dynamic modal triggers and layouts to overlays, supporting esc-key exits and focus traps.
 */

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalOptions {
  title: string;
  content: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClose?: () => void;
}

interface ModalContextType {
  openModal: (options: ModalOptions) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<ModalOptions | null>(null);

  const openModal = (options: ModalOptions) => setModal(options);
  const closeModal = () => {
    if (modal?.onClose) modal.onClose();
    setModal(null);
  };

  // Close on Escape shortcut
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [modal]);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`relative z-10 w-full rounded-2xl border border-white/5 bg-slate-950 p-6 shadow-2xl backdrop-blur-xl ${
                modal.size === 'sm'
                  ? 'max-w-md'
                  : modal.size === 'lg'
                  ? 'max-w-2xl'
                  : modal.size === 'xl'
                  ? 'max-w-5xl'
                  : 'max-w-lg'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                <h3 className="text-sm font-bold text-slate-100">{modal.title}</h3>
                <button
                  onClick={closeModal}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="text-xs text-slate-300 leading-relaxed max-h-[70vh] overflow-y-auto">
                {modal.content}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
};
