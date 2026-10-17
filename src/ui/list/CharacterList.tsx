import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import type { Character } from '../../model/character';
import { deriveSheet } from '../../rules/derive';
import { backupDue } from '../../storage/backup';
import { deleteCharacter, loadCharacters, type LoadedCharacters } from '../../storage/characters';
import { Dialog } from '../components/Dialog';
import { useToast } from '../components/Toast';
import { useAppData } from '../data';
import { classSummary } from '../format';
import { ImportButton } from '../ImportButton';
import { hrefFor } from '../router';
import { useExport } from '../use-export';
import { usePdfExport } from '../use-pdf-export';
import './list.css';

/** The message of a failed read or write, as the error box and the toast show it. */
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Spec §8: the start screen, one card per character. */
export function CharacterList() {
  const { db, registry, settings } = useAppData();
  const { t } = useI18n();
  const toast = useToast();
  const { exportCharacter, exportBackup } = useExport();
  const { exportPdf } = usePdfExport();
  const [loaded, setLoaded] = useState<LoadedCharacters>();
  const [loadError, setLoadError] = useState<string>();
  const [toDelete, setToDelete] = useState<{ id: string; name: string }>();

  /** A failed read is shown with the export button (spec §15), never as an empty screen or an unhandled rejection. */
  const reload = useCallback(
    () =>
      loadCharacters(db).then(
        (result) => {
          setLoaded(result);
          setLoadError(undefined);
        },
        (error: unknown) => setLoadError(messageOf(error)),
      ),
    [db],
  );
  useEffect(() => {
    void reload();
  }, [reload]);

  const header = (
    <header className="screen-header">
      <h1>{t('list.title')}</h1>
      <a className="button" href={hrefFor({ name: 'settings' })}>
        {t('nav.settings')}
      </a>
    </header>
  );
  if (loadError !== undefined) {
    return (
      <main className="screen">
        {header}
        <p role="alert">{t('list.loadFailed', { error: loadError })}</p>
        <p>
          <button type="button" onClick={() => void exportBackup()}>
            {t('backup.now')}
          </button>
        </p>
      </main>
    );
  }
  if (!loaded) return null;

  const oldest = loaded.characters.reduce<string | null>((min, c) => (min === null || c.createdAt < min ? c.createdAt : min), null);
  const remind = backupDue(settings.lastExportAt, oldest, new Date().toISOString());
  const nameOf = (character: Pick<Character, 'name'>) => character.name || t('common.unnamed');

  return (
    <main className="screen">
      {header}
      {remind && (
        <div className="notice" role="status">
          <span>{t('backup.reminder')}</span>{' '}
          <button type="button" onClick={() => void exportBackup()}>
            {t('backup.now')}
          </button>
        </div>
      )}
      <div className="row list-actions">
        <a className="button primary" href={hrefFor({ name: 'new' })}>
          {t('list.new')}
        </a>
        <ImportButton onImported={() => void reload()} />
      </div>
      {loaded.characters.length === 0 && loaded.broken.length === 0 && <p className="muted">{t('list.empty')}</p>}
      <ul className="card-list">
        {loaded.characters.map((character) => {
          const sheet = deriveSheet(character, registry);
          return (
            <li key={character.id} className="card character-card">
              <a className="card-main" href={hrefFor({ name: 'sheet', id: character.id })}>
                <strong>{nameOf(character)}</strong>
                <span>{classSummary(sheet) || t('list.noClass')}</span>
                <span className="muted">{t('list.level', { level: sheet.totalLevel })}</span>
              </a>
              <div className="row list-actions">
                <button type="button" onClick={() => void exportCharacter(character)}>
                  {t('list.export')}
                </button>
                <button type="button" aria-label={`${t('pdf.button')} ${nameOf(character)}`} onClick={() => void exportPdf(character)}>
                  {t('pdf.button')}
                </button>
                <button type="button" onClick={() => setToDelete({ id: character.id, name: nameOf(character) })}>
                  {t('common.delete')}
                </button>
              </div>
            </li>
          );
        })}
        {loaded.broken.map((broken) => (
          <li key={broken.id} className="card character-card broken">
            <span>{t('list.broken', { name: broken.name || broken.id, error: broken.error })}</span>
            <button type="button" onClick={() => setToDelete({ id: broken.id, name: broken.name || broken.id })}>
              {t('common.delete')}
            </button>
          </li>
        ))}
      </ul>
      {toDelete && (
        <Dialog
          title={t('list.deleteTitle')}
          onClose={() => setToDelete(undefined)}
          actions={
            <button
              type="button"
              className="danger"
              onClick={async () => {
                try {
                  await deleteCharacter(db, toDelete.id);
                } catch (error) {
                  setToDelete(undefined);
                  toast({ message: t('save.failed', { reason: messageOf(error) }), error: true });
                  return;
                }
                setToDelete(undefined);
                await reload();
              }}
            >
              {t('common.delete')}
            </button>
          }
        >
          <p>{t('list.deleteConfirm', { name: toDelete.name })}</p>
        </Dialog>
      )}
    </main>
  );
}
