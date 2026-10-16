import { slugify } from '../ids';
import type { Effect, FeatureDef } from '../schema';

const DIVINE_ORDER = 'srd:feature:cleric:1:divine-order';
const PRIMAL_ORDER = 'srd:feature:druid:1:primal-order';
const ELVEN_LINEAGE = 'srd:feature:elf:elven-lineage';

const option = (parentId: string, name: string, text: string, effects: Effect[]): FeatureDef => ({
  id: `${parentId}:${slugify(name)}`,
  type: 'feature',
  source: 'srd',
  name,
  text,
  effects,
  optionOf: parentId,
});

const wisdomOn = (skill: 'arcana' | 'religion' | 'nature'): Effect => ({ kind: 'bonus', target: `skill:${skill}`, value: { mod: 'wis', min: 1 } });
const martialAnd = (armor: 'heavy' | 'medium'): Effect[] => [
  { kind: 'proficiency', target: 'weapon:martial' },
  { kind: 'proficiency', target: `armor:${armor}` },
];

/**
 * Choices inside an SRD feature, as option features. Each text is a verbatim part of the parent feature's text
 * (checked in options.test.ts). An option only counts while its parent feature is active.
 */
export const OPTION_FEATURES: FeatureDef[] = [
  option(DIVINE_ORDER, 'Protector', 'Trained for battle, you gain proficiency with Martial weapons and training with Heavy armor.', martialAnd('heavy')),
  option(
    DIVINE_ORDER,
    'Thaumaturge',
    'You know one extra cantrip from the Cleric spell list. In addition, your mystical connection to the divine gives you a bonus to your Intelligence (Arcana or Religion) checks. The bonus equals your Wisdom modifier (minimum of +1).',
    [wisdomOn('arcana'), wisdomOn('religion')],
  ),
  option(
    PRIMAL_ORDER,
    'Magician',
    'You know one extra cantrip from the Druid spell list. In addition, your mystical connection to nature gives you a bonus to your Intelligence (Arcana or Nature) checks. The bonus equals your Wisdom modifier (minimum bonus of +1).',
    [wisdomOn('arcana'), wisdomOn('nature')],
  ),
  option(PRIMAL_ORDER, 'Warden', 'Trained for battle, you gain proficiency with Martial weapons and training with Medium armor.', martialAnd('medium')),
  option(ELVEN_LINEAGE, 'Drow', 'The range of your Darkvision increases to 120 feet. You also know the Dancing Lights cantrip.', []),
  option(
    ELVEN_LINEAGE,
    'High Elf',
    'You know the Prestidigitation cantrip. Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list.',
    [],
  ),
  option(ELVEN_LINEAGE, 'Wood Elf', 'Your Speed increases to 35 feet. You also know the Druidcraft cantrip.', [{ kind: 'bonus', target: 'speed', value: 5 }]),
];

/** SRD option groups and the class feature that grants them; several options of a group can be chosen. */
export const OPTION_GROUP_PARENTS: Record<string, string> = {
  metamagic: 'srd:feature:sorcerer:2:metamagic',
  'eldritch-invocation': 'srd:feature:warlock:1:eldritch-invocations',
};
