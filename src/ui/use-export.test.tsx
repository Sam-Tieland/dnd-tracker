// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCharacter } from '../rules/testing/fixtures';
import { saveCharacter } from '../storage/characters';
import { loadSettings } from '../storage/settings';
import { deliverFile } from './deliver';
import { renderWithProviders, testDb } from './testing/render';
import { useExport } from './use-export';

vi.mock('./deliver', () => ({ deliverFile: vi.fn(async () => true) }));

function BackupButton() {
  const { exportBackup } = useExport();
  return (
    <button type="button" onClick={() => void exportBackup()}>
      backup
    </button>
  );
}

describe('useExport', () => {
  beforeEach(() => {
    vi.mocked(deliverFile).mockClear();
    vi.restoreAllMocks();
  });

  it('reports a failing read as a toast instead of an unhandled rejection', async () => {
    const db = testDb();
    vi.spyOn(db.characters, 'toArray').mockRejectedValue(new Error('disk full'));
    renderWithProviders(<BackupButton />, db);
    fireEvent.click(await screen.findByRole('button', { name: 'backup' }));
    expect(await screen.findByText('Export failed: disk full')).toBeTruthy();
    expect(deliverFile).not.toHaveBeenCalled();
  });

  it('says so when a character could not be read and is left out of the backup', async () => {
    const db = testDb();
    await saveCharacter(db, makeCharacter());
    await db.characters.put({ id: 'bad', name: 'Broken' });
    renderWithProviders(<BackupButton />, db);
    fireEvent.click(await screen.findByRole('button', { name: 'backup' }));
    const message = await screen.findByText('Export ready, but 1 character(s) could not be read and are not included.');
    expect(message.closest('.toast')?.classList.contains('toast-error')).toBe(true);
    expect(screen.queryByText('Export ready.')).toBeNull();
    expect(deliverFile).toHaveBeenCalledOnce();
    const exported = JSON.parse(vi.mocked(deliverFile).mock.calls[0][1] as string) as { characters: unknown[] };
    expect(exported.characters).toHaveLength(1);
    await waitFor(async () => expect((await loadSettings(db)).lastExportAt).not.toBeNull());
  });

  it('keeps the plain message when everything was exported', async () => {
    const db = testDb();
    await saveCharacter(db, makeCharacter());
    renderWithProviders(<BackupButton />, db);
    fireEvent.click(await screen.findByRole('button', { name: 'backup' }));
    const message = await screen.findByText('Export ready.');
    expect(message.closest('.toast')?.classList.contains('toast-error')).toBe(false);
  });
});
