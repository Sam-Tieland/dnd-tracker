import type { Ability, SkillId } from '../../content/constants';

/**
 * The exact field names of the official fillable 5E character sheet, trailing spaces included: that is how they are
 * named in the PDF. The sheet itself is never part of this repository.
 */
export type Skill = SkillId;

export const ABILITY_FIELDS: Record<Ability, { score: string; mod: string; save: string; saveCheck: string }> = {
  str: { score: 'STR', mod: 'STRmod', save: 'ST Strength', saveCheck: 'Check Box 11' },
  dex: { score: 'DEX', mod: 'DEXmod ', save: 'ST Dexterity', saveCheck: 'Check Box 18' },
  con: { score: 'CON', mod: 'CONmod', save: 'ST Constitution', saveCheck: 'Check Box 19' },
  int: { score: 'INT', mod: 'INTmod', save: 'ST Intelligence', saveCheck: 'Check Box 20' },
  wis: { score: 'WIS', mod: 'WISmod', save: 'ST Wisdom', saveCheck: 'Check Box 21' },
  cha: { score: 'CHA', mod: 'CHamod', save: 'ST Charisma', saveCheck: 'Check Box 22' },
};

export const SKILL_FIELDS: Record<Skill, { value: string; check: string }> = {
  acrobatics: { value: 'Acrobatics', check: 'Check Box 23' },
  'animal-handling': { value: 'Animal', check: 'Check Box 24' },
  arcana: { value: 'Arcana', check: 'Check Box 25' },
  athletics: { value: 'Athletics', check: 'Check Box 26' },
  deception: { value: 'Deception ', check: 'Check Box 27' },
  history: { value: 'History ', check: 'Check Box 28' },
  insight: { value: 'Insight', check: 'Check Box 29' },
  intimidation: { value: 'Intimidation', check: 'Check Box 30' },
  investigation: { value: 'Investigation ', check: 'Check Box 31' },
  medicine: { value: 'Medicine', check: 'Check Box 32' },
  nature: { value: 'Nature', check: 'Check Box 33' },
  perception: { value: 'Perception ', check: 'Check Box 34' },
  performance: { value: 'Performance', check: 'Check Box 35' },
  persuasion: { value: 'Persuasion', check: 'Check Box 36' },
  religion: { value: 'Religion', check: 'Check Box 37' },
  'sleight-of-hand': { value: 'SleightofHand', check: 'Check Box 38' },
  stealth: { value: 'Stealth ', check: 'Check Box 39' },
  survival: { value: 'Survival', check: 'Check Box 40' },
};

export const DEATH_SAVE_CHECKS: { successes: [string, string, string]; failures: [string, string, string] } = {
  successes: ['Check Box 12', 'Check Box 13', 'Check Box 14'],
  failures: ['Check Box 15', 'Check Box 16', 'Check Box 17'],
};

export const WEAPON_ROWS: readonly { name: string; bonus: string; damage: string }[] = [
  { name: 'Wpn Name', bonus: 'Wpn1 AtkBonus', damage: 'Wpn1 Damage' },
  { name: 'Wpn Name 2', bonus: 'Wpn2 AtkBonus ', damage: 'Wpn2 Damage ' },
  { name: 'Wpn Name 3', bonus: 'Wpn3 AtkBonus  ', damage: 'Wpn3 Damage ' },
];

export const SLOT_FIELDS: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, { total: string; remaining: string }> = {
  1: { total: 'SlotsTotal 19', remaining: 'SlotsRemaining 19' },
  2: { total: 'SlotsTotal 20', remaining: 'SlotsRemaining 20' },
  3: { total: 'SlotsTotal 21', remaining: 'SlotsRemaining 21' },
  4: { total: 'SlotsTotal 22', remaining: 'SlotsRemaining 22' },
  5: { total: 'SlotsTotal 23', remaining: 'SlotsRemaining 23' },
  6: { total: 'SlotsTotal 24', remaining: 'SlotsRemaining 24' },
  7: { total: 'SlotsTotal 25', remaining: 'SlotsRemaining 25' },
  8: { total: 'SlotsTotal 26', remaining: 'SlotsRemaining 26' },
  9: { total: 'SlotsTotal 27', remaining: 'SlotsRemaining 27' },
};

