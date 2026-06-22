import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (type: ToastType, title: string, description?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string, duration?: number) => void;
    error: (title: string, description?: string, duration?: number) => void;
    warning: (title: string, description?: string, duration?: number) => void;
    info: (title: string, description?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, description?: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description, duration }]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (title: string, description?: string, duration?: number) => addToast('success', title, description, duration),
    error: (title: string, description?: string, duration?: number) => addToast('error', title, description, duration),
    warning: (title: string, description?: string, duration?: number) => addToast('warning', title, description, duration),
    info: (title: string, description?: string, duration?: number) => addToast('info', title, description, duration),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      
      {/* Container de Toasts Flutuantes */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            let icon = <Info className="h-5 w-5 text-blue-500" />;
            let borderColor = 'border-blue-500/20';

            if (t.type === 'success') {
              icon = <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
              borderColor = 'border-emerald-500/20 dark:border-emerald-500/10';
            } else if (t.type === 'error') {
              icon = <XCircle className="h-5 w-5 text-red-500" />;
              borderColor = 'border-red-500/20 dark:border-red-500/10';
            } else if (t.type === 'warning') {
              icon = <AlertTriangle className="h-5 w-5 text-amber-500" />;
              borderColor = 'border-amber-500/20 dark:border-amber-500/10';
            }

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
                className={`relative pointer-events-auto flex items-start gap-3 p-4 rounded-xl border glass shadow-2xl overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 ${
                  t.type === 'success' ? 'before:bg-emerald-500' :
                  t.type === 'error' ? 'before:bg-red-500' :
                  t.type === 'warning' ? 'before:bg-amber-500' : 'before:bg-blue-500'
                } bg-white dark:bg-dark-card text-neutral-800 dark:text-neutral-200 ${borderColor}`}
              >
                <div className="flex-shrink-0 mt-0.5">{icon}</div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-sm leading-tight text-neutral-900 dark:text-white">
                    {t.title}
                  </h4>
                  {t.description && (
                    <p className="mt-1 text-xs text-neutral-500 dark:text-dark-text-muted leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};
