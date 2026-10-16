import { useState } from 'react';
import { ABILITIES, type Ability } from '../../content/constants';
import { useI18n } from '../../i18n/i18n';
import type { LevelChoice } from '../../model/character';
import { NumberInput } from '../components/NumberInput';
import { useAppData } from '../data';
import { abilityName } from '../format';
import { addLevel, ASI_FEAT_ID, MAX_LEVEL, removeLastLevel, setLevelAsi, setLevelFeat, setLevelHp, setSubclass, subclassLevel } from './form-logic';
import type { SectionProps } from './types';

function AsiPicker({ asi, onPick }: { asi: LevelChoice['asi']; onPick: (first: Ability, second: Ability) => void }) {
  const picked = ABILITIES.flatMap((a) => Array.from({ length: asi?.[a] ?? 0 }, () => a));
  const first = picked[0];
  const second = picked[1] ?? picked[0];
  const options = ABILITIES.map((a) => (
    <option key={a} value={a}>
      {abilityName(a)}
    </option>
  ));
  return (
    <span className="row">
      <select aria-label="Ability Score Improvement 1" value={first ?? ''} onChange={(e) => e.target.value && onPick(e.target.value as Ability, second ?? (e.target.value as Ability))}>
        <option value="">–</option>
        {options}
      </select>
      <select aria-label="Ability Score Improvement 2" value={second ?? ''} onChange={(e) => e.target.value && onPick(first ?? (e.target.value as Ability), e.target.value as Ability)}>
        <option value="">–</option>
        {options}
      </select>
    </span>
  );
}

/** Levels in the order taken (spec §5), hit points per level, a feat per level, and the subclass per class. */
export function LevelsSection({ character, sheet, onChange }: SectionProps) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const classes = registry.list('class');
  const feats = registry.list('feat');
  const [newClass, setNewClass] = useState(classes[0]?.id ?? '');
  const levels = character.choices.levels;
  const classLevelAt = (index: number) => levels.slice(0, index + 1).filter((l) => l.classId === levels[index].classId).length;
  return (
    <section className="card">
      <h2>Levels</h2>
      <ol className="level-list">
        {levels.map((level, index) => {
          const cls = registry.getOf('class', level.classId);
          const average = cls ? cls.hitDie / 2 + 1 : 1;
          return (
            <li key={index} className="level-row">
              <strong>
                {cls?.name ?? level.classId} {classLevelAt(index)}
              </strong>
              {index === 0 ? (
                <span className="muted">HP: {t('form.hpMax')}</span>
              ) : (
                <span className="row">
                  <select
                    aria-label={`HP ${index + 1}`}
                    value={level.hp === 'average' ? 'average' : 'rolled'}
                    onChange={(e) => onChange(setLevelHp(character, index, e.target.value === 'average' ? 'average' : average))}
                  >
                    <option value="average">{t('form.hpAverage', { value: average })}</option>
                    <option value="rolled">{t('form.hpRolled')}</option>
                  </select>
                  {level.hp !== 'average' && (
                    <NumberInput aria-label={t('form.hpRolledValue')} min={1} max={cls?.hitDie} value={level.hp} onChange={(hp) => onChange(setLevelHp(character, index, hp, cls?.hitDie))} />
                  )}
                </span>
              )}
              <select aria-label={`Feat ${index + 1}`} value={level.featId ?? ''} onChange={(e) => onChange(setLevelFeat(character, index, e.target.value || undefined))}>
                <option value="">Feat: {t('common.none')}</option>
                {feats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              {level.featId === ASI_FEAT_ID && <AsiPicker asi={level.asi} onPick={(a, b) => onChange(setLevelAsi(character, index, a, b))} />}
            </li>
          );
        })}
      </ol>
      <div className="row">
        <select aria-label="Class" value={newClass} onChange={(e) => setNewClass(e.target.value)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="button" disabled={levels.length >= MAX_LEVEL} onClick={() => onChange(addLevel(character, newClass))}>
          {t('form.addLevel')}
        </button>
        <button type="button" disabled={levels.length === 0} onClick={() => onChange(removeLastLevel(character))}>
          {t('form.removeLevel')}
        </button>
      </div>
      {sheet.classLevels.map((cl) => {
        const at = subclassLevel(registry, cl.classId);
        if (at === undefined || cl.level < at) return null;
        return (
          <label key={cl.classId} className="field">
            Subclass ({cl.name})
            <select value={cl.subclassId ?? ''} onChange={(e) => onChange(setSubclass(character, registry, cl.classId, e.target.value || undefined))}>
              <option value="">{t('common.none')}</option>
              {registry
                .list('subclass')
                .filter((s) => s.classId === cl.classId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.source === 'skeleton' ? ` (${t('form.skeleton')})` : ''}
                  </option>
                ))}
            </select>
          </label>
        );
      })}
    </section>
  );
}
