import { useState } from 'react';
import { useI18n, type Lang } from '../../i18n/i18n';
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
  const { t, lang } = useI18n();
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
      dismissible={!busy}
      actions={
        <button type="button" className="primary" disabled={busy} onClick={() => void confirm()}>
          {t('import.confirm')}
        </button>
      }
    >
      <p>{t('import.summary', { characters: plan.characters.length, content: plan.content.length })}</p>
      <ul className="import-list">
        {plan.characters.map(({ character, exists, existingUpdatedAt }) => (
          <li key={character.id}>
            <strong>{character.name}</strong>
            {exists && (
              <fieldset className="import-modes">
                <legend className="muted">{t('import.exists')}</legend>
                <VersionLines fileAt={character.updatedAt} deviceAt={existingUpdatedAt} lang={lang} />
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

/** Spec §12: shows both versions of an existing character and which one is newer. */
function VersionLines({ fileAt, deviceAt, lang }: { fileAt: string; deviceAt?: string; lang: Lang }) {
  const { t } = useI18n();
  if (!deviceAt) return null;
  const file = Date.parse(fileAt);
  const device = Date.parse(deviceAt);
  const show = (iso: string) => new Date(iso).toLocaleString(lang);
  const mark = (newer: boolean) => (newer ? <strong> ({t('import.newer')})</strong> : null);
  return (
    <>
      <p className="muted">
        {t('import.fileVersion', { date: show(fileAt) })}
        {mark(file > device)}
      </p>
      <p className="muted">
        {t('import.deviceVersion', { date: show(deviceAt) })}
        {mark(device > file)}
      </p>
      {file === device && <p className="muted">{t('import.same')}</p>}
    </>
  );
}
