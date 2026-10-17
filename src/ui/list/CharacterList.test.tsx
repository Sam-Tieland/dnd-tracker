// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { loadBuiltinContent } from '../../content/load';
import { createRegistry } from '../../content/registry';
import { kael } from '../../rules/testing/fixtures';
import { loadCharacters, saveCharacter } from '../../storage/characters';
import { buildCharacterExport, serializeExport } from '../../storage/export';
import { DEFAULT_SETTINGS, saveSettings } from '../../storage/settings';
import { renderApp, testDb } from '../testing/render';

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
