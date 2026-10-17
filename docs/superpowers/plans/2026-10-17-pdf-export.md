# PDF-export op het eigen characterblad — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een character exporteren als ingevuld PDF-characterblad, op basis van Sams eigen exemplaar van het invulbare blad van Wizards of the Coast (5E, 2014, 3 pagina's, 334 velden), dat hij eenmalig per apparaat in Instellingen kiest.

**Architecture:** Drie lagen. (1) `src/ui/pdf/sheet-fields.ts` legt de veldnamen van het blad vast. (2) `src/ui/pdf/sheet-values.ts` is een pure functie van character + afgeleide sheet naar `{ text, checks }`. (3) `src/ui/pdf/fill-sheet.ts` vult met `pdf-lib` een sjabloon in (dynamisch geïmporteerd, zodat de hoofdbundel niet groeit). Het sjabloon staat in IndexedDB in de bestaande tabel `settings` onder een eigen sleutel; het gaat nooit in de repository en niet in back-ups.

**Tech Stack:** React 19, TypeScript strict, Dexie 4, `pdf-lib@1.17.1` (nieuw, MIT), Vitest, Playwright.

**Spec:** hoofdspec `docs/superpowers/specs/2026-10-15-dnd-character-tracker-design.md` §14 (afdrukken/PDF, oorspronkelijk fase 3, op Sams verzoek naar voren gehaald). Ontwerp goedgekeurd in de chat op 2026-10-17: eigen exemplaar van het blad als sjabloon ("Permission is granted to photocopy this document for personal use" — dus nooit in de openbare repo); per apparaat eenmalig kiezen in Instellingen; knop **PDF** bij elk character; delen/downloaden zoals export; het blijft een invulbare PDF; wat niet past komt in *Features & Traits* of wordt afgekapt; `pdf-lib` als enige nieuwe dependency.

## Global Constraints

