import { describe, expect, it } from 'vitest';
import { parseColumnNumber } from './formula';
import { getClassLevels, proficiencyBonus } from './levels';
import { kael, level, makeCharacter, registry } from './testing/fixtures';
import type { Warning } from './types';

describe('proficiencyBonus', () => {
  it.each([[0, 2], [1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4], [13, 5], [16, 5], [17, 6], [20, 6]])(
    'level %i -> +%i',
    (totalLevel, bonus) => expect(proficiencyBonus(totalLevel)).toBe(bonus),
  );

  it('matches the Proficiency Bonus column of every SRD class table', () => {
    for (const cls of registry.list('class')) {
      for (const row of cls.levels) {
        expect(proficiencyBonus(row.level), `${cls.name} ${row.level}`).toBe(parseColumnNumber(row.columns['proficiency-bonus']));
      }
    }
  });
});

describe('getClassLevels', () => {
  it('groups levels by class in the order they were taken', () => {
    const warnings: Warning[] = [];
    expect(getClassLevels(kael(), registry, warnings)).toEqual([
      { classId: 'srd:class:fighter', name: 'Fighter', level: 3, hitDie: 10, subclassId: 'srd:subclass:champion', subclassName: 'Champion' },
      { classId: 'srd:class:wizard', name: 'Wizard', level: 2, hitDie: 6 },
    ]);
    expect(warnings).toEqual([]);
  });

  it('merges non-adjacent levels of the same class and keeps first-taken order', () => {
    const warnings: Warning[] = [];
    const character = makeCharacter({ choices: { levels: [level('wizard'), level('fighter'), level('fighter'), level('wizard')] } });
    expect(getClassLevels(character, registry, warnings)).toEqual([
      { classId: 'srd:class:wizard', name: 'Wizard', level: 2, hitDie: 6 },
      { classId: 'srd:class:fighter', name: 'Fighter', level: 2, hitDie: 10 },
    ]);
    expect(warnings).toEqual([]);
  });

  it('skips unknown classes and subclasses with a single warning each', () => {
    const warnings: Warning[] = [];
    const character = makeCharacter({
      choices: { levels: [level('user:class:deleted'), level('user:class:deleted'), level('fighter', { subclassId: 'user:subclass:gone' })] },
    });
    expect(getClassLevels(character, registry, warnings)).toEqual([{ classId: 'srd:class:fighter', name: 'Fighter', level: 1, hitDie: 10 }]);
    expect(warnings).toEqual([
      { code: 'unknown-content', detail: 'user:class:deleted' },
      { code: 'unknown-content', detail: 'user:subclass:gone' },
    ]);
  });
});