/** Spell lines per level, top to bottom, with the "prepared" checkbox where the sheet has one. */
export const SPELL_LINES: Record<'cantrips' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9', readonly { name: string; prepared?: string }[]> = {
  '1': [
    { name: 'Spells 1015', prepared: 'Check Box 251' },
    { name: 'Spells 1023', prepared: 'Check Box 309' },
    { name: 'Spells 1024', prepared: 'Check Box 3010' },
    { name: 'Spells 1025', prepared: 'Check Box 3011' },
    { name: 'Spells 1026', prepared: 'Check Box 3012' },
    { name: 'Spells 1027', prepared: 'Check Box 3013' },
    { name: 'Spells 1028', prepared: 'Check Box 3014' },
    { name: 'Spells 1029', prepared: 'Check Box 3015' },
    { name: 'Spells 1030', prepared: 'Check Box 3016' },
    { name: 'Spells 1031', prepared: 'Check Box 3017' },
    { name: 'Spells 1032', prepared: 'Check Box 3018' },
    { name: 'Spells 1033', prepared: 'Check Box 3019' },
  ],
  '2': [
    { name: 'Spells 1046', prepared: 'Check Box 313' },
    { name: 'Spells 1034', prepared: 'Check Box 310' },
    { name: 'Spells 1035', prepared: 'Check Box 3020' },
    { name: 'Spells 1036', prepared: 'Check Box 3021' },
    { name: 'Spells 1037', prepared: 'Check Box 3022' },
    { name: 'Spells 1038', prepared: 'Check Box 3023' },
    { name: 'Spells 1039', prepared: 'Check Box 3024' },
    { name: 'Spells 1040', prepared: 'Check Box 3025' },
    { name: 'Spells 1041', prepared: 'Check Box 3026' },
    { name: 'Spells 1042', prepared: 'Check Box 3027' },
    { name: 'Spells 1043', prepared: 'Check Box 3028' },
    { name: 'Spells 1044', prepared: 'Check Box 3029' },
    { name: 'Spells 1045', prepared: 'Check Box 3030' },
  ],
  '3': [
    { name: 'Spells 1048', prepared: 'Check Box 315' },
    { name: 'Spells 1047', prepared: 'Check Box 314' },
    { name: 'Spells 1049', prepared: 'Check Box 3031' },
    { name: 'Spells 1050', prepared: 'Check Box 3032' },
    { name: 'Spells 1051', prepared: 'Check Box 3033' },
    { name: 'Spells 1052', prepared: 'Check Box 3034' },
    { name: 'Spells 1053', prepared: 'Check Box 3035' },
    { name: 'Spells 1054', prepared: 'Check Box 3036' },
    { name: 'Spells 1055', prepared: 'Check Box 3037' },
    { name: 'Spells 1056', prepared: 'Check Box 3038' },
    { name: 'Spells 1057', prepared: 'Check Box 3039' },
    { name: 'Spells 1058', prepared: 'Check Box 3040' },
    { name: 'Spells 1059', prepared: 'Check Box 3041' },
  ],
  '4': [
    { name: 'Spells 1061', prepared: 'Check Box 317' },
    { name: 'Spells 1060', prepared: 'Check Box 316' },
    { name: 'Spells 1062', prepared: 'Check Box 3042' },
    { name: 'Spells 1063', prepared: 'Check Box 3043' },
    { name: 'Spells 1064', prepared: 'Check Box 3044' },
    { name: 'Spells 1065', prepared: 'Check Box 3045' },
    { name: 'Spells 1066', prepared: 'Check Box 3046' },
    { name: 'Spells 1067', prepared: 'Check Box 3047' },
    { name: 'Spells 1068', prepared: 'Check Box 3048' },
    { name: 'Spells 1069', prepared: 'Check Box 3049' },
    { name: 'Spells 1070', prepared: 'Check Box 3050' },
    { name: 'Spells 1071', prepared: 'Check Box 3051' },
    { name: 'Spells 1072', prepared: 'Check Box 3052' },
  ],
  '5': [
    { name: 'Spells 1074', prepared: 'Check Box 319' },
    { name: 'Spells 1073', prepared: 'Check Box 318' },
    { name: 'Spells 1075', prepared: 'Check Box 3053' },
    { name: 'Spells 1076', prepared: 'Check Box 3054' },
    { name: 'Spells 1077', prepared: 'Check Box 3055' },
    { name: 'Spells 1078', prepared: 'Check Box 3056' },
    { name: 'Spells 1079', prepared: 'Check Box 3057' },
    { name: 'Spells 1080', prepared: 'Check Box 3058' },
    { name: 'Spells 1081', prepared: 'Check Box 3059' },
  ],
  '6': [
    { name: 'Spells 1083', prepared: 'Check Box 321' },
    { name: 'Spells 1082', prepared: 'Check Box 320' },
    { name: 'Spells 1084', prepared: 'Check Box 3060' },
    { name: 'Spells 1085', prepared: 'Check Box 3061' },
    { name: 'Spells 1086', prepared: 'Check Box 3062' },
    { name: 'Spells 1087', prepared: 'Check Box 3063' },
    { name: 'Spells 1088', prepared: 'Check Box 3064' },
    { name: 'Spells 1089', prepared: 'Check Box 3065' },
    { name: 'Spells 1090', prepared: 'Check Box 3066' },
  ],
  '7': [
    { name: 'Spells 1092', prepared: 'Check Box 323' },
    { name: 'Spells 1091', prepared: 'Check Box 322' },
    { name: 'Spells 1093', prepared: 'Check Box 3067' },
    { name: 'Spells 1094', prepared: 'Check Box 3068' },
    { name: 'Spells 1095', prepared: 'Check Box 3069' },
    { name: 'Spells 1096', prepared: 'Check Box 3070' },
    { name: 'Spells 1097', prepared: 'Check Box 3071' },
    { name: 'Spells 1098', prepared: 'Check Box 3072' },
    { name: 'Spells 1099', prepared: 'Check Box 3073' },
  ],
  '8': [
    { name: 'Spells 10101', prepared: 'Check Box 325' },
    { name: 'Spells 10100', prepared: 'Check Box 324' },
    { name: 'Spells 10102', prepared: 'Check Box 3074' },
    { name: 'Spells 10103', prepared: 'Check Box 3075' },
    { name: 'Spells 10104', prepared: 'Check Box 3076' },
    { name: 'Spells 10105', prepared: 'Check Box 3077' },
    { name: 'Spells 10106', prepared: 'Check Box 3078' },
  ],
  '9': [
    { name: 'Spells 10108', prepared: 'Check Box 327' },
    { name: 'Spells 10107', prepared: 'Check Box 326' },
    { name: 'Spells 10109', prepared: 'Check Box 3079' },
    { name: 'Spells 101010', prepared: 'Check Box 3080' },
    { name: 'Spells 101011', prepared: 'Check Box 3081' },
    { name: 'Spells 101012', prepared: 'Check Box 3082' },
    { name: 'Spells 101013', prepared: 'Check Box 3083' },
  ],
  cantrips: [
    { name: 'Spells 1014' },
    { name: 'Spells 1016' },
    { name: 'Spells 1017' },
    { name: 'Spells 1018' },
    { name: 'Spells 1019' },
    { name: 'Spells 1020' },
    { name: 'Spells 1021' },
    { name: 'Spells 1022' },
  ],
};

