import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n/i18n';

export interface ToastInput {
  message: string;
  action?: { label: string; run: () => void };
  /** Errors stay until closed; other toasts close after 6 seconds. */
  error?: boolean;
}

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [toast, setToast] = useState<(ToastInput & { key: number }) | null>(null);
  const counter = useRef(0);
  const show = useCallback((input: ToastInput) => {
    counter.current += 1;
    setToast({ ...input, key: counter.current });
  }, []);

  useEffect(() => {
    if (!toast || toast.error) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  // A toast with an action belongs to the screen it came from (Undo of a closed sheet); leaving that screen removes it.
  useEffect(() => {
    const onRouteChange = () => setToast((current) => (current?.action ? null : current));
    window.addEventListener('hashchange', onRouteChange);
    return () => window.removeEventListener('hashchange', onRouteChange);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div key={toast.key} className={toast.error ? 'toast toast-error' : 'toast'}>
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button type="button" aria-label={t('common.close')} onClick={() => setToast(null)}>
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (toast: ToastInput) => void {
  return useContext(ToastContext);
}
