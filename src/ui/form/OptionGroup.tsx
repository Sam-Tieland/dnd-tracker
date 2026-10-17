import type { Character } from '../../model/character';
import { isExclusive, optionsFor, toggleOption } from '../../rules/choices';
import { useAppData } from '../data';

/** The options of one feature: radio buttons when they exclude each other (Divine Order, Elven Lineage), checkboxes otherwise (Metamagic). */
export function OptionGroup({ character, parentId, legend, onChange }: { character: Character; parentId: string; legend: string; onChange: (character: Character) => void }) {
  const { registry } = useAppData();
  const options = optionsFor(registry, parentId);
  const exclusive = isExclusive(options);
  return (
    <fieldset>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.id} className="option">
          <input
            type={exclusive ? 'radio' : 'checkbox'}
            name={parentId}
            checked={character.choices.featureOptions.includes(option.id)}
            onChange={(e) => onChange(toggleOption(character, registry, option.id, e.target.checked))}
          />
          {option.name}
        </label>
      ))}
    </fieldset>
  );
}