- Werkmap: git-worktree `C:\Users\SamTieland\dev\dnd-tracker-pdf` op branch `pdf-export` vanaf `main`. Nooit in `C:\Users\SamTieland\dev\dnd-tracker` werken, nooit van branch wisselen, geen stash/reset/push, git-config niet wijzigen.
- **Het WotC-blad komt nooit in de repository**, ook niet als testfixture. Tests bouwen hun eigen sjabloon met `pdf-lib` (zelfde veldnamen, lege pagina's).
- Eén nieuwe dependency: `pdf-lib` exact `1.17.1` (`npm install pdf-lib@1.17.1 --save-exact`). Geen andere.
- `pdf-lib` alleen via `await import('pdf-lib')` in `fill-sheet.ts` en in de sjablooncontrole, zodat het een aparte chunk wordt (de service worker precachet alle `.js`, dus offline werkt het).
- Tekst in PDF-velden gaat door `toWinAnsi()` (zie Task 1): de standaardfont van formuliervelden kan alleen WinAnsi-tekens; een niet-codeerbaar teken laat `pdf-lib` gooien. Modifiers schrijven met ASCII `+`/`-`.
- Global Constraints van plan 1B gelden: TypeScript strict zonder `any`; elke zichtbare tekst in `en.json` én `nl.json`; spelregeltermen Engels; tikvlakken ≥ 44 px; UI-tests met `// @vitest-environment jsdom` via `src/ui/testing/render.tsx`; opslagtests importeren eerst `fake-indexeddb/auto`.
- Database blijft versie 1 (de tabel `settings` heeft al `key` als primaire sleutel), exportformaat versie 1, `schemaVersion` 2.
- Commitberichten in het Nederlands, eindigend met `Co-Authored-By: Claude <model> 5.5 <noreply@anthropic.com>`.
- Itereren met `npx vitest run <pad> --maxWorkers=2`; volledige suite één keer per taak (Bash-timeout 600000 ms), dan `npm run typecheck`, `npm run build`. Basislijn: 67 bestanden / 698 tests. e2e met een tijdelijke kopie van `playwright.config.ts` op een andere poort dan 4173 (niet committen).

## Review Focus

1. **Tekens buiten WinAnsi** (bijv. `−`, `·`, `✓`, emoji, Pools/Russisch in een naam): de PDF wordt toch gemaakt, met een vervangteken. Test: Task 1 (`toWinAnsi replaces characters the PDF font cannot show`) en Task 2 (`fills a name with characters outside WinAnsi`).
2. **Verkeerd bestand als sjabloon** (een andere PDF, een PDF zonder formulier, geen PDF): duidelijke melding, niets opgeslagen. Test: Task 2 (`rejects a PDF without the sheet fields`) en Task 3 (`reports a file that is not the character sheet`).
3. **Lange lijsten** (30 spells op één level, 40 features, 10 aanvallen): niets crasht; wat niet past wordt afgekapt; de eerste drie aanvallen in de wapenvakken, de rest als tekst. Test: Task 1 (`caps spell lines per level`, `puts extra attacks in the attacks text`).
4. **Geen sjabloon gekozen**: de knop PDF geeft een melding die naar Instellingen verwijst, geen fout. Test: Task 3 (`asks for the sheet first`).
5. **iPad delen**: dezelfde route als export (deelmenu, retry-toast, downloadterugval), nu met `application/pdf`. Test: Task 3 (`deliverFile` met bytes en type) en de bestaande deliver-tests blijven groen.

---

### Task 1: Veldnamen en waarden (puur)

**Files:**
- Create: `src/ui/pdf/sheet-fields.ts`, `src/ui/pdf/sheet-values.ts`, `src/ui/pdf/sheet-values.test.ts`, `src/ui/pdf/win-ansi.ts`, `src/ui/pdf/win-ansi.test.ts`

**Interfaces:**
- Consumes: `Character` (`src/model/character.ts`), `DerivedSheet` + `deriveSheet` (`src/rules/derive.ts`, types in `src/rules/types.ts`), `ContentRegistry`, `classSummary` en `formatMod` (`src/ui/format.ts`), `ABILITIES`/skill-lijsten (`src/content/constants.ts`).
- Produces:

```ts
// sheet-fields.ts — exacte veldnamen van het blad, inclusief spaties aan het eind (zo heten ze in de PDF)
export const ABILITY_FIELDS: Record<Ability, { score: string; mod: string; save: string; saveCheck: string }>;
export const SKILL_FIELDS: Record<Skill, { value: string; check: string }>;
export const DEATH_SAVE_CHECKS: { successes: [string, string, string]; failures: [string, string, string] };
export const WEAPON_ROWS: readonly { name: string; bonus: string; damage: string }[]; // 3 rijen
export const SPELL_LINES: Record<'cantrips' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9', readonly { name: string; prepared?: string }[]>;
export const SLOT_FIELDS: Record<1|2|3|4|5|6|7|8|9, { total: string; remaining: string }>;
export const REQUIRED_FIELDS: readonly string[]; // een handvol om het sjabloon te herkennen: 'CharacterName', 'ClassLevel', 'STR', 'Spells 1014', 'Check Box 11'
// win-ansi.ts
export function toWinAnsi(text: string): string; // tekens die WinAnsi (Windows-1252) niet heeft → vervangen ('−'→'-', '–'/'—' blijven (zitten in 1252), anders '?')
// sheet-values.ts
export interface SheetValues { text: Record<string, string>; checks: string[] }
export function sheetValues(character: Character, registry: ContentRegistry): SheetValues; // roept deriveSheet zelf aan; alle tekst al door toWinAnsi
```

**Veldnamen (uit het blad gemeten; exact overnemen, ook de spaties):**
- Kop: `CharacterName`, `CharacterName 2` (pagina 2), `ClassLevel`, `Background`, `PlayerName`, `Race ` (species), `Alignment`, `XP`, `Inspiration`.
- Abilities (score / mod / save-waarde / save-vinkje): STR `STR`/`STRmod`/`ST Strength`/`Check Box 11`; DEX `DEX`/`DEXmod `/`ST Dexterity`/`Check Box 18`; CON `CON`/`CONmod`/`ST Constitution`/`Check Box 19`; INT `INT`/`INTmod`/`ST Intelligence`/`Check Box 20`; WIS `WIS`/`WISmod`/`ST Wisdom`/`Check Box 21`; CHA `CHA`/`CHamod`/`ST Charisma`/`Check Box 22`.
- Skills (waarde / vinkje): Acrobatics `Acrobatics`/`Check Box 23`; Animal Handling `Animal`/`Check Box 24`; Arcana `Arcana`/`Check Box 25`; Athletics `Athletics`/`Check Box 26`; Deception `Deception `/`Check Box 27`; History `History `/`Check Box 28`; Insight `Insight`/`Check Box 29`; Intimidation `Intimidation`/`Check Box 30`; Investigation `Investigation `/`Check Box 31`; Medicine `Medicine`/`Check Box 32`; Nature `Nature`/`Check Box 33`; Perception `Perception `/`Check Box 34`; Performance `Performance`/`Check Box 35`; Persuasion `Persuasion`/`Check Box 36`; Religion `Religion`/`Check Box 37`; Sleight of Hand `SleightofHand`/`Check Box 38`; Stealth `Stealth `/`Check Box 39`; Survival `Survival`/`Check Box 40`.
- Death saves: successes `Check Box 12`, `Check Box 13`, `Check Box 14`; failures `Check Box 15`, `Check Box 16`, `Check Box 17`.
- Overig pagina 1: `ProfBonus`, `AC`, `Initiative`, `Speed`, `HPMax`, `HPCurrent`, `HPTemp`, `HDTotal`, `HD`, `Passive`, `CP`, `SP`, `EP`, `GP`, `PP`, `AttacksSpellcasting`, `ProficienciesLang`, `Equipment`, `Features and Traits`, `PersonalityTraits `, `Ideals`, `Bonds`, `Flaws`.
- Wapens: (`Wpn Name`, `Wpn1 AtkBonus`, `Wpn1 Damage`), (`Wpn Name 2`, `Wpn2 AtkBonus `, `Wpn2 Damage `), (`Wpn Name 3`, `Wpn3 AtkBonus  ` — twee spaties —, `Wpn3 Damage `).
- Pagina 2: `Age`, `Height`, `Weight`, `Eyes`, `Skin`, `Hair`, `Allies`, `FactionName`, `Backstory`, `Feat+Traits`, `Treasure`.
- Pagina 3: `Spellcasting Class 2`, `SpellcastingAbility 2`, `SpellSaveDC  2` (twee spaties), `SpellAtkBonus 2`; slots level 1–9: `SlotsTotal 19`…`SlotsTotal 27` en `SlotsRemaining 19`…`SlotsRemaining 27` (level n ↔ nummer 18+n).
- Spellregels per level, van boven naar beneden, als `[tekstveld, prepared-vinkje]`:

```json
{"cantrips": [["Spells 1014", null], ["Spells 1016", null], ["Spells 1017", null], ["Spells 1018", null], ["Spells 1019", null], ["Spells 1020", null], ["Spells 1021", null], ["Spells 1022", null]], "1": [["Spells 1015", "Check Box 251"], ["Spells 1023", "Check Box 309"], ["Spells 1024", "Check Box 3010"], ["Spells 1025", "Check Box 3011"], ["Spells 1026", "Check Box 3012"], ["Spells 1027", "Check Box 3013"], ["Spells 1028", "Check Box 3014"], ["Spells 1029", "Check Box 3015"], ["Spells 1030", "Check Box 3016"], ["Spells 1031", "Check Box 3017"], ["Spells 1032", "Check Box 3018"], ["Spells 1033", "Check Box 3019"]], "2": [["Spells 1046", "Check Box 313"], ["Spells 1034", "Check Box 310"], ["Spells 1035", "Check Box 3020"], ["Spells 1036", "Check Box 3021"], ["Spells 1037", "Check Box 3022"], ["Spells 1038", "Check Box 3023"], ["Spells 1039", "Check Box 3024"], ["Spells 1040", "Check Box 3025"], ["Spells 1041", "Check Box 3026"], ["Spells 1042", "Check Box 3027"], ["Spells 1043", "Check Box 3028"], ["Spells 1044", "Check Box 3029"], ["Spells 1045", "Check Box 3030"]], "3": [["Spells 1048", "Check Box 315"], ["Spells 1047", "Check Box 314"], ["Spells 1049", "Check Box 3031"], ["Spells 1050", "Check Box 3032"], ["Spells 1051", "Check Box 3033"], ["Spells 1052", "Check Box 3034"], ["Spells 1053", "Check Box 3035"], ["Spells 1054", "Check Box 3036"], ["Spells 1055", "Check Box 3037"], ["Spells 1056", "Check Box 3038"], ["Spells 1057", "Check Box 3039"], ["Spells 1058", "Check Box 3040"], ["Spells 1059", "Check Box 3041"]], "4": [["Spells 1061", "Check Box 317"], ["Spells 1060", "Check Box 316"], ["Spells 1062", "Check Box 3042"], ["Spells 1063", "Check Box 3043"], ["Spells 1064", "Check Box 3044"], ["Spells 1065", "Check Box 3045"], ["Spells 1066", "Check Box 3046"], ["Spells 1067", "Check Box 3047"], ["Spells 1068", "Check Box 3048"], ["Spells 1069", "Check Box 3049"], ["Spells 1070", "Check Box 3050"], ["Spells 1071", "Check Box 3051"], ["Spells 1072", "Check Box 3052"]], "5": [["Spells 1074", "Check Box 319"], ["Spells 1073", "Check Box 318"], ["Spells 1075", "Check Box 3053"], ["Spells 1076", "Check Box 3054"], ["Spells 1077", "Check Box 3055"], ["Spells 1078", "Check Box 3056"], ["Spells 1079", "Check Box 3057"], ["Spells 1080", "Check Box 3058"], ["Spells 1081", "Check Box 3059"]], "6": [["Spells 1083", "Check Box 321"], ["Spells 1082", "Check Box 320"], ["Spells 1084", "Check Box 3060"], ["Spells 1085", "Check Box 3061"], ["Spells 1086", "Check Box 3062"], ["Spells 1087", "Check Box 3063"], ["Spells 1088", "Check Box 3064"], ["Spells 1089", "Check Box 3065"], ["Spells 1090", "Check Box 3066"]], "7": [["Spells 1092", "Check Box 323"], ["Spells 1091", "Check Box 322"], ["Spells 1093", "Check Box 3067"], ["Spells 1094", "Check Box 3068"], ["Spells 1095", "Check Box 3069"], ["Spells 1096", "Check Box 3070"], ["Spells 1097", "Check Box 3071"], ["Spells 1098", "Check Box 3072"], ["Spells 1099", "Check Box 3073"]], "8": [["Spells 10101", "Check Box 325"], ["Spells 10100", "Check Box 324"], ["Spells 10102", "Check Box 3074"], ["Spells 10103", "Check Box 3075"], ["Spells 10104", "Check Box 3076"], ["Spells 10105", "Check Box 3077"], ["Spells 10106", "Check Box 3078"]], "9": [["Spells 10108", "Check Box 327"], ["Spells 10107", "Check Box 326"], ["Spells 10109", "Check Box 3079"], ["Spells 101010", "Check Box 3080"], ["Spells 101011", "Check Box 3081"], ["Spells 101012", "Check Box 3082"], ["Spells 101013", "Check Box 3083"]]}
```

**Waarden (`sheetValues`):** naam; `ClassLevel` = `classSummary(sheet)`; `Background`, `Race ` = namen uit de registry (species plus gekozen lineage-optie, bijv. `Elf (Wood Elf)`); `Alignment` uit `details`; `PlayerName`, `XP`, `Age`…`Hair`, `Ideals`, `Bonds`, `Flaws`, `Allies`, `FactionName`, `Treasure` leeg; `Inspiration` = `X` bij Heroic Inspiration, anders leeg; scores, mods, saves en skills met `+`/`-` (ASCII); vinkjes voor proficiënte saves en skills (expertise ook); `ProfBonus`, `AC`, `Initiative` (met teken), `Speed` als `30 ft.`, `HPMax`, `HPCurrent`, `HPTemp` (leeg bij 0), `HDTotal` als bijv. `3d10 + 2d6`, `HD` als de resterende dobbelstenen in dezelfde vorm, `Passive` (Passive Perception); death-save-vinkjes naar de tellers; de eerste drie aanvallen in de wapenrijen (naam, bonus met teken, schade), de rest plus spell attack/DC als regels in `AttacksSpellcasting`; munten; `ProficienciesLang` met armor-, wapen- en tooltraining en talen (regels per soort); `Equipment` met één regel per inventory-item (`2x Dagger`, uitgerust/attuned gemarkeerd); `Features and Traits` met de namen van class-, subclass- en species-features (gekozen opties tussen haakjes) en Weapon Mastery; `Feat+Traits` met feats; `PersonalityTraits ` = `details.personality`; `Backstory` = `details.appearance` en `details.backstory`, gescheiden door een lege regel; spellpagina: `Spellcasting Class 2` = de spellcasting-classes, ability/DC/aanval van de eerste spellcasting-bron; slots totaal en resterend per level (Pact Magic-slots tellen op hun eigen level mee); spells per level op de regels uit `SPELL_LINES` met het prepared-vinkje voor voorbereide spells; meer spells dan regels → afkappen.

- [ ] **Step 1: Failing tests**
  - `win-ansi.test.ts`: `toWinAnsi replaces characters the PDF font cannot show` — `'−2 · ✓ Łukasz é ü ß –'` → `'-2 · ? ?ukasz é ü ß –'` (· é ü ß – zitten in Windows-1252; − wordt -, ✓ en Ł worden ?).
  - `sheet-values.test.ts` met de fixture `kael()` (Fighter 3 Champion / Wizard 2, Human, Soldier) en de echte registry: `fills the header and abilities` (o.a. `text['ClassLevel']` bevat `Fighter 3`, `text['STRmod']` begint met `+`); `checks proficient saves and skills` (Fighter-saves STR en CON: `Check Box 11` en `Check Box 19` in `checks`); `fills death saves` (2 failures → `Check Box 15`, `Check Box 16`); `puts the first three attacks in the weapon rows and the rest in the attacks text`; `caps spell lines per level` (13 level 1-spells → 12 regels gevuld, geen fout); `fills slots and prepared checks`; `writes only WinAnsi text` (een naam `Łukasz` → `?ukasz`).
- [ ] **Step 2:** `npx vitest run src/ui/pdf --maxWorkers=2` → FAIL.
- [ ] **Step 3:** Implementeer.
- [ ] **Step 4:** PASS; volledige suite, typecheck, build.
- [ ] **Step 5: Commit** — `feat: veldnamen en waarden voor het PDF-characterblad`.

### Task 2: Het sjabloon invullen met pdf-lib

**Files:**
- Modify: `package.json`, `package-lock.json` (`pdf-lib@1.17.1`, exact)
- Create: `src/ui/pdf/fill-sheet.ts`, `src/ui/pdf/fill-sheet.test.ts`, `src/ui/pdf/testing/fake-template.ts`

**Interfaces:**
- Consumes: Task 1 (`SheetValues`, `REQUIRED_FIELDS`, alle veldconstanten).
- Produces:

```ts
export class TemplateError extends Error { readonly code: 'not-pdf' | 'not-sheet' }
export async function checkTemplate(bytes: Uint8Array): Promise<void>;        // gooit TemplateError
export async function fillSheet(template: Uint8Array, values: SheetValues): Promise<Uint8Array>;
// testing/fake-template.ts (alleen voor tests): bouwt met pdf-lib een PDF met 3 pagina's en alle veldnamen uit sheet-fields.ts
export async function fakeTemplate(): Promise<Uint8Array>;
```

`fillSheet`: `PDFDocument.load(template)`, `getForm()`, voor elke tekstwaarde `getTextField(name).setText(value)` (een veld dat ontbreekt wordt overgeslagen, niet gegooid), voor elke vink `getCheckBox(name).check()`; daarna `form.updateFieldAppearances()` en `doc.save()`. Het formulier blijft invulbaar (niet flatten). `checkTemplate`: geen PDF → `not-pdf`; ontbreekt een van `REQUIRED_FIELDS` → `not-sheet`.

- [ ] **Step 1: Failing tests** (`fill-sheet.test.ts`, node-omgeving, sjabloon uit `fakeTemplate()`): `fills text fields and checks boxes` (terugladen met pdf-lib en waarden lezen); `keeps the form fillable`; `skips a field the template lacks`; `fills a name with characters outside WinAnsi` (via `sheetValues` + `fillSheet`, geen fout); `rejects a PDF without the sheet fields` (lege PDF → `not-sheet`); `rejects bytes that are not a PDF` (`not-pdf`).
- [ ] **Step 2:** FAIL. **Step 3:** installeer `pdf-lib@1.17.1 --save-exact`, implementeer (pdf-lib via `await import('pdf-lib')`). **Step 4:** PASS; volledige suite, typecheck, build (controleer dat pdf-lib een eigen chunk is in `dist/assets`).
- [ ] **Step 5: Commit** — `feat: characterblad invullen met pdf-lib`.

### Task 3: Sjabloon kiezen en de knop PDF

**Files:**
- Create: `src/storage/sheet-template.ts`, `src/storage/sheet-template.test.ts`, `src/ui/use-pdf-export.ts`
- Modify: `src/ui/deliver.ts` (+ test: inhoud mag `string | Uint8Array` zijn, met een `type`-parameter, standaard `application/json`), `src/ui/use-export.ts` (alleen als de share-retry-logica gedeeld wordt), `src/ui/settings/SettingsScreen.tsx` (+ test), `src/ui/list/CharacterList.tsx` (+ test), `src/i18n/en.json`, `src/i18n/nl.json`, `tests/e2e/app.spec.ts`

**Interfaces:**
- Consumes: Task 1–2 (`sheetValues`, `fillSheet`, `checkTemplate`, `TemplateError`), `deliverFile`, `useToast`, `useAppData`.
- Produces:

```ts
// sheet-template.ts (sleutel 'sheet-template' in db.settings; nooit in back-ups)
export interface SheetTemplate { name: string; bytes: Uint8Array; savedAt: string }
export async function saveSheetTemplate(db: TrackerDb, template: SheetTemplate): Promise<void>;
export async function loadSheetTemplate(db: TrackerDb): Promise<SheetTemplate | undefined>;
export async function deleteSheetTemplate(db: TrackerDb): Promise<void>;
// use-pdf-export.ts
export function usePdfExport(): { exportPdf(character: Character): Promise<void> };
```

Controleer dat `loadSettings` niet struikelt over de extra rij in `db.settings` (het leest zijn eigen sleutel) en dat `buildBackup` de tabel `settings` niet meeneemt.

**Bediening:**

| Sleutel | en | nl |
|---|---|---|
| `pdf.section` | Character sheet (PDF) | Characterblad (PDF) |
| `pdf.help` | Choose your own copy of the fillable 5E character sheet once. It stays on this device. | Kies eenmalig je eigen exemplaar van het invulbare 5E-characterblad. Het blijft op dit apparaat. |
| `pdf.choose` | Choose sheet | Blad kiezen |
| `pdf.current` | Sheet: {name} | Blad: {name} |
| `pdf.remove` | Remove sheet | Blad verwijderen |
| `pdf.saved` | Character sheet saved. | Characterblad bewaard. |
| `pdf.button` | PDF | PDF |
| `pdf.noTemplate` | Choose your character sheet in Settings first. | Kies eerst je characterblad in Instellingen. |
| `pdf.done` | PDF ready. | PDF klaar. |
| `pdf.failed` | PDF failed: {reason} | PDF mislukt: {reason} |
| `pdf.error.not-pdf` | This file is not a PDF. | Dit bestand is geen PDF. |
| `pdf.error.not-sheet` | This PDF is not the fillable 5E character sheet. | Deze PDF is niet het invulbare 5E-characterblad. |

**Gedrag:** Instellingen krijgt een kaart `pdf.section` met `pdf.help`, `pdf.current` (als er een sjabloon is), knop `pdf.choose` (verborgen `<input type="file" accept=".pdf,application/pdf">`, na kiezen `checkTemplate` → opslaan → toast `pdf.saved`; fout → `pdf.error.<code>`) en knop `pdf.remove`. Op de lijst krijgt elk character naast Exporteren een knop `pdf.button` (aria-label met de naam, zoals Exporteren). `exportPdf`: geen sjabloon → toast `pdf.noTemplate` (geen fout-stijl); anders `fillSheet(template, sheetValues(character, registry))` → `deliverFile('<bestandsnaam van export zonder .json>.pdf', bytes, …, 'application/pdf')` met dezelfde share-retry als export → toast `pdf.done`; elke andere fout → `pdf.failed`. De back-upherinnering wordt níet gereset (een PDF is geen back-up).

- [ ] **Step 1: Failing tests**: `sheet-template.test.ts` (opslaan, laden, verwijderen; `loadSettings` werkt nog met de extra rij); `deliver.test.ts` (`delivers bytes with a PDF type`); `SettingsScreen.test.tsx` (`saves a chosen character sheet` met `fakeTemplate()`, `reports a file that is not the character sheet`, `removes the sheet`); `CharacterList.test.tsx` (`asks for the sheet first`, `exports a filled PDF` — deliver laten downloaden en controleren dat de geleverde bytes met pdf-lib terug te lezen zijn met de naam in `CharacterName`).
- [ ] **Step 2:** FAIL. **Step 3:** implementeer. **Step 4:** PASS. e2e (Chromium): `exports a filled character sheet` — sjabloon bouwen met `fakeTemplate` (via Node in de test), in Instellingen kiezen, terug naar de lijst, op PDF tikken, download opvangen, met pdf-lib `CharacterName` = `Kael` controleren. Volledige suite, typecheck, build, e2e.
- [ ] **Step 5: Commit** — `feat: PDF-export op je eigen characterblad`.
