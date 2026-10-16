import { ABILITIES } from '../../content/constants';
import { POINT_BUY_BUDGET, STANDARD_ARRAY, pointBuyCost } from '../../content/srd/creation';
import { rollAbilityScore } from '../../dice/dice';
import { useI18n } from '../../i18n/i18n';
import { NumberInput } from '../components/NumberInput';
import { formatMod } from '../format';
import { assignStandard, setAbilityMethod, setBaseAbility, type AbilityMethod } from './form-logic';
import type { SectionProps } from './types';

const METHODS: AbilityMethod[] = ['standard', 'pointbuy', 'rolled', 'manual'];

export function AbilitySection({ character, sheet, onChange }: SectionProps) {
  const { t } = useI18n();
  const { abilityMethod, baseAbilities } = character.choices;
  const cost = pointBuyCost(baseAbilities);
  return (
    <section className="card">
      <h2>Ability Scores</h2>
      <label className="field">
        {t('form.method')}
        <select value={abilityMethod} onChange={(e) => onChange(setAbilityMethod(character, e.target.value as AbilityMethod))}>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {t(`form.method.${m}`)}
            </option>
          ))}
        </select>
      </label>
      {abilityMethod === 'pointbuy' && (
        <p className={cost === undefined || cost > POINT_BUY_BUDGET ? 'warning' : 'muted'}>
          {t('form.points', { spent: cost ?? '–', budget: POINT_BUY_BUDGET })}
        </p>
      )}
      <div className="ability-grid">
        {ABILITIES.map((ability) => (
          <div key={ability} className="ability-input">
            <span className="ability-label">{ability.toUpperCase()}</span>
            {abilityMethod === 'standard' ? (
              <select
                aria-label={ability.toUpperCase()}
                value={baseAbilities[ability]}
                onChange={(e) => onChange(assignStandard(character, ability, Number(e.target.value)))}
              >
                {STANDARD_ARRAY.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : (
              <NumberInput
                aria-label={ability.toUpperCase()}
                min={abilityMethod === 'pointbuy' ? 8 : 1}
                max={abilityMethod === 'pointbuy' ? 15 : 30}
                value={baseAbilities[ability]}
                onChange={(value) => onChange(setBaseAbility(character, ability, value))}
              />
            )}
            {abilityMethod === 'rolled' && (
              <button type="button" onClick={() => onChange(setBaseAbility(character, ability, rollAbilityScore()))}>
                {t('form.roll')}
              </button>
            )}
            <span className="muted">{t('form.final', { score: sheet.abilities[ability].score, mod: formatMod(sheet.abilities[ability].mod) })}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
