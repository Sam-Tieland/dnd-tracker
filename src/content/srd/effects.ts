import type { Effect, Formula } from '../schema';

const column = (cls: string, key: string): Formula => ({ column: { classId: `srd:class:${cls}`, key } });
/** One use from a character level on, such as the species traits that start at character level 5. */
const fromLevel = (level: number): Formula => ({ atLevel: { classId: 'total', values: [[level, 1]] } });

/** Mechanical effects per feature or feat id. Every entry is backed by a quote in overlays.test.ts (EVIDENCE). */
export const EFFECTS: Record<string, Effect[]> = {
  'srd:feature:barbarian:1:rage': [
    { kind: 'resource', key: 'rage', name: 'Rage', max: column('barbarian', 'rages'), recharge: 'long', shortRestRegain: 1 },
  ],
  'srd:feature:barbarian:1:unarmored-defense': [
    { kind: 'acFormula', name: 'Unarmored Defense', base: 10, abilities: ['dex', 'con'], allowShield: true },
  ],
  'srd:feature:barbarian:5:fast-movement': [{ kind: 'bonus', target: 'speed', value: 10, when: 'notHeavyArmor' }],
  'srd:feature:barbarian:20:primal-champion': [
    { kind: 'bonus', target: 'ability:str', value: 4 },
    { kind: 'bonus', target: 'abilityMax:str', value: 5 },
    { kind: 'bonus', target: 'ability:con', value: 4 },
    { kind: 'bonus', target: 'abilityMax:con', value: 5 },
  ],
  'srd:feature:bard:1:bardic-inspiration': [
    { kind: 'resource', key: 'bardic-inspiration', name: 'Bardic Inspiration', max: { mod: 'cha', min: 1 }, recharge: 'long' },
  ],
  'srd:feature:bard:2:jack-of-all-trades': [{ kind: 'halfProficiency' }],
  'srd:feature:bard:5:font-of-inspiration': [{ kind: 'resourceRecharge', key: 'bardic-inspiration', recharge: 'short' }],
  'srd:feature:cleric:2:channel-divinity': [
    { kind: 'resource', key: 'channel-divinity-cleric', name: 'Channel Divinity (Cleric)', max: column('cleric', 'channel-divinity'), recharge: 'long', shortRestRegain: 1 },
  ],
  'srd:feature:druid:2:wild-shape': [
    { kind: 'resource', key: 'wild-shape', name: 'Wild Shape', max: column('druid', 'wild-shape'), recharge: 'long', shortRestRegain: 1 },
  ],
  'srd:feature:fighter:1:second-wind': [
    { kind: 'resource', key: 'second-wind', name: 'Second Wind', max: column('fighter', 'second-wind'), recharge: 'long', shortRestRegain: 1 },
  ],
  'srd:feature:fighter:2:action-surge': [
    { kind: 'resource', key: 'action-surge', name: 'Action Surge', max: { atLevel: { classId: 'srd:class:fighter', values: [[2, 1], [17, 2]] } }, recharge: 'short' },
  ],
  'srd:feature:fighter:9:indomitable': [
    { kind: 'resource', key: 'indomitable', name: 'Indomitable', max: { atLevel: { classId: 'srd:class:fighter', values: [[9, 1], [13, 2], [17, 3]] } }, recharge: 'long' },
  ],
  'srd:feature:monk:1:unarmored-defense': [
    { kind: 'acFormula', name: 'Unarmored Defense', base: 10, abilities: ['dex', 'wis'], allowShield: false },
  ],
  'srd:feature:monk:2:monks-focus': [
    { kind: 'resource', key: 'focus-points', name: 'Focus Points', max: column('monk', 'focus-points'), recharge: 'short', pool: true },
  ],
  'srd:feature:monk:2:unarmored-movement': [
    { kind: 'bonus', target: 'speed', value: column('monk', 'unarmored-movement'), when: 'unarmored' },
  ],
  'srd:feature:monk:2:uncanny-metabolism': [
    { kind: 'resource', key: 'uncanny-metabolism', name: 'Uncanny Metabolism', max: 1, recharge: 'long' },
  ],
  'srd:feature:monk:20:body-and-mind': [
    { kind: 'bonus', target: 'ability:dex', value: 4 },
    { kind: 'bonus', target: 'abilityMax:dex', value: 5 },
    { kind: 'bonus', target: 'ability:wis', value: 4 },
    { kind: 'bonus', target: 'abilityMax:wis', value: 5 },
  ],
  'srd:feature:paladin:1:lay-on-hands': [
    { kind: 'resource', key: 'lay-on-hands', name: 'Lay On Hands', max: { level: 'srd:class:paladin', times: 5 }, recharge: 'long', pool: true },
  ],
  'srd:feature:paladin:3:channel-divinity': [
    { kind: 'resource', key: 'channel-divinity-paladin', name: 'Channel Divinity (Paladin)', max: column('paladin', 'channel-divinity'), recharge: 'long', shortRestRegain: 1 },
  ],
  'srd:feature:ranger:1:favored-enemy': [
    { kind: 'resource', key: 'favored-enemy', name: "Favored Enemy (Hunter's Mark)", max: column('ranger', 'favored-enemy'), recharge: 'long' },
  ],
  'srd:feature:ranger:6:roving': [{ kind: 'bonus', target: 'speed', value: 10, when: 'notHeavyArmor' }],
  'srd:feature:sorcerer:1:innate-sorcery': [
    { kind: 'resource', key: 'innate-sorcery', name: 'Innate Sorcery', max: 2, recharge: 'long' },
  ],
  'srd:feature:sorcerer:2:font-of-magic': [
    { kind: 'resource', key: 'sorcery-points', name: 'Sorcery Points', max: column('sorcerer', 'sorcery-points'), recharge: 'long', pool: true },
  ],
  'srd:feature:sorcerer:5:sorcerous-restoration': [
    { kind: 'resource', key: 'sorcerous-restoration', name: 'Sorcerous Restoration', max: 1, recharge: 'long' },
  ],
  'srd:feature:warlock:2:magical-cunning': [
    { kind: 'resource', key: 'magical-cunning', name: 'Magical Cunning', max: 1, recharge: 'long' },
  ],
  'srd:feature:wizard:1:arcane-recovery': [
    { kind: 'resource', key: 'arcane-recovery', name: 'Arcane Recovery', max: 1, recharge: 'long' },
  ],
  'srd:feature:circle-of-the-land:6:natural-recovery': [
    { kind: 'resource', key: 'natural-recovery-spell', name: 'Natural Recovery (spell)', max: 1, recharge: 'long' },
    { kind: 'resource', key: 'natural-recovery-slots', name: 'Natural Recovery (slots)', max: 1, recharge: 'long' },
  ],
  'srd:feature:warrior-of-the-open-hand:6:wholeness-of-body': [
    { kind: 'resource', key: 'wholeness-of-body', name: 'Wholeness of Body', max: { mod: 'wis', min: 1 }, recharge: 'long' },
  ],
  'srd:feature:draconic-sorcery:3:draconic-resilience': [
    { kind: 'bonus', target: 'hpMax', value: { level: 'srd:class:sorcerer' } },
    { kind: 'acFormula', name: 'Draconic Resilience', base: 10, abilities: ['dex', 'cha'], allowShield: true },
  ],
  'srd:feature:fiend-patron:6:dark-ones-own-luck': [
    { kind: 'resource', key: 'dark-ones-own-luck', name: "Dark One's Own Luck", max: { mod: 'cha', min: 1 }, recharge: 'long' },
  ],
  'srd:feature:dragonborn:breath-weapon': [
    { kind: 'resource', key: 'breath-weapon', name: 'Breath Weapon', max: { pb: true }, recharge: 'long' },
  ],
  'srd:feature:dwarf:dwarven-toughness': [{ kind: 'bonus', target: 'hpMax', value: { level: 'total' } }],
  'srd:feature:dwarf:stonecunning': [
    { kind: 'resource', key: 'stonecunning', name: 'Stonecunning', max: { pb: true }, recharge: 'long' },
  ],
  'srd:feature:goliath:giant-ancestry': [
    { kind: 'resource', key: 'giant-ancestry', name: 'Giant Ancestry', max: { pb: true }, recharge: 'long' },
  ],
  'srd:feature:orc:adrenaline-rush': [
    { kind: 'resource', key: 'adrenaline-rush', name: 'Adrenaline Rush', max: { pb: true }, recharge: 'short' },
  ],
  'srd:feature:orc:relentless-endurance': [
    { kind: 'resource', key: 'relentless-endurance', name: 'Relentless Endurance', max: 1, recharge: 'long' },
  ],
  'srd:feature:human:resourceful': [{ kind: 'flag', flag: 'heroic-inspiration-on-long-rest' }],
  'srd:feat:alert': [{ kind: 'bonus', target: 'initiative', value: { pb: true } }],
  'srd:feat:defense': [{ kind: 'bonus', target: 'ac', value: 1, when: 'armored' }],
  'srd:feature:barbarian:15:persistent-rage': [
    { kind: 'resource', key: 'persistent-rage', name: 'Persistent Rage', max: 1, recharge: 'long' },
  ],
  'srd:feature:cleric:10:divine-intervention': [
    { kind: 'resource', key: 'divine-intervention', name: 'Divine Intervention', max: 1, recharge: 'long' },
  ],
  'srd:feature:druid:5:wild-resurgence': [
    { kind: 'resource', key: 'wild-resurgence', name: 'Wild Resurgence (spell slot)', max: 1, recharge: 'long' },
  ],
  'srd:feature:druid:20:archdruid': [
    { kind: 'resource', key: 'nature-magician', name: 'Nature Magician', max: 1, recharge: 'long' },
  ],
  'srd:feature:oath-of-devotion:20:holy-nimbus': [
    { kind: 'resource', key: 'holy-nimbus', name: 'Holy Nimbus', max: 1, recharge: 'long' },
  ],
  'srd:feature:ranger:10:tireless': [
    { kind: 'resource', key: 'tireless', name: 'Tireless', max: { mod: 'wis', min: 1 }, recharge: 'long' },
    { kind: 'flag', flag: 'exhaustion-down-on-short-rest' },
  ],
  'srd:feature:ranger:14:natures-veil': [
    { kind: 'resource', key: 'natures-veil', name: "Nature's Veil", max: { mod: 'wis', min: 1 }, recharge: 'long' },
  ],
  'srd:feature:rogue:20:stroke-of-luck': [
    { kind: 'resource', key: 'stroke-of-luck', name: 'Stroke of Luck', max: 1, recharge: 'short' },
  ],
  'srd:feature:warlock:9:contact-patron': [
    { kind: 'resource', key: 'contact-patron', name: 'Contact Patron', max: 1, recharge: 'long' },
  ],
  'srd:feature:warlock:11:mystic-arcanum': [
    { kind: 'resource', key: 'mystic-arcanum', name: 'Mystic Arcanum (each spell once)', max: { atLevel: { classId: 'srd:class:warlock', values: [[11, 1], [13, 2], [15, 3], [17, 4]] } }, recharge: 'long' },
  ],
  'srd:feature:wizard:20:signature-spells': [
    { kind: 'resource', key: 'signature-spells', name: 'Signature Spells (each spell once)', max: 2, recharge: 'short' },
  ],
  'srd:feature:draconic-sorcery:14:dragon-wings': [
    { kind: 'resource', key: 'dragon-wings', name: 'Dragon Wings', max: 1, recharge: 'long' },
  ],
  'srd:feature:fiend-patron:14:hurl-through-hell': [
    { kind: 'resource', key: 'hurl-through-hell', name: 'Hurl Through Hell', max: 1, recharge: 'long' },
  ],
  'srd:feature:dragonborn:draconic-flight': [
    { kind: 'resource', key: 'draconic-flight', name: 'Draconic Flight', max: fromLevel(5), recharge: 'long' },
  ],
  'srd:feature:elf:elven-lineage': [
    { kind: 'resource', key: 'elven-lineage-3', name: 'Elven Lineage (level 3 spell)', max: fromLevel(3), recharge: 'long' },
    { kind: 'resource', key: 'elven-lineage-5', name: 'Elven Lineage (level 5 spell)', max: fromLevel(5), recharge: 'long' },
  ],
  'srd:feature:goliath:large-form': [
    { kind: 'resource', key: 'large-form', name: 'Large Form', max: fromLevel(5), recharge: 'long' },
  ],
  'srd:feature:tiefling:fiendish-legacy': [
    { kind: 'resource', key: 'fiendish-legacy-3', name: 'Fiendish Legacy (level 3 spell)', max: fromLevel(3), recharge: 'long' },
    { kind: 'resource', key: 'fiendish-legacy-5', name: 'Fiendish Legacy (level 5 spell)', max: fromLevel(5), recharge: 'long' },
  ],
  'srd:feat:archery': [
    { kind: 'bonus', target: 'attack:ranged-weapons', value: 2 },
  ],
  'srd:feat:magic-initiate': [
    { kind: 'resource', key: 'magic-initiate', name: 'Magic Initiate (level 1 spell)', max: 1, recharge: 'long' },
  ],
};
