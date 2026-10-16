import { describe, expect, it } from 'vitest';
import { loadBuiltinContent } from '../content/load';
import { createRegistry } from '../content/registry';
import type { ContentItem, SpellDef } from '../content/schema';
import { kael } from '../rules/testing/fixtures';
import { buildBackup, buildCharacterExport, exportFileName, ImportError, parseExportFile, serializeExport } from './export';

const NOW = '2026-10-16T12:00:00.000Z';
const spell: SpellDef = {
  id: 'user:spell:frost-whip', type: 'spell', source: 'user', name: 'Frost Whip', level: 0, school: 'Evocation',
  classes: ['srd:class:wizard'], castingTime: 'Action', ritual: false, range: '30 feet', components: 'V, S',
  duration: 'Instantaneous', concentration: false, text: 'A whip of frost.',
};
const userItems: ContentItem[] = [spell, { ...spell, id: 'user:spell:unused', name: 'Unused' }];
const registry = createRegistry(loadBuiltinContent(), userItems);
const character = kael({ choices: { spells: [{ classId: 'srd:class:wizard', spellId: spell.id, prepared: true }] } });

const codeOf = (text: string): string => {
  try {
    parseExportFile(text);
    return 'ok';
  } catch (error) {
    return error instanceof ImportError ? error.code : 'other';
  }
};

describe('export', () => {
  it('export, then import, gives an identical character with the own content it uses (spec §16)', () => {
    const file = buildCharacterExport(character, registry, userItems, NOW);
    expect(parseExportFile(serializeExport(file))).toEqual({ kind: 'character', exportedAt: NOW, characters: [character], customContent: [spell] });
  });

  it('a backup holds every character and all own content', () => {
    const file = buildBackup([character, { ...character, id: 'second' }], userItems, NOW);
    const parsed = parseExportFile(serializeExport(file));
    expect(parsed.characters.map((c) => c.id)).toEqual(['test', 'second']);
    expect(parsed.customContent).toEqual(userItems);
  });

  it('names files after the character and the date', () => {
    expect(exportFileName(buildCharacterExport({ ...character, name: 'Kael Stormborn' }, registry, [], NOW))).toBe('kael-stormborn-2026-10-16.json');
    expect(exportFileName(buildCharacterExport({ ...character, name: '' }, registry, [], NOW))).toBe('character-2026-10-16.json');
    expect(exportFileName(buildBackup([], [], NOW))).toBe('dnd-tracker-backup-2026-10-16.json');
  });

  it('rejects anything that is not a valid export, as a whole', () => {
    const good = JSON.parse(serializeExport(buildCharacterExport(character, registry, userItems, NOW)));
    const first = good.characters[0];
    expect(codeOf('not json')).toBe('not-json');
    expect(codeOf(JSON.stringify({ hello: 'world' }))).toBe('wrong-format');
    expect(codeOf(JSON.stringify({ ...good, version: 2 }))).toBe('newer-version');
    expect(codeOf(JSON.stringify({ ...good, characters: [{ ...first, schemaVersion: 99 }] }))).toBe('newer-version');
    expect(codeOf(JSON.stringify({ ...good, characters: [{ ...first, state: { ...first.state, exhaustion: 9 } }] }))).toBe('invalid-character');
    expect(codeOf(JSON.stringify({ ...good, customContent: [{ ...spell, source: 'srd' }] }))).toBe('invalid-content');
  });
});
