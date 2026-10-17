// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { loadBuiltinContent } from '../../content/load';
import { createRegistry } from '../../content/registry';
import { kael } from '../../rules/testing/fixtures';
import { saveCharacter } from '../../storage/characters';
import { buildCharacterExport, serializeExport } from '../../storage/export';
import { renderApp, testDb } from '../testing/render';

const control = vi.hoisted(() => ({ failReload: false, applyGate: null as Promise<void> | null }));

vi.mock('../../storage/user-content', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../storage/user-content')>();
  return {
    ...original,
    loadUserContent: (...args: Parameters<typeof original.loadUserContent>) =>
      control.failReload ? Promise.reject(new Error('reload failed')) : original.loadUserContent(...args),
  };
});
vi.mock('../../storage/import', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../storage/import')>();
  return {
    ...original,
    applyImport: async (...args: Parameters<typeof original.applyImport>) => {
      if (control.applyGate) await control.applyGate;
      return original.applyImport(...args);
    },
  };
});

const registry = createRegistry(loadBuiltinContent(), []);
const fileFor = (updatedAt: string) =>
  new File([serializeExport(buildCharacterExport({ ...kael(), name: 'From file', updatedAt }, registry, [], '2026-10-01T10:00:00.000Z'))], 'x.json', {
    type: 'application/json',
  });

describe('import flow', () => {
  it('shows which version is newer for an existing character', async () => {
    const db = testDb();
    await saveCharacter(db, { ...kael(), updatedAt: '2026-06-01T10:00:00.000Z' });
    renderApp('#/settings', db);
    await userEvent.setup().upload(await screen.findByTestId('import-input'), fileFor('2026-01-01T10:00:00.000Z'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/On this device:/).textContent).toContain('(newer)');
    expect(within(dialog).getByText(/In file:/).textContent).not.toContain('(newer)');
  });

  it('still reports success when reading the content back fails', async () => {
    const db = testDb();
    renderApp('#/settings', db);
    const user = userEvent.setup();
    await user.upload(await screen.findByTestId('import-input'), fileFor('2026-01-01T10:00:00.000Z'));
    const dialog = await screen.findByRole('dialog');
    control.failReload = true;
    try {
      await user.click(within(dialog).getByRole('button', { name: 'Import' }));
      expect(await screen.findByText('Imported: 1 new, 0 replaced, 0 copies, 0 content item(s).')).toBeTruthy();
      expect(screen.queryByText(/Import failed/)).toBeNull();
    } finally {
      control.failReload = false;
    }
  });

  it('cannot be dismissed while the write runs', async () => {
    const db = testDb();
    renderApp('#/settings', db);
    const user = userEvent.setup();
    await user.upload(await screen.findByTestId('import-input'), fileFor('2026-01-01T10:00:00.000Z'));
    let release = () => {};
    control.applyGate = new Promise<void>((resolve) => (release = resolve));
    const dialog = await screen.findByRole('dialog');
    try {
      await user.click(within(dialog).getByRole('button', { name: 'Import' }));
      await waitFor(() => expect((within(dialog).getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true));
      await user.keyboard('{Escape}');
      expect(screen.getByRole('dialog')).toBeTruthy();
    } finally {
      release();
      control.applyGate = null;
    }
    expect(await screen.findByText(/Imported: 1 new/)).toBeTruthy();
  });
});
