# Eigen boeken lezen in de app — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sam voegt per apparaat zijn eigen PDF's (PHB 2024, Xanathar's, Tasha's) toe en leest ze in een boekenscherm (versie A: hele scherm, zoekbalk + inhoudsopgave links). Vanaf de sheet springt een knop "In boek" naar de juiste pagina. Een privé inhoudsopgave (JSON buiten de repo) levert paginakaart, boom en koppeling naar content-ids.

**Architecture:** Vier lagen. (1) `src/content/books.ts`: pure logica en zod-schema van de inhoudsopgave: boekpagina ↔ pdf-pagina (ook spreads), zoeken, boom, pagina's per content-id. (2) `src/storage/books.ts`: PDF's als Blob in een nieuwe Dexie-tabel `books` (db-versie 2); inhoudsopgave en leesposities in rijen van `settings`. (3) `src/ui/books/`: pdf.js (lazy geladen, leest de Blob in stukken via `PDFDataRangeTransport`), het blok Boeken in Instellingen, het boekenscherm, de knop op de sheet. (4) `scripts/boeken/`: script dat uit Sams privébronnen het importbestand maakt. Daarna een datataak (geen code) waarin Claude de privébronnen vult door de scans te lezen.

**Tech Stack:** React 19, TypeScript strict, Dexie 4, zod 4, `pdfjs-dist@6.4.299` (nieuw, Apache-2.0), Vitest, Playwright, tsx.

**Spec:** `docs/superpowers/specs/2026-10-18-boeken-lezen-design.md` (goedgekeurd door Sam op 2026-10-18). Hoofdspec: `docs/superpowers/specs/2026-10-15-dnd-character-tracker-design.md`.

## Global Constraints

- Werkmap: git-worktree `C:\Users\SamTieland\dev\dnd-tracker-boeken` op branch `boeken`, gemaakt vanaf `main` **nadat** Task 0 `boek-import` in `main` heeft gezet. Nooit in `C:\Users\SamTieland\dev\dnd-tracker` werken (andere sessies gebruiken die checkout), nooit van branch wisselen daar, geen stash/reset/push, git-config niet wijzigen. Merge, `npm ci` en het weghalen van een worktree nooit in één commando aan elkaar rijgen; eerst `git status` van de hoofdcheckout bekijken.
- **Geen boekinhoud in de repo, op GitHub Pages of over het netwerk:** geen PDF, geen pagina-afbeelding, geen tekst, geen titels+paginanummers uit de boeken (ook de inhoudsopgave niet). Tests gebruiken nep-PDF's die ze zelf maken met `pdf-lib` en nep-inhoudsopgaven met verzonnen titels ("Test Book", "Chapter A").
- Eén nieuwe dependency: `pdfjs-dist` exact `6.4.299` (`npm install pdfjs-dist@6.4.299 --save-exact`). Alleen via `await import(...)` in `src/ui/books/pdf.ts`, zodat de hoofdbundel niet groeit.
- Boek-ids exact: `phb-2024`, `xge`, `tce`. Titels: `Player's Handbook (2024)`, `Xanathar's Guide to Everything`, `Tasha's Cauldron of Everything`. Verwachte pdf-pagina's van Sams scans: 387, 196, 194.
- De volledige PDF wordt nooit in één keer in het geheugen gelezen (geen `blob.arrayBuffer()` op het hele bestand, geen `getDocument({ data })`): alleen `blob.slice(begin, end).arrayBuffer()` via `PDFDataRangeTransport`.
- Een canvas is nooit groter dan `MAX_CANVAS_PIXELS = 16_000_000` pixels (grens van iPad Safari); daarboven schaalt CSS de rest.
- Boeken en inhoudsopgave gaan niet mee in export of back-up (`buildBackup` blijft alleen characters + customContent).
- Global Constraints van plan 1B gelden: TypeScript strict zonder `any`; elke zichtbare tekst in `en.json` én `nl.json`; spelregeltermen en boektitels Engels; tikvlakken ≥ 44 px; UI-tests met `// @vitest-environment jsdom` via `src/ui/testing/render.tsx`; opslagtests importeren eerst `fake-indexeddb/auto`; lagenregels uit `src/architecture.test.ts` (content importeert alleen zod en content; storage alleen zod, dexie, storage, model, content).
- Stijl: Herbergtafel-tokens uit `src/ui/styles.css`; geen nieuwe kleuren buiten tokens. Schets: `C:\Users\SamTieland\OneDrive - BASED\Documents\DnD\.superpowers\brainstorm\1993-1792281919\content\boek-weergave-v2.html`.
- Commitberichten in het Nederlands, eindigend met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Auteur is de repo-lokale `user.email` (noreply-adres); nooit `sam@based.co.nl`.
- Itereren met `npx vitest run <pad> --maxWorkers=2`; volledige suite één keer per taak (Bash-timeout 600000 ms), dan `npm run typecheck`, `npm run build`. Basislijn: draai `npm test` aan het begin van Task 1 en noteer het aantal. e2e met een tijdelijke kopie van `playwright.config.ts` op een andere poort dan 4173 (niet committen).

## Review Focus

