import { describe, expect, it } from 'vitest';
import { deriveSheet } from './derive';
import { item, kael, level, levels, makeCharacter, registry } from './testing/fixtures';

const derive = (character: Parameters<typeof deriveSheet>[0]) => deriveSheet(character, registry);
const human = { speciesId: 'srd:species:human' };

describe('deriveSheet: Kael (Fighter 3 Champion / Wizard 2)', () => {
  const sheet = derive(kael());

  it('computes level, proficiency bonus and abilities', () => {
    expect(sheet.totalLevel).toBe(5);
    expect(sheet.proficiencyBonus).toBe(3);
    expect(Object.values(sheet.abilities).map((a) => a.score)).toEqual([17, 13, 15, 14, 10, 8]);
  });

  it('takes saving throw proficiencies from the first class only', () => {
    expect(sheet.saves).toEqual({
      str: { bonus: 6, proficient: true },
      dex: { bonus: 1, proficient: false },
      con: { bonus: 5, proficient: true },
      int: { bonus: 2, proficient: false },
      wis: { bonus: 0, proficient: false },
      cha: { bonus: -1, proficient: false },
    });
  });

  it('combines background and chosen skill proficiencies', () => {
    expect(sheet.skills.athletics).toEqual({ bonus: 6, proficient: true, expertise: false, ability: 'str' });
    expect(sheet.skills.intimidation.bonus).toBe(2);
    expect(sheet.skills.perception.bonus).toBe(3);
    expect(sheet.skills.history.bonus).toBe(5);
    expect(sheet.skills.arcana).toMatchObject({ bonus: 2, proficient: false });
    expect(sheet.passivePerception).toBe(13);
    expect(sheet.initiative).toBe(1);
    expect(sheet.speed).toBe(30);
  });

  it('computes hit points and hit dice', () => {
    expect(sheet.hp).toEqual({ current: 0, max: 40, temp: 0 });
    expect(sheet.hitDice).toEqual([
      { die: 10, total: 3, spent: 0 },
      { die: 6, total: 2, spent: 0 },
    ]);
  });

  it('computes armor class from armor, shield and the Defense fighting style', () => {
    expect(sheet.ac).toEqual({ value: 19, source: 'Chain Mail', armored: true, shield: true });
    const unarmored = derive(kael({ inventory: [item('i3', 'srd:weapon:longsword')] }));
    expect(unarmored.ac).toEqual({ value: 11, source: 'Unarmored', armored: false, shield: false });
  });

  it('computes weapon attacks', () => {
    expect(sheet.attacks).toEqual([
      {
        id: 'i3', kind: 'weapon', name: 'Longsword', toHit: 6, damage: '1d8+3', damageType: 'Slashing',
        properties: ['Versatile (1d10)'], mastery: 'Sap', proficient: true,
      },
    ]);
  });

  it('lists features, feats and proficiencies', () => {
    expect(sheet.features.map((f) => f.id)).toEqual(
      expect.arrayContaining([
        'srd:feature:fighter:1:second-wind',
        'srd:feature:fighter:2:action-surge',
        'srd:feature:champion:3:improved-critical',
        'srd:feature:wizard:1:arcane-recovery',
        'srd:feature:human:resourceful',
        'srd:feat:defense',
        'srd:feat:savage-attacker',
      ]),
    );
    expect(sheet.features.find((f) => f.id === 'srd:feat:defense')?.origin).toBe('feat');
    expect(sheet.features.some((f) => f.id.startsWith('srd:feature:fighter:4:'))).toBe(false);
    expect(sheet.armorTraining).toEqual(['light', 'medium', 'heavy', 'shield']);
    expect(sheet.weaponProficiencies).toEqual(['simple', 'martial']);
    expect(sheet.flags).toEqual(['heroic-inspiration-on-long-rest']);
    expect(sheet.warnings).toEqual([]);
  });
});

