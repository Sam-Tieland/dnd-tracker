import { CharacterSchema, type Character } from '../model/character';
import type { TrackerDb } from './db';
import { migrateCharacter } from './migrations';

export interface BrokenCharacter {
  id: string;
  name: string;
  error: string;
}

export interface LoadedCharacters {
  characters: Character[];
  broken: BrokenCharacter[];
}

/** All characters, most recently changed first. A row that cannot be read is listed as broken instead of failing. */
export async function loadCharacters(db: TrackerDb): Promise<LoadedCharacters> {
  const characters: Character[] = [];
  const broken: BrokenCharacter[] = [];
  for (const row of await db.characters.toArray()) {
    try {
      characters.push(migrateCharacter(row));
    } catch (error) {
      broken.push({ id: row.id, name: typeof row.name === 'string' ? row.name : '', error: error instanceof Error ? error.message : String(error) });
    }
  }
  characters.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { characters, broken };
}

/** Undefined when there is no such character; throws a MigrationError when the row cannot be read. */
export async function loadCharacter(db: TrackerDb, id: string): Promise<Character | undefined> {
  const row = await db.characters.get(id);
  return row === undefined ? undefined : migrateCharacter(row);
}

/** Validates before writing, so the database never holds a character the app cannot load. */
export async function saveCharacter(db: TrackerDb, character: Character): Promise<void> {
  await db.characters.put(CharacterSchema.parse(character));
}

export async function deleteCharacter(db: TrackerDb, id: string): Promise<void> {
  await db.characters.delete(id);
}
