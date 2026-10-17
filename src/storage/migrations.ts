import { CharacterSchema, type Character } from '../model/character';

export const CHARACTER_SCHEMA_VERSION = 2;

export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[n] turns a character of schema version n into version n + 1. Schema 1 is the first stored version. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  // Schema 2 only adds the optional levels[].note, so existing characters pass through unchanged.
  1: (raw) => raw,
};

export type MigrationErrorCode = 'invalid' | 'newer-version';

export class MigrationError extends Error {
  readonly code: MigrationErrorCode;

  constructor(code: MigrationErrorCode, message: string) {
    super(message);
    this.name = 'MigrationError';
    this.code = code;
  }
}

/** Brings a stored or imported character up to the current schema and validates it (spec §12, §15). */
export function migrateCharacter(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  current: number = CHARACTER_SCHEMA_VERSION,
): Character {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new MigrationError('invalid', 'not a character');
  let data = raw as Record<string, unknown>;
  const stored = data.schemaVersion;
  if (typeof stored !== 'number' || !Number.isInteger(stored) || stored < 0) throw new MigrationError('invalid', 'missing schemaVersion');
  if (stored > current) throw new MigrationError('newer-version', `made with a newer version of the app (schema ${stored})`);
  for (let version = stored; version < current; version += 1) {
    const migrate = migrations[version];
    if (!migrate) throw new MigrationError('invalid', `no migration from schema ${version}`);
    data = { ...migrate(data), schemaVersion: version + 1 };
  }
  const parsed = CharacterSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new MigrationError('invalid', `${issue.path.map(String).join('.') || 'character'}: ${issue.message}`);
  }
  return parsed.data;
}
