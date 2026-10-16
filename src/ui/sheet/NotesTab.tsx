import { useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import type { Character } from '../../model/character';
import { Dialog } from '../components/Dialog';
import type { ReadySession } from './session';

type Note = Character['notes'][number];

export function NotesTab({ session }: { session: ReadySession }) {
  const { character, commit } = session;
  const { t } = useI18n();
  const [toDelete, setToDelete] = useState<string>();
  const now = () => new Date().toISOString();
  const update = (notes: Note[]) => commit({ ...character, notes });
  const edit = (id: string, patch: Partial<Pick<Note, 'title' | 'body'>>) =>
    update(character.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)));
  return (
    <div className="notes">
      <button type="button" onClick={() => update([{ id: crypto.randomUUID(), title: '', body: '', updatedAt: now() }, ...character.notes])}>
        {t('notes.add')}
      </button>
      {character.notes.length === 0 && <p className="muted">{t('notes.empty')}</p>}
      {character.notes.map((note) => (
        <article key={note.id} className="card note">
          <input aria-label={t('notes.title')} placeholder={t('notes.title')} value={note.title} onChange={(e) => edit(note.id, { title: e.target.value })} />
          <textarea aria-label={t('notes.body')} rows={6} value={note.body} onChange={(e) => edit(note.id, { body: e.target.value })} />
          <button type="button" className="danger" onClick={() => setToDelete(note.id)}>
            {t('common.delete')}
          </button>
        </article>
      ))}
      {toDelete && (
        <Dialog
          title={t('notes.deleteTitle')}
          onClose={() => setToDelete(undefined)}
          actions={
            <button
              type="button"
              className="danger"
              onClick={() => {
                update(character.notes.filter((n) => n.id !== toDelete));
                setToDelete(undefined);
              }}
            >
              {t('common.delete')}
            </button>
          }
        >
          <p>{t('notes.deleteConfirm')}</p>
        </Dialog>
      )}
    </div>
  );
}
