import { z } from 'zod';
import { ABILITIES, type Ability } from './constants';

export const AbilitySchema = z.enum(ABILITIES);
export const SourceSchema = z.enum(['srd', 'skeleton', 'user']);

export type Formula =
  | number
  | { pb: true }
  | { mod: Ability; min?: number }
  | { level: string; times?: number }
  | { column: { classId: string; key: string } }
  | { atLevel: { classId: string; values: Array<[number, number]> } }
  | { sum: Formula[] };

export const FormulaSchema: z.ZodType<Formula> = z.lazy(() =>
  z.union([
    z.number(),
    z.strictObject({ pb: z.literal(true) }),
    z.strictObject({ mod: AbilitySchema, min: z.number().optional() }),
    z.strictObject({ level: z.string(), times: z.number().optional() }),
    z.strictObject({ column: z.strictObject({ classId: z.string(), key: z.string() }) }),
    z.strictObject({
      atLevel: z.strictObject({ classId: z.string(), values: z.array(z.tuple([z.number(), z.number()])) }),
    }),
    z.strictObject({ sum: z.array(FormulaSchema) }),
  ]),
);

export const BONUS_TARGET =
  /^(ac|initiative|speed|hpMax|spellAttack|spellDC|passivePerception|(attack|damage)(:[a-z0-9-]+)?|(ability|abilityMax|save):(str|dex|con|int|wis|cha)|skill:[a-z-]+)$/;
export const BonusTargetSchema = z.string().regex(BONUS_TARGET);

export const ArmorTrainingSchema = z.enum(['light', 'medium', 'heavy', 'shield']);
export type ArmorTraining = z.infer<typeof ArmorTrainingSchema>;
export const WeaponProficiencySchema = z.enum(['simple', 'martial', 'martial-light', 'martial-finesse-or-light']);
export type WeaponProficiency = z.infer<typeof WeaponProficiencySchema>;
export const ProgressionSchema = z.enum(['full', 'half', 'third', 'pact']);
export type Progression = z.infer<typeof ProgressionSchema>;
const RechargeSchema = z.enum(['short', 'long']);

export const EffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('resource'),
    key: z.string(),
    name: z.string(),
    max: FormulaSchema,
    recharge: RechargeSchema,
    shortRestRegain: FormulaSchema.optional(),
    pool: z.boolean().optional(),
  }),
  z.strictObject({ kind: z.literal('resourceRecharge'), key: z.string(), recharge: RechargeSchema }),
  z.strictObject({
    kind: z.literal('bonus'),
    target: BonusTargetSchema,
    value: FormulaSchema,
    when: z.enum(['armored', 'unarmored', 'notHeavyArmor']).optional(),
  }),
  z.strictObject({ kind: z.literal('proficiency'), target: z.string().regex(/^(skill|save|armor|weapon|tool):[a-z0-9-]+$/) }),
  z.strictObject({ kind: z.literal('spellcasting'), classId: z.string(), ability: AbilitySchema, progression: ProgressionSchema }),
  z.strictObject({
    kind: z.literal('acFormula'),
    name: z.string(),
    base: z.number(),
    abilities: z.array(AbilitySchema),
    allowShield: z.boolean(),
  }),
  z.strictObject({ kind: z.literal('halfProficiency') }),
  z.strictObject({ kind: z.literal('flag'), flag: z.enum(['heroic-inspiration-on-long-rest']) }),
]);
export type Effect = z.infer<typeof EffectSchema>;

const base = {
  id: z.string().min(1),
  name: z.string(),
  source: SourceSchema,
  fills: z.string().optional(),
};

export const FeatureSchema = z.strictObject({
  ...base,
  type: z.literal('feature'),
  text: z.string(),
  effects: z.array(EffectSchema),
  marker: z.enum(['subclass', 'asi', 'epicBoon']).optional(),
  optionGroup: z.string().optional(),
});

export const LevelRowSchema = z.strictObject({
  level: z.number().int().min(1).max(20),
  featureIds: z.array(z.string()),
  subclassFeature: z.boolean(),
  columns: z.record(z.string(), z.string()),
});

export const GeneratedClassSchema = z.strictObject({
  ...base,
  type: z.literal('class'),
  text: z.string(),
  hitDie: z.number().int(),
  coreTraits: z.record(z.string(), z.string()),
  multiclassText: z.string(),
  levels: z.array(LevelRowSchema).length(20),
  slotsByLevel: z.array(z.array(z.number().int())).optional(),
  pactSlotsByLevel: z.array(z.strictObject({ slots: z.number().int(), slotLevel: z.number().int() })).optional(),
  subclassLevels: z.array(z.number().int()),
});

const SkillChoiceSchema = z.strictObject({
  count: z.number().int(),
  from: z.union([z.literal('any'), z.array(z.string())]),
});