1. **Boekpagina op de rechterhelft van een spread** (een verzonnen blz. 15 staat rechts op pdf 12): opent pdf 12 en zet de rechterhelft in beeld; de bovenbalk toont "blz. 15". Test: Task 1 (`maps a book page on the right half of a spread`) en Task 5 (`opens a right-hand spread page scrolled to the right half`).
2. **"Ga naar blz." met een pagina die niet bestaat** (0, 999, een ongenummerde plaatpagina, tekst): melding "Pagina N staat niet in dit boek", het boek blijft waar het was. Test: Task 5 (`go to a page that is not in the book`).
3. **"In boek" terwijl het boek niet op dit apparaat staat**: de knop is er, tikken geeft de melding met de weg naar Instellingen → Boeken; nooit stil. Test: Task 6 (`says which book to add when it is missing`).
4. **Opslaan mislukt halverwege (vol, `QuotaExceededError`)**: melding met de reden, geen halve rij, eerdere versie van dat boek blijft. Test: Task 2 (`keeps the old book when saving the new one fails`) en Task 4 (`reports a full device`).
5. **Opnieuw importeren met een andere inhoudsopgave**: vervangt de vorige volledig (geen restjes), meldt onbekende content-ids met aantal. Test: Task 2 (`replaces the previous index`) en Task 4 (`reports content ids the app does not know`).

---

### Task 0: `boek-import` in `main` zetten

De koppeling naar de sheet gebruikt de ids uit `boek/import/subclasses.json`; die ids komen uit `scripts/boek/` op branch `boek-import` (worktree `C:\Users\SamTieland\dev\dnd-tracker-boek`, commits `6d24e40..6292051`). Eerst mergen, zodat het id-schema vastligt.

- [ ] **Step 1:** `git -C C:/Users/SamTieland/dev/dnd-tracker status --short` — leeg verwacht. Niet leeg: stoppen en aan Sam/de hoofdsessie melden (een andere sessie werkt daar).
- [ ] **Step 2:** `git -C C:/Users/SamTieland/dev/dnd-tracker diff main...boek-import --stat` — verwacht alleen `package.json`, `scripts/boek-naar-import.ts`, `scripts/boek/convert.ts`, `scripts/boek/convert.test.ts`.
- [ ] **Step 3:** In `C:\Users\SamTieland\dev\dnd-tracker-boek`: `git merge main` (alleen als `main` voorliep), dan `npm test` (timeout 600000) — alles groen.
- [ ] **Step 4:** In de hoofdcheckout: `git merge --ff-only boek-import` of, als dat niet kan, `git merge --no-ff boek-import -m "Merge branch 'boek-import': script voor eigen subclass-notities"`. Daarna apart: `npm test` — groen.
- [ ] **Step 5:** Worktree voor dit plan: `git -C C:/Users/SamTieland/dev/dnd-tracker worktree add C:/Users/SamTieland/dev/dnd-tracker-boeken -b boeken main`, dan in die map `npm ci`. Worktree `dnd-tracker-boek` en branch `boek-import` laten staan (Sam beslist over opruimen).

---

### Task 1: Inhoudsopgave-model (puur)

**Files:**
- Create: `src/content/books.ts`, `src/content/books.test.ts`

**Interfaces:**
- Consumes: `zod`.
- Produces:

```ts
export const BOOK_IDS = ['phb-2024', 'xge', 'tce'] as const;
export type BookId = (typeof BOOK_IDS)[number];
export const BOOKS: Record<BookId, { title: string; expectedPdfPages: number }>;
// { 'phb-2024': { title: "Player's Handbook (2024)", expectedPdfPages: 387 }, xge: {…196}, tce: {…194} }

export const BOOK_ENTRY_TYPES = ['chapter', 'section', 'class', 'subclass', 'feature', 'spell', 'feat', 'species', 'background'] as const;
export type BookEntryType = (typeof BOOK_ENTRY_TYPES)[number];

/** Een reeks opeenvolgende pdf-pagina's met elk 1 of 2 boekpagina's; de eerste boekpagina van fromPdf is firstBook. */
export interface PageRange { fromPdf: number; toPdf: number; firstBook: number; perPdfPage: 1 | 2 }
export interface BookEntry { id: string; title: string; type: BookEntryType; bookPage: number; parentId?: string; contentIds: string[] }
export interface BookIndexBook { bookId: BookId; pdfPages: number; pageMap: PageRange[]; entries: BookEntry[] }
export interface BookIndex { format: 'dnd-tracker-book-index'; version: 1; books: BookIndexBook[] }
export const BookIndexSchema: z.ZodType<BookIndex>; // strictObject; entry.id uniek per boek; parentId moet bestaan; ranges niet overlappend

export type PdfSpot = { pdfPage: number; half: 'whole' | 'left' | 'right' };
export function toPdfSpot(book: BookIndexBook, bookPage: number): PdfSpot | undefined;
export function toBookPage(book: BookIndexBook, pdfPage: number): { first: number; last: number } | undefined; // spread: { first: 34, last: 35 }
export interface TocNode { entry: BookEntry; children: TocNode[] }
export function tocTree(book: BookIndexBook): TocNode[]; // volgorde: bookPage, dan bestandsvolgorde
export interface SearchHit { bookId: BookId; entry: BookEntry }
export function searchIndex(index: BookIndex, query: string, limit?: number): SearchHit[]; // standaard limit 50
export function spotsFor(index: BookIndex, contentId: string): { bookId: BookId; bookPage: number }[];
export function unknownContentIds(index: BookIndex, known: (id: string) => boolean): string[]; // uniek, gesorteerd
```

- [ ] **Step 1: Schrijf de falende tests** in `src/content/books.test.ts` met een nepboek:

