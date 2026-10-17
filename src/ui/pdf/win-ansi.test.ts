import { describe, expect, it } from 'vitest';
import { toWinAnsi } from './win-ansi';

describe('toWinAnsi', () => {
  it('replaces characters the PDF font cannot show', () => {
    expect(toWinAnsi('−2 · ✓ Łukasz é ü ß –')).toBe('-2 · ? ?ukasz é ü ß –');
  });

  it('keeps newlines and the Windows-1252 extras, and replaces emoji and control characters', () => {
    expect(toWinAnsi('a\nb € “x” … ™')).toBe('a\nb € “x” … ™');
    expect(toWinAnsi('a\tb\u0001 😀')).toBe('a?b? ?');
  });
});
