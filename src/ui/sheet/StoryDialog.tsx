import { useEffect } from 'react';
import { useI18n } from '../../i18n/i18n';
import type { Character } from '../../model/character';
import type { ReadySession } from './session';

type Detail = keyof Character['details'];

/**
 * The character's story, opened from the sheet: the backstory as a page to read and write on, with personality,
 * appearance and alignment beside it. Every change is saved as you type, so there is nothing to confirm; Close,
 * Escape and the backdrop only close the page.
 */
export function StoryDialog({ session, onClose }: { session: ReadySession; onClose: () => void }) {
  const { character, commit } = session;
  const { t } = useI18n();
  const name = character.name || t('common.unnamed');
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  // No undo label: typing is not an action to undo one letter at a time, the same as the notes.
  const set = (field: Detail) => (value: string) => commit({ ...character, details: { ...character.details, [field]: value } });
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog story" role="dialog" aria-modal="true" aria-label={t('story.title', { name })} onClick={(event) => event.stopPropagation()}>
        <h2>{t('story.title', { name })}</h2>
        <label className="field story-main">
          {t('form.backstory')}
          <textarea
            className="story-text"
            rows={12}
            placeholder={t('story.empty')}
            value={character.details.backstory ?? ''}
            onChange={(e) => set('backstory')(e.target.value)}
          />
        </label>
        <div className="story-side">
          {(character.details.portrait || character.details.factionSymbol) && (
            <div className="story-pictures">
              {character.details.portrait && <img className="story-portrait" src={character.details.portrait} alt={t('form.portrait')} />}
              {character.details.factionSymbol && (
                <figure className="story-faction">
                  <img src={character.details.factionSymbol} alt={t('form.factionSymbol')} />
                  {character.details.factionName && <figcaption>{character.details.factionName}</figcaption>}
                </figure>
              )}
            </div>
          )}
          {(['personality', 'appearance'] as const).map((field) => (
            <label key={field} className="field">
              {t(`form.${field}`)}
              <textarea rows={4} value={character.details[field] ?? ''} onChange={(e) => set(field)(e.target.value)} />
            </label>
          ))}
          <label className="field">
            Alignment
            <input value={character.details.alignment ?? ''} onChange={(e) => set('alignment')(e.target.value)} />
          </label>
        </div>
        <div className="dialog-actions">
          <span className="muted story-saved">{t('story.saved')}</span>
          <button type="button" className="primary" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
