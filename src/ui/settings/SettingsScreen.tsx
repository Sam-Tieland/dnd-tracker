import { useI18n, type Lang } from '../../i18n/i18n';
import type { Settings } from '../../storage/settings';
import { useAppData } from '../data';
import { hrefFor } from '../router';
import { ImportButton } from '../ImportButton';
import { useExport } from '../use-export';

/** Spec §8: language, theme, backup and credits. Export of single characters lives on the list; import is on the list and here. */
export function SettingsScreen() {
  const { settings, updateSettings } = useAppData();
  const { t, lang } = useI18n();
  const { exportBackup } = useExport();
  return (
    <main className="screen">
      <header className="screen-header">
        <a className="button" href={hrefFor({ name: 'list' })}>
          {t('nav.back')}
        </a>
        <h1>{t('settings.title')}</h1>
      </header>
      <section className="card">
        <label className="field">
          {t('settings.language')}
          <select
            value={settings.language ?? 'device'}
            onChange={(e) => void updateSettings({ language: e.target.value === 'device' ? null : (e.target.value as Lang) })}
          >
            <option value="device">{t('settings.languageDevice')}</option>
            <option value="nl">Nederlands</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="field">
          {t('settings.theme')}
          <select value={settings.theme} onChange={(e) => void updateSettings({ theme: e.target.value as Settings['theme'] })}>
            <option value="auto">{t('settings.themeAuto')}</option>
            <option value="light">{t('settings.themeLight')}</option>
            <option value="dark">{t('settings.themeDark')}</option>
          </select>
        </label>
      </section>
      <section className="card">
        <h2>{t('settings.backup')}</h2>
        <p className="muted">
          {settings.lastExportAt
            ? t('settings.lastExport', { date: new Date(settings.lastExportAt).toLocaleDateString(lang) })
            : t('settings.neverExported')}
        </p>
        <button type="button" onClick={() => void exportBackup()}>
          {t('backup.now')}
        </button>{' '}
        <ImportButton />
      </section>
      <section className="card">
        <a className="button" href={hrefFor({ name: 'credits' })}>
          {t('settings.credits')}
        </a>
      </section>
    </main>
  );
}
