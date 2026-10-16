import type { ContentRegistry } from '../content/registry';
import type { ArmorDef } from '../content/schema';
import type { Character } from '../model/character';
import { evalFormula, type FormulaContext } from './formula';
import type { ActiveFeature, BonusPart } from './types';

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

type When = 'armored' | 'unarmored' | 'notHeavyArmor' | undefined;

function applies(when: When, equipment: Equipment): boolean {
  if (when === 'armored') return !!equipment.armor;
  if (when === 'unarmored') return !equipment.armor && !equipment.shield;
  if (when === 'notHeavyArmor') return equipment.armor?.category !== 'heavy';
  return true;
}

/** Every bonus effect of the active features that applies with this equipment, and every override, as separate parts. */
export function collectBonusParts(
  features: ActiveFeature[],
  overrides: Character['overrides'],
  ctx: FormulaContext,
  equipment: Equipment,
): BonusPart[] {
  const parts: BonusPart[] = [];
  for (const feature of features) {
    for (const effect of feature.effects) {
      if (effect.kind === 'bonus' && applies(effect.when, equipment)) {
        parts.push({ target: effect.target, source: feature.name || feature.ownerName, value: evalFormula(effect.value, ctx), override: false });
      }
    }
  }
  for (const override of overrides) parts.push({ target: override.target, source: override.reason, value: override.value, override: true });
  return parts;
}

export type BonusFn = (target: string) => number;

export function makeBonus(parts: BonusPart[]): BonusFn {
  return (target) => parts.reduce((total, part) => (part.target === target ? total + part.value : total), 0);
}
