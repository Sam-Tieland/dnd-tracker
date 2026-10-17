import { useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import { Dialog } from '../components/Dialog';
import { useAppData } from '../data';
import { classBlocks } from './class-blocks';
import { addLevel, MAX_LEVEL, removalLosesData, removeLastClassLevel, setSubclass } from './form-logic';
import { LevelRow } from './LevelRow';
import type { SectionProps } from './types';

/** One block per class with its subclass and a row per level (design 2026-10-17), then a picker for a new class. */
export function ClassBlocksSection({ character, onChange }: SectionProps) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const classes = registry.list('class');
  const [newClass, setNewClass] = useState(classes[0]?.id ?? '');
  const [removing, setRemoving] = useState<{ classId: string; name: string; classLevel: number }>();
  const levels = character.choices.levels;
  const blocks = classBlocks(character, registry);
  const requestRemove = (classId: string) => {
    const block = blocks.find((b) => b.classId === classId);
    const last = block?.rows[block.rows.length - 1];
    if (!block || !last) return;
    if (removalLosesData(character, registry, last.index)) setRemoving({ classId, name: block.name, classLevel: last.classLevel });
    else onChange(removeLastClassLevel(character, classId));
  };
  return (
    <>
      {blocks.map((block) => (
        <section key={block.classId} className="card class-block">
          <h2>{block.name}</h2>
          <label className="field">
            {t('form.subclass')}
            <select value={block.subclassId ?? ''} onChange={(e) => onChange(setSubclass(character, registry, block.classId, e.target.value || undefined))}>
              <option value="">{t('common.none')}</option>
              {registry
                .list('subclass')
                .filter((s) => s.classId === block.classId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.source === 'skeleton' ? ` (${t('form.skeleton')})` : ''}
                  </option>
                ))}
            </select>
          </label>
          {block.subclassLevel !== undefined && <p className="muted">{t('form.subclassFrom', { level: block.subclassLevel })}</p>}
          <ol className="level-list">
            {block.rows.map((row) => (
              <LevelRow key={row.index} character={character} block={block} row={row} onChange={onChange} />
            ))}
          </ol>
          <div className="row">
            <button type="button" disabled={levels.length >= MAX_LEVEL} onClick={() => onChange(addLevel(character, block.classId))}>
              {t('form.addClassLevel', { class: block.name })}
            </button>
            <button type="button" onClick={() => requestRemove(block.classId)}>
              {t('form.removeClassLevel', { class: block.name })}
            </button>
          </div>
        </section>
      ))}
      <section className="card">
        {blocks.length === 0 && <p>{t('form.chooseClass')}</p>}
        <div className="row">
          <select aria-label={t('form.newClass')} value={newClass} onChange={(e) => setNewClass(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="button" disabled={levels.length >= MAX_LEVEL} onClick={() => onChange(addLevel(character, newClass))}>
            {t('form.addClass')}
          </button>
        </div>
      </section>
      {removing && (
        <Dialog
          title={t('form.confirmRemoveTitle')}
          onClose={() => setRemoving(undefined)}
          actions={
            <button
              type="button"
              className="danger"
              onClick={() => {
                onChange(removeLastClassLevel(character, removing.classId));
                setRemoving(undefined);
              }}
            >
              {t('common.delete')}
            </button>
          }
        >
          <p>{t('form.confirmRemove', { class: removing.name, level: removing.classLevel })}</p>
        </Dialog>
      )}
    </>
  );
}
