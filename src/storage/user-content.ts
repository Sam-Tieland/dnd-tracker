import { validateUserContent, type UserContentResult } from '../content/user';
import type { TrackerDb } from './db';

/** The player's own content, through the same gate as imports. Invalid rows are reported and stay in the database. */
export async function loadUserContent(db: TrackerDb): Promise<UserContentResult> {
  return validateUserContent(await db.customContent.toArray());
}