export const ClassMechanicsSchema = z.strictObject({
  primaryAbilities: z.strictObject({ mode: z.enum(['all', 'any']), abilities: z.array(AbilitySchema).min(1) }),
  savingThrows: z.array(AbilitySchema).length(2),
  armorTraining: z.array(ArmorTrainingSchema),
  weaponProficiencies: z.array(WeaponProficiencySchema),
  skillChoices: SkillChoiceSchema,
  multiclass: z.strictObject({
    armorTraining: z.array(ArmorTrainingSchema),
    weaponProficiencies: z.array(WeaponProficiencySchema),
    skillChoices: SkillChoiceSchema.optional(),
  }),
  spellcasting: z.strictObject({ ability: AbilitySchema, progression: z.enum(['full', 'half', 'pact']) }).optional(),
});

export const ClassSchema = GeneratedClassSchema.extend(ClassMechanicsSchema.shape);

export const SubclassSchema = z.strictObject({
  ...base,
  type: z.literal('subclass'),
  classId: z.string(),
  text: z.string(),
  features: z.array(z.strictObject({ level: z.number().int(), featureId: z.string() })),
});

export const SpeciesSchema = z.strictObject({
  ...base,
  type: z.literal('species'),
  text: z.string(),
  creatureType: z.string(),
  size: z.string(),
  speed: z.number().int(),
  traitIds: z.array(z.string()),
});

export const BackgroundSchema = z.strictObject({
  ...base,
  type: z.literal('background'),
  text: z.string(),
  abilityOptions: z.array(AbilitySchema).length(3),
  featId: z.string().optional(),
  featNote: z.string().optional(),
  skillProficiencies: z.array(z.string()),
  toolText: z.string(),
  equipmentText: z.string(),
});

export const FeatSchema = z.strictObject({
  ...base,
  type: z.literal('feat'),
  category: z.enum(['origin', 'general', 'fighting-style', 'epic-boon']),
  prerequisite: z.string().optional(),
  repeatable: z.boolean(),
  text: z.string(),
  effects: z.array(EffectSchema),
});

export const SpellSchema = z.strictObject({
  ...base,
  type: z.literal('spell'),
  level: z.number().int().min(0).max(9),
  school: z.string(),
  classes: z.array(z.string()),
  castingTime: z.string(),
  ritual: z.boolean(),
  range: z.string(),
  components: z.string(),
  duration: z.string(),
  concentration: z.boolean(),
  text: z.string(),
  cantrip: z
    .strictObject({
      damageDice: z.string(),
      damageType: z.string(),
      attackType: z.enum(['attack', 'save']).optional(),
      saveAbility: AbilitySchema.optional(),
      scales: z.boolean(),
    })
    .optional(),
});

export const WeaponSchema = z.strictObject({
  ...base,
  type: z.literal('weapon'),
  category: z.enum(['simple', 'martial']),
  kind: z.enum(['melee', 'ranged']),
  damageDice: z.string(),
  damageType: z.string(),
  properties: z.array(z.string()),
  mastery: z.string(),
  weight: z.string(),
  cost: z.string(),
});

export const ArmorSchema = z.strictObject({
  ...base,
  type: z.literal('armor'),
  category: z.enum(['light', 'medium', 'heavy', 'shield']),
  baseAC: z.number().int(),
  dexCap: z.number().int().nullable(),
  strength: z.number().int().optional(),
  stealthDisadvantage: z.boolean(),
  weight: z.string(),
  cost: z.string(),
});

export const GearSchema = z.strictObject({ ...base, type: z.literal('gear'), cost: z.string(), text: z.string() });

export const MagicItemSchema = z.strictObject({
  ...base,
  type: z.literal('magic-item'),
  typeLine: z.string(),
  category: z.string(),
  rarity: z.string(),
  attunement: z.boolean(),
  text: z.string(),
});

export const ContentItemSchema = z.discriminatedUnion('type', [
  FeatureSchema,
  ClassSchema,
  SubclassSchema,
  SpeciesSchema,
  BackgroundSchema,
  FeatSchema,
  SpellSchema,
  WeaponSchema,
  ArmorSchema,
  GearSchema,
  MagicItemSchema,
]);

export type FeatureDef = z.infer<typeof FeatureSchema>;
export type GeneratedClassDef = z.infer<typeof GeneratedClassSchema>;
export type ClassMechanics = z.infer<typeof ClassMechanicsSchema>;
export type ClassDef = z.infer<typeof ClassSchema>;
export type SubclassDef = z.infer<typeof SubclassSchema>;
export type SpeciesDef = z.infer<typeof SpeciesSchema>;
export type BackgroundDef = z.infer<typeof BackgroundSchema>;
export type FeatDef = z.infer<typeof FeatSchema>;
export type SpellDef = z.infer<typeof SpellSchema>;
export type WeaponDef = z.infer<typeof WeaponSchema>;
export type ArmorDef = z.infer<typeof ArmorSchema>;
export type GearDef = z.infer<typeof GearSchema>;
export type MagicItemDef = z.infer<typeof MagicItemSchema>;
export type ContentItem = z.infer<typeof ContentItemSchema>;
export type ContentType = ContentItem['type'];
export type ContentOf<T extends ContentType> = Extract<ContentItem, { type: T }>;