```ts
const tce: BookIndexBook = {
  bookId: 'tce', pdfPages: 20,
  pageMap: [ { fromPdf: 3, toPdf: 10, firstBook: 4, perPdfPage: 1 }, { fromPdf: 11, toPdf: 20, firstBook: 12, perPdfPage: 2 } ],
  entries: [
    { id: 'c1', title: 'Chapter A', type: 'chapter', bookPage: 4, contentIds: [] },
    { id: 's1', title: 'Test Domain', type: 'subclass', bookPage: 14, parentId: 'c1', contentIds: ['user:subclass:x', 'skeleton:subclass:x'] },
    { id: 'f1', title: 'Test Gift', type: 'feature', bookPage: 15, parentId: 's1', contentIds: ['user:feature:x-fill-2'] },
  ],
};
```

  - `maps a single page`: `toPdfSpot(tce, 4)` → `{ pdfPage: 3, half: 'whole' }`; `toPdfSpot(tce, 10)` → `{ pdfPage: 9, half: 'whole' }`.
  - `maps a book page on the left half of a spread`: `toPdfSpot(tce, 12)` → `{ pdfPage: 11, half: 'left' }`; `toPdfSpot(tce, 30)` → `{ pdfPage: 20, half: 'left' }`.
  - (De nep-entries op blz. 14/15 vallen buiten deze paginakaart; voor de tests van Task 5 en 6 die een pagina openen, gebruik `pageMap` `[{ fromPdf: 3, toPdf: 20, firstBook: 2, perPdfPage: 2 }]`, waarmee blz. 14 → pdf 9 links en blz. 15 → pdf 9 rechts.)
  - `maps a book page on the right half of a spread`: `toPdfSpot(tce, 13)` → `{ pdfPage: 11, half: 'right' }`; `toPdfSpot(tce, 31)` → `{ pdfPage: 20, half: 'right' }`.
  - `returns nothing for pages outside the map`: `toPdfSpot(tce, 0)`, `(tce, 3)`, `(tce, 32)`, `(tce, 11)` (gat tussen 10 en 12) → `undefined`; `toBookPage(tce, 1)` → `undefined`.
  - `names the book pages of a pdf page`: `toBookPage(tce, 3)` → `{ first: 4, last: 4 }`; `toBookPage(tce, 11)` → `{ first: 12, last: 13 }`.
  - `searches names case-insensitively across books`: `searchIndex(index, 'tEST dOMAIN')` geeft `s1` en `p1` (beide beginnen met de term), `'gift'` alleen `f1`; volgorde: titels die met de zoekterm beginnen eerst, dan op type-volgorde van `BOOK_ENTRY_TYPES`, dan titel. `searchIndex(index, '  ')` → `[]`. Een term midden in een woord (`'gift'`) vindt ook.
  - `builds the table of contents tree`: `tocTree(tce)` → één wortel `c1` met kind `s1` met kind `f1`.
  - `finds every spot of a content id`: met een tweede boek `phb-2024` dat ook `skeleton:subclass:x` op blz. 20 heeft: `spotsFor(index, 'skeleton:subclass:x')` → `[{ bookId: 'phb-2024', bookPage: 20 }, { bookId: 'tce', bookPage: 14 }]` (volgorde van `BOOK_IDS`).
  - `lists unknown content ids`: `unknownContentIds(index, (id) => id.startsWith('user:'))` → `['skeleton:subclass:x']`.
  - `rejects a broken index`: `BookIndexSchema.safeParse` faalt bij: onbekend `bookId`, `parentId` die niet bestaat, dubbele `entry.id` in één boek, overlappende ranges, `perPdfPage: 3`, extra veld op een entry.

- [ ] **Step 2:** `npx vitest run src/content/books.test.ts` — FAIL (module bestaat niet).
- [ ] **Step 3:** Implementeer `src/content/books.ts`. Spread-rekensom: binnen een range is `offset = bookPage - firstBook`, `pdfPage = fromPdf + floor(offset / perPdfPage)`, `half = perPdfPage === 1 ? 'whole' : offset % 2 === 0 ? 'left' : 'right'`; buiten `[fromPdf, toPdf]` → `undefined`. Zoeken: lowercase + trim, `includes`.
- [ ] **Step 4:** `npx vitest run src/content/books.test.ts` — PASS; `npx vitest run src/architecture.test.ts` — PASS.
- [ ] **Step 5:** Commit: `git add src/content/books.ts src/content/books.test.ts` en `git commit -m "feat: model van de inhoudsopgave van je eigen boeken"`.

---

### Task 2: Opslag van boeken, inhoudsopgave en leesposities

**Files:**
- Modify: `src/storage/db.ts` (versie 2 met tabel `books`)
- Create: `src/storage/books.ts`, `src/storage/books.test.ts`

**Interfaces:**
- Consumes: `BookId`, `BookIndex`, `BookIndexSchema` (Task 1).
- Produces:

```ts
// db.ts
export interface BookRow { bookId: BookId; name: string; size: number; pdfPages: number; blob: Blob; addedAt: string }
// TrackerDb krijgt: books: Table<BookRow, string>;  db.version(2).stores({ characters: 'id', customContent: 'id', settings: 'key', books: 'bookId' })

// books.ts
export type BookMeta = Omit<BookRow, 'blob'>;
export async function saveBook(db: TrackerDb, row: BookRow): Promise<void>; // één put; overschrijft hetzelfde bookId
export async function listBooks(db: TrackerDb): Promise<BookMeta[]>; // volgorde BOOK_IDS
export async function loadBookBlob(db: TrackerDb, bookId: BookId): Promise<Blob | undefined>;
export async function deleteBook(db: TrackerDb, bookId: BookId): Promise<void>; // wist ook de leespositie van dat boek
export type IndexParseResult = { ok: true; index: BookIndex } | { ok: false; reason: 'not-json' | 'wrong-format' | 'newer-version' | 'invalid'; detail?: string };
export function parseBookIndexFile(text: string): IndexParseResult; // BOM toegestaan
export async function saveBookIndex(db: TrackerDb, index: BookIndex): Promise<void>; // settings-rij 'book-index', vervangt volledig
export async function loadBookIndex(db: TrackerDb): Promise<BookIndex | undefined>; // ongeldige rij → undefined
export interface ReadingPosition { pdfPage: number; zoom: number }
export async function loadReading(db: TrackerDb): Promise<{ last?: BookId; positions: Partial<Record<BookId, ReadingPosition>> }>; // settings-rij 'book-reading'
export async function saveReading(db: TrackerDb, bookId: BookId, position: ReadingPosition): Promise<void>; // zet ook last
```

