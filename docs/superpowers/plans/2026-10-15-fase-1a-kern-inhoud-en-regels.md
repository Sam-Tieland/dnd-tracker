# Fase 1A: kern (spelinhoud en rules-motor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een geteste TypeScript-kern bouwen met alle SRD 5.2.1-spelinhoud als data, de subclass-skeletten en een rules-motor (`deriveSheet`) die van een opgeslagen character een volledig berekende sheet maakt, inclusief multiclassing, rests en dobbelstenen.

**Architecture:** Een Node-script zet de vastgepinde SRD-Markdown om naar gevalideerde JSON (`src/content/srd/generated`). Met de hand geschreven overlays voegen class-mechaniek en effecten toe. Een `ContentRegistry` bundelt ingebouwde en eigen inhoud. De rules-motor bestaat uit pure functies zonder I/O: `deriveSheet(character, registry)` en state-acties (schade, rests). Dobbelstenen staan los in `src/dice`.

**Tech Stack:** Node 24, TypeScript (strict), Vite, React (alleen app-shell in deze fase), Zod 4, Vitest, tsx.

**Spec:** `docs/superpowers/specs/2026-10-15-dnd-character-tracker-design.md`

## Plaats in fase 1

Fase 1 uit de spec is opgesplitst in twee plannen, omdat het anders één document van duizenden regels wordt dat niemand echt kan reviewen:

- **1A (dit plan): kern.** Spelinhoud, rules-motor, dobbelstenen. Alles getest, nog geen schermen.
- **1B (volgend plan, geschreven zodra 1A klaar is): app.** Opslag (Dexie), export/import, i18n, thema, characterlijst, aanmaakformulier, sheet (hybride), bibliotheek, instellingen en credits, ongedaan maken, PWA en offline, end-to-end-tests, GitHub Pages.

1B bouwt op de echte interfaces uit 1A, daarom wordt het pas daarna uitgeschreven.

## Global Constraints

- Werkmap: `C:\Users\SamTieland\dev\dnd-tracker` (buiten OneDrive). In Git Bash: `/c/Users/SamTieland/dev/dnd-tracker`. Alle commando's draaien vanuit die map.
- Spelregels: D&D 5e 2024, bron is **SRD 5.2.1** (CC-BY-4.0), de nieuwste versie van de SRD 5.2 die de spec noemt. De bron is vastgepind op commit `1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4` van `github.com/downfallx/dnd-5e-srd-markdown`.
- Bestanden in `vendor/srd-5.2.1/` worden nooit met de hand gewijzigd. JSON in `src/content/srd/generated/` ontstaat alleen via `npm run convert:srd`.
- Niets uit geheugen: getallen en regels komen uit de SRD-bestanden. De enige uitzonderingen, allemaal gemarkeerd met `PHB` in de code: de namen van de 36 skelet-subclasses, dat Eldritch Knight en Arcane Trickster third-casters met INT zijn, en de afronding voor third-casters (enkel: naar boven, multiclass: naar beneden).
- Geen PHB-teksten in de repository; skeletten hebben lege namen en teksten.
- Spelregelteksten en -termen blijven Engels.
- TypeScript `strict`, geen `any`.
- `src/rules` bevat alleen pure functies: geen `Date`, geen opslag, geen willekeur. `deriveSheet` gooit nooit een fout door ontbrekende inhoud, maar geeft `warnings` terug.
- Commit-berichten eindigen met de regel `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

Vijf situaties die de spec impliceert en die een gebruiker het eerst zou raken. Elke regel heeft een test in de genoemde task.

1. **Net aangemaakt character** zonder levels, species of background: de sheet moet gewoon rekenen (PB +2, HP 0, AC 10, speed 30) en niet crashen. Test in Task 12.
2. **Inhoud die niet meer bestaat** (verwijderde homebrew, onbekende ID's voor class, species, feat of spell): `warnings` met `unknown-content`, verder rekenen. Tests in Task 12 en 13.
3. **Stand boven het nieuwe maximum** nadat een level is weggehaald (gebruikte slots, resources, hit dice of HP boven het maximum): de sheet toont begrensde waarden en rests zetten de stand recht. Tests in Task 13 en 14.
4. **Gekozen skelet-subclass die nog niet is aangevuld**: placeholder-features verschijnen, spellcasting van Eldritch Knight werkt toch. Test in Task 13.
5. **Rare dobbelsteeninvoer** (spaties, hoofdletter D, negatieve termen, `1000d6`, lege invoer): netjes geparsed of een `DiceError`, nooit een vastloper. Tests in Task 15.

## Bestandsstructuur

```
dnd-tracker/
  package.json, tsconfig.json, vite.config.ts, index.html, .gitignore, .gitattributes
  docs/superpowers/specs/…, docs/superpowers/plans/…   kopie van spec en plannen
  vendor/srd-5.2.1/          vastgepinde SRD-Markdown + LICENSE + SOURCE.md
  scripts/convert-srd/
    markdown.ts              secties, **Label:**-velden, toInt
    tables.ts                HTML-tabellen uit de Markdown
    vendor.ts                vendor-bestanden lezen
    classes.ts               classes, subclasses, class- en optie-features
    spells.ts                spells
    origins.ts               species (+ traits als features) en backgrounds
    feats.ts                 feats
    equipment.ts             wapens, armor, adventuring gear
    magic-items.ts           magische items
    convert.ts               alles omzetten + schema's per uitvoerbestand
    index.ts                 CLI: valideren en JSON schrijven
  src/
    main.tsx, App.tsx        minimale app-shell (1B vervangt dit)
    content/
      ids.ts                 slugify, contentId
      constants.ts           abilities, skills, condities
      schema.ts              Zod-schema's en types voor alle inhoud
      srd/generated/*.json   uitvoer van de converter (gecommit)
      srd/class-mechanics.ts handmatige class-mechaniek per class
      srd/effects.ts         handmatige effecten per feature/feat
      skeletons.ts           36 skelet-subclasses
      registry.ts            ContentRegistry (ingebouwd + eigen inhoud)
      load.ts                ingebouwde inhoud samenstellen
    model/character.ts       Character-schema en createCharacter
    rules/
      types.ts               DerivedSheet en deeltypes
      warnings.ts            waarschuwingen zonder dubbelingen
      formula.ts             Formula uitrekenen
      levels.ts              proficiency bonus, class-levels
      abilities.ts           ability scores en modifiers
      features.ts            actieve features en feats verzamelen
      bonuses.ts             uitrusting en bonussen per doel
      proficiencies.ts       saves, skills, armor, wapens
      checks.ts              saves, skills, initiative, passive Perception
      combat.ts              HP, hit dice, AC, speed, wapenaanvallen
      spellcasting.ts        casters, spell slots, pact magic, cantrips
      resources.ts           resources met maximum en stand
      multiclass.ts          multiclass-vereisten
      derive.ts              deriveSheet
      actions.ts             schade, healing, slots, resources, rests
      testing/fixtures.ts    registry en characters voor tests
    dice/dice.ts             dobbelstenen
```

---

### Task 1: Project opzetten en ID-helpers

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `.gitattributes`, `src/main.tsx`, `src/App.tsx`
- Create: `src/content/ids.ts`
- Test: `src/content/ids.test.ts`
- Copy: spec en dit plan naar `docs/superpowers/`

**Interfaces:**
- Consumes: niets.
- Produces: `slugify(name: string): string`, `type ContentSource = 'srd' | 'skeleton' | 'user'`, `contentId(source: ContentSource, type: string, ...parts: Array<string | number>): string`. Scripts: `npm test`, `npm run typecheck`, `npm run build`, `npm run convert:srd` (gebruikt vanaf Task 7).

- [ ] **Step 1: Map en package.json maken**

```bash
mkdir -p /c/Users/SamTieland/dev/dnd-tracker && cd /c/Users/SamTieland/dev/dnd-tracker && git init
```

Maak `package.json`:

```json
{
  "name": "dnd-tracker",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc",
    "test": "vitest run",
    "convert:srd": "tsx scripts/convert-srd/index.ts"
  }
}
```

- [ ] **Step 2: Dependencies installeren**

```bash
npm install react react-dom zod
npm install -D typescript vite @vitejs/plugin-react vitest tsx @types/react @types/react-dom @types/node
```

Expected: beide commando's eindigen zonder `ERR!`. Controleer dat `zod` versie 4 is: `npm ls zod` toont `zod@4.x`.

- [ ] **Step 3: Config-bestanden schrijven**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "scripts", "vite.config.ts"]
}
```

`vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/dnd-tracker/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
```

`index.html`:

```html
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>D&amp;D Character Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx` (de echte app-shell komt in plan 1B):

```tsx
export function App() {
  return <h1>D&amp;D Character Tracker</h1>;
}
```

`.gitignore`:

```
node_modules/
dist/
.superpowers/
*.log
```

`.gitattributes` (houdt de SRD-bestanden en JSON byte-gelijk op Windows):

```
* text=auto eol=lf
```

- [ ] **Step 4: De falende test voor de ID-helpers schrijven**

`src/content/ids.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { contentId, slugify } from './ids';

describe('slugify', () => {
  it.each([
    ["Monk's Focus", 'monks-focus'],
    ['Lay On Hands', 'lay-on-hands'],
    ['Path of the Berserker', 'path-of-the-berserker'],
    ['Mystic Arcanum (level 6 spell)', 'mystic-arcanum-level-6-spell'],
    ['  Sleight of Hand ', 'sleight-of-hand'],
    ['Dark One’s Own Luck', 'dark-ones-own-luck'],
    ['Bottle, Glass', 'bottle-glass'],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('contentId', () => {
  it('joins source, type and slugged parts', () => {
    expect(contentId('srd', 'class', 'Barbarian')).toBe('srd:class:barbarian');
    expect(contentId('srd', 'feature', 'barbarian', 1, 'Rage')).toBe('srd:feature:barbarian:1:rage');
    expect(contentId('skeleton', 'subclass', 'Battle Master')).toBe('skeleton:subclass:battle-master');
  });
});
```

- [ ] **Step 5: Test draaien en zien falen**

Run: `npm test -- src/content/ids.test.ts`
Expected: FAIL, `Failed to resolve import "./ids"`.

- [ ] **Step 6: ID-helpers implementeren**

`src/content/ids.ts`:

```ts
export type ContentSource = 'srd' | 'skeleton' | 'user';

/** Lowercase ASCII slug: "Monk's Focus" -> "monks-focus". */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Stable content id such as "srd:feature:barbarian:1:rage". Numbers are kept as-is, strings are slugged. */
export function contentId(source: ContentSource, type: string, ...parts: Array<string | number>): string {
  return [source, type, ...parts.map((part) => (typeof part === 'number' ? String(part) : slugify(part)))].join(':');
}
```

- [ ] **Step 7: Tests, typecheck en build draaien**

Run: `npm test && npm run typecheck && npm run build`
Expected: tests PASS (8 tests), typecheck zonder fouten, build schrijft `dist/`.

- [ ] **Step 8: Spec en plan kopiëren en committen**

```bash
mkdir -p docs/superpowers/specs docs/superpowers/plans
cp "/c/Users/SamTieland/OneDrive - BASED/Documents/DnD/docs/superpowers/specs/2026-10-15-dnd-character-tracker-design.md" docs/superpowers/specs/
cp "/c/Users/SamTieland/OneDrive - BASED/Documents/DnD/docs/superpowers/plans/2026-10-15-fase-1a-kern-inhoud-en-regels.md" docs/superpowers/plans/
git add -A
git commit -m "chore: project opzetten met Vite, React, TypeScript en Vitest" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: SRD-bron vastleggen en Markdown-hulpfuncties

**Files:**
- Create: `vendor/srd-5.2.1/` (7 Markdown-bestanden, `LICENSE`, `SOURCE.md`)
- Create: `scripts/convert-srd/markdown.ts`, `scripts/convert-srd/tables.ts`, `scripts/convert-srd/vendor.ts`
- Test: `scripts/convert-srd/markdown.test.ts`, `scripts/convert-srd/tables.test.ts`

**Interfaces:**
- Consumes: niets.
- Produces:
  - `markdown.ts`: `interface Section { title: string; body: string }`, `splitSections(md: string, depth: number): Section[]`, `requireSection(sections: Section[], match: string | RegExp, context: string): Section`, `field(md: string, label: string): string | undefined`, `requireField(md: string, label: string, context: string): string`, `withoutFields(md: string, labels: string[]): string`, `toInt(text: string | undefined): number`.
  - `tables.ts`: `interface Cell { text: string; colspan: number; header: boolean }`, `interface Table { head: Cell[][]; body: Cell[][] }`, `stripTags(html: string): string`, `parseTables(md: string): Table[]`, `tableAfter(md: string, caption: string): Table`, `isSectionRow(row: Cell[]): boolean`.
  - `vendor.ts`: `VENDOR_DIR: string`, `readVendor(file: string): string` (geeft altijd LF-regeleinden).

- [ ] **Step 1: SRD-bestanden downloaden op de vastgepinde commit**

```bash
mkdir -p vendor/srd-5.2.1
SHA=1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4
for f in classes.md spells.md character-origins.md feats.md equipment.md magic-items.md playing-the-game.md LICENSE; do
  curl -sfL "https://raw.githubusercontent.com/downfallx/dnd-5e-srd-markdown/$SHA/$f" -o "vendor/srd-5.2.1/$f" || echo "FAILED $f"
done
wc -c vendor/srd-5.2.1/*
```

Expected: geen `FAILED`. Groottes in bytes: `classes.md` 298277, `spells.md` 325687, `character-origins.md` 17267, `feats.md` 7623, `equipment.md` 72402, `magic-items.md` 244314, `LICENSE` 1574. (`playing-the-game.md` is alleen nodig voor de skills-tabel.)

- [ ] **Step 2: Bron vastleggen in SOURCE.md**

`vendor/srd-5.2.1/SOURCE.md`:

```md
# Bron van deze map

- Inhoud: System Reference Document 5.2.1 van Wizards of the Coast, omgezet naar Markdown door de community.
- Repository: https://github.com/downfallx/dnd-5e-srd-markdown
- Commit: 1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4
- Gedownload: 2026-10-15
- Licentie: Creative Commons Attribution 4.0 International, zie `LICENSE` in deze map.

Wijzig deze bestanden niet met de hand. Een nieuwe versie: nieuwe commit kiezen, alles opnieuw downloaden, `npm run convert:srd` draaien en de tests laten slagen.

Het Credits-scherm (plan 1B) neemt de attributietekst letterlijk over van de pagina "Legal Information" in de officiële SRD 5.2.1-PDF.
```

- [ ] **Step 3: De falende tests voor de hulpfuncties schrijven**

`scripts/convert-srd/markdown.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { field, requireField, requireSection, splitSections, toInt, withoutFields } from './markdown';

const sample = ['intro', '## A', 'a body', '### A1', 'a1 body', '## B', 'b body'].join('\n');

describe('splitSections', () => {
  it('splits at the given depth only', () => {
    const parts = splitSections(sample, 2);
    expect(parts.map((p) => p.title)).toEqual(['', 'A', 'B']);
    expect(parts[1].body).toBe('a body\n### A1\na1 body');
  });

  it('handles CRLF line endings', () => {
    expect(splitSections('## X\r\nbody\r\n', 2)[1]).toEqual({ title: 'X', body: 'body' });
  });
});

describe('requireSection', () => {
  const parts = splitSections(sample, 2);

  it('finds by exact title or regex', () => {
    expect(requireSection(parts, 'B', 'test').body).toBe('b body');
    expect(requireSection(parts, /^A$/, 'test').title).toBe('A');
  });

  it('throws with context when missing', () => {
    expect(() => requireSection(parts, 'C', 'test')).toThrow('test: section "C" not found');
  });
});

describe('fields', () => {
  const md = '**Casting Time:** Action or Ritual\n**Range:** 150 feet\ntext';

  it('reads a label value', () => {
    expect(field(md, 'Range')).toBe('150 feet');
    expect(field(md, 'Duration')).toBeUndefined();
  });

  it('requireField throws when missing', () => {
    expect(() => requireField(md, 'Duration', 'Fireball')).toThrow('Fireball: field "Duration" not found');
  });

  it('withoutFields removes the label lines', () => {
    expect(withoutFields(md, ['Casting Time', 'Range'])).toBe('text');
  });
});

describe('toInt', () => {
  it.each([
    ['+2', 2],
    ['—', 0],
    ['30 feet', 30],
    ['-1', -1],
    [undefined, 0],
  ])('%s -> %s', (input, expected) => {
    expect(toInt(input)).toBe(expected);
  });
});
```

`scripts/convert-srd/tables.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isSectionRow, parseTables, stripTags, tableAfter } from './tables';

const fixture = `**Bard Features**

<table>
  <thead>
    <tr>
      <th>Level</th>
      <th>Cantrips</th>
      <th colspan="2">——Spell Slots per Spell Level——</th>
    </tr>
    <tr>
      <th>  </th>
      <th>  </th>
      <th>1</th>
      <th>2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>2</td>
      <td>2</td>
      <td>—</td>
      <td></td>
    </tr>
  </tbody>
</table>`;

describe('tables', () => {
  it('parses head rows with colspan and keeps trailing empty cells', () => {
    const table = tableAfter(fixture, 'Bard Features');
    expect(table.head[0].map((c) => [c.text, c.colspan])).toEqual([
      ['Level', 1],
      ['Cantrips', 1],
      ['——Spell Slots per Spell Level——', 2],
    ]);
    expect(table.body[0].map((c) => c.text)).toEqual(['1', '2', '2', '—', '']);
  });

  it('detects section rows', () => {
    const [table] = parseTables(
      '<table><tbody><tr><th colspan="6"><em>Simple Melee Weapons</em></th></tr><tr><td>Club</td></tr></tbody></table>',
    );
    expect(isSectionRow(table.body[0])).toBe(true);
    expect(table.body[0][0].text).toBe('Simple Melee Weapons');
    expect(isSectionRow(table.body[1])).toBe(false);
  });

  it('decodes entities when stripping tags', () => {
    expect(stripTags('<em>Thieves&#39; Tools &amp; more</em>')).toBe("Thieves' Tools & more");
  });

  it('throws when the caption is missing', () => {
    expect(() => tableAfter(fixture, 'Wizard Features')).toThrow('table caption "Wizard Features" not found');
  });
});
```

- [ ] **Step 4: Tests draaien en zien falen**

Run: `npm test -- scripts/convert-srd`
Expected: FAIL, `Failed to resolve import "./markdown"` en `"./tables"`.

- [ ] **Step 5: Hulpfuncties implementeren**

`scripts/convert-srd/markdown.ts`:

```ts
export interface Section {
  title: string;
  body: string;
}

/** Split at headings with exactly `depth` hashes. The first section (title '') holds the text before the first heading. */
export function splitSections(md: string, depth: number): Section[] {
  const prefix = `${'#'.repeat(depth)} `;
  const sections: Section[] = [];
  let title = '';
  let lines: string[] = [];
  for (const line of md.split(/\r?\n/)) {
    if (line.startsWith(prefix)) {
      sections.push({ title, body: lines.join('\n').trim() });
      title = line.slice(prefix.length).trim();
      lines = [];
    } else {
      lines.push(line);
    }
  }
  sections.push({ title, body: lines.join('\n').trim() });
  return sections;
}

export function requireSection(sections: Section[], match: string | RegExp, context: string): Section {
  const found = sections.find((s) => (typeof match === 'string' ? s.title === match : match.test(s.title)));
  if (!found) throw new Error(`${context}: section "${String(match)}" not found`);
  return found;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Value of a `**Label:** value` line. */
export function field(md: string, label: string): string | undefined {
  const match = new RegExp(`^\\*\\*${escapeRegExp(label)}:\\*\\*\\s*(.+)$`, 'm').exec(md);
  return match?.[1].trim();
}

export function requireField(md: string, label: string, context: string): string {
  const value = field(md, label);
  if (value === undefined) throw new Error(`${context}: field "${label}" not found`);
  return value;
}

/** Drop `**Label:** value` lines for the given labels. */
export function withoutFields(md: string, labels: string[]): string {
  return md
    .split('\n')
    .filter((line) => !labels.some((label) => line.startsWith(`**${label}:**`)))
    .join('\n')
    .trim();
}

/** First integer in the text ("+2" -> 2, "30 feet" -> 30); 0 when there is none ("—"). */
export function toInt(text: string | undefined): number {
  const match = /-?\d+/.exec(text ?? '');
  return match ? Number(match[0]) : 0;
}
```

`scripts/convert-srd/tables.ts`:

```ts
export interface Cell {
  text: string;
  colspan: number;
  header: boolean;
}

export interface Table {
  head: Cell[][];
  body: Cell[][];
}

export function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRows(html: string): Cell[][] {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1].matchAll(/<(td|th)([^>]*)>([\s\S]*?)<\/\1>/g)].map((cell) => ({
      header: cell[1] === 'th',
      colspan: Number(/colspan="(\d+)"/.exec(cell[2])?.[1] ?? '1'),
      text: stripTags(cell[3]),
    })),
  );
}

export function parseTables(md: string): Table[] {
  return [...md.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)].map((table) => ({
    head: parseRows(/<thead>([\s\S]*?)<\/thead>/.exec(table[1])?.[1] ?? ''),
    body: parseRows(/<tbody>([\s\S]*?)<\/tbody>/.exec(table[1])?.[1] ?? ''),
  }));
}

/** The first table after a `**Caption**` line. */
export function tableAfter(md: string, caption: string): Table {
  const start = md.indexOf(`**${caption}**`);
  if (start < 0) throw new Error(`table caption "${caption}" not found`);
  const table = parseTables(md.slice(start))[0];
  if (!table) throw new Error(`no table after caption "${caption}"`);
  return table;
}

/** A body row with one header cell spanning columns, such as "Simple Melee Weapons". */
export function isSectionRow(row: Cell[]): boolean {
  return row.length === 1 && row[0].colspan > 1;
}
```

`scripts/convert-srd/vendor.ts`:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const VENDOR_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../vendor/srd-5.2.1');

export function readVendor(file: string): string {
  return readFileSync(path.join(VENDOR_DIR, file), 'utf8').replace(/\r\n/g, '\n');
}
```

- [ ] **Step 6: Tests draaien**

Run: `npm test -- scripts/convert-srd && npm run typecheck`
Expected: PASS (markdown en tables), typecheck zonder fouten.

- [ ] **Step 7: Committen**

```bash
git add vendor scripts
git commit -m "feat: SRD 5.2.1 vastpinnen en Markdown/tabel-hulpfuncties" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Content-schema's en constanten

**Files:**
- Create: `src/content/constants.ts`, `src/content/schema.ts`
- Test: `src/content/schema.test.ts`, `src/content/constants.test.ts`

**Interfaces:**
- Consumes: `tableAfter` (Task 2), `readVendor` (Task 2), `slugify` (Task 1) in de constants-test.
- Produces:
  - `constants.ts`: `ABILITIES`, `type Ability`, `ABILITY_BY_NAME: Readonly<Record<string, Ability>>`, `SKILLS` (skill-id naar ability), `type SkillId`, `SKILL_IDS: SkillId[]`, `CONDITIONS`, `type Condition`.
  - `schema.ts`: Zod-schema's en types `Formula`, `Effect`, `FeatureDef`, `GeneratedClassDef`, `ClassMechanics`, `ClassDef`, `SubclassDef`, `SpeciesDef`, `BackgroundDef`, `FeatDef`, `SpellDef`, `WeaponDef`, `ArmorDef`, `GearDef`, `MagicItemDef`, `ContentItem`, `ContentType`, `ContentOf<T>`, `ArmorTraining`, `WeaponProficiency`, `Progression`; plus `BonusTargetSchema`, `ContentItemSchema` en een schema per type (`FeatureSchema`, `GeneratedClassSchema`, `ClassMechanicsSchema`, `ClassSchema`, `SubclassSchema`, `SpeciesSchema`, `BackgroundSchema`, `FeatSchema`, `SpellSchema`, `WeaponSchema`, `ArmorSchema`, `GearSchema`, `MagicItemSchema`, `EffectSchema`, `FormulaSchema`).

Belangrijk voor latere tasks:
- `Formula`: `number | { pb: true } | { mod: Ability; min?: number } | { level: string; times?: number } | { column: { classId; key } } | { atLevel: { classId; values: [minLevel, value][] } } | { sum: Formula[] }`. `level: 'total'` betekent character-level, anders een class-ID.
- Bonusdoelen (`BonusTargetSchema`): `ac`, `initiative`, `speed`, `hpMax`, `spellAttack`, `spellDC`, `passivePerception`, `attack`, `damage`, `attack:<id>`, `damage:<id>`, `ability:<ab>`, `abilityMax:<ab>`, `save:<ab>`, `skill:<id>`. `abilityMax` telt op bij het maximum van 20 (bijvoorbeeld +10 voor een maximum van 30).
- Elk inhoudsitem heeft `id`, `name`, `source` (`srd` | `skeleton` | `user`), `type` en optioneel `fills` (de ID die het aanvult).

- [ ] **Step 1: De falende tests schrijven**

`src/content/constants.test.ts` (controleert de skills tegen de SRD-tabel):

```ts
import { describe, expect, it } from 'vitest';
import { tableAfter } from '../../scripts/convert-srd/tables';
import { readVendor } from '../../scripts/convert-srd/vendor';
import { ABILITY_BY_NAME, SKILLS } from './constants';
import { slugify } from './ids';

describe('SKILLS', () => {
  it('matches the Skills table in the SRD', () => {
    const table = tableAfter(readVendor('playing-the-game.md'), 'Skills');
    const fromSrd = Object.fromEntries(table.body.map((row) => [slugify(row[0].text), ABILITY_BY_NAME[row[1].text]]));
    expect(fromSrd).toEqual(SKILLS);
  });
});
```

`src/content/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BonusTargetSchema, ContentItemSchema, EffectSchema, FormulaSchema } from './schema';

describe('FormulaSchema', () => {
  it('accepts every formula shape, nested', () => {
    const formula = {
      sum: [2, { pb: true }, { mod: 'cha', min: 1 }, { level: 'total' }, { level: 'srd:class:paladin', times: 5 },
        { column: { classId: 'srd:class:barbarian', key: 'rages' } },
        { atLevel: { classId: 'srd:class:fighter', values: [[2, 1], [17, 2]] } }],
    };
    expect(FormulaSchema.parse(formula)).toEqual(formula);
  });

  it('rejects unknown keys', () => {
    expect(FormulaSchema.safeParse({ pb: true, extra: 1 }).success).toBe(false);
  });
});

describe('BonusTargetSchema', () => {
  it.each(['ac', 'hpMax', 'skill:sleight-of-hand', 'save:dex', 'ability:str', 'abilityMax:con', 'attack', 'damage:item-1'])(
    'accepts %s',
    (target) => expect(BonusTargetSchema.safeParse(target).success).toBe(true),
  );
  it.each(['ac:foo', 'save:xyz', 'ability', 'Skill:Stealth'])('rejects %s', (target) =>
    expect(BonusTargetSchema.safeParse(target).success).toBe(false),
  );
});

describe('EffectSchema', () => {
  it('accepts a resource with a column formula', () => {
    const rage = { kind: 'resource', key: 'rage', name: 'Rage', recharge: 'long', shortRestRegain: 1,
      max: { column: { classId: 'srd:class:barbarian', key: 'rages' } } };
    expect(EffectSchema.parse(rage)).toEqual(rage);
  });

  it('rejects an unknown kind', () => {
    expect(EffectSchema.safeParse({ kind: 'teleport' }).success).toBe(false);
  });
});

describe('ContentItemSchema', () => {
  const feature = { id: 'srd:feature:x:1:y', type: 'feature', source: 'srd', name: 'Y', text: 'text', effects: [] };

  it('accepts a minimal feature', () => {
    expect(ContentItemSchema.parse(feature)).toEqual(feature);
  });

  it('rejects extra keys and missing fields', () => {
    expect(ContentItemSchema.safeParse({ ...feature, extra: 1 }).success).toBe(false);
    expect(ContentItemSchema.safeParse({ id: 'x', type: 'spell', source: 'srd', name: 'X' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Tests draaien en zien falen**

Run: `npm test -- src/content`
Expected: FAIL, `Failed to resolve import "./constants"` en `"./schema"`.

- [ ] **Step 3: Constanten implementeren**

`src/content/constants.ts`:

```ts
export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];

export const ABILITY_BY_NAME: Readonly<Record<string, Ability>> = {
  Strength: 'str',
  Dexterity: 'dex',
  Constitution: 'con',
  Intelligence: 'int',
  Wisdom: 'wis',
  Charisma: 'cha',
};

/** Skill id -> ability, as in the SRD Skills table. */
export const SKILLS = {
  acrobatics: 'dex',
  'animal-handling': 'wis',
  arcana: 'int',
  athletics: 'str',
  deception: 'cha',
  history: 'int',
  insight: 'wis',
  intimidation: 'cha',
  investigation: 'int',
  medicine: 'wis',
  nature: 'int',
  perception: 'wis',
  performance: 'cha',
  persuasion: 'cha',
  religion: 'int',
  'sleight-of-hand': 'dex',
  stealth: 'dex',
  survival: 'wis',
} as const satisfies Record<string, Ability>;
export type SkillId = keyof typeof SKILLS;
export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];

