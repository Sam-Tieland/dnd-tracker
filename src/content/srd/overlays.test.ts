import { describe, expect, it } from 'vitest';
import { convertAll } from '../../../scripts/convert-srd/convert';
import { ABILITY_BY_NAME, SKILL_IDS } from '../constants';
import { slugify } from '../ids';
import { ClassMechanicsSchema, EffectSchema, type Formula } from '../schema';
import { CLASS_MECHANICS } from './class-mechanics';
import { EFFECTS } from './effects';

const data = convertAll();
const NAME_OF = Object.fromEntries(Object.entries(ABILITY_BY_NAME).map(([name, ability]) => [ability, name]));

describe('CLASS_MECHANICS', () => {
  it('covers exactly the SRD classes and is valid', () => {
    expect(Object.keys(CLASS_MECHANICS).sort()).toEqual(data.classes.map((c) => c.id).sort());
    for (const mechanics of Object.values(CLASS_MECHANICS)) ClassMechanicsSchema.parse(mechanics);
  });

  describe.each(data.classes.map((c) => [c.name, c] as const))('%s', (_name, cls) => {
    const m = CLASS_MECHANICS[cls.id];
    const traits = cls.coreTraits;

    it('matches primary abilities', () => {
      const text = traits['Primary Ability'];
      expect(m.primaryAbilities.mode).toBe(text.includes(' or ') ? 'any' : 'all');
      expect(m.primaryAbilities.abilities.map((a) => NAME_OF[a]).sort()).toEqual(text.split(/ and | or /).sort());
    });

    it('matches saving throws', () => {
      expect(m.savingThrows.map((a) => NAME_OF[a]).join(' and ')).toBe(traits['Saving Throw Proficiencies']);
    });

    it('matches armor training', () => {
      const text = traits['Armor Training'];
      const expected = [
        ...(/Light/.test(text) ? ['light'] : []),
        ...(/Medium/.test(text) ? ['medium'] : []),
        ...(/Heavy/.test(text) ? ['heavy'] : []),
        ...(/Shields/.test(text) ? ['shield'] : []),
      ];
      expect(m.armorTraining).toEqual(expected);
    });

    it('matches weapon proficiencies', () => {
      const text = traits['Weapon Proficiencies'];
      expect(m.weaponProficiencies.includes('simple')).toBe(text.startsWith('Simple'));
      expect(m.weaponProficiencies.includes('martial')).toBe(text === 'Simple and Martial weapons');
      expect(m.weaponProficiencies.includes('martial-light')).toBe(/Martial weapons that have the Light property/.test(text));
      expect(m.weaponProficiencies.includes('martial-finesse-or-light')).toBe(/Finesse or Light property/.test(text));
    });

    it('matches skill choices', () => {
      const text = traits['Skill Proficiencies'];
      expect(m.skillChoices.count).toBe(Number(/Choose (?:any )?(\d+)/.exec(text)![1]));
      if (text.includes('any')) {
        expect(m.skillChoices.from).toBe('any');
      } else {
        const skills = text.replace(/^Choose \d+: /, '').replace(/,? or /, ', ').split(/,\s*/).map(slugify);
        expect(m.skillChoices.from).toEqual(skills);
        expect(skills.every((s) => (SKILL_IDS as string[]).includes(s))).toBe(true);
      }
    });

    it('matches multiclass gains', () => {
      const text = cls.multiclassText;
      const training = /training with (.+?)\./.exec(text)?.[1] ?? '';
      const expected = [
        ...(/Light/.test(training) ? ['light'] : []),
        ...(/Medium/.test(training) ? ['medium'] : []),
        ...(/Shields/.test(training) ? ['shield'] : []),
      ];
      expect(m.multiclass.armorTraining).toEqual(expected);
      expect(m.multiclass.weaponProficiencies).toEqual(/proficiency with Martial weapons/.test(text) ? ['martial'] : []);
      if (/one skill of your choice from the/.test(text)) expect(m.multiclass.skillChoices).toEqual({ count: 1, from: m.skillChoices.from });
      else if (/one skill of your choice/.test(text)) expect(m.multiclass.skillChoices).toEqual({ count: 1, from: 'any' });
      else expect(m.multiclass.skillChoices).toBeUndefined();
    });

    it('matches spellcasting', () => {
      const texts = data.features.filter((f) => f.id.startsWith(`srd:feature:${slugify(cls.name)}:`)).map((f) => f.text).join('\n');
      const match = /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) is (?:your|the) spellcasting ability for your (\w+) spells/.exec(texts);
      if (!m.spellcasting) {
        expect(match).toBeNull();
        return;
      }
      expect(match?.[2]).toBe(cls.name);
      expect(ABILITY_BY_NAME[match![1]]).toBe(m.spellcasting.ability);
      const expectedProgression = cls.pactSlotsByLevel ? 'pact' : cls.slotsByLevel?.[0].length === 9 ? 'full' : 'half';
      expect(m.spellcasting.progression).toBe(expectedProgression);
    });
  });
});

