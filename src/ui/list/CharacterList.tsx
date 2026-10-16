import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import type { Character } from '../../model/character';
import { deriveSheet } from '../../rules/derive';
import { backupDue } from '../../storage/backup';
import { deleteCharacter, loadCharacters, type LoadedCharacters } from '../../storage/characters';
import { Dialog } from '../components/Dialog';
import { useAppData } from '../data';
import { classSummary } from '../format';
import { hrefFor } from '../router';
import { useExport } from '../use-export';
import './list.css';

/** Spec §8: the start screen, one card per character. */
export function CharacterList() {
  const { db, registry, settings } = useAppData();
  const { t } = useI18n();
  const { exportCharacter, exportBackup } = useExport();
  const [loaded, setLoaded] = useState<LoadedCharacters>();
  const [toDelete, setToDelete] = useState<{ id: string; name: string }>();

  const reload = useCallback(() => loadCharacters(db).then(setLoaded), [db]);
  useEffect(() => {
    void reload();
  }, [reload]);
  if (!loaded) return null;

  const oldest = loaded.characters.reduce<string | null>((min, c) => (min === null || c.createdAt < min ? c.createdAt : min), null);
  const remind = backupDue(settings.lastExportAt, oldest, new Date().toISOString());
  const nameOf = (character: Pick<Character, 'name'>) => character.name || t('common.unnamed');

  return (
    <main className="screen">
      <header className="screen-header">
        <h1>{t('list.title')}</h1>
        <a className="button" href={hrefFor({ name: 'settings' })}>
          {t('nav.settings')}
        </a>
      </header>
      {remind && (
        <div className="notice" role="status">
          <span>{t('backup.reminder')}</span>{' '}
          <button type="button" onClick={() => void exportBackup()}>
            {t('backup.now')}
          </button>
        </div>
      )}
      <p>
        <a className="button primary" href={hrefFor({ name: 'new' })}>
          {t('list.new')}
        </a>
      </p>
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
              <div className="row">
                <button type="button" onClick={() => void exportCharacter(character)}>
                  {t('list.export')}
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
                await deleteCharacter(db, toDelete.id);
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
