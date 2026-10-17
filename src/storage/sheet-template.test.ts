import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildBackup } from './export';
import { openDb } from './db';
import { deleteSheetTemplate, loadSheetTemplate, saveSheetTemplate } from './sheet-template';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings';

const db = () => openDb(`test-${crypto.randomUUID()}`);
const template = { name: 'sheet.pdf', bytes: new Uint8Array([1, 2, 3]), savedAt: '2026-10-17T10:00:00.000Z' };

describe('sheet template storage', () => {
  it('saves and loads the template', async () => {
    const d = db();
    expect(await loadSheetTemplate(d)).toBeUndefined();
    await saveSheetTemplate(d, template);
    expect(await loadSheetTemplate(d)).toEqual(template);
  });

  it('deletes the template', async () => {
    const d = db();
    await saveSheetTemplate(d, template);
    await deleteSheetTemplate(d);
    expect(await loadSheetTemplate(d)).toBeUndefined();
  });

  it('leaves the settings alone, and the backup does not hold it', async () => {
    const d = db();
    await saveSettings(d, { ...DEFAULT_SETTINGS, theme: 'dark' });
    await saveSheetTemplate(d, template);
    expect((await loadSettings(d)).theme).toBe('dark');
    expect(JSON.stringify(buildBackup([], [], '2026-10-17T10:00:00.000Z'))).not.toContain('sheet-template');
  });

  it('ignores a template row that cannot be read', async () => {
    const d = db();
    await d.settings.put({ key: 'sheet-template', value: { name: 5 } });
    expect(await loadSheetTemplate(d)).toBeUndefined();
  });
});