/** A literal quote from the feature or feat text that justifies each effect. */
const EVIDENCE: Record<string, string> = {
  'srd:feature:barbarian:1:rage': 'You regain one expended use when you finish a Short Rest',
  'srd:feature:barbarian:1:unarmored-defense': 'Dexterity and Constitution modifiers',
  'srd:feature:barbarian:5:fast-movement': 'speed increases by 10 feet while you',
  'srd:feature:barbarian:20:primal-champion': 'Strength and Constitution scores increase by 4, to a maximum of 25',
  'srd:feature:bard:1:bardic-inspiration': 'Charisma modifier (minimum of once)',
  'srd:feature:bard:2:jack-of-all-trades': 'half your Proficiency Bonus (round down)',
  'srd:feature:bard:5:font-of-inspiration': 'when you finish a Short or Long Rest',
  'srd:feature:cleric:2:channel-divinity': 'You regain one of its expended uses when you finish a Short Rest',
  'srd:feature:druid:2:wild-shape': 'You regain one expended use when you finish a Short Rest',
  'srd:feature:fighter:1:second-wind': 'You regain one expended use when you finish a Short Rest',
  'srd:feature:fighter:2:action-surge': 'Starting at level 17, you can use it twice',
  'srd:feature:fighter:9:indomitable': 'three times before a Long Rest starting at level 17',
  'srd:feature:monk:1:unarmored-defense': 'Dexterity and Wisdom modifiers',
  'srd:feature:monk:2:monks-focus': 'Short or Long Rest',
  'srd:feature:monk:2:unarmored-movement': 'wearing armor or wielding a Shield',
  'srd:feature:monk:2:uncanny-metabolism': 'until you finish a Long Rest',
  'srd:feature:monk:20:body-and-mind': 'Dexterity and Wisdom scores increase by 4, to a maximum of 25',
  'srd:feature:paladin:1:lay-on-hands': 'five times your Paladin level',
  'srd:feature:paladin:3:channel-divinity': 'You regain one of its expended uses when you finish a Short Rest',
  'srd:feature:ranger:1:favored-enemy': 'Favored Enemy column',
  'srd:feature:ranger:6:roving': 'Speed increases by 10 feet while you',
  'srd:feature:sorcerer:1:innate-sorcery': 'You can use this feature twice',
  'srd:feature:sorcerer:2:font-of-magic': 'You regain all expended Sorcery Points when you finish a Long Rest',
  'srd:feature:sorcerer:5:sorcerous-restoration': 'until you finish a Long Rest',
  'srd:feature:warlock:2:magical-cunning': 'until you finish a Long Rest',
  'srd:feature:wizard:1:arcane-recovery': 'until you finish a Long Rest',
  'srd:feature:circle-of-the-land:6:natural-recovery': 'you must finish a Long Rest',
  'srd:feature:warrior-of-the-open-hand:6:wholeness-of-body': 'Wisdom modifier (minimum of once)',
  'srd:feature:draconic-sorcery:3:draconic-resilience': 'Hit Point maximum increases by 3',
  'srd:feature:fiend-patron:6:dark-ones-own-luck': 'Charisma modifier (minimum of once)',
  'srd:feature:dragonborn:breath-weapon': 'equal to your Proficiency Bonus',
  'srd:feature:dwarf:dwarven-toughness': 'increases by 1 again whenever you gain a level',
  'srd:feature:dwarf:stonecunning': 'equal to your Proficiency Bonus',
  'srd:feature:goliath:giant-ancestry': 'equal to your Proficiency Bonus',
  'srd:feature:orc:adrenaline-rush': 'Short or Long Rest',
  'srd:feature:orc:relentless-endurance': 'until you finish a Long Rest',
  'srd:feature:human:resourceful': 'Heroic Inspiration whenever you finish a Long Rest',
  'srd:feat:alert': 'add your Proficiency Bonus',
  'srd:feat:defense': '+1 bonus to Armor Class',
  'srd:feature:barbarian:15:persistent-rage': "you can't do so again until you finish a Long Rest",
  'srd:feature:cleric:10:divine-intervention': "You can't use this feature again until you finish a Long Rest",
  'srd:feature:druid:5:wild-resurgence': "give yourself a level 1 spell slot, but you can't do so again until you finish a Long Rest",
  'srd:feature:druid:20:archdruid': "Once you use this benefit, you can't do so again until you finish a Long Rest",
  'srd:feature:oath-of-devotion:20:holy-nimbus': "Once you use this feature, you can't use it again until you finish a Long Rest",
  'srd:feature:ranger:10:tireless': 'Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest',
  'srd:feature:ranger:14:natures-veil': 'Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest',
  'srd:feature:rogue:20:stroke-of-luck': "you can't use it again until you finish a Short or Long Rest",
  'srd:feature:warlock:9:contact-patron': "you can't do so in this way again until you finish a Long Rest",
  'srd:feature:warlock:11:mystic-arcanum': 'Warlock levels 13 (level 7 spell), 15 (level 8 spell), and 17 (level 9 spell)',
  'srd:feature:wizard:20:signature-spells': "you can't cast them in this way again until you finish a Short or Long Rest",
  'srd:feature:draconic-sorcery:14:dragon-wings': "you can't use it again until you finish a Long Rest",
  'srd:feature:fiend-patron:14:hurl-through-hell': "you can't use it again until you finish a Long Rest",
  'srd:feature:dragonborn:draconic-flight': 'When you reach character level 5',
  'srd:feature:elf:elven-lineage': 'When you reach character levels 3 and 5',
  'srd:feature:goliath:large-form': 'Starting at character level 5',
  'srd:feature:tiefling:fiendish-legacy': 'When you reach character levels 3 and 5',
  'srd:feature:bard:18:superior-inspiration': 'you regain expended uses of Bardic Inspiration until you have two',
  'srd:feature:monk:15:perfect-focus': 'you regain expended Focus Points until you have 4',
  'srd:feature:cleric:20:greater-divine-intervention': "you can't use Divine Intervention again until you finish 2d4 Long Rests",
  'srd:feature:eldritch-invocation:agonizing-blast': "You can add your Charisma modifier to that spell's damage rolls",
  'srd:feat:archery': '+2 bonus to attack rolls you make with Ranged weapons',
  'srd:feat:magic-initiate': 'You can cast it once without a spell slot',
};

