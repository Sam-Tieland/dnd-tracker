# Importeren — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Instellingen een bestand importeren (een export van de app of een inhoudsbestand): eerst een overzicht, dan opslaan; characters met de keuze *vervangen* of *als kopie toevoegen*, eigen inhoud (zoals aangevulde skelet-subclasses) direct zichtbaar op formulier en sheet.

**Architecture:** `parseExportFile` (bestaat) blijft de poort. Een nieuwe module `src/storage/import.ts` maakt er een plan van (wat bestaat al) en schrijft het in één Dexie-transactie weg. `AppDataProvider` krijgt `reloadContent()` zodat de registry na een import opnieuw opgebouwd wordt. De UI zit in `SettingsScreen` met een bestandskiezer en een `Dialog` als overzicht.

**Tech Stack:** React 19, TypeScript strict, Zod 4, Dexie 4, Vitest + Testing Library + fake-indexeddb, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-15-dnd-character-tracker-design.md` §12 ("Importeren met validatie en keuze bij conflict: vervangen of als kopie toevoegen") en §15 (fouten melden, niets half wegschrijven). Ontwerp in de chat met Sam goedgekeurd op 2026-10-17: knop *Importeren* in Instellingen, overzicht met aantallen, eigen inhoud met hetzelfde ID wordt vervangen, per bestaand character de keuze vervangen/kopie, kapotte of nieuwere bestanden geven een melding en veranderen niets.

## Global Constraints

- Werkmap: git-worktree `C:\Users\SamTieland\dev\dnd-tracker-importeren` op branch `importeren` vanaf `main`. Nooit in `C:\Users\SamTieland\dev\dnd-tracker` werken, nooit van branch wisselen, geen stash/reset/push.
- Global Constraints van plan 1B gelden: TypeScript strict zonder `any`; `src/rules` puur; elke zichtbare tekst in `src/i18n/en.json` én `nl.json`; spelregeltermen Engels; tikvlakken ≥ 44×44 px; invoer 16px; geen netwerkverzoeken; geen nieuwe dependencies; UI-tests met `// @vitest-environment jsdom` via `src/ui/testing/render.tsx`; opslagtests importeren eerst `fake-indexeddb/auto`.
- Exportformaat versie 1, databaseversie 1 en `schemaVersion` 2 veranderen niet.
- Commitberichten in het Nederlands, eindigend met `Co-Authored-By: Claude <model> 5.5 <noreply@anthropic.com>`.
- Itereren met `npx vitest run <pad> --maxWorkers=2`; de volledige suite één keer per taak (Bash-timeout 600000 ms), daarna `npm run typecheck` en `npm run build`. Basislijn: 65 bestanden / 674 tests.
- Poort 4173 kan bezet zijn door Sams eigen `npm run preview`: e2e dan draaien met een tijdelijke kopie van `playwright.config.ts` met een andere poort (niet committen).

## Review Focus

1. **Half wegschrijven**: een fout halverwege (bijv. een character dat niet door `CharacterSchema` komt of een schrijffout) laat de database ongewijzigd. Test: Task 1 (`writes nothing when one item fails`).
2. **Per ongeluk overschrijven**: een character dat al bestaat wordt standaard *als kopie* toegevoegd; vervangen gebeurt alleen als de speler dat kiest. Test: Task 1 (`copies by default`) en Task 2 (`asks replace or copy for an existing character`).
3. **Ongeldige eigen inhoud**: een bestand met één ongeldig inhoudsitem wordt door `parseExportFile` afgewezen en er wordt niets opgeslagen. Test: Task 2 (`reports a file with invalid own content`).
4. **Zelfde bestand twee keer**: inhoud met hetzelfde ID wordt vervangen, niet verdubbeld. Test: Task 1 (`replaces content with the same id`).
5. **iPad**: de bestandskiezer werkt in Safari via `<input type="file" accept=".json,application/json">` en de knop is ≥ 44 px. Test: Task 2 (e2e met `setInputFiles` in Chromium en WebKit).

---

### Task 1: Importeren in de opslag

