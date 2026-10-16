import { describe, expect, it } from 'vitest';
import { translate, type Lang } from '../i18n/i18n';
import { registry } from '../rules/testing/fixtures';
import { WARNING_CODES } from '../rules/types';
import { warningText } from './warnings';

describe('warningText', () => {
  it.each<Lang>(['en', 'nl'])('has a message with the name for every warning code (%s)', (lang) => {
    const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate(lang, key, params);
    for (const code of WARNING_CODES) {
      const text = warningText({ code, detail: 'srd:class:fighter' }, t, registry);
      expect(text, code).toContain('Fighter');
      expect(text, code).not.toContain('{');
    }
  });

  it('shows an unknown id as it is, and an ability by its name', () => {
    const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate('nl', key, params);
    expect(warningText({ code: 'unknown-content', detail: 'user:feat:gone' }, t, registry)).toBe('Onbekend: user:feat:gone');
    expect(warningText({ code: 'ability-over-max', detail: 'str' }, t, registry)).toContain('Strength');
  });
});