- [ ] **Step 1: Schrijf de falende tests** in `src/storage/books.test.ts` (`import 'fake-indexeddb/auto'` eerst; `openDb('test-' + crypto.randomUUID())`):
  - `stores a book and reads its blob back`: `saveBook` met `new Blob([new Uint8Array([37, 80, 68, 70])])`; `listBooks` → één meta zonder `blob`-veld; `loadBookBlob` → blob met `size === 4`.
  - `opens a version 1 database and keeps its characters`: maak eerst met een losse `new Dexie(name).version(1).stores(...)` een character-rij, sluit, open met `openDb(name)` → character staat er nog, `books` is leeg.
  - `keeps the old book when saving the new one fails`: sla boek A op; stub `db.books.put` zodat hij één keer rejecteert met `new DOMException('full', 'QuotaExceededError')`; `saveBook` rejecteert met die fout; `loadBookBlob` geeft nog boek A.
  - `deletes a book and its reading position`.
  - `replaces the previous index`: sla index met 3 entries op, daarna een met 1 → `loadBookIndex` heeft 1 entry.
  - `parses an index file`: met BOM → ok; `'{'` → `not-json`; `{"format":"other"}` → `wrong-format`; `version: 2` → `newer-version`; kapotte entry → `invalid` met `detail`.
  - `remembers the last book and its page`: `saveReading(db, 'xge', { pdfPage: 12, zoom: 1.5 })` → `loadReading` → `{ last: 'xge', positions: { xge: { pdfPage: 12, zoom: 1.5 } } }`.
- [ ] **Step 2:** `npx vitest run src/storage/books.test.ts` — FAIL.
- [ ] **Step 3:** Implementeer. Settings-rijen met zod `safeParse` lezen (zoals `sheet-template.ts`).
- [ ] **Step 4:** `npx vitest run src/storage` — PASS (ook de bestaande opslagtests op db-versie 2).
- [ ] **Step 5:** Commit: `feat: boeken, inhoudsopgave en leesplek lokaal bewaren`.

---

### Task 3: pdf.js-lader en `ownerId` op features

**Files:**
- Create: `src/ui/books/pdf.ts`, `src/ui/books/pdf.test.ts`, `src/ui/books/testing/fake-pdf.ts`
- Modify: `package.json` (`pdfjs-dist@6.4.299`), `vite.config.ts` (`globPatterns` krijgt `mjs`), `src/rules/types.ts`, `src/rules/features.ts`, de bestaande features-test in `src/rules/`

**Interfaces:**
- Consumes: niets uit eerdere taken.
- Produces:

```ts
// pdf.ts
export const MAX_CANVAS_PIXELS = 16_000_000;
export interface PdfHandle {
  pageCount: number;
  /** Afmetingen van een pagina in PDF-punten. */
  pageSize(pdfPage: number): Promise<{ width: number; height: number }>;
  /** Tekent de pagina op canvas met deze schaal (punten → CSS-pixels) × devicePixelRatio, begrensd door MAX_CANVAS_PIXELS. */
  render(pdfPage: number, canvas: HTMLCanvasElement, cssScale: number): Promise<void>;
  destroy(): Promise<void>;
}
export async function openPdf(blob: Blob): Promise<PdfHandle>; // dynamic import van pdfjs-dist; PDFDataRangeTransport met blob.slice; disableAutoFetch + disableStream
export function canvasScale(cssScale: number, dpr: number, width: number, height: number): number; // puur: grootste schaal ≤ cssScale·dpr met width·height·s² ≤ MAX_CANVAS_PIXELS
// testing/fake-pdf.ts
export async function fakePdf(pages: number, opts?: { spreadFrom?: number }): Promise<Blob>; // pdf-lib, lege pagina's, elke pagina tekst "P<n>"; vanaf spreadFrom dubbel zo breed
// rules/types.ts — ActiveFeature krijgt:
ownerId?: string; // class-, subclass- of species-id van de eigenaar; ontbreekt bij feats en opties
```

- [ ] **Step 1:** `npm install pdfjs-dist@6.4.299 --save-exact`. Worker laden met `import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'` en `GlobalWorkerOptions.workerSrc = workerUrl`. Voeg `mjs` toe aan `workbox.globPatterns` in `vite.config.ts`.
- [ ] **Step 2: Falende tests** in `src/ui/books/pdf.test.ts` (node-omgeving):
  - `limits the canvas to the pixel budget`: `canvasScale(2, 2, 2164, 2800)` → `s` met `2164·2800·s² ≤ 16_000_000` en `s` binnen 1% van die grens; `canvasScale(0.5, 2, 1000, 1000)` → `1`.
  - `counts pages without reading the whole file`: `const blob = await fakePdf(5)`; spy op `Blob.prototype.arrayBuffer`; `(await openPdf(blob)).pageCount === 5`; geen aanroep met `this === blob` (alleen slices). Lukt pdf.js niet in node (worker), zet dan `GlobalWorkerOptions.workerPort`/`isEvalSupported` zoals pdfjs-dist voor node documenteert, of draai deze test in `tests/e2e` in de browser — de eis zelf blijft.
  - In de bestaande features-test: `gives class and subclass features their owner id` — `ownerId` is `srd:class:cleric` voor een Cleric-feature, de subclass-id voor een subclass-feature, de species-id voor een trait, `undefined` voor een feat.
