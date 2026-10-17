// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { loadBuiltinContent } from '../../content/load';
import { createRegistry } from '../../content/registry';
import { kael } from '../../rules/testing/fixtures';
import { loadCharacters, saveCharacter } from '../../storage/characters';
import { buildCharacterExport, serializeExport } from '../../storage/export';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../storage/settings';
import { renderApp, testDb } from '../testing/render';
import { saveSheetTemplate } from '../../storage/sheet-template';
import { fakeTemplate } from '../pdf/testing/fake-template';

let gate: Promise<void> | undefined;
let fills = 0;
vi.mock('../pdf/fill-sheet', async (importOriginal) => {
  const original = await importOriginal<typeof import('../pdf/fill-sheet')>();
  return {
    ...original,
    fillSheet: async (...args: Parameters<typeof original.fillSheet>) => {
      fills += 1;
      await gate;
      return original.fillSheet(...args);
    },
  };
});

describe('character list', () => {
  it('starts empty with a link to a new character', async () => {
    renderApp('#/');
    expect(await screen.findByText('No characters yet.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'New character' }).getAttribute('href')).toBe('#/new');
  });

  it('imports a character from the list and shows it right away', async () => {
    const db = testDb();
    renderApp('#/', db);
    const user = userEvent.setup();
    expect(await screen.findByText('No characters yet.')).toBeTruthy();
    const registry = createRegistry(loadBuiltinContent());
    const text = serializeExport(buildCharacterExport({ ...kael(), id: 'mira', name: 'Mira' }, registry, [], '2026-10-17T10:00:00.000Z'));
    await user.upload(screen.getByTestId('import-input'), new File([text], 'mira.json', { type: 'application/json' }));
    const dialog = await screen.findByRole('dialog', { name: 'Import file' });
    await user.click(within(dialog).getByRole('button', { name: 'Import' }));
    expect(await screen.findByRole('link', { name: /Mira/ })).toBeTruthy();
    expect((await loadCharacters(db)).characters.map((c) => c.name)).toEqual(['Mira']);
  });

  it('shows an imported copy next to the original', async () => {
    const db = testDb();
    await saveCharacter(db, kael());
    renderApp('#/', db);
    const user = userEvent.setup();
    expect(await screen.findByRole('link', { name: /Test/ })).toBeTruthy();
    const registry = createRegistry(loadBuiltinContent());
    const text = serializeExport(buildCharacterExport(kael(), registry, [], '2026-10-17T10:00:00.000Z'));
    await user.upload(screen.getByTestId('import-input'), new File([text], 'test.json', { type: 'application/json' }));
    const dialog = await screen.findByRole('dialog', { name: 'Import file' });
    await user.click(within(dialog).getByRole('button', { name: 'Import' }));
    expect(await screen.findByText('Imported: 0 new, 0 replaced, 1 copies, 0 content item(s).')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByRole('link', { name: /Test/ })).toHaveLength(2));
  });

  it('shows each character with classes and level, linking to its sheet', async () => {
    const db = testDb();
    await saveCharacter(db, kael({ state: { hpCurrent: 40 } }));
    renderApp('#/', db);
    const link = await screen.findByRole('link', { name: /Test/ });
    expect(link.textContent).toContain('Fighter 3 (Champion) / Wizard 2');
    expect(link.textContent).toContain('Level 5');
    expect(link.getAttribute('href')).toBe('#/c/test');
  });

  it('deletes a character only after confirming', async () => {
    const db = testDb();
    await saveCharacter(db, kael());
    renderApp('#/', db);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('dialog').querySelector('button.danger')!);
    await waitFor(async () => expect((await loadCharacters(db)).characters).toEqual([]));
    expect(await screen.findByText('No characters yet.')).toBeTruthy();
  });

  it('shows a row it cannot read as broken, and keeps working', async () => {
    const db = testDb();
    await saveCharacter(db, kael());
    await db.characters.put({ id: 'future', name: 'From the future', schemaVersion: 99 });
    renderApp('#/', db);
    expect(await screen.findByText(/From the future cannot be loaded/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Test/ })).toBeTruthy();
  });

  it('reminds to make a backup after 14 days without an export', async () => {
    const db = testDb();
    await saveCharacter(db, { ...kael(), createdAt: '2026-01-01T00:00:00.000Z' });
    await saveSettings(db, { ...DEFAULT_SETTINGS, lastExportAt: '2026-01-02T00:00:00.000Z' });
    renderApp('#/', db);
    expect(await screen.findByText('It has been more than 14 days since your last export.')).toBeTruthy();
  });

  it('says so when the characters cannot be read, and keeps the export and settings reachable', async () => {
    const db = testDb();
    vi.spyOn(db.characters, 'toArray').mockRejectedValue(new Error('blocked'));
    renderApp('#/', db);
    expect((await screen.findByRole('alert')).textContent).toBe('The characters could not be loaded: blocked');
    expect(screen.getByRole('button', { name: 'Export all data' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('href')).toBe('#/settings');
  });

  it('keeps the character and says so when it cannot be deleted', async () => {
    const db = testDb();
    await saveCharacter(db, kael());
    vi.spyOn(db.characters, 'delete').mockRejectedValue(new Error('blocked'));
    renderApp('#/', db);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('dialog').querySelector('button.danger')!);
    expect(await screen.findByText(/Saving failed: blocked/)).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('link', { name: /Test/ })).toBeTruthy();
  });

  it('shows the error box when the list cannot be read again after a delete', async () => {
    const db = testDb();
    await saveCharacter(db, kael());
    const readOnce = db.characters.toArray.bind(db.characters);
    vi.spyOn(db.characters, 'toArray').mockImplementationOnce(readOnce).mockRejectedValue(new Error('blocked'));
    renderApp('#/', db);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('dialog').querySelector('button.danger')!);
    expect((await screen.findByRole('alert')).textContent).toBe('The characters could not be loaded: blocked');
    expect(screen.queryByRole('link', { name: /Test/ })).toBeNull();
  });
});

