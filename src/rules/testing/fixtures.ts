import { loadBuiltinContent } from '../../content/load';
import { createRegistry } from '../../content/registry';
import { createCharacter, type Character, type InventoryItem, type LevelChoice } from '../../model/character';

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** Built-in content is frozen in tests, so a rule that changes content by accident fails loudly. */
export const registry = createRegistry(deepFreeze(loadBuiltinContent()));

/** A level in a class; short names get the srd prefix ("fighter" -> "srd:class:fighter"). */
export function level(classId: string, extra: Partial<LevelChoice> = {}): LevelChoice {
  return { classId: classId.includes(':') ? classId : `srd:class:${classId}`, hp: 'average', featureChoices: {}, ...extra };
}

export function levels(classId: string, count: number): LevelChoice[] {
  return Array.from({ length: count }, () => level(classId));
}

export function item(id: string, itemId: string, equipped = true): InventoryItem {
  return { id, itemId, qty: 1, equipped, attuned: false };
}

export interface CharacterPatch {
  choices?: Partial<Character['choices']>;
  state?: Partial<Character['state']>;
  inventory?: InventoryItem[];
  overrides?: Character['overrides'];
}

export function makeCharacter(patch: CharacterPatch = {}): Character {
  const base = createCharacter({ id: 'test', name: 'Test', now: '2026-10-15T00:00:00.000Z' });
  return {
    ...base,
    choices: { ...base.choices, ...patch.choices },
    state: { ...base.state, ...patch.state },
    inventory: patch.inventory ?? [],
    overrides: patch.overrides ?? [],
  };
}

/**
 * Reference character: Fighter 3 (Champion) / Wizard 2, Human, Soldier background (+2 STR, +1 CON),
 * Defense fighting style, wearing Chain Mail and a Shield, wielding a Longsword.
 */
export function kael(patch: CharacterPatch = {}): Character {
  return makeCharacter({
    ...patch,
    choices: {
      abilityMethod: 'manual',
      baseAbilities: { str: 15, dex: 13, con: 14, int: 14, wis: 10, cha: 8 },
      speciesId: 'srd:species:human',
      backgroundId: 'srd:background:soldier',
      backgroundAbilityBonuses: { str: 2, con: 1 },
      levels: [
        level('fighter', { featId: 'srd:feat:defense' }),
        level('fighter'),
        level('fighter', { subclassId: 'srd:subclass:champion' }),
        level('wizard'),
        level('wizard'),
      ],
      skillProficiencies: ['perception', 'history'],
      ...patch.choices,
    },
    inventory: patch.inventory ?? [item('i1', 'srd:armor:chain-mail'), item('i2', 'srd:armor:shield'), item('i3', 'srd:weapon:longsword')],
  });
}
