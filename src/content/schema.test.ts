import { describe, expect, it } from 'vitest';
import { BonusTargetSchema, ContentItemSchema, EffectSchema, FormulaSchema } from './schema';

describe('FormulaSchema', () => {
  it('accepts every formula shape, nested', () => {
    const formula = {
      sum: [2, { pb: true }, { mod: 'cha', min: 1 }, { level: 'total' }, { level: 'srd:class:paladin', times: 5 },
        { column: { classId: 'srd:class:barbarian', key: 'rages' } },
        { atLevel: { classId: 'srd:class:fighter', values: [[2, 1], [17, 2]] } }],
    };
    expect(FormulaSchema.parse(formula)).toEqual(formula);
  });

  it('rejects unknown keys', () => {
    expect(FormulaSchema.safeParse({ pb: true, extra: 1 }).success).toBe(false);
  });
});

describe('BonusTargetSchema', () => {
  it.each(['ac', 'hpMax', 'skill:sleight-of-hand', 'save:dex', 'ability:str', 'abilityMax:con', 'attack', 'damage:item-1'])(
    'accepts %s',
    (target) => expect(BonusTargetSchema.safeParse(target).success).toBe(true),
  );
  it.each(['ac:foo', 'save:xyz', 'ability', 'Skill:Stealth'])('rejects %s', (target) =>
    expect(BonusTargetSchema.safeParse(target).success).toBe(false),
  );
});

describe('EffectSchema', () => {
  it('accepts a resource with a column formula', () => {
    const rage = { kind: 'resource', key: 'rage', name: 'Rage', recharge: 'long', shortRestRegain: 1,
      max: { column: { classId: 'srd:class:barbarian', key: 'rages' } } };
    expect(EffectSchema.parse(rage)).toEqual(rage);
  });

  it('rejects an unknown kind', () => {
    expect(EffectSchema.safeParse({ kind: 'teleport' }).success).toBe(false);
  });
});

describe('ContentItemSchema', () => {
  const feature = { id: 'srd:feature:x:1:y', type: 'feature', source: 'srd', name: 'Y', text: 'text', effects: [] };

  it('accepts a minimal feature', () => {
    expect(ContentItemSchema.parse(feature)).toEqual(feature);
  });

  it('rejects extra keys and missing fields', () => {
    expect(ContentItemSchema.safeParse({ ...feature, extra: 1 }).success).toBe(false);
    expect(ContentItemSchema.safeParse({ id: 'x', type: 'spell', source: 'srd', name: 'X' }).success).toBe(false);
  });
});
