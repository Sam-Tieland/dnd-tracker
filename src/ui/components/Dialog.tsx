import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useI18n } from '../../i18n/i18n';

/** The part of the screen the on-screen keyboard leaves free. iPad Safari lays the keyboard over fixed elements instead of shrinking them, so a centred dialog would sit behind it. */
function useVisibleArea(): CSSProperties | undefined {
  const [area, setArea] = useState<CSSProperties>();
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () =>
      setArea(viewport.height < window.innerHeight - 1 ? { top: viewport.offsetTop, bottom: 'auto', height: viewport.height } : undefined);
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);
  return area;
}

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
  const area = useVisibleArea();
  return (
    <div className="dialog-backdrop" style={area} onClick={dismissible ? onClose : undefined}>
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
