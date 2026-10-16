import { useRegisterSW } from 'virtual:pwa-register/react';
import { useI18n } from '../i18n/i18n';

/** Spec §13: "New version available · Reload". The app never reloads by itself. */
export function UpdatePrompt() {
  const { t } = useI18n();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="status">
      <span>{t('update.available')}</span>
      <button type="button" className="primary" onClick={() => void updateServiceWorker(true)}>
        {t('update.reload')}
      </button>
    </div>
  );
}
