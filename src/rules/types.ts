import type { Ability, SkillId } from '../content/constants';
import type { ArmorTraining, Effect, Progression, WeaponProficiency } from '../content/schema';

export type WarningCode = 'unknown-content' | 'multiclass-prerequisite' | 'ability-over-max' | 'cantrip-without-caster';
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

export type FeatureOrigin = 'class' | 'subclass' | 'species' | 'feat' | 'option';
export interface ActiveFeature {
  id: string;
  name: string;
  text: string;
  effects: Effect[];
  origin: FeatureOrigin;
  ownerName: string;
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
  kind: 'weapon' | 'cantrip';
  name: string;
  toHit?: number;
  saveDC?: number;
  saveAbility?: Ability;
  damage: string;
  damageType: string;
  properties: string[];
  mastery?: string;
  proficient: boolean;
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
  recharge: 'short' | 'long';
  shortRestRegain: number;
  pool: boolean;
}

export interface DerivedSheet {
  totalLevel: number;
  proficiencyBonus: number;
  classLevels: ClassLevel[];
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
  warnings: Warning[];
}