- [ ] **Step 3:** Implementeer `pdf.ts` en vul `ownerId` in `collectFeatures` (`add(id, origin, ownerName, level, ownerId)`).
- [ ] **Step 4:** `npx vitest run src/ui/books src/rules` — PASS; `npm run build` — de worker staat als apart `.mjs`-bestand in `dist/` en is < 5 MB; de hoofd-chunk bevat geen pdfjs (`grep -L GlobalWorkerOptions dist/assets/index-*.js`).
- [ ] **Step 5:** Commit: `feat: pdf.js laden voor de boekenlezer, en de eigenaar bij elke feature`.

---

### Task 4: Blok Boeken in Instellingen

**Files:**
- Create: `src/ui/books/BooksCard.tsx`, `src/ui/books/recognise.ts`, `src/ui/books/BooksCard.test.tsx`
- Modify: `src/ui/settings/SettingsScreen.tsx` (kaart onder `SheetTemplateCard`), `src/i18n/en.json`, `src/i18n/nl.json`

**Interfaces:**
- Consumes: Task 1 (`BOOKS`, `BOOK_IDS`, `unknownContentIds`), Task 2 (alle opslagfuncties), Task 3 (`openPdf`), `requestPersistence` (`src/storage/persist.ts`), `useAppData().registry`.
- Produces:

```ts
// recognise.ts
export function guessBook(fileName: string, pdfPages: number): BookId | undefined; // eerst exact aantal pagina's, dan naam (/phb|player/i, /xanathar/i, /tasha/i)
export function pageMapFits(index: BookIndex | undefined, bookId: BookId, pdfPages: number): boolean; // index-boek bestaat én pdfPages gelijk
/** Na elke wijziging aan boeken of inhoudsopgave: window.dispatchEvent(new Event(BOOKS_CHANGED)). Task 6 luistert. */
export const BOOKS_CHANGED = 'dnd-books-changed';
// BooksCard.tsx
export function BooksCard(): JSX.Element;
```

Gedrag (exacte teksten in beide talen; NL hier):
- Kop **Boeken**; uitleg "Je eigen PDF's blijven alleen op dit apparaat. Ze gaan niet mee in back-ups."
- Per boek in `BOOK_IDS`-volgorde een regel: titel, "niet op dit apparaat" of bestandsnaam + grootte in MB (1 decimaal) + "Verwijderen".
- Knop **Boek toevoegen** → bestandskiezer (`accept=".pdf,application/pdf"`, `data-testid="book-input"`) → `openPdf` telt pagina's → dialoog "Welk boek is dit?" met keuzelijst voorgeselecteerd op `guessBook` en knop **Bewaren**. Staat dat boek er al: tekst "Dit vervangt <bestandsnaam>".
- Bij het eerste bewaarde boek: `requestPersistence(navigator.storage)`. Regel onder de lijst: "Gebruikt: X MB van Y MB" (`navigator.storage.estimate`, weglaten als niet beschikbaar) en "Opslag blijvend: ja/nee" (`navigator.storage.persisted`).
- Knop **Inhoudsopgave importeren** (`data-testid="book-index-input"`, `accept=".json,application/json"`) → `parseBookIndexFile` → bij succes `saveBookIndex`, toast "Inhoudsopgave geïmporteerd: N onderdelen", en als `unknownContentIds(index, (id) => registry.get(id) !== undefined)` niet leeg is een blijvende melding "N onderdelen niet gevonden in de app" met de ids in een uitklapper. Bij een fout de reden per `reason`.
- Voor elk aanwezig boek waarvoor `pageMapFits` false is: waarschuwing "Deze PDF heeft P pagina's; de inhoudsopgave verwacht Q. Je kunt hem lezen, maar zonder inhoudsopgave en zonder knoppen vanaf je sheet."

- [ ] **Step 1: Falende tests** in `BooksCard.test.tsx` (jsdom; `vi.mock('./pdf', …)` zodat `openPdf` `{ pageCount }` geeft):
  - `adds a book after confirming which one it is`: bestand "Tasha's Cauldron of Everything.pdf" met 194 pagina's → keuzelijst staat op Tasha's → Bewaren → regel toont de bestandsnaam; `listBooks` heeft `tce`.
  - `lets the player pick another book`: onbekende naam, 200 pagina's → geen voorselectie; kiest PHB → bewaard als `phb-2024`.
  - `reports a full device`: `saveBook` gemockt met `QuotaExceededError` → toast met "te weinig ruimte"; niets in de lijst.
  - `imports the table of contents`, `reports content ids the app does not know` (index met `contentIds: ['user:feature:bestaat-niet']` → "1 onderdeel niet gevonden"), `rejects a file that is not an index`.
  - `warns when the pdf does not match the index`: index verwacht 194, bewaard boek heeft 200 → waarschuwing.
  - `removes a book`.
  - `guessBook` en `pageMapFits` krijgen eigen kleine tests in `recognise.ts`-test of in hetzelfde bestand.
- [ ] **Step 2:** `npx vitest run src/ui/books/BooksCard.test.tsx` — FAIL.
- [ ] **Step 3:** Implementeer.
- [ ] **Step 4:** `npx vitest run src/ui/books src/ui/settings src/i18n` — PASS.
- [ ] **Step 5:** Commit: `feat: boeken toevoegen en de inhoudsopgave importeren in Instellingen`.

---

### Task 5: Het boekenscherm

