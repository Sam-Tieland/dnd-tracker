import { describe, expect, it } from 'vitest';
import { readVendor } from '../../scripts/convert-srd/vendor';
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
    expect(sheet.attacks.filter((a) => a.kind === 'weapon')).toEqual([
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
    const attacks = monk([item('a', 'srd:weapon:shortsword'), item('b', 'srd:weapon:longsword')]).attacks.filter((a) => a.kind === 'weapon');
    expect(attacks.map((a) => [a.name, a.toHit, a.damage, a.proficient])).toEqual([
      ['Shortsword', 6, '1d6+3', true],
      ['Longsword', 0, '1d8', false],
    ]);
  });

  it('Monk: Unarmed Strike uses the Martial Arts die and Dexterity, but not with a shield', () => {
    expect(monk().attacks.find((a) => a.kind === 'unarmed')).toMatchObject({ name: 'Unarmed Strike', toHit: 6, damage: '1d8+3', proficient: true });
    // A wielded shield ends Martial Arts: back to 1 + Strength (+0) and Strength to hit.
    expect(monk([item('s', 'srd:armor:shield')]).attacks.find((a) => a.kind === 'unarmed')).toMatchObject({ toHit: 3, damage: '1' });
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
    expect(rogue.attacks.filter((a) => a.kind === 'weapon').map((a) => [a.name, a.proficient])).toEqual([
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

describe('deriveSheet: level 20 capstones and Roving', () => {
  const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

  it('Barbarian 20: Primal Champion raises Strength and Constitution by 4, to a maximum of 25', () => {
    const sheet = derive(makeCharacter({ choices: { ...human, baseAbilities: { ...abilities, str: 20, con: 20 }, levels: levels('barbarian', 20) } }));
    expect(sheet.abilities.str).toMatchObject({ score: 24, mod: 7, max: 25 });
    expect(sheet.abilities.con).toMatchObject({ score: 24, mod: 7, max: 25 });
    expect(sheet.abilities.dex).toMatchObject({ score: 10, max: 20 });
    expect(sheet.warnings.filter((w) => w.code === 'ability-over-max')).toEqual([]);
  });

  it('Monk 20: Body and Mind raises Dexterity and Wisdom by 4, to a maximum of 25', () => {
    const sheet = derive(makeCharacter({ choices: { ...human, baseAbilities: { ...abilities, dex: 20, wis: 18 }, levels: levels('monk', 20) } }));
    expect(sheet.abilities.dex).toMatchObject({ score: 24, mod: 7, max: 25 });
    expect(sheet.abilities.wis).toMatchObject({ score: 22, mod: 6, max: 25 });
    expect(sheet.abilities.str).toMatchObject({ score: 10, max: 20 });
    expect(sheet.warnings.filter((w) => w.code === 'ability-over-max')).toEqual([]);
  });

  it('Ranger 6: Roving adds 10 feet of Speed unless wearing Heavy armor', () => {
    const ranger = (inventory: ReturnType<typeof item>[] = []) =>
      derive(makeCharacter({ choices: { ...human, baseAbilities: { ...abilities, str: 13 }, levels: levels('ranger', 6) }, inventory }));
    expect(ranger().speed).toBe(40);
    expect(ranger([item('c', 'srd:armor:chain-mail')]).speed).toBe(30);
  });
});

describe('deriveSheet: edge cases', () => {
  it('everyone has an Unarmed Strike: Strength + PB to hit, 1 + Strength damage, overrides and Exhaustion count', () => {
    const sheet = derive(makeCharacter({
      choices: { baseAbilities: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, levels: levels('fighter', 1) },
      state: { exhaustion: 1 },
      overrides: [{ id: 'o1', target: 'damage:unarmed-strike', value: 1, reason: 'Gauntlets' }],
    }));
    expect(sheet.attacks.find((a) => a.kind === 'unarmed')).toEqual({
      id: 'unarmed-strike', kind: 'unarmed', name: 'Unarmed Strike', toHit: 3 + 2 - 2, damage: '5', damageType: 'Bludgeoning',
      properties: ['Grapple/Shove DC 13'], proficient: true,
    });
  });

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
      attacks: [{ id: 'unarmed-strike', kind: 'unarmed', toHit: 2, damage: '1' }],
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
      id: 'srd:spell:fire-bolt@srd:class:wizard', kind: 'cantrip', name: 'Fire Bolt', toHit: 5, saveDC: undefined, saveAbility: undefined,
      damage: '2d10', damageType: 'Fire', properties: [], proficient: true,
    });
  });

  it('save cantrips use the spell save DC', () => {
    const cleric = derive(makeCharacter({
      choices: { baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 }, levels: levels('cleric', 1), spells: [{ classId: 'srd:class:cleric', spellId: 'srd:spell:sacred-flame', prepared: true }] },
    }));
    expect(cleric.attacks.find((a) => a.kind === 'cantrip')).toMatchObject({ name: 'Sacred Flame', saveDC: 13, saveAbility: 'dex', toHit: undefined, damage: '1d8' });
  });

  it.each<[number, string]>([
    [4, '1d10'],
    [10, '2d10'],
    [11, '3d10'],
    [16, '3d10'],
    [17, '4d10'],
  ])('a scaling cantrip (Fire Bolt) at character level %i deals %s', (characterLevel, damage) => {
    const wizard = derive(makeCharacter({
      choices: {
        baseAbilities: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
        levels: levels('wizard', characterLevel),
        spells: [{ classId: 'srd:class:wizard', spellId: 'srd:spell:fire-bolt', prepared: true }],
      },
    }));
    expect(wizard.attacks.find((a) => a.name === 'Fire Bolt')?.damage).toBe(damage);
  });

  it('a cantrip that does not scale in dice (Eldritch Blast) keeps its damage dice at higher levels', () => {
    const warlock = derive(makeCharacter({
      choices: {
        baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 },
        levels: levels('warlock', 5),
        spells: [{ classId: 'srd:class:warlock', spellId: 'srd:spell:eldritch-blast', prepared: true }],
      },
    }));
    expect(warlock.attacks.find((a) => a.name === 'Eldritch Blast')).toMatchObject({ kind: 'cantrip', name: 'Eldritch Blast', damage: '1d10', damageType: 'Force' });
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

  it('a cantrip from a class without spellcasting is listed without to-hit or save DC, and warns', () => {
    const fighter = derive(makeCharacter({
      choices: { levels: levels('fighter', 1), spells: [{ classId: 'srd:class:fighter', spellId: 'srd:spell:fire-bolt', prepared: true }] },
    }));
    const attack = fighter.attacks.find((a) => a.name === 'Fire Bolt');
    expect(attack).toMatchObject({ kind: 'cantrip', name: 'Fire Bolt', damage: '1d10', damageType: 'Fire' });
    expect(attack?.toHit).toBeUndefined();
    expect(attack?.saveDC).toBeUndefined();
    expect(fighter.warnings).toContainEqual({ code: 'cantrip-without-caster', detail: 'srd:spell:fire-bolt' });
  });

  it('a cantrip never borrows the stats of another casting class', () => {
    const sheet = derive(makeCharacter({
      choices: {
        baseAbilities: { str: 15, dex: 10, con: 14, int: 8, wis: 12, cha: 13 },
        levels: [...levels('paladin', 2), ...levels('sorcerer', 3)],
        spells: [
          { classId: 'srd:class:sorcerer', spellId: 'srd:spell:fire-bolt', prepared: true },
          { classId: 'srd:class:wizard', spellId: 'srd:spell:fire-bolt', prepared: true },
        ],
      },
    }));
    const fireBolts = sheet.attacks.filter((a) => a.name === 'Fire Bolt');
    expect(fireBolts.map((a) => a.id)).toEqual(['srd:spell:fire-bolt@srd:class:sorcerer', 'srd:spell:fire-bolt@srd:class:wizard']);
    expect(fireBolts.map((a) => a.toHit)).toEqual([4, undefined]);
    expect(sheet.warnings).toContainEqual({ code: 'cantrip-without-caster', detail: 'srd:spell:fire-bolt' });
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

describe('deriveSheet: feature owners', () => {
  it('gives class and subclass features their owner id', () => {
    const sheet = derive(makeCharacter({
      choices: {
        speciesId: 'srd:species:dwarf',
        backgroundId: 'srd:background:acolyte',
        levels: [level('cleric'), level('cleric'), level('cleric', { subclassId: 'srd:subclass:life-domain' })],
      },
    }));
    const owner = (id: string) => {
      const feature = sheet.features.find((f) => f.id === id);
      expect(feature, id).toBeDefined();
      return feature?.ownerId;
    };
    expect(owner('srd:feature:cleric:2:channel-divinity')).toBe('srd:class:cleric');
    expect(owner('srd:feature:life-domain:3:disciple-of-life')).toBe('srd:subclass:life-domain');
    const trait = sheet.features.find((f) => f.origin === 'species');
    expect(trait?.ownerId).toBe('srd:species:dwarf');
    const feat = sheet.features.find((f) => f.origin === 'feat');
    expect(feat).toBeDefined();
    expect(feat?.ownerId).toBeUndefined();
  });
});

describe('deriveSheet: conditions and armor training', () => {
  it('Grappled, Paralyzed, Petrified, Restrained and Unconscious set Speed to 0', () => {
    for (const condition of ['grappled', 'paralyzed', 'petrified', 'restrained', 'unconscious']) {
      expect(derive(kael({ state: { conditions: [condition] } })).speed, condition).toBe(0);
    }
    expect(derive(kael({ state: { conditions: ['prone', 'poisoned'] } })).speed).toBe(30);
  });

  it('armor without training gives a warning', () => {
    expect(readVendor('equipment.md')).toContain(
      "If you wear Light, Medium, or Heavy armor and lack training with it, you have Disadvantage on any D20 Test that involves Strength or Dexterity, and you can't cast spells.",
    );
    const wizard = derive(makeCharacter({ choices: { levels: levels('wizard', 1) }, inventory: [item('a', 'srd:armor:chain-mail')] }));
    expect(wizard.warnings).toContainEqual({ code: 'armor-untrained', detail: 'srd:armor:chain-mail' });
    expect(derive(kael()).warnings).toEqual([]);
  });
});

describe('deriveSheet: choices that change numbers', () => {
  const cleric = (options: string[], wis = 14) =>
    makeCharacter({ choices: { baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis, cha: 10 }, levels: levels('cleric', 1), featureOptions: options } });

  it('Divine Order Protector: Martial weapons and Heavy armor', () => {
    const sheet = derive(cleric(['srd:feature:cleric:1:divine-order:protector']));
    expect(sheet.weaponProficiencies).toContain('martial');
    expect(sheet.armorTraining).toContain('heavy');
    expect(sheet.features.find((f) => f.origin === 'option')).toMatchObject({ name: 'Protector', ownerName: 'Divine Order' });
  });

  it('Divine Order Thaumaturge: Wisdom modifier, minimum +1, on Arcana and Religion', () => {
    const wise = derive(cleric(['srd:feature:cleric:1:divine-order:thaumaturge'], 14));
    expect([wise.skills.arcana.bonus, wise.skills.religion.bonus, wise.skills.history.bonus]).toEqual([2, 2, 0]);
    expect(derive(cleric(['srd:feature:cleric:1:divine-order:thaumaturge'], 8)).skills.arcana.bonus).toBe(1);
  });

  it('Thaumaturge and Magician know one extra cantrip (3 + 1 for a level 1 Cleric, 2 + 1 for a Druid)', () => {
    expect(derive(cleric(['srd:feature:cleric:1:divine-order:thaumaturge'])).spellcasting.classes[0].cantripsMax).toBe(4);
    expect(derive(cleric(['srd:feature:cleric:1:divine-order:protector'])).spellcasting.classes[0].cantripsMax).toBe(3);
    const druid = derive(makeCharacter({ choices: { levels: levels('druid', 1), featureOptions: ['srd:feature:druid:1:primal-order:magician'] } }));
    expect(druid.spellcasting.classes[0].cantripsMax).toBe(3);
  });

  it('Primal Order Warden and Magician', () => {
    const base = { baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 12, cha: 10 }, levels: levels('druid', 1) };
    const warden = derive(makeCharacter({ choices: { ...base, featureOptions: ['srd:feature:druid:1:primal-order:warden'] } }));
    expect(warden.armorTraining).toContain('medium');
    expect(warden.weaponProficiencies).toContain('martial');
    const magician = derive(makeCharacter({ choices: { ...base, featureOptions: ['srd:feature:druid:1:primal-order:magician'] } }));
    expect(magician.skills.nature.bonus).toBe(1);
  });

  it('Wood Elf: Speed 35', () => {
    const elf = (options: string[]) => derive(makeCharacter({ choices: { speciesId: 'srd:species:elf', featureOptions: options } }));
    expect(elf([]).speed).toBe(30);
    expect(elf(['srd:feature:elf:elven-lineage:wood-elf']).speed).toBe(35);
  });

  it('an option only counts while its parent feature is active', () => {
    const wizard = derive(makeCharacter({
      choices: { levels: levels('wizard', 1), featureOptions: ['srd:feature:cleric:1:divine-order:protector', 'srd:feature:metamagic:careful-spell'] },
    }));
    expect(wizard.weaponProficiencies).not.toContain('martial');
    expect(wizard.features.some((f) => f.origin === 'option')).toBe(false);
    expect(wizard.warnings).toEqual([]);
  });

  it('Magic Initiate: a cantrip uses the ability chosen for the feat, without a casting class', () => {
    const fighter = derive(makeCharacter({
      choices: {
        baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 },
        levels: levels('fighter', 1),
        spells: [{ classId: 'srd:class:cleric', spellId: 'srd:spell:sacred-flame', prepared: true, ability: 'wis' }],
      },
    }));
    expect(fighter.attacks.find((a) => a.kind === 'cantrip')).toMatchObject({ id: 'srd:spell:sacred-flame@srd:class:cleric', saveDC: 13, saveAbility: 'dex' });
    expect(fighter.warnings).toEqual([]);
  });
});

describe('deriveSheet: values for the screens', () => {
  it('class table values at the current level in each class', () => {
    const sheet = derive(makeCharacter({ choices: { levels: [...levels('barbarian', 5), ...levels('rogue', 3)] } }));
    expect(sheet.classLevels.map((cl) => [cl.name, cl.columns['rage-damage'] ?? cl.columns['sneak-attack']])).toEqual([
      ['Barbarian', '+2'],
      ['Rogue', '2d6'],
    ]);
  });

  it('lists every bonus with its source, overrides included, and leaves out bonuses that do not apply', () => {
    const sheet = derive(kael({ overrides: [{ id: 'o1', target: 'ac', value: 1, reason: 'Ring of Protection' }] }));
    expect(sheet.bonusParts.filter((p) => p.target === 'ac')).toEqual([
      { target: 'ac', source: 'Defense', value: 1, override: false },
      { target: 'ac', source: 'Ring of Protection', value: 1, override: true },
    ]);
    expect(sheet.ac.value).toBe(20);
    expect(derive(kael({ inventory: [] })).bonusParts.some((p) => p.source === 'Defense')).toBe(false);
  });
});

describe('deriveSheet: limited uses and narrow bonuses', () => {
  const resource = (sheet: ReturnType<typeof derive>, key: string) => sheet.resources.find((r) => r.key === key);

  it('Archery adds +2 to Ranged weapons only', () => {
    const archer = (featId?: string) =>
      derive(makeCharacter({
        choices: { levels: [level('fighter', { featId })] },
        inventory: [item('bow', 'srd:weapon:longbow'), item('knife', 'srd:weapon:dagger')],
      }));
    const plain = archer();
    const trained = archer('srd:feat:archery');
    const toHit = (sheet: ReturnType<typeof derive>, id: string) => sheet.attacks.find((a) => a.id === id)?.toHit ?? NaN;
    expect(toHit(trained, 'bow') - toHit(plain, 'bow')).toBe(2);
    expect(toHit(trained, 'knife')).toBe(toHit(plain, 'knife'));
  });

  it('species traits that start at a character level count from that level', () => {
    const elf = (count: number) => derive(makeCharacter({ choices: { speciesId: 'srd:species:elf', levels: levels('wizard', count) } }));
    expect(resource(elf(2), 'elven-lineage-3')).toBeUndefined();
    expect(resource(elf(3), 'elven-lineage-3')?.max).toBe(1);
    expect(resource(elf(4), 'elven-lineage-5')).toBeUndefined();
    expect(resource(elf(5), 'elven-lineage-5')?.max).toBe(1);
    const goliath = (count: number) => derive(makeCharacter({ choices: { speciesId: 'srd:species:goliath', levels: levels('fighter', count) } }));
    expect(resource(goliath(4), 'large-form')).toBeUndefined();
    expect(resource(goliath(5), 'large-form')).toMatchObject({ max: 1, recharge: 'long' });
  });

  it('class features get their uses: Mystic Arcanum grows, Stroke of Luck comes back on a Short Rest', () => {
    expect(resource(derive(makeCharacter({ choices: { levels: levels('warlock', 13) } })), 'mystic-arcanum')?.max).toBe(2);
    expect(resource(derive(makeCharacter({ choices: { levels: levels('warlock', 17) } })), 'mystic-arcanum')?.max).toBe(4);
    expect(resource(derive(makeCharacter({ choices: { levels: levels('rogue', 20) } })), 'stroke-of-luck')).toMatchObject({ max: 1, recharge: 'short' });
    expect(resource(derive(makeCharacter({ choices: { levels: levels('cleric', 10) } })), 'divine-intervention')?.max).toBe(1);
    const ranger = derive(makeCharacter({ choices: { baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 }, levels: levels('ranger', 14) } }));
    expect([resource(ranger, 'tireless')?.max, resource(ranger, 'natures-veil')?.max]).toEqual([3, 3]);
  });
});

