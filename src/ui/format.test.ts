import { describe, expect, it } from 'vitest';
import { deriveSheet } from '../rules/derive';
import { kael, registry } from '../rules/testing/fixtures';
import { abilityName, classSummary, formatMod, plainParagraphs, titleCase } from './format';

describe('format', () => {
  it('modifiers, ability names and skill names', () => {
    expect([formatMod(3), formatMod(0), formatMod(-1)]).toEqual(['+3', '+0', '-1']);
    expect(abilityName('wis')).toBe('Wisdom');
    expect([titleCase('sleight-of-hand'), titleCase('animal-handling'), titleCase('grappled')]).toEqual(['Sleight of Hand', 'Animal Handling', 'Grappled']);
  });

  it('summarises classes with subclasses', () => {
    expect(classSummary(deriveSheet(kael(), registry))).toBe('Fighter 3 (Champion) / Wizard 2');
  });

  it('turns SRD text with tables and emphasis into plain paragraphs', () => {
    const text = 'Choose one.\n\n_Protector._ Trained for **battle**.\n\n<table>\n  <tbody>\n    <tr>\n      <td>Drow</td>\n      <td>Darkvision</td>\n    </tr>\n    <tr>\n      <td>Wood Elf</td>\n      <td>Speed 35</td>\n    </tr>\n  </tbody>\n</table>';
    expect(plainParagraphs(text)).toEqual(['Choose one.', 'Protector. Trained for battle.', 'Drow · Darkvision\nWood Elf · Speed 35']);
  });
});