function columnRefs(formula: Formula): Array<{ classId: string; key: string }> {
  if (typeof formula === 'number') return [];
  if ('column' in formula) return [formula.column];
  if ('sum' in formula) return formula.sum.flatMap(columnRefs);
  return [];
}

describe('EFFECTS', () => {
  const texts = new Map([...data.features, ...data.feats].map((item) => [item.id, item.text]));

  it('only targets existing features and feats, each with evidence in its text', () => {
    expect(Object.keys(EFFECTS).sort()).toEqual(Object.keys(EVIDENCE).sort());
    for (const [id, quote] of Object.entries(EVIDENCE)) {
      expect(texts.has(id), id).toBe(true);
      expect(texts.get(id), id).toContain(quote);
    }
  });

  it('contains only valid effects with existing table columns', () => {
    for (const [id, effects] of Object.entries(EFFECTS)) {
      for (const effect of effects) {
        EffectSchema.parse(effect);
        const formulas = effect.kind === 'resource' ? [effect.max] : effect.kind === 'bonus' ? [effect.value] : [];
        for (const ref of formulas.flatMap(columnRefs)) {
          const cls = data.classes.find((c) => c.id === ref.classId);
          expect(cls?.levels[19].columns[ref.key], `${id} -> ${ref.classId}.${ref.key}`).toBeDefined();
        }
      }
    }
  });

  it('uses each resource key once', () => {
    const keys = Object.values(EFFECTS).flat().flatMap((e) => (e.kind === 'resource' ? [e.key] : []));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('effect values follow the feature text', () => {
    for (const [id, effects] of Object.entries(EFFECTS)) {
      const text = texts.get(id) ?? '';
      for (const effect of effects) {
        const label = `${id} (${effect.kind})`;
        if (effect.kind === 'resource') {
          const regainsOnShortRest = /regain one (?:expended use|of its expended uses) when you finish a Short Rest/.test(text);
          expect(effect.shortRestRegain !== undefined, `${label}: shortRestRegain`).toBe(regainsOnShortRest);
          expect(effect.recharge === 'short', `${label}: recharge`).toBe(/Short or Long Rest/.test(text));
          if (typeof effect.max === 'object' && 'pb' in effect.max) {
            expect(text, `${label}: max uses Proficiency Bonus`).toContain('Proficiency Bonus');
          }
          if (typeof effect.max === 'object' && 'mod' in effect.max) {
            expect(text, `${label}: max uses ability modifier`).toContain(`${NAME_OF[effect.max.mod]} modifier`);
          }
        } else if (effect.kind === 'acFormula') {
          expect(effect.allowShield, `${label}: allowShield`).toBe(!/wielding a Shield/.test(text));
          const names = /plus your (\w+) and (\w+) modifiers/.exec(text)?.slice(1, 3);
          expect(effect.abilities.map((a) => NAME_OF[a]), `${label}: abilities`).toEqual(names);
        } else if (effect.kind === 'bonus' && effect.when !== undefined) {
          const condition = { unarmored: /armor or wielding a Shield/, notHeavyArmor: /Heavy armor/, armored: /wearing Light, Medium, or Heavy armor/ }[effect.when];
          expect(text, `${label}: when ${effect.when}`).toMatch(condition);
        }
      }
    }
  });
});
