import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n/i18n';

export interface ToastInput {
  message: string;
  action?: { label: string; run: () => void };
  /** Errors stay until closed; other toasts close after 6 seconds. */
  error?: boolean;
}

/** Matches the fade-out of .toast-leaving in styles.css. */
const TOAST_EXIT_MS = 150;

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [toast, setToast] = useState<(ToastInput & { key: number }) | null>(null);
  // A closing toast fades out briefly before it goes, so it doesn't vanish from one frame to the next.
  const [leaving, setLeaving] = useState(false);
  const counter = useRef(0);
  const show = useCallback((input: ToastInput) => {
    counter.current += 1;
    setLeaving(false);
    setToast({ ...input, key: counter.current });
  }, []);
  const close = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    if (!toast || toast.error) return;
    const timer = setTimeout(close, 6000);
    return () => clearTimeout(timer);
  }, [toast, close]);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => {
      setToast(null);
      setLeaving(false);
    }, TOAST_EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

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
          <div
            key={toast.key}
            className={['toast', toast.error && 'toast-error', leaving && 'toast-leaving'].filter(Boolean).join(' ')}
            inert={leaving}
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run();
                  close();
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button type="button" aria-label={t('common.close')} onClick={close}>
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
