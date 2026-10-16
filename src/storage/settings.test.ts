import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDb } from './db';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings';

const freshDb = () => openDb(`test-${crypto.randomUUID()}`);

describe('settings', () => {
  it('starts with the defaults', async () => {
    expect(await loadSettings(freshDb())).toEqual(DEFAULT_SETTINGS);
  });

  it('saves and loads settings', async () => {
    const db = freshDb();
    const settings = { ...DEFAULT_SETTINGS, language: 'nl' as const, theme: 'dark' as const, lastExportAt: '2026-10-16T12:00:00.000Z' };
    await saveSettings(db, settings);
    expect(await loadSettings(db)).toEqual(settings);
  });

  it('replaces unknown values with defaults and drops unknown keys', async () => {
    const db = freshDb();
    await db.settings.put({ key: 'app', value: { language: 'fr', theme: 'dark', lastExportAt: 'yesterday', extra: true } });
    expect(await loadSettings(db)).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
    await db.settings.put({ key: 'app', value: 5 });
    expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
  });
});