describe('deriveSheet: unarmored classes', () => {
  const monk = (inventory: ReturnType<typeof item>[] = []) =>
    derive(makeCharacter({
      choices: { ...human, baseAbilities: { str: 10, dex: 16, con: 14, int: 10, wis: 16, cha: 8 }, levels: levels('monk', 5) },
      inventory,
    }));
  const barbarian = (inventory: ReturnType<typeof item>[] = []) =>
    derive(makeCharacter({
      choices: { ...human, baseAbilities: { str: 16, dex: 14, con: 16, int: 8, wis: 10, cha: 10 }, levels: levels('barbarian', 5) },
      inventory,
    }));

  it('Monk: Unarmored Defense and Unarmored Movement only without armor and shield', () => {
    expect(monk().ac).toEqual({ value: 16, source: 'Unarmored Defense', armored: false, shield: false });
    expect(monk().speed).toBe(40);
    // No Shield training: the shield is wielded (so Unarmored Defense is lost) but gives no AC.
    expect(monk([item('s', 'srd:armor:shield')]).ac).toEqual({ value: 13, source: 'Unarmored', armored: false, shield: true });
    expect(monk([item('s', 'srd:armor:shield')]).speed).toBe(30);
    expect(monk().hp.max).toBe(38);
    expect(monk().saves.dex).toEqual({ bonus: 6, proficient: true });
  });

  it('Monk: proficient with Light martial weapons only', () => {
    const attacks = monk([item('a', 'srd:weapon:shortsword'), item('b', 'srd:weapon:longsword')]).attacks;
    expect(attacks.map((a) => [a.name, a.toHit, a.damage, a.proficient])).toEqual([
      ['Shortsword', 6, '1d6+3', true],
      ['Longsword', 0, '1d8', false],
    ]);
  });

  it('Barbarian: Unarmored Defense with a shield, Fast Movement except in heavy armor', () => {
    expect(barbarian().ac).toEqual({ value: 15, source: 'Unarmored Defense', armored: false, shield: false });
    expect(barbarian([item('s', 'srd:armor:shield')]).ac).toEqual({ value: 17, source: 'Unarmored Defense', armored: false, shield: true });
    expect(barbarian().speed).toBe(40);
    const heavy = barbarian([item('c', 'srd:armor:chain-mail')]);
    expect(heavy.ac).toEqual({ value: 16, source: 'Chain Mail', armored: true, shield: false });
    expect(heavy.speed).toBe(30);
    expect(barbarian().hp.max).toBe(55);
  });
});