/** SRD conditions except Exhaustion, which has levels and lives in its own state field. */
export const CONDITIONS = [
  'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible',
  'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious',
] as const;
export type Condition = (typeof CONDITIONS)[number];
```

- [ ] **Step 4: Schema's implementeren**

`src/content/schema.ts`:

```ts
import { z } from 'zod';
import { ABILITIES, type Ability } from './constants';

export const AbilitySchema = z.enum(ABILITIES);
export const SourceSchema = z.enum(['srd', 'skeleton', 'user']);

export type Formula =
  | number
  | { pb: true }
  | { mod: Ability; min?: number }
  | { level: string; times?: number }
  | { column: { classId: string; key: string } }
  | { atLevel: { classId: string; values: Array<[number, number]> } }
  | { sum: Formula[] };

export const FormulaSchema: z.ZodType<Formula> = z.lazy(() =>
  z.union([
    z.number(),
    z.strictObject({ pb: z.literal(true) }),
    z.strictObject({ mod: AbilitySchema, min: z.number().optional() }),
    z.strictObject({ level: z.string(), times: z.number().optional() }),
    z.strictObject({ column: z.strictObject({ classId: z.string(), key: z.string() }) }),
    z.strictObject({
      atLevel: z.strictObject({ classId: z.string(), values: z.array(z.tuple([z.number(), z.number()])) }),
    }),
    z.strictObject({ sum: z.array(FormulaSchema) }),
  ]),
);

export const BONUS_TARGET =
  /^(ac|initiative|speed|hpMax|spellAttack|spellDC|passivePerception|(attack|damage)(:[a-z0-9-]+)?|(ability|abilityMax|save):(str|dex|con|int|wis|cha)|skill:[a-z-]+)$/;
export const BonusTargetSchema = z.string().regex(BONUS_TARGET);

export const ArmorTrainingSchema = z.enum(['light', 'medium', 'heavy', 'shield']);
export type ArmorTraining = z.infer<typeof ArmorTrainingSchema>;
export const WeaponProficiencySchema = z.enum(['simple', 'martial', 'martial-light', 'martial-finesse-or-light']);
export type WeaponProficiency = z.infer<typeof WeaponProficiencySchema>;
export const ProgressionSchema = z.enum(['full', 'half', 'third', 'pact']);
export type Progression = z.infer<typeof ProgressionSchema>;
const RechargeSchema = z.enum(['short', 'long']);

export const EffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('resource'),
    key: z.string(),
    name: z.string(),
    max: FormulaSchema,
    recharge: RechargeSchema,
    shortRestRegain: FormulaSchema.optional(),
    pool: z.boolean().optional(),
  }),
  z.strictObject({ kind: z.literal('resourceRecharge'), key: z.string(), recharge: RechargeSchema }),
  z.strictObject({
    kind: z.literal('bonus'),
    target: BonusTargetSchema,
    value: FormulaSchema,
    when: z.enum(['armored', 'unarmored', 'notHeavyArmor']).optional(),
  }),
  z.strictObject({ kind: z.literal('proficiency'), target: z.string().regex(/^(skill|save|armor|weapon|tool):[a-z0-9-]+$/) }),
  z.strictObject({ kind: z.literal('spellcasting'), classId: z.string(), ability: AbilitySchema, progression: ProgressionSchema }),
  z.strictObject({
    kind: z.literal('acFormula'),
    name: z.string(),
    base: z.number(),
    abilities: z.array(AbilitySchema),
    allowShield: z.boolean(),
  }),
  z.strictObject({ kind: z.literal('halfProficiency') }),
  z.strictObject({ kind: z.literal('flag'), flag: z.enum(['heroic-inspiration-on-long-rest']) }),
]);
export type Effect = z.infer<typeof EffectSchema>;

const base = {
  id: z.string().min(1),
  name: z.string(),
  source: SourceSchema,
  fills: z.string().optional(),
};

export const FeatureSchema = z.strictObject({
  ...base,
  type: z.literal('feature'),
  text: z.string(),
  effects: z.array(EffectSchema),
  marker: z.enum(['subclass', 'asi', 'epicBoon']).optional(),
  optionGroup: z.string().optional(),
});

export const LevelRowSchema = z.strictObject({
  level: z.number().int().min(1).max(20),
  featureIds: z.array(z.string()),
  subclassFeature: z.boolean(),
  columns: z.record(z.string(), z.string()),
});

export const GeneratedClassSchema = z.strictObject({
  ...base,
  type: z.literal('class'),
  text: z.string(),
  hitDie: z.number().int(),
  coreTraits: z.record(z.string(), z.string()),
  multiclassText: z.string(),
  levels: z.array(LevelRowSchema).length(20),
  slotsByLevel: z.array(z.array(z.number().int())).optional(),
  pactSlotsByLevel: z.array(z.strictObject({ slots: z.number().int(), slotLevel: z.number().int() })).optional(),
  subclassLevels: z.array(z.number().int()),
});

const SkillChoiceSchema = z.strictObject({
  count: z.number().int(),
  from: z.union([z.literal('any'), z.array(z.string())]),
});

export const ClassMechanicsSchema = z.strictObject({
  primaryAbilities: z.strictObject({ mode: z.enum(['all', 'any']), abilities: z.array(AbilitySchema).min(1) }),
  savingThrows: z.array(AbilitySchema).length(2),
  armorTraining: z.array(ArmorTrainingSchema),
  weaponProficiencies: z.array(WeaponProficiencySchema),
  skillChoices: SkillChoiceSchema,
  multiclass: z.strictObject({
    armorTraining: z.array(ArmorTrainingSchema),
    weaponProficiencies: z.array(WeaponProficiencySchema),
    skillChoices: SkillChoiceSchema.optional(),
  }),
  spellcasting: z.strictObject({ ability: AbilitySchema, progression: z.enum(['full', 'half', 'pact']) }).optional(),
});

export const ClassSchema = GeneratedClassSchema.extend(ClassMechanicsSchema.shape);

export const SubclassSchema = z.strictObject({
  ...base,
  type: z.literal('subclass'),
  classId: z.string(),
  text: z.string(),
  features: z.array(z.strictObject({ level: z.number().int(), featureId: z.string() })),
});

export const SpeciesSchema = z.strictObject({
  ...base,
  type: z.literal('species'),
  text: z.string(),
  creatureType: z.string(),
  size: z.string(),
  speed: z.number().int(),
  traitIds: z.array(z.string()),
});

export const BackgroundSchema = z.strictObject({
  ...base,
  type: z.literal('background'),
  text: z.string(),
  abilityOptions: z.array(AbilitySchema).length(3),
  featId: z.string().optional(),
  featNote: z.string().optional(),
  skillProficiencies: z.array(z.string()),
  toolText: z.string(),
  equipmentText: z.string(),
});

export const FeatSchema = z.strictObject({
  ...base,
  type: z.literal('feat'),
  category: z.enum(['origin', 'general', 'fighting-style', 'epic-boon']),
  prerequisite: z.string().optional(),
  repeatable: z.boolean(),
  text: z.string(),
  effects: z.array(EffectSchema),
});

export const SpellSchema = z.strictObject({
  ...base,
  type: z.literal('spell'),
  level: z.number().int().min(0).max(9),
  school: z.string(),
  classes: z.array(z.string()),
  castingTime: z.string(),
  ritual: z.boolean(),
  range: z.string(),
  components: z.string(),
  duration: z.string(),
  concentration: z.boolean(),
  text: z.string(),
  cantrip: z
    .strictObject({
      damageDice: z.string(),
      damageType: z.string(),
      attackType: z.enum(['attack', 'save']).optional(),
      saveAbility: AbilitySchema.optional(),
      scales: z.boolean(),
    })
    .optional(),
});

export const WeaponSchema = z.strictObject({
  ...base,
  type: z.literal('weapon'),
  category: z.enum(['simple', 'martial']),
  kind: z.enum(['melee', 'ranged']),
  damageDice: z.string(),
  damageType: z.string(),
  properties: z.array(z.string()),
  mastery: z.string(),
  weight: z.string(),
  cost: z.string(),
});

export const ArmorSchema = z.strictObject({
  ...base,
  type: z.literal('armor'),
  category: z.enum(['light', 'medium', 'heavy', 'shield']),
  baseAC: z.number().int(),
  dexCap: z.number().int().nullable(),
  strength: z.number().int().optional(),
  stealthDisadvantage: z.boolean(),
  weight: z.string(),
  cost: z.string(),
});

export const GearSchema = z.strictObject({ ...base, type: z.literal('gear'), cost: z.string(), text: z.string() });

export const MagicItemSchema = z.strictObject({
  ...base,
  type: z.literal('magic-item'),
  typeLine: z.string(),
  category: z.string(),
  rarity: z.string(),
  attunement: z.boolean(),
  text: z.string(),
});

export const ContentItemSchema = z.discriminatedUnion('type', [
  FeatureSchema,
  ClassSchema,
  SubclassSchema,
  SpeciesSchema,
  BackgroundSchema,
  FeatSchema,
  SpellSchema,
  WeaponSchema,
  ArmorSchema,
  GearSchema,
  MagicItemSchema,
]);

export type FeatureDef = z.infer<typeof FeatureSchema>;
export type GeneratedClassDef = z.infer<typeof GeneratedClassSchema>;
export type ClassMechanics = z.infer<typeof ClassMechanicsSchema>;
export type ClassDef = z.infer<typeof ClassSchema>;
export type SubclassDef = z.infer<typeof SubclassSchema>;
export type SpeciesDef = z.infer<typeof SpeciesSchema>;
export type BackgroundDef = z.infer<typeof BackgroundSchema>;
export type FeatDef = z.infer<typeof FeatSchema>;
export type SpellDef = z.infer<typeof SpellSchema>;
export type WeaponDef = z.infer<typeof WeaponSchema>;
export type ArmorDef = z.infer<typeof ArmorSchema>;
export type GearDef = z.infer<typeof GearSchema>;
export type MagicItemDef = z.infer<typeof MagicItemSchema>;
export type ContentItem = z.infer<typeof ContentItemSchema>;
export type ContentType = ContentItem['type'];
export type ContentOf<T extends ContentType> = Extract<ContentItem, { type: T }>;
```

- [ ] **Step 5: Tests draaien**

Run: `npm test -- src/content && npm run typecheck`
Expected: PASS, typecheck zonder fouten. Faalt de skills-test, dan wijkt `SKILLS` af van de SRD: pas `SKILLS` aan, niet de test.

- [ ] **Step 6: Committen**

```bash
git add src/content
git commit -m "feat: content-schema's en constanten" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Converter voor classes, subclasses en features

**Files:**
- Create: `scripts/convert-srd/classes.ts`
- Test: `scripts/convert-srd/classes.test.ts`

**Interfaces:**
- Consumes: `splitSections`, `requireSection`, `toInt` (Task 2); `tableAfter`, `Table` (Task 2); `readVendor` (Task 2); `contentId`, `slugify` (Task 1); types `FeatureDef`, `GeneratedClassDef`, `SubclassDef` (Task 3).
- Produces: `interface ClassConversion { classes: GeneratedClassDef[]; subclasses: SubclassDef[]; features: FeatureDef[] }` en `convertClasses(md: string): ClassConversion`.

ID-regels die latere tasks gebruiken:
- Class: `srd:class:<slug>`, subclass: `srd:subclass:<slug>`.
- Class- en subclass-features: `srd:feature:<eigenaar-slug>:<level>:<feature-slug>`, bijvoorbeeld `srd:feature:barbarian:1:rage` en `srd:feature:champion:3:improved-critical`.
- Metamagic- en Invocation-opties: `srd:feature:metamagic:<slug>` en `srd:feature:eldritch-invocation:<slug>`, met `optionGroup`.
- `levels[i].columns` bevat de extra tabelkolommen als tekst, met de kopnaam als slug (`proficiency-bonus`, `rages`, `focus-points`, `prepared-spells`, `spell-slots`, `slot-level` …). Spell-slot-kolommen staan apart in `slotsByLevel`.

Opbouw van de bron (gecontroleerd): elke class is een `## <Class>`-sectie met daarin `**Core <Class> Traits**` (HTML-tabel), `### Becoming a <Class> …` met `#### As a Multiclass Character`, `### <Class> Class Features` met `**<Class> Features**` (tabel, 20 rijen) en `#### Level N: Naam`-koppen, en `### <Class> Subclass: <Naam>`. Rijen van Bard en Druid hebben een lege extra cel aan het eind; die wordt genegeerd. Een featurenaam in de tabel kan naar een eerdere kop verwijzen (Fighter level 6 "Ability Score Improvement" is de kop van level 4) en kan een toevoeging tussen haakjes hebben ("Mystic Arcanum (level 6 spell)").

- [ ] **Step 1: De falende test schrijven**

`scripts/convert-srd/classes.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { convertClasses, type ClassConversion } from './classes';
import { readVendor } from './vendor';

let result: ClassConversion;
beforeAll(() => {
  result = convertClasses(readVendor('classes.md'));
});
const cls = (id: string) => result.classes.find((c) => c.id === id)!;
const feature = (id: string) => result.features.find((f) => f.id === id);

describe('convertClasses', () => {
  it('finds all 12 classes and their SRD subclass', () => {
    expect(result.classes.map((c) => c.name)).toEqual([
      'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
    ]);
    expect(result.subclasses.map((s) => s.name)).toEqual([
      'Path of the Berserker', 'College of Lore', 'Life Domain', 'Circle of the Land', 'Champion', 'Warrior of the Open Hand',
      'Oath of Devotion', 'Hunter', 'Thief', 'Draconic Sorcery', 'Fiend Patron', 'Evoker',
    ]);
  });

  it('reads hit dice and keeps the raw core traits', () => {
    expect(result.classes.map((c) => c.hitDie)).toEqual([12, 8, 8, 8, 10, 8, 10, 10, 8, 6, 8, 6]);
    expect(cls('srd:class:fighter').coreTraits['Primary Ability']).toBe('Strength or Dexterity');
    expect(cls('srd:class:barbarian').multiclassText).toContain('training with Shields');
  });

  it('reads subclass levels from the features table', () => {
    expect(cls('srd:class:barbarian').subclassLevels).toEqual([3, 6, 10, 14]);
    expect(cls('srd:class:fighter').subclassLevels).toEqual([3, 7, 10, 15, 18]);
    expect(cls('srd:class:paladin').subclassLevels).toEqual([3, 7, 15, 20]);
    expect(cls('srd:class:rogue').subclassLevels).toEqual([3, 9, 13, 17]);
    expect(cls('srd:class:cleric').subclassLevels).toEqual([3, 6, 17]);
  });

  it('resolves table feature names to feature ids', () => {
    const barbarian = cls('srd:class:barbarian');
    expect(barbarian.levels).toHaveLength(20);
    expect(barbarian.levels[0].featureIds).toEqual([
      'srd:feature:barbarian:1:rage',
      'srd:feature:barbarian:1:unarmored-defense',
      'srd:feature:barbarian:1:weapon-mastery',
    ]);
    expect(barbarian.levels[16].featureIds).toContain('srd:feature:barbarian:17:improved-brutal-strike');
    expect(cls('srd:class:fighter').levels[5].featureIds).toContain('srd:feature:fighter:4:ability-score-improvement');
    expect(cls('srd:class:warlock').levels[12].featureIds).toContain('srd:feature:warlock:11:mystic-arcanum');
  });

  it('keeps extra columns as text', () => {
    expect(cls('srd:class:barbarian').levels.map((l) => l.columns.rages)).toEqual([
      '2', '2', '3', '3', '3', '4', '4', '4', '4', '4', '4', '5', '5', '5', '5', '5', '6', '6', '6', '6',
    ]);
    expect(cls('srd:class:monk').levels[4].columns['focus-points']).toBe('5');
    expect(cls('srd:class:monk').levels[1].columns['unarmored-movement']).toBe('+10 ft.');
    expect(Object.keys(cls('srd:class:wizard').levels[0].columns)).toEqual(['proficiency-bonus', 'cantrips', 'prepared-spells']);
  });

  it('reads spell slots and pact magic', () => {
    expect(cls('srd:class:wizard').slotsByLevel![4]).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
    expect(cls('srd:class:bard').slotsByLevel![19]).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
    expect(cls('srd:class:paladin').slotsByLevel![0]).toEqual([2, 0, 0, 0, 0]);
    expect(cls('srd:class:fighter').slotsByLevel).toBeUndefined();
    expect(cls('srd:class:warlock').slotsByLevel).toBeUndefined();
    expect(cls('srd:class:warlock').pactSlotsByLevel![2]).toEqual({ slots: 2, slotLevel: 2 });
    expect(cls('srd:class:warlock').pactSlotsByLevel![10]).toEqual({ slots: 3, slotLevel: 5 });
  });

  it('creates features with text and markers', () => {
    expect(feature('srd:feature:barbarian:1:rage')!.text).toContain('Rages column');
    expect(feature('srd:feature:barbarian:3:barbarian-subclass')!.marker).toBe('subclass');
    expect(feature('srd:feature:fighter:4:ability-score-improvement')!.marker).toBe('asi');
    expect(feature('srd:feature:fighter:19:epic-boon')!.marker).toBe('epicBoon');
    expect(feature('srd:feature:paladin:1:lay-on-hands')).toBeDefined();
    expect(feature('srd:feature:monk:2:monks-focus')).toBeDefined();
  });

  it('links subclass features', () => {
    const champion = result.subclasses.find((s) => s.id === 'srd:subclass:champion')!;
    expect(champion.classId).toBe('srd:class:fighter');
    expect(champion.features.map((f) => f.level)).toEqual([3, 3, 7, 10, 15, 18]);
    expect(champion.features[0].featureId).toBe('srd:feature:champion:3:improved-critical');
    expect(feature('srd:feature:champion:3:improved-critical')).toBeDefined();
  });

  it('keeps metamagic and invocation options', () => {
    expect(result.features.filter((f) => f.optionGroup === 'metamagic')).toHaveLength(10);
    expect(result.features.filter((f) => f.optionGroup === 'eldritch-invocation')).toHaveLength(28);
    expect(feature('srd:feature:eldritch-invocation:agonizing-blast')!.text).toContain('Prerequisite');
  });

  it('produces unique feature ids', () => {
    const ids = result.features.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Test draaien en zien falen**

Run: `npm test -- scripts/convert-srd/classes.test.ts`
Expected: FAIL, `Failed to resolve import "./classes"`.

- [ ] **Step 3: Converter implementeren**

`scripts/convert-srd/classes.ts`:

```ts
import { contentId, slugify } from '../../src/content/ids';
import type { FeatureDef, GeneratedClassDef, SubclassDef } from '../../src/content/schema';
import { requireSection, splitSections, toInt } from './markdown';
import { tableAfter, type Table } from './tables';

export interface ClassConversion {
  classes: GeneratedClassDef[];
  subclasses: SubclassDef[];
  features: FeatureDef[];
}

interface Heading {
  level: number;
  name: string;
  body: string;
}

const NOT_A_COLUMN = new Set(['level', 'class-features']);
const OPTION_GROUPS: Record<string, string> = {
  'Metamagic Options': 'metamagic',
  'Eldritch Invocation Options': 'eldritch-invocation',
};

function levelHeadings(body: string, context: string): Heading[] {
  return splitSections(body, 4)
    .filter((s) => s.title !== '')
    .map((s) => {
      const match = /^Level (\d+): (.+)$/.exec(s.title);
      if (!match) throw new Error(`${context}: unexpected heading "${s.title}"`);
      return { level: Number(match[1]), name: match[2].trim(), body: s.body };
    });
}

function markerFor(name: string, className: string): FeatureDef['marker'] {
  if (name === `${className} Subclass`) return 'subclass';
  if (name === 'Ability Score Improvement') return 'asi';
  if (name === 'Epic Boon') return 'epicBoon';
  return undefined;
}

function feature(id: string, name: string, text: string, extra: Partial<FeatureDef> = {}): FeatureDef {
  return { id, type: 'feature', source: 'srd', name, text, effects: [], ...extra };
}

function parseFeatureTable(table: Table, className: string, classSlug: string, headings: Heading[]) {
  const named: string[] = [];
  let slotCount = 0;
  for (const cell of table.head[0] ?? []) {
    if (cell.text.startsWith('—')) slotCount = cell.colspan;
    else named.push(slugify(cell.text));
  }
  if (table.body.length !== 20) throw new Error(`${className}: expected 20 level rows, got ${table.body.length}`);

  const levels: GeneratedClassDef['levels'] = [];
  const slots: number[][] = [];
  for (const row of table.body) {
    const level = Number(row[0].text);
    const featureIds: string[] = [];
    let subclassFeature = false;
    const names = row[2].text === '—' ? [] : row[2].text.split(/,\s*/);
    for (const raw of names) {
      const name = raw.replace(/\s*\(.*\)$/, '').trim();
      if (/^subclass feature$/i.test(name)) {
        subclassFeature = true;
        continue;
      }
      if (name === `${className} Subclass`) subclassFeature = true;
      const heading = headings
        .filter((h) => slugify(h.name) === slugify(name) && h.level <= level)
        .sort((a, b) => b.level - a.level)[0];
      if (!heading) throw new Error(`${className} level ${level}: no feature heading for "${raw}"`);
      featureIds.push(contentId('srd', 'feature', classSlug, heading.level, heading.name));
    }
    const columns: Record<string, string> = {};
    named.forEach((key, index) => {
      if (!NOT_A_COLUMN.has(key)) columns[key] = row[index].text;
    });
    levels.push({ level, featureIds, subclassFeature, columns });
    if (slotCount > 0) slots.push(row.slice(named.length, named.length + slotCount).map((cell) => toInt(cell.text)));
  }
  return { levels, slots: slotCount > 0 ? slots : undefined };
}

function convertClass(name: string, body: string, out: ClassConversion): void {
  const classSlug = slugify(name);
  const classId = contentId('srd', 'class', name);
  const parts = splitSections(body, 3);

  const intro = parts[0].body;
  const traitsCaption = `Core ${name} Traits`;
  const coreTraits = Object.fromEntries(tableAfter(intro, traitsCaption).body.map((row) => [row[0].text, row[1].text]));
  const hitDie = toInt(/D(\d+)/.exec(coreTraits['Hit Point Die'] ?? '')?.[1]);
  if (!hitDie) throw new Error(`${name}: hit point die not found`);

  const becoming = requireSection(parts, /^Becoming a/, name);
  const multiclassText = requireSection(splitSections(becoming.body, 4), 'As a Multiclass Character', name).body;

  const featureSection = requireSection(parts, `${name} Class Features`, name);
  const headings = levelHeadings(featureSection.body, name);
  for (const h of headings) {
    out.features.push(
      feature(contentId('srd', 'feature', classSlug, h.level, h.name), h.name, h.body, { marker: markerFor(h.name, name) }),
    );
  }
  const { levels, slots } = parseFeatureTable(tableAfter(featureSection.body, `${name} Features`), name, classSlug, headings);
  const pactSlotsByLevel =
    levels[0].columns['slot-level'] !== undefined
      ? levels.map((l) => ({ slots: toInt(l.columns['spell-slots']), slotLevel: toInt(l.columns['slot-level']) }))
      : undefined;

  out.classes.push({
    id: classId,
    type: 'class',
    source: 'srd',
    name,
    text: intro.slice(0, intro.indexOf(`**${traitsCaption}**`)).trim(),
    hitDie,
    coreTraits,
    multiclassText,
    levels,
    slotsByLevel: slots,
    pactSlotsByLevel,
    subclassLevels: levels.filter((l) => l.subclassFeature).map((l) => l.level),
  });

  const subSection = requireSection(parts, new RegExp(`^${name} Subclass: `), name);
  const subName = subSection.title.slice(`${name} Subclass: `.length).trim();
  const subSlug = slugify(subName);
  const subHeadings = levelHeadings(subSection.body, subName);
  for (const h of subHeadings) {
    out.features.push(feature(contentId('srd', 'feature', subSlug, h.level, h.name), h.name, h.body));
  }
  out.subclasses.push({
    id: contentId('srd', 'subclass', subName),
    type: 'subclass',
    source: 'srd',
    name: subName,
    classId,
    text: splitSections(subSection.body, 4)[0].body,
    features: subHeadings.map((h) => ({ level: h.level, featureId: contentId('srd', 'feature', subSlug, h.level, h.name) })),
  });

  for (const part of parts) {
    const group = OPTION_GROUPS[part.title];
    if (!group) continue;
    for (const option of splitSections(part.body, 4).filter((s) => s.title !== '')) {
      out.features.push(feature(contentId('srd', 'feature', group, option.title), option.title, option.body, { optionGroup: group }));
    }
  }
}

export function convertClasses(md: string): ClassConversion {
  const out: ClassConversion = { classes: [], subclasses: [], features: [] };
  for (const section of splitSections(md, 2).filter((s) => s.title !== '')) {
    convertClass(section.title, section.body, out);
  }
  return out;
}
```

- [ ] **Step 4: Tests draaien**

Run: `npm test -- scripts/convert-srd/classes.test.ts && npm run typecheck`
Expected: PASS (10 tests), typecheck zonder fouten. Een fout als `no feature heading for "…"` betekent dat de bron anders is dan verwacht: controleer eerst of de vendor-bestanden van de juiste commit komen (Task 2, Step 1).

- [ ] **Step 5: Committen**

```bash
git add scripts/convert-srd/classes.ts scripts/convert-srd/classes.test.ts
git commit -m "feat: converter voor classes, subclasses en features" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Converter voor spells

**Files:**
- Create: `scripts/convert-srd/spells.ts`
- Test: `scripts/convert-srd/spells.test.ts`

**Interfaces:**
- Consumes: `splitSections`, `field`, `withoutFields` (Task 2); `contentId` (Task 1); `ABILITY_BY_NAME` (Task 3); type `SpellDef` (Task 3).
- Produces: `convertSpells(md: string): SpellDef[]`. Spell-ID: `srd:spell:<slug>`; `classes` bevat class-ID's (`srd:class:wizard`).

Opbouw van de bron: na `## Spell Descriptions` volgt per spell `#### Naam`, dan een regel als `_Level 3 Evocation (Sorcerer, Wizard)_` of `_Evocation Cantrip (Sorcerer, Wizard)_`, dan `**Casting Time:**`, `**Range:**`, `**Components:**`, `**Duration:**` en de tekst. Sommige spells bevatten een stat block met eigen `##`- en `####`-koppen (bijvoorbeeld Find Steed met `#### Traits`); die horen bij de spell ervoor. Ritual staat in Casting Time ("Action or Ritual"), Concentration aan het begin van Duration.

- [ ] **Step 1: De falende test schrijven**

`scripts/convert-srd/spells.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import type { SpellDef } from '../../src/content/schema';
import { convertSpells } from './spells';
import { readVendor } from './vendor';

let spells: SpellDef[];
beforeAll(() => {
  spells = convertSpells(readVendor('spells.md'));
});
const spell = (name: string) => spells.find((s) => s.name === name)!;

describe('convertSpells', () => {
  it('finds all 339 spells, 27 of them cantrips', () => {
    expect(spells).toHaveLength(339);
    expect(spells.filter((s) => s.level === 0)).toHaveLength(27);
    expect(new Set(spells.map((s) => s.id)).size).toBe(339);
  });

  it('reads the header and properties', () => {
    const fireball = spell('Fireball');
    expect(fireball).toMatchObject({
      id: 'srd:spell:fireball',
      level: 3,
      school: 'Evocation',
      classes: ['srd:class:sorcerer', 'srd:class:wizard'],
      castingTime: 'Action',
      range: '150 feet',
      components: 'V, S, M (a ball of bat guano and sulfur)',
      duration: 'Instantaneous',
      ritual: false,
      concentration: false,
    });
    expect(fireball.text.startsWith('A bright streak')).toBe(true);
    expect(fireball.text).toContain('_Using a Higher-Level Spell Slot._');
    expect(fireball.cantrip).toBeUndefined();
  });

  it('detects ritual and concentration', () => {
    expect(spell('Detect Magic')).toMatchObject({ level: 1, ritual: true, concentration: true });
    expect(spell('Detect Magic').classes).toHaveLength(8);
  });

  it('extracts cantrip damage, attack type and scaling', () => {
    expect(spell('Fire Bolt').cantrip).toEqual({ damageDice: '1d10', damageType: 'Fire', attackType: 'attack', saveAbility: undefined, scales: true });
    expect(spell('Sacred Flame').cantrip).toEqual({ damageDice: '1d8', damageType: 'Radiant', attackType: 'save', saveAbility: 'dex', scales: true });
    expect(spell('Eldritch Blast').cantrip).toMatchObject({ damageDice: '1d10', damageType: 'Force', attackType: 'attack', scales: false });
  });

  it('keeps stat block headings inside the spell they belong to', () => {
    expect(spell('Find Steed').text).toContain('#### Traits');
    expect(spells.some((s) => s.name === 'Traits')).toBe(false);
  });
});
```

