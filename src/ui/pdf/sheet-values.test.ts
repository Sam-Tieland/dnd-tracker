import { describe, expect, it } from 'vitest';
import { createCharacter } from '../../model/character';
import { kael, makeCharacter, registry } from '../../rules/testing/fixtures';
import { SPELL_LINES } from './sheet-fields';
import { sheetValues } from './sheet-values';

describe('sheetValues', () => {
  it('fills the header and abilities', () => {
    const { text } = sheetValues(kael(), registry);
    expect(text['ClassLevel']).toContain('Fighter 3');
    expect(text['Background']).toBe('Soldier');
    expect(text['Race ']).toBe('Human');
    expect(text['STR']).toBe('17');
    expect(text['STRmod']).toMatch(/^\+/);
    expect(text['ProfBonus']).toBe('+3');
    expect(text['Speed']).toBe('30 ft.');
    expect(text['HDTotal']).toBe('3d10 + 2d6');
    expect(text['HD']).toBe('3d10 + 2d6');
    expect(text['HPTemp']).toBe('');
    expect(Object.values(text).join('')).not.toContain('−');
  });

  it('checks proficient saves and skills', () => {
    const { checks } = sheetValues(kael(), registry);
    expect(checks).toContain('Check Box 11');
    expect(checks).toContain('Check Box 19');
    expect(checks).not.toContain('Check Box 18');
    expect(checks).toContain('Check Box 34'); // Perception
    expect(checks).toContain('Check Box 28'); // History
  });

  it('fills death saves', () => {
    const { checks } = sheetValues(kael({ state: { deathSaves: { successes: 0, failures: 2 } } }), registry);
    expect(checks).toContain('Check Box 15');
    expect(checks).toContain('Check Box 16');
    expect(checks).not.toContain('Check Box 17');
    expect(checks).not.toContain('Check Box 12');
  });

  it('puts the first three attacks in the weapon rows and the rest in the attacks text', () => {
    const inventory = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, itemId: 'srd:weapon:dagger', qty: 1, equipped: true, attuned: false }));
    const { text } = sheetValues(kael({ inventory }), registry);
    expect(text['Wpn Name']).toBe('Dagger');
    expect(text['Wpn1 AtkBonus']).toMatch(/^[+-]\d+$/);
    expect(text['Wpn1 Damage']).toContain('1d4');
    expect(text['Wpn Name 3']).toBe('Dagger');
    expect(text['AttacksSpellcasting'].split('\n').filter((l) => l.startsWith('Dagger')).length).toBe(2);
    expect(text['AttacksSpellcasting']).toContain('Spell save DC');
  });

  it('puts extra attacks in the attacks text', () => {
    const inventory = Array.from({ length: 10 }, (_, i) => ({ id: `w${i}`, itemId: 'srd:weapon:dagger', qty: 1, equipped: true, attuned: false }));
    const { text } = sheetValues(kael({ inventory }), registry);
    expect(text['AttacksSpellcasting'].split('\n').filter((l) => l.startsWith('Dagger')).length).toBe(7);
  });

  it('caps spell lines per level', () => {
    const level1 = registry.list('spell').filter((s) => s.level === 1).slice(0, 13);
    expect(level1.length).toBe(13);
    const spells = level1.map((s) => ({ classId: 'srd:class:wizard', spellId: s.id, prepared: true }));
    const { text, checks } = sheetValues(kael({ choices: { spells } }), registry);
    const filled = SPELL_LINES['1'].filter((line) => text[line.name]);
    expect(filled.length).toBe(12);
    expect(checks).toContain(SPELL_LINES['1'][0].prepared);
  });

  it('fills slots and prepared checks', () => {
    const wizardSpell = registry.list('spell').find((s) => s.level === 1);
    if (!wizardSpell) throw new Error('no level 1 spell');
    const character = kael({
      state: { slotsUsed: { '1': 1 } },
      choices: {
        spells: [
          { classId: 'srd:class:wizard', spellId: wizardSpell.id, prepared: true },
          { classId: 'srd:class:wizard', spellId: registry.list('spell').filter((s) => s.level === 1)[1].id, prepared: false },
        ],
      },
    });
    const { text, checks } = sheetValues(character, registry);
    expect(text['SlotsTotal 19']).toBe('3');
    expect(text['SlotsRemaining 19']).toBe('2');
    expect(text['SlotsTotal 20']).toBe('');
    expect(text[SPELL_LINES['1'][0].name]).toBe(wizardSpell.name);
    expect(checks).toContain(SPELL_LINES['1'][0].prepared);
    expect(checks).not.toContain(SPELL_LINES['1'][1].prepared);
    expect(text['Spellcasting Class 2']).toBe('Wizard');
    expect(text['SpellcastingAbility 2']).toBe('INT');
  });

  it('writes only WinAnsi text', () => {
    const { text } = sheetValues(kael({}), registry);
    expect(text['CharacterName']).toBe('Test');
    const named = { ...kael(), name: 'Łukasz', details: { backstory: 'Een ✓ verhaal' } };
    const values = sheetValues(named, registry).text;
    expect(values['CharacterName']).toBe('?ukasz');
    expect(values['CharacterName 2']).toBe('?ukasz');
    expect(values['Backstory']).toBe('Een ? verhaal');
  });

  it('handles an empty character', () => {
    const { text, checks } = sheetValues(createCharacter({ name: 'Nobody' }), registry);
    expect(text['CharacterName']).toBe('Nobody');
    expect(checks).toEqual([]);
    expect(makeCharacter().name).toBe('Test');
  });
});
