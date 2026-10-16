import { useI18n } from '../../i18n/i18n';
import { isExclusive, optionsFor, toggleOption } from '../../rules/choices';
import { useAppData } from '../data';
import type { SectionProps } from './types';

/** Choices inside active features: Divine Order, Primal Order, Elven Lineage (one each), Metamagic and invocations (several). */
export function OptionsSection({ character, sheet, onChange }: SectionProps) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const parents = sheet.features.filter((f) => optionsFor(registry, f.id).length > 0);
  if (parents.length === 0) return null;
  return (
    <section className="card">
      <h2>{t('form.options')}</h2>
      {parents.map((parent) => {
        const options = optionsFor(registry, parent.id);
        const exclusive = isExclusive(options);
        return (
          <fieldset key={parent.id}>
            <legend>{parent.name}</legend>
            {options.map((option) => (
              <label key={option.id} className="option">
                <input
                  type={exclusive ? 'radio' : 'checkbox'}
                  name={parent.id}
                  checked={character.choices.featureOptions.includes(option.id)}
                  onChange={(e) => onChange(toggleOption(character, registry, option.id, e.target.checked))}
                />
                {option.name}
              </label>
            ))}
          </fieldset>
        );
      })}
    </section>
  );
}
