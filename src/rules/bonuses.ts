import type { ContentRegistry } from '../content/registry';
import type { ArmorDef, Effect } from '../content/schema';
import type { Character } from '../model/character';
import { evalFormula, type FormulaContext } from './formula';

export interface Equipment {
  armor?: ArmorDef;
  shield?: ArmorDef;
}

/** The first equipped body armor and the first equipped shield. */
export function equippedArmor(character: Character, registry: ContentRegistry): Equipment {
  const equipment: Equipment = {};
  for (const entry of character.inventory) {
    if (!entry.equipped || !entry.itemId) continue;
    const armor = registry.getOf('armor', entry.itemId);
    if (!armor) continue;
    if (armor.category === 'shield') equipment.shield ??= armor;
    else equipment.armor ??= armor;
  }
  return equipment;
}

export type BonusFn = (target: string) => number;

export function makeBonus(effects: Effect[], overrides: Character['overrides'], ctx: FormulaContext, equipment: Equipment): BonusFn {
  const applies = (when: 'armored' | 'unarmored' | 'notHeavyArmor' | undefined): boolean => {
    if (when === 'armored') return !!equipment.armor;
    if (when === 'unarmored') return !equipment.armor && !equipment.shield;
    if (when === 'notHeavyArmor') return equipment.armor?.category !== 'heavy';
    return true;
  };
  return (target) => {
    let total = 0;
    for (const effect of effects) {
      if (effect.kind === 'bonus' && effect.target === target && applies(effect.when)) total += evalFormula(effect.value, ctx);
    }
    for (const override of overrides) if (override.target === target) total += override.value;
    return total;
  };
}