describe('deriveSheet: special rules', () => {
  it('heavy armor without enough Strength costs 10 feet of speed', () => {
    const weak = makeCharacter({ choices: { ...human, levels: levels('fighter', 1) }, inventory: [item('c', 'srd:armor:chain-mail')] });
    expect(derive(weak).speed).toBe(20);
  });

  it('exhaustion lowers d20 tests and speed but not passive Perception', () => {
    const sheet = derive(kael({ state: { exhaustion: 2 } }));
    expect(sheet.d20Penalty).toBe(4);
    expect(sheet.skills.athletics.bonus).toBe(2);
    expect(sheet.saves.str.bonus).toBe(2);
    expect(sheet.initiative).toBe(-3);
    expect(sheet.attacks[0].toHit).toBe(2);
    expect(sheet.passivePerception).toBe(13);
    expect(sheet.speed).toBe(20);
  });

  it('Jack of All Trades adds half proficiency to skills without proficiency, not to initiative', () => {
    const bard = derive(makeCharacter({
      choices: { baseAbilities: { str: 8, dex: 10, con: 12, int: 10, wis: 10, cha: 14 }, levels: levels('bard', 2), skillProficiencies: ['performance', 'persuasion'] },
    }));
    expect(bard.skills.arcana).toMatchObject({ bonus: 1, proficient: false });
    expect(bard.skills.performance.bonus).toBe(4);
    expect(bard.initiative).toBe(0);
  });

  it('expertise doubles the proficiency bonus', () => {
    const sheet = derive(kael({ choices: { expertise: ['athletics'] } }));
    expect(sheet.skills.athletics).toMatchObject({ bonus: 9, expertise: true, proficient: true });
  });

  it('applies overrides and Dwarven Toughness', () => {
    const sheet = derive(kael({ overrides: [{ id: 'o1', target: 'ac', value: 1, reason: 'Ring of Protection' }, { id: 'o2', target: 'attack:i3', value: 1, reason: '+1 sword' }] }));
    expect(sheet.ac.value).toBe(20);
    expect(sheet.attacks[0].toHit).toBe(7);
    const dwarf = derive(makeCharacter({ choices: { speciesId: 'srd:species:dwarf', levels: levels('fighter', 1) } }));
    expect(dwarf.hp.max).toBe(11);
  });

  it('a shield only gives its AC bonus with Shield training', () => {
    const wizard = derive(makeCharacter({
      choices: { baseAbilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 }, levels: levels('wizard', 1) },
      inventory: [item('s', 'srd:armor:shield')],
    }));
    expect(wizard.ac).toEqual({ value: 12, source: 'Unarmored', armored: false, shield: true });
  });

  it('multiclassing adds only the multiclass proficiencies of the later classes', () => {
    const sheet = derive(makeCharacter({ choices: { levels: [level('wizard'), level('fighter')] } }));
    expect(sheet.armorTraining).toEqual(['light', 'medium', 'shield']);
    expect(sheet.weaponProficiencies).toEqual(['simple', 'martial']);
    expect(sheet.saves.int.proficient).toBe(true);
    expect(sheet.saves.wis.proficient).toBe(true);
    expect(sheet.saves.str.proficient).toBe(false);
    expect(sheet.saves.con.proficient).toBe(false);
  });

  it('Rogue is proficient with martial Finesse or Light weapons only', () => {
    const rogue = derive(makeCharacter({
      choices: { baseAbilities: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 }, levels: levels('rogue', 1) },
      inventory: [
        item('a', 'srd:weapon:rapier'),
        item('b', 'srd:weapon:hand-crossbow'),
        item('c', 'srd:weapon:longsword'),
        item('d', 'srd:weapon:longbow'),
      ],
    }));
    expect(rogue.attacks.map((a) => [a.name, a.proficient])).toEqual([
      ['Rapier', true],
      ['Hand Crossbow', true],
      ['Longsword', false],
      ['Longbow', false],
    ]);
  });

  it('armor class formulas do not stack: the highest one wins', () => {
    const sheet = derive(makeCharacter({
      choices: {
        baseAbilities: { str: 10, dex: 14, con: 16, int: 10, wis: 18, cha: 10 },
        levels: [level('barbarian'), level('monk')],
      },
    }));
    // Monk 10 + DEX 2 + WIS 4 = 16 beats Barbarian 10 + DEX 2 + CON 3 = 15.
    expect(sheet.ac).toEqual({ value: 16, source: 'Unarmored Defense', armored: false, shield: false });
  });
});

describe('deriveSheet: edge cases', () => {
  it('works for a freshly created character', () => {
    expect(derive(makeCharacter())).toMatchObject({
      totalLevel: 0,
      proficiencyBonus: 2,
      hp: { current: 0, max: 0, temp: 0 },
      ac: { value: 10, source: 'Unarmored', armored: false, shield: false },
      speed: 30,
      initiative: 0,
      passivePerception: 10,
      features: [],
      attacks: [],
      warnings: [],
    });
  });

  it('keeps calculating when content no longer exists', () => {
    const character = makeCharacter({
      choices: {
        speciesId: 'srd:species:atlantean',
        backgroundId: 'user:background:gone',
        levels: [level('user:class:deleted')],
        bonusFeatIds: ['user:feat:gone'],
        featureOptions: ['user:feature:gone'],
      },
      inventory: [item('x', 'user:weapon:gone')],
    });
    const sheet = derive(character);
    expect(sheet.totalLevel).toBe(0);
    expect(sheet.warnings).toHaveLength(6);
    expect(sheet.warnings).toEqual(
      expect.arrayContaining(
        [
          'user:class:deleted',
          'srd:species:atlantean',
          'user:background:gone',
          'user:feat:gone',
          'user:feature:gone',
          'user:weapon:gone',
        ].map((detail) => ({ code: 'unknown-content', detail })),
      ),
    );
  });

  it('warns about unknown inventory items, equipped or not, but not about items that exist', () => {
    const sheet = derive(makeCharacter({
      inventory: [
        item('a', 'user:item:gone', false),
        item('b', 'srd:gear:backpack', false),
        item('c', 'srd:weapon:longsword', false),
        { id: 'd', customName: 'Lucky coin', qty: 1, equipped: false, attuned: false },
      ],
    }));
    expect(sheet.warnings).toEqual([{ code: 'unknown-content', detail: 'user:item:gone' }]);
  });
});

