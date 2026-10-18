import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import {
  BOOK_ENTRY_TYPES,
  BOOK_IDS,
  BookIndexSchema,
  type BookEntry,
  type BookEntryType,
  type BookId,
  type BookIndex,
  type PageRange,
} from '../../src/content/books';
import { contentId, slugify } from '../../src/content/ids';
import type { ContentRegistry } from '../../src/content/registry';
import { isInsideRepo, parseBookFile, type BookSubclass } from '../boek/convert';

/**
 * Builds the player's PRIVATE table of contents. The hand-made sources (boek/inhoud/<bookId>.json) and the notes stay
 * private; this code only knows their format.
 */

/** Hand-made source per book, in boek/inhoud/<bookId>.json (private). */
export interface BookSource {
  bookId: BookId;
  pdfPages: number;
  pageMap: PageRange[];
  entries: { title: string; type: BookEntryType; bookPage: number; parent?: string; class?: string; level?: number }[];
}

export interface BuildInput {
  sources: BookSource[];
  subclassNotes: { file: string; text: string }[];
  subclassImport: { id: string; type: string; name: string; fills?: string }[];
}

export interface BuildResult {
  index: BookIndex;
  /** Readable lines such as "tce: feature 'X' (Cleric 6) — geen id gevonden". */
  unresolved: string[];
}

export const BookSourceSchema: z.ZodType<BookSource> = z.strictObject({
  bookId: z.enum(BOOK_IDS),
  pdfPages: z.number().int().min(1),
  pageMap: z.array(
    z.strictObject({
      fromPdf: z.number().int().min(1),
      toPdf: z.number().int().min(1),
      firstBook: z.number().int().min(0),
      perPdfPage: z.union([z.literal(1), z.literal(2)]),
    }),
  ),
  entries: z.array(
    z.strictObject({
      title: z.string().min(1),
      type: z.enum(BOOK_ENTRY_TYPES),
      bookPage: z.number().int().min(0),
      parent: z.string().optional(),
      class: z.string().optional(),
      level: z.number().int().min(1).max(20).optional(),
    }),
  ),
});

const BOOK_OF_SOURCE: Record<BookSubclass['source'], BookId> = {
  'PHB 2024': 'phb-2024',
  "Xanathar's": 'xge',
  "Tasha's": 'tce',
};

/** Compares names the way the ids are made. */
const sameName = (a: string, b: string) => slugify(a) === slugify(b);

