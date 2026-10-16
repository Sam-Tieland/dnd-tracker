import { describe, expect, it } from 'vitest';
import { isExclusive, optionsFor, toggleOption } from './choices';
import { makeCharacter, registry } from './testing/fixtures';

const DIVINE_ORDER = 'srd:feature:cleric:1:divine-order';
const PROTECTOR = `${DIVINE_ORDER}:protector`;
const THAUMATURGE = `${DIVINE_ORDER}:thaumaturge`;
const CAREFUL = 'srd:feature:metamagic:careful-spell';
const DISTANT = 'srd:feature:metamagic:distant-spell';

describe('feature options', () => {
  it('lists the options of a parent feature', () => {
    expect(optionsFor(registry, DIVINE_ORDER).map((o) => o.name)).toEqual(['Protector', 'Thaumaturge']);
    expect(optionsFor(registry, 'srd:feature:sorcerer:2:metamagic').length).toBeGreaterThan(1);
  });

  it('Divine Order allows one option, Metamagic several', () => {
    expect(isExclusive(optionsFor(registry, DIVINE_ORDER))).toBe(true);
    expect(isExclusive(optionsFor(registry, 'srd:feature:sorcerer:2:metamagic'))).toBe(false);
  });

  it('choosing an exclusive option replaces its sibling; turning an option off removes it', () => {
    const protector = toggleOption(makeCharacter(), registry, PROTECTOR, true);
    expect(toggleOption(protector, registry, THAUMATURGE, true).choices.featureOptions).toEqual([THAUMATURGE]);
    const meta = toggleOption(toggleOption(makeCharacter(), registry, CAREFUL, true), registry, DISTANT, true);
    expect(meta.choices.featureOptions).toEqual([CAREFUL, DISTANT]);
    expect(toggleOption(meta, registry, CAREFUL, false).choices.featureOptions).toEqual([DISTANT]);
  });
});