**Files:**
- Modify: `src/ui/router.ts` (+ `router.test.ts`), `src/ui/App.tsx`, `src/ui/list/CharacterList.tsx` (link **Boeken** naast Instellingen), `src/i18n/*.json`
- Create: `src/ui/books/BookReader.tsx`, `src/ui/books/BookSidePanel.tsx`, `src/ui/books/PageView.tsx`, `src/ui/books/reader-logic.ts`, `src/ui/books/books.css`, `src/ui/books/BookReader.test.tsx`, `src/ui/books/reader-logic.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 2, Task 3 (`openPdf`, `PdfHandle`), Task 4 (`pageMapFits`), `NARROW_QUERY` en `useMediaQuery` (zoals `Sheet.tsx`).
- Produces:

```ts
// router.ts
export type Route = … | { name: 'books'; bookId?: BookId; bookPage?: number };
// '#/books' · '#/books/tce' · '#/books/tce/34' ; bookId buiten BOOK_IDS → { name: 'books' }; bookPage geen positief geheel getal → weglaten
export function backHrefFromBooks(): string; // laatste hash die geen #/books was (module-variabele, bijgewerkt bij hashchange), anders '#/'
// reader-logic.ts
export const ZOOM_STEPS = [1, 1.25, 1.5, 2, 2.5, 3, 4] as const; // 1 = paginabreedte past in de leesruimte
export function fitScale(pageWidthPt: number, viewWidthPx: number): number;
export function scrollForHalf(half: 'whole' | 'left' | 'right', renderedWidthPx: number, viewWidthPx: number): number; // left/whole → 0, right → renderedWidth − viewWidth (≥ 0)
export function parseGoTo(input: string): number | undefined; // positief geheel getal na trim, anders undefined
// BookReader.tsx
export function BookReader(props: { bookId?: BookId; bookPage?: number }): JSX.Element;
```

Gedrag (schets versie A met zoekbalk):
- Bovenbalk: **← Terug** (`href={backHrefFromBooks()}`), boekkeuze (keuzelijst met aanwezige boeken), "blz. 14" of "blz. 14–15" (spread, via `toBookPage`) of "pdf-blz. 12" (geen passende index), vorige/volgende (per pdf-pagina), veld **Ga naar blz.**, zoom − / +.
- Links het zijpaneel: zoekveld (label "Zoeken in je boeken"); leeg → `tocTree` van het huidige boek, ingeklapt per niveau op hoofdstukken, uitklapbaar; met tekst → `searchIndex` over alle boeken (titel, boektitel, soort, "blz. N"); resultaten van boeken die niet op dit apparaat staan grijs met "niet op dit apparaat". Tikken → navigeer naar `#/books/<bookId>/<bookPage>`. Op smal scherm (`NARROW_QUERY`): paneel ingeklapt achter knop **Inhoud / zoeken**, schuift over de pagina, sluit na een keuze.
- Pagina: `PageView` rendert alleen de huidige pdf-pagina (één canvas; vorige canvas wordt vrijgegeven); breedte = `fitScale × zoom`; bij `half: 'right'` horizontaal scrollen met `scrollForHalf`. Vegen links/rechts (> 60 px, alleen bij zoom 1) bladert; knijpen (twee pointers) zet zoom op de dichtstbijzijnde `ZOOM_STEPS`-waarde bij loslaten.
- Leesplek: elke paginawissel/zoom → `saveReading` (debounce 500 ms). `#/books` zonder boek → `loadReading().last`, anders het eerste aanwezige boek; zonder `bookPage` → opgeslagen `pdfPage`, anders pdf 1.
- Geen boeken op het apparaat: uitleg + link naar `#/settings`. Gevraagd boek ontbreekt: "<titel> staat niet op dit apparaat" + link naar Instellingen. Geen passende index: inhoud/zoeken toont "Geen inhoudsopgave voor deze PDF", Ga naar blz. werkt op pdf-pagina's.
- `pdfjs` pas laden als het scherm opent (`openPdf` binnen een effect); `destroy()` bij wisselen van boek en bij verlaten.

- [ ] **Step 1: Falende tests.** `reader-logic.test.ts`: `fitScale(1000, 800) === 0.8`; `scrollForHalf('right', 1600, 800) === 800`, `('left', 1600, 800) === 0`, `('right', 600, 800) === 0`; `parseGoTo(' 34 ') === 34`, `parseGoTo('0')`, `('-3')`, `('3a')`, `('')` → `undefined`. `router.test.ts`: de drie hashes hierboven, `#/books/onbekend` → `{ name: 'books' }`, `#/books/tce/abc` → `{ name: 'books', bookId: 'tce' }`, `hrefFor` terug; `backHrefFromBooks` na `#/c/abc` → `#/books/tce` geeft `#/c/abc`. `BookReader.test.tsx` (jsdom, `vi.mock('./pdf')` met een nep-`PdfHandle` die `render`-aanroepen registreert; index + boek via de opslagfuncties):
  - `shows how to add books when there are none`.
  - `opens the requested book page`: `#/books/tce/13` met nepindex → `render` met pdf 11; bovenbalk "blz. 12–13".
  - `opens a right-hand spread page scrolled to the right half`: zelfde, scrollLeft van de leesruimte = `scrollForHalf('right', …)`.
  - `go to a page that is not in the book`: "999" → melding "Pagina 999 staat niet in dit boek"; `render` niet opnieuw aangeroepen.
  - `searches all books and opens a hit`: typ "test" → hit "Test Gift · Tasha's · blz. 15" → klik → hash `#/books/tce/15`.
  - `marks hits in books that are not on this device`.
  - `remembers where you were`: blader naar volgende, wacht debounce → `loadReading` heeft `pdfPage` + 1; opnieuw openen op `#/books` → dezelfde pagina.
  - `reads by pdf page when the index does not fit`: bewaard boek met 200 pagina's, index verwacht 194 → "pdf-blz. 1", melding in het paneel.
  - `folds the side panel on a narrow screen`: `setMatchMedia((q) => q === NARROW_QUERY)` → paneel verborgen tot **Inhoud / zoeken**.
- [ ] **Step 2:** `npx vitest run src/ui/books src/ui/router.test.ts` — FAIL.
- [ ] **Step 3:** Implementeer; route in `Screen()` van `App.tsx`; `books.css` met tokens uit `styles.css`.
- [ ] **Step 4:** `npx vitest run src/ui` — PASS.
- [ ] **Step 5:** Commit: `feat: boekenscherm met zoekbalk en inhoudsopgave`.

