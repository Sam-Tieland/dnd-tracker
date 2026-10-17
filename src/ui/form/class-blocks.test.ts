import { describe, expect, it } from 'vitest';
import { level, levels, makeCharacter, registry } from '../../rules/testing/fixtures';
import { removeLastClassLevel } from './form-logic';
import { classBlocks, grantsFeat, isSubclassSlot } from './class-blocks';

const FIGHTER = 'srd:class:fighter';
const WIZARD = 'srd:class:wizard';
const CHAMPION = 'srd:subclass:champion';

describe('classBlocks', () => {
  it('groups interleaved levels per class in order of first appearance', () => {
    const c = makeCharacter({ choices: { levels: [level('fighter'), level('wizard'), level('fighter')] } });
    const blocks = classBlocks(c, registry);
    expect(blocks.map((b) => b.classId)).toEqual([FIGHTER, WIZARD]);
    expect(blocks[0].rows.map((r) => [r.index, r.classLevel, r.characterLevel])).toEqual([[0, 1, 1], [2, 2, 3]]);
  });

  it('marks feat levels per class level', () => {
    const fighter = classBlocks(makeCharacter({ choices: { levels: levels('fighter', 6) } }), registry)[0];
    expect(fighter.rows.map((r) => r.grantsFeat)).toEqual([true, false, false, true, false, true]);
    const cleric = classBlocks(makeCharacter({ choices: { levels: levels('cleric', 4) } }), registry)[0];
    expect(cleric.rows.map((r) => r.grantsFeat)).toEqual([true, false, false, true]);
    const multi = classBlocks(makeCharacter({ choices: { levels: [level('fighter'), level('wizard')] } }), registry);
    expect(multi[1].rows[0].grantsFeat).toBe(false);
  });

  it('adds subclass features only from their own level', () => {
    const c = makeCharacter({ choices: { levels: [level('fighter', { subclassId: CHAMPION }), level('fighter'), level('fighter'), level('fighter')] } });
    const block = classBlocks(c, registry)[0];
    expect(block.subclassId).toBe(CHAMPION);
    expect(block.subclassLevel).toBe(3);
    expect(block.rows[2].featureIds).toContain('srd:feature:champion:3:improved-critical');
    for (const i of [0, 1]) expect(block.rows[i].featureIds.some((id) => id.includes(':champion:'))).toBe(false);
    const seven = classBlocks(makeCharacter({ choices: { levels: levels('fighter', 7).map((l, i) => (i === 0 ? { ...l, subclassId: CHAMPION } : l)) } }), registry)[0];
    expect(seven.rows[6].grantsFeat).toBe(true);
  });

  it('lists option parents on the level they arrive', () => {
    const block = classBlocks(makeCharacter({ choices: { levels: levels('cleric', 2) } }), registry)[0];
    expect(block.rows[0].optionParentIds).toContain('srd:feature:cleric:1:divine-order');
    expect(block.rows[1].optionParentIds).not.toContain('srd:feature:cleric:1:divine-order');
  });

  it('falls back to the id for an unknown class', () => {
    const block = classBlocks(makeCharacter({ choices: { levels: [level('srd:class:gone')] } }), registry)[0];
    expect(block.name).toBe('srd:class:gone');
    expect(block.rows[0].featureIds).toEqual([]);
  });
});

describe('feature id helpers', () => {
  it('recognises subclass slots', () => {
    expect(isSubclassSlot('srd:feature:cleric:3:cleric-subclass')).toBe(true);
    expect(isSubclassSlot('srd:feature:cleric:1:divine-order')).toBe(false);
  });
  it('recognises feat features', () => {
    expect(grantsFeat('srd:feature:fighter:4:ability-score-improvement')).toBe(true);
    expect(grantsFeat('srd:feature:fighter:2:action-surge')).toBe(false);
  });
});

describe('subclass resolution', () => {
  it('moves the effective subclass to the highest remaining level on removal', () => {
    const c = makeCharacter({ choices: { levels: [level('fighter'), level('fighter', { subclassId: 'srd:subclass:battle-master' }), level('fighter', { subclassId: CHAMPION })] } });
    const next = removeLastClassLevel(c, FIGHTER);
    expect(next.choices.levels[1].subclassId).toBe(CHAMPION);
    expect(classBlocks(next, registry)[0].subclassId).toBe(CHAMPION);
  });

  it('ignores an unknown subclass id like the sheet does', () => {
    const c = makeCharacter({ choices: { levels: [level('fighter'), level('fighter'), level('fighter', { subclassId: CHAMPION }), level('fighter', { subclassId: 'srd:subclass:gone' })] } });
    expect(classBlocks(c, registry)[0].subclassId).toBe(CHAMPION);
  });
});
