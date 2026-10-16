import { ABILITIES, type Ability } from '../../content/constants';
import { useI18n } from '../../i18n/i18n';
import { useAppData } from '../data';
import { abilityName, titleCase } from '../format';
import { bonusMode, setBackground, setBackgroundBonuses } from './form-logic';
import type { SectionProps } from './types';

function AbilityPick({ label, options, value, onPick }: { label: string; options: readonly Ability[]; value?: Ability; onPick: (a?: Ability) => void }) {
  return (
    <label>
      {label}{' '}
      <select value={value ?? ''} onChange={(e) => onPick(e.target.value === '' ? undefined : (e.target.value as Ability))}>
        <option value="">–</option>
        {options.map((a) => (
          <option key={a} value={a}>
            {abilityName(a)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OriginSection({ character, onChange }: SectionProps) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const { speciesId, backgroundId, backgroundAbilityBonuses: bonuses } = character.choices;
  const background = backgroundId ? registry.getOf('background', backgroundId) : undefined;
  const mode = bonusMode(bonuses);
  const plusTwo = ABILITIES.find((a) => bonuses[a] === 2);
  const plusOne = mode === 'two' ? ABILITIES.find((a) => bonuses[a] === 1) : undefined;
  const feat = background?.featId ? registry.get(background.featId)?.name : undefined;
  return (
    <section className="card">
      <h2>{t('form.origin')}</h2>
      <label className="field">
        Species
        <select value={speciesId ?? ''} onChange={(e) => onChange({ ...character, choices: { ...character.choices, speciesId: e.target.value || null } })}>
          <option value="">{t('common.none')}</option>
          {registry.list('species').map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Background
        <select value={backgroundId ?? ''} onChange={(e) => onChange(setBackground(character, e.target.value || null))}>
          <option value="">{t('common.none')}</option>
          {registry.list('background').map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      {background && (
        <fieldset>
          <legend>Ability Score Increases</legend>
          <label>
            <input type="radio" name="bonus-mode" checked={mode === 'two'} onChange={() => onChange(setBackgroundBonuses(character, background.abilityOptions, 'two'))} />
            +2 / +1
          </label>
          <label>
            <input type="radio" name="bonus-mode" checked={mode === 'three'} onChange={() => onChange(setBackgroundBonuses(character, background.abilityOptions, 'three'))} />
            +1 / +1 / +1
          </label>
          {mode === 'two' && (
            <div className="row">
              <AbilityPick label="+2" options={background.abilityOptions} value={plusTwo} onPick={(a) => onChange(setBackgroundBonuses(character, background.abilityOptions, 'two', a, plusOne))} />
              <AbilityPick label="+1" options={background.abilityOptions} value={plusOne} onPick={(a) => onChange(setBackgroundBonuses(character, background.abilityOptions, 'two', plusTwo, a))} />
            </div>
          )}
          <p className="muted">
            Skills: {background.skillProficiencies.map(titleCase).join(', ')}
            {feat ? ` · Feat: ${feat}${background.featNote ? ` (${background.featNote})` : ''}` : ''}
          </p>
        </fieldset>
      )}
    </section>
  );
}