**Files:**
- Modify: `src/storage/export.ts` (`parseExportFile`: dubbele character-ID's in één bestand en een `kind: 'character'`-bestand met een ander aantal dan 1 character → `ImportError('invalid-character', …)`), `src/storage/export.test.ts`
- Create: `src/storage/import.ts`, `src/storage/import.test.ts`

**Interfaces:**
- Consumes: `parseExportFile(text): ParsedImport` (`{ kind, exportedAt, characters: Character[], customContent: ContentItem[] }`), `ImportError`, `validateUserContent`, `CharacterSchema`, `TrackerDb` (`characters`, `customContent`).
- Produces:

```ts
export type CharacterImportMode = 'replace' | 'copy';
export interface ImportPlan {
  characters: { character: Character; exists: boolean }[]; // exists: er staat al een rij met dit id in db.characters
  content: { item: ContentItem; exists: boolean }[];       // exists: er staat al een rij met dit id in db.customContent
}
export interface ImportResult { added: number; replaced: number; copied: number; content: number }
export async function planImport(db: TrackerDb, parsed: ParsedImport): Promise<ImportPlan>;
export async function applyImport(
  db: TrackerDb,
  plan: ImportPlan,
  modes: Record<string, CharacterImportMode>, // per bestaand character-id; ontbreekt → 'copy'
  now?: string,                                // ISO-tijd voor kopieën; standaard new Date().toISOString()
): Promise<ImportResult>;
```

`applyImport` schrijft alles in één `db.transaction('rw', db.characters, db.customContent, …)`. Nieuwe characters: `put` zoals ze zijn. Bestaand + `'replace'`: `put` met hetzelfde id. Bestaand + `'copy'`: nieuw id (`crypto.randomUUID()`), `createdAt`/`updatedAt` = `now`, naam ongewijzigd. Elk character gaat door `CharacterSchema.parse` vóór het schrijven. Eigen inhoud is al gevalideerd door `parseExportFile`; `bulkPut` van de items (hetzelfde id vervangt).

- [ ] **Step 1: Failing tests** (`import.test.ts`, met `fake-indexeddb/auto` en de bestaande test-db-helper uit de storage-tests)
  - `plans which characters and content already exist`
  - `adds new characters and content` → `ImportResult` `{ added: 1, replaced: 0, copied: 0, content: 1 }`, beide staan in de db.
  - `copies by default` — bestaand id zonder modus → twee characters, de kopie met nieuw id en `createdAt === now`.
  - `replaces when asked` — modus `'replace'` → één character met de geïmporteerde inhoud.
  - `replaces content with the same id` — twee keer dezelfde feature importeren → één rij.
  - `writes nothing when one item fails` — een plan met een character dat `CharacterSchema.parse` niet haalt (handmatig in het plan gezet) → gooit, db ongewijzigd (ook de inhoud).
  - In `export.test.ts`: `rejects duplicate character ids` en `rejects a character file with two characters` → `invalid-character`.
- [ ] **Step 2:** `npx vitest run src/storage --maxWorkers=2` → FAIL.
- [ ] **Step 3:** Implementeer zoals onder Interfaces.
- [ ] **Step 4:** Zelfde run → PASS; volledige suite, typecheck, build.
- [ ] **Step 5: Commit** — `feat: importeren in de opslag, met vervangen of kopie en alles-of-niets`.

### Task 2: Importeren in Instellingen

**Files:**
- Modify: `src/ui/data.tsx` (`AppData.reloadContent(): Promise<void>` laadt `loadUserContent(db)` opnieuw en zet de state, zodat `registry` opnieuw opgebouwd wordt), `src/ui/settings/SettingsScreen.tsx`, `src/ui/settings/SettingsScreen.test.tsx`, `src/i18n/en.json`, `src/i18n/nl.json`, `src/ui/styles.css` (alleen indien nodig), `tests/e2e/app.spec.ts`
- Create (optioneel, als `SettingsScreen.tsx` te groot wordt): `src/ui/settings/ImportDialog.tsx`

**Interfaces:**
- Consumes: Task 1 (`planImport`, `applyImport`, `ImportPlan`, `CharacterImportMode`, `ImportResult`), `parseExportFile`, `ImportError` (codes `not-json`, `wrong-format`, `newer-version`, `invalid-character`, `invalid-content`), `Dialog`, `useToast`.

**Bediening (exacte teksten):**

| Sleutel | en | nl |
|---|---|---|
| `import.button` | Import | Importeren |
| `import.title` | Import file | Bestand importeren |
| `import.summary` | {characters} character(s) and {content} own content item(s). | {characters} character(s) en {content} eigen inhoudsitem(s). |
| `import.exists` | Already on this device | Staat al op dit apparaat |
| `import.replace` | Replace | Vervangen |
| `import.copy` | Add as copy | Als kopie toevoegen |
| `import.contentReplaced` | {count} item(s) replace your own content with the same name. | {count} item(s) vervangen eigen inhoud met dezelfde naam. |
| `import.confirm` | Import | Importeren |
| `import.done` | Imported: {added} new, {replaced} replaced, {copied} copies, {content} content item(s). | Geïmporteerd: {added} nieuw, {replaced} vervangen, {copied} kopieën, {content} inhoudsitem(s). |
| `import.error.not-json` | This file is not a JSON file. | Dit bestand is geen JSON-bestand. |
| `import.error.wrong-format` | This file is not an export of this app. | Dit bestand is geen export van deze app. |
| `import.error.newer-version` | This file was made with a newer version of the app. Update the app first. | Dit bestand komt uit een nieuwere versie van de app. Werk de app eerst bij. |
| `import.error.invalid-character` | A character in this file cannot be read: {reason} | Een character in dit bestand is niet te lezen: {reason} |
| `import.error.invalid-content` | Own content in this file is not valid: {reason} | Eigen inhoud in dit bestand is niet geldig: {reason} |
| `import.failed` | Import failed: {reason} | Importeren mislukt: {reason} |

**Gedrag:**
- In het blok *Backup* van Instellingen een knop `import.button` die een verborgen `<input type="file" accept=".json,application/json">` opent. Na kiezen: `await file.text()` → `parseExportFile` → `planImport` → `Dialog` met titel `import.title`.
- De dialoog toont `import.summary`; per character met `exists` de naam, `import.exists` en twee radio's `import.replace` / `import.copy` (standaard copy; `<label className="option">`); nieuwe characters alleen met naam; bij bestaande inhoud de regel `import.contentReplaced`. Knoppen `import.confirm` en `common.cancel`.
- Bevestigen → `applyImport` → `reloadContent()` → toast `import.done`; dialoog dicht. Een `ImportError` bij lezen of opslaan → fouttoast met `import.error.<code>` (met `{reason}` = de message waar de tekst die heeft); elke andere fout → `import.failed`. Het input-element wordt na elke keuze leeggemaakt, zodat hetzelfde bestand opnieuw gekozen kan worden.

- [ ] **Step 1: Failing tests** in `SettingsScreen.test.tsx` (bestand aanleveren met `userEvent.upload` op de file-input; inhoud gebouwd met `buildCharacterExport`/`buildBackup` + `serializeExport` uit `src/storage/export.ts`):
  - `imports a new character and shows it in the list` — na bevestigen staat het character in de db en de toast `Imported: 1 new, 0 replaced, 0 copies, 0 content item(s).`.
  - `asks replace or copy for an existing character` — standaard *Add as copy* geselecteerd; kiezen voor *Replace* → nog steeds één character met de geïmporteerde naam.
  - `shows imported own content on the sheet` — een backup zonder characters met een user-feature die `fills` een skelet-feature (`skeleton:feature:battle-master:3:feature`; controleer het id in de registry) met naam `Combat Superiority`; na import en navigeren naar een Fighter 3 met Battle Master staat `Combat Superiority` op het tabblad Features.
  - `reports a file that is not JSON` — toast `This file is not a JSON file.`, db ongewijzigd.
  - `reports a file with invalid own content` — een backup met een item zonder `source: "user"` → toast met `Own content in this file is not valid:`, db ongewijzigd.
  - `cancel imports nothing`.
- [ ] **Step 2:** `npx vitest run src/ui/settings --maxWorkers=2` → FAIL.
- [ ] **Step 3:** Implementeer `reloadContent`, de knop, de dialoog en de i18n-sleutels.
- [ ] **Step 4:** Zelfde run → PASS. Voeg in `tests/e2e/app.spec.ts` een test toe `imports an exported character as a copy` (Chromium: exporteer Kael zoals de exporttest, importeer het gedownloade bestand via `setInputFiles` op de file-input, kies niets → de lijst toont twee keer Kael); en een test `reports an invalid import file` die in beide browsers draait (een bestand met inhoud `{}` → melding `This file is not an export of this app.`). Volledige suite, typecheck, build, e2e (zie Global Constraints over de poort).
- [ ] **Step 5: Commit** — `feat: importeren in Instellingen met overzicht en keuze vervangen of kopie`.
