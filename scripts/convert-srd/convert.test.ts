import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convertAll, OUTPUT_SCHEMAS } from './convert';

describe('convertAll', () => {
  const data = convertAll();

  it('produces the expected number of items per file', () => {
    const counts = Object.fromEntries(Object.entries(data).map(([name, items]) => [name, items.length]));
    expect(counts).toMatchObject({
      classes: 12, subclasses: 12, features: 303, species: 9, backgrounds: 4, feats: 17, spells: 339,
      weapons: 38, armor: 13, gear: 81, 'magic-items': 258,
    });
  });

  it('validates every file against its schema', () => {
    for (const [name, items] of Object.entries(data)) {
      const schema = OUTPUT_SCHEMAS[name as keyof typeof OUTPUT_SCHEMAS];
      const parsed = z.array(schema).safeParse(items);
      expect(parsed.success, `${name}: ${parsed.success ? '' : parsed.error.message}`).toBe(true);
    }
  });

  it('has unique ids across all files', () => {
    const ids = Object.values(data).flatMap((items) => items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
