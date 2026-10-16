import { describe, expect, it } from 'vitest';
import { backupDue } from './backup';

describe('backupDue', () => {
  it('reminds 14 days after the last export', () => {
    expect(backupDue('2026-10-01T12:00:00.000Z', '2026-09-01T00:00:00.000Z', '2026-10-15T11:59:00.000Z')).toBe(false);
    expect(backupDue('2026-10-01T12:00:00.000Z', '2026-09-01T00:00:00.000Z', '2026-10-15T12:00:00.000Z')).toBe(true);
  });

  it('counts from the oldest character when nothing was exported yet, and never without characters', () => {
    expect(backupDue(null, '2026-10-10T00:00:00.000Z', '2026-10-16T00:00:00.000Z')).toBe(false);
    expect(backupDue(null, '2026-09-10T00:00:00.000Z', '2026-10-16T00:00:00.000Z')).toBe(true);
    expect(backupDue(null, null, '2026-10-16T00:00:00.000Z')).toBe(false);
  });
});
