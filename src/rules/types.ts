import type { Ability, SkillId } from '../content/constants';
import type { ArmorTraining, Effect, Progression, WeaponProficiency } from '../content/schema';

export const WARNING_CODES = ['unknown-content', 'multiclass-prerequisite', 'ability-over-max', 'cantrip-without-caster', 'armor-untrained'] as const;
export type WarningCode = (typeof WARNING_CODES)[number];

/** SRD "Dropping to 0 Hit Points": alive, dying (making Death Saving Throws), Stable, or dead. */
export type LifeState = 'alive' | 'dying' | 'stable' | 'dead';
export interface Warning {
  code: WarningCode;
  detail: string;
}

export interface ClassLevel {
  classId: string;
  name: string;
  level: number;
  hitDie: number;
  subclassId?: string;
  subclassName?: string;
}

/** A class with its table values at the character's level in that class, e.g. rage-damage: "+2". */
export interface SheetClassLevel extends ClassLevel {
  columns: Record<string, string>;
}

/** One contribution to a number on the sheet: an effect of a feature or feat, or an override with its reason. */
export interface BonusPart {
  target: string;
  source: string;
  value: number;
  override: boolean;
}

export type FeatureOrigin = 'class' | 'subclass' | 'species' | 'feat' | 'option';
export interface ActiveFeature {
  id: string;
  name: string;
  text: string;
  effects: Effect[];
  origin: FeatureOrigin;
  ownerName: string;
  /** Class, subclass or species id of the owner; absent for feats and options. */
  ownerId?: string;
  level?: number;
  /** An unfilled skeleton feature. */
  placeholder: boolean;
}

export interface AbilityResult {
  score: number;
  mod: number;
  max: number;
}
export interface CheckResult {
  bonus: number;
  proficient: boolean;
}
export interface SkillResult extends CheckResult {
  ability: Ability;
  expertise: boolean;
}
export interface HitDiceResult {
  die: number;
  total: number;
  spent: number;
}
export interface ArmorClassResult {
  value: number;
  source: string;
  armored: boolean;
  /** A shield is wielded; its AC bonus only counts with Shield training. */
  shield: boolean;
}
export interface AttackResult {
  id: string;
  kind: 'weapon' | 'unarmed' | 'cantrip';
  name: string;
  toHit?: number;
  saveDC?: number;
  saveAbility?: Ability;
  damage: string;
  damageType: string;
  properties: string[];
  mastery?: string;
  proficient: boolean;
  /** Eldritch Blast: separate attack rolls, each with this damage. */
  beams?: number;
}
export interface CasterStats {
  classId: string;
  name: string;
  ability: Ability;
  progression: Progression;
  attack: number;
  dc: number;
  preparedMax?: number;
  cantripsMax?: number;
}
export interface SlotResult {
  level: number;
  max: number;
  used: number;
}
export interface SpellcastingResult {
  classes: CasterStats[];
  slots: SlotResult[];
  pact?: { slots: number; slotLevel: number; used: number };
}
export interface ResourceResult {
  key: string;
  name: string;
  max: number;
  used: number;
  recharge: 'short' | 'long' | 'manual';
  shortRestRegain: number;
  pool: boolean;
}

/** A resource that refills when you roll Initiative; `costKey` makes it a choice that spends that resource. */
export interface InitiativeRefill {
  key: string;
  upTo?: number;
  costKey?: string;
  source: string;
}

export interface DerivedSheet {
  totalLevel: number;
  proficiencyBonus: number;
  classLevels: SheetClassLevel[];
  abilities: Record<Ability, AbilityResult>;
  saves: Record<Ability, CheckResult>;
  skills: Record<SkillId, SkillResult>;
  passivePerception: number;
  initiative: number;
  speed: number;
  /** Exhaustion: 2 per level, already subtracted from every d20 test bonus on this sheet. */
  d20Penalty: number;
  hp: { current: number; max: number; temp: number };
  hitDice: HitDiceResult[];
  ac: ArmorClassResult;
  attacks: AttackResult[];
  spellcasting: SpellcastingResult;
  resources: ResourceResult[];
  features: ActiveFeature[];
  armorTraining: ArmorTraining[];
  weaponProficiencies: WeaponProficiency[];
  flags: string[];
  initiativeRefills: InitiativeRefill[];
  bonusParts: BonusPart[];
  warnings: Warning[];
}
