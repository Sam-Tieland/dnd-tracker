# Class-blokken met subclass en keuzes per level — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Het blok *Levels* in het characterformulier wordt een blok per class met de subclass direct eronder en een regel per level (HP, feat waar je die krijgt, opties, aantikbare features, notitie).

**Architecture:** `choices.levels` blijft de enige bron (volgorde = characterlevels). Een pure functie `classBlocks()` groepeert die lijst per class en rekent per regel uit welke features binnenkomen en of er een feat te kiezen is; de UI rendert alleen. Een levelnotitie komt als optioneel veld in `LevelChoice`, via schemaversie 2 met een migratie die niets verandert.

**Tech Stack:** React 19, TypeScript strict, Zod 4, Dexie, Vitest + Testing Library (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-17-level-blokken-design.md` (gezag), binnen `docs/superpowers/specs/2026-10-15-dnd-character-tracker-design.md`.

## Global Constraints

- Werkmap: git-worktree `C:\Users\SamTieland\dev\dnd-tracker-level-blokken` op branch `level-blokken` vanaf `main` (`5f0e989` of later). Nooit in `C:\Users\SamTieland\dev\dnd-tracker` werken, nooit van branch wisselen, geen stash/reset/push.
- Alle Global Constraints van plan 1B blijven gelden: geen PHB-teksten; TypeScript `strict` zonder `any`; `src/rules` alleen pure functies; elke zichtbare bedieningstekst in `src/i18n/en.json` én `src/i18n/nl.json` (een test dwingt gelijke sleutels en placeholders af); spelregeltermen blijven Engels (o.a. Level, Ability Score Improvement, Hit Point Dice); tikvlakken minimaal 44×44 px (`--tap`), invoervelden 16px tekst.
- UI-tests (`*.test.tsx`) beginnen met `// @vitest-environment jsdom` en renderen via `src/ui/testing/render.tsx`. Opslagtests importeren als eerste `fake-indexeddb/auto`.
- Een bare checkbox of radio hoort nooit direct in `<label className="field">` (CSS `label:has(> input[type=checkbox|radio])`); gebruik `<label className="option">` zoals `OptionsSection` nu.
- Geen nieuwe dependencies.
- Commitberichten in het Nederlands, eindigend met `Co-Authored-By: Claude <model> 5.5 <noreply@anthropic.com>` (het model dat het commit schrijft).
- Tests zijn traag: itereren met `npx vitest run <pad> --maxWorkers=2`; de volledige `npm test -- --maxWorkers=2` één keer per taak (Bash-timeout 600000 ms), daarna `npm run typecheck` en `npm run build`. Basislijn op `main`: 64 bestanden / 648 tests groen.

## Review Focus

1. **Bestaande characters**: een character met feats op levels zonder ASI, een subclass op een lager level of opties van een verwijderde class laadt en toont al zijn opgeslagen keuzes; niets verdwijnt bij opslaan. Test: Task 3 (`keeps a feat stored on a level that gives none`).
2. **Multiclass door elkaar** (Fighter 1, Wizard 1, Fighter 2): *Laatste level Fighter verwijderen* haalt het derde characterlevel weg en laat Wizard staan; het eerste characterlevel houdt maximum-HP. Test: Task 2 (`removes the last level of one class only`).
3. **Subclass vóór het subclass-level**: een subclass gekozen op Fighter 1 geeft op de sheet geen features tot Fighter 3, en blijft gekozen na *+ Level* en na verwijderen. Tests: Task 2 (`keeps the subclass when its level is removed`) en Task 3 (e2e-stap).
4. **iPad staand**: het formulier met twee class-blokken past zonder horizontaal scrollen en nieuwe knoppen en `<summary>`-regels zijn ≥ 44 px hoog. Test: Task 3 (WebKit-e2e op iPad, `toBeVisible` en een check op `boundingBox().height >= 44` voor *+ Level*).
5. **Oude data via export**: een exportbestand met characters op `schemaVersion: 1` importeert via `parseExportFile` als versie 2. Test: Task 1 (`imports a version 1 character from an export file`).

---

### Task 1: Schemaversie 2 met een notitie per level

**Files:**
- Modify: `src/model/character.ts` (`LevelChoiceSchema`: `note: z.string().optional()`; `schemaVersion: z.literal(2)`; `createCharacter` → `schemaVersion: 2`)
- Modify: `src/storage/migrations.ts` (`CHARACTER_SCHEMA_VERSION = 2`; `MIGRATIONS = { 1: (raw) => raw }` met een regel commentaar: schema 2 voegt alleen het optionele `levels[].note` toe)
- Modify: `src/model/character.test.ts`, `src/storage/migrations.test.ts`, `src/storage/export.test.ts` en elke andere test die `schemaVersion: 1` hard verwacht
- Niet wijzigen: `src/storage/fixtures/character-v1.json` (moet ongewijzigd via de migratie laden)

**Interfaces:**
- Produces: `LevelChoice.note?: string`; `Character.schemaVersion === 2`; `CHARACTER_SCHEMA_VERSION === 2`.

- [ ] **Step 1: Failing tests**
  - `migrations.test.ts`: `it('migrates the version 1 fixture to version 2 unchanged apart from the version')` — `migrateCharacter(fixture)` geeft `schemaVersion: 2` en verder `toEqual({ ...fixture, schemaVersion: 2 })`.
  - `migrations.test.ts`: `it('keeps a level note')` — een character met `levels[0].note = 'Riposte, Parry'` overleeft `migrateCharacter` en `CharacterSchema.parse`.
  - `export.test.ts`: `it('imports a version 1 character from an export file')` — een geldig exportbestand (versie 1) waarin het character `schemaVersion: 1` heeft, geeft via `parseExportFile` een character met `schemaVersion: 2`.
  - `character.test.ts`: de verwachting van `createCharacter` wordt `schemaVersion: 2`.
- [ ] **Step 2:** `npx vitest run src/storage src/model --maxWorkers=2` → FAIL op de nieuwe verwachtingen.
- [ ] **Step 3:** Schema, `createCharacter`, `CHARACTER_SCHEMA_VERSION` en `MIGRATIONS[1]` zoals onder Files.
- [ ] **Step 4:** Zelfde run → PASS. Daarna de volledige suite, `npm run typecheck`, `npm run build`.
- [ ] **Step 5: Commit** — `feat: schemaversie 2 met een notitie per level`.

### Task 2: Class-blokken als pure logica

**Files:**
- Create: `src/ui/form/class-blocks.ts`, `src/ui/form/class-blocks.test.ts` (node-omgeving, geen jsdom)
- Modify: `src/ui/form/form-logic.ts`, `src/ui/form/form-logic.test.ts`

**Interfaces:**
- Consumes: `LevelChoice.note` (Task 1); `ContentRegistry` (`getOf('class'|'subclass', id)`), `optionsFor(registry, parentId)` uit `src/rules/choices.ts`; `ClassDef.levels[n].featureIds`, `ClassDef.subclassLevels`, `SubclassDef.features: { level, featureId }[]`.
- Produces (in `class-blocks.ts`):

```ts
export interface LevelRow {
  index: number;            // positie in character.choices.levels
  classLevel: number;       // 1-based level binnen deze class
  characterLevel: number;   // index + 1
  featureIds: string[];     // class-features van dit class-level, daarna subclass-features van dit level (alleen met gekozen subclass)
  grantsFeat: boolean;      // index === 0, of een featureId van deze regel geeft een feat (grantsFeat)
  optionParentIds: string[];// de featureIds van deze regel waarvoor optionsFor(...) niet leeg is
}
export interface ClassBlock {
  classId: string;
  name: string;              // class-naam, of het ID als de class onbekend is
  subclassId?: string;       // van elk level van deze class; het laatste level met een subclassId wint (zoals src/rules/levels.ts)
  subclassLevel?: number;    // ClassDef.subclassLevels[0]
  rows: LevelRow[];
}
export const FEAT_FEATURE_SUFFIXES: readonly string[]; // ['ability-score-improvement', 'epic-boon', 'fighting-style', 'additional-fighting-style']
export function grantsFeat(featureId: string): boolean;     // laatste ':'-segment van het ID staat in FEAT_FEATURE_SUFFIXES
export function isSubclassSlot(featureId: string): boolean; // laatste ':'-segment eindigt op '-subclass' (bijv. srd:feature:cleric:3:cleric-subclass)
export function classBlocks(character: Character, registry: ContentRegistry): ClassBlock[]; // blokken in volgorde van eerste voorkomen
```

- Produces (in `form-logic.ts`):

```ts
export function removeLastClassLevel(character: Character, classId: string): Character;
export function setLevelNote(character: Character, index: number, note: string): Character; // '' verwijdert het veld
export function removalLosesData(level: LevelChoice): boolean; // featId, asi, note (niet-leeg) of subclassId aanwezig
```

`removeLastClassLevel` haalt de laatste `LevelChoice` met dat `classId` weg (waar die ook in de volgorde staat). Droeg die een `subclassId` en blijft er een level van die class over, dan komt het `subclassId` op het hoogste overgebleven level van die class. `removeLastLevel` en de oude `form.removeLevel`-knop verdwijnen in Task 3; de functie mag blijven als er nog aanroepers zijn.

- [ ] **Step 1: Failing tests** (`class-blocks.test.ts`, met de echte registry zoals de bestaande form-logic-tests)
  - `groups interleaved levels per class in order of first appearance` — Fighter, Wizard, Fighter → twee blokken; Fighter-rijen hebben `index` 0 en 2, `classLevel` 1 en 2, `characterLevel` 1 en 3.
  - `marks feat levels per class level` — Fighter 1 (Fighting Style) `grantsFeat` true; Fighter 2 false; Fighter 4 en 6 true; Cleric 2 false, Cleric 4 true; bij multiclass Wizard 1 op characterlevel 2: false.
  - `adds subclass features only from their own level` — Fighter 4 met Champion gekozen op level 1: rij 3 bevat `srd:feature:champion:3:improved-critical`, rijen 1 en 2 bevatten geen Champion-feature; Champion 7 maakt rij 7 `grantsFeat` true.
  - `lists option parents on the level they arrive` — Cleric 1: `optionParentIds` bevat `srd:feature:cleric:1:divine-order`; Cleric 2 niet.
  - `isSubclassSlot` true voor `srd:feature:cleric:3:cleric-subclass`, false voor `srd:feature:cleric:1:divine-order`.
  - In `form-logic.test.ts`: `removes the last level of one class only` — Fighter, Wizard, Fighter → `removeLastClassLevel(c, fighter)` laat `['fighter','wizard']`; `keeps the subclass when its level is removed` — Fighter 3 met subclass op level 3, verwijderen → subclass staat op het overgebleven Fighter 2; `setLevelNote` zet en verwijdert (`''`) de notitie; `removalLosesData` true voor feat, ASI, notitie, subclass en false voor `{ classId, hp: 'average', featureChoices: {} }`.
- [ ] **Step 2:** `npx vitest run src/ui/form/class-blocks.test.ts src/ui/form/form-logic.test.ts --maxWorkers=2` → FAIL (module ontbreekt).
- [ ] **Step 3:** Implementeer de Produces-signaturen.
- [ ] **Step 4:** Zelfde run → PASS; volledige suite, typecheck, build.
- [ ] **Step 5: Commit** — `feat: class-blokken en level-regels als pure logica`.

### Task 3: Het formulier met class-blokken

**Files:**
- Create: `src/ui/form/ClassBlocksSection.tsx` (vervangt `LevelsSection.tsx`, dat verdwijnt), eventueel `src/ui/form/LevelRow.tsx` als het bestand te groot wordt
- Delete: `src/ui/form/OptionsSection.tsx`
- Modify: `src/ui/form/CharacterForm.tsx`, `src/ui/form/OriginSection.tsx` (species-opties zoals Elven Lineage onder de species-keuzelijst, met dezelfde bediening als `OptionsSection` nu), `src/ui/form/form.css`, `src/i18n/en.json`, `src/i18n/nl.json`, `src/ui/form/CharacterForm.test.tsx`, `tests/e2e/app.spec.ts`

**Interfaces:**
- Consumes: Task 2 (`classBlocks`, `isSubclassSlot`, `removeLastClassLevel`, `setLevelNote`, `removalLosesData`), bestaande `addLevel`, `setLevelHp`, `setLevelFeat`, `setLevelAsi`, `setSubclass`, `subclassLevel`, `toggleOption`, `isExclusive`, `optionsFor`, `Dialog`, `NumberInput`, `plainParagraphs`, `AsiPicker` (staat nu in `LevelsSection.tsx`; verhuist mee).

**Bediening (exacte teksten; spelregeltermen blijven Engels):**

| Sleutel | en | nl |
|---|---|---|
| `form.chooseClass` | Choose a class | Kies een class |
| `form.newClass` | New class | Nieuwe class |
| `form.addClass` | Add class | Class toevoegen |
| `form.addClassLevel` | Add {class} level | {class}-level toevoegen |
| `form.removeClassLevel` | Remove last {class} level | Laatste {class}-level verwijderen |
| `form.subclass` | Subclass | Subclass |
| `form.subclassFrom` | Counts from level {level} | Telt mee vanaf level {level} |
| `form.characterLevel` | character level {level} | characterlevel {level} |
| `form.gains` | Gains | Krijgt |
| `form.levelNote` | Notes for this level | Notitie bij dit level |
| `form.noFeatHere` | This level normally gives no feat. | Dit level geeft normaal geen feat. |
| `form.subclassEmpty` | This subclass is still empty; you fill it in yourself later. | Deze subclass is nog leeg; je vult hem later zelf aan. |
| `form.subclassPick` | Choose your subclass above. | Kies hierboven je subclass. |
| `form.confirmRemoveTitle` | Remove level? | Level verwijderen? |
| `form.confirmRemove` | {class} level {level} has choices or notes that will be lost. | {class}-level {level} heeft keuzes of notities die verloren gaan. |

De sleutels `form.addLevel`, `form.removeLevel` en `form.options` verdwijnen. De bestaande `form.skeleton`, `form.hpMax`, `form.hpAverage`, `form.hpRolled`, `form.hpRolledValue`, `common.none` blijven in gebruik.

**Gedrag (uit de design, §2 en §5a):**
- Per `ClassBlock` een `<section className="card">` met kop = class-naam; eronder `<label className="field">` met tekst `form.subclass` en een keuzelijst (alleen subclasses van die class, skeletten met ` (form.skeleton)`, eerste optie `common.none`), plus de hint `form.subclassFrom`. Kiezen gaat via `setSubclass`.
- Per `LevelRow`: kop `Level {classLevel}` met klein `form.characterLevel`; HP-bediening zoals nu (eerste characterlevel: `form.hpMax`); de feat-keuzelijst (aria-label `Feat {characterLevel}`) alleen als `grantsFeat` of er al een `featId` staat — in dat laatste geval met de tekst `form.noFeatHere` erbij; de ASI-kiezer zoals nu; per `optionParentIds` een `<fieldset>` met de opties (radio bij `isExclusive`, anders checkbox; `toggleOption`); onder `form.gains` per featureId een `<details>` met de featurenaam als `<summary>` en de tekst (`plainParagraphs`) — een skelet-feature zonder naam toont `features.placeholder` en `form.subclassEmpty`, een `isSubclassSlot`-feature toont bij gekozen subclass de subclass-naam en anders `form.subclassPick`; een `<textarea>` met label `form.levelNote` via `setLevelNote`.
- Onder elk blok knoppen `form.addClassLevel` (`addLevel(character, classId)`, uit bij `MAX_LEVEL`) en `form.removeClassLevel`; verwijderen opent eerst een `Dialog` (`form.confirmRemoveTitle`/`form.confirmRemove`, knoppen `common.delete` en `common.cancel`) als `removalLosesData` van dat level waar is.
- Onder alle blokken: keuzelijst `form.newClass` met alle classes en knop `form.addClass`; zonder levels staat erboven de tekst `form.chooseClass`.
- `<summary>` blijft `display: list-item` of krijgt een zichtbaar ijltje (niet `display:flex` zonder marker); alle knoppen en summaries ≥ `var(--tap)` hoog.

- [ ] **Step 1: Failing tests** in `CharacterForm.test.tsx` (bestaande tests omzetten naar de nieuwe bediening zonder hun controle te verzwakken, plus):
  - `shows the subclass picker from the first level` — nieuw character, Fighter toevoegen → keuzelijst `Subclass` bevat `Champion` en `Battle Master (skeleton, fill in yourself)`; Champion kiezen en opslaan → opgeslagen `levels[0].subclassId === 'srd:subclass:champion'` (`srd:subclass:champion`).
  - `offers the feat only on levels that give one` — Fighter 1 heeft `Feat 1`; na Fighter 2 bestaat `Feat 2` niet.
  - `keeps a feat stored on a level that gives none` — een opgeslagen character met `featId` op Fighter 2 toont `Feat 2` met `This level normally gives no feat.` en bewaart de feat na Save.
  - `shows Divine Order on Cleric level 1` — de opties staan in het Cleric-blok; Elven Lineage staat in het blok *Species and background* na het kiezen van Elf.
  - `stores a note per level` — notitie typen bij Fighter 1, Save → `levels[0].note`.
  - `asks before removing a level with choices` — Fighter 1 met notitie, *Remove last Fighter level* → dialoog; annuleren laat het level staan; bevestigen verwijdert het.
  - `expands a feature to show its text` — klik op de `Second Wind`-summary → de SRD-tekst is zichtbaar.
- [ ] **Step 2:** `npx vitest run src/ui/form --maxWorkers=2` → FAIL.
- [ ] **Step 3:** Bouw `ClassBlocksSection`, pas `OriginSection` en `CharacterForm` aan, verwijder `LevelsSection` en `OptionsSection`, voeg de i18n-sleutels toe en verwijder de drie oude.
- [ ] **Step 4:** Zelfde run → PASS. Werk `tests/e2e/app.spec.ts` bij: `createKael` voegt de classes toe via `New class` + `Add class` (Fighter, dan Wizard) met dezelfde verwachtingen (multiclass-melding, `14/14`, enz.); voeg een stap toe die bij Kael op Fighter 1 `Champion` kiest en controleert dat het tabblad Features geen `Improved Critical` toont; en in WebKit dat de knop `Add Fighter level` minstens 44 px hoog is. Draai de volledige suite, typecheck, build en `npm run test:e2e` (chromium 4+ passed; webkit gelijk aantal minus de twee bekende skips).
- [ ] **Step 5: Commit** — `feat: formulier met een blok per class, subclass eronder en keuzes per level`.
