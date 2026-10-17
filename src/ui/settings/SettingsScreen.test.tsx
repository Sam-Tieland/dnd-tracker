// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { loadBuiltinContent } from '../../content/load';
import { createRegistry } from '../../content/registry';
import type { FeatureDef } from '../../content/schema';
import { SRD_ATTRIBUTION } from '../../content/srd/attribution';
import { kael } from '../../rules/testing/fixtures';
import { loadCharacter, loadCharacters, saveCharacter } from '../../storage/characters';
import { buildBackup, buildCharacterExport, serializeExport } from '../../storage/export';
import { loadSettings } from '../../storage/settings';
import { loadUserContent } from '../../storage/user-content';
import { renderApp, testDb } from '../testing/render';

describe('settings and credits', () => {
  it('switches the language and the theme, and remembers them', async () => {
    const { db } = renderApp('#/settings');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Language'), 'nl');
    expect(await screen.findByRole('heading', { name: 'Instellingen' })).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Thema'), 'dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    await waitFor(async () => expect(await loadSettings(db)).toMatchObject({ language: 'nl', theme: 'dark' }));
  });

  it('credits show the SRD attribution verbatim', async () => {
    renderApp('#/credits');
    expect((await screen.findByText(SRD_ATTRIBUTION)).textContent).toBe(SRD_ATTRIBUTION);
  });
});

const named = (name: string) => ({ ...kael(), name });
const NOW = '2026-10-01T10:00:00.000Z';
const registry = createRegistry(loadBuiltinContent(), []);
const jsonFile = (text: string) => new File([text], 'export.json', { type: 'application/json' });
const fileInput = async () => (await screen.findByTestId('import-input')) as HTMLInputElement;

const confirmButton = async () => within(await screen.findByRole('dialog')).getByRole('button', { name: 'Import' });

describe('import', () => {
  it('imports a new character and shows it in the list', async () => {
    const db = testDb();
    renderApp('#/settings', db);
    const user = userEvent.setup();
    const text = serializeExport(buildCharacterExport(named('Mira'), registry, [], NOW));
    await user.upload(await fileInput(), jsonFile(text));
    expect(await screen.findByRole('dialog', { name: 'Import file' })).toBeTruthy();
    expect(screen.getByText('1 character(s) and 0 own content item(s).')).toBeTruthy();
    await user.click(await confirmButton());
    expect(await screen.findByText('Imported: 1 new, 0 replaced, 0 copies, 0 content item(s).')).toBeTruthy();
    expect((await loadCharacters(db)).characters.map((c) => c.name)).toEqual(['Mira']);
    await user.click(screen.getByRole('link', { name: 'Back' }));
    expect(await screen.findByRole('link', { name: /Mira/ })).toBeTruthy();
  });

  it('asks replace or copy for an existing character', async () => {
    const db = testDb();
    await saveCharacter(db, named('Old name'));
    renderApp('#/settings', db);
    const user = userEvent.setup();
    await user.upload(await fileInput(), jsonFile(serializeExport(buildCharacterExport(named('New name'), registry, [], NOW))));
    expect(await screen.findByText('Already on this device')).toBeTruthy();
    expect((screen.getByRole('radio', { name: 'Add as copy' }) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole('radio', { name: 'Replace' }));
    await user.click(await confirmButton());
    expect(await screen.findByText('Imported: 0 new, 1 replaced, 0 copies, 0 content item(s).')).toBeTruthy();
    expect((await loadCharacters(db)).characters.map((c) => c.name)).toEqual(['New name']);
  });

  it('adds a copy by default for an existing character', async () => {
    const db = testDb();
    await saveCharacter(db, named('Old name'));
    renderApp('#/settings', db);
    const user = userEvent.setup();
    await user.upload(await fileInput(), jsonFile(serializeExport(buildCharacterExport(named('New name'), registry, [], NOW))));
    await user.click(await confirmButton());
    expect(await screen.findByText('Imported: 0 new, 0 replaced, 1 copies, 0 content item(s).')).toBeTruthy();
    expect((await loadCharacters(db)).characters).toHaveLength(2);
    expect((await loadCharacter(db, 'test'))?.name).toBe('Old name');
  });

  it('shows imported own content on the sheet', async () => {
    const db = testDb();
    const base = kael();
    await saveCharacter(db, {
      ...base,
      choices: { ...base.choices, levels: base.choices.levels.map((l, i) => (i === 2 ? { ...l, subclassId: 'skeleton:subclass:battle-master' } : l)) },
    });
    const fill: FeatureDef = {
      id: 'user:feature:combat-superiority', type: 'feature', source: 'user', fills: 'skeleton:feature:battle-master:3:feature',
      name: 'Combat Superiority', text: 'My own text', effects: [],
    };
    renderApp('#/settings', db);
    const user = userEvent.setup();
    await user.upload(await fileInput(), jsonFile(serializeExport(buildBackup([], [fill], NOW))));
    expect(await screen.findByText('0 character(s) and 1 own content item(s).')).toBeTruthy();
    await user.click(await confirmButton());
    expect(await screen.findByText('Imported: 0 new, 0 replaced, 0 copies, 1 content item(s).')).toBeTruthy();
    expect((await loadUserContent(db)).items).toHaveLength(1);
    window.location.hash = '#/c/test';
    await screen.findByTestId('hp');
    await user.click(screen.getByRole('tab', { name: 'Features' }));
    expect((await screen.findAllByText('Combat Superiority')).length).toBeGreaterThan(0);
  });

  it('reports a file that is not JSON', async () => {
    const db = testDb();
    renderApp('#/settings', db);
    await userEvent.setup().upload(await fileInput(), jsonFile('not json {'));
    expect(await screen.findByText('This file is not a JSON file.')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect((await loadCharacters(db)).characters).toEqual([]);
  });

  it('reports a file with invalid own content', async () => {
    const db = testDb();
    renderApp('#/settings', db);
    const bad = { id: 'user:feature:x', type: 'feature', source: 'srd', name: 'X', text: '', effects: [] };
    const file = { ...buildBackup([], [], NOW), customContent: [bad] };
    await userEvent.setup().upload(await fileInput(), jsonFile(JSON.stringify(file)));
    expect(await screen.findByText(/Own content in this file is not valid:/)).toBeTruthy();
    expect((await loadUserContent(db)).items).toEqual([]);
  });

  it('cancel imports nothing', async () => {
    const db = testDb();
    renderApp('#/settings', db);
    const user = userEvent.setup();
    await user.upload(await fileInput(), jsonFile(serializeExport(buildCharacterExport(kael(), registry, [], NOW))));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect((await loadCharacters(db)).characters).toEqual([]);
  });
});
