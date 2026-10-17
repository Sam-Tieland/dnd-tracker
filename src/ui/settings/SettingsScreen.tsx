import { useRef, useState } from 'react';
import { useI18n, type Lang } from '../../i18n/i18n';
import { ImportError, parseExportFile } from '../../storage/export';
import { planImport, type ImportPlan } from '../../storage/import';
import type { Settings } from '../../storage/settings';
import { useToast } from '../components/Toast';
import { useAppData } from '../data';
import { hrefFor } from '../router';
import { useExport } from '../use-export';
import { ImportDialog } from './ImportDialog';

/** Spec §8: language, theme, backup and credits. Export of single characters lives on the list; import of files lives here. */
export function SettingsScreen() {
  const { db, settings, updateSettings, reloadContent } = useAppData();
  const { t, lang } = useI18n();
  const { exportBackup } = useExport();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<ImportPlan>();

  const fail = (error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    toast({ message: error instanceof ImportError ? t(`import.error.${error.code}` as const, { reason }) : t('import.failed', { reason }), error: true });
  };

  const choose = async (file: File | undefined) => {
    // Emptied after every choice, so the same file can be chosen again.
    if (input.current) input.current.value = '';
    if (!file) return;
    try {
      setPlan(await planImport(db, parseExportFile(await file.text())));
    } catch (error) {
      fail(error);
    }
  };

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
        <button type="button" onClick={() => input.current?.click()}>
          {t('import.button')}
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          data-testid="import-input"
          hidden
          onChange={(e) => void choose(e.target.files?.[0])}
        />
      </section>
      <section className="card">
        <a className="button" href={hrefFor({ name: 'credits' })}>
          {t('settings.credits')}
        </a>
      </section>
      {plan && (
        <ImportDialog
          plan={plan}
          onClose={() => setPlan(undefined)}
          onDone={(result) => {
            // The data is written; if reading it back fails, it shows after a reload.
            void reloadContent()
              .catch(() => undefined)
              .then(() => {
                setPlan(undefined);
                toast({ message: t('import.done', { ...result }) });
              });
          }}
          onError={(error) => {
            setPlan(undefined);
            fail(error);
          }}
        />
      )}
    </main>
  );
}
