import { useEffect, type ReactNode } from 'react';
import { useI18n } from '../../i18n/i18n';

/** A modal dialog; Escape, the backdrop and Cancel close it. `actions` are the confirming buttons. When not dismissible (a write is running) all three are ignored. */
export function Dialog({ title, onClose, actions, dismissible = true, children }: { title: string; onClose: () => void; actions?: ReactNode; dismissible?: boolean; children: ReactNode }) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, dismissible]);
  return (
    <div className="dialog-backdrop" onClick={dismissible ? onClose : undefined}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        {children}
        <div className="dialog-actions">
          {actions}
          <button type="button" disabled={!dismissible} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