- [ ] **Step 2: Test draaien en zien falen**

Run: `npm test -- scripts/convert-srd/spells.test.ts`
Expected: FAIL, `Failed to resolve import "./spells"`.

- [ ] **Step 3: Converter implementeren**

`scripts/convert-srd/spells.ts`:

```ts
import { ABILITY_BY_NAME } from '../../src/content/constants';
import { contentId } from '../../src/content/ids';
import type { SpellDef } from '../../src/content/schema';
import { field, splitSections, withoutFields } from './markdown';

const HEADER = /^_(?:Level ([1-9]) ([A-Za-z]+)|([A-Za-z]+) Cantrip) \((.+)\)_$/;
const PROPERTY_LABELS = ['Casting Time', 'Range', 'Components', 'Duration'];

function cantripInfo(text: string): SpellDef['cantrip'] {
  const damage = /(\d+d\d+) ([A-Z][a-z]+) damage/.exec(text);
  if (!damage) return undefined;
  const save = /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/.exec(text);
  const attackType = /spell attack/i.test(text) ? 'attack' : save ? 'save' : undefined;
  return {
    damageDice: damage[1],
    damageType: damage[2],
    attackType,
    saveAbility: attackType === 'save' && save ? ABILITY_BY_NAME[save[1]] : undefined,
    scales: /_Cantrip Upgrade\._ The damage increases by \d+d\d+/.test(text),
  };
}

export function convertSpells(md: string): SpellDef[] {
  const start = md.indexOf('\n## Spell Descriptions');
  if (start < 0) throw new Error('spells: "## Spell Descriptions" not found');
  const spells: SpellDef[] = [];
  for (const entry of splitSections(md.slice(start), 4)) {
    if (entry.title === '') continue;
    const lines = entry.body.split('\n');
    const headerIndex = lines.findIndex((line) => line.trim() !== '');
    const header = HEADER.exec(lines[headerIndex]?.trim() ?? '');
    if (!header) {
      const previous = spells[spells.length - 1];
      if (!previous) throw new Error(`spells: "${entry.title}" appears before the first spell`);
      previous.text += `\n\n#### ${entry.title}\n\n${entry.body}`;
      continue;
    }
    const rest = lines.slice(headerIndex + 1).join('\n');
    const level = header[1] ? Number(header[1]) : 0;
    const castingTime = field(rest, 'Casting Time') ?? '';
    const duration = field(rest, 'Duration') ?? '';
    const text = withoutFields(rest, PROPERTY_LABELS);
    spells.push({
      id: contentId('srd', 'spell', entry.title),
      type: 'spell',
      source: 'srd',
      name: entry.title,
      level,
      school: header[2] ?? header[3],
      classes: header[4].split(/,\s*/).map((name) => contentId('srd', 'class', name)),
      castingTime,
      ritual: /Ritual/.test(castingTime),
      range: field(rest, 'Range') ?? '',
      components: field(rest, 'Components') ?? '',
      duration,
      concentration: duration.startsWith('Concentration'),
      text,
      cantrip: level === 0 ? cantripInfo(text) : undefined,
    });
  }
  return spells;
}
```

- [ ] **Step 4: Tests draaien**

Run: `npm test -- scripts/convert-srd/spells.test.ts && npm run typecheck`
Expected: PASS (5 tests), typecheck zonder fouten.

- [ ] **Step 5: Committen**

```bash
git add scripts/convert-srd/spells.ts scripts/convert-srd/spells.test.ts
git commit -m "feat: converter voor spells" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Converter voor species, backgrounds en feats

**Files:**
- Create: `scripts/convert-srd/origins.ts`, `scripts/convert-srd/feats.ts`
- Test: `scripts/convert-srd/origins.test.ts`, `scripts/convert-srd/feats.test.ts`

**Interfaces:**
- Consumes: `splitSections`, `requireSection`, `requireField`, `withoutFields`, `toInt` (Task 2); `contentId`, `slugify` (Task 1); `ABILITY_BY_NAME`, `type Ability` (Task 3); types `BackgroundDef`, `FeatDef`, `FeatureDef`, `SpeciesDef` (Task 3).
- Produces: `interface OriginConversion { species: SpeciesDef[]; backgrounds: BackgroundDef[]; features: FeatureDef[] }`, `convertOrigins(md: string): OriginConversion`, `convertFeats(md: string): FeatDef[]`. Species-traits worden features met ID `srd:feature:<species-slug>:<trait-slug>` (zonder level), bijvoorbeeld `srd:feature:dwarf:dwarven-toughness`. Feat-ID: `srd:feat:<slug>`. `background.featId` verwijst naar een feat-ID, `featNote` is de toevoeging tussen haakjes ("Cleric").

Opbouw van de bron: backgrounds onder `## Character Backgrounds` → `### Background Descriptions` → `#### Naam` met `**Ability Scores:**`, `**Feat:**`, `**Skill Proficiencies:**`, `**Tool Proficiency:**`, `**Equipment:**`. Species onder `## Character Species` → `### Species Descriptions` → `#### Naam` met `**Creature Type:**`, `**Size:**`, `**Speed:**` en traits die elk beginnen met een regel `_Naam._ tekst`. Feats onder `## Feat Descriptions` → `### Origin Feats` / `General Feats` / `Fighting Style Feats` / `Epic Boon Feats` → `#### Naam`, dan een regel als `_General Feat (Prerequisite: Level 4+)_`.

- [ ] **Step 1: De falende tests schrijven**

`scripts/convert-srd/origins.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { convertOrigins, type OriginConversion } from './origins';
import { readVendor } from './vendor';

let result: OriginConversion;
beforeAll(() => {
  result = convertOrigins(readVendor('character-origins.md'));
});

describe('backgrounds', () => {
  it('finds the four SRD backgrounds', () => {
    expect(result.backgrounds.map((b) => b.name)).toEqual(['Acolyte', 'Criminal', 'Sage', 'Soldier']);
  });

  it('reads abilities, feat, skills and tool', () => {
    const [acolyte, criminal, , soldier] = result.backgrounds;
    expect(acolyte).toMatchObject({
      id: 'srd:background:acolyte',
      abilityOptions: ['int', 'wis', 'cha'],
      featId: 'srd:feat:magic-initiate',
      featNote: 'Cleric',
      skillProficiencies: ['insight', 'religion'],
      toolText: "Calligrapher's Supplies",
    });
    expect(criminal).toMatchObject({ featId: 'srd:feat:alert', featNote: undefined, skillProficiencies: ['sleight-of-hand', 'stealth'] });
    expect(soldier.abilityOptions).toEqual(['str', 'dex', 'con']);
    expect(soldier.equipmentText).toContain('GP');
  });
});

describe('species', () => {
  it('finds the nine SRD species with their speed', () => {
    expect(result.species.map((s) => s.name)).toEqual(['Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath', 'Halfling', 'Human', 'Orc', 'Tiefling']);
    expect(result.species.map((s) => s.speed)).toEqual([30, 30, 30, 30, 35, 30, 30, 30, 30]);
  });

  it('turns traits into features', () => {
    const dwarf = result.species.find((s) => s.id === 'srd:species:dwarf')!;
    expect(dwarf.traitIds).toEqual([
      'srd:feature:dwarf:darkvision',
      'srd:feature:dwarf:dwarven-resilience',
      'srd:feature:dwarf:dwarven-toughness',
      'srd:feature:dwarf:stonecunning',
    ]);
    const stonecunning = result.features.find((f) => f.id === 'srd:feature:dwarf:stonecunning')!;
    expect(stonecunning.text).toContain('Proficiency Bonus');
    expect(dwarf.text).not.toContain('**Speed:**');
    expect(dwarf.creatureType).toBe('Humanoid');
  });
});
```

`scripts/convert-srd/feats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { convertFeats } from './feats';
import { readVendor } from './vendor';

describe('convertFeats', () => {
  const feats = convertFeats(readVendor('feats.md'));
  const feat = (id: string) => feats.find((f) => f.id === id)!;

  it('finds all 17 feats by category', () => {
    expect(feats).toHaveLength(17);
    const count = (category: string) => feats.filter((f) => f.category === category).length;
    expect([count('origin'), count('general'), count('fighting-style'), count('epic-boon')]).toEqual([4, 2, 4, 7]);
  });

  it('reads prerequisites and repeatable', () => {
    expect(feat('srd:feat:ability-score-improvement').prerequisite).toBe('Level 4+');
    expect(feat('srd:feat:alert')).toMatchObject({ category: 'origin', prerequisite: undefined, repeatable: false });
    expect(feat('srd:feat:skilled').repeatable).toBe(true);
    expect(feat('srd:feat:defense').text).toContain('+1 bonus to Armor Class');
  });
});
```

- [ ] **Step 2: Tests draaien en zien falen**

Run: `npm test -- scripts/convert-srd/origins.test.ts scripts/convert-srd/feats.test.ts`
Expected: FAIL, `Failed to resolve import "./origins"` en `"./feats"`.

- [ ] **Step 3: Converters implementeren**

`scripts/convert-srd/origins.ts`:

```ts
import { ABILITY_BY_NAME, type Ability } from '../../src/content/constants';
import { contentId, slugify } from '../../src/content/ids';
import type { BackgroundDef, FeatureDef, SpeciesDef } from '../../src/content/schema';
import { requireField, requireSection, splitSections, toInt, withoutFields } from './markdown';

export interface OriginConversion {
  species: SpeciesDef[];
  backgrounds: BackgroundDef[];
  features: FeatureDef[];
}

const TRAIT_START = /^_([^_]+)\._\s*(.*)$/;

function toAbility(name: string, context: string): Ability {
  const ability = ABILITY_BY_NAME[name.trim()];
  if (!ability) throw new Error(`${context}: unknown ability "${name}"`);
  return ability;
}

function parseTraits(body: string): Array<{ name: string; text: string }> {
  const traits: Array<{ name: string; lines: string[] }> = [];
  for (const line of body.split('\n')) {
    const match = TRAIT_START.exec(line);
    if (match) traits.push({ name: match[1].trim(), lines: [match[2]] });
    else if (traits.length > 0) traits[traits.length - 1].lines.push(line);
  }
  return traits.map((t) => ({ name: t.name, text: t.lines.join('\n').trim() }));
}

function convertBackgrounds(top: ReturnType<typeof splitSections>): BackgroundDef[] {
  const section = requireSection(top, 'Character Backgrounds', 'origins');
  const descriptions = requireSection(splitSections(section.body, 3), 'Background Descriptions', 'origins');
  return splitSections(descriptions.body, 4)
    .filter((s) => s.title !== '')
    .map((bg): BackgroundDef => {
      const context = `background ${bg.title}`;
      const featText = requireField(bg.body, 'Feat', context).replace(/\s*\(see "Feats"\)$/, '');
      const feat = /^(.+?)(?: \((.+)\))?$/.exec(featText)!;
      return {
        id: contentId('srd', 'background', bg.title),
        type: 'background',
        source: 'srd',
        name: bg.title,
        text: withoutFields(bg.body, ['Ability Scores', 'Feat', 'Skill Proficiencies', 'Tool Proficiency', 'Equipment']),
        abilityOptions: requireField(bg.body, 'Ability Scores', context)
          .split(/,\s*/)
          .map((name) => toAbility(name, context)),
        featId: contentId('srd', 'feat', feat[1]),
        featNote: feat[2],
        skillProficiencies: requireField(bg.body, 'Skill Proficiencies', context)
          .split(/\s+and\s+|,\s*/)
          .map((skill) => slugify(skill)),
        toolText: requireField(bg.body, 'Tool Proficiency', context),
        equipmentText: requireField(bg.body, 'Equipment', context),
      };
    });
}

export function convertOrigins(md: string): OriginConversion {
  const top = splitSections(md, 2);
  const out: OriginConversion = { species: [], backgrounds: convertBackgrounds(top), features: [] };

  const section = requireSection(top, 'Character Species', 'origins');
  const descriptions = requireSection(splitSections(section.body, 3), 'Species Descriptions', 'origins');
  for (const sp of splitSections(descriptions.body, 4).filter((s) => s.title !== '')) {
    const context = `species ${sp.title}`;
    const speciesSlug = slugify(sp.title);
    const traits = parseTraits(sp.body);
    const traitIds = traits.map((t) => contentId('srd', 'feature', speciesSlug, t.name));
    traits.forEach((trait, index) => {
      out.features.push({ id: traitIds[index], type: 'feature', source: 'srd', name: trait.name, text: trait.text, effects: [] });
    });
    const firstTrait = sp.body.search(/^_[^_]+\._/m);
    out.species.push({
      id: contentId('srd', 'species', sp.title),
      type: 'species',
      source: 'srd',
      name: sp.title,
      text: withoutFields(firstTrait >= 0 ? sp.body.slice(0, firstTrait) : sp.body, ['Creature Type', 'Size', 'Speed']),
      creatureType: requireField(sp.body, 'Creature Type', context),
      size: requireField(sp.body, 'Size', context),
      speed: toInt(requireField(sp.body, 'Speed', context)),
      traitIds,
    });
  }
  return out;
}
```

`scripts/convert-srd/feats.ts`:

```ts
import { contentId } from '../../src/content/ids';
import type { FeatDef } from '../../src/content/schema';
import { requireSection, splitSections } from './markdown';

const CATEGORIES: Record<string, FeatDef['category']> = {
  'Origin Feats': 'origin',
  'General Feats': 'general',
  'Fighting Style Feats': 'fighting-style',
  'Epic Boon Feats': 'epic-boon',
};

export function convertFeats(md: string): FeatDef[] {
  const descriptions = requireSection(splitSections(md, 2), 'Feat Descriptions', 'feats');
  const feats: FeatDef[] = [];
  for (const group of splitSections(descriptions.body, 3)) {
    const category = CATEGORIES[group.title];
    if (!category) continue;
    for (const entry of splitSections(group.body, 4).filter((s) => s.title !== '')) {
      const lines = entry.body.split('\n');
      const headerIndex = lines.findIndex((line) => line.trim() !== '');
      const text = lines.slice(headerIndex + 1).join('\n').trim();
      feats.push({
        id: contentId('srd', 'feat', entry.title),
        type: 'feat',
        source: 'srd',
        name: entry.title,
        category,
        prerequisite: /\(Prerequisite: (.+)\)_$/.exec(lines[headerIndex] ?? '')?.[1],
        repeatable: /_Repeatable\._/.test(text),
        text,
        effects: [],
      });
    }
  }
  return feats;
}
```

- [ ] **Step 4: Tests draaien**

Run: `npm test -- scripts/convert-srd/origins.test.ts scripts/convert-srd/feats.test.ts && npm run typecheck`
Expected: PASS (6 tests), typecheck zonder fouten.

- [ ] **Step 5: Committen**

```bash
git add scripts/convert-srd/origins.ts scripts/convert-srd/origins.test.ts scripts/convert-srd/feats.ts scripts/convert-srd/feats.test.ts
git commit -m "feat: converters voor species, backgrounds en feats" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Converter voor uitrusting en magische items, en de convert-CLI

**Files:**
- Create: `scripts/convert-srd/equipment.ts`, `scripts/convert-srd/magic-items.ts`, `scripts/convert-srd/convert.ts`, `scripts/convert-srd/index.ts`
- Create (gegenereerd): `src/content/srd/generated/*.json` (11 bestanden)
- Test: `scripts/convert-srd/equipment.test.ts`, `scripts/convert-srd/magic-items.test.ts`, `scripts/convert-srd/convert.test.ts`

**Interfaces:**
- Consumes: alle converters uit Task 4–6; `splitSections`, `requireSection`, `toInt` (Task 2); `tableAfter`, `isSectionRow` (Task 2); schema's uit Task 3.
- Produces:
  - `interface EquipmentConversion { weapons: WeaponDef[]; armor: ArmorDef[]; gear: GearDef[] }`, `convertEquipment(md: string): EquipmentConversion`. ID's: `srd:weapon:<slug>`, `srd:armor:<slug>` (`srd:armor:shield`, `srd:armor:chain-mail`), `srd:gear:<slug>`.
  - `convertMagicItems(md: string): MagicItemDef[]` (ID `srd:magic-item:<slug>`), `splitTopLevel(text: string): string[]`.
  - `convert.ts`: `convertAll(): ConvertedSrd` en `OUTPUT_SCHEMAS` (bestandsnaam naar Zod-schema). Bestandsnamen: `classes`, `subclasses`, `features`, `species`, `backgrounds`, `feats`, `spells`, `weapons`, `armor`, `gear`, `magic-items`.
  - Armor: `dexCap: null` = volledige DEX, getal = maximum, heavy armor heeft `dexCap: 0` en telt geen DEX mee. Shield: `category: 'shield'`, `baseAC: 2`.

- [ ] **Step 1: De falende tests schrijven**

`scripts/convert-srd/equipment.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { convertEquipment } from './equipment';
import { readVendor } from './vendor';

describe('convertEquipment', () => {
  const { weapons, armor, gear } = convertEquipment(readVendor('equipment.md'));
  const weapon = (name: string) => weapons.find((w) => w.name === name)!;
  const armorPiece = (name: string) => armor.find((a) => a.name === name)!;

  it('finds 38 weapons, 13 armor entries and 81 pieces of gear', () => {
    expect(weapons).toHaveLength(38);
    expect(armor).toHaveLength(13);
    expect(gear).toHaveLength(81);
  });

  it('reads weapons with category, kind and properties', () => {
    expect(weapon('Longsword')).toMatchObject({
      id: 'srd:weapon:longsword', category: 'martial', kind: 'melee', damageDice: '1d8', damageType: 'Slashing',
      properties: ['Versatile (1d10)'], mastery: 'Sap',
    });
    expect(weapon('Dagger')).toMatchObject({ category: 'simple', properties: ['Finesse', 'Light', 'Thrown (Range 20/60)'], mastery: 'Nick' });
    expect(weapon('Blowgun')).toMatchObject({ category: 'martial', kind: 'ranged', damageDice: '1', damageType: 'Piercing' });
    expect(weapon('Longbow').properties).toEqual(['Ammunition (Range 150/600; Arrow)', 'Heavy', 'Two-Handed']);
  });

  it('reads armor AC, DEX cap, strength and stealth', () => {
    expect(armorPiece('Leather Armor')).toMatchObject({ category: 'light', baseAC: 11, dexCap: null, stealthDisadvantage: false });
    expect(armorPiece('Hide Armor')).toMatchObject({ category: 'medium', baseAC: 12, dexCap: 2, strength: undefined });
    expect(armorPiece('Chain Mail')).toMatchObject({ id: 'srd:armor:chain-mail', category: 'heavy', baseAC: 16, dexCap: 0, strength: 13, stealthDisadvantage: true });
    expect(armorPiece('Shield')).toMatchObject({ id: 'srd:armor:shield', category: 'shield', baseAC: 2 });
  });

  it('reads gear with cost', () => {
    expect(gear.find((g) => g.name === 'Backpack')).toMatchObject({ id: 'srd:gear:backpack', cost: '2 GP' });
    expect(gear.find((g) => g.name === 'Bottle, Glass')).toMatchObject({ id: 'srd:gear:bottle-glass', cost: '2 GP' });
    expect(new Set(gear.map((g) => g.id)).size).toBe(gear.length);
  });
});
```

`scripts/convert-srd/magic-items.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { convertMagicItems, splitTopLevel } from './magic-items';
import { readVendor } from './vendor';

describe('convertMagicItems', () => {
  const items = convertMagicItems(readVendor('magic-items.md'));

  it('finds all 258 magic items with unique ids', () => {
    expect(items).toHaveLength(258);
    expect(new Set(items.map((i) => i.id)).size).toBe(258);
  });

  it('reads category, rarity and attunement', () => {
    const bag = items.find((i) => i.name === 'Bag of Holding')!;
    expect(bag).toMatchObject({ id: 'srd:magic-item:bag-of-holding', category: 'Wondrous Item', rarity: 'Uncommon', attunement: false });
    expect(bag.text).toContain('500 pounds');
    expect(items.some((i) => i.attunement)).toBe(true);
  });
});

describe('splitTopLevel', () => {
  it('ignores commas inside parentheses', () => {
    expect(splitTopLevel('Armor (Any Medium or Heavy, Except Hide Armor), Uncommon')).toEqual([
      'Armor (Any Medium or Heavy, Except Hide Armor)',
      'Uncommon',
    ]);
  });
});
```

`scripts/convert-srd/convert.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convertAll, OUTPUT_SCHEMAS } from './convert';

describe('convertAll', () => {
  const data = convertAll();

  it('produces the expected number of items per file', () => {
    const counts = Object.fromEntries(Object.entries(data).map(([name, items]) => [name, items.length]));
    expect(counts).toMatchObject({
      classes: 12, subclasses: 12, features: 303, species: 9, backgrounds: 4, feats: 17, spells: 339,
      weapons: 38, armor: 13, gear: 81, 'magic-items': 258,
    });
  });

  it('validates every file against its schema', () => {
    for (const [name, items] of Object.entries(data)) {
      const schema = OUTPUT_SCHEMAS[name as keyof typeof OUTPUT_SCHEMAS];
      const parsed = z.array(schema).safeParse(items);
      expect(parsed.success, `${name}: ${parsed.success ? '' : parsed.error.message}`).toBe(true);
    }
  });

  it('has unique ids across all files', () => {
    const ids = Object.values(data).flatMap((items) => items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Tests draaien en zien falen**

Run: `npm test -- scripts/convert-srd/equipment.test.ts scripts/convert-srd/magic-items.test.ts scripts/convert-srd/convert.test.ts`
Expected: FAIL, `Failed to resolve import` voor `./equipment`, `./magic-items` en `./convert`.

- [ ] **Step 3: Equipment-converter implementeren**

`scripts/convert-srd/equipment.ts`:

```ts
import { contentId } from '../../src/content/ids';
import type { ArmorDef, GearDef, WeaponDef } from '../../src/content/schema';
import { requireSection, splitSections, toInt } from './markdown';
import { isSectionRow, tableAfter } from './tables';

export interface EquipmentConversion {
  weapons: WeaponDef[];
  armor: ArmorDef[];
  gear: GearDef[];
}

function weaponSection(label: string): Pick<WeaponDef, 'category' | 'kind'> {
  const match = /^(Simple|Martial) (Melee|Ranged) Weapons$/.exec(label);
  if (!match) throw new Error(`weapons: unexpected section "${label}"`);
  return {
    category: match[1].toLowerCase() as WeaponDef['category'],
    kind: match[2].toLowerCase() as WeaponDef['kind'],
  };
}

function convertWeapons(body: string): WeaponDef[] {
  const weapons: WeaponDef[] = [];
  let section: Pick<WeaponDef, 'category' | 'kind'> | undefined;
  for (const row of tableAfter(body, 'Weapons').body) {
    if (isSectionRow(row)) {
      section = weaponSection(row[0].text);
      continue;
    }
    if (!section) throw new Error('weapons: row before the first section');
    const [name, damage, properties, mastery, weight, cost] = row.map((cell) => cell.text);
    const parsed = /^(\S+) (.+)$/.exec(damage);
    if (!parsed) throw new Error(`weapon ${name}: unexpected damage "${damage}"`);
    weapons.push({
      id: contentId('srd', 'weapon', name),
      type: 'weapon',
      source: 'srd',
      name,
      ...section,
      damageDice: parsed[1],
      damageType: parsed[2],
      properties: properties === '—' ? [] : properties.split(/,\s*/),
      mastery,
      weight,
      cost,
    });
  }
  return weapons;
}

function convertArmor(body: string): ArmorDef[] {
  const armor: ArmorDef[] = [];
  let category: ArmorDef['category'] | undefined;
  for (const row of tableAfter(body, 'Armor').body) {
    if (isSectionRow(row)) {
      category = row[0].text.split(' ')[0].toLowerCase() as ArmorDef['category'];
      continue;
    }
    const [name, ac, strength, stealth, weight, cost] = row.map((cell) => cell.text);
    const parsed = /^\+?(\d+)(?: \+ Dex modifier(?: \(max (\d+)\))?)?$/.exec(ac);
    if (!parsed || !category) throw new Error(`armor ${name}: unexpected row`);
    armor.push({
      id: contentId('srd', 'armor', name),
      type: 'armor',
      source: 'srd',
      name,
      category,
      baseAC: Number(parsed[1]),
      dexCap: ac.includes('Dex modifier') ? (parsed[2] ? Number(parsed[2]) : null) : 0,
      strength: strength === '—' ? undefined : toInt(strength),
      stealthDisadvantage: stealth === 'Disadvantage',
      weight,
      cost,
    });
  }
  return armor;
}

function convertGear(body: string): GearDef[] {
  return splitSections(body, 4)
    .filter((s) => s.title !== '')
    .map((entry): GearDef => {
      const match = /^(.+?) \(([^()]+)\)$/.exec(entry.title);
      const name = match ? match[1] : entry.title;
      return { id: contentId('srd', 'gear', name), type: 'gear', source: 'srd', name, cost: match ? match[2] : '', text: entry.body };
    });
}

export function convertEquipment(md: string): EquipmentConversion {
  const top = splitSections(md, 2);
  return {
    weapons: convertWeapons(requireSection(top, 'Weapons', 'equipment').body),
    armor: convertArmor(requireSection(top, 'Armor', 'equipment').body),
    gear: convertGear(requireSection(top, 'Adventuring Gear', 'equipment').body),
  };
}
```

- [ ] **Step 4: Magic-items-converter implementeren**

`scripts/convert-srd/magic-items.ts`:

```ts
import { contentId } from '../../src/content/ids';
import type { MagicItemDef } from '../../src/content/schema';
import { splitSections } from './markdown';

const TYPE_LINE = /^_((Armor|Weapon|Wondrous Item|Potion|Ring|Rod|Scroll|Staff|Wand)\b.*)_$/;

/** Split on commas that are not inside parentheses. */
export function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current.trim());
  return parts;
}

export function convertMagicItems(md: string): MagicItemDef[] {
  const items: MagicItemDef[] = [];
  for (const entry of splitSections(md, 4)) {
    if (entry.title === '') continue;
    const lines = entry.body.split('\n');
    const headerIndex = lines.findIndex((line) => line.trim() !== '');
    const match = TYPE_LINE.exec(lines[headerIndex]?.trim() ?? '');
    if (!match) continue;
    const typeLine = match[1];
    const rarity = splitTopLevel(typeLine).slice(1).join(', ').replace(/\s*\(Requires Attunement[^)]*\)/, '').trim();
    items.push({
      id: contentId('srd', 'magic-item', entry.title),
      type: 'magic-item',
      source: 'srd',
      name: entry.title,
      typeLine,
      category: match[2],
      rarity,
      attunement: /Requires Attunement/.test(typeLine),
      text: lines.slice(headerIndex + 1).join('\n').trim(),
    });
  }
  return items;
}
```

- [ ] **Step 5: convert.ts en de CLI implementeren**

`scripts/convert-srd/convert.ts`:

```ts
import {
  ArmorSchema, BackgroundSchema, FeatSchema, FeatureSchema, GearSchema, GeneratedClassSchema, MagicItemSchema,
  SpeciesSchema, SpellSchema, SubclassSchema, WeaponSchema,
} from '../../src/content/schema';
import { convertClasses } from './classes';
import { convertEquipment } from './equipment';
import { convertFeats } from './feats';
import { convertMagicItems } from './magic-items';
import { convertOrigins } from './origins';
import { convertSpells } from './spells';
import { readVendor } from './vendor';

export const OUTPUT_SCHEMAS = {
  classes: GeneratedClassSchema,
  subclasses: SubclassSchema,
  features: FeatureSchema,
  species: SpeciesSchema,
  backgrounds: BackgroundSchema,
  feats: FeatSchema,
  spells: SpellSchema,
  weapons: WeaponSchema,
  armor: ArmorSchema,
  gear: GearSchema,
  'magic-items': MagicItemSchema,
} as const;

export function convertAll() {
  const classes = convertClasses(readVendor('classes.md'));
  const origins = convertOrigins(readVendor('character-origins.md'));
  const equipment = convertEquipment(readVendor('equipment.md'));
  return {
    classes: classes.classes,
    subclasses: classes.subclasses,
    features: [...classes.features, ...origins.features],
    species: origins.species,
    backgrounds: origins.backgrounds,
    feats: convertFeats(readVendor('feats.md')),
    spells: convertSpells(readVendor('spells.md')),
    weapons: equipment.weapons,
    armor: equipment.armor,
    gear: equipment.gear,
    'magic-items': convertMagicItems(readVendor('magic-items.md')),
  };
}

export type ConvertedSrd = ReturnType<typeof convertAll>;
```

`scripts/convert-srd/index.ts`:

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { convertAll, OUTPUT_SCHEMAS } from './convert';

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/content/srd/generated');

const data = convertAll();
mkdirSync(OUT_DIR, { recursive: true });
for (const [name, items] of Object.entries(data)) {
  const schema = OUTPUT_SCHEMAS[name as keyof typeof OUTPUT_SCHEMAS];
  const parsed = z.array(schema).parse(items);
  writeFileSync(path.join(OUT_DIR, `${name}.json`), `${JSON.stringify(parsed, null, 2)}\n`);
  console.log(`${name}: ${parsed.length}`);
}
```