describe('deriveSheet: lineages, beams and refills', () => {
  const resource = (sheet: ReturnType<typeof derive>, key: string) => sheet.resources.find((r) => r.key === key);

  it('Forest Gnome casts Speak with Animals Proficiency Bonus times; Rock Gnome has no uses', () => {
    const gnome = (option: string) =>
      derive(makeCharacter({ choices: { speciesId: 'srd:species:gnome', levels: levels('wizard', 5), featureOptions: [`srd:feature:gnome:gnomish-lineage:${option}`] } }));
    expect(resource(gnome('forest-gnome'), 'speak-with-animals')).toMatchObject({ max: 3, recharge: 'long' });
    expect(resource(gnome('rock-gnome'), 'speak-with-animals')).toBeUndefined();
  });

  it('Greater Divine Intervention is tracked by hand', () => {
    expect(resource(derive(makeCharacter({ choices: { levels: levels('cleric', 20) } })), 'greater-divine-intervention')).toMatchObject({ max: 1, recharge: 'manual' });
  });

  it('Eldritch Blast gets beams instead of more dice, and Agonizing Blast adds Charisma', () => {
    const warlock = (count: number, featureOptions: string[] = []) =>
      derive(makeCharacter({
        choices: {
          baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 },
          levels: levels('warlock', count),
          featureOptions,
          spells: [{ classId: 'srd:class:warlock', spellId: 'srd:spell:eldritch-blast', prepared: true }],
        },
      })).attacks.find((a) => a.name === 'Eldritch Blast');
    expect(warlock(4)?.beams).toBeUndefined();
    expect(warlock(5)).toMatchObject({ damage: '1d10', beams: 2 });
    expect(warlock(17)?.beams).toBe(4);
    expect(warlock(5, ['srd:feature:eldritch-invocation:agonizing-blast'])?.damage).toBe('1d10+3');
  });
});
