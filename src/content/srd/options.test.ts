import { describe, expect, it } from 'vitest';
import { convertAll } from '../../../scripts/convert-srd/convert';
import { loadBuiltinContent } from '../load';
import { OPTION_FEATURES, OPTION_GROUP_PARENTS } from './options';

const data = convertAll();
const texts = new Map(data.features.map((f) => [f.id, f.text]));

describe('OPTION_FEATURES', () => {
  it('each option belongs to an SRD feature and quotes its text verbatim', () => {
    for (const option of OPTION_FEATURES) {
      expect(texts.get(option.optionOf ?? ''), option.id).toContain(option.text);
      expect(option.id.startsWith(`${option.optionOf}:`), option.id).toBe(true);
    }
    expect(new Set(OPTION_FEATURES.map((o) => o.id)).size).toBe(OPTION_FEATURES.length);
  });

  it('effect values follow the option text', () => {
    const wood = OPTION_FEATURES.find((o) => o.name === 'Wood Elf')!;
    const elf = data.species.find((s) => s.id === 'srd:species:elf')!;
    const speed = Number(/Your Speed increases to (\d+) feet/.exec(wood.text)![1]);
    expect(wood.effects).toEqual([{ kind: 'bonus', target: 'speed', value: speed - elf.speed }]);
    for (const option of OPTION_FEATURES) {
      for (const effect of option.effects) {
        if (effect.kind === 'bonus' && typeof effect.value === 'object') {
          expect(option.text, option.id).toMatch(/equals your Wisdom modifier \(minimum (?:bonus )?of \+1\)/);
          expect(effect.value).toEqual({ mod: 'wis', min: 1 });
          expect(option.text.toLowerCase()).toContain(effect.target.replace('skill:', ''));
        }
        if (effect.kind === 'proficiency') expect(option.text.toLowerCase(), option.id).toContain(effect.target.split(':')[1]);
      }
    }
  });

  it('option groups point at the class feature that grants them', () => {
    for (const [group, parent] of Object.entries(OPTION_GROUP_PARENTS)) {
      expect(texts.has(parent), parent).toBe(true);
      expect(data.features.some((f) => f.optionGroup === group), group).toBe(true);
    }
    expect(loadBuiltinContent().find((i) => i.id === 'srd:feature:metamagic:careful-spell')).toMatchObject({
      optionOf: 'srd:feature:sorcerer:2:metamagic',
    });
  });
});