- [ ] **Step 6: Tests draaien**

Run: `npm test -- scripts/convert-srd && npm run typecheck`
Expected: PASS (alle converter-tests), typecheck zonder fouten.

- [ ] **Step 7: JSON genereren**

Run: `npm run convert:srd`
Expected uitvoer (232 class- en subclass-features, 38 opties, 33 species-traits):

```
classes: 12
subclasses: 12
features: 303
species: 9
backgrounds: 4
feats: 17
spells: 339
weapons: 38
armor: 13
gear: 81
magic-items: 258
```

Controleer: `ls src/content/srd/generated` toont 11 `.json`-bestanden.

- [ ] **Step 8: Committen**

```bash
git add scripts/convert-srd src/content/srd/generated
git commit -m "feat: converters voor uitrusting en magische items, SRD-JSON gegenereerd" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Class-mechaniek en effecten (handmatige overlays)

**Files:**
- Create: `src/content/srd/class-mechanics.ts`, `src/content/srd/effects.ts`
- Test: `src/content/srd/overlays.test.ts`

**Interfaces:**
- Consumes: `convertAll` (Task 7, alleen in de test); `ABILITY_BY_NAME`, `SKILL_IDS` (Task 3); `slugify` (Task 1); `ClassMechanicsSchema`, `EffectSchema`, types `ClassMechanics`, `Effect`, `Formula` (Task 3).
- Produces: `CLASS_MECHANICS: Record<string, ClassMechanics>` (sleutel = class-ID) en `EFFECTS: Record<string, Effect[]>` (sleutel = feature- of feat-ID).

Waarom met de hand: deze gegevens staan in de SRD als lopende tekst. Elke regel hieronder is nagelezen in de vendor-bestanden. De test controleert de mechaniek tegen de ruwe tabeltekst, en elk effect tegen een letterlijk citaat uit de bijbehorende featuretekst (`EVIDENCE`). Zo valt een fout of een verzonnen regel meteen op.

Resource-sleutels die latere tasks en plan 1B gebruiken: `rage`, `bardic-inspiration`, `channel-divinity-cleric`, `channel-divinity-paladin`, `wild-shape`, `second-wind`, `action-surge`, `indomitable`, `focus-points`, `uncanny-metabolism`, `lay-on-hands`, `favored-enemy`, `innate-sorcery`, `sorcery-points`, `sorcerous-restoration`, `magical-cunning`, `arcane-recovery`, `natural-recovery`, `wholeness-of-body`, `dark-ones-own-luck`, `breath-weapon`, `stonecunning`, `giant-ancestry`, `adrenaline-rush`, `relentless-endurance`.

- [ ] **Step 1: De falende test schrijven**

`src/content/srd/overlays.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { convertAll } from '../../../scripts/convert-srd/convert';
import { ABILITY_BY_NAME, SKILL_IDS } from '../constants';
import { slugify } from '../ids';
import { ClassMechanicsSchema, EffectSchema, type Formula } from '../schema';
import { CLASS_MECHANICS } from './class-mechanics';
import { EFFECTS } from './effects';

const data = convertAll();
const NAME_OF = Object.fromEntries(Object.entries(ABILITY_BY_NAME).map(([name, ability]) => [ability, name]));

describe('CLASS_MECHANICS', () => {
  it('covers exactly the SRD classes and is valid', () => {
    expect(Object.keys(CLASS_MECHANICS).sort()).toEqual(data.classes.map((c) => c.id).sort());
    for (const mechanics of Object.values(CLASS_MECHANICS)) ClassMechanicsSchema.parse(mechanics);
  });

  describe.each(data.classes.map((c) => [c.name, c] as const))('%s', (_name, cls) => {
    const m = CLASS_MECHANICS[cls.id];
    const traits = cls.coreTraits;

    it('matches primary abilities', () => {
      const text = traits['Primary Ability'];
      expect(m.primaryAbilities.mode).toBe(text.includes(' or ') ? 'any' : 'all');
      expect(m.primaryAbilities.abilities.map((a) => NAME_OF[a]).sort()).toEqual(text.split(/ and | or /).sort());
    });

    it('matches saving throws', () => {
      expect(m.savingThrows.map((a) => NAME_OF[a]).join(' and ')).toBe(traits['Saving Throw Proficiencies']);
    });

    it('matches armor training', () => {
      const text = traits['Armor Training'];
      const expected = [
        ...(/Light/.test(text) ? ['light'] : []),
        ...(/Medium/.test(text) ? ['medium'] : []),
        ...(/Heavy/.test(text) ? ['heavy'] : []),
        ...(/Shields/.test(text) ? ['shield'] : []),
      ];
      expect(m.armorTraining).toEqual(expected);
    });

    it('matches weapon proficiencies', () => {
      const text = traits['Weapon Proficiencies'];
      expect(m.weaponProficiencies.includes('simple')).toBe(text.startsWith('Simple'));
      expect(m.weaponProficiencies.includes('martial')).toBe(text === 'Simple and Martial weapons');
      expect(m.weaponProficiencies.includes('martial-light')).toBe(/Martial weapons that have the Light property/.test(text));
      expect(m.weaponProficiencies.includes('martial-finesse-or-light')).toBe(/Finesse or Light property/.test(text));
    });

    it('matches skill choices', () => {
      const text = traits['Skill Proficiencies'];
      expect(m.skillChoices.count).toBe(Number(/Choose (?:any )?(\d+)/.exec(text)![1]));
      if (text.includes('any')) {
        expect(m.skillChoices.from).toBe('any');
      } else {
        const skills = text.replace(/^Choose \d+: /, '').replace(/,? or /, ', ').split(/,\s*/).map(slugify);
        expect(m.skillChoices.from).toEqual(skills);
        expect(skills.every((s) => (SKILL_IDS as string[]).includes(s))).toBe(true);
      }
    });

    it('matches multiclass gains', () => {
      const text = cls.multiclassText;
      const training = /training with (.+?)\./.exec(text)?.[1] ?? '';
      const expected = [
        ...(/Light/.test(training) ? ['light'] : []),
        ...(/Medium/.test(training) ? ['medium'] : []),
        ...(/Shields/.test(training) ? ['shield'] : []),
      ];
      expect(m.multiclass.armorTraining).toEqual(expected);
      expect(m.multiclass.weaponProficiencies).toEqual(/proficiency with Martial weapons/.test(text) ? ['martial'] : []);
      if (/one skill of your choice from the/.test(text)) expect(m.multiclass.skillChoices).toEqual({ count: 1, from: m.skillChoices.from });
      else if (/one skill of your choice/.test(text)) expect(m.multiclass.skillChoices).toEqual({ count: 1, from: 'any' });
      else expect(m.multiclass.skillChoices).toBeUndefined();
    });

    it('matches spellcasting', () => {
      const texts = data.features.filter((f) => f.id.startsWith(`srd:feature:${slugify(cls.name)}:`)).map((f) => f.text).join('\n');
      const match = /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) is (?:your|the) spellcasting ability for your (\w+) spells/.exec(texts);
      if (!m.spellcasting) {
        expect(match).toBeNull();
        return;
      }
      expect(match?.[2]).toBe(cls.name);
      expect(ABILITY_BY_NAME[match![1]]).toBe(m.spellcasting.ability);
      const expectedProgression = cls.pactSlotsByLevel ? 'pact' : cls.slotsByLevel?.[0].length === 9 ? 'full' : 'half';
      expect(m.spellcasting.progression).toBe(expectedProgression);
    });
  });
});

/** A literal quote from the feature or feat text that justifies each effect. */
const EVIDENCE: Record<string, string> = {
  'srd:feature:barbarian:1:rage': 'You regain one expended use when you finish a Short Rest',
  'srd:feature:barbarian:1:unarmored-defense': 'Dexterity and Constitution modifiers',
  'srd:feature:barbarian:5:fast-movement': 'speed increases by 10 feet while you',
  'srd:feature:bard:1:bardic-inspiration': 'Charisma modifier (minimum of once)',
  'srd:feature:bard:2:jack-of-all-trades': 'half your Proficiency Bonus (round down)',
  'srd:feature:bard:5:font-of-inspiration': 'when you finish a Short or Long Rest',
  'srd:feature:cleric:2:channel-divinity': 'You regain one of its expended uses when you finish a Short Rest',
  'srd:feature:druid:2:wild-shape': 'You regain one expended use when you finish a Short Rest',
  'srd:feature:fighter:1:second-wind': 'You regain one expended use when you finish a Short Rest',
  'srd:feature:fighter:2:action-surge': 'Starting at level 17, you can use it twice',
  'srd:feature:fighter:9:indomitable': 'three times before a Long Rest starting at level 17',
  'srd:feature:monk:1:unarmored-defense': 'Dexterity and Wisdom modifiers',
  'srd:feature:monk:2:monks-focus': 'Short or Long Rest',
  'srd:feature:monk:2:unarmored-movement': 'wearing armor or wielding a Shield',
  'srd:feature:monk:2:uncanny-metabolism': 'until you finish a Long Rest',
  'srd:feature:paladin:1:lay-on-hands': 'five times your Paladin level',
  'srd:feature:paladin:3:channel-divinity': 'You regain one of its expended uses when you finish a Short Rest',
  'srd:feature:ranger:1:favored-enemy': 'Favored Enemy column',
  'srd:feature:sorcerer:1:innate-sorcery': 'You can use this feature twice',
  'srd:feature:sorcerer:2:font-of-magic': 'You regain all expended Sorcery Points when you finish a Long Rest',
  'srd:feature:sorcerer:5:sorcerous-restoration': 'until you finish a Long Rest',
  'srd:feature:warlock:2:magical-cunning': 'until you finish a Long Rest',
  'srd:feature:wizard:1:arcane-recovery': 'until you finish a Long Rest',
  'srd:feature:circle-of-the-land:6:natural-recovery': 'you must finish a Long Rest',
  'srd:feature:warrior-of-the-open-hand:6:wholeness-of-body': 'Wisdom modifier (minimum of once)',
  'srd:feature:draconic-sorcery:3:draconic-resilience': 'Hit Point maximum increases by 3',
  'srd:feature:fiend-patron:6:dark-ones-own-luck': 'Charisma modifier (minimum of once)',
  'srd:feature:dragonborn:breath-weapon': 'equal to your Proficiency Bonus',
  'srd:feature:dwarf:dwarven-toughness': 'increases by 1 again whenever you gain a level',
  'srd:feature:dwarf:stonecunning': 'equal to your Proficiency Bonus',
  'srd:feature:goliath:giant-ancestry': 'equal to your Proficiency Bonus',
  'srd:feature:orc:adrenaline-rush': 'Short or Long Rest',
  'srd:feature:orc:relentless-endurance': 'until you finish a Long Rest',
  'srd:feature:human:resourceful': 'Heroic Inspiration whenever you finish a Long Rest',
  'srd:feat:alert': 'add your Proficiency Bonus',
  'srd:feat:defense': '+1 bonus to Armor Class',
};

function columnRefs(formula: Formula): Array<{ classId: string; key: string }> {
  if (typeof formula === 'number') return [];
  if ('column' in formula) return [formula.column];
  if ('sum' in formula) return formula.sum.flatMap(columnRefs);
  return [];
}

