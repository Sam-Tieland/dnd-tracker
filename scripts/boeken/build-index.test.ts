import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BookIndexSchema } from '../../src/content/books';
import { loadBuiltinContent } from '../../src/content/load';
import { createRegistry } from '../../src/content/registry';
import { buildBookIndex, runBookIndex, type BookSource } from './build-index';

const registry = createRegistry(loadBuiltinContent());

const phb: BookSource = {
  bookId: 'phb-2024',
  pdfPages: 10,
  pageMap: [{ fromPdf: 1, toPdf: 10, firstBook: 1, perPdfPage: 1 }],
  entries: [
    { title: 'Chapter A', type: 'chapter', bookPage: 1 },
    { title: 'Cleric', type: 'class', bookPage: 3, parent: 'Chapter A' },
    { title: 'Spellcasting', type: 'feature', bookPage: 4, parent: 'Cleric', class: 'Cleric', level: 1 },
    { title: 'Spellcasting', type: 'feature', bookPage: 5, parent: 'Cleric', class: 'Cleric', level: 1 },
  ],
};

const note = (cls: string, sub: string, bron: string, page: number, body: string) =>
  `---\ntype: subclass\nclass: ${cls}\nsubclass: ${sub}\nbron: ${bron}\nregels: 2024\npagina: ${page}\n---\n\n# ${sub}\n\nMade up.\n\n${body}`;

const testDomain = note('Cleric', 'Test Domain', 'PHB 2024', 7, '## Level 3: Test Gift\n\nMade up.\n\n## Level 3: Second Gift\n\nMade up.\n');
const imports = [
  { id: 'user:subclass:cleric-test-domain', type: 'subclass', name: '', fills: 'srd:subclass:test' },
  { id: 'user:feature:cleric-test-domain-fill-3', type: 'feature', name: 'Test Gift', fills: 'srd:feature:test:3' },
  { id: 'user:feature:cleric-test-domain-3-second-gift', type: 'feature', name: 'Second Gift' },
];

