// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCharacter } from '../rules/testing/fixtures';
import { saveCharacter } from '../storage/characters';
import { loadSettings } from '../storage/settings';
import { renderWithProviders, setMatchMedia, testDb } from './testing/render';
import { useExport } from './use-export';

function BackupButton() {
  const { exportBackup } = useExport();
  return (
    <button type="button" onClick={() => void exportBackup()}>
      backup
    </button>
  );
}

const notAllowed = () => new DOMException('not allowed', 'NotAllowedError');

/** An iPad: touch pointer and a share that can take files. */
function installShare(share: (data: ShareData) => Promise<void>) {
  setMatchMedia((query) => query === '(pointer: coarse)');
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
}

async function startBackup() {
  const db = testDb();
  await saveCharacter(db, makeCharacter());
  renderWithProviders(<BackupButton />, db);
  fireEvent.click(await screen.findByRole('button', { name: 'backup' }));
  return db;
}

describe('export when the share sheet refuses', () => {
  let click: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'canShare');
  });

  it('offers a Share toast, and the tap shares the same file again straight away', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockRejectedValueOnce(notAllowed()).mockResolvedValueOnce(undefined);
    installShare(share);
    const db = await startBackup();
    const retry = await screen.findByRole('button', { name: 'Share' });
    expect(screen.getByText('Sharing was blocked. Tap Share to export again.')).toBeTruthy();
    expect(screen.queryByText(/Export failed/)).toBeNull();
    expect(share).toHaveBeenCalledOnce();
    fireEvent.click(retry);
    // Synchronously, inside the tap: no await may sit between the tap and navigator.share.
    expect(share).toHaveBeenCalledTimes(2);
    expect(share.mock.calls[1][0].files?.[0]).toBe(share.mock.calls[0][0].files?.[0]);
    expect(await screen.findByText('Export ready.')).toBeTruthy();
    await waitFor(async () => expect((await loadSettings(db)).lastExportAt).not.toBeNull());
    expect(click).not.toHaveBeenCalled();
  });

  it('falls back to a download when the second share fails too', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockRejectedValue(notAllowed());
    installShare(share);
    await startBackup();
    fireEvent.click(await screen.findByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Export ready.')).toBeTruthy();
    expect(click).toHaveBeenCalledOnce();
  });

  it('stays silent when the player closes the share sheet', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    installShare(share);
    const db = await startBackup();
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
    expect(screen.queryByText(/Export/)).toBeNull();
    expect((await loadSettings(db)).lastExportAt).toBeNull();
  });

  it('stays silent when the retry is cancelled', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockRejectedValueOnce(notAllowed()).mockRejectedValueOnce(new DOMException('c', 'AbortError'));
    installShare(share);
    await startBackup();
    fireEvent.click(await screen.findByRole('button', { name: 'Share' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(share).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Export ready.')).toBeNull();
    expect(click).not.toHaveBeenCalled();
  });
});