describe('EFFECTS', () => {
  const texts = new Map([...data.features, ...data.feats].map((item) => [item.id, item.text]));

  it('only targets existing features and feats, each with evidence in its text', () => {
    expect(Object.keys(EFFECTS).sort()).toEqual(Object.keys(EVIDENCE).sort());
    for (const [id, quote] of Object.entries(EVIDENCE)) {
      expect(texts.has(id), id).toBe(true);
      expect(texts.get(id), id).toContain(quote);
    }
  });

  it('contains only valid effects with existing table columns', () => {
    for (const [id, effects] of Object.entries(EFFECTS)) {
      for (const effect of effects) {
        EffectSchema.parse(effect);
        const formulas = effect.kind === 'resource' ? [effect.max] : effect.kind === 'bonus' ? [effect.value] : [];
        for (const ref of formulas.flatMap(columnRefs)) {
          const cls = data.classes.find((c) => c.id === ref.classId);
          expect(cls?.levels[19].columns[ref.key], `${id} -> ${ref.classId}.${ref.key}`).toBeDefined();
        }
      }
    }
  });

  it('uses each resource key once', () => {
    const keys = Object.values(EFFECTS).flat().flatMap((e) => (e.kind === 'resource' ? [e.key] : []));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
```

- [ ] **Step 2: Test draaien en zien falen**

Run: `npm test -- src/content/srd/overlays.test.ts`
Expected: FAIL, `Failed to resolve import "./class-mechanics"`.

- [ ] **Step 3: Class-mechaniek schrijven**

`src/content/srd/class-mechanics.ts`:

```ts
import type { ClassMechanics } from '../schema';

const RANGER_SKILLS = ['animal-handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'];
const ROGUE_SKILLS = [
  'acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleight-of-hand', 'stealth',
];

/** Structured class traits, transcribed from the Core Traits tables and "As a Multiclass Character" in SRD 5.2.1. */
export const CLASS_MECHANICS: Record<string, ClassMechanics> = {
  'srd:class:barbarian': {
    primaryAbilities: { mode: 'all', abilities: ['str'] },
    savingThrows: ['str', 'con'],
    armorTraining: ['light', 'medium', 'shield'],
    weaponProficiencies: ['simple', 'martial'],
    skillChoices: { count: 2, from: ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
    multiclass: { armorTraining: ['shield'], weaponProficiencies: ['martial'] },
  },
  'srd:class:bard': {
    primaryAbilities: { mode: 'all', abilities: ['cha'] },
    savingThrows: ['dex', 'cha'],
    armorTraining: ['light'],
    weaponProficiencies: ['simple'],
    skillChoices: { count: 3, from: 'any' },
    multiclass: { armorTraining: ['light'], weaponProficiencies: [], skillChoices: { count: 1, from: 'any' } },
    spellcasting: { ability: 'cha', progression: 'full' },
  },
  'srd:class:cleric': {
    primaryAbilities: { mode: 'all', abilities: ['wis'] },
    savingThrows: ['wis', 'cha'],
    armorTraining: ['light', 'medium', 'shield'],
    weaponProficiencies: ['simple'],
    skillChoices: { count: 2, from: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
    multiclass: { armorTraining: ['light', 'medium', 'shield'], weaponProficiencies: [] },
    spellcasting: { ability: 'wis', progression: 'full' },
  },
  'srd:class:druid': {
    primaryAbilities: { mode: 'all', abilities: ['wis'] },
    savingThrows: ['int', 'wis'],
    armorTraining: ['light', 'shield'],
    weaponProficiencies: ['simple'],
    skillChoices: { count: 2, from: ['animal-handling', 'arcana', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'] },
    multiclass: { armorTraining: ['light', 'shield'], weaponProficiencies: [] },
    spellcasting: { ability: 'wis', progression: 'full' },
  },
  'srd:class:fighter': {
    primaryAbilities: { mode: 'any', abilities: ['str', 'dex'] },
    savingThrows: ['str', 'con'],
    armorTraining: ['light', 'medium', 'heavy', 'shield'],
    weaponProficiencies: ['simple', 'martial'],
    skillChoices: {
      count: 2,
      from: ['acrobatics', 'animal-handling', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival'],
    },
    multiclass: { armorTraining: ['light', 'medium', 'shield'], weaponProficiencies: ['martial'] },
  },
  'srd:class:monk': {
    primaryAbilities: { mode: 'all', abilities: ['dex', 'wis'] },
    savingThrows: ['str', 'dex'],
    armorTraining: [],
    weaponProficiencies: ['simple', 'martial-light'],
    skillChoices: { count: 2, from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] },
    multiclass: { armorTraining: [], weaponProficiencies: [] },
  },
  'srd:class:paladin': {
    primaryAbilities: { mode: 'all', abilities: ['str', 'cha'] },
    savingThrows: ['wis', 'cha'],
    armorTraining: ['light', 'medium', 'heavy', 'shield'],
    weaponProficiencies: ['simple', 'martial'],
    skillChoices: { count: 2, from: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
    multiclass: { armorTraining: ['light', 'medium', 'shield'], weaponProficiencies: ['martial'] },
    spellcasting: { ability: 'cha', progression: 'half' },
  },
  'srd:class:ranger': {
    primaryAbilities: { mode: 'all', abilities: ['dex', 'wis'] },
    savingThrows: ['str', 'dex'],
    armorTraining: ['light', 'medium', 'shield'],
    weaponProficiencies: ['simple', 'martial'],
    skillChoices: { count: 3, from: RANGER_SKILLS },
    multiclass: { armorTraining: ['light', 'medium', 'shield'], weaponProficiencies: ['martial'], skillChoices: { count: 1, from: RANGER_SKILLS } },
    spellcasting: { ability: 'wis', progression: 'half' },
  },
  'srd:class:rogue': {
    primaryAbilities: { mode: 'all', abilities: ['dex'] },
    savingThrows: ['dex', 'int'],
    armorTraining: ['light'],
    weaponProficiencies: ['simple', 'martial-finesse-or-light'],
    skillChoices: { count: 4, from: ROGUE_SKILLS },
    multiclass: { armorTraining: ['light'], weaponProficiencies: [], skillChoices: { count: 1, from: ROGUE_SKILLS } },
  },
  'srd:class:sorcerer': {
    primaryAbilities: { mode: 'all', abilities: ['cha'] },
    savingThrows: ['con', 'cha'],
    armorTraining: [],
    weaponProficiencies: ['simple'],
    skillChoices: { count: 2, from: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] },
    multiclass: { armorTraining: [], weaponProficiencies: [] },
    spellcasting: { ability: 'cha', progression: 'full' },
  },
  'srd:class:warlock': {
    primaryAbilities: { mode: 'all', abilities: ['cha'] },
    savingThrows: ['wis', 'cha'],
    armorTraining: ['light'],
    weaponProficiencies: ['simple'],
    skillChoices: { count: 2, from: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] },
    multiclass: { armorTraining: ['light'], weaponProficiencies: [] },
    spellcasting: { ability: 'cha', progression: 'pact' },
  },
  'srd:class:wizard': {
    primaryAbilities: { mode: 'all', abilities: ['int'] },
    savingThrows: ['int', 'wis'],
    armorTraining: [],
    weaponProficiencies: ['simple'],
    skillChoices: { count: 2, from: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'] },
    multiclass: { armorTraining: [], weaponProficiencies: [] },
    spellcasting: { ability: 'int', progression: 'full' },
  },
};
```

- [ ] **Step 4: Effecten schrijven**

`src/content/srd/effects.ts`:

```ts
import type { Effect, Formula } from '../schema';

const column = (cls: string, key: string): Formula => ({ column: { classId: `srd:class:${cls}`, key } });

/** Mechanical effects per feature or feat id. Every entry is backed by a quote in overlays.test.ts (EVIDENCE). */
export const EFFECTS: Record<string, Effect[]> = {
  'srd:feature:barbarian:1:rage': [
    { kind: 'resource', key: 'rage', name: 'Rage', max: column('barbarian', 'rages'), recharge: 'long', shortRestRegain: 1 },
  ],
  'srd:feature:barbarian:1:unarmored-defense': [
    { kind: 'acFormula', name: 'Unarmored Defense', base: 10, abilities: ['dex', 'con'], allowShield: true },
  ],
  'srd:feature:barbarian:5:fast-movement': [{ kind: 'bonus', target: 'speed', value: 10, when: 'notHeavyArmor' }],
  'srd:feature:bard:1:bardic-inspiration': [
    { kind: 'resource', key: 'bardic-inspiration', name: 'Bardic Inspiration', max: { mod: 'cha', min: 1 }, recharge: 'long' },
  ],
  'srd:feature:bard:2:jack-of-all-trades': [{ kind: 'halfProficiency' }],
  'srd:feature:bard:5:font-of-inspiration': [{ kind: 'resourceRecharge', key: 'bardic-inspiration', recharge: 'short' }],
  'srd:feature:cleric:2:channel-divinity': [
    { kind: 'resource', key: 'channel-divinity-cleric', name: 'Channel Divinity (Cleric)', max: column('cleric', 'channel-divinity'), recharge: 'long', shortRestRegain: 1 },
  ],
  'srd:feature:druid:2:wild-shape': [
    { kind: 'resource', key: 'wild-shape', name: 'Wild Shape', max: column('druid', 'wild-shape'), recharge: 'long', shortRestRegain: 1 },
  ],
  'srd:feature:fighter:1:second-wind': [
    { kind: 'resource', key: 'second-wind', name: 'Second Wind', max: column('fighter', 'second-wind'), recharge: 'long', shortRestRegain: 1 },
  ],
  'srd:feature:fighter:2:action-surge': [
    { kind: 'resource', key: 'action-surge', name: 'Action Surge', max: { atLevel: { classId: 'srd:class:fighter', values: [[2, 1], [17, 2]] } }, recharge: 'short' },
  ],
  'srd:feature:fighter:9:indomitable': [
    { kind: 'resource', key: 'indomitable', name: 'Indomitable', max: { atLevel: { classId: 'srd:class:fighter', values: [[9, 1], [13, 2], [17, 3]] } }, recharge: 'long' },
  ],
  'srd:feature:monk:1:unarmored-defense': [
    { kind: 'acFormula', name: 'Unarmored Defense', base: 10, abilities: ['dex', 'wis'], allowShield: false },
  ],
  'srd:feature:monk:2:monks-focus': [
    { kind: 'resource', key: 'focus-points', name: 'Focus Points', max: column('monk', 'focus-points'), recharge: 'short', pool: true },
  ],
  'srd:feature:monk:2:unarmored-movement': [
    { kind: 'bonus', target: 'speed', value: column('monk', 'unarmored-movement'), when: 'unarmored' },
  ],
  'srd:feature:monk:2:uncanny-metabolism': [
    { kind: 'resource', key: 'uncanny-metabolism', name: 'Uncanny Metabolism', max: 1, recharge: 'long' },
  ],
  'srd:feature:paladin:1:lay-on-hands': [
    { kind: 'resource', key: 'lay-on-hands', name: 'Lay On Hands', max: { level: 'srd:class:paladin', times: 5 }, recharge: 'long', pool: true },
  ],
  'srd:feature:paladin:3:channel-divinity': [
    { kind: 'resource', key: 'channel-divinity-paladin', name: 'Channel Divinity (Paladin)', max: column('paladin', 'channel-divinity'), recharge: 'long', shortRestRegain: 1 },
  ],
  'srd:feature:ranger:1:favored-enemy': [
    { kind: 'resource', key: 'favored-enemy', name: "Favored Enemy (Hunter's Mark)", max: column('ranger', 'favored-enemy'), recharge: 'long' },
  ],
  'srd:feature:sorcerer:1:innate-sorcery': [
    { kind: 'resource', key: 'innate-sorcery', name: 'Innate Sorcery', max: 2, recharge: 'long' },
  ],
  'srd:feature:sorcerer:2:font-of-magic': [
    { kind: 'resource', key: 'sorcery-points', name: 'Sorcery Points', max: column('sorcerer', 'sorcery-points'), recharge: 'long', pool: true },
  ],
  'srd:feature:sorcerer:5:sorcerous-restoration': [
    { kind: 'resource', key: 'sorcerous-restoration', name: 'Sorcerous Restoration', max: 1, recharge: 'long' },
  ],
  'srd:feature:warlock:2:magical-cunning': [
    { kind: 'resource', key: 'magical-cunning', name: 'Magical Cunning', max: 1, recharge: 'long' },
  ],
  'srd:feature:wizard:1:arcane-recovery': [
    { kind: 'resource', key: 'arcane-recovery', name: 'Arcane Recovery', max: 1, recharge: 'long' },
  ],
  'srd:feature:circle-of-the-land:6:natural-recovery': [
    { kind: 'resource', key: 'natural-recovery', name: 'Natural Recovery', max: 1, recharge: 'long' },
  ],
  'srd:feature:warrior-of-the-open-hand:6:wholeness-of-body': [
    { kind: 'resource', key: 'wholeness-of-body', name: 'Wholeness of Body', max: { mod: 'wis', min: 1 }, recharge: 'long' },
  ],
  'srd:feature:draconic-sorcery:3:draconic-resilience': [
    { kind: 'bonus', target: 'hpMax', value: { level: 'srd:class:sorcerer' } },
    { kind: 'acFormula', name: 'Draconic Resilience', base: 10, abilities: ['dex', 'cha'], allowShield: true },
  ],
  'srd:feature:fiend-patron:6:dark-ones-own-luck': [
    { kind: 'resource', key: 'dark-ones-own-luck', name: "Dark One's Own Luck", max: { mod: 'cha', min: 1 }, recharge: 'long' },
  ],
  'srd:feature:dragonborn:breath-weapon': [
    { kind: 'resource', key: 'breath-weapon', name: 'Breath Weapon', max: { pb: true }, recharge: 'long' },
  ],
  'srd:feature:dwarf:dwarven-toughness': [{ kind: 'bonus', target: 'hpMax', value: { level: 'total' } }],
  'srd:feature:dwarf:stonecunning': [
    { kind: 'resource', key: 'stonecunning', name: 'Stonecunning', max: { pb: true }, recharge: 'long' },
  ],
  'srd:feature:goliath:giant-ancestry': [
    { kind: 'resource', key: 'giant-ancestry', name: 'Giant Ancestry', max: { pb: true }, recharge: 'long' },
  ],
  'srd:feature:orc:adrenaline-rush': [
    { kind: 'resource', key: 'adrenaline-rush', name: 'Adrenaline Rush', max: { pb: true }, recharge: 'short' },
  ],
  'srd:feature:orc:relentless-endurance': [
    { kind: 'resource', key: 'relentless-endurance', name: 'Relentless Endurance', max: 1, recharge: 'long' },
  ],
  'srd:feature:human:resourceful': [{ kind: 'flag', flag: 'heroic-inspiration-on-long-rest' }],
  'srd:feat:alert': [{ kind: 'bonus', target: 'initiative', value: { pb: true } }],
  'srd:feat:defense': [{ kind: 'bonus', target: 'ac', value: 1, when: 'armored' }],
};
```

- [ ] **Step 5: Tests draaien**

Run: `npm test -- src/content/srd/overlays.test.ts && npm run typecheck`
Expected: PASS. Faalt een `EVIDENCE`-controle, lees dan de featuretekst in de vendor-bestanden na en pas het effect (niet het citaat) aan, zodat het klopt met de SRD.

- [ ] **Step 6: Committen**

```bash
git add src/content/srd/class-mechanics.ts src/content/srd/effects.ts src/content/srd/overlays.test.ts
git commit -m "feat: class-mechaniek en effecten met bewijs uit de SRD" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Subclass-skeletten, ContentRegistry en ingebouwde inhoud laden

**Files:**
- Create: `src/content/skeletons.ts`, `src/content/registry.ts`, `src/content/load.ts`
- Test: `src/content/skeletons.test.ts`, `src/content/registry.test.ts`, `src/content/load.test.ts`

**Interfaces:**
- Consumes: `contentId`, `slugify` (Task 1); types en `ContentItemSchema` (Task 3); gegenereerde JSON (Task 7); `CLASS_MECHANICS`, `EFFECTS` (Task 8).
- Produces:
  - `SKELETON_SUBCLASSES: Array<{ classId: string; name: string; spellcasting?: Ability }>` en `buildSkeletons(classes: ClassDef[]): { subclasses: SubclassDef[]; features: FeatureDef[] }`. Skelet-ID's: `skeleton:subclass:<slug>` en `skeleton:feature:<slug>:<level>:feature` (naam en tekst leeg).
  - `interface ContentRegistry { get(id): ContentItem | undefined; getOf<T extends ContentType>(type: T, id: string): ContentOf<T> | undefined; list<T extends ContentType>(type: T): ContentOf<T>[] }` en `createRegistry(builtin: ContentItem[], user?: ContentItem[]): ContentRegistry`.
  - `loadBuiltinContent(): ContentItem[]` (één keer opgebouwd, daarna uit cache).

Regel voor eigen inhoud: een user-item met `fills: <id>` van hetzelfde type vult dat item aan. Zijn velden overschrijven die van het doel, maar `id` en `source` van het doel blijven. Zonder (geldig) doel wordt het een los item. Zo blijft een aanvulling op een skelet staan als de app wordt bijgewerkt.

- [ ] **Step 1: De falende tests schrijven**

`src/content/skeletons.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SKELETON_SUBCLASSES } from './skeletons';

describe('SKELETON_SUBCLASSES', () => {
  it('has three subclasses per class with unique names', () => {
    expect(SKELETON_SUBCLASSES).toHaveLength(36);
    const perClass = new Map<string, number>();
    for (const entry of SKELETON_SUBCLASSES) perClass.set(entry.classId, (perClass.get(entry.classId) ?? 0) + 1);
    expect([...perClass.values()]).toEqual(Array(12).fill(3));
    expect(new Set(SKELETON_SUBCLASSES.map((e) => e.name)).size).toBe(36);
  });

  it('marks only Eldritch Knight and Arcane Trickster as spellcasters', () => {
    expect(SKELETON_SUBCLASSES.filter((e) => e.spellcasting).map((e) => e.name)).toEqual(['Eldritch Knight', 'Arcane Trickster']);
  });
});
```

`src/content/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRegistry } from './registry';
import type { ContentItem, FeatureDef } from './schema';

const skeletonFeature: FeatureDef = { id: 'skeleton:feature:battle-master:3:feature', type: 'feature', source: 'skeleton', name: '', text: '', effects: [] };
const fill: FeatureDef = {
  id: 'user:feature:abc', type: 'feature', source: 'user', fills: skeletonFeature.id, name: 'Combat Superiority', text: 'My notes',
  effects: [{ kind: 'resource', key: 'superiority-dice', name: 'Superiority Dice', max: 4, recharge: 'short' }],
};

describe('createRegistry', () => {
  it('merges a fill into its target and keeps the target id and source', () => {
    const registry = createRegistry([skeletonFeature], [fill]);
    expect(registry.get(skeletonFeature.id)).toMatchObject({ id: skeletonFeature.id, source: 'skeleton', name: 'Combat Superiority', text: 'My notes' });
    expect(registry.get('user:feature:abc')).toBeUndefined();
    expect(registry.getOf('feature', skeletonFeature.id)!.effects).toHaveLength(1);
  });

  it('adds user items without a valid target as standalone items', () => {
    const orphan: ContentItem = { ...fill, id: 'user:feature:def', fills: 'skeleton:feature:missing' };
    const registry = createRegistry([skeletonFeature], [orphan]);
    expect(registry.get('user:feature:def')).toMatchObject({ name: 'Combat Superiority' });
    expect(registry.get(skeletonFeature.id)).toMatchObject({ name: '' });
  });

  it('filters by type', () => {
    const registry = createRegistry([skeletonFeature]);
    expect(registry.getOf('spell', skeletonFeature.id)).toBeUndefined();
    expect(registry.list('feature')).toHaveLength(1);
    expect(registry.list('spell')).toEqual([]);
  });
});
```

`src/content/load.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadBuiltinContent } from './load';
import { createRegistry } from './registry';
import { ContentItemSchema, type ContentType } from './schema';

const items = loadBuiltinContent();
const registry = createRegistry(items);

describe('built-in content', () => {
  it('is valid and has unique ids', () => {
    for (const item of items) {
      const result = ContentItemSchema.safeParse(item);
      expect(result.success, item.id).toBe(true);
    }
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it('has four subclasses per class: one SRD and three skeletons', () => {
    expect(registry.list('subclass')).toHaveLength(48);
    for (const cls of registry.list('class')) {
      const subs = registry.list('subclass').filter((s) => s.classId === cls.id);
      expect(subs.map((s) => s.source).sort(), cls.name).toEqual(['skeleton', 'skeleton', 'skeleton', 'srd']);
    }
  });

  it('resolves every reference', () => {
    const missing: string[] = [];
    const check = (type: ContentType, id: string | undefined) => {
      if (id && !registry.getOf(type, id)) missing.push(`${type} ${id}`);
    };
    for (const cls of registry.list('class')) cls.levels.forEach((l) => l.featureIds.forEach((id) => check('feature', id)));
    for (const sub of registry.list('subclass')) {
      check('class', sub.classId);
      sub.features.forEach((f) => check('feature', f.featureId));
    }
    for (const species of registry.list('species')) species.traitIds.forEach((id) => check('feature', id));
    for (const background of registry.list('background')) check('feat', background.featId);
    for (const spell of registry.list('spell')) spell.classes.forEach((id) => check('class', id));
    expect(missing).toEqual([]);
  });

  it('applies class mechanics and effects', () => {
    expect(registry.getOf('class', 'srd:class:wizard')!.spellcasting).toEqual({ ability: 'int', progression: 'full' });
    expect(registry.getOf('feature', 'srd:feature:barbarian:1:rage')!.effects[0]).toMatchObject({ kind: 'resource', key: 'rage' });
    expect(registry.getOf('feat', 'srd:feat:alert')!.effects).toHaveLength(1);
  });

  it('gives skeleton subclasses empty features at the class subclass levels', () => {
    const ek = registry.getOf('subclass', 'skeleton:subclass:eldritch-knight')!;
    expect(ek.features.map((f) => f.level)).toEqual([3, 7, 10, 15, 18]);
    expect(registry.getOf('feature', ek.features[0].featureId)).toMatchObject({ name: '', text: '', source: 'skeleton' });
    expect(registry.getOf('feature', ek.features[0].featureId)!.effects).toEqual([
      { kind: 'spellcasting', classId: 'srd:class:fighter', ability: 'int', progression: 'third' },
    ]);
    expect(registry.getOf('feature', ek.features[1].featureId)!.effects).toEqual([]);
    expect(registry.getOf('subclass', 'skeleton:subclass:arcane-trickster')!.features.map((f) => f.level)).toEqual([3, 9, 13, 17]);
  });
});
```

- [ ] **Step 2: Tests draaien en zien falen**

Run: `npm test -- src/content/skeletons.test.ts src/content/registry.test.ts src/content/load.test.ts`
Expected: FAIL, `Failed to resolve import` voor `./skeletons`, `./registry` en `./load`.

- [ ] **Step 3: Skeletten schrijven**

`src/content/skeletons.ts`:

```ts
import type { Ability } from './constants';
import { contentId, slugify } from './ids';
import type { ClassDef, FeatureDef, SubclassDef } from './schema';

interface SkeletonEntry {
  classId: string;
  name: string;
  spellcasting?: Ability;
}

/**
 * PHB: names of the 2024 Player's Handbook subclasses that are not in the SRD.
 * Only the names; feature names and texts stay empty and are filled in by the player.
 */
export const SKELETON_SUBCLASSES: SkeletonEntry[] = [
  { classId: 'srd:class:barbarian', name: 'Path of the Wild Heart' },
  { classId: 'srd:class:barbarian', name: 'Path of the World Tree' },
  { classId: 'srd:class:barbarian', name: 'Path of the Zealot' },
  { classId: 'srd:class:bard', name: 'College of Dance' },
  { classId: 'srd:class:bard', name: 'College of Glamour' },
  { classId: 'srd:class:bard', name: 'College of Valor' },
  { classId: 'srd:class:cleric', name: 'Light Domain' },
  { classId: 'srd:class:cleric', name: 'Trickery Domain' },
  { classId: 'srd:class:cleric', name: 'War Domain' },
  { classId: 'srd:class:druid', name: 'Circle of the Moon' },
  { classId: 'srd:class:druid', name: 'Circle of the Sea' },
  { classId: 'srd:class:druid', name: 'Circle of the Stars' },
  { classId: 'srd:class:fighter', name: 'Battle Master' },
  // PHB: Eldritch Knight and Arcane Trickster are Intelligence-based third casters.
  { classId: 'srd:class:fighter', name: 'Eldritch Knight', spellcasting: 'int' },
  { classId: 'srd:class:fighter', name: 'Psi Warrior' },
  { classId: 'srd:class:monk', name: 'Warrior of Mercy' },
  { classId: 'srd:class:monk', name: 'Warrior of Shadow' },
  { classId: 'srd:class:monk', name: 'Warrior of the Elements' },
  { classId: 'srd:class:paladin', name: 'Oath of Glory' },
  { classId: 'srd:class:paladin', name: 'Oath of the Ancients' },
  { classId: 'srd:class:paladin', name: 'Oath of Vengeance' },
  { classId: 'srd:class:ranger', name: 'Beast Master' },
  { classId: 'srd:class:ranger', name: 'Fey Wanderer' },
  { classId: 'srd:class:ranger', name: 'Gloom Stalker' },
  { classId: 'srd:class:rogue', name: 'Arcane Trickster', spellcasting: 'int' },
  { classId: 'srd:class:rogue', name: 'Assassin' },
  { classId: 'srd:class:rogue', name: 'Soulknife' },
  { classId: 'srd:class:sorcerer', name: 'Aberrant Sorcery' },
  { classId: 'srd:class:sorcerer', name: 'Clockwork Sorcery' },
  { classId: 'srd:class:sorcerer', name: 'Wild Magic Sorcery' },
  { classId: 'srd:class:warlock', name: 'Archfey Patron' },
  { classId: 'srd:class:warlock', name: 'Celestial Patron' },
  { classId: 'srd:class:warlock', name: 'Great Old One Patron' },
  { classId: 'srd:class:wizard', name: 'Abjurer' },
  { classId: 'srd:class:wizard', name: 'Diviner' },
  { classId: 'srd:class:wizard', name: 'Illusionist' },
];

/** One empty feature per subclass level of the class (levels come from the SRD class table). */
export function buildSkeletons(classes: ClassDef[]): { subclasses: SubclassDef[]; features: FeatureDef[] } {
  const subclasses: SubclassDef[] = [];
  const features: FeatureDef[] = [];
  for (const entry of SKELETON_SUBCLASSES) {
    const cls = classes.find((c) => c.id === entry.classId);
    if (!cls) throw new Error(`skeleton ${entry.name}: unknown class ${entry.classId}`);
    const slug = slugify(entry.name);
    const own = cls.subclassLevels.map(
      (level, index): FeatureDef => ({
        id: contentId('skeleton', 'feature', slug, level, 'feature'),
        type: 'feature',
        source: 'skeleton',
        name: '',
        text: '',
        effects:
          entry.spellcasting && index === 0
            ? [{ kind: 'spellcasting', classId: entry.classId, ability: entry.spellcasting, progression: 'third' }]
            : [],
      }),
    );
    features.push(...own);
    subclasses.push({
      id: contentId('skeleton', 'subclass', entry.name),
      type: 'subclass',
      source: 'skeleton',
      name: entry.name,
      classId: entry.classId,
      text: '',
      features: own.map((feature, index) => ({ level: cls.subclassLevels[index], featureId: feature.id })),
    });
  }
  return { subclasses, features };
}
```

- [ ] **Step 4: Registry schrijven**

`src/content/registry.ts`:

```ts
import type { ContentItem, ContentOf, ContentType } from './schema';

export interface ContentRegistry {
  get(id: string): ContentItem | undefined;
  getOf<T extends ContentType>(type: T, id: string): ContentOf<T> | undefined;
  list<T extends ContentType>(type: T): ContentOf<T>[];
}

/**
 * Built-in items first, then user items. A user item with `fills` pointing at an item of the same type
 * is merged into that item; the target keeps its own id and source. Otherwise the user item stands alone.
 */
export function createRegistry(builtin: ContentItem[], user: ContentItem[] = []): ContentRegistry {
  const items = new Map<string, ContentItem>();
  for (const item of builtin) items.set(item.id, item);
  for (const item of user) {
    const target = item.fills ? items.get(item.fills) : undefined;
    if (target && target.type === item.type) {
      const patch: Record<string, unknown> = { ...item };
      delete patch.id;
      delete patch.source;
      delete patch.fills;
      items.set(target.id, { ...target, ...patch } as ContentItem);
    } else {
      items.set(item.id, item);
    }
  }
  return {
    get: (id) => items.get(id),
    getOf: <T extends ContentType>(type: T, id: string) => {
      const item = items.get(id);
      return item?.type === type ? (item as ContentOf<T>) : undefined;
    },
    list: <T extends ContentType>(type: T) => [...items.values()].filter((item): item is ContentOf<T> => item.type === type),
  };
}
```

- [ ] **Step 5: Loader schrijven**

`src/content/load.ts`:

```ts
import { buildSkeletons } from './skeletons';
import type {
  ArmorDef, BackgroundDef, ClassDef, ContentItem, Effect, FeatDef, FeatureDef, GearDef, GeneratedClassDef, MagicItemDef,
  SpeciesDef, SpellDef, SubclassDef, WeaponDef,
} from './schema';
import { CLASS_MECHANICS } from './srd/class-mechanics';
import { EFFECTS } from './srd/effects';
import armorJson from './srd/generated/armor.json';
import backgroundsJson from './srd/generated/backgrounds.json';
import classesJson from './srd/generated/classes.json';
import featsJson from './srd/generated/feats.json';
import featuresJson from './srd/generated/features.json';
import gearJson from './srd/generated/gear.json';
import magicItemsJson from './srd/generated/magic-items.json';
import speciesJson from './srd/generated/species.json';
import spellsJson from './srd/generated/spells.json';
import subclassesJson from './srd/generated/subclasses.json';
import weaponsJson from './srd/generated/weapons.json';

const asList = <T>(data: unknown): T[] => data as T[];

function withEffects<T extends { id: string; effects: Effect[] }>(items: T[]): T[] {
  return items.map((item) => (EFFECTS[item.id] ? { ...item, effects: EFFECTS[item.id] } : item));
}

let cache: ContentItem[] | undefined;

/** All built-in content: generated SRD data + class mechanics + effects + skeleton subclasses. */
export function loadBuiltinContent(): ContentItem[] {
  if (cache) return cache;
  const classes: ClassDef[] = asList<GeneratedClassDef>(classesJson).map((cls) => {
    const mechanics = CLASS_MECHANICS[cls.id];
    if (!mechanics) throw new Error(`no class mechanics for ${cls.id}`);
    return { ...cls, ...mechanics };
  });
  const skeletons = buildSkeletons(classes);
  cache = [
    ...classes,
    ...asList<SubclassDef>(subclassesJson),
    ...skeletons.subclasses,
    ...withEffects(asList<FeatureDef>(featuresJson)),
    ...skeletons.features,
    ...asList<SpeciesDef>(speciesJson),
    ...asList<BackgroundDef>(backgroundsJson),
    ...withEffects(asList<FeatDef>(featsJson)),
    ...asList<SpellDef>(spellsJson),
    ...asList<WeaponDef>(weaponsJson),
    ...asList<ArmorDef>(armorJson),
    ...asList<GearDef>(gearJson),
    ...asList<MagicItemDef>(magicItemsJson),
  ];
  return cache;
}
```

- [ ] **Step 6: Tests draaien**

Run: `npm test -- src/content && npm run typecheck`
Expected: PASS, typecheck zonder fouten. Meldt "resolves every reference" iets als `class srd:class:…` bij een spell, dan staat er in de spellkop een classnaam die geen class is: rapporteer dat en pas de converter aan, niet de test.

- [ ] **Step 7: Committen**

```bash
git add src/content
git commit -m "feat: subclass-skeletten, ContentRegistry en loader" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Character-model

**Files:**
- Create: `src/model/character.ts`
- Test: `src/model/character.test.ts`

**Interfaces:**
- Consumes: `BonusTargetSchema` (Task 3).
- Produces: `CharacterSchema`, `LevelChoiceSchema`, types `Character`, `LevelChoice`, `InventoryItem`, `Override`, `interface NewCharacterInput { id?: string; name?: string; now?: string }`, `createCharacter(input?: NewCharacterInput): Character`.

Vorm (zie spec §5, met deze verfijningen):
- `choices.bonusFeatIds: string[]`: feats die niet uit background of level komen (bijvoorbeeld het Origin feat van Human).
- `choices.featureOptions: string[]`: gekozen opties zoals Invocations en Metamagic.
- `LevelChoice.featId`: het feat dat op dat level gekozen is (ASI-feat, Fighting Style-feat, Epic Boon).
- `inventory[].id` en `overrides[].id`: eigen ID's, nodig voor de UI en voor bonusdoelen als `attack:<id>`.
- `state.hitDiceSpent` per dobbelsteen (`"d10"`), `state.slotsUsed` per slotniveau (`"1"` t/m `"9"`).

- [ ] **Step 1: De falende test schrijven**

`src/model/character.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CharacterSchema, createCharacter } from './character';

describe('createCharacter', () => {
  it('creates a valid empty character', () => {
    const character = createCharacter({ id: 'c1', name: 'Kael', now: '2026-10-15T10:00:00.000Z' });
    expect(CharacterSchema.parse(character)).toEqual(character);
    expect(character).toMatchObject({ id: 'c1', name: 'Kael', schemaVersion: 1, createdAt: '2026-10-15T10:00:00.000Z' });
    expect(character.choices.baseAbilities).toEqual({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    expect(character.choices.levels).toEqual([]);
  });

  it('generates a new id each time', () => {
    expect(createCharacter().id).not.toBe(createCharacter().id);
  });
});

describe('CharacterSchema', () => {
  const valid = createCharacter({ id: 'c1' });

  it('accepts a filled character', () => {
    const filled = {
      ...valid,
      choices: {
        ...valid.choices,
        levels: [{ classId: 'srd:class:fighter', hp: 'average', featId: 'srd:feat:defense', featureChoices: {} }, { classId: 'srd:class:fighter', hp: 7, asi: { str: 2 }, featureChoices: {} }],
      },
      inventory: [{ id: 'i1', itemId: 'srd:armor:chain-mail', qty: 1, equipped: true, attuned: false }],
      overrides: [{ id: 'o1', target: 'ac', value: 1, reason: 'Ring of Protection' }],
    };
    expect(CharacterSchema.safeParse(filled).success).toBe(true);
  });

  it('rejects invalid values', () => {
    const level = (hp: unknown) => ({ ...valid, choices: { ...valid.choices, levels: [{ classId: 'srd:class:fighter', hp, featureChoices: {} }] } });
    expect(CharacterSchema.safeParse(level('max')).success).toBe(false);
    expect(CharacterSchema.safeParse(level(0)).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...valid, state: { ...valid.state, exhaustion: 7 } }).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...valid, overrides: [{ id: 'o1', target: 'armor', value: 1, reason: '' }] }).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...valid, unknown: true }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Test draaien en zien falen**

Run: `npm test -- src/model`
Expected: FAIL, `Failed to resolve import "./character"`.

- [ ] **Step 3: Model implementeren**

`src/model/character.ts`:

```ts
import { z } from 'zod';
import { BonusTargetSchema } from '../content/schema';

const score = z.number().int().min(1).max(30);
const AbilityScoresSchema = z.strictObject({ str: score, dex: score, con: score, int: score, wis: score, cha: score });
const delta = z.number().int().optional();
const AbilityDeltaSchema = z.strictObject({ str: delta, dex: delta, con: delta, int: delta, wis: delta, cha: delta });
const count = z.number().int().min(0);
const anyRecord = z.record(z.string(), z.unknown());

export const LevelChoiceSchema = z.strictObject({
  classId: z.string().min(1),
  subclassId: z.string().optional(),
  /** Ignored for the first character level, which always gets the maximum of the hit die. */
  hp: z.union([z.literal('average'), z.number().int().min(1)]),
  asi: AbilityDeltaSchema.optional(),
  featId: z.string().optional(),
  featureChoices: anyRecord,
});

export const CharacterSchema = z.strictObject({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  name: z.string(),
  details: z.strictObject({
    alignment: z.string().optional(),
    appearance: z.string().optional(),
    personality: z.string().optional(),
    backstory: z.string().optional(),
  }),
  choices: z.strictObject({
    abilityMethod: z.enum(['standard', 'pointbuy', 'rolled', 'manual']),
    baseAbilities: AbilityScoresSchema,
    speciesId: z.string().nullable(),
    speciesChoices: anyRecord,
    backgroundId: z.string().nullable(),
    backgroundAbilityBonuses: AbilityDeltaSchema,
    backgroundChoices: anyRecord,
    levels: z.array(LevelChoiceSchema),
    bonusFeatIds: z.array(z.string()),
    skillProficiencies: z.array(z.string()),
    expertise: z.array(z.string()),
    languages: z.array(z.string()),
    toolProficiencies: z.array(z.string()),
    featureOptions: z.array(z.string()),
    spells: z.array(z.strictObject({ classId: z.string(), spellId: z.string(), prepared: z.boolean() })),
  }),
  state: z.strictObject({
    hpCurrent: z.number().int(),
    hpTemp: count,
    deathSaves: z.strictObject({ successes: z.number().int().min(0).max(3), failures: z.number().int().min(0).max(3) }),
    hitDiceSpent: z.record(z.string(), count),
    slotsUsed: z.record(z.string(), count),
    pactSlotsUsed: count,
    resourcesUsed: z.record(z.string(), count),
    conditions: z.array(z.string()),
    exhaustion: z.number().int().min(0).max(6),
    heroicInspiration: z.boolean(),
  }),
  inventory: z.array(
    z.strictObject({
      id: z.string().min(1),
      itemId: z.string().optional(),
      customName: z.string().optional(),
      qty: count,
      equipped: z.boolean(),
      attuned: z.boolean(),
      notes: z.string().optional(),
    }),
  ),
  currency: z.strictObject({ cp: count, sp: count, ep: count, gp: count, pp: count }),
  notes: z.array(z.strictObject({ id: z.string().min(1), title: z.string(), body: z.string(), updatedAt: z.string() })),
  overrides: z.array(z.strictObject({ id: z.string().min(1), target: BonusTargetSchema, value: z.number().int(), reason: z.string() })),
});

export type Character = z.infer<typeof CharacterSchema>;
export type LevelChoice = z.infer<typeof LevelChoiceSchema>;
export type InventoryItem = Character['inventory'][number];
export type Override = Character['overrides'][number];

export interface NewCharacterInput {
  id?: string;
  name?: string;
  now?: string;
}

export function createCharacter(input: NewCharacterInput = {}): Character {
  const now = input.now ?? new Date().toISOString();
  return {
    id: input.id ?? crypto.randomUUID(),
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    name: input.name ?? '',
    details: {},
    choices: {
      abilityMethod: 'manual',
      baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      speciesId: null,
      speciesChoices: {},
      backgroundId: null,
      backgroundAbilityBonuses: {},
      backgroundChoices: {},
      levels: [],
      bonusFeatIds: [],
      skillProficiencies: [],
      expertise: [],
      languages: [],
      toolProficiencies: [],
      featureOptions: [],
      spells: [],
    },
    state: {
      hpCurrent: 0,
      hpTemp: 0,
      deathSaves: { successes: 0, failures: 0 },
      hitDiceSpent: {},
      slotsUsed: {},
      pactSlotsUsed: 0,
      resourcesUsed: {},
      conditions: [],
      exhaustion: 0,
      heroicInspiration: false,
    },
    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    notes: [],
    overrides: [],
  };
}
```

- [ ] **Step 4: Tests draaien**

Run: `npm test -- src/model && npm run typecheck`
Expected: PASS (4 tests), typecheck zonder fouten.

- [ ] **Step 5: Committen**

```bash
git add src/model
git commit -m "feat: character-model met schema en createCharacter" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Rules-fundament: types, formules, levels, abilities en testfixtures

**Files:**
- Create: `src/rules/types.ts`, `src/rules/warnings.ts`, `src/rules/formula.ts`, `src/rules/levels.ts`, `src/rules/abilities.ts`, `src/rules/testing/fixtures.ts`
- Test: `src/rules/formula.test.ts`, `src/rules/levels.test.ts`, `src/rules/abilities.test.ts`

**Interfaces:**
- Consumes: `ContentRegistry`, `createRegistry` (Task 9); `loadBuiltinContent` (Task 9); `Character`, `LevelChoice`, `InventoryItem`, `createCharacter` (Task 10); `ABILITIES`, `Ability`, `SkillId` (Task 3); `Effect`, `Formula`, `ArmorTraining`, `WeaponProficiency`, `Progression` (Task 3).
- Produces:
  - `types.ts`: `Warning { code: 'unknown-content' | 'multiclass-prerequisite' | 'ability-over-max'; detail: string }`, `ClassLevel`, `ActiveFeature`, `AbilityResult`, `CheckResult`, `SkillResult`, `HitDiceResult`, `ArmorClassResult`, `AttackResult`, `CasterStats`, `SlotResult`, `SpellcastingResult`, `ResourceResult`, `DerivedSheet` (volledige vorm hieronder).
  - `warnings.ts`: `warnOnce(warnings: Warning[], warning: Warning): void`, `unknownContent(warnings: Warning[], id: string): void`.
  - `formula.ts`: `interface FormulaContext { pb; mods: Record<Ability, number>; totalLevel; classLevel(classId): number; column(classId, key): number }`, `evalFormula(formula: Formula, ctx: FormulaContext): number`, `parseColumnNumber(text: string | undefined): number`.
  - `levels.ts`: `proficiencyBonus(totalLevel: number): number`, `getClassLevels(character, registry, warnings): ClassLevel[]` (volgorde: zoals eerst genomen, dus de eerste class staat vooraan).
  - `abilities.ts`: `abilityModifier(score: number): number`, `computeAbilities(character, effects: Effect[], warnings): Record<Ability, AbilityResult>`.
  - `testing/fixtures.ts`: `registry`, `level(classId, extra?)`, `levels(classId, count)`, `item(id, itemId, equipped?)`, `interface CharacterPatch`, `makeCharacter(patch?)`, `kael(patch?)`.

- [ ] **Step 1: Types en waarschuwingen schrijven** (geen gedrag, dus geen eigen test; ze worden in deze en volgende tasks gebruikt)

`src/rules/types.ts`:

```ts
import type { Ability, SkillId } from '../content/constants';
import type { ArmorTraining, Effect, Progression, WeaponProficiency } from '../content/schema';

export type WarningCode = 'unknown-content' | 'multiclass-prerequisite' | 'ability-over-max';
export interface Warning {
  code: WarningCode;
  detail: string;
}

export interface ClassLevel {
  classId: string;
  name: string;
  level: number;
  hitDie: number;
  subclassId?: string;
  subclassName?: string;
}

export type FeatureOrigin = 'class' | 'subclass' | 'species' | 'feat' | 'option';
export interface ActiveFeature {
  id: string;
  name: string;
  text: string;
  effects: Effect[];
  origin: FeatureOrigin;
  ownerName: string;
  level?: number;
  /** An unfilled skeleton feature. */
  placeholder: boolean;
}

export interface AbilityResult {
  score: number;
  mod: number;
  max: number;
}
export interface CheckResult {
  bonus: number;
  proficient: boolean;
}
export interface SkillResult extends CheckResult {
  ability: Ability;
  expertise: boolean;
}
export interface HitDiceResult {
  die: number;
  total: number;
  spent: number;
}
export interface ArmorClassResult {
  value: number;
  source: string;
  armored: boolean;
  shield: boolean;
}
export interface AttackResult {
  id: string;
  kind: 'weapon' | 'cantrip';
  name: string;
  toHit?: number;
  saveDC?: number;
  saveAbility?: Ability;
  damage: string;
  damageType: string;
  properties: string[];
  mastery?: string;
  proficient: boolean;
}
export interface CasterStats {
  classId: string;
  name: string;
  ability: Ability;
  progression: Progression;
  attack: number;
  dc: number;
  preparedMax?: number;
  cantripsMax?: number;
}
export interface SlotResult {
  level: number;
  max: number;
  used: number;
}
export interface SpellcastingResult {
  classes: CasterStats[];
  slots: SlotResult[];
  pact?: { slots: number; slotLevel: number; used: number };
}
export interface ResourceResult {
  key: string;
  name: string;
  max: number;
  used: number;
  recharge: 'short' | 'long';
  shortRestRegain: number;
  pool: boolean;
}

export interface DerivedSheet {
  totalLevel: number;
  proficiencyBonus: number;
  classLevels: ClassLevel[];
  abilities: Record<Ability, AbilityResult>;
  saves: Record<Ability, CheckResult>;
  skills: Record<SkillId, SkillResult>;
  passivePerception: number;
  initiative: number;
  speed: number;
  /** Exhaustion: 2 per level, already subtracted from every d20 test bonus on this sheet. */
  d20Penalty: number;
  hp: { current: number; max: number; temp: number };
  hitDice: HitDiceResult[];
  ac: ArmorClassResult;
  attacks: AttackResult[];
  spellcasting: SpellcastingResult;
  resources: ResourceResult[];
  features: ActiveFeature[];
  armorTraining: ArmorTraining[];
  weaponProficiencies: WeaponProficiency[];
  flags: string[];
  warnings: Warning[];
}
```

`src/rules/warnings.ts`:

```ts
import type { Warning } from './types';

export function warnOnce(warnings: Warning[], warning: Warning): void {
  if (!warnings.some((w) => w.code === warning.code && w.detail === warning.detail)) warnings.push(warning);
}

export function unknownContent(warnings: Warning[], id: string): void {
  warnOnce(warnings, { code: 'unknown-content', detail: id });
}
```

- [ ] **Step 2: Testfixtures schrijven**

`src/rules/testing/fixtures.ts`:

```ts
import { loadBuiltinContent } from '../../content/load';
import { createRegistry } from '../../content/registry';
import { createCharacter, type Character, type InventoryItem, type LevelChoice } from '../../model/character';

export const registry = createRegistry(loadBuiltinContent());

/** A level in a class; short names get the srd prefix ("fighter" -> "srd:class:fighter"). */
export function level(classId: string, extra: Partial<LevelChoice> = {}): LevelChoice {
  return { classId: classId.includes(':') ? classId : `srd:class:${classId}`, hp: 'average', featureChoices: {}, ...extra };
}

export function levels(classId: string, count: number): LevelChoice[] {
  return Array.from({ length: count }, () => level(classId));
}

export function item(id: string, itemId: string, equipped = true): InventoryItem {
  return { id, itemId, qty: 1, equipped, attuned: false };
}

export interface CharacterPatch {
  choices?: Partial<Character['choices']>;
  state?: Partial<Character['state']>;
  inventory?: InventoryItem[];
  overrides?: Character['overrides'];
}

export function makeCharacter(patch: CharacterPatch = {}): Character {
  const base = createCharacter({ id: 'test', name: 'Test', now: '2026-10-15T00:00:00.000Z' });
  return {
    ...base,
    choices: { ...base.choices, ...patch.choices },
    state: { ...base.state, ...patch.state },
    inventory: patch.inventory ?? [],
    overrides: patch.overrides ?? [],
  };
}

/**
 * Reference character: Fighter 3 (Champion) / Wizard 2, Human, Soldier background (+2 STR, +1 CON),
 * Defense fighting style, wearing Chain Mail and a Shield, wielding a Longsword.
 */
export function kael(patch: CharacterPatch = {}): Character {
  return makeCharacter({
    ...patch,
    choices: {
      abilityMethod: 'standard',
      baseAbilities: { str: 15, dex: 13, con: 14, int: 14, wis: 10, cha: 8 },
      speciesId: 'srd:species:human',
      backgroundId: 'srd:background:soldier',
      backgroundAbilityBonuses: { str: 2, con: 1 },
      levels: [
        level('fighter', { featId: 'srd:feat:defense' }),
        level('fighter'),
        level('fighter', { subclassId: 'srd:subclass:champion' }),
        level('wizard'),
        level('wizard'),
      ],
      skillProficiencies: ['perception', 'history'],
      ...patch.choices,
    },
    inventory: patch.inventory ?? [item('i1', 'srd:armor:chain-mail'), item('i2', 'srd:armor:shield'), item('i3', 'srd:weapon:longsword')],
  });
}
```

- [ ] **Step 3: De falende tests schrijven**

`src/rules/formula.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Formula } from '../content/schema';
import { evalFormula, parseColumnNumber, type FormulaContext } from './formula';

const levelsByClass: Record<string, number> = { 'srd:class:fighter': 3, 'srd:class:wizard': 2 };
const ctx: FormulaContext = {
  pb: 3,
  mods: { str: 3, dex: 1, con: 2, int: 2, wis: 0, cha: -1 },
  totalLevel: 5,
  classLevel: (classId) => levelsByClass[classId] ?? 0,
  column: (classId, key) => (classId === 'srd:class:fighter' && key === 'second-wind' ? 2 : 0),
};

describe('evalFormula', () => {
  it.each<[Formula, number]>([
    [4, 4],
    [{ pb: true }, 3],
    [{ mod: 'str' }, 3],
    [{ mod: 'cha', min: 1 }, 1],
    [{ level: 'total' }, 5],
    [{ level: 'srd:class:fighter', times: 5 }, 15],
    [{ level: 'srd:class:paladin' }, 0],
    [{ column: { classId: 'srd:class:fighter', key: 'second-wind' } }, 2],
    [{ atLevel: { classId: 'srd:class:fighter', values: [[2, 1], [17, 2]] } }, 1],
    [{ atLevel: { classId: 'srd:class:fighter', values: [[9, 1]] } }, 0],
    [{ sum: [1, { pb: true }, { mod: 'dex' }] }, 5],
  ])('%j -> %i', (formula, expected) => {
    expect(evalFormula(formula, ctx)).toBe(expected);
  });
});

describe('parseColumnNumber', () => {
  it.each<[string | undefined, number]>([
    ['+10 ft.', 10],
    ['3', 3],
    ['—', 0],
    [undefined, 0],
  ])('%s -> %i', (text, expected) => expect(parseColumnNumber(text)).toBe(expected));
});
```

`src/rules/levels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseColumnNumber } from './formula';
import { getClassLevels, proficiencyBonus } from './levels';
import { kael, level, makeCharacter, registry } from './testing/fixtures';
import type { Warning } from './types';

describe('proficiencyBonus', () => {
  it.each([[0, 2], [1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4], [13, 5], [16, 5], [17, 6], [20, 6]])(
    'level %i -> +%i',
    (totalLevel, bonus) => expect(proficiencyBonus(totalLevel)).toBe(bonus),
  );

  it('matches the Proficiency Bonus column of every SRD class table', () => {
    for (const cls of registry.list('class')) {
      for (const row of cls.levels) {
        expect(proficiencyBonus(row.level), `${cls.name} ${row.level}`).toBe(parseColumnNumber(row.columns['proficiency-bonus']));
      }
    }
  });
});

describe('getClassLevels', () => {
  it('groups levels by class in the order they were taken', () => {
    const warnings: Warning[] = [];
    expect(getClassLevels(kael(), registry, warnings)).toEqual([
      { classId: 'srd:class:fighter', name: 'Fighter', level: 3, hitDie: 10, subclassId: 'srd:subclass:champion', subclassName: 'Champion' },
      { classId: 'srd:class:wizard', name: 'Wizard', level: 2, hitDie: 6 },
    ]);
    expect(warnings).toEqual([]);
  });

  it('skips unknown classes and subclasses with a single warning each', () => {
    const warnings: Warning[] = [];
    const character = makeCharacter({
      choices: { levels: [level('user:class:deleted'), level('user:class:deleted'), level('fighter', { subclassId: 'user:subclass:gone' })] },
    });
    expect(getClassLevels(character, registry, warnings)).toEqual([{ classId: 'srd:class:fighter', name: 'Fighter', level: 1, hitDie: 10 }]);
    expect(warnings).toEqual([
      { code: 'unknown-content', detail: 'user:class:deleted' },
      { code: 'unknown-content', detail: 'user:subclass:gone' },
    ]);
  });
});
```

`src/rules/abilities.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { abilityModifier, computeAbilities } from './abilities';
import { kael, level, makeCharacter } from './testing/fixtures';
import type { Warning } from './types';

const tens = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

describe('abilityModifier', () => {
  it.each([[1, -5], [8, -1], [9, -1], [10, 0], [11, 0], [12, 1], [15, 2], [20, 5], [30, 10]])('%i -> %i', (score, mod) =>
    expect(abilityModifier(score)).toBe(mod),
  );
});

describe('computeAbilities', () => {
  it('adds background bonuses', () => {
    const warnings: Warning[] = [];
    const result = computeAbilities(kael(), [], warnings);
    expect(result.str).toEqual({ score: 17, mod: 3, max: 20 });
    expect(result.dex).toEqual({ score: 13, mod: 1, max: 20 });
    expect(result.con).toEqual({ score: 15, mod: 2, max: 20 });
    expect(result.cha).toEqual({ score: 8, mod: -1, max: 20 });
    expect(warnings).toEqual([]);
  });

  it('adds ability score improvements from level choices', () => {
    const character = makeCharacter({ choices: { baseAbilities: tens, levels: [level('fighter'), level('fighter', { asi: { dex: 2, con: 1 } })] } });
    const result = computeAbilities(character, [], []);
    expect([result.dex.score, result.con.score]).toEqual([12, 11]);
  });

  it('caps at the maximum and warns', () => {
    const warnings: Warning[] = [];
    const character = makeCharacter({ choices: { baseAbilities: { ...tens, str: 20 }, backgroundAbilityBonuses: { str: 2 } } });
    expect(computeAbilities(character, [], warnings).str).toEqual({ score: 20, mod: 5, max: 20 });
    expect(warnings).toEqual([{ code: 'ability-over-max', detail: 'str' }]);
  });

  it('raises the maximum with abilityMax and applies numeric ability bonuses', () => {
    const warnings: Warning[] = [];
    const character = makeCharacter({
      choices: { baseAbilities: { ...tens, str: 20 }, backgroundAbilityBonuses: { str: 2 } },
      overrides: [{ id: 'o1', target: 'abilityMax:str', value: 2, reason: 'Epic Boon' }],
    });
    const result = computeAbilities(character, [{ kind: 'bonus', target: 'ability:dex', value: 2 }], warnings);
    expect(result.str).toEqual({ score: 22, mod: 6, max: 22 });
    expect(result.dex.score).toBe(12);
    expect(warnings).toEqual([]);
  });
});
```

- [ ] **Step 4: Tests draaien en zien falen**

Run: `npm test -- src/rules`
Expected: FAIL, `Failed to resolve import "./formula"`, `"./levels"` en `"./abilities"`.

- [ ] **Step 5: Implementeren**

`src/rules/formula.ts`:

```ts
import type { Ability } from '../content/constants';
import type { Formula } from '../content/schema';

export interface FormulaContext {
  pb: number;
  mods: Record<Ability, number>;
  totalLevel: number;
  classLevel(classId: string): number;
  column(classId: string, key: string): number;
}

export function evalFormula(formula: Formula, ctx: FormulaContext): number {
  if (typeof formula === 'number') return formula;
  if ('pb' in formula) return ctx.pb;
  if ('mod' in formula) return Math.max(ctx.mods[formula.mod], formula.min ?? -Infinity);
  if ('level' in formula) return (formula.level === 'total' ? ctx.totalLevel : ctx.classLevel(formula.level)) * (formula.times ?? 1);
  if ('column' in formula) return ctx.column(formula.column.classId, formula.column.key);
  if ('atLevel' in formula) {
    const classLevel = ctx.classLevel(formula.atLevel.classId);
    let value = 0;
    for (const [minLevel, atValue] of formula.atLevel.values) if (classLevel >= minLevel) value = atValue;
    return value;
  }
  return formula.sum.reduce((total, part) => total + evalFormula(part, ctx), 0);
}

/** Number in a class table cell: "+10 ft." -> 10, "—" -> 0. */
export function parseColumnNumber(text: string | undefined): number {
  const match = /-?\d+/.exec(text ?? '');
  return match ? Number(match[0]) : 0;
}
```

`src/rules/levels.ts`:

```ts
import type { ContentRegistry } from '../content/registry';
import type { Character } from '../model/character';
import type { ClassLevel, Warning } from './types';
import { unknownContent } from './warnings';

/** +2 at levels 1–4, +3 at 5–8, … +6 at 17–20 (Character Advancement table). Level 0 counts as 1. */
export function proficiencyBonus(totalLevel: number): number {
  return Math.floor((Math.max(1, totalLevel) - 1) / 4) + 2;
}

export function getClassLevels(character: Character, registry: ContentRegistry, warnings: Warning[]): ClassLevel[] {
  const result: ClassLevel[] = [];
  for (const choice of character.choices.levels) {
    let entry = result.find((c) => c.classId === choice.classId);
    if (!entry) {
      const cls = registry.getOf('class', choice.classId);
      if (!cls) {
        unknownContent(warnings, choice.classId);
        continue;
      }
      entry = { classId: cls.id, name: cls.name, level: 0, hitDie: cls.hitDie };
      result.push(entry);
    }
    entry.level += 1;
    if (choice.subclassId) {
      const sub = registry.getOf('subclass', choice.subclassId);
      if (sub) {
        entry.subclassId = sub.id;
        entry.subclassName = sub.name;
      } else {
        unknownContent(warnings, choice.subclassId);
      }
    }
  }
  return result;
}
```

`src/rules/abilities.ts`:

```ts
import { ABILITIES, type Ability } from '../content/constants';
import type { Effect } from '../content/schema';
import type { Character } from '../model/character';
import type { AbilityResult, Warning } from './types';
import { warnOnce } from './warnings';

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Base + background bonus + ASIs + numeric `ability:<ab>` bonuses and overrides, capped at 20
 * plus any `abilityMax:<ab>` bonuses. Non-numeric ability bonus formulas are ignored.
 */
export function computeAbilities(character: Character, effects: Effect[], warnings: Warning[]): Record<Ability, AbilityResult> {
  const { baseAbilities, backgroundAbilityBonuses, levels } = character.choices;
  const result = {} as Record<Ability, AbilityResult>;
  for (const ability of ABILITIES) {
    let raw = baseAbilities[ability] + (backgroundAbilityBonuses[ability] ?? 0);
    for (const choice of levels) raw += choice.asi?.[ability] ?? 0;
    let max = 20;
    const apply = (target: string, value: number) => {
      if (target === `ability:${ability}`) raw += value;
      if (target === `abilityMax:${ability}`) max += value;
    };
    for (const effect of effects) if (effect.kind === 'bonus' && typeof effect.value === 'number') apply(effect.target, effect.value);
    for (const override of character.overrides) apply(override.target, override.value);
    if (raw > max) warnOnce(warnings, { code: 'ability-over-max', detail: ability });
    const score = Math.min(raw, max);
    result[ability] = { score, mod: abilityModifier(score), max };
  }
  return result;
}
```

- [ ] **Step 6: Tests draaien**

Run: `npm test -- src/rules && npm run typecheck`
Expected: PASS, typecheck zonder fouten.

- [ ] **Step 7: Committen**

```bash
git add src/rules
git commit -m "feat: rules-fundament met formules, levels en abilities" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: deriveSheet: features, proficiencies, checks, HP, AC, speed en wapens

**Files:**
- Create: `src/rules/features.ts`, `src/rules/bonuses.ts`, `src/rules/proficiencies.ts`, `src/rules/checks.ts`, `src/rules/combat.ts`, `src/rules/derive.ts`
- Test: `src/rules/derive.test.ts`

**Interfaces:**
- Consumes: alles uit Task 11; `ContentRegistry` (Task 9); `ArmorDef`, `WeaponDef`, `ClassDef`, `FeatDef`, `Effect` (Task 3); `SKILLS`, `SKILL_IDS`, `ABILITIES` (Task 3).
- Produces:
  - `features.ts`: `collectFeatures(character, registry, classLevels, warnings): ActiveFeature[]` (class-features tot het eigen level, subclass-features, species-traits, gekozen opties, daarna feats uit background, levels en `bonusFeatIds`; elke ID één keer).
  - `bonuses.ts`: `interface Equipment { armor?: ArmorDef; shield?: ArmorDef }`, `equippedArmor(character, registry): Equipment`, `type BonusFn = (target: string) => number`, `makeBonus(effects, overrides, ctx, equipment): BonusFn`. `when: 'armored'` = armor aan; `'unarmored'` = geen armor en geen shield; `'notHeavyArmor'` = geen heavy armor.
  - `proficiencies.ts`: `interface Proficiencies { saves: Set<Ability>; skills: Set<string>; expertise: Set<string>; armor: Set<ArmorTraining>; weapons: Set<WeaponProficiency>; halfProficiency: boolean }`, `computeProficiencies(character, registry, classLevels, effects): Proficiencies`. Saves en volledige armor/wapens van de eerste class; latere classes geven alleen hun `multiclass`-proficiencies.
  - `checks.ts`: `computeSaves(...)`, `computeSkills(...)` (geeft `{ skills, passivePerception }`), `computeInitiative(...)`.
  - `combat.ts`: `computeHpMax`, `computeHitDice`, `computeArmorClass`, `computeSpeed`, `isWeaponProficient(weapon, proficiencies)`, `withModifier(dice, modifier)`, `computeWeaponAttacks`.
  - `derive.ts`: `deriveSheet(character: Character, registry: ContentRegistry): DerivedSheet`. In deze task zijn `spellcasting` en `resources` nog leeg; Task 13 vult ze.

Regels (SRD 5.2.1, nagelezen): Jack of All Trades geldt alleen voor skill checks, niet voor initiative. Passive Perception = 10 + Perception-bonus en wordt niet door Exhaustion verlaagd (geen d20-worp). Exhaustion: −2 per level op d20-worpen, −5 ft speed per level. Heavy armor telt geen DEX mee; te weinig STR voor de armor kost 10 ft speed. Meerdere AC-berekeningen stapelen niet: de hoogste telt. HP: eerste character-level maximaal, daarna gemiddeld (die/2 + 1) of gerold, steeds + CON.

- [ ] **Step 1: De falende test schrijven**

`src/rules/derive.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { deriveSheet } from './derive';
import { item, kael, level, levels, makeCharacter, registry } from './testing/fixtures';

const derive = (character: Parameters<typeof deriveSheet>[0]) => deriveSheet(character, registry);
const human = { speciesId: 'srd:species:human' };

describe('deriveSheet: Kael (Fighter 3 Champion / Wizard 2)', () => {
  const sheet = derive(kael());

  it('computes level, proficiency bonus and abilities', () => {
    expect(sheet.totalLevel).toBe(5);
    expect(sheet.proficiencyBonus).toBe(3);
    expect(Object.values(sheet.abilities).map((a) => a.score)).toEqual([17, 13, 15, 14, 10, 8]);
  });

  it('takes saving throw proficiencies from the first class only', () => {
    expect(sheet.saves).toEqual({
      str: { bonus: 6, proficient: true },
      dex: { bonus: 1, proficient: false },
      con: { bonus: 5, proficient: true },
      int: { bonus: 2, proficient: false },
      wis: { bonus: 0, proficient: false },
      cha: { bonus: -1, proficient: false },
    });
  });

  it('combines background and chosen skill proficiencies', () => {
    expect(sheet.skills.athletics).toEqual({ bonus: 6, proficient: true, expertise: false, ability: 'str' });
    expect(sheet.skills.intimidation.bonus).toBe(2);
    expect(sheet.skills.perception.bonus).toBe(3);
    expect(sheet.skills.history.bonus).toBe(5);
    expect(sheet.skills.arcana).toMatchObject({ bonus: 2, proficient: false });
    expect(sheet.passivePerception).toBe(13);
    expect(sheet.initiative).toBe(1);
    expect(sheet.speed).toBe(30);
  });

  it('computes hit points and hit dice', () => {
    expect(sheet.hp).toEqual({ current: 0, max: 40, temp: 0 });
    expect(sheet.hitDice).toEqual([
      { die: 10, total: 3, spent: 0 },
      { die: 6, total: 2, spent: 0 },
    ]);
  });

  it('computes armor class from armor, shield and the Defense fighting style', () => {
    expect(sheet.ac).toEqual({ value: 19, source: 'Chain Mail', armored: true, shield: true });
    const unarmored = derive(kael({ inventory: [item('i3', 'srd:weapon:longsword')] }));
    expect(unarmored.ac).toEqual({ value: 11, source: 'Unarmored', armored: false, shield: false });
  });

  it('computes weapon attacks', () => {
    expect(sheet.attacks).toEqual([
      {
        id: 'i3', kind: 'weapon', name: 'Longsword', toHit: 6, damage: '1d8+3', damageType: 'Slashing',
        properties: ['Versatile (1d10)'], mastery: 'Sap', proficient: true,
      },
    ]);
  });

  it('lists features, feats and proficiencies', () => {
    expect(sheet.features.map((f) => f.id)).toEqual(
      expect.arrayContaining([
        'srd:feature:fighter:1:second-wind',
        'srd:feature:fighter:2:action-surge',
        'srd:feature:champion:3:improved-critical',
        'srd:feature:wizard:1:arcane-recovery',
        'srd:feature:human:resourceful',
        'srd:feat:defense',
        'srd:feat:savage-attacker',
      ]),
    );
    expect(sheet.features.find((f) => f.id === 'srd:feat:defense')?.origin).toBe('feat');
    expect(sheet.features.some((f) => f.id.startsWith('srd:feature:fighter:4:'))).toBe(false);
    expect(sheet.armorTraining).toEqual(['light', 'medium', 'heavy', 'shield']);
    expect(sheet.weaponProficiencies).toEqual(['simple', 'martial']);
    expect(sheet.flags).toEqual(['heroic-inspiration-on-long-rest']);
    expect(sheet.warnings).toEqual([]);
  });
});

describe('deriveSheet: unarmored classes', () => {
  const monk = (inventory: ReturnType<typeof item>[] = []) =>
    derive(makeCharacter({
      choices: { ...human, baseAbilities: { str: 10, dex: 16, con: 14, int: 10, wis: 16, cha: 8 }, levels: levels('monk', 5) },
      inventory,
    }));
  const barbarian = (inventory: ReturnType<typeof item>[] = []) =>
    derive(makeCharacter({
      choices: { ...human, baseAbilities: { str: 16, dex: 14, con: 16, int: 8, wis: 10, cha: 10 }, levels: levels('barbarian', 5) },
      inventory,
    }));

  it('Monk: Unarmored Defense and Unarmored Movement only without armor and shield', () => {
    expect(monk().ac).toEqual({ value: 16, source: 'Unarmored Defense', armored: false, shield: false });
    expect(monk().speed).toBe(40);
    expect(monk([item('s', 'srd:armor:shield')]).ac).toEqual({ value: 15, source: 'Unarmored', armored: false, shield: true });
    expect(monk([item('s', 'srd:armor:shield')]).speed).toBe(30);
    expect(monk().hp.max).toBe(38);
    expect(monk().saves.dex).toEqual({ bonus: 6, proficient: true });
  });

  it('Monk: proficient with Light martial weapons only', () => {
    const attacks = monk([item('a', 'srd:weapon:shortsword'), item('b', 'srd:weapon:longsword')]).attacks;
    expect(attacks.map((a) => [a.name, a.toHit, a.damage, a.proficient])).toEqual([
      ['Shortsword', 6, '1d6+3', true],
      ['Longsword', 0, '1d8', false],
    ]);
  });

  it('Barbarian: Unarmored Defense with a shield, Fast Movement except in heavy armor', () => {
    expect(barbarian().ac).toEqual({ value: 15, source: 'Unarmored Defense', armored: false, shield: false });
    expect(barbarian([item('s', 'srd:armor:shield')]).ac).toEqual({ value: 17, source: 'Unarmored Defense', armored: false, shield: true });
    expect(barbarian().speed).toBe(40);
    const heavy = barbarian([item('c', 'srd:armor:chain-mail')]);
    expect(heavy.ac).toEqual({ value: 16, source: 'Chain Mail', armored: true, shield: false });
    expect(heavy.speed).toBe(30);
    expect(barbarian().hp.max).toBe(55);
  });
});

describe('deriveSheet: special rules', () => {
  it('heavy armor without enough Strength costs 10 feet of speed', () => {
    const weak = makeCharacter({ choices: { ...human, levels: levels('fighter', 1) }, inventory: [item('c', 'srd:armor:chain-mail')] });
    expect(derive(weak).speed).toBe(20);
  });

  it('exhaustion lowers d20 tests and speed but not passive Perception', () => {
    const sheet = derive(kael({ state: { exhaustion: 2 } }));
    expect(sheet.d20Penalty).toBe(4);
    expect(sheet.skills.athletics.bonus).toBe(2);
    expect(sheet.saves.str.bonus).toBe(2);
    expect(sheet.initiative).toBe(-3);
    expect(sheet.attacks[0].toHit).toBe(2);
    expect(sheet.passivePerception).toBe(13);
    expect(sheet.speed).toBe(20);
  });

  it('Jack of All Trades adds half proficiency to skills without proficiency, not to initiative', () => {
    const bard = derive(makeCharacter({
      choices: { baseAbilities: { str: 8, dex: 10, con: 12, int: 10, wis: 10, cha: 14 }, levels: levels('bard', 2), skillProficiencies: ['performance', 'persuasion'] },
    }));
    expect(bard.skills.arcana).toMatchObject({ bonus: 1, proficient: false });
    expect(bard.skills.performance.bonus).toBe(4);
    expect(bard.initiative).toBe(0);
  });

  it('expertise doubles the proficiency bonus', () => {
    const sheet = derive(kael({ choices: { expertise: ['athletics'] } }));
    expect(sheet.skills.athletics).toMatchObject({ bonus: 9, expertise: true, proficient: true });
  });

  it('applies overrides and Dwarven Toughness', () => {
    const sheet = derive(kael({ overrides: [{ id: 'o1', target: 'ac', value: 1, reason: 'Ring of Protection' }, { id: 'o2', target: 'attack:i3', value: 1, reason: '+1 sword' }] }));
    expect(sheet.ac.value).toBe(20);
    expect(sheet.attacks[0].toHit).toBe(7);
    const dwarf = derive(makeCharacter({ choices: { speciesId: 'srd:species:dwarf', levels: levels('fighter', 1) } }));
    expect(dwarf.hp.max).toBe(11);
  });
});

describe('deriveSheet: edge cases', () => {
  it('works for a freshly created character', () => {
    expect(derive(makeCharacter())).toMatchObject({
      totalLevel: 0,
      proficiencyBonus: 2,
      hp: { current: 0, max: 0, temp: 0 },
      ac: { value: 10, source: 'Unarmored', armored: false, shield: false },
      speed: 30,
      initiative: 0,
      passivePerception: 10,
      features: [],
      attacks: [],
      warnings: [],
    });
  });

  it('keeps calculating when content no longer exists', () => {
    const character = makeCharacter({
      choices: {
        speciesId: 'srd:species:atlantean',
        backgroundId: 'user:background:gone',
        levels: [level('user:class:deleted')],
        bonusFeatIds: ['user:feat:gone'],
        featureOptions: ['user:feature:gone'],
      },
      inventory: [item('x', 'user:weapon:gone')],
    });
    const sheet = derive(character);
    expect(sheet.totalLevel).toBe(0);
    expect(sheet.warnings).toHaveLength(5);
    expect(sheet.warnings).toEqual(
      expect.arrayContaining(
        ['user:class:deleted', 'srd:species:atlantean', 'user:background:gone', 'user:feat:gone', 'user:feature:gone'].map((detail) => ({
          code: 'unknown-content',
          detail,
        })),
      ),
    );
  });
});
```

- [ ] **Step 2: Test draaien en zien falen**

Run: `npm test -- src/rules/derive.test.ts`
Expected: FAIL, `Failed to resolve import "./derive"`.

- [ ] **Step 3: Features en bonussen implementeren**

`src/rules/features.ts`:

```ts
import type { ContentRegistry } from '../content/registry';
import type { FeatDef } from '../content/schema';
import type { Character } from '../model/character';
import type { ActiveFeature, ClassLevel, FeatureOrigin, Warning } from './types';
import { unknownContent } from './warnings';

function collectFeats(character: Character, registry: ContentRegistry, warnings: Warning[]): FeatDef[] {
  const { backgroundId, levels, bonusFeatIds } = character.choices;
  const ids: string[] = [];
  if (backgroundId) {
    const background = registry.getOf('background', backgroundId);
    if (!background) unknownContent(warnings, backgroundId);
    else if (background.featId) ids.push(background.featId);
  }
  for (const choice of levels) if (choice.featId) ids.push(choice.featId);
  ids.push(...bonusFeatIds);
  const feats: FeatDef[] = [];
  for (const id of ids) {
    const feat = registry.getOf('feat', id);
    if (feat) feats.push(feat);
    else unknownContent(warnings, id);
  }
  return feats;
}

export function collectFeatures(character: Character, registry: ContentRegistry, classLevels: ClassLevel[], warnings: Warning[]): ActiveFeature[] {
  const features: ActiveFeature[] = [];
  const seen = new Set<string>();
  const add = (id: string, origin: FeatureOrigin, ownerName?: string, level?: number) => {
    if (seen.has(id)) return;
    seen.add(id);
    const def = registry.getOf('feature', id);
    if (!def) {
      unknownContent(warnings, id);
      return;
    }
    features.push({
      id,
      name: def.name,
      text: def.text,
      effects: def.effects,
      origin,
      ownerName: ownerName ?? def.optionGroup ?? '',
      level,
      placeholder: def.source === 'skeleton' && def.name === '',
    });
  };

  for (const cl of classLevels) {
    const cls = registry.getOf('class', cl.classId);
    if (!cls) continue;
    for (const row of cls.levels.slice(0, cl.level)) for (const id of row.featureIds) add(id, 'class', cls.name, row.level);
    const sub = cl.subclassId ? registry.getOf('subclass', cl.subclassId) : undefined;
    if (sub) for (const f of sub.features) if (f.level <= cl.level) add(f.featureId, 'subclass', sub.name, f.level);
  }

  const { speciesId, featureOptions } = character.choices;
  if (speciesId) {
    const species = registry.getOf('species', speciesId);
    if (species) for (const id of species.traitIds) add(id, 'species', species.name);
    else unknownContent(warnings, speciesId);
  }
  for (const id of featureOptions) add(id, 'option');

  for (const feat of collectFeats(character, registry, warnings)) {
    if (seen.has(feat.id)) continue;
    seen.add(feat.id);
    features.push({ id: feat.id, name: feat.name, text: feat.text, effects: feat.effects, origin: 'feat', ownerName: '', placeholder: false });
  }
  return features;
}
```

`src/rules/bonuses.ts`:

```ts
import type { ContentRegistry } from '../content/registry';
import type { ArmorDef, Effect } from '../content/schema';
import type { Character } from '../model/character';
import { evalFormula, type FormulaContext } from './formula';

export interface Equipment {
  armor?: ArmorDef;
  shield?: ArmorDef;
}

/** The first equipped body armor and the first equipped shield. */
export function equippedArmor(character: Character, registry: ContentRegistry): Equipment {
  const equipment: Equipment = {};
  for (const entry of character.inventory) {
    if (!entry.equipped || !entry.itemId) continue;
    const armor = registry.getOf('armor', entry.itemId);
    if (!armor) continue;
    if (armor.category === 'shield') equipment.shield ??= armor;
    else equipment.armor ??= armor;
  }
  return equipment;
}

export type BonusFn = (target: string) => number;

export function makeBonus(effects: Effect[], overrides: Character['overrides'], ctx: FormulaContext, equipment: Equipment): BonusFn {
  const applies = (when: 'armored' | 'unarmored' | 'notHeavyArmor' | undefined): boolean => {
    if (when === 'armored') return !!equipment.armor;
    if (when === 'unarmored') return !equipment.armor && !equipment.shield;
    if (when === 'notHeavyArmor') return equipment.armor?.category !== 'heavy';
    return true;
  };
  return (target) => {
    let total = 0;
    for (const effect of effects) {
      if (effect.kind === 'bonus' && effect.target === target && applies(effect.when)) total += evalFormula(effect.value, ctx);
    }
    for (const override of overrides) if (override.target === target) total += override.value;
    return total;
  };
}
```

- [ ] **Step 4: Proficiencies en checks implementeren**

`src/rules/proficiencies.ts`:

```ts
import type { Ability } from '../content/constants';
import type { ContentRegistry } from '../content/registry';
import type { ArmorTraining, ClassDef, Effect, WeaponProficiency } from '../content/schema';
import type { Character } from '../model/character';
import type { ClassLevel } from './types';

export interface Proficiencies {
  saves: Set<Ability>;
  skills: Set<string>;
  expertise: Set<string>;
  armor: Set<ArmorTraining>;
  weapons: Set<WeaponProficiency>;
  halfProficiency: boolean;
}

export function computeProficiencies(character: Character, registry: ContentRegistry, classLevels: ClassLevel[], effects: Effect[]): Proficiencies {
  const [first, ...others] = classLevels
    .map((cl) => registry.getOf('class', cl.classId))
    .filter((cls): cls is ClassDef => cls !== undefined);
  const saves = new Set<Ability>(first?.savingThrows ?? []);
  const armor = new Set<ArmorTraining>(first?.armorTraining ?? []);
  const weapons = new Set<WeaponProficiency>(first?.weaponProficiencies ?? []);
  for (const cls of others) {
    cls.multiclass.armorTraining.forEach((a) => armor.add(a));
    cls.multiclass.weaponProficiencies.forEach((w) => weapons.add(w));
  }

  const skills = new Set<string>(character.choices.skillProficiencies);
  const { backgroundId } = character.choices;
  const background = backgroundId ? registry.getOf('background', backgroundId) : undefined;
  background?.skillProficiencies.forEach((s) => skills.add(s));

  let halfProficiency = false;
  for (const effect of effects) {
    if (effect.kind === 'halfProficiency') halfProficiency = true;
    if (effect.kind !== 'proficiency') continue;
    const [kind, value] = effect.target.split(':');
    if (kind === 'save') saves.add(value as Ability);
    if (kind === 'skill') skills.add(value);
    if (kind === 'armor') armor.add(value as ArmorTraining);
    if (kind === 'weapon') weapons.add(value as WeaponProficiency);
  }
  return { saves, skills, expertise: new Set(character.choices.expertise), armor, weapons, halfProficiency };
}
```

`src/rules/checks.ts`:

```ts
import { ABILITIES, SKILL_IDS, SKILLS, type Ability, type SkillId } from '../content/constants';
import type { BonusFn } from './bonuses';
import type { Proficiencies } from './proficiencies';
import type { AbilityResult, CheckResult, SkillResult } from './types';

type Abilities = Record<Ability, AbilityResult>;

export function computeSaves(abilities: Abilities, prof: Proficiencies, pb: number, bonus: BonusFn, d20Penalty: number): Record<Ability, CheckResult> {
  const result = {} as Record<Ability, CheckResult>;
  for (const ability of ABILITIES) {
    const proficient = prof.saves.has(ability);
    result[ability] = { proficient, bonus: abilities[ability].mod + (proficient ? pb : 0) + bonus(`save:${ability}`) - d20Penalty };
  }
  return result;
}

/** Expertise doubles the bonus; Jack of All Trades (halfProficiency) adds half PB to skills without proficiency. */
export function computeSkills(abilities: Abilities, prof: Proficiencies, pb: number, bonus: BonusFn, d20Penalty: number) {
  const skills = {} as Record<SkillId, SkillResult>;
  let perception = 0;
  for (const id of SKILL_IDS) {
    const ability = SKILLS[id];
    const expertise = prof.expertise.has(id);
    const proficient = expertise || prof.skills.has(id);
    const profPart = expertise ? 2 * pb : proficient ? pb : prof.halfProficiency ? Math.floor(pb / 2) : 0;
    const raw = abilities[ability].mod + profPart + bonus(`skill:${id}`);
    if (id === 'perception') perception = raw;
    skills[id] = { ability, proficient, expertise, bonus: raw - d20Penalty };
  }
  return { skills, passivePerception: 10 + perception + bonus('passivePerception') };
}

export function computeInitiative(abilities: Abilities, bonus: BonusFn, d20Penalty: number): number {
  return abilities.dex.mod + bonus('initiative') - d20Penalty;
}
```

- [ ] **Step 5: Combat-berekeningen implementeren**

`src/rules/combat.ts`:

```ts
import type { Ability } from '../content/constants';
import type { ContentRegistry } from '../content/registry';
import type { Effect, WeaponDef, WeaponProficiency } from '../content/schema';
import type { Character } from '../model/character';
import type { BonusFn, Equipment } from './bonuses';
import type { Proficiencies } from './proficiencies';
import type { AbilityResult, ArmorClassResult, AttackResult, ClassLevel, HitDiceResult } from './types';

type Abilities = Record<Ability, AbilityResult>;

export function computeHpMax(character: Character, registry: ContentRegistry, conMod: number, bonus: BonusFn): number {
  let total = 0;
  character.choices.levels.forEach((choice, index) => {
    const cls = registry.getOf('class', choice.classId);
    if (!cls) return;
    const gain = index === 0 ? cls.hitDie : choice.hp === 'average' ? cls.hitDie / 2 + 1 : choice.hp;
    total += gain + conMod;
  });
  return Math.max(0, total + bonus('hpMax'));
}

export function computeHitDice(classLevels: ClassLevel[], spent: Record<string, number>): HitDiceResult[] {
  const totals = new Map<number, number>();
  for (const cl of classLevels) totals.set(cl.hitDie, (totals.get(cl.hitDie) ?? 0) + cl.level);
  return [...totals.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([die, total]) => ({ die, total, spent: Math.min(total, Math.max(0, spent[`d${die}`] ?? 0)) }));
}

export function computeArmorClass(equipment: Equipment, abilities: Abilities, effects: Effect[], bonus: BonusFn): ArmorClassResult {
  const dex = abilities.dex.mod;
  let value: number;
  let source: string;
  if (equipment.armor) {
    const armor = equipment.armor;
    const dexPart = armor.category === 'heavy' ? 0 : armor.dexCap === null ? dex : Math.min(dex, armor.dexCap);
    value = armor.baseAC + dexPart;
    source = armor.name;
  } else {
    value = 10 + dex;
    source = 'Unarmored';
    for (const effect of effects) {
      if (effect.kind !== 'acFormula' || (equipment.shield && !effect.allowShield)) continue;
      const candidate = effect.base + effect.abilities.reduce((total, ability) => total + abilities[ability].mod, 0);
      if (candidate > value) {
        value = candidate;
        source = effect.name;
      }
    }
  }
  if (equipment.shield) value += equipment.shield.baseAC;
  return { value: value + bonus('ac'), source, armored: !!equipment.armor, shield: !!equipment.shield };
}

export function computeSpeed(character: Character, registry: ContentRegistry, abilities: Abilities, equipment: Equipment, bonus: BonusFn): number {
  const { speciesId } = character.choices;
  const species = speciesId ? registry.getOf('species', speciesId) : undefined;
  let speed = (species?.speed ?? 30) + bonus('speed');
  const strength = equipment.armor?.strength;
  if (strength && abilities.str.score < strength) speed -= 10;
  speed -= 5 * character.state.exhaustion;
  return Math.max(0, speed);
}

export function isWeaponProficient(weapon: WeaponDef, proficiencies: Set<WeaponProficiency>): boolean {
  if (proficiencies.has(weapon.category)) return true;
  if (weapon.category !== 'martial') return false;
  const has = (property: string) => weapon.properties.some((p) => p.startsWith(property));
  if (proficiencies.has('martial-light') && has('Light')) return true;
  return proficiencies.has('martial-finesse-or-light') && (has('Finesse') || has('Light'));
}

export function withModifier(dice: string, modifier: number): string {
  if (modifier === 0) return dice;
  return `${dice}${modifier > 0 ? '+' : '-'}${Math.abs(modifier)}`;
}

export function computeWeaponAttacks(
  character: Character,
  registry: ContentRegistry,
  abilities: Abilities,
  prof: Proficiencies,
  pb: number,
  bonus: BonusFn,
  d20Penalty: number,
): AttackResult[] {
  const attacks: AttackResult[] = [];
  for (const entry of character.inventory) {
    if (!entry.equipped || !entry.itemId) continue;
    const weapon = registry.getOf('weapon', entry.itemId);
    if (!weapon) continue;
    const finesse = weapon.properties.some((p) => p.startsWith('Finesse'));
    const base = weapon.kind === 'ranged' ? abilities.dex.mod : abilities.str.mod;
    const mod = finesse ? Math.max(abilities.str.mod, abilities.dex.mod) : base;
    const proficient = isWeaponProficient(weapon, prof.weapons);
    attacks.push({
      id: entry.id,
      kind: 'weapon',
      name: entry.customName ?? weapon.name,
      toHit: mod + (proficient ? pb : 0) + bonus('attack') + bonus(`attack:${entry.id}`) - d20Penalty,
      damage: withModifier(weapon.damageDice, mod + bonus('damage') + bonus(`damage:${entry.id}`)),
      damageType: weapon.damageType,
      properties: weapon.properties,
      mastery: weapon.mastery,
      proficient,
    });
  }
  return attacks;
}
```

- [ ] **Step 6: deriveSheet implementeren**

`src/rules/derive.ts`:

```ts
import { ABILITIES, type Ability } from '../content/constants';
import type { ContentRegistry } from '../content/registry';
import type { Character } from '../model/character';
import { computeAbilities } from './abilities';
import { equippedArmor, makeBonus } from './bonuses';
import { computeInitiative, computeSaves, computeSkills } from './checks';
import { computeArmorClass, computeHitDice, computeHpMax, computeSpeed, computeWeaponAttacks } from './combat';
import { collectFeatures } from './features';
import { parseColumnNumber, type FormulaContext } from './formula';
import { getClassLevels, proficiencyBonus } from './levels';
import { computeProficiencies } from './proficiencies';
import type { DerivedSheet, Warning } from './types';

/** Everything on the sheet that follows from the character's choices and state. Never throws on missing content. */
export function deriveSheet(character: Character, registry: ContentRegistry): DerivedSheet {
  const warnings: Warning[] = [];
  const classLevels = getClassLevels(character, registry, warnings);
  const totalLevel = classLevels.reduce((sum, cl) => sum + cl.level, 0);
  const pb = proficiencyBonus(totalLevel);
  const features = collectFeatures(character, registry, classLevels, warnings);
  const effects = features.flatMap((f) => f.effects);
  const abilities = computeAbilities(character, effects, warnings);

  const levelOf = (classId: string) => classLevels.find((cl) => cl.classId === classId)?.level ?? 0;
  const ctx: FormulaContext = {
    pb,
    mods: Object.fromEntries(ABILITIES.map((a) => [a, abilities[a].mod])) as Record<Ability, number>,
    totalLevel,
    classLevel: levelOf,
    column: (classId, key) => {
      const classLevel = levelOf(classId);
      const cls = registry.getOf('class', classId);
      return classLevel > 0 && cls ? parseColumnNumber(cls.levels[classLevel - 1]?.columns[key]) : 0;
    },
  };
  const equipment = equippedArmor(character, registry);
  const bonus = makeBonus(effects, character.overrides, ctx, equipment);
  const prof = computeProficiencies(character, registry, classLevels, effects);
  const d20Penalty = 2 * character.state.exhaustion;
  const { skills, passivePerception } = computeSkills(abilities, prof, pb, bonus, d20Penalty);
  const hpMax = computeHpMax(character, registry, abilities.con.mod, bonus);

  return {
    totalLevel,
    proficiencyBonus: pb,
    classLevels,
    abilities,
    saves: computeSaves(abilities, prof, pb, bonus, d20Penalty),
    skills,
    passivePerception,
    initiative: computeInitiative(abilities, bonus, d20Penalty),
    speed: computeSpeed(character, registry, abilities, equipment, bonus),
    d20Penalty,
    hp: { current: Math.min(Math.max(0, character.state.hpCurrent), hpMax), max: hpMax, temp: character.state.hpTemp },
    hitDice: computeHitDice(classLevels, character.state.hitDiceSpent),
    ac: computeArmorClass(equipment, abilities, effects, bonus),
    attacks: computeWeaponAttacks(character, registry, abilities, prof, pb, bonus, d20Penalty),
    spellcasting: { classes: [], slots: [] },
    resources: [],
    features,
    armorTraining: [...prof.armor],
    weaponProficiencies: [...prof.weapons],
    flags: effects.flatMap((e) => (e.kind === 'flag' ? [e.flag] : [])),
    warnings,
  };
}
```

- [ ] **Step 7: Tests draaien**

Run: `npm test -- src/rules && npm run typecheck`
Expected: PASS, typecheck zonder fouten. Wijkt een referentiewaarde af, reken die dan met de hand na tegen de SRD (de berekening staat in de testnaam en in de "Regels" hierboven) voordat je code of test aanpast.

- [ ] **Step 8: Committen**

```bash
git add src/rules
git commit -m "feat: deriveSheet met features, checks, HP, AC, speed en wapens" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Spellcasting, resources en multiclass-vereisten

**Files:**
- Create: `src/rules/spellcasting.ts`, `src/rules/resources.ts`, `src/rules/multiclass.ts`
- Modify: `src/rules/derive.ts` (spellcasting, resources, cantrips en multiclass-waarschuwingen invullen)
- Test: `src/rules/spellcasting.test.ts`, en een nieuw `describe`-blok onderaan `src/rules/derive.test.ts`

**Interfaces:**
- Consumes: Task 11 en 12; `Progression` (Task 3).
- Produces:
  - `spellcasting.ts`: `MULTICLASS_SLOTS: readonly (readonly number[])[]` (Multiclass Spellcaster-tabel uit de SRD), `slotsForCasterLevel(casterLevel: number): number[]`, `interface CasterSource { classId; ability; progression; classLevel }`, `spellcastingSources(classLevels, registry, effects): CasterSource[]`, `casterLevel(sources: CasterSource[]): number`, `computeSpellcasting(character, registry, sources, abilities, pb, bonus, d20Penalty): SpellcastingResult`, `computeCantripAttacks(character, registry, spellcasting, totalLevel, warnings): AttackResult[]`.
  - `resources.ts`: `computeResources(effects: Effect[], ctx: FormulaContext, used: Record<string, number>): ResourceResult[]` (resources met maximum 0 vallen weg).
  - `multiclass.ts`: `multiclassWarnings(classLevels, registry, abilities, warnings): void`.

Regels (SRD 5.2.1 "Multiclassing", nagelezen): met één slot-gevende class gebruik je de tabel van die class; met meer tel je alle levels in full casters op, plus de helft van Paladin- en Ranger-levels (naar boven afgerond), en zoek je dat op in de Multiclass Spellcaster-tabel. Pact Magic staat daar los van. Vereisten: minstens 13 in de primary ability van élke class die je hebt; als dat niet zo is, alleen een waarschuwing. Cantrips schalen met het character-level.

**PHB (niet in de SRD):** third-casters (Eldritch Knight, Arcane Trickster) tellen in een multiclass voor een derde van hun class-level, naar beneden afgerond. Alleen gebruikt, krijgen ze de slots van caster-level `ceil(level / 3)`. Sam slaat dit na in het eigen Player's Handbook (Task 16).

- [ ] **Step 1: De falende tests schrijven**

`src/rules/spellcasting.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { casterLevel, MULTICLASS_SLOTS, slotsForCasterLevel, type CasterSource } from './spellcasting';
import { registry } from './testing/fixtures';

const source = (progression: CasterSource['progression'], classLevel: number): CasterSource => ({
  classId: `srd:class:${progression}`, ability: 'int', progression, classLevel,
});

describe('Multiclass Spellcaster table', () => {
  it('has 20 rows', () => {
    expect(MULTICLASS_SLOTS).toHaveLength(20);
  });

  it('gives every single-class SRD caster exactly the slots of its own class table', () => {
    for (const cls of registry.list('class')) {
      if (!cls.spellcasting || cls.spellcasting.progression === 'pact') continue;
      cls.slotsByLevel!.forEach((row, index) => {
        const fromRule = slotsForCasterLevel(casterLevel([{ classId: cls.id, ability: cls.spellcasting!.ability, progression: cls.spellcasting!.progression, classLevel: index + 1 }]));
        const padded = [...fromRule, ...Array(Math.max(0, row.length - fromRule.length)).fill(0)];
        expect(padded, `${cls.name} level ${index + 1}`).toEqual(row);
      });
    }
  });
});

describe('casterLevel', () => {
  it.each<[string, CasterSource[], number]>([
    ['single full caster', [source('full', 5)], 5],
    ['single half caster rounds up', [source('half', 3)], 2],
    ['single third caster rounds up (PHB)', [source('third', 7)], 3],
    ['full + half (half rounds up)', [source('full', 3), source('half', 3)], 5],
    ['two half casters', [source('half', 3), { ...source('half', 3), classId: 'srd:class:other' }], 4],
    ['full + third (third rounds down, PHB)', [source('full', 2), source('third', 7)], 4],
    ['pact magic does not count', [source('pact', 5)], 0],
    ['pact + full counts the full caster as single', [source('pact', 3), source('full', 2)], 2],
  ])('%s', (_name, sources, expected) => {
    expect(casterLevel(sources)).toBe(expected);
  });

  it('gives no slots at caster level 0', () => {
    expect(slotsForCasterLevel(0)).toEqual([]);
  });
});
```

Voeg toe onderaan `src/rules/derive.test.ts`:

```ts
describe('deriveSheet: spellcasting and resources', () => {
  it('Kael: wizard spellcasting, fighter and wizard resources, scaling cantrip', () => {
    const sheet = derive(kael({ choices: { spells: [{ classId: 'srd:class:wizard', spellId: 'srd:spell:fire-bolt', prepared: true }] } }));
    expect(sheet.spellcasting).toEqual({
      classes: [{ classId: 'srd:class:wizard', name: 'Wizard', ability: 'int', progression: 'full', attack: 5, dc: 13, preparedMax: 5, cantripsMax: 3 }],
      slots: [{ level: 1, max: 3, used: 0 }],
      pact: undefined,
    });
    expect(sheet.resources).toEqual([
      { key: 'second-wind', name: 'Second Wind', max: 2, used: 0, recharge: 'long', shortRestRegain: 1, pool: false },
      { key: 'action-surge', name: 'Action Surge', max: 1, used: 0, recharge: 'short', shortRestRegain: 0, pool: false },
      { key: 'arcane-recovery', name: 'Arcane Recovery', max: 1, used: 0, recharge: 'long', shortRestRegain: 0, pool: false },
    ]);
    expect(sheet.attacks.find((a) => a.kind === 'cantrip')).toEqual({
      id: 'srd:spell:fire-bolt', kind: 'cantrip', name: 'Fire Bolt', toHit: 5, saveDC: undefined, saveAbility: undefined,
      damage: '2d10', damageType: 'Fire', properties: [], proficient: true,
    });
  });

  it('save cantrips use the spell save DC', () => {
    const cleric = derive(makeCharacter({
      choices: { baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 }, levels: levels('cleric', 1), spells: [{ classId: 'srd:class:cleric', spellId: 'srd:spell:sacred-flame', prepared: true }] },
    }));
    expect(cleric.attacks[0]).toMatchObject({ name: 'Sacred Flame', saveDC: 13, saveAbility: 'dex', toHit: undefined, damage: '1d8' });
  });

  it('Paladin 2 / Sorcerer 3: multiclass slots and both casting classes', () => {
    const sheet = derive(makeCharacter({
      choices: {
        baseAbilities: { str: 15, dex: 10, con: 14, int: 8, wis: 12, cha: 13 },
        levels: [...levels('paladin', 2), ...levels('sorcerer', 3)],
      },
    }));
    expect(sheet.spellcasting.slots.map((s) => s.max)).toEqual([4, 3]);
    expect(sheet.spellcasting.classes).toEqual([
      { classId: 'srd:class:paladin', name: 'Paladin', ability: 'cha', progression: 'half', attack: 4, dc: 12, preparedMax: 3, cantripsMax: undefined },
      { classId: 'srd:class:sorcerer', name: 'Sorcerer', ability: 'cha', progression: 'full', attack: 4, dc: 12, preparedMax: 6, cantripsMax: 4 },
    ]);
    expect(sheet.resources.map((r) => [r.key, r.max, r.pool])).toEqual([
      ['lay-on-hands', 10, true],
      ['innate-sorcery', 2, false],
      ['sorcery-points', 3, true],
    ]);
    expect(sheet.hp.max).toBe(38);
    expect(sheet.warnings).toEqual([]);
  });

  it('Warlock 3 / Sorcerer 2: pact magic separate from spell slots', () => {
    const sheet = derive(makeCharacter({
      choices: { baseAbilities: { str: 8, dex: 14, con: 14, int: 10, wis: 10, cha: 16 }, levels: [...levels('warlock', 3), ...levels('sorcerer', 2)] },
    }));
    expect(sheet.spellcasting.slots).toEqual([{ level: 1, max: 3, used: 0 }]);
    expect(sheet.spellcasting.pact).toEqual({ slots: 2, slotLevel: 2, used: 0 });
    expect(sheet.resources.map((r) => [r.key, r.max])).toEqual([
      ['magical-cunning', 1],
      ['innate-sorcery', 2],
      ['sorcery-points', 2],
    ]);
  });

  it('Eldritch Knight 7 (skeleton): third-caster slots and placeholder features', () => {
    const sheet = derive(makeCharacter({
      choices: {
        baseAbilities: { str: 16, dex: 12, con: 14, int: 14, wis: 10, cha: 8 },
        levels: [level('fighter'), level('fighter'), level('fighter', { subclassId: 'skeleton:subclass:eldritch-knight' }), ...levels('fighter', 4)],
      },
    }));
    expect(sheet.spellcasting.slots.map((s) => s.max)).toEqual([4, 2]);
    expect(sheet.spellcasting.classes).toEqual([
      { classId: 'srd:class:fighter', name: 'Fighter', ability: 'int', progression: 'third', attack: 5, dc: 13, preparedMax: undefined, cantripsMax: undefined },
    ]);
    const placeholders = sheet.features.filter((f) => f.placeholder);
    expect(placeholders.map((f) => [f.level, f.origin, f.ownerName])).toEqual([
      [3, 'subclass', 'Eldritch Knight'],
      [7, 'subclass', 'Eldritch Knight'],
    ]);
    expect(sheet.resources.map((r) => [r.key, r.max])).toEqual([
      ['second-wind', 3],
      ['action-surge', 1],
    ]);
    expect(sheet.warnings).toEqual([]);
  });

  it('Font of Inspiration changes Bardic Inspiration to a short rest', () => {
    const bard = derive(makeCharacter({ choices: { baseAbilities: { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 16 }, levels: levels('bard', 5) } }));
    expect(bard.resources.find((r) => r.key === 'bardic-inspiration')).toMatchObject({ max: 3, recharge: 'short' });
  });

  it('Draconic Sorcery adds hit points and its own unarmored AC', () => {
    const sorcerer = derive(makeCharacter({
      choices: {
        baseAbilities: { str: 8, dex: 14, con: 10, int: 10, wis: 10, cha: 16 },
        levels: [level('sorcerer'), level('sorcerer'), level('sorcerer', { subclassId: 'srd:subclass:draconic-sorcery' })],
      },
    }));
    expect(sorcerer.hp.max).toBe(17);
    expect(sorcerer.ac).toMatchObject({ value: 15, source: 'Draconic Resilience' });
  });

  it('warns about unmet multiclass prerequisites for every class', () => {
    const lowInt = derive(makeCharacter({ choices: { baseAbilities: { str: 15, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, levels: [level('fighter'), level('wizard')] } }));
    expect(lowInt.warnings).toEqual([{ code: 'multiclass-prerequisite', detail: 'srd:class:wizard' }]);
    const monk = derive(makeCharacter({ choices: { baseAbilities: { str: 10, dex: 14, con: 10, int: 10, wis: 12, cha: 10 }, levels: [level('monk'), level('fighter')] } }));
    expect(monk.warnings).toEqual([{ code: 'multiclass-prerequisite', detail: 'srd:class:monk' }]);
    const single = derive(makeCharacter({ choices: { levels: levels('wizard', 2) } }));
    expect(single.warnings).toEqual([]);
  });

  it('clamps state that is above the current maximum', () => {
    const sheet = derive(kael({ state: { slotsUsed: { '1': 9 }, resourcesUsed: { 'second-wind': 7 }, hitDiceSpent: { d10: 8 }, hpCurrent: 99 } }));
    expect(sheet.spellcasting.slots[0].used).toBe(3);
    expect(sheet.resources.find((r) => r.key === 'second-wind')!.used).toBe(2);
    expect(sheet.hitDice[0].spent).toBe(3);
    expect(sheet.hp.current).toBe(40);
  });

  it('warns about unknown spells', () => {
    const sheet = derive(kael({ choices: { spells: [{ classId: 'srd:class:wizard', spellId: 'srd:spell:nope', prepared: true }] } }));
    expect(sheet.warnings).toEqual([{ code: 'unknown-content', detail: 'srd:spell:nope' }]);
  });
});
```

- [ ] **Step 2: Tests draaien en zien falen**

Run: `npm test -- src/rules`
Expected: FAIL, `Failed to resolve import "./spellcasting"`; de nieuwe derive-tests falen ook.

- [ ] **Step 3: Spellcasting implementeren**

`src/rules/spellcasting.ts`:

```ts
import type { Ability } from '../content/constants';
import type { ContentRegistry } from '../content/registry';
import type { Effect, Progression } from '../content/schema';
import type { Character } from '../model/character';
import type { BonusFn } from './bonuses';
import { parseColumnNumber } from './formula';
import type { AbilityResult, AttackResult, CasterStats, ClassLevel, SpellcastingResult, Warning } from './types';
import { unknownContent } from './warnings';

/** SRD 5.2.1 "Multiclass Spellcaster: Spell Slots per Spell Level", rows = caster level 1–20. */
export const MULTICLASS_SLOTS: readonly (readonly number[])[] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

export function slotsForCasterLevel(level: number): number[] {
  if (level <= 0) return [];
  return [...MULTICLASS_SLOTS[Math.min(level, 20) - 1]];
}

export interface CasterSource {
  classId: string;
  ability: Ability;
  progression: Progression;
  classLevel: number;
}

/** Spellcasting from class definitions, plus `spellcasting` effects (Eldritch Knight, Arcane Trickster). */
export function spellcastingSources(classLevels: ClassLevel[], registry: ContentRegistry, effects: Effect[]): CasterSource[] {
  const sources: CasterSource[] = [];
  for (const cl of classLevels) {
    const cls = registry.getOf('class', cl.classId);
    if (cls?.spellcasting) {
      sources.push({ classId: cl.classId, ability: cls.spellcasting.ability, progression: cls.spellcasting.progression, classLevel: cl.level });
    }
  }
  for (const effect of effects) {
    if (effect.kind !== 'spellcasting' || sources.some((s) => s.classId === effect.classId)) continue;
    const classLevel = classLevels.find((cl) => cl.classId === effect.classId)?.level ?? 0;
    if (classLevel > 0) sources.push({ classId: effect.classId, ability: effect.ability, progression: effect.progression, classLevel });
  }
  return sources;
}

/**
 * Caster level for the Multiclass Spellcaster table. One slot-granting class: that class's own progression
 * (half rounds up; third rounds up, PHB). Several: full levels + half levels rounded up (SRD) + third levels
 * rounded down (PHB). Pact Magic never counts.
 */
export function casterLevel(sources: CasterSource[]): number {
  const slotted = sources.filter((s) => s.progression !== 'pact');
  if (slotted.length === 1) {
    const { progression, classLevel } = slotted[0];
    if (progression === 'full') return classLevel;
    return progression === 'half' ? Math.ceil(classLevel / 2) : Math.ceil(classLevel / 3);
  }
  return slotted.reduce((total, s) => {
    if (s.progression === 'full') return total + s.classLevel;
    return total + (s.progression === 'half' ? Math.ceil(s.classLevel / 2) : Math.floor(s.classLevel / 3));
  }, 0);
}

export function computeSpellcasting(
  character: Character,
  registry: ContentRegistry,
  sources: CasterSource[],
  abilities: Record<Ability, AbilityResult>,
  pb: number,
  bonus: BonusFn,
  d20Penalty: number,
): SpellcastingResult {
  const classes: CasterStats[] = sources.map((source) => {
    const cls = registry.getOf('class', source.classId);
    const row = cls?.levels[source.classLevel - 1];
    const column = (key: string) => (row?.columns[key] !== undefined ? parseColumnNumber(row.columns[key]) : undefined);
    const mod = abilities[source.ability].mod;
    return {
      classId: source.classId,
      name: cls?.name ?? source.classId,
      ability: source.ability,
      progression: source.progression,
      attack: pb + mod + bonus('spellAttack') - d20Penalty,
      dc: 8 + pb + mod + bonus('spellDC'),
      preparedMax: column('prepared-spells'),
      cantripsMax: column('cantrips'),
    };
  });
  const slots = slotsForCasterLevel(casterLevel(sources)).map((max, index) => ({
    level: index + 1,
    max,
    used: Math.min(max, Math.max(0, character.state.slotsUsed[String(index + 1)] ?? 0)),
  }));
  const warlock = sources.find((s) => s.progression === 'pact');
  const pactRow = warlock ? registry.getOf('class', warlock.classId)?.pactSlotsByLevel?.[warlock.classLevel - 1] : undefined;
  const pact = pactRow ? { ...pactRow, used: Math.min(pactRow.slots, Math.max(0, character.state.pactSlotsUsed)) } : undefined;
  return { classes, slots, pact };
}

/** Damage cantrips the character knows, scaled at character levels 5, 11 and 17. */
export function computeCantripAttacks(
  character: Character,
  registry: ContentRegistry,
  spellcasting: SpellcastingResult,
  totalLevel: number,
  warnings: Warning[],
): AttackResult[] {
  const attacks: AttackResult[] = [];
  for (const known of character.choices.spells) {
    const spell = registry.getOf('spell', known.spellId);
    if (!spell) {
      unknownContent(warnings, known.spellId);
      continue;
    }
    if (spell.level !== 0 || !spell.cantrip) continue;
    const caster = spellcasting.classes.find((c) => c.classId === known.classId) ?? spellcasting.classes[0];
    const tier = spell.cantrip.scales ? 1 + [5, 11, 17].filter((l) => totalLevel >= l).length : 1;
    const dice = /^(\d+)d(\d+)$/.exec(spell.cantrip.damageDice);
    attacks.push({
      id: spell.id,
      kind: 'cantrip',
      name: spell.name,
      toHit: spell.cantrip.attackType === 'attack' ? caster?.attack : undefined,
      saveDC: spell.cantrip.attackType === 'save' ? caster?.dc : undefined,
      saveAbility: spell.cantrip.saveAbility,
      damage: dice ? `${Number(dice[1]) * tier}d${dice[2]}` : spell.cantrip.damageDice,
      damageType: spell.cantrip.damageType,
      properties: [],
      proficient: true,
    });
  }
  return attacks;
}
```

- [ ] **Step 4: Resources en multiclass-vereisten implementeren**

`src/rules/resources.ts`:

```ts
import type { Effect } from '../content/schema';
import { evalFormula, type FormulaContext } from './formula';
import type { ResourceResult } from './types';

/** Resources in feature order; a later resourceRecharge effect changes the recharge. Used counts are clamped to the maximum. */
export function computeResources(effects: Effect[], ctx: FormulaContext, used: Record<string, number>): ResourceResult[] {
  const resources = new Map<string, ResourceResult>();
  for (const effect of effects) {
    if (effect.kind !== 'resource') continue;
    resources.set(effect.key, {
      key: effect.key,
      name: effect.name,
      max: Math.max(0, evalFormula(effect.max, ctx)),
      used: 0,
      recharge: effect.recharge,
      shortRestRegain: effect.shortRestRegain === undefined ? 0 : evalFormula(effect.shortRestRegain, ctx),
      pool: effect.pool ?? false,
    });
  }
  for (const effect of effects) {
    if (effect.kind === 'resourceRecharge') {
      const resource = resources.get(effect.key);
      if (resource) resource.recharge = effect.recharge;
    }
  }
  for (const resource of resources.values()) resource.used = Math.min(resource.max, Math.max(0, used[resource.key] ?? 0));
  return [...resources.values()].filter((r) => r.max > 0);
}
```

`src/rules/multiclass.ts`:

```ts
import type { Ability } from '../content/constants';
import type { ContentRegistry } from '../content/registry';
import type { AbilityResult, ClassLevel, Warning } from './types';
import { warnOnce } from './warnings';

/** SRD: to multiclass you need 13 in the primary ability of every class you have. Only a warning; the DM decides. */
export function multiclassWarnings(
  classLevels: ClassLevel[],
  registry: ContentRegistry,
  abilities: Record<Ability, AbilityResult>,
  warnings: Warning[],
): void {
  if (classLevels.length < 2) return;
  for (const cl of classLevels) {
    const cls = registry.getOf('class', cl.classId);
    if (!cls) continue;
    const meets = cls.primaryAbilities.abilities.map((ability) => abilities[ability].score >= 13);
    const ok = cls.primaryAbilities.mode === 'all' ? meets.every(Boolean) : meets.some(Boolean);
    if (!ok) warnOnce(warnings, { code: 'multiclass-prerequisite', detail: cl.classId });
  }
}
```

- [ ] **Step 5: deriveSheet aanvullen**

In `src/rules/derive.ts`, voeg deze imports toe:

```ts
import { multiclassWarnings } from './multiclass';
import { computeResources } from './resources';
import { computeCantripAttacks, computeSpellcasting, spellcastingSources } from './spellcasting';
```

Vervang in `deriveSheet` het stuk vanaf `const hpMax = …` tot en met `return {` door:

```ts
  const hpMax = computeHpMax(character, registry, abilities.con.mod, bonus);
  const sources = spellcastingSources(classLevels, registry, effects);
  const spellcasting = computeSpellcasting(character, registry, sources, abilities, pb, bonus, d20Penalty);
  const attacks = [
    ...computeWeaponAttacks(character, registry, abilities, prof, pb, bonus, d20Penalty),
    ...computeCantripAttacks(character, registry, spellcasting, totalLevel, warnings),
  ];
  multiclassWarnings(classLevels, registry, abilities, warnings);

  return {
```

En vervang in het return-object deze drie regels:

```ts
    attacks: computeWeaponAttacks(character, registry, abilities, prof, pb, bonus, d20Penalty),
    spellcasting: { classes: [], slots: [] },
    resources: [],
```

door:

```ts
    attacks,
    spellcasting,
    resources: computeResources(effects, ctx, character.state.resourcesUsed),
```

- [ ] **Step 6: Tests draaien**

Run: `npm test && npm run typecheck`
Expected: alle tests PASS, typecheck zonder fouten.

- [ ] **Step 7: Committen**

```bash
git add src/rules
git commit -m "feat: spellcasting, resources en multiclass-vereisten in deriveSheet" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: State-acties: schade, healing, slots, resources en rests

**Files:**
- Create: `src/rules/actions.ts`
- Test: `src/rules/actions.test.ts`

**Interfaces:**
- Consumes: `Character` (Task 10); `DerivedSheet` (Task 11); `deriveSheet` (Task 12/13, alleen in de test); fixtures (Task 11).
- Produces (allemaal puur, geven een nieuw `Character` terug, wijzigen `updatedAt` niet; dat doet de opslag in plan 1B):
  - `applyDamage(character, amount): Character`
  - `applyHealing(character, amount, sheet): Character`
  - `setTempHp(character, value): Character`
  - `setDeathSaves(character, successes, failures): Character`
  - `setSlotsUsed(character, slotLevel, used, sheet): Character`
  - `setPactSlotsUsed(character, used, sheet): Character`
  - `setResourceUsed(character, key, used, sheet): Character` (onbekende sleutel: hetzelfde object terug)
  - `interface ShortRestOptions { hitDice: Record<string, number>; hpRegained: number }`, `shortRest(character, sheet, options): Character`
  - `longRest(character, sheet): Character`

Regels (SRD 5.2.1, nagelezen): schade gaat eerst van temp HP af; temp HP stapelen niet (de speler kiest, dus de nieuwe waarde vervangt de oude) en verdwijnen bij een long rest. Short rest: hit dice uitgeven (de UI rolt de dobbelstenen en geeft het totaal mee), short-rest-resources helemaal terug, "regain one"-resources één terug, Pact Magic-slots terug. Long rest: alle HP en hit dice terug, alle slots en resources terug, Exhaustion −1, en met Human Resourceful Heroic Inspiration. Rests bouwen de gebruikte waarden opnieuw op uit de sheet, zodat oude waarden boven het maximum (na het weghalen van een level) verdwijnen.

- [ ] **Step 1: De falende test schrijven**

`src/rules/actions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Character } from '../model/character';
import {
  applyDamage, applyHealing, longRest, setDeathSaves, setPactSlotsUsed, setResourceUsed, setSlotsUsed, setTempHp, shortRest,
} from './actions';
import { deriveSheet } from './derive';
import { kael, levels, makeCharacter, registry } from './testing/fixtures';

const sheetOf = (character: Character) => deriveSheet(character, registry);
const atFull = () => kael({ state: { hpCurrent: 40 } });

describe('hit points', () => {
  it('damage takes temporary hit points first', () => {
    const hurt = applyDamage(kael({ state: { hpCurrent: 40, hpTemp: 5 } }), 7);
    expect([hurt.state.hpTemp, hurt.state.hpCurrent]).toEqual([0, 38]);
  });

  it('never drops below 0 and ignores negative or fractional damage', () => {
    expect(applyDamage(atFull(), 99).state.hpCurrent).toBe(0);
    expect(applyDamage(atFull(), -5).state.hpCurrent).toBe(40);
    expect(applyDamage(atFull(), 2.7).state.hpCurrent).toBe(38);
  });

  it('healing stops at the maximum and resets death saves', () => {
    const down = kael({ state: { hpCurrent: 0, deathSaves: { successes: 1, failures: 2 } } });
    const healed = applyHealing(down, 50, sheetOf(down));
    expect(healed.state.hpCurrent).toBe(40);
    expect(healed.state.deathSaves).toEqual({ successes: 0, failures: 0 });
  });

  it('temporary hit points replace instead of stacking', () => {
    expect(setTempHp(setTempHp(atFull(), 10), 4).state.hpTemp).toBe(4);
    expect(setTempHp(atFull(), -3).state.hpTemp).toBe(0);
  });

  it('death saves stay between 0 and 3', () => {
    expect(setDeathSaves(atFull(), 5, -1).state.deathSaves).toEqual({ successes: 3, failures: 0 });
  });
});

describe('slots and resources', () => {
  const character = atFull();
  const sheet = sheetOf(character);

  it('clamps spell slots to the maximum', () => {
    expect(setSlotsUsed(character, 1, 5, sheet).state.slotsUsed).toEqual({ '1': 3 });
    expect(setSlotsUsed(character, 2, 1, sheet).state.slotsUsed).toEqual({ '2': 0 });
  });

  it('clamps pact slots (Kael has none)', () => {
    expect(setPactSlotsUsed(character, 2, sheet).state.pactSlotsUsed).toBe(0);
  });

  it('clamps resources and ignores unknown keys', () => {
    expect(setResourceUsed(character, 'second-wind', 9, sheet).state.resourcesUsed).toEqual({ 'second-wind': 2 });
    expect(setResourceUsed(character, 'rage', 1, sheet)).toBe(character);
  });
});

describe('rests', () => {
  const tired = kael({
    state: {
      hpCurrent: 20,
      hpTemp: 3,
      hitDiceSpent: { d10: 1 },
      slotsUsed: { '1': 2 },
      resourcesUsed: { 'second-wind': 2, 'action-surge': 1, 'arcane-recovery': 1 },
      exhaustion: 2,
    },
  });

  it('short rest spends hit dice, heals and recharges short-rest resources', () => {
    const rested = shortRest(tired, sheetOf(tired), { hitDice: { d10: 1, d6: 1 }, hpRegained: 9 });
    expect(rested.state.hitDiceSpent).toEqual({ d10: 2, d6: 1 });
    expect(rested.state.hpCurrent).toBe(29);
    expect(rested.state.resourcesUsed).toEqual({ 'second-wind': 1, 'action-surge': 0, 'arcane-recovery': 1 });
    expect(rested.state.slotsUsed).toEqual({ '1': 2 });
    expect(rested.state.hpTemp).toBe(3);
  });

  it('short rest never spends more hit dice than are left, nor heals above the maximum', () => {
    const rested = shortRest(tired, sheetOf(tired), { hitDice: { d10: 5 }, hpRegained: 100 });
    expect(rested.state.hitDiceSpent).toEqual({ d10: 3, d6: 0 });
    expect(rested.state.hpCurrent).toBe(40);
  });

  it('short rest restores Pact Magic slots', () => {
    const warlock = makeCharacter({ choices: { levels: levels('warlock', 3) }, state: { pactSlotsUsed: 2, hpCurrent: 5 } });
    expect(shortRest(warlock, sheetOf(warlock), { hitDice: {}, hpRegained: 0 }).state.pactSlotsUsed).toBe(0);
  });

  it('long rest restores everything, removes one Exhaustion level and grants Heroic Inspiration to humans', () => {
    expect(longRest(tired, sheetOf(tired)).state).toMatchObject({
      hpCurrent: 40, hpTemp: 0, hitDiceSpent: {}, slotsUsed: {}, pactSlotsUsed: 0, resourcesUsed: {}, exhaustion: 1, heroicInspiration: true,
    });
  });

  it('long rest leaves Heroic Inspiration alone without Resourceful', () => {
    const elf = makeCharacter({ choices: { speciesId: 'srd:species:elf', levels: levels('wizard', 1) } });
    expect(longRest(elf, sheetOf(elf)).state.heroicInspiration).toBe(false);
  });

  it('rests normalise state that is above the maximum after a level was removed', () => {
    const stale = kael({ state: { hpCurrent: 99, hitDiceSpent: { d10: 8, d8: 2 }, resourcesUsed: { 'second-wind': 7, rage: 2 } } });
    const rested = shortRest(stale, sheetOf(stale), { hitDice: {}, hpRegained: 0 });
    expect(rested.state.hpCurrent).toBe(40);
    expect(rested.state.hitDiceSpent).toEqual({ d10: 3, d6: 0 });
    expect(rested.state.resourcesUsed).toEqual({ 'second-wind': 1, 'action-surge': 0, 'arcane-recovery': 0 });
  });
});
```

- [ ] **Step 2: Test draaien en zien falen**

Run: `npm test -- src/rules/actions.test.ts`
Expected: FAIL, `Failed to resolve import "./actions"`.

- [ ] **Step 3: Acties implementeren**

`src/rules/actions.ts`:

```ts
import type { Character } from '../model/character';
import type { DerivedSheet } from './types';

const withState = (character: Character, patch: Partial<Character['state']>): Character => ({
  ...character,
  state: { ...character.state, ...patch },
});
const whole = (value: number) => Math.max(0, Math.floor(value));
const NO_DEATH_SAVES = { successes: 0, failures: 0 };

/** Damage hits temporary hit points first; hit points never drop below 0. */
export function applyDamage(character: Character, amount: number): Character {
  const damage = whole(amount);
  const fromTemp = Math.min(character.state.hpTemp, damage);
  return withState(character, {
    hpTemp: character.state.hpTemp - fromTemp,
    hpCurrent: Math.max(0, character.state.hpCurrent - (damage - fromTemp)),
  });
}

/** Healing up to the maximum; being above 0 hit points resets death saves. */
export function applyHealing(character: Character, amount: number, sheet: DerivedSheet): Character {
  const hpCurrent = Math.min(sheet.hp.max, Math.max(0, character.state.hpCurrent) + whole(amount));
  return withState(character, { hpCurrent, deathSaves: hpCurrent > 0 ? NO_DEATH_SAVES : character.state.deathSaves });
}

/** Temporary hit points don't stack: the new value replaces the old one. */
export function setTempHp(character: Character, value: number): Character {
  return withState(character, { hpTemp: whole(value) });
}

export function setDeathSaves(character: Character, successes: number, failures: number): Character {
  const clamp = (n: number) => Math.min(3, whole(n));
  return withState(character, { deathSaves: { successes: clamp(successes), failures: clamp(failures) } });
}

export function setSlotsUsed(character: Character, slotLevel: number, used: number, sheet: DerivedSheet): Character {
  const max = sheet.spellcasting.slots.find((s) => s.level === slotLevel)?.max ?? 0;
  return withState(character, { slotsUsed: { ...character.state.slotsUsed, [String(slotLevel)]: Math.min(max, whole(used)) } });
}

export function setPactSlotsUsed(character: Character, used: number, sheet: DerivedSheet): Character {
  return withState(character, { pactSlotsUsed: Math.min(sheet.spellcasting.pact?.slots ?? 0, whole(used)) });
}

export function setResourceUsed(character: Character, key: string, used: number, sheet: DerivedSheet): Character {
  const resource = sheet.resources.find((r) => r.key === key);
  if (!resource) return character;
  return withState(character, { resourcesUsed: { ...character.state.resourcesUsed, [key]: Math.min(resource.max, whole(used)) } });
}

export interface ShortRestOptions {
  /** Hit dice to spend per die size, e.g. { d10: 2 }. */
  hitDice: Record<string, number>;
  /** Hit points regained from the spent dice, already rolled by the caller (die + CON, minimum 1 per die). */
  hpRegained: number;
}

export function shortRest(character: Character, sheet: DerivedSheet, options: ShortRestOptions): Character {
  const hitDiceSpent: Record<string, number> = {};
  for (const hd of sheet.hitDice) {
    const key = `d${hd.die}`;
    hitDiceSpent[key] = hd.spent + Math.min(whole(options.hitDice[key] ?? 0), hd.total - hd.spent);
  }
  const resourcesUsed: Record<string, number> = {};
  for (const resource of sheet.resources) {
    resourcesUsed[resource.key] = resource.recharge === 'short' ? 0 : Math.max(0, resource.used - resource.shortRestRegain);
  }
  const hpCurrent = Math.min(sheet.hp.max, sheet.hp.current + whole(options.hpRegained));
  return withState(character, {
    hitDiceSpent,
    resourcesUsed,
    pactSlotsUsed: 0,
    hpCurrent,
    deathSaves: hpCurrent > 0 ? NO_DEATH_SAVES : character.state.deathSaves,
  });
}

export function longRest(character: Character, sheet: DerivedSheet): Character {
  return withState(character, {
    hpCurrent: sheet.hp.max,
    hpTemp: 0,
    hitDiceSpent: {},
    slotsUsed: {},
    pactSlotsUsed: 0,
    resourcesUsed: {},
    deathSaves: NO_DEATH_SAVES,
    exhaustion: Math.max(0, character.state.exhaustion - 1),
    heroicInspiration: sheet.flags.includes('heroic-inspiration-on-long-rest') || character.state.heroicInspiration,
  });
}
```

- [ ] **Step 4: Tests draaien**

Run: `npm test -- src/rules && npm run typecheck`
Expected: PASS, typecheck zonder fouten.

- [ ] **Step 5: Committen**

```bash
git add src/rules/actions.ts src/rules/actions.test.ts
git commit -m "feat: state-acties voor HP, slots, resources en rests" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Dobbelstenen

**Files:**
- Create: `src/dice/dice.ts`
- Test: `src/dice/dice.test.ts`

**Interfaces:**
- Consumes: niets.
- Produces: `type Rng = () => number` (waarde in [0, 1)), `cryptoRng: Rng`, `class DiceError extends Error`, `interface DiceTerm { count; sides; sign: 1 | -1 }`, `interface ParsedRoll { terms: DiceTerm[]; modifier: number }`, `parseRoll(expression: string): ParsedRoll`, `rollDie(sides, rng?): number`, `interface DieRoll { sides; value; sign }`, `interface RollResult { expression; dice: DieRoll[]; modifier; total }`, `roll(expression, options?: { rng?: Rng; critical?: boolean }): RollResult`, `type D20Mode = 'normal' | 'advantage' | 'disadvantage'`, `interface D20Result { rolls; kept; bonus; total; natural20; natural1 }`, `rollD20(bonus, mode?, rng?): D20Result`.

Grenzen: maximaal 100 dobbelstenen per worp en maximaal 1000 zijden. Spaties en hoofdletters zijn toegestaan. Een kritieke treffer verdubbelt het aantal dobbelstenen, niet de modifier.

- [ ] **Step 1: De falende test schrijven**

`src/dice/dice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cryptoRng, DiceError, parseRoll, roll, rollD20, type Rng } from './dice';

/** An RNG that makes successive dice of `sides` show the given faces. */
const faces = (sides: number, ...values: number[]): Rng => {
  let index = 0;
  return () => (values[index++ % values.length] - 0.5) / sides;
};

describe('parseRoll', () => {
  it('parses dice, modifiers and signs', () => {
    expect(parseRoll('2d6+3')).toEqual({ terms: [{ count: 2, sides: 6, sign: 1 }], modifier: 3 });
    expect(parseRoll('d20')).toEqual({ terms: [{ count: 1, sides: 20, sign: 1 }], modifier: 0 });
    expect(parseRoll(' 1D8 + 1d6 - 2 ')).toEqual({
      terms: [{ count: 1, sides: 8, sign: 1 }, { count: 1, sides: 6, sign: 1 }],
      modifier: -2,
    });
    expect(parseRoll('1d4-1d4').terms[1]).toEqual({ count: 1, sides: 4, sign: -1 });
  });

  it.each(['', 'abc', '2d', 'd0', '2d6++1', '101d6', '1000d6', '60d6+60d6', '1d1001'])('rejects "%s"', (expression) => {
    expect(() => parseRoll(expression)).toThrow(DiceError);
  });
});

describe('roll', () => {
  it('adds dice and modifier', () => {
    const result = roll('2d6+3', { rng: faces(6, 4, 5) });
    expect(result.dice.map((d) => d.value)).toEqual([4, 5]);
    expect(result.total).toBe(12);
  });

  it('subtracts negative dice terms', () => {
    expect(roll('1d4-1d4', { rng: faces(4, 3, 1) }).total).toBe(2);
  });

  it('doubles the dice on a critical hit, not the modifier', () => {
    const result = roll('1d8+3', { rng: faces(8, 6, 2), critical: true });
    expect(result.dice).toHaveLength(2);
    expect(result.total).toBe(11);
  });

  it('stays within the die size with the real RNG', () => {
    for (let i = 0; i < 200; i += 1) {
      const value = roll('1d6', { rng: cryptoRng }).total;
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });
});

describe('rollD20', () => {
  it('keeps the higher roll with advantage and the lower with disadvantage', () => {
    expect(rollD20(5, 'advantage', faces(20, 3, 17))).toMatchObject({ rolls: [3, 17], kept: 17, total: 22 });
    expect(rollD20(5, 'disadvantage', faces(20, 3, 17))).toMatchObject({ rolls: [3, 17], kept: 3, total: 8 });
    expect(rollD20(0, 'normal', faces(20, 12))).toMatchObject({ rolls: [12], kept: 12 });
  });

  it('flags natural 20 and natural 1', () => {
    expect(rollD20(2, 'normal', faces(20, 20))).toMatchObject({ natural20: true, natural1: false, total: 22 });
    expect(rollD20(2, 'normal', faces(20, 1))).toMatchObject({ natural20: false, natural1: true, total: 3 });
  });
});
```

- [ ] **Step 2: Test draaien en zien falen**

Run: `npm test -- src/dice`
Expected: FAIL, `Failed to resolve import "./dice"`.

- [ ] **Step 3: Dobbelstenen implementeren**

`src/dice/dice.ts`:

```ts
export type Rng = () => number;

export const cryptoRng: Rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

export class DiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiceError';
  }
}

export interface DiceTerm {
  count: number;
  sides: number;
  sign: 1 | -1;
}

export interface ParsedRoll {
  terms: DiceTerm[];
  modifier: number;
}

const MAX_DICE = 100;
const MAX_SIDES = 1000;
const TERM = '(?:\\d*d\\d+|\\d+)';
const EXPRESSION = new RegExp(`^[+-]?${TERM}(?:[+-]${TERM})*$`);

/** Parse expressions like "2d6+3", "d20", "1d8 + 1d6 - 2". Throws DiceError on anything else. */
export function parseRoll(expression: string): ParsedRoll {
  const compact = expression.replace(/\s+/g, '').toLowerCase();
  if (!EXPRESSION.test(compact)) throw new DiceError(`Invalid dice expression: "${expression}"`);
  const terms: DiceTerm[] = [];
  let modifier = 0;
  for (const match of compact.matchAll(/([+-]?)(\d*d\d+|\d+)/g)) {
    const sign = match[1] === '-' ? -1 : 1;
    const token = match[2];
    if (!token.includes('d')) {
      modifier += sign * Number(token);
      continue;
    }
    const [countText, sidesText] = token.split('d');
    const count = countText === '' ? 1 : Number(countText);
    const sides = Number(sidesText);
    if (count < 1 || sides < 1 || sides > MAX_SIDES) throw new DiceError(`Invalid dice term: "${token}"`);
    terms.push({ count, sides, sign });
  }
  if (terms.reduce((total, term) => total + term.count, 0) > MAX_DICE) throw new DiceError(`Too many dice in "${expression}"`);
  return { terms, modifier };
}

export function rollDie(sides: number, rng: Rng = cryptoRng): number {
  return Math.floor(rng() * sides) + 1;
}

export interface DieRoll {
  sides: number;
  value: number;
  sign: 1 | -1;
}

export interface RollResult {
  expression: string;
  dice: DieRoll[];
  modifier: number;
  total: number;
}

export function roll(expression: string, options: { rng?: Rng; critical?: boolean } = {}): RollResult {
  const { terms, modifier } = parseRoll(expression);
  const rng = options.rng ?? cryptoRng;
  const dice: DieRoll[] = [];
  for (const term of terms) {
    const count = options.critical ? term.count * 2 : term.count;
    for (let i = 0; i < count; i += 1) dice.push({ sides: term.sides, value: rollDie(term.sides, rng), sign: term.sign });
  }
  return { expression, dice, modifier, total: dice.reduce((total, die) => total + die.sign * die.value, modifier) };
}

export type D20Mode = 'normal' | 'advantage' | 'disadvantage';

export interface D20Result {
  rolls: number[];
  kept: number;
  bonus: number;
  total: number;
  natural20: boolean;
  natural1: boolean;
}

export function rollD20(bonus: number, mode: D20Mode = 'normal', rng: Rng = cryptoRng): D20Result {
  const rolls = mode === 'normal' ? [rollDie(20, rng)] : [rollDie(20, rng), rollDie(20, rng)];
  const kept = mode === 'advantage' ? Math.max(...rolls) : mode === 'disadvantage' ? Math.min(...rolls) : rolls[0];
  return { rolls, kept, bonus, total: kept + bonus, natural20: kept === 20, natural1: kept === 1 };
}
```

- [ ] **Step 4: Tests draaien**

Run: `npm test -- src/dice && npm run typecheck`
Expected: PASS, typecheck zonder fouten.

- [ ] **Step 5: Committen**

```bash
git add src/dice
git commit -m "feat: dobbelstenen met advantage, disadvantage en kritieke treffers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Eindcontrole fase 1A

**Files:** geen nieuwe.

- [ ] **Step 1: Alles draaien**

Run: `npm test && npm run typecheck && npm run build`
Expected: alle tests PASS, typecheck zonder fouten, build slaagt.

- [ ] **Step 2: Converter is reproduceerbaar**

Run: `npm run convert:srd && git status --porcelain src/content/srd/generated`
Expected: geen uitvoer van `git status` (de gegenereerde JSON is gelijk aan wat gecommit is).

- [ ] **Step 3: PHB-punten aan Sam voorleggen**

Leg deze drie punten voor aan Sam en noteer het antwoord in `docs/superpowers/plans/2026-10-15-fase-1a-kern-inhoud-en-regels.md` onder een kop "Uitkomst PHB-controle":
1. Eldritch Knight en Arcane Trickster gebruiken Intelligence voor spellcasting.
2. Alleen gebruikt: hun spell slots horen bij caster-level `ceil(level / 3)`, bijvoorbeeld Eldritch Knight 7 heeft 4 slots van level 1 en 2 van level 2.
3. In een multiclass tellen ze voor `floor(level / 3)`.

Klopt een punt niet, pas dan `SKELETON_SUBCLASSES` of `casterLevel` aan met een test die de juiste waarde vastlegt.

- [ ] **Step 4: Committen en doorgaan naar plan 1B**

```bash
git add -A
git commit -m "chore: eindcontrole fase 1A" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Daarna wordt plan 1B (de app) geschreven, op basis van de interfaces die nu in de code staan.