describe('deriveSheet: spellcasting and resources', () => {
  it('Kael: wizard spellcasting, fighter and wizard resources, scaling cantrip', () => {
    const sheet = derive(kael({ choices: { spells: [{ classId: 'srd:class:wizard', spellId: 'srd:spell:fire-bolt', prepared: true }] } }));
    expect(sheet.spellcasting).toEqual({
      classes: [{ classId: 'srd:class:wizard', name: 'Wizard', ability: 'int', progression: 'full', attack: 5, dc: 13, preparedMax: 5, cantripsMax: 3 }],
      slots: [{ level: 1, max: 3, used: 0 }],
      pact: undefined,
    });
    expect(sheet.resources).toEqual([
      { key: 'second-wind', name: 'Second Wind', max: 2, used: 0, recharge: 'long', shortRestRegain: 1, pool: false },
      { key: 'action-surge', name: 'Action Surge', max: 1, used: 0, recharge: 'short', shortRestRegain: 0, pool: false },
      { key: 'arcane-recovery', name: 'Arcane Recovery', max: 1, used: 0, recharge: 'long', shortRestRegain: 0, pool: false },
    ]);
    expect(sheet.attacks.find((a) => a.kind === 'cantrip')).toEqual({
      id: 'srd:spell:fire-bolt', kind: 'cantrip', name: 'Fire Bolt', toHit: 5, saveDC: undefined, saveAbility: undefined,
      damage: '2d10', damageType: 'Fire', properties: [], proficient: true,
    });
  });

  it('save cantrips use the spell save DC', () => {
    const cleric = derive(makeCharacter({
      choices: { baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 }, levels: levels('cleric', 1), spells: [{ classId: 'srd:class:cleric', spellId: 'srd:spell:sacred-flame', prepared: true }] },
    }));
    expect(cleric.attacks[0]).toMatchObject({ name: 'Sacred Flame', saveDC: 13, saveAbility: 'dex', toHit: undefined, damage: '1d8' });
  });

  it('Paladin 2 / Sorcerer 3: multiclass slots and both casting classes', () => {
    const sheet = derive(makeCharacter({
      choices: {
        baseAbilities: { str: 15, dex: 10, con: 14, int: 8, wis: 12, cha: 13 },
        levels: [...levels('paladin', 2), ...levels('sorcerer', 3)],
      },
    }));
    expect(sheet.spellcasting.slots.map((s) => s.max)).toEqual([4, 3]);
    expect(sheet.spellcasting.classes).toEqual([
      { classId: 'srd:class:paladin', name: 'Paladin', ability: 'cha', progression: 'half', attack: 4, dc: 12, preparedMax: 3, cantripsMax: undefined },
      { classId: 'srd:class:sorcerer', name: 'Sorcerer', ability: 'cha', progression: 'full', attack: 4, dc: 12, preparedMax: 6, cantripsMax: 4 },
    ]);
    expect(sheet.resources.map((r) => [r.key, r.max, r.pool])).toEqual([
      ['lay-on-hands', 10, true],
      ['innate-sorcery', 2, false],
      ['sorcery-points', 3, true],
    ]);
    expect(sheet.hp.max).toBe(38);
    expect(sheet.warnings).toEqual([]);
  });

  it('Warlock 3 / Sorcerer 2: pact magic separate from spell slots', () => {
    const sheet = derive(makeCharacter({
      choices: { baseAbilities: { str: 8, dex: 14, con: 14, int: 10, wis: 10, cha: 16 }, levels: [...levels('warlock', 3), ...levels('sorcerer', 2)] },
    }));
    expect(sheet.spellcasting.slots).toEqual([{ level: 1, max: 3, used: 0 }]);
    expect(sheet.spellcasting.pact).toEqual({ slots: 2, slotLevel: 2, used: 0 });
    expect(sheet.resources.map((r) => [r.key, r.max])).toEqual([
      ['magical-cunning', 1],
      ['innate-sorcery', 2],
      ['sorcery-points', 2],
    ]);
  });

  it('Eldritch Knight 7 (skeleton): third-caster slots and placeholder features', () => {
    const sheet = derive(makeCharacter({
      choices: {
        baseAbilities: { str: 16, dex: 12, con: 14, int: 14, wis: 10, cha: 8 },
        levels: [level('fighter'), level('fighter'), level('fighter', { subclassId: 'skeleton:subclass:eldritch-knight' }), ...levels('fighter', 4)],
      },
    }));
    expect(sheet.spellcasting.slots.map((s) => s.max)).toEqual([4, 2]);
    expect(sheet.spellcasting.classes).toEqual([
      { classId: 'srd:class:fighter', name: 'Fighter', ability: 'int', progression: 'third', attack: 5, dc: 13, preparedMax: undefined, cantripsMax: undefined },
    ]);
    const placeholders = sheet.features.filter((f) => f.placeholder);
    expect(placeholders.map((f) => [f.level, f.origin, f.ownerName])).toEqual([
      [3, 'subclass', 'Eldritch Knight'],
      [7, 'subclass', 'Eldritch Knight'],
    ]);
    expect(sheet.resources.map((r) => [r.key, r.max])).toEqual([
      ['second-wind', 3],
      ['action-surge', 1],
    ]);
    expect(sheet.warnings).toEqual([]);
  });

  it('Font of Inspiration changes Bardic Inspiration to a short rest', () => {
    const bard = derive(makeCharacter({ choices: { baseAbilities: { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 16 }, levels: levels('bard', 5) } }));
    expect(bard.resources.find((r) => r.key === 'bardic-inspiration')).toMatchObject({ max: 3, recharge: 'short' });
  });

  it('Draconic Sorcery adds hit points and its own unarmored AC', () => {
    const sorcerer = derive(makeCharacter({
      choices: {
        baseAbilities: { str: 8, dex: 14, con: 10, int: 10, wis: 10, cha: 16 },
        levels: [level('sorcerer'), level('sorcerer'), level('sorcerer', { subclassId: 'srd:subclass:draconic-sorcery' })],
      },
    }));
    expect(sorcerer.hp.max).toBe(17);
    expect(sorcerer.ac).toMatchObject({ value: 15, source: 'Draconic Resilience' });
  });

  it('warns about unmet multiclass prerequisites for every class', () => {
    const lowInt = derive(makeCharacter({ choices: { baseAbilities: { str: 15, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, levels: [level('fighter'), level('wizard')] } }));
    expect(lowInt.warnings).toEqual([{ code: 'multiclass-prerequisite', detail: 'srd:class:wizard' }]);
    const monk = derive(makeCharacter({ choices: { baseAbilities: { str: 10, dex: 14, con: 10, int: 10, wis: 12, cha: 10 }, levels: [level('monk'), level('fighter')] } }));
    expect(monk.warnings).toEqual([{ code: 'multiclass-prerequisite', detail: 'srd:class:monk' }]);
    const single = derive(makeCharacter({ choices: { levels: levels('wizard', 2) } }));
    expect(single.warnings).toEqual([]);
  });

  it('clamps state that is above the current maximum', () => {
    const sheet = derive(kael({ state: { slotsUsed: { '1': 9 }, resourcesUsed: { 'second-wind': 7 }, hitDiceSpent: { d10: 8 }, hpCurrent: 99 } }));
    expect(sheet.spellcasting.slots[0].used).toBe(3);
    expect(sheet.resources.find((r) => r.key === 'second-wind')!.used).toBe(2);
    expect(sheet.hitDice[0].spent).toBe(3);
    expect(sheet.hp.current).toBe(40);
  });

  it('warns about unknown spells', () => {
    const sheet = derive(kael({ choices: { spells: [{ classId: 'srd:class:wizard', spellId: 'srd:spell:nope', prepared: true }] } }));
    expect(sheet.warnings).toEqual([{ code: 'unknown-content', detail: 'srd:spell:nope' }]);
  });
});