export function buildBookIndex(input: BuildInput, registry: ContentRegistry): BuildResult {
  const unresolved: string[] = [];
  const books = new Map<BookId, { source?: BookSource; entries: BookEntry[]; used: Set<string> }>();
  const bookOf = (id: BookId) => {
    let b = books.get(id);
    if (!b) {
      b = { entries: [], used: new Set() };
      books.set(id, b);
    }
    return b;
  };
  const uniqueId = (b: { used: Set<string> }, type: string, title: string) => {
    const base = slugify(`${type}-${title}`);
    let id = base;
    for (let n = 2; b.used.has(id); n += 1) id = `${base}-${n}`;
    b.used.add(id);
    return id;
  };

  const classFeatureIds = (className: string, level: number, name: string): string[] => {
    const cls = registry.getOf('class', contentId('srd', 'class', className));
    const row = cls?.levels[level - 1];
    if (!row) return [];
    return row.featureIds.filter((id) => {
      const f = registry.get(id);
      return f !== undefined && slugify(f.name) === slugify(name);
    });
  };

  // 1. Hand-made sources.
  for (const source of input.sources) {
    const b = bookOf(source.bookId);
    b.source = source;
    const ids = new Map<string, string>();
    const made = source.entries.map((e) => {
      const entry: BookEntry = {
        id: uniqueId(b, e.type, e.title),
        title: e.title,
        type: e.type,
        bookPage: e.bookPage,
        contentIds: [],
      };
      if (!ids.has(e.title)) ids.set(e.title, entry.id);
      return entry;
    });
    source.entries.forEach((e, i) => {
      const entry = made[i]!;
      if (e.parent !== undefined) {
        const parentId = ids.get(e.parent);
        if (parentId) entry.parentId = parentId;
        else unresolved.push(`${source.bookId}: '${e.title}' — ouder '${e.parent}' niet gevonden`);
      }
      if (e.type === 'class') {
        const id = contentId('srd', 'class', e.title);
        if (registry.getOf('class', id)) entry.contentIds = [id];
        else unresolved.push(`${source.bookId}: class '${e.title}' — geen id gevonden`);
      } else if (e.type === 'feature' && e.class !== undefined && e.level !== undefined) {
        entry.contentIds = classFeatureIds(e.class, e.level, e.title);
        if (entry.contentIds.length === 0) {
          unresolved.push(`${source.bookId}: feature '${e.title}' (${e.class} ${e.level}) — geen id gevonden`);
        }
      }
    });
    b.entries.push(...made);
  }

  // 2. Subclass notes.
  const importIds = (pattern: RegExp) => input.subclassImport.filter((i) => pattern.test(i.id));
  const withFills = (items: { id: string; fills?: string }[]) => [...new Set(items.flatMap((i) => (i.fills ? [i.id, i.fills] : [i.id])))];

  for (const note of [...input.subclassNotes].sort((a, b) => a.file.localeCompare(b.file))) {
    const parsed = parseBookFile(note.file, note.text);
    if (!parsed.subclass) {
      const bron = /^bron:\s*(.+?)\s*$/m.exec(note.text)?.[1]?.replace(/^(["'])(.*)\1$/, '$2');
      const known = ["PHB 2024", "Xanathar's", "Tasha's"];
      unresolved.push(
        bron !== undefined && !known.includes(bron)
          ? `${note.file}: bron '${bron}' is geen van de drie boeken — overgeslagen`
          : `${parsed.warnings[0] ?? `${note.file}: onleesbaar`} — overgeslagen`,
      );
      continue;
    }
    const sc = parsed.subclass;
    const bookId = BOOK_OF_SOURCE[sc.source];
    const b = bookOf(bookId);
    const page = Number(/^pagina:\s*(\d+)/m.exec(note.text)?.[1] ?? 0);
    const classEntry = b.entries.find((e) => e.type === 'class' && sameName(e.title, sc.className));
    const classId = contentId('srd', 'class', sc.className);
    const slug = slugify(sc.source === 'PHB 2024' ? `${sc.className} ${sc.subclass}` : `${sc.className} ${sc.subclass} ${sc.source}`);
    const importName = sc.source === 'PHB 2024' ? sc.subclass : `${sc.subclass} (${sc.source})`;

    // subclass
    const subPattern = new RegExp(`^user:subclass:${slug}(-\\d+)?$`);
    const imported = input.subclassImport.filter((i) => i.type === 'subclass' && (subPattern.test(i.id) || (i.name !== '' && sameName(i.name, importName))));
    const srdSub = registry.list('subclass').find((s) => s.classId === classId && sameName(s.name, sc.subclass));
    const subIds = imported.length > 0 ? withFills(imported.slice(0, 1)) : srdSub ? [srdSub.id] : [];
    if (subIds.length === 0) unresolved.push(`${bookId}: subclass '${sc.subclass}' (${sc.className}) — geen id gevonden`);

    if (!classEntry) unresolved.push(`${bookId}: subclass '${sc.subclass}' — class '${sc.className}' staat niet in de bron`);

    let sub = b.entries.find((e) => e.type === 'subclass' && sameName(e.title, sc.subclass));
    if (sub) sub.contentIds = [...new Set([...sub.contentIds, ...subIds])];
    else {
      sub = {
        id: uniqueId(b, 'subclass', sc.subclass),
        title: sc.subclass,
        type: 'subclass',
        bookPage: page,
        contentIds: subIds,
        ...(classEntry ? { parentId: classEntry.id } : {}),
      };
      b.entries.push(sub);
    }

    // features
    const seenLevels = new Set<number>();
    for (const f of sc.features) {
      const firstAtLevel = !seenLevels.has(f.level);
      seenLevels.add(f.level);
      const named = importIds(new RegExp(`^user:feature:${slug}-${f.level}-${slugify(f.name)}(-\\d+)?$`));
      const fill = named.length === 0 && firstAtLevel ? importIds(new RegExp(`^user:feature:${slug}-fill-${f.level}(-\\d+)?$`)) : [];
      let ids = withFills([...named, ...fill].slice(0, 1));
      if (ids.length === 0) {
        const srdSlot = srdSub?.features.filter((s) => s.level === f.level).map((s) => s.featureId).filter((id) => slugify(registry.get(id)?.name ?? '') === slugify(f.name));
        ids = srdSlot ?? [];
      }
      if (ids.length === 0) unresolved.push(`${bookId}: feature '${f.name}' (${sc.className} ${f.level}) — geen id gevonden`);
      b.entries.push({
        id: uniqueId(b, 'feature', f.name),
        title: f.name,
        type: 'feature',
        bookPage: page,
        parentId: sub.id,
        contentIds: ids,
      });
    }
  }

  const out: BookIndex = {
    format: 'dnd-tracker-book-index',
    version: 1,
    books: BOOK_IDS.filter((id) => books.has(id)).map((id) => {
      const b = books.get(id)!;
      return {
        bookId: id,
        pdfPages: b.source?.pdfPages ?? 1,
        pageMap: b.source?.pageMap ?? [],
        entries: b.entries,
      };
    }),
  };
  return { index: BookIndexSchema.parse(out), unresolved };
}

const readFolder = (dir: string, ext: string): { file: string; text: string }[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((n) => n.endsWith(ext))
        .sort()
        .map((file) => ({ file, text: readFileSync(join(dir, file), 'utf8') }))
    : [];

/**
 * The command line, without process side effects: returns the exit code and the lines to print. Refuses an output path
 * inside the repository (the index holds the player's private books).
 */
export function runBookIndex(folder: string, output: string, repo: string, registry: ContentRegistry): { code: number; lines: string[] } {
  if (isInsideRepo(resolve(output), repo)) {
    return { code: 1, lines: ['Schrijf de inhoudsopgave buiten de code-map (bijv. in je privé boekmap); hij hoort niet in de repository.'] };
  }
  const sources = readFolder(join(folder, 'inhoud'), '.json').map((f) => BookSourceSchema.parse(JSON.parse(f.text)));
  const subclassNotes = readFolder(join(folder, 'subclasses'), '.md');
  const importFile = join(folder, 'import', 'subclasses.json');
  const imported: unknown = existsSync(importFile) ? JSON.parse(readFileSync(importFile, 'utf8')) : { customContent: [] };
  const subclassImport = z
    .object({ customContent: z.array(z.object({ id: z.string(), type: z.string(), name: z.string(), fills: z.string().optional() }).loose()) })
    .parse(imported)
    .customContent.map(({ id, type, name, fills }) => ({ id, type, name, ...(fills !== undefined ? { fills } : {}) }));

  const { index, unresolved } = buildBookIndex({ sources, subclassNotes, subclassImport }, registry);
  mkdirSync(dirname(resolve(output)), { recursive: true });
  writeFileSync(output, JSON.stringify(index));

  const lines = [`Bronnen: ${sources.length}, notities: ${subclassNotes.length}`];
  for (const book of index.books) lines.push(`${book.bookId}: ${book.entries.length} items`);
  lines.push(`Geschreven: ${output}`);
  if (unresolved.length > 0) lines.push(`\nNiet gekoppeld (${unresolved.length}):\n- ${unresolved.join('\n- ')}`);
  return { code: 0, lines };
}
