import { ABILITIES, SKILL_IDS } from '../../content/constants';
import type { ContentRegistry } from '../../content/registry';
import type { Character } from '../../model/character';
import { UNARMED_STRIKE_ID } from '../../rules/combat';
import { abilityName, titleCase } from '../format';

export interface TargetOption {
  value: string;
  label: string;
}

const FIXED: TargetOption[] = [
  { value: 'ac', label: 'AC' },
  { value: 'initiative', label: 'Initiative' },
  { value: 'speed', label: 'Speed' },
  { value: 'hpMax', label: 'Hit Point maximum' },
  { value: 'passivePerception', label: 'Passive Perception' },
  { value: 'spellAttack', label: 'Spell Attack' },
  { value: 'spellDC', label: 'Spell Save DC' },
  { value: 'attack', label: 'Attack rolls' },
  { value: 'damage', label: 'Damage rolls' },
];

/** Every number an override can change (spec §5), with each weapon in the inventory as attack:<id> and damage:<id>. */
export function overrideTargets(character: Character, registry: ContentRegistry): TargetOption[] {
  const weapons = character.inventory.filter((item) => item.itemId !== undefined && registry.getOf('weapon', item.itemId));
  return [
    ...FIXED,
    ...ABILITIES.flatMap((a) => [
      { value: `ability:${a}`, label: abilityName(a) },
      { value: `abilityMax:${a}`, label: `${abilityName(a)} maximum` },
      { value: `save:${a}`, label: `${abilityName(a)} save` },
    ]),
    ...SKILL_IDS.map((s) => ({ value: `skill:${s}`, label: titleCase(s) })),
    { value: `attack:${UNARMED_STRIKE_ID}`, label: 'Attack (Unarmed Strike)' },
    { value: `damage:${UNARMED_STRIKE_ID}`, label: 'Damage (Unarmed Strike)' },
    ...weapons.flatMap((w) => {
      const name = w.customName || registry.get(w.itemId ?? '')?.name || w.id;
      return [
        { value: `attack:${w.id}`, label: `Attack (${name})` },
        { value: `damage:${w.id}`, label: `Damage (${name})` },
      ];
    }),
  ];
}

export function targetLabel(target: string, options: readonly TargetOption[]): string {
  return options.find((o) => o.value === target)?.label ?? target;
}
