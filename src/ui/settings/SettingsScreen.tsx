import { useEffect, useRef, useState } from 'react';
import { useI18n, type Lang } from '../../i18n/i18n';
import type { Settings } from '../../storage/settings';
import { deleteSheetTemplate, loadSheetTemplate, saveSheetTemplate } from '../../storage/sheet-template';
import { useToast } from '../components/Toast';
import { useAppData } from '../data';
import { checkTemplate, TemplateError } from '../pdf/fill-sheet';
import { hrefFor } from '../router';
import { ImportButton } from '../ImportButton';
import { useExport } from '../use-export';

/** The player's own character sheet (PDF), chosen once and kept on this device. */
function SheetTemplateCard() {
  const { db } = useAppData();
  const { t } = useI18n();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string>();

  useEffect(() => {
    let live = true;
    void loadSheetTemplate(db).then((template) => live && setName(template?.name), () => undefined);
    return () => {
      live = false;
    };
  }, [db]);

  const fail = (error: unknown) => {
    const reason = error instanceof TemplateError ? t(`pdf.error.${error.code}` as const) : error instanceof Error ? error.message : String(error);
    toast({ message: t('pdf.failed', { reason }), error: true });
  };

  const choose = async (file: File | undefined) => {
    // Emptied after every choice, so the same file can be chosen again.
    if (input.current) input.current.value = '';
    if (!file) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await checkTemplate(bytes);
      await saveSheetTemplate(db, { name: file.name, bytes, savedAt: new Date().toISOString() });
      setName(file.name);
      toast({ message: t('pdf.saved') });
    } catch (error) {
      fail(error);
    }
  };

  return (
    <section className="card">
      <h2>{t('pdf.section')}</h2>
      <p className="muted">{t('pdf.help')}</p>
      {name !== undefined && <p>{t('pdf.current', { name })}</p>}
      <button type="button" onClick={() => input.current?.click()}>
        {t('pdf.choose')}
      </button>{' '}
      {name !== undefined && (
        <button
          type="button"
          onClick={() =>
            void deleteSheetTemplate(db).then(
              () => setName(undefined),
              (error: unknown) => fail(error),
            )
          }
        >
          {t('pdf.remove')}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept=".pdf,application/pdf"
        data-testid="sheet-input"
        hidden
        onChange={(e) => void choose(e.target.files?.[0])}
      />
    </section>
  );
}

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
      <SheetTemplateCard />
      <section className="card">
        <a className="button" href={hrefFor({ name: 'credits' })}>
          {t('settings.credits')}
        </a>
      </section>
    </main>
  );
}
