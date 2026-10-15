import { describe, expect, it } from 'vitest';
import { field, requireField, requireSection, splitSections, toInt, withoutFields } from './markdown';

const sample = ['intro', '## A', 'a body', '### A1', 'a1 body', '## B', 'b body'].join('\n');

describe('splitSections', () => {
  it('splits at the given depth only', () => {
    const parts = splitSections(sample, 2);
    expect(parts.map((p) => p.title)).toEqual(['', 'A', 'B']);
    expect(parts[1].body).toBe('a body\n### A1\na1 body');
  });

  it('handles CRLF line endings', () => {
    expect(splitSections('## X\r\nbody\r\n', 2)[1]).toEqual({ title: 'X', body: 'body' });
  });
});

describe('requireSection', () => {
  const parts = splitSections(sample, 2);

  it('finds by exact title or regex', () => {
    expect(requireSection(parts, 'B', 'test').body).toBe('b body');
    expect(requireSection(parts, /^A$/, 'test').title).toBe('A');
  });

  it('throws with context when missing', () => {
    expect(() => requireSection(parts, 'C', 'test')).toThrow('test: section "C" not found');
  });
});

describe('fields', () => {
  const md = '**Casting Time:** Action or Ritual\n**Range:** 150 feet\ntext';

  it('reads a label value', () => {
    expect(field(md, 'Range')).toBe('150 feet');
    expect(field(md, 'Duration')).toBeUndefined();
  });

  it('requireField throws when missing', () => {
    expect(() => requireField(md, 'Duration', 'Fireball')).toThrow('Fireball: field "Duration" not found');
  });

  it('withoutFields removes the label lines', () => {
    expect(withoutFields(md, ['Casting Time', 'Range'])).toBe('text');
  });
});

describe('toInt', () => {
  it.each([
    ['+2', 2],
    ['—', 0],
    ['30 feet', 30],
    ['-1', -1],
    ['\u22124', -4],
    [undefined, 0],
  ])('%s -> %s', (input, expected) => {
    expect(toInt(input)).toBe(expected);
  });
});