describe('PDF export', { timeout: 15000 }, () => {
  it('asks for the sheet first', async () => {
    const db = testDb();
    await saveCharacter(db, kael());
    renderApp('#/', db);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'PDF Test' }));
    const message = await screen.findByText('Choose your character sheet in Settings first.');
    expect(message.closest('.toast')?.classList.contains('toast-error')).toBe(false);
  });

  it('exports a filled PDF', async () => {
    const db = testDb();
    await saveCharacter(db, kael());
    await saveSheetTemplate(db, { name: 'sheet.pdf', bytes: await fakeTemplate(), savedAt: '2026-10-17T10:00:00.000Z' });
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
      blob = b as Blob;
      return 'blob:test';
    });
    URL.revokeObjectURL = vi.fn();
    let downloaded = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloaded = this.download;
    });
    renderApp('#/', db);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'PDF Test' }));
    expect(await screen.findByText('PDF ready.')).toBeTruthy();
    expect((await loadSettings(db)).lastExportAt).toBeNull();
    expect(downloaded).toMatch(/^test-\d{4}-\d{2}-\d{2}\.pdf$/);
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(new Uint8Array(await blob!.arrayBuffer()));
    expect(doc.getForm().getTextField('CharacterName').getText()).toBe('Test');
    vi.restoreAllMocks();
  }, 15000);

  it('disables the PDF button while the sheet is being made', async () => {
    const db = testDb();
    await saveCharacter(db, kael());
    await saveSheetTemplate(db, { name: 'sheet.pdf', bytes: await fakeTemplate(), savedAt: '2026-10-17T10:00:00.000Z' });
    let release = () => {};
    gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    fills = 0;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    renderApp('#/', db);
    const user = userEvent.setup();
    const button = await screen.findByRole('button', { name: 'PDF Test' });
    await user.click(button);
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(true));
    expect(button.textContent).toBe('Making PDF…');
    await user.click(button);
    release();
    expect(await screen.findByText('PDF ready.')).toBeTruthy();
    gate = undefined;
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    expect(button.textContent).toBe('PDF');
    expect(fills).toBe(1);
    expect(click).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
