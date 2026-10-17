import { useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import { applyImport, type CharacterImportMode, type ImportPlan, type ImportResult } from '../../storage/import';
import { Dialog } from '../components/Dialog';
import { useAppData } from '../data';

/** Shows what a file holds and lets the player choose, per existing character, between replacing and adding a copy. */
export function ImportDialog({ plan, onClose, onDone, onError }: {
  plan: ImportPlan;
  onClose: () => void;
  onDone: (result: ImportResult) => void;
  onError: (error: unknown) => void;
}) {
  const { t } = useI18n();
  const { db } = useAppData();
  const [modes, setModes] = useState<Record<string, CharacterImportMode>>({});
  const [busy, setBusy] = useState(false);
  const replacedContent = plan.content.filter((c) => c.exists).length;

  const confirm = async () => {
    setBusy(true);
    try {
      onDone(await applyImport(db, plan, modes));
    } catch (error) {
      onError(error);
    }
  };

  return (
    <Dialog
      title={t('import.title')}
      onClose={onClose}
      actions={
        <button type="button" className="primary" disabled={busy} onClick={() => void confirm()}>
          {t('import.confirm')}
        </button>
      }
    >
      <p>{t('import.summary', { characters: plan.characters.length, content: plan.content.length })}</p>
      <ul className="import-list">
        {plan.characters.map(({ character, exists }) => (
          <li key={character.id}>
            <strong>{character.name}</strong>
            {exists && (
              <fieldset className="import-modes">
                <legend className="muted">{t('import.exists')}</legend>
                {(['copy', 'replace'] as const).map((mode) => (
                  <label key={mode} className="option">
                    <input
                      type="radio"
                      name={`import-mode-${character.id}`}
                      checked={(modes[character.id] ?? 'copy') === mode}
                      onChange={() => setModes((current) => ({ ...current, [character.id]: mode }))}
                    />
                    {t(mode === 'copy' ? 'import.copy' : 'import.replace')}
                  </label>
                ))}
              </fieldset>
            )}
          </li>
        ))}
      </ul>
      {replacedContent > 0 && <p className="muted">{t('import.contentReplaced', { count: replacedContent })}</p>}
    </Dialog>
  );
}
