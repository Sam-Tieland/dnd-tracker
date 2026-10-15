import type { Effect, Formula } from '../schema';

const column = (cls: string, key: string): Formula => ({ column: { classId: `srd:class:${cls}`, key } });

/** Mechanical effects per feature or feat id. Every entry is backed by a quote in overlays.test.ts (EVIDENCE). */
export const EFFECTS: Record<string, Effect[]> = {
  'srd:feature:barbarian:1:rage': [
    { kind: 'resource', key: 'rage', name: 'Rage', max: column('barbarian', 'rages'), recharge: 'long', shortRestRegain: 1 },
  ],
  'srd:feature:barbarian:1:unarmored-defense': [
    { kind: 'acFormula', name: 'Unarmored Defense', base: 10, abilities: ['dex', 'con'], allowShield: true },
  ],
  'srd:feature:barbarian:5:fast-movement': [{ kind: 'bonus', target: 'speed', value: 10, when: 'notHeavyArmor' }],
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
  'srd:feature:paladin:1:lay-on-hands': [
    { kind: 'resource', key: 'lay-on-hands', name: 'Lay On Hands', max: { level: 'srd:class:paladin', times: 5 }, recharge: 'long', pool: true },
  ],
  'srd:feature:paladin:3:channel-divinity': [
    { kind: 'resource', key: 'channel-divinity-paladin', name: 'Channel Divinity (Paladin)', max: column('paladin', 'channel-divinity'), recharge: 'long', shortRestRegain: 1 },
  ],
  'srd:feature:ranger:1:favored-enemy': [
    { kind: 'resource', key: 'favored-enemy', name: "Favored Enemy (Hunter's Mark)", max: column('ranger', 'favored-enemy'), recharge: 'long' },
  ],
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
};
