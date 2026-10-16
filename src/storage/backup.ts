export const BACKUP_REMINDER_DAYS = 14;

/**
 * Spec §12: a reminder after 14 days without an export. Before the first export the days count from the oldest
 * character, so a new player is not reminded on day one; without characters there is nothing to lose.
 */
export function backupDue(lastExportAt: string | null, oldestCharacterAt: string | null, now: string): boolean {
  if (oldestCharacterAt === null) return false;
  const since = Date.parse(lastExportAt ?? oldestCharacterAt);
  return Date.parse(now) - since >= BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
}
