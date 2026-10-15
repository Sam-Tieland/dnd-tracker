import { z } from 'zod';
import { BonusTargetSchema } from '../content/schema';

const score = z.number().int().min(1).max(30);
const AbilityScoresSchema = z.strictObject({ str: score, dex: score, con: score, int: score, wis: score, cha: score });
const delta = z.number().int().optional();
const AbilityDeltaSchema = z.strictObject({ str: delta, dex: delta, con: delta, int: delta, wis: delta, cha: delta });
const count = z.number().int().min(0);
const anyRecord = z.record(z.string(), z.unknown());

export const LevelChoiceSchema = z.strictObject({
  classId: z.string().min(1),
  subclassId: z.string().optional(),
  /** Ignored for the first character level, which always gets the maximum of the hit die. */
  hp: z.union([z.literal('average'), z.number().int().min(1)]),
  asi: AbilityDeltaSchema.optional(),
  featId: z.string().optional(),
  featureChoices: anyRecord,
});

export const CharacterSchema = z.strictObject({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  name: z.string(),
  details: z.strictObject({
    alignment: z.string().optional(),
    appearance: z.string().optional(),
    personality: z.string().optional(),
    backstory: z.string().optional(),
  }),
  choices: z.strictObject({
    abilityMethod: z.enum(['standard', 'pointbuy', 'rolled', 'manual']),
    baseAbilities: AbilityScoresSchema,
    speciesId: z.string().nullable(),
    speciesChoices: anyRecord,
    backgroundId: z.string().nullable(),
    backgroundAbilityBonuses: AbilityDeltaSchema,
    backgroundChoices: anyRecord,
    levels: z.array(LevelChoiceSchema),
    bonusFeatIds: z.array(z.string()),
    skillProficiencies: z.array(z.string()),
    expertise: z.array(z.string()),
    languages: z.array(z.string()),
    toolProficiencies: z.array(z.string()),
    featureOptions: z.array(z.string()),
    spells: z.array(z.strictObject({ classId: z.string(), spellId: z.string(), prepared: z.boolean() })),
  }),
  state: z.strictObject({
    hpCurrent: z.number().int(),
    hpTemp: count,
    deathSaves: z.strictObject({ successes: z.number().int().min(0).max(3), failures: z.number().int().min(0).max(3) }),
    hitDiceSpent: z.record(z.string().regex(/^d\d+$/), count),
    slotsUsed: z.record(z.string().regex(/^[1-9]$/), count),
    pactSlotsUsed: count,
    resourcesUsed: z.record(z.string(), count),
    conditions: z.array(z.string()),
    exhaustion: z.number().int().min(0).max(6),
    heroicInspiration: z.boolean(),
  }),
  inventory: z.array(
    z.strictObject({
      id: z.string().min(1),
      itemId: z.string().optional(),
      customName: z.string().optional(),
      qty: count,
      equipped: z.boolean(),
      attuned: z.boolean(),
      notes: z.string().optional(),
    }),
  ),
  currency: z.strictObject({ cp: count, sp: count, ep: count, gp: count, pp: count }),
  notes: z.array(z.strictObject({ id: z.string().min(1), title: z.string(), body: z.string(), updatedAt: z.iso.datetime() })),
  overrides: z.array(z.strictObject({ id: z.string().min(1), target: BonusTargetSchema, value: z.number().int(), reason: z.string() })),
});

export type Character = z.infer<typeof CharacterSchema>;
export type LevelChoice = z.infer<typeof LevelChoiceSchema>;
export type InventoryItem = Character['inventory'][number];
export type Override = Character['overrides'][number];

export interface NewCharacterInput {
  id?: string;
  name?: string;
  now?: string;
}

export function createCharacter(input: NewCharacterInput = {}): Character {
  const now = input.now ?? new Date().toISOString();
  return {
    id: input.id ?? crypto.randomUUID(),
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    name: input.name ?? '',
    details: {},
    choices: {
      abilityMethod: 'manual',
      baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      speciesId: null,
      speciesChoices: {},
      backgroundId: null,
      backgroundAbilityBonuses: {},
      backgroundChoices: {},
      levels: [],
      bonusFeatIds: [],
      skillProficiencies: [],
      expertise: [],
      languages: [],
      toolProficiencies: [],
      featureOptions: [],
      spells: [],
    },
    state: {
      hpCurrent: 0,
      hpTemp: 0,
      deathSaves: { successes: 0, failures: 0 },
      hitDiceSpent: {},
      slotsUsed: {},
      pactSlotsUsed: 0,
      resourcesUsed: {},
      conditions: [],
      exhaustion: 0,
      heroicInspiration: false,
    },
    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    notes: [],
    overrides: [],
  };
}
