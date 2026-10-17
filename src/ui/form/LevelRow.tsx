import { ABILITIES, type Ability } from '../../content/constants';
import { useI18n } from '../../i18n/i18n';
import type { Character, LevelChoice } from '../../model/character';
import { NumberInput } from '../components/NumberInput';
import { useAppData } from '../data';
import { abilityName, plainParagraphs } from '../format';
import { isSubclassSlot, type ClassBlock, type LevelRow as LevelRowData } from './class-blocks';
import { ASI_FEAT_ID, setLevelAsi, setLevelFeat, setLevelHp, setLevelNote } from './form-logic';
import { OptionGroup } from './OptionGroup';

export function AsiPicker({ asi, onPick }: { asi: LevelChoice['asi']; onPick: (first: Ability, second: Ability) => void }) {
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

function GainedFeature({ featureId, block }: { featureId: string; block: ClassBlock }) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const def = registry.getOf('feature', featureId);
  const sub = block.subclassId ? registry.getOf('subclass', block.subclassId) : undefined;
  let name = def?.name ?? featureId;
  let body: string[];
  if (isSubclassSlot(featureId)) {
    if (sub) {
      name = sub.name;
      body = plainParagraphs(sub.text);
    } else body = [t('form.subclassPick')];
  } else if (def && def.source === 'skeleton' && def.name === '') {
    name = t('features.placeholder');
    body = [t('form.subclassEmpty')];
  } else body = plainParagraphs(def?.text ?? '');
  return (
    <details className="gained">
      <summary>{name}</summary>
      {body.map((p, i) => (
        <p key={i} className="rules-text">
          {p}
        </p>
      ))}
    </details>
  );
}

/** One level of one class: what you choose (hit points, feat, options), what you gain, and a note. */
export function LevelRow({ character, block, row, onChange }: { character: Character; block: ClassBlock; row: LevelRowData; onChange: (character: Character) => void }) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const level = character.choices.levels[row.index];
  const cls = registry.getOf('class', block.classId);
  const average = cls ? cls.hitDie / 2 + 1 : 1;
  const showFeat = row.grantsFeat || level.featId !== undefined;
  return (
    <li className="level-block">
      <h3>
        Level {row.classLevel} <small className="muted">{t('form.characterLevel', { level: row.characterLevel })}</small>
      </h3>
      <div className="row">
        {row.index === 0 ? (
          <span className="muted">HP: {t('form.hpMax')}</span>
        ) : (
          <>
            <select
              aria-label={`HP ${row.characterLevel}`}
              value={level.hp === 'average' ? 'average' : 'rolled'}
              onChange={(e) => onChange(setLevelHp(character, row.index, e.target.value === 'average' ? 'average' : average))}
            >
              <option value="average">{t('form.hpAverage', { value: average })}</option>
              <option value="rolled">{t('form.hpRolled')}</option>
            </select>
            {level.hp !== 'average' && (
              <NumberInput aria-label={t('form.hpRolledValue')} min={1} max={cls?.hitDie} value={level.hp} onChange={(hp) => onChange(setLevelHp(character, row.index, hp, cls?.hitDie))} />
            )}
          </>
        )}
        {showFeat && (
          <select aria-label={`Feat ${row.characterLevel}`} value={level.featId ?? ''} onChange={(e) => onChange(setLevelFeat(character, row.index, e.target.value || undefined))}>
            <option value="">Feat: {t('common.none')}</option>
            {registry.list('feat').map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}
        {level.featId === ASI_FEAT_ID && <AsiPicker asi={level.asi} onPick={(a, b) => onChange(setLevelAsi(character, row.index, a, b))} />}
      </div>
      {!row.grantsFeat && level.featId !== undefined && <p className="muted">{t('form.noFeatHere')}</p>}
      {row.optionParentIds.map((id) => (
        <OptionGroup key={id} character={character} parentId={id} legend={registry.getOf('feature', id)?.name ?? id} onChange={onChange} />
      ))}
      {row.featureIds.length > 0 && (
        <div className="gains">
          <strong>{t('form.gains')}</strong>
          {row.featureIds.map((id) => (
            <GainedFeature key={id} featureId={id} block={block} />
          ))}
        </div>
      )}
      <label className="field">
        {t('form.levelNote')}
        <textarea rows={2} value={level.note ?? ''} onChange={(e) => onChange(setLevelNote(character, row.index, e.target.value))} />
      </label>
    </li>
  );
}
