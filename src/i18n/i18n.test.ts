import { describe, expect, it } from 'vitest';
import en from './en.json';
import { detectLanguage, translate } from './i18n';
import nl from './nl.json';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n', () => {
  it('Dutch and English have the same keys and the same placeholders', () => {
    expect(Object.keys(nl).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) expect(placeholders(nl[key]), key).toEqual(placeholders(en[key]));
  });

  it('uses Dutch only when the device prefers Dutch', () => {
    expect(detectLanguage(['nl-NL', 'en'])).toBe('nl');
    expect(detectLanguage(['nl'])).toBe('nl');
    expect(detectLanguage(['en-US', 'nl-NL'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });

  it('fills in placeholders and leaves unknown ones visible', () => {
    expect(translate('en', 'export.failed', { reason: 'disk full' })).toBe('Export failed: disk full');
    expect(translate('nl', 'export.failed')).toBe('Exporteren mislukt: {reason}');
  });
});