---

### Task 6: Knop "In boek" op de sheet

**Files:**
- Create: `src/ui/books/BookLink.tsx`, `src/ui/books/use-book-index.ts`, `src/ui/books/BookLink.test.tsx`
- Modify: `src/ui/sheet/FeaturesTab.tsx`, `src/ui/sheet/feature-groups.ts` (`FeatureGroup` krijgt `ownerId?: string` uit de eerste feature), `src/i18n/*.json`

**Interfaces:**
- Consumes: Task 1 `spotsFor`, `BOOKS`; Task 2 `loadBookIndex`, `listBooks`; Task 3 `ActiveFeature.ownerId`; Task 4 `pageMapFits`, `BOOKS_CHANGED`; Task 5 `hrefFor({ name: 'books', … })`. Let op: op de sheet is `feature.id` de id van het doel (een skelet houdt zijn id als een eigen subclass hem aanvult, zie `src/content/registry.ts`); daarom zet het script van Task 7 ook de `fills`-ids in `contentIds`.
- Produces:

```ts
// use-book-index.ts — laadt index + listBooks bij mount en opnieuw bij het window-event BOOKS_CHANGED (Task 4)
export function useBookIndex(): { index?: BookIndex; present: ReadonlySet<BookId>; fits: (bookId: BookId) => boolean };
// BookLink.tsx
export function BookLink(props: { contentIds: string[]; label: string }): JSX.Element | null;
```

Gedrag:
- `spotsFor` over alle `contentIds`, ontdubbeld; alleen spots van boeken waarvoor `fits` waar is of die niet aanwezig zijn tellen mee. Geen spots → `null`.
- Eén spot, boek aanwezig: link **In boek** (aria-label "Lees <label> in <titel>, blz. N") naar `#/books/<id>/<blz>`.
- Meer spots: knop **In boek** opent een klein menu met per spot "<titel> blz. N"; spots van ontbrekende boeken grijs.
- Boek ontbreekt (enige spot): knop blijft; tikken → toast "Voeg <titel> toe in Instellingen → Boeken" met link.
- Plaats: rechts naast elke groepstitel in `FeaturesTab` voor groepen met `ownerId` (class, subclass, species; `contentIds: [ownerId]`), en bovenaan de opengeklapte tekst van elke feature (`contentIds: [feature.id]`), niet in `<summary>` (dat zou het uitklappen storen).

- [ ] **Step 1: Falende tests** in `BookLink.test.tsx` (en één in `Sheet.test.tsx`):
  - `links to the page of a feature` (één spot, boek aanwezig → `href` `#/books/tce/35`).
  - `offers a choice when a feature is in two books`.
  - `says which book to add when it is missing`.
  - `shows nothing without a known page`.
  - `hides spots of a book whose pdf does not fit the index`.
  - Sheet: `shows In boek next to the subclass and inside a feature` met een character met nepindex-koppeling.
- [ ] **Step 2:** `npx vitest run src/ui/books/BookLink.test.tsx src/ui/sheet` — FAIL.
- [ ] **Step 3:** Implementeer.
- [ ] **Step 4:** `npx vitest run src/ui` — PASS.
- [ ] **Step 5:** Commit: `feat: knop In boek bij features en subclass op de sheet`.

---

### Task 7: Script voor de privé inhoudsopgave

**Files:**
- Create: `scripts/boeken/build-index.ts`, `scripts/boeken/build-index.test.ts`, `scripts/boeken-inhoud.ts`
- Modify: `package.json` (script `"boeken": "tsx scripts/boeken-inhoud.ts"`)

**Interfaces:**
- Consumes: Task 1 (`BookIndex`, `BookIndexSchema`, `BOOKS`); `loadBuiltinContent`, `createRegistry`, `slugify`; het formaat van `boek/subclasses/*.md` (kop met `class`, `subclass`, `bron`, `pagina`; feature-koppen `## Level N: Naam`, zie `scripts/boek/convert.ts`); het importbestand `boek/import/subclasses.json` (items met `id`, `type`, `name`, optioneel `fills`).
- Produces:

```ts
/** Handgemaakte bron per boek, in boek/inhoud/<bookId>.json (privé). */
export interface BookSource {
  bookId: BookId; pdfPages: number; pageMap: PageRange[];
  entries: { title: string; type: BookEntryType; bookPage: number; parent?: string /* title van de ouder */; class?: string; level?: number }[];
}
export interface BuildInput { sources: BookSource[]; subclassNotes: { file: string; text: string }[]; subclassImport: { id: string; type: string; name: string; fills?: string }[] }
export interface BuildResult { index: BookIndex; unresolved: string[] /* leesbare regels: "tce: feature 'X' (Cleric 6) — geen id gevonden" */ }
export function buildBookIndex(input: BuildInput, registry: ContentRegistry): BuildResult;
```