/** A handful of fields that identify the sheet. */
export const REQUIRED_FIELDS: readonly string[] = ['CharacterName', 'ClassLevel', 'STR', 'Spells 1014', 'Check Box 11'];

export const HEADER_FIELDS = {
  name: 'CharacterName',
  name2: 'CharacterName 2',
  classLevel: 'ClassLevel',
  background: 'Background',
  player: 'PlayerName',
  species: 'Race ',
  alignment: 'Alignment',
  xp: 'XP',
  inspiration: 'Inspiration',
} as const;

export const COMBAT_FIELDS = {
  profBonus: 'ProfBonus',
  ac: 'AC',
  initiative: 'Initiative',
  speed: 'Speed',
  hpMax: 'HPMax',
  hpCurrent: 'HPCurrent',
  hpTemp: 'HPTemp',
  hdTotal: 'HDTotal',
  hd: 'HD',
  passive: 'Passive',
  cp: 'CP',
  sp: 'SP',
  ep: 'EP',
  gp: 'GP',
  pp: 'PP',
  attacks: 'AttacksSpellcasting',
  proficiencies: 'ProficienciesLang',
  equipment: 'Equipment',
  features: 'Features and Traits',
  personality: 'PersonalityTraits ',
  ideals: 'Ideals',
  bonds: 'Bonds',
  flaws: 'Flaws',
} as const;

export const PAGE2_FIELDS = {
  age: 'Age',
  height: 'Height',
  weight: 'Weight',
  eyes: 'Eyes',
  skin: 'Skin',
  hair: 'Hair',
  allies: 'Allies',
  faction: 'FactionName',
  backstory: 'Backstory',
  feats: 'Feat+Traits',
  treasure: 'Treasure',
} as const;

export const SPELL_HEADER_FIELDS = {
  spellClass: 'Spellcasting Class 2',
  ability: 'SpellcastingAbility 2',
  dc: 'SpellSaveDC  2',
  attack: 'SpellAtkBonus 2',
} as const;
