import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import { createCharacter, type Character } from '../../model/character';
import { deriveSheet } from '../../rules/derive';
import { loadCharacter, saveCharacter } from '../../storage/characters';
import { useToast } from '../components/Toast';
import { WarningList } from '../components/WarningList';
import { useAppData } from '../data';
import { hrefFor, navigate } from '../router';
import { whenSaved } from '../sheet/session';
import { AbilitySection } from './AbilitySection';
import { DetailsSection } from './DetailsSection';
import { finishForm } from './form-logic';
import { ClassBlocksSection } from './ClassBlocksSection';
import { OriginSection } from './OriginSection';
import { ProficiencySection } from './ProficiencySection';
import './form.css';

/** Spec §8, phase 1: one form to create or edit a character. The wizards follow in phase 2. */
export function CharacterForm({ id }: { id?: string }) {
  const { db, registry } = useAppData();
  const { t } = useI18n();
  const toast = useToast();
  const [original, setOriginal] = useState<Character>();
  const [draft, setDraft] = useState<Character | undefined>(() => (id ? undefined : createCharacter()));
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    // The sheet saves in the background when it is left; read the character only after that has finished.
    whenSaved()
      .then(() => loadCharacter(db, id))
      .then(
        (character) => {
          if (!alive) return;
          if (character) {
            setOriginal(character);
            setDraft(character);
          } else setMissing(true);
        },
        () => {
          if (alive) setMissing(true);
        },
      );
    return () => {
      alive = false;
    };
  }, [db, id]);

  const sheet = useMemo(() => (draft ? deriveSheet(draft, registry) : undefined), [draft, registry]);
  if (missing) {
    return (
      <main className="screen">
        <p>{t('sheet.missing')}</p>
        <a className="button" href={hrefFor({ name: 'list' })}>
          {t('nav.back')}
        </a>
      </main>
    );
  }
  if (!draft || !sheet) return null;

  const save = async () => {
    const final = finishForm(original, draft, registry, new Date().toISOString());
    try {
      await saveCharacter(db, final);
      navigate({ name: 'sheet', id: final.id });
    } catch (error) {
      toast({ message: t('save.failed', { reason: error instanceof Error ? error.message : String(error) }), error: true });
    }
  };
  const section = { character: draft, sheet, onChange: setDraft };

  return (
    <main className="screen form">
      <header className="screen-header">
        <a className="button" href={id ? hrefFor({ name: 'sheet', id }) : hrefFor({ name: 'list' })}>
          {t('common.cancel')}
        </a>
        <h1>{id ? t('form.editTitle') : t('form.newTitle')}</h1>
        <button type="button" className="primary" onClick={() => void save()}>
          {t('common.save')}
        </button>
      </header>
      <section className="card">
        <label className="field">
          {t('form.name')}
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <p className="muted">
          HP {sheet.hp.max} · AC {sheet.ac.value} · Level {sheet.totalLevel}
        </p>
        <WarningList warnings={sheet.warnings} />
      </section>
      <AbilitySection {...section} />
      <OriginSection {...section} />
      <ClassBlocksSection {...section} />
      <ProficiencySection {...section} />
      <DetailsSection {...section} />
    </main>
  );
}
