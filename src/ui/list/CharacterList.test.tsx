// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { kael } from '../../rules/testing/fixtures';
import { loadCharacters, saveCharacter } from '../../storage/characters';
import { DEFAULT_SETTINGS, saveSettings } from '../../storage/settings';
import { renderApp, testDb } from '../testing/render';

describe('character list', () => {
  it('starts empty with a link to a new character', async () => {
    renderApp('#/');
    expect(await screen.findByText('No characters yet.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'New character' }).getAttribute('href')).toBe('#/new');
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
});