Regels:
- Elke `BookSource`-entry wordt een `BookEntry`; `id` = `slugify(type + '-' + title)` met `-2`, `-3` bij dubbel; `parent` → `parentId` via titel binnen hetzelfde boek.
- Uit elke subclass-notitie: een `subclass`-entry (titel = `subclass`, `bookPage` = `pagina`, ouder = de class-entry met titel `class` in dat boek, als die er is) en per featurekop een `feature`-entry met dezelfde `bookPage` (de notities hebben geen pagina per feature) en `level`. `bron` → boek: `PHB 2024` → `phb-2024`, `Xanathar's` → `xge`, `Tasha's` → `tce`.
- `contentIds`: class → `srd:class:<slug>` als de registry die kent; class-feature (met `class` + `level`) → ids uit `registry` van die class op dat level met dezelfde naam (`slugify` vergelijken); subclass → id van het `subclassImport`-item met die naam (XGE/TCE: naam `"<subclass> (<boek>)"` zoals de converter maakt) plus zijn `fills`, of de SRD-subclass-id; subclass-feature → de import-ids van die subclass op dat level plus hun `fills`. Niet gevonden → lege `contentIds` en een regel in `unresolved`.
- De uitvoer gaat door `BookIndexSchema.parse`.
- CLI `npm run boeken -- "<boekmap>" "<out.json>"`: leest `<boekmap>/inhoud/*.json`, `<boekmap>/subclasses/*.md`, `<boekmap>/import/subclasses.json`; schrijft `out.json`; print `unresolved`; **weigert** (exit 1, melding) als `out.json` binnen de repo ligt (zelfde controle als `scripts/boek-naar-import.ts`).

- [ ] **Step 1: Falende tests** in `build-index.test.ts` met verzonnen bronnen (één class "Cleric" uit de SRD, een nepsubclass-notitie, een nepimport):
  - `links a class and its SRD features` (Cleric-entry krijgt `srd:class:cleric`; feature "Spellcasting" level 1 krijgt de SRD-feature-id).
  - `adds subclasses and their features from the notes` (page uit `pagina`, ouder = class-entry, `contentIds` = import-id + `fills`).
  - `names the Xanathar's and Tasha's subclasses like the converter`.
  - `reports what it could not link`.
  - `refuses an output path inside the repo` (CLI-functie apart exporteren en testen).
- [ ] **Step 2:** `npx vitest run scripts/boeken` — FAIL.
- [ ] **Step 3:** Implementeer.
- [ ] **Step 4:** `npx vitest run scripts` — PASS; volledige suite, `npm run typecheck`, `npm run build`.
- [ ] **Step 5:** Commit: `feat: script dat de privé inhoudsopgave van je boeken maakt`.

---

### Task 8: De privé inhoudsopgave vullen (datataak, geen code, niets in de repo)

Door Claude in de hoofdsessie, niet door een subagent zonder deze context. Alles in `C:\Users\SamTieland\OneDrive - BASED\Documents\DnD\boek\`. Pagina's renderen met `boek/_tools/render.py` (zie `boek/_tools/WERKINSTRUCTIE.md`), PNG's in de scratchpad, nooit in OneDrive of de repo. Nooit cijfers op gok lezen.

- [ ] **Step 1: Paginakaarten.** PHB: één range (`pdf = boek − 1`), begin en eind controleren aan de voettekst van de eerste en laatste genummerde pagina. Xanathar's en Tasha's: alle pdf-pagina's renderen op lage dpi (≈ 40), per pagina enkel/spread en het voetnummer noteren; ranges vormen; elke overgang tussen enkel en spread op hogere dpi nacontroleren. Ongenummerde pagina's (omslag, platen) vallen buiten de ranges.
- [ ] **Step 2: Hoofdstukken, secties, classes en class-features** uit de inhoudsopgave van elk boek (en voor PHB-class-features de levelkoppen in elk class-hoofdstuk), met `class`/`level` bij features. Schrijf `boek/inhoud/phb-2024.json`, `xge.json`, `tce.json` in het `BookSource`-formaat.
- [ ] **Step 3:** In de worktree: `npm run boeken -- "C:/Users/SamTieland/OneDrive - BASED/Documents/DnD/boek" "C:/Users/SamTieland/OneDrive - BASED/Documents/DnD/boek/import/boeken-inhoud.json"`. Elke regel van `unresolved` oplossen in de bron of in `boek/INDEX.md` noteren waarom het ongekoppeld blijft.
- [ ] **Step 4: Steekproef.** Tien willekeurige entries (minstens drie op een spread-rechterhelft) renderen via de paginakaart en controleren dat de kop op die pagina staat.
- [ ] **Step 5:** `boek/README.md` aanvullen met een korte alinea over `inhoud/` en het commando. Spells, feats, species en backgrounds komen later (besluit Sam); het formaat ondersteunt ze al.

---

### Task 9: e2e, offline en oplevering

**Files:**
- Modify: `tests/e2e/app.spec.ts`

- [ ] **Step 1: e2e-test** `read a book from the sheet`: maak met `pdf-lib` in de test een PDF van 20 pagina's en een nepindex (bookId `tce`, `pdfPages: 20`, een entry met de id van een SRD-Cleric-feature); Instellingen → Boek toevoegen (kies Tasha's) → Inhoudsopgave importeren → maak een Cleric → tab Features → open de feature → **In boek** → het boekenscherm toont de goede "blz."; **← Terug** brengt je terug naar de sheet; herlaad de pagina → het boek staat er nog.
- [ ] **Step 2:** e2e draaien met een tijdelijke config op een andere poort — groen. `npm run build` en controleer dat `dist/sw.js` de pdf-worker precachet (`grep pdf.worker dist/sw.js`).
- [ ] **Step 3:** Volledige suite, `npm run typecheck`, `npm run build` — groen. Commit: `test: boek lezen vanaf de sheet, van begin tot eind`.
- [ ] **Step 4:** Eindreview van de branch, daarna met Sams OK `main` fast-forwarden en pushen (publiceert via de workflow "Testen en publiceren").
- [ ] **Step 5:** Sam test op de iPad als geïnstalleerde PWA: alle drie de boeken toevoegen, `boeken-inhoud.json` importeren, een subklasse openen vanaf Grobbs sheet (na zijn level 3) of via zoeken, bladeren en knijpen, app sluiten en heropenen (leesplek en boeken nog aanwezig), vliegtuigmodus (lezen werkt offline). Bevindingen worden een vervolgtaak.