describe('buildBookIndex', () => {
  it('links a class and its SRD features', () => {
    const { index } = buildBookIndex({ sources: [phb], subclassNotes: [], subclassImport: [] }, registry);
    const book = index.books[0]!;
    const cleric = book.entries.find((e) => e.title === 'Cleric')!;
    expect(cleric.contentIds).toEqual(['srd:class:cleric']);
    const spell = book.entries.filter((e) => e.title === 'Spellcasting');
    expect(spell[0]!.id).toBe('feature-spellcasting');
    expect(spell[1]!.id).toBe('feature-spellcasting-2');
    expect(spell[0]!.parentId).toBe(cleric.id);
    expect(spell[0]!.contentIds).toHaveLength(1);
    expect(registry.get(spell[0]!.contentIds[0]!)?.name).toBe('Spellcasting');
    expect(BookIndexSchema.safeParse(index).success).toBe(true);
  });

  it('adds subclasses and their features from the notes', () => {
    const { index, unresolved } = buildBookIndex(
      { sources: [phb], subclassNotes: [{ file: 'a.md', text: testDomain }], subclassImport: imports },
      registry,
    );
    const book = index.books[0]!;
    const sub = book.entries.find((e) => e.type === 'subclass')!;
    expect(sub).toMatchObject({ title: 'Test Domain', bookPage: 7, contentIds: ['user:subclass:cleric-test-domain', 'srd:subclass:test'] });
    expect(book.entries.find((e) => e.id === sub.parentId)?.title).toBe('Cleric');
    const gift = book.entries.find((e) => e.title === 'Test Gift')!;
    expect(gift).toMatchObject({ type: 'feature', bookPage: 7, parentId: sub.id });
    expect(gift.contentIds).toEqual(['user:feature:cleric-test-domain-fill-3', 'srd:feature:test:3']);
    const second = book.entries.find((e) => e.title === 'Second Gift')!;
    expect(second.contentIds).toEqual(['user:feature:cleric-test-domain-3-second-gift']);
    expect(unresolved).toEqual([]);
  });

  it("names the Xanathar's and Tasha's subclasses like the converter", () => {
    const x = note('Cleric', 'Test Domain', "Xanathar's", 12, '## Level 1: Test Gift\n\nMade up.\n');
    const t = note('Cleric', 'Test Domain', "Tasha's", 14, '## Level 1: Test Gift\n\nMade up.\n');
    const { index, unresolved } = buildBookIndex(
      {
        sources: [],
        subclassNotes: [
          { file: 'x.md', text: x },
          { file: 't.md', text: t },
        ],
        subclassImport: [
          { id: 'user:subclass:cleric-test-domain-xanathars', type: 'subclass', name: "Test Domain (Xanathar's)" },
          { id: 'user:feature:cleric-test-domain-xanathars-1-test-gift', type: 'feature', name: 'Test Gift' },
          { id: 'user:subclass:cleric-test-domain-tashas', type: 'subclass', name: "Test Domain (Tasha's)" },
        ],
      },
      registry,
    );
    expect(index.books.map((b) => b.bookId)).toEqual(['xge', 'tce']);
    expect(index.books[0]!.entries.find((e) => e.type === 'subclass')!.contentIds).toEqual(['user:subclass:cleric-test-domain-xanathars']);
    expect(index.books[0]!.entries.find((e) => e.type === 'feature')!.contentIds).toEqual(['user:feature:cleric-test-domain-xanathars-1-test-gift']);
    expect(index.books[1]!.entries.find((e) => e.type === 'subclass')!.contentIds).toEqual(['user:subclass:cleric-test-domain-tashas']);
    expect(unresolved.some((l) => l.startsWith("tce: feature 'Test Gift'"))).toBe(true);
  });

  it('reports what it could not link', () => {
    const odd = note('Cleric', 'Odd Domain', 'Some Other Book', 1, '## Level 1: Odd\n\nMade up.\n');
    const { index, unresolved } = buildBookIndex(
      {
        sources: [
          {
            ...phb,
            entries: [
              { title: 'Nonsense', type: 'class', bookPage: 2 },
              { title: 'Made Up Feature', type: 'feature', bookPage: 3, class: 'Cleric', level: 6 },
            ],
          },
        ],
        subclassNotes: [
          { file: 'odd.md', text: odd },
          { file: 'b.md', text: testDomain },
        ],
        subclassImport: [],
      },
      registry,
    );
    expect(unresolved).toContain("phb-2024: class 'Nonsense' — geen id gevonden");
    expect(unresolved).toContain("phb-2024: feature 'Made Up Feature' (Cleric 6) — geen id gevonden");
    expect(unresolved).toContain("phb-2024: subclass 'Test Domain' (Cleric) — geen id gevonden");
    expect(unresolved.some((l) => l.includes('odd.md') && l.includes('Some Other Book'))).toBe(true);
    expect(index.books).toHaveLength(1);
    expect(index.books[0]!.entries.find((e) => e.title === 'Nonsense')!.contentIds).toEqual([]);
  });

  it('keeps going without any hand-made sources', () => {
    const { index, unresolved } = buildBookIndex({ sources: [], subclassNotes: [{ file: 'a.md', text: testDomain }], subclassImport: imports }, registry);
    expect(index.books[0]!.entries.find((e) => e.type === 'subclass')!.parentId).toBeUndefined();
    expect(unresolved.length).toBeGreaterThan(0);
    expect(BookIndexSchema.safeParse(index).success).toBe(true);
  });
});

describe('runBookIndex', () => {
  const repo = resolve(__dirname, '../..');

  it('refuses an output path inside the repo', () => {
    const result = runBookIndex('whatever', join(repo, 'src', 'out.json'), repo, registry);
    expect(result.code).toBe(1);
    expect(result.lines.join('\n')).toMatch(/buiten/);
  });

  it('copes with a missing inhoud folder and writes the file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'boeken-test-'));
    try {
      mkdirSync(join(dir, 'subclasses'));
      writeFileSync(join(dir, 'subclasses', 'a.md'), testDomain);
      const out = join(dir, 'out', 'index.json');
      const result = runBookIndex(dir, out, repo, registry);
      expect(result.code).toBe(0);
      expect(BookIndexSchema.safeParse(JSON.parse(readFileSync(out, 'utf8'))).success).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
