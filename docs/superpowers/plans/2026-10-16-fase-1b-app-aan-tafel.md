# Fase 1B: de app aan tafel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een installeerbare web-app die offline werkt, gebouwd op de kern uit 1A. Je maakt er een character mee aan, speelt met de hybride sheet (dobbelstenen, ongedaan maken), bewaart in IndexedDB en exporteert een back-up. De bediening is NL/EN, het thema licht/donker/automatisch, en de app staat op GitHub Pages.

**Architecture:** React-schermen in `src/ui` gebruiken de pure kern (`deriveSheet`, state-acties) en een dunne opslaglaag (`src/storage`, Dexie). Een character-sessie houdt het character in het geheugen en berekent de sheet bij elke wijziging opnieuw. Wijzigingen worden gebundeld bewaard (400 ms) en de laatste 20 zijn ongedaan te maken. Alles wat van buiten de code komt (opgeslagen rijen, exportbestanden, eigen inhoud) gaat eerst door zod en de migraties.

**Tech Stack:** Node 24, TypeScript (strict), React 19, Vite 8, Zod 4, Dexie 4, vite-plugin-pwa 2, Vitest 5 (met jsdom, Testing Library, fake-indexeddb), Playwright 1.64 (Chromium en WebKit), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-15-dnd-character-tracker-design.md`

**Bouwt op:** plan 1A (`docs/superpowers/plans/2026-10-15-fase-1a-kern-inhoud-en-regels.md`) en het overdrachtsdocument `docs/superpowers/notes/2026-10-16-fase-1a-overdracht.md`. Interfaces, namen en getallen in dit plan komen uit de code op `main` (commit `d59295f`, 334 tests).

## Plaats in fase 1

Plan 1A noemde 1B als één plan voor de hele app. Met alles erin wordt dat ruim twee keer zo groot als 1A en niet meer te reviewen. Daarom in twee delen:

- **1B (dit plan): de app aan tafel.** Alles om op één apparaat te spelen en je data veilig te stellen: de regels die aan tafel nog ontbraken, opslag met migraties, export als back-up met herinnering, NL/EN, thema, characterlijst, aanmaakformulier, de hybride sheet, dobbelstenen, ongedaan maken, instellingen, credits, PWA/offline, end-to-end-tests en GitHub Pages. Ook de datalaag van eigen inhoud zit erin (validatie, samenvoegen met skeletten, welke eigen inhoud een character gebruikt), zodat alle dataformaten in 1B vastliggen.
- **1C (volgend plan, geschreven na 1B): overzetten en bibliotheek.** Importeren met validatie en conflictkeuze (*vervangen* of *als kopie toevoegen*), de bibliotheek (doorbladeren, zoeken, skeletten aanvullen, eigen species, backgrounds, feats, spells, items en complete subclasses met een effecten-editor) en de ontbrekende effecten uit de overdracht.

Waarom deze knip: 1C bevat alles waarmee data de app *binnenkomt*, uit een bestand of als eigen inhoud. Dat is één onderdeel. Het gebruikt de poort die 1B bouwt (`parseExportFile`, `validateUserContent`, `mergeFill`) en heeft geen migratie nodig: database, exportbestand en het schema voor eigen inhoud liggen in 1B vast. 1B is zonder 1C bruikbaar: Sam speelt op één apparaat en kan een back-up exporteren. Een character van de PC naar de iPad halen, en daarmee het slagingscriterium van fase 1, komt met 1C.

Over de omvang: 1B telt 18 tasks (1A had er 16). In regels is het plan groter dan 1A, omdat schermcode veel regels kost. Elke task blijft één reviewbare eenheid met eigen tests. Verder knippen levert een 1B op waarmee je nog niet aan tafel kunt spelen: zonder de sheet-tabbladen (Task 15 en 16) of zonder PWA (Task 17) werkt de app op de iPad niet als papieren sheet.

## Open punt voor Sam

**Heb je al een GitHub-account?** Task 17 schrijft de workflow, Task 18 zet de app online. Daarvoor is nodig:

1. een GitHub-account (aanmaken doe je zelf op github.com);
2. een **openbare** repository met de naam `dnd-tracker`. GitHub Pages werkt op een gratis account alleen met openbare repositories. De repository bevat alleen code en SRD-inhoud onder CC-BY-4.0, en van de skelet-subclasses alleen de namen;
3. in die repository: *Settings → Pages → Source: GitHub Actions*.

Zonder account werkt alles lokaal (`npm run dev`, `npm run preview`). De iPad-test uit spec §16 (installeren, vliegtuigmodus) kan pas na publicatie, want een service worker werkt alleen via https of op localhost.

## Global Constraints

- Werkmap `C:\Users\SamTieland\dev\dnd-tracker` (Git Bash: `/c/Users/SamTieland/dev/dnd-tracker`). Al het werk gebeurt op branch `fase-1b` vanaf `main`; `main` krijgt alleen gereviewd werk.
- Alle Global Constraints van plan 1A blijven gelden: SRD 5.2.1 op commit `1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4`, bestanden in `vendor/srd-5.2.1/` nooit met de hand wijzigen, JSON in `src/content/srd/generated/` alleen via `npm run convert:srd`, niets uit geheugen, geen PHB-teksten, TypeScript `strict` zonder `any`, `src/rules` alleen pure functies.
- Bediening in het Nederlands en Engels via `src/i18n/nl.json` en `src/i18n/en.json`; elke zichtbare bedieningstekst staat in beide bestanden. Spelregeltermen blijven in beide talen Engels en staan als Engelse tekst in de code: ability- en skill-namen, condities, AC, Initiative, Speed, Proficiency Bonus, Saving Throws, Skills, Passive Perception, Hit Point Dice, Death Saving Throws, Exhaustion, Heroic Inspiration, Short Rest, Long Rest, Spell Slots, Pact Magic, Spell Attack, Spell Save DC, Cantrips, Advantage, Disadvantage, Level.
- Tikvlakken minimaal 44×44 px (`--tap` in `src/ui/styles.css`); invoervelden met 16px tekst, zodat iOS niet inzoomt.
- Data blijft op het apparaat. De app doet geen netwerkverzoeken behalve het laden van zichzelf.
- `schemaVersion: 1` van het Character ligt vast vanaf Task 7 (opslag). De schemawijzigingen in Task 4 zijn geen migratie, want er is dan nog niets opgeslagen. Databaseversie 1, exportbestand versie 1 en het schema voor eigen inhoud zijn daarna het contract voor 1C.
- Het Credits-scherm toont de attributietekst letterlijk en geen andere attributie aan Wizards; de pagina "Legal Information" van de SRD vraagt dat.
- Exacte versies: `dexie@4.4.6`, `vite-plugin-pwa@2.0.0`; dev: `jsdom@30.1.3`, `@testing-library/react@16.3.3`, `@testing-library/dom@10.4.2`, `@testing-library/user-event@14.6.8`, `fake-indexeddb@6.2.5`, `@playwright/test@1.64.1`. Geen andere nieuwe dependencies.
- UI-tests (`*.test.tsx`) beginnen met de regel `// @vitest-environment jsdom` en renderen via `src/ui/testing/render.tsx`. Opslagtests importeren als eerste `fake-indexeddb/auto`.
- Commit-berichten in het Nederlands, eindigend met de regel `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, of de attributieregel die je eigen omgeving geeft (Ruling 4 uit 1A).

## Review Focus

Vijf situaties die de spec impliceert en die Sam het eerst zou raken. Elke regel heeft een test in de genoemde task.

1. **App gesloten vlak na een wijziging** (iPad: app wegvegen direct na "HP −7"). Bij heropenen staat de wijziging er. `pagehide`, `visibilitychange` en het verlaten van de sheet bewaren meteen. Tests: Task 7 (wachtrij bewaart bij flush, probeert opnieuw na een fout) en Task 14 (sessie bewaart bij verlaten van de sheet).
2. **Schade bij 0 HP**: een death-save-failure (twee bij een kritieke treffer), dood bij schade van minstens het maximum, massive damage, temp HP vangen eerst op, een Stable character begint opnieuw. Tests: Task 3.
3. **Een opgeslagen rij die niet meer klopt** (kapot, of gemaakt door een nieuwere versie van de app): de lijst blijft werken en toont de rij als beschadigd. Tests: Task 7 en Task 10.
4. **Lege, negatieve of niet-numerieke invoer** in getalvelden (HP-bedrag, ability scores, aantallen): er komt nooit een ongeldig character in de database. Tests: Task 11 (formulierlogica), Task 14 (HP-bedrag) en Task 16 (aantal in de inventory).
5. **iPad staand en smalle schermen**: de linkerkolom wordt een tabblad en niets valt buiten beeld. Tests: Task 14 (smal scherm) en Task 17 (WebKit-e2e op iPad-formaat, staand).

## Ontwerpbeslissingen

Deze keuzes gelden voor het hele plan; de tasks werken ze uit.

- **Keuze-effecten (Ruling 24).** Een keuze binnen een SRD-feature wordt een eigen *optie-feature* met `optionOf: <id van de feature>`, bijvoorbeeld `srd:feature:cleric:1:divine-order:protector`. De tekst van de optie is letterlijk een stuk van de tekst van de feature; een test controleert dat. Gekozen opties staan in het bestaande `choices.featureOptions`. Een optie telt alleen als de feature erboven actief is, dus Divine Order verdwijnt mee met het Cleric-level. Opties zonder `optionGroup` sluiten elkaar uit (Divine Order, Primal Order, Elven Lineage); Metamagic en Eldritch Invocations krijgen via `OPTION_GROUP_PARENTS` ook een `optionOf` en blijven meerkeuze. In 1B: Protector, Thaumaturge, Magician, Warden, Drow, High Elf, Wood Elf.
- **Magic Initiate.** Een spell-entry krijgt een optioneel `ability`. Is die er, dan rekent de spell met die ability en de Proficiency Bonus, los van een class; `classId` is dan de spell list (Cleric, Druid of Wizard). Zo'n cantrip geeft geen `cantrip-without-caster` meer. Het attack-ID van een cantrip wordt `<spellId>@<classId>`, zodat dezelfde cantrip onder twee classes twee verschillende ID's heeft.
- **Aanvullingen op skeletten (`fills`).** `mergeFill` neemt niets weg. Een niet-lege naam of tekst vervangt die van het doel; effecten komen *na* de effecten van het doel (Eldritch Knight en Arcane Trickster houden hun spellcasting); features van een subclass-aanvulling komen na de bestaande features. Een effect dat het doel al heeft, telt één keer. Het doel houdt zijn ID, type, source en (bij een subclass) `classId`. De bibliotheek-editor in 1C slaat daarom alleen de eigen toevoegingen op, nooit een kopie van de effecten van het doel.
- **Validatie van eigen inhoud.** `validateUserContent` is de poort voor eigen inhoud uit de database en uit imports. De regels: geldig schema, `source: 'user'`, een ID van de vorm `user:<type>:<slug>` (dus nooit gelijk aan een ingebouwd item), geen dubbele ID's, alleen de typen die de spec noemt, en `fills` alleen bij features en subclasses, naar een ingebouwd ID (`srd:` of `skeleton:`). Een `fills` naar een ID dat niet (meer) bestaat, blijft een los item, zoals in 1A.
- **0 HP.** Schade bij 0 HP geeft een death-save-failure (twee bij een kritieke treffer) en is dodelijk vanaf het HP-maximum; massive damage geldt bij de val naar 0. Dood is `failures === 3` of Exhaustion 6. Stable bewaart de app als `successes === 3` (de SRD zet dan beide tellers op nul; de app houdt de drie successes als markering vast). Rusten kan pas vanaf 1 HP.
- **Short Rest met worpen.** `shortRest` krijgt de worpen per Hit Point Die (`{ die, roll }`) en rekent zelf `roll + CON` (minimaal 1) uit, alleen voor dobbelstenen die echt over waren. Zo kan het aantal genezen HP nooit uit de pas lopen met de uitgegeven dobbelstenen.
- **Ongedaan maken** werkt per character, in het geheugen, voor de laatste 20 wijzigingen in `state` (spec §8). Een undo zet alleen `state` terug, zodat tussendoor gemaakte andere wijzigingen (een spell voorbereiden, een notitie) blijven staan.
- **Opslag.** Rijen worden gevalideerd voordat ze erin gaan, en bij het lezen gemigreerd en opnieuw gevalideerd. Een rij die niet te lezen is, toont de lijst als *beschadigd*, met verwijderen als enige actie.
- **Export versie 1:** `{ format: 'dnd-tracker-export', version: 1, kind: 'character' | 'backup', exportedAt, characters, customContent }`. Een character-export bevat de eigen inhoud die het character gebruikt, ook via aanvullingen op zijn skelet-subclass. `parseExportFile` is in 1B al de importpoort; de round-trip-test van de spec ("export → import geeft een identiek character") draait daarop. Het importscherm komt in 1C.
- **Navigatie** via de hash (`#/c/<id>`), zodat GitHub Pages geen aparte 404-pagina nodig heeft. Geen router-library en geen `dexie-react-hooks`: een paar eigen hooks volstaan.

## Overdracht 1A: waar elk punt landt

| Punt uit de overdracht | Waar |
|---|---|
| Keuzes die effecten geven (Divine Order, Primal Order, Thaumaturge/Magician, Wood Elf) | Task 4 |
| Magic Initiate: spellcasting-ability per spell-entry | Task 4 |
| `fills` behoudt de effecten van het doel | Task 6 |
| Validatie eigen inhoud: `source: 'user'`, `user:`-ID's | Task 6 |
| ID's van inventory-items en overrides passen bij `attack:<id>` | Task 4 |
| Death-save-failure bij schade op 0 HP, kritiek, massive damage, rest vanaf 1 HP, `hpRegained` tegenover begrensde hit dice | Task 3 |
| Melding voor `cantrip-without-caster` en alle andere warning-codes | Task 9 (`warningText`), getoond in Task 12 en 14 |
| Ontbrekende effecten (Martial Arts, Unarmed Strike, Archery alleen ranged, Tireless, Nature's Veil, Stroke of Luck, Divine Intervention, Holy Nimbus, Draconic Flight, Large Form, lineage-spells, Magic Initiate-gratis cast, Persistent Rage, Wild Resurgence) | 1C, samen met de effecten-editor van de bibliotheek |
| Armor zonder training geeft een signaal | Task 3 (warning `armor-untrained`) |
| Eldritch Blast-beams | 1C (cantrip-data); dubbele attack-ID's: Task 4 |
| Condities doen iets op de sheet (Speed 0) | Task 3 |
| `rules-glossary.md` en `character-creation.md` vendoren | Task 2 |
| Sheet-API: class-kolommen op het huidige level, opbouw van bonussen, ID's van een character voor export, HP op max bij aanmaken en level-up | Task 5, Task 6 (`usedUserContent`), Task 3 (`syncHitPoints`) |
| Ingebouwde inhoud in tests bevriezen, zuiverheid van `src/rules` afdwingen, `engines` met CI, maximum op de modifier van een worp | Task 1, Task 17, Task 13 |
| PHB-vragen over Eldritch Knight en Arcane Trickster | staan los van dit plan; Sam beantwoordt ze apart |

## Bestandsstructuur

Nieuw of gewijzigd in 1B (bestaande 1A-bestanden die niet veranderen, staan er niet in):

```
dnd-tracker/
  package.json, vite.config.ts, tsconfig.json, index.html     gewijzigd
  playwright.config.ts                                          e2e-config (Chromium + WebKit)
  .github/workflows/deploy.yml                                  testen, bouwen, publiceren
  public/icons/                                                 PNG-iconen (gegenereerd door scripts/make-icons.ts)
  scripts/png.ts, scripts/make-icons.ts                         PNG-encoder en iconen
  tests/e2e/app.spec.ts                                         end-to-end-tests
  vendor/srd-5.2.1/rules-glossary.md, character-creation.md, ATTRIBUTION.txt
  src/
    main.tsx                                                    opent de database, rendert de app
    architecture.test.ts                                        wie mag wat importeren, rules puur
    content/
      constants.ts               + SPEED_ZERO_CONDITIONS
      schema.ts                  + optionOf op features
      registry.ts                + mergeFill
      user.ts                    validateUserContent, userContentId
      load.ts                    + optie-features, optionOf voor Metamagic en Invocations
      srd/creation.ts            standard array, point buy
      srd/attribution.ts         SRD_ATTRIBUTION
      srd/options.ts             optie-features met bewijs
    model/character.ts           + ability per spell-entry, ID-patroon inventory/overrides
    rules/
      types.ts                   + LifeState, SheetClassLevel, BonusPart, armor-untrained
      actions.ts                 + 0 HP, death saves, rests vanaf 1 HP, worpen, syncHitPoints
      choices.ts                 optionsFor, isExclusive, toggleOption
      bonuses.ts                 collectBonusParts, makeBonus(parts)
      combat.ts, derive.ts, features.ts, spellcasting.ts           kleine uitbreidingen
    dice/dice.ts                 + MAX_MODIFIER, rollAbilityScore
    storage/
      db.ts                      Dexie: characters, customContent, settings
      migrations.ts              migrateCharacter
      characters.ts              laden, bewaren, verwijderen
      settings.ts                instellingen met standaardwaarden
      user-content.ts            eigen inhoud laden (gevalideerd)
      persist.ts                 navigator.storage.persist()
      save-queue.ts              gebundeld bewaren
      used-content.ts            welke eigen inhoud een character gebruikt
      export.ts                  exportbestand bouwen en controleren
      backup.ts                  back-upherinnering
      fixtures/character-v1.json bevroren voorbeeld van schema 1
    i18n/
      en.json, nl.json, i18n.tsx
    ui/
      App.tsx                    providers en schermen
      data.tsx                   AppDataProvider (database, registry, instellingen)
      router.ts, theme.ts, format.ts, warnings.ts, deliver.ts, use-export.ts, hooks.ts
      styles.css
      UpdatePrompt.tsx
      components/                Toast, Dialog, ErrorBoundary (Section), WarningList, NumberInput
      list/CharacterList.tsx
      settings/SettingsScreen.tsx, CreditsScreen.tsx
      form/                      form-logic.ts en het formulier per sectie
      dice/                      DiceProvider, DicePanel, history.ts
      sheet/                     sessie, undo, vaste balk, linkerkolom, tabbladen
      testing/                   render.tsx, pwa-register-stub.ts
```

Verwijderd: `src/App.tsx` (vervangen door `src/ui/App.tsx`).

---
### Task 1: Gereedschap, testomgeving en architectuurbewaking

**Files:**
- Modify: `package.json` (dependencies, `engines`)
- Modify: `vite.config.ts` (tests ook in `*.test.tsx`)
- Modify: `src/rules/testing/fixtures.ts` (ingebouwde inhoud bevriezen)
- Create: `src/architecture.test.ts`

**Interfaces:**
- Consumes: de bestaande modules uit 1A.
- Produces: de testomgeving voor latere tasks (jsdom per bestand via `// @vitest-environment jsdom`, `fake-indexeddb`, Testing Library) en de importregels per laag uit spec §4, bewaakt door `src/architecture.test.ts`:

| Laag | Mag importeren |
|---|---|
| `rules` | `rules`, `content`, `model`; geen packages |
| `content` | `content`, `zod` |
| `model` | `model`, `content`, `zod` |
| `dice` | niets |
| `storage` | `storage`, `model`, `content`, `zod`, `dexie` |
| `i18n` | `i18n`, `react` |
| `ui` | alles |

- [ ] **Step 1: Branch maken en dependencies installeren**

```bash
cd /c/Users/SamTieland/dev/dnd-tracker
git switch -c fase-1b
npm install dexie@4.4.6
npm install -D jsdom@30.1.3 @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/user-event@14.6.8 fake-indexeddb@6.2.5
```

Expected: geen `ERR!`. Voeg in `package.json` direct na `"type": "module",` toe:

```json
  "engines": {
    "node": ">=24"
  },
```

- [ ] **Step 2: Tests ook in `.tsx`-bestanden laten draaien**

In `vite.config.ts` wordt de regel `include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],`:

```ts
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
```

- [ ] **Step 3: De architectuurtest schrijven**

`src/architecture.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const LAYERS = ['rules', 'content', 'model', 'dice', 'storage', 'i18n', 'ui'] as const;
type Layer = (typeof LAYERS)[number];

/** Spec §4: rules is pure and knows no storage or UI, storage knows no rules, nothing but ui imports ui. */
const ALLOWED: Record<Layer, { layers: readonly Layer[]; packages: readonly string[] }> = {
  rules: { layers: ['rules', 'content', 'model'], packages: [] },
  content: { layers: ['content'], packages: ['zod'] },
  model: { layers: ['model', 'content'], packages: ['zod'] },
  dice: { layers: ['dice'], packages: [] },
  storage: { layers: ['storage', 'model', 'content'], packages: ['zod', 'dexie'] },
  i18n: { layers: ['i18n'], packages: ['react'] },
  ui: { layers: LAYERS, packages: ['*'] },
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

function layerOf(file: string): Layer | undefined {
  const first = path.relative(SRC, file).split(path.sep)[0];
  return (LAYERS as readonly string[]).includes(first) ? (first as Layer) : undefined;
}

function importsOf(file: string): string[] {
  const code = readFileSync(file, 'utf8');
  const pattern = /\bfrom\s+['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
  return [...code.matchAll(pattern)].map((m) => m[1] ?? m[2] ?? m[3]);
}

const files = walk(SRC).filter((f) => layerOf(f) !== undefined && !f.includes(`${path.sep}testing${path.sep}`));

describe('architecture', () => {
  it.each(files.map((f) => [path.relative(SRC, f), f]))('%s only imports what its layer may use', (_name, file) => {
    const allowed = ALLOWED[layerOf(file)!];
    for (const spec of importsOf(file)) {
      if (spec.startsWith('.')) {
        const target = layerOf(path.resolve(path.dirname(file), spec));
        expect(target === undefined || allowed.layers.includes(target), spec).toBe(true);
      } else if (!allowed.packages.includes('*')) {
        const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
        expect(allowed.packages, spec).toContain(pkg);
      }
    }
  });

  const rules = files.filter((f) => layerOf(f) === 'rules');
  it.each(rules.map((f) => [path.relative(SRC, f), f]))('%s uses no clock, randomness, storage or browser', (_name, file) => {
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/\b(Date|Math\.random|crypto|indexedDB|localStorage|sessionStorage|fetch|window|document|navigator|setTimeout|setInterval)\b/);
  });
});
```

- [ ] **Step 4: Controleren dat de bewaking bijt**

Zet tijdelijk `export const now = Date.now();` onderaan `src/rules/levels.ts`.
Run: `npm test -- src/architecture.test.ts`
Expected: FAIL in `rules\levels.ts uses no clock, randomness, storage or browser`. Haal de regel weer weg; daarna PASS.

- [ ] **Step 5: Ingebouwde inhoud in tests bevriezen**

In `src/rules/testing/fixtures.ts` wordt de regel `export const registry = createRegistry(loadBuiltinContent());`:

```ts
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** Built-in content is frozen in tests, so a rule that changes content by accident fails loudly. */
export const registry = createRegistry(deepFreeze(loadBuiltinContent()));
```

- [ ] **Step 6: Alles draaien**

Run: `npm test && npm run typecheck`
Expected: alle tests PASS (de 334 van 1A plus de architectuurtests), typecheck zonder fouten. Faalt een 1A-test na het bevriezen met `Cannot assign to read only property`, dan wijzigt die regel ingebouwde inhoud: maak daar een kopie in plaats van het object aan te passen, en vermeld het in je rapport.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/architecture.test.ts src/rules/testing/fixtures.ts
git commit -m "chore: testomgeving voor de app en bewaking van de lagen" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: SRD-bronnen: rules glossary, character creation en attributie

**Files:**
- Create: `vendor/srd-5.2.1/rules-glossary.md`, `vendor/srd-5.2.1/character-creation.md`, `vendor/srd-5.2.1/ATTRIBUTION.txt`
- Modify: `vendor/srd-5.2.1/SOURCE.md`
- Create: `src/content/srd/creation.ts`, `src/content/srd/creation.test.ts`
- Create: `src/content/srd/attribution.ts`, `src/content/srd/attribution.test.ts`
- Modify: `src/content/constants.ts`, `src/content/constants.test.ts`

**Interfaces:**
- Consumes: `readVendor(file)` uit `scripts/convert-srd/vendor.ts`, `tableAfter(md, caption)` uit `scripts/convert-srd/tables.ts`, `splitSections(md, depth)` uit `scripts/convert-srd/markdown.ts`.
- Produces:
  - `src/content/srd/creation.ts`: `STANDARD_ARRAY: readonly [15, 14, 13, 12, 10, 8]`, `POINT_BUY_BUDGET = 27`, `POINT_BUY_COST: Readonly<Record<number, number>>`, `pointBuyCost(scores: Record<Ability, number>): number | undefined`.
  - `src/content/srd/attribution.ts`: `SRD_ATTRIBUTION: string`.
  - `src/content/constants.ts`: `SPEED_ZERO_CONDITIONS: readonly Condition[]`.

- [ ] **Step 1: De twee SRD-bestanden downloaden op de vastgepinde commit**

```bash
SHA=1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4
for f in rules-glossary.md character-creation.md; do
  curl -sfL "https://raw.githubusercontent.com/downfallx/dnd-5e-srd-markdown/$SHA/$f" -o "vendor/srd-5.2.1/$f" || echo "FAILED $f"
done
wc -c vendor/srd-5.2.1/rules-glossary.md vendor/srd-5.2.1/character-creation.md
```

Expected: geen `FAILED`; `72860` bytes voor `rules-glossary.md` en `51566` voor `character-creation.md`.

- [ ] **Step 2: De attributietekst uit de officiële PDF halen**

De tekst komt van de pagina "Legal Information" (pagina 1) van de officiële SRD 5.2.1-PDF. De PDF zelf gaat niet in de repository.

```bash
mkdir -p "$TEMP/srd-pdf"
curl -sfL "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf" -o "$TEMP/srd-pdf/srd.pdf"
wc -c "$TEMP/srd-pdf/srd.pdf"
sha256sum "$TEMP/srd-pdf/srd.pdf"
pdftotext -f 1 -l 1 -layout "$TEMP/srd-pdf/srd.pdf" - | sed -n 1,12p
```

Expected: `6031375` bytes, SHA-256 `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87` (`pdftotext` zit in Git for Windows). De uitvoer bevat het ingesprongen blok dat begint met `This work includes material from the System Reference Document 5.2.1`. Wijkt de hash af, stop dan en meld het: dan is de PDF veranderd en moet Sam beslissen.

Schrijf het blok als één regel (de regelafbreking in `.../4.0/` + `legalcode.` hoort aan elkaar):

```bash
cat > vendor/srd-5.2.1/ATTRIBUTION.txt <<'EOF'
This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.
EOF
```

- [ ] **Step 3: SOURCE.md bijwerken**

`vendor/srd-5.2.1/SOURCE.md` wordt:

```md
# Bron van deze map

- Inhoud: System Reference Document 5.2.1 van Wizards of the Coast, omgezet naar Markdown door de community.
- Repository: https://github.com/downfallx/dnd-5e-srd-markdown
- Commit: 1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4
- Gedownload: 2026-10-15 (`rules-glossary.md` en `character-creation.md`: 2026-10-16)
- Licentie: Creative Commons Attribution 4.0 International, zie `LICENSE` in deze map.

Wijzig deze bestanden niet met de hand. Een nieuwe versie: nieuwe commit kiezen, alles opnieuw downloaden, `npm run convert:srd` draaien en de tests laten slagen.

## ATTRIBUTION.txt

De attributietekst voor het Credits-scherm, letterlijk overgenomen uit het blok op de pagina "Legal Information" (pagina 1) van de officiële PDF:

- URL: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf
- Grootte: 6031375 bytes, SHA-256 8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87
- Dezelfde pagina vraagt om geen andere attributie aan Wizards toe te voegen.
```

- [ ] **Step 4: De falende tests schrijven**

`src/content/srd/creation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { tableAfter } from '../../../scripts/convert-srd/tables';
import { readVendor } from '../../../scripts/convert-srd/vendor';
import { POINT_BUY_BUDGET, POINT_BUY_COST, STANDARD_ARRAY, pointBuyCost } from './creation';

const md = readVendor('character-creation.md');

describe('character creation numbers', () => {
  it('standard array comes from the SRD', () => {
    expect(md).toContain(`_Standard Array._ Use the following six scores for your abilities: ${STANDARD_ARRAY.join(', ')}.`);
  });

  it('point buy budget and costs come from the SRD', () => {
    expect(md).toContain(`You have ${POINT_BUY_BUDGET} points to spend on your ability scores.`);
    const fromTable: Record<number, number> = {};
    for (const row of tableAfter(md, 'Ability Score Point Costs').body) {
      for (let i = 0; i < row.length; i += 2) fromTable[Number(row[i].text)] = Number(row[i + 1].text);
    }
    expect(fromTable).toEqual(POINT_BUY_COST);
  });

  it('counts point buy costs and refuses scores outside 8–15', () => {
    expect(pointBuyCost({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 })).toBe(27);
    expect(pointBuyCost({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 })).toBe(0);
    expect(pointBuyCost({ str: 16, dex: 8, con: 8, int: 8, wis: 8, cha: 8 })).toBeUndefined();
  });
});
```

`src/content/srd/attribution.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SRD_ATTRIBUTION } from './attribution';

describe('SRD_ATTRIBUTION', () => {
  it('is the statement from the Legal Information page of the SRD 5.2.1, verbatim', () => {
    expect(SRD_ATTRIBUTION).toBe(
      'This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, ' +
        'available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 ' +
        'International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.',
    );
  });
});
```

Voeg in `src/content/constants.test.ts` de import van `splitSections` toe en breid de import uit `./constants` uit:

```ts
import { splitSections } from '../../scripts/convert-srd/markdown';
import { ABILITY_BY_NAME, SKILLS, SPEED_ZERO_CONDITIONS } from './constants';
```

en zet onderaan:

```ts
describe('SPEED_ZERO_CONDITIONS', () => {
  it('are exactly the conditions whose glossary entry says Speed 0', () => {
    const fromGlossary = splitSections(readVendor('rules-glossary.md'), 4)
      .filter((s) => s.title.endsWith('[Condition]') && s.body.includes('_Speed 0._'))
      .map((s) => s.title.replace(' [Condition]', '').toLowerCase());
    expect(fromGlossary).toEqual([...SPEED_ZERO_CONDITIONS]);
  });
});
```

- [ ] **Step 5: Tests draaien en zien falen**

Run: `npm test -- src/content`
Expected: FAIL, `Failed to resolve import "./creation"`, `"./attribution"` en `SPEED_ZERO_CONDITIONS` is undefined.

- [ ] **Step 6: Implementeren**

`src/content/srd/creation.ts`:

```ts
import type { Ability } from '../constants';

/** SRD 5.2.1 Character Creation, Step 3: the Standard Array. */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

/** SRD 5.2.1 Character Creation, Step 3: 27 points; the Ability Score Point Costs table covers scores 8–15. */
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_COST: Readonly<Record<number, number>> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

/** Points spent, or undefined when a score is outside the point-buy range. */
export function pointBuyCost(scores: Record<Ability, number>): number | undefined {
  let total = 0;
  for (const score of Object.values(scores)) {
    const cost = POINT_BUY_COST[score];
    if (cost === undefined) return undefined;
    total += cost;
  }
  return total;
}
```

`src/content/srd/attribution.ts`:

```ts
import text from '../../../vendor/srd-5.2.1/ATTRIBUTION.txt?raw';

/** The attribution statement from the "Legal Information" page of the official SRD 5.2.1 PDF, verbatim. */
export const SRD_ATTRIBUTION: string = text.trim();
```

Onderaan `src/content/constants.ts`:

```ts
/** SRD Rules Glossary: these conditions say "Speed 0. Your Speed is 0 and can't increase." */
export const SPEED_ZERO_CONDITIONS: readonly Condition[] = ['grappled', 'paralyzed', 'petrified', 'restrained', 'unconscious'];
```

- [ ] **Step 7: Tests en typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, typecheck zonder fouten.

- [ ] **Step 8: Commit**

```bash
git add vendor/srd-5.2.1 src/content/srd/creation.ts src/content/srd/creation.test.ts src/content/srd/attribution.ts src/content/srd/attribution.test.ts src/content/constants.ts src/content/constants.test.ts
git commit -m "feat: rules glossary, character creation en attributie uit de SRD" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Regels aan tafel: 0 HP, death saves, rests, condities en armor training

**Files:**
- Modify: `src/rules/types.ts` (`LifeState`, `WARNING_CODES`, warning `armor-untrained`)
- Modify: `src/rules/actions.ts` (helemaal vervangen)
- Modify: `src/rules/combat.ts` (`computeSpeed`)
- Modify: `src/rules/derive.ts` (warning voor armor zonder training)
- Test: `src/rules/actions.test.ts`, `src/rules/derive.test.ts`

**Interfaces:**
- Consumes: `DerivedSheet` (`hp`, `hitDice`, `resources`, `abilities.con.mod`, `d20Penalty`, `flags`), `SPEED_ZERO_CONDITIONS` (Task 2), `warnOnce`.
- Produces (in `src/rules/actions.ts`; bestaande functies houden hun naam):
  - `lifeState(character: Character, sheet: DerivedSheet): LifeState` met `type LifeState = 'alive' | 'dying' | 'stable' | 'dead'` (in `types.ts`).
  - `applyDamage(character, amount, sheet, options?: DamageOptions): Character` met `interface DamageOptions { critical?: boolean }`.
  - `recordDeathSave(character, natural: number, sheet): Character`.
  - `setConditions(character, conditions: readonly string[])`, `setExhaustion(character, level: number)`, `setHeroicInspiration(character, on: boolean)`.
  - `canRest(sheet): boolean`.
  - `interface HitDieRoll { die: number; roll: number }`, `interface ShortRestOptions { rolls: HitDieRoll[] }` (vervangt `hitDice` + `hpRegained`), `shortRest(character, sheet, options)`, `longRest(character, sheet)`.
  - `syncHitPoints(character, before: DerivedSheet, after: DerivedSheet): Character`.
  - `types.ts`: `WARNING_CODES` (alle codes als array) en `WarningCode` met `'armor-untrained'` erbij (detail: ID van de armor).

- [ ] **Step 1: Types uitbreiden**

In `src/rules/types.ts` wordt de regel `export type WarningCode = …;`:

```ts
export const WARNING_CODES = ['unknown-content', 'multiclass-prerequisite', 'ability-over-max', 'cantrip-without-caster', 'armor-untrained'] as const;
export type WarningCode = (typeof WARNING_CODES)[number];

/** SRD "Dropping to 0 Hit Points": alive, dying (making Death Saving Throws), Stable, or dead. */
export type LifeState = 'alive' | 'dying' | 'stable' | 'dead';
```

- [ ] **Step 2: De falende tests schrijven**

In `src/rules/actions.test.ts` wordt de importregel van `./actions`:

```ts
import {
  applyDamage, applyHealing, canRest, lifeState, longRest, recordDeathSave, setConditions, setDeathSaves, setExhaustion,
  setHeroicInspiration, setPactSlotsUsed, setResourceUsed, setSlotsUsed, setTempHp, shortRest, syncHitPoints,
} from './actions';
```

en daaronder:

```ts
import { readVendor } from '../../scripts/convert-srd/vendor';
import { kael, level, levels, makeCharacter, registry } from './testing/fixtures';

const playing = readVendor('playing-the-game.md');
const glossary = readVendor('rules-glossary.md');
```

(De bestaande import uit `./testing/fixtures` vervalt, want `level` komt erbij.) Voeg na `describe('hit points', …)` toe:

```ts
describe('dropping to 0 hit points', () => {
  const down = (deathSaves = { successes: 0, failures: 0 }, hpTemp = 0) => kael({ state: { hpCurrent: 0, hpTemp, deathSaves } });

  it('damage at 0 hit points is one death save failure, two from a critical hit', () => {
    expect(playing).toContain('If you take any damage while you have 0 Hit Points, you suffer a Death Saving Throw failure. If the damage is from a Critical Hit, you suffer two failures instead.');
    const character = down({ successes: 1, failures: 0 });
    expect(applyDamage(character, 3, sheetOf(character)).state.deathSaves).toEqual({ successes: 1, failures: 1 });
    expect(applyDamage(character, 3, sheetOf(character), { critical: true }).state.deathSaves).toEqual({ successes: 1, failures: 2 });
  });

  it('damage at 0 hit points of at least the hit point maximum kills', () => {
    expect(playing).toContain('If the damage equals or exceeds your Hit Point maximum, you die.');
    const hit = applyDamage(down(), 40, sheetOf(down()));
    expect(hit.state.deathSaves.failures).toBe(3);
    expect(lifeState(hit, sheetOf(hit))).toBe('dead');
  });

  it('massive damage: a remainder of at least the maximum after dropping to 0 kills', () => {
    expect(playing).toContain('the character dies if the remainder equals or exceeds their Hit Point maximum');
    const character = kael({ state: { hpCurrent: 6 } });
    expect(applyDamage(character, 46, sheetOf(character)).state.deathSaves.failures).toBe(3);
    const survives = applyDamage(character, 45, sheetOf(character));
    expect(survives.state.deathSaves.failures).toBe(0);
    expect(lifeState(survives, sheetOf(survives))).toBe('dying');
  });

  it('temporary hit points absorb damage at 0 hit points before any failure', () => {
    const character = down(undefined, 5);
    expect(applyDamage(character, 3, sheetOf(character)).state.deathSaves.failures).toBe(0);
    expect(applyDamage(character, 7, sheetOf(character)).state.deathSaves.failures).toBe(1);
  });

  it('a Stable character that takes damage starts over with one failure', () => {
    const stable = down({ successes: 3, failures: 0 });
    expect(lifeState(stable, sheetOf(stable))).toBe('stable');
    expect(applyDamage(stable, 2, sheetOf(stable)).state.deathSaves).toEqual({ successes: 0, failures: 1 });
  });

  it('a character without levels has no hit points to lose and no death saves', () => {
    const fresh = makeCharacter();
    expect(applyDamage(fresh, 5, sheetOf(fresh)).state.deathSaves).toEqual({ successes: 0, failures: 0 });
    expect(lifeState(fresh, sheetOf(fresh))).toBe('alive');
  });

  it('Exhaustion level 6 is death', () => {
    expect(glossary).toContain('You die if your Exhaustion level is 6.');
    const exhausted = kael({ state: { hpCurrent: 40, exhaustion: 6 } });
    expect(lifeState(exhausted, sheetOf(exhausted))).toBe('dead');
  });
});

describe('death saving throws', () => {
  const dying = (successes = 0, failures = 0) => kael({ state: { hpCurrent: 0, deathSaves: { successes, failures } } });

  it('10 or higher succeeds, a 1 is two failures, a 20 regains 1 Hit Point', () => {
    expect(playing).toContain('If the roll is 10 or higher, you succeed. Otherwise, you fail.');
    expect(playing).toContain('When you roll a 1 on the d20 for a Death Saving Throw, you suffer two failures. If you roll a 20 on the d20, you regain 1 Hit Point.');
    const character = dying(1, 1);
    const sheet = sheetOf(character);
    expect(recordDeathSave(character, 10, sheet).state.deathSaves).toEqual({ successes: 2, failures: 1 });
    expect(recordDeathSave(character, 9, sheet).state.deathSaves).toEqual({ successes: 1, failures: 2 });
    expect(recordDeathSave(character, 1, sheet).state.deathSaves).toEqual({ successes: 1, failures: 3 });
    expect(recordDeathSave(character, 20, sheet).state).toMatchObject({ hpCurrent: 1, deathSaves: { successes: 0, failures: 0 } });
  });

  it('the third success makes the character Stable and clears the failures', () => {
    expect(playing).toContain('The number of both is reset to zero when you regain any Hit Points or become Stable.');
    const character = dying(2, 2);
    const stable = recordDeathSave(character, 15, sheetOf(character));
    expect(stable.state.deathSaves).toEqual({ successes: 3, failures: 0 });
    expect(lifeState(stable, sheetOf(stable))).toBe('stable');
  });

  it('Exhaustion lowers the roll like any D20 Test', () => {
    const tired = kael({ state: { hpCurrent: 0, exhaustion: 1 } });
    expect(recordDeathSave(tired, 11, sheetOf(tired)).state.deathSaves).toEqual({ successes: 0, failures: 1 });
  });

  it('does nothing unless the character is dying', () => {
    const fine = atFull();
    expect(recordDeathSave(fine, 15, sheetOf(fine))).toBe(fine);
  });
});

describe('conditions, Exhaustion and Heroic Inspiration', () => {
  it('keeps each condition once and Exhaustion between 0 and 6', () => {
    expect(setConditions(atFull(), ['prone', 'prone', 'grappled']).state.conditions).toEqual(['prone', 'grappled']);
    expect(setExhaustion(atFull(), 9).state.exhaustion).toBe(6);
    expect(setExhaustion(atFull(), -1).state.exhaustion).toBe(0);
    expect(setExhaustion(atFull(), NaN).state.exhaustion).toBe(0);
    expect(setHeroicInspiration(atFull(), true).state.heroicInspiration).toBe(true);
  });
});
```

Vervang het hele bestaande `describe('rests', …)`-blok door:

```ts
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

  it('need at least 1 hit point', () => {
    expect(glossary).toContain('To start a Short Rest, you must have at least 1 Hit Point.');
    expect(glossary).toContain('To start a Long Rest, you must have at least 1 Hit Point.');
    const down = kael({ state: { hpCurrent: 0 } });
    const sheet = sheetOf(down);
    expect(canRest(sheet)).toBe(false);
    expect(shortRest(down, sheet, { rolls: [{ die: 10, roll: 5 }] })).toBe(down);
    expect(longRest(down, sheet)).toBe(down);
  });

  it('short rest spends the rolled hit dice, heals die + CON each and recharges short-rest resources', () => {
    const rested = shortRest(tired, sheetOf(tired), { rolls: [{ die: 10, roll: 6 }, { die: 6, roll: 3 }] });
    expect(rested.state.hitDiceSpent).toEqual({ d10: 2, d6: 1 });
    expect(rested.state.hpCurrent).toBe(33);
    expect(rested.state.resourcesUsed).toEqual({ 'second-wind': 1, 'action-surge': 0, 'arcane-recovery': 1 });
    expect(rested.state.slotsUsed).toEqual({ '1': 2 });
    expect(rested.state.hpTemp).toBe(3);
  });

  it('short rest heals only for dice that were left, at least 1 per die, never above the maximum', () => {
    const rested = shortRest(tired, sheetOf(tired), { rolls: Array.from({ length: 5 }, () => ({ die: 10, roll: 10 })) });
    expect(rested.state.hitDiceSpent).toEqual({ d10: 3, d6: 0 });
    expect(rested.state.hpCurrent).toBe(40);
    const frail = makeCharacter({
      choices: { baseAbilities: { str: 10, dex: 10, con: 6, int: 10, wis: 10, cha: 10 }, levels: levels('fighter', 2) },
      state: { hpCurrent: 3 },
    });
    const healed = shortRest(frail, sheetOf(frail), { rolls: [{ die: 10, roll: 1 }, { die: 8, roll: 8 }] });
    expect(healed.state.hpCurrent).toBe(4);
    expect(healed.state.hitDiceSpent).toEqual({ d10: 1 });
  });

  it('ignores rolls that are not numbers', () => {
    const rested = shortRest(tired, sheetOf(tired), { rolls: [{ die: 10, roll: NaN }] });
    expect(rested.state.hitDiceSpent).toEqual({ d10: 1, d6: 0 });
    expect(rested.state.hpCurrent).toBe(20);
  });

  it('short rest restores Pact Magic slots', () => {
    const warlock = makeCharacter({ choices: { levels: levels('warlock', 3) }, state: { pactSlotsUsed: 2, hpCurrent: 5 } });
    expect(shortRest(warlock, sheetOf(warlock), { rolls: [] }).state.pactSlotsUsed).toBe(0);
  });

  it('long rest restores everything, removes one Exhaustion level and grants Heroic Inspiration to humans', () => {
    const rested = longRest(tired, sheetOf(tired));
    expect(rested.state).toMatchObject({ hpCurrent: 40, hpTemp: 0, pactSlotsUsed: 0, exhaustion: 1, heroicInspiration: true });
    expect(rested.state.hitDiceSpent).toEqual({});
    expect(rested.state.slotsUsed).toEqual({});
    expect(rested.state.resourcesUsed).toEqual({});
  });

  it('long rest gives each character its own death saves object', () => {
    const a = longRest(tired, sheetOf(tired));
    const b = longRest(atFull(), sheetOf(atFull()));
    expect(a.state.deathSaves).toEqual(b.state.deathSaves);
    expect(a.state.deathSaves).not.toBe(b.state.deathSaves);
  });

  it('long rest leaves Heroic Inspiration alone without Resourceful', () => {
    const elf = makeCharacter({ choices: { speciesId: 'srd:species:elf', levels: levels('wizard', 1) }, state: { hpCurrent: 6 } });
    expect(longRest(elf, sheetOf(elf)).state.heroicInspiration).toBe(false);
  });

  it('rests normalise state that is above the maximum after a level was removed', () => {
    const stale = kael({ state: { hpCurrent: 99, hitDiceSpent: { d10: 8, d8: 2 }, resourcesUsed: { 'second-wind': 7, rage: 2 } } });
    const rested = shortRest(stale, sheetOf(stale), { rolls: [] });
    expect(rested.state.hpCurrent).toBe(40);
    expect(rested.state.hitDiceSpent).toEqual({ d10: 3, d6: 0 });
    expect(rested.state.resourcesUsed).toEqual({ 'second-wind': 1, 'action-surge': 0, 'arcane-recovery': 0 });
  });
});

describe('syncHitPoints', () => {
  it('a new character starts at full hit points', () => {
    const before = makeCharacter();
    const after = makeCharacter({ choices: { levels: levels('fighter', 1) } });
    expect(syncHitPoints(after, sheetOf(before), sheetOf(after)).state.hpCurrent).toBe(10);
  });

  it('a new level adds what the maximum gained; a removed level caps at the new maximum', () => {
    const before = kael({ state: { hpCurrent: 30 } });
    const up = kael({ state: { hpCurrent: 30 }, choices: { levels: [...kael().choices.levels, level('fighter')] } });
    expect(syncHitPoints(up, sheetOf(before), sheetOf(up)).state.hpCurrent).toBe(38);
    const full = kael({ state: { hpCurrent: 38 } });
    const down = kael({ state: { hpCurrent: 38 }, choices: { levels: kael().choices.levels.slice(0, 4) } });
    expect(syncHitPoints(down, sheetOf(full), sheetOf(down)).state.hpCurrent).toBe(34);
  });
});
```

In `src/rules/derive.test.ts`: voeg bovenaan `import { readVendor } from '../../scripts/convert-srd/vendor';` toe en onderaan:

```ts
describe('deriveSheet: conditions and armor training', () => {
  it('Grappled, Paralyzed, Petrified, Restrained and Unconscious set Speed to 0', () => {
    for (const condition of ['grappled', 'paralyzed', 'petrified', 'restrained', 'unconscious']) {
      expect(derive(kael({ state: { conditions: [condition] } })).speed, condition).toBe(0);
    }
    expect(derive(kael({ state: { conditions: ['prone', 'poisoned'] } })).speed).toBe(30);
  });

  it('armor without training gives a warning', () => {
    expect(readVendor('equipment.md')).toContain(
      "If you wear Light, Medium, or Heavy armor and lack training with it, you have Disadvantage on any D20 Test that involves Strength or Dexterity, and you can't cast spells.",
    );
    const wizard = derive(makeCharacter({ choices: { levels: levels('wizard', 1) }, inventory: [item('a', 'srd:armor:chain-mail')] }));
    expect(wizard.warnings).toContainEqual({ code: 'armor-untrained', detail: 'srd:armor:chain-mail' });
    expect(derive(kael()).warnings).toEqual([]);
  });
});
```

- [ ] **Step 3: Tests draaien en zien falen**

Run: `npm test -- src/rules`
Expected: FAIL, onder andere `canRest is not a function` en de verwachte death saves komen niet overeen.

- [ ] **Step 4: `actions.ts` vervangen**

`src/rules/actions.ts`:

```ts
import type { Character } from '../model/character';
import type { DerivedSheet, LifeState } from './types';

const withState = (character: Character, patch: Partial<Character['state']>): Character => ({
  ...character,
  state: { ...character.state, ...patch },
});
/** Whole, non-negative amounts; NaN and Infinity count as 0 so they never reach the character state. */
const whole = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0);
const noDeathSaves = () => ({ successes: 0, failures: 0 });

/**
 * SRD "Dropping to 0 Hit Points": three failures, or Exhaustion level 6, is death. Three successes is Stable; the app
 * keeps that as successes = 3 until the character regains hit points. Without levels there are no hit points yet.
 */
export function lifeState(character: Character, sheet: DerivedSheet): LifeState {
  const { deathSaves, exhaustion } = character.state;
  if (deathSaves.failures >= 3 || exhaustion >= 6) return 'dead';
  if (sheet.hp.current > 0 || sheet.hp.max === 0) return 'alive';
  return deathSaves.successes >= 3 ? 'stable' : 'dying';
}

export interface DamageOptions {
  /** The damage comes from a Critical Hit: two death save failures at 0 hit points. */
  critical?: boolean;
}

/**
 * Damage hits temporary hit points first; hit points never drop below 0. It starts from the hit points the sheet
 * shows (stored value capped at the maximum), so stale hit points above the maximum don't hide the damage.
 * SRD "Damage at 0 Hit Points": one death save failure (two from a critical hit), and death when the damage equals or
 * exceeds the hit point maximum; a Stable character starts over. SRD "Massive Damage": dropping to 0 with a remainder
 * that equals or exceeds the maximum is death too.
 */
export function applyDamage(character: Character, amount: number, sheet: DerivedSheet, options: DamageOptions = {}): Character {
  const damage = whole(amount);
  const fromTemp = Math.min(character.state.hpTemp, damage);
  const toHp = damage - fromTemp;
  const shown = Math.min(Math.max(0, character.state.hpCurrent), sheet.hp.max);
  const max = sheet.hp.max;
  let { deathSaves } = character.state;
  if (toHp > 0 && max > 0) {
    if (shown === 0) {
      const failures = toHp >= max ? 3 : deathSaves.failures + (options.critical ? 2 : 1);
      deathSaves = { successes: deathSaves.successes >= 3 ? 0 : deathSaves.successes, failures: Math.min(3, failures) };
    } else if (toHp - shown >= max) {
      deathSaves = { successes: 0, failures: 3 };
    }
  }
  return withState(character, { hpTemp: character.state.hpTemp - fromTemp, hpCurrent: Math.max(0, shown - toHp), deathSaves });
}

/** Healing up to the maximum; being above 0 hit points resets death saves. */
export function applyHealing(character: Character, amount: number, sheet: DerivedSheet): Character {
  const hpCurrent = Math.min(sheet.hp.max, Math.max(0, character.state.hpCurrent) + whole(amount));
  return withState(character, { hpCurrent, deathSaves: hpCurrent > 0 ? noDeathSaves() : character.state.deathSaves });
}

/** Temporary hit points don't stack: the new value replaces the old one. */
export function setTempHp(character: Character, value: number): Character {
  return withState(character, { hpTemp: whole(value) });
}

export function setDeathSaves(character: Character, successes: number, failures: number): Character {
  const clamp = (n: number) => Math.min(3, whole(n));
  return withState(character, { deathSaves: { successes: clamp(successes), failures: clamp(failures) } });
}

/**
 * SRD "Death Saving Throws": a 1 counts as two failures, a 20 regains 1 Hit Point, otherwise 10 or higher succeeds.
 * Exhaustion lowers the roll like any D20 Test. The third success makes the character Stable. Only a dying character rolls.
 */
export function recordDeathSave(character: Character, natural: number, sheet: DerivedSheet): Character {
  if (lifeState(character, sheet) !== 'dying') return character;
  if (natural >= 20) return applyHealing(character, 1, sheet);
  const { successes, failures } = character.state.deathSaves;
  if (natural > 1 && natural - sheet.d20Penalty >= 10) {
    const next = successes + 1;
    return withState(character, { deathSaves: next >= 3 ? { successes: 3, failures: 0 } : { successes: next, failures } });
  }
  return withState(character, { deathSaves: { successes, failures: Math.min(3, failures + (natural <= 1 ? 2 : 1)) } });
}

export function setConditions(character: Character, conditions: readonly string[]): Character {
  return withState(character, { conditions: [...new Set(conditions)] });
}

/** Exhaustion levels 0–6 (SRD Rules Glossary). */
export function setExhaustion(character: Character, level: number): Character {
  return withState(character, { exhaustion: Math.min(6, whole(level)) });
}

export function setHeroicInspiration(character: Character, on: boolean): Character {
  return withState(character, { heroicInspiration: on });
}

/** A slot level the sheet doesn't have leaves the character unchanged, so no invalid key is ever stored. */
export function setSlotsUsed(character: Character, slotLevel: number, used: number, sheet: DerivedSheet): Character {
  const slot = sheet.spellcasting.slots.find((s) => s.level === slotLevel);
  if (!slot) return character;
  return withState(character, { slotsUsed: { ...character.state.slotsUsed, [String(slotLevel)]: Math.min(slot.max, whole(used)) } });
}

export function setPactSlotsUsed(character: Character, used: number, sheet: DerivedSheet): Character {
  return withState(character, { pactSlotsUsed: Math.min(sheet.spellcasting.pact?.slots ?? 0, whole(used)) });
}

export function setResourceUsed(character: Character, key: string, used: number, sheet: DerivedSheet): Character {
  const resource = sheet.resources.find((r) => r.key === key);
  if (!resource) return character;
  return withState(character, { resourcesUsed: { ...character.state.resourcesUsed, [key]: Math.min(resource.max, whole(used)) } });
}

/** SRD "Short Rest" and "Long Rest": you need at least 1 Hit Point to start one. */
export function canRest(sheet: DerivedSheet): boolean {
  return sheet.hp.current >= 1;
}

export interface HitDieRoll {
  /** Die size, e.g. 10 for a d10. */
  die: number;
  /** The number rolled on that die. */
  roll: number;
}

export interface ShortRestOptions {
  /** One entry per Hit Point Die spent, in the order rolled. Rolls for dice that are not left are ignored. */
  rolls: HitDieRoll[];
}

/**
 * SRD "Short Rest": each spent Hit Point Die heals its roll + Constitution modifier (minimum 1), only for dice that
 * were left. Short-rest resources and Pact Magic slots recharge. Needs at least 1 Hit Point.
 */
export function shortRest(character: Character, sheet: DerivedSheet, options: ShortRestOptions): Character {
  if (!canRest(sheet)) return character;
  const left = new Map(sheet.hitDice.map((hd) => [hd.die, hd.total - hd.spent]));
  const hitDiceSpent: Record<string, number> = Object.fromEntries(sheet.hitDice.map((hd) => [`d${hd.die}`, hd.spent]));
  let regained = 0;
  for (const { die, roll } of options.rolls) {
    const remaining = left.get(die) ?? 0;
    if (remaining <= 0 || !Number.isFinite(roll)) continue;
    left.set(die, remaining - 1);
    hitDiceSpent[`d${die}`] += 1;
    regained += Math.max(1, Math.min(die, Math.max(1, Math.floor(roll))) + sheet.abilities.con.mod);
  }
  const resourcesUsed: Record<string, number> = {};
  for (const resource of sheet.resources) {
    resourcesUsed[resource.key] = resource.recharge === 'short' ? 0 : Math.max(0, resource.used - resource.shortRestRegain);
  }
  return withState(character, {
    hitDiceSpent,
    resourcesUsed,
    pactSlotsUsed: 0,
    hpCurrent: Math.min(sheet.hp.max, sheet.hp.current + regained),
    deathSaves: noDeathSaves(),
  });
}

export function longRest(character: Character, sheet: DerivedSheet): Character {
  if (!canRest(sheet)) return character;
  return withState(character, {
    hpCurrent: sheet.hp.max,
    hpTemp: 0,
    hitDiceSpent: {},
    slotsUsed: {},
    pactSlotsUsed: 0,
    resourcesUsed: {},
    deathSaves: noDeathSaves(),
    exhaustion: Math.max(0, character.state.exhaustion - 1),
    heroicInspiration: sheet.flags.includes('heroic-inspiration-on-long-rest') || character.state.heroicInspiration,
  });
}

/**
 * After the choices changed (the form was saved): a character that had no levels starts at full hit points; otherwise
 * the current hit points rise by as much as the maximum rose, and never exceed the new maximum.
 */
export function syncHitPoints(character: Character, before: DerivedSheet, after: DerivedSheet): Character {
  const hpCurrent =
    before.totalLevel === 0 ? after.hp.max : Math.min(after.hp.max, before.hp.current + Math.max(0, after.hp.max - before.hp.max));
  return withState(character, { hpCurrent });
}
```

- [ ] **Step 5: Speed 0 door condities**

In `src/rules/combat.ts`: voeg de import `import { SPEED_ZERO_CONDITIONS } from '../content/constants';` toe en zet als eerste regels in `computeSpeed`:

```ts
  // SRD Rules Glossary: Grappled, Paralyzed, Petrified, Restrained and Unconscious set Speed to 0.
  if (character.state.conditions.some((c) => (SPEED_ZERO_CONDITIONS as readonly string[]).includes(c))) return 0;
```

- [ ] **Step 6: Warning voor armor zonder training**

In `src/rules/derive.ts` wordt `import { unknownContent } from './warnings';` gewijzigd in `import { unknownContent, warnOnce } from './warnings';`, en direct na `const prof = computeProficiencies(…);`:

```ts
  // SRD Armor Training: without training, Disadvantage on Strength and Dexterity D20 Tests and no spellcasting.
  if (equipment.armor && !prof.armor.has(equipment.armor.category)) {
    warnOnce(warnings, { code: 'armor-untrained', detail: equipment.armor.id });
  }
```

- [ ] **Step 7: Tests en typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, typecheck zonder fouten.

- [ ] **Step 8: Commit**

```bash
git add src/rules
git commit -m "feat: death saves bij 0 HP, rusten vanaf 1 HP met echte worpen, condities en armor training" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Keuze-effecten: opties, Magic Initiate en unieke attack-ID's

**Files:**
- Modify: `src/content/schema.ts` (`optionOf` op features)
- Create: `src/content/srd/options.ts`, `src/content/srd/options.test.ts`
- Modify: `src/content/load.ts`
- Modify: `src/model/character.ts`, `src/model/character.test.ts`
- Modify: `src/rules/features.ts`, `src/rules/spellcasting.ts`, `src/rules/derive.ts`
- Create: `src/rules/choices.ts`, `src/rules/choices.test.ts`
- Test: `src/rules/derive.test.ts`

**Interfaces:**
- Consumes: `FeatureDef`, `Effect`, `slugify`, `convertAll()` (in tests), `choices.featureOptions` en `choices.spells` uit het Character.
- Produces:
  - `FeatureDef.optionOf?: string`: de feature waar deze optie bij hoort.
  - `src/content/srd/options.ts`: `OPTION_FEATURES: FeatureDef[]` en `OPTION_GROUP_PARENTS: Record<string, string>`. Optie-ID's: `srd:feature:cleric:1:divine-order:protector`, `…:thaumaturge`, `srd:feature:druid:1:primal-order:magician`, `…:warden`, `srd:feature:elf:elven-lineage:drow`, `…:high-elf`, `…:wood-elf`.
  - `src/rules/choices.ts`: `optionsFor(registry, parentId): FeatureDef[]`, `isExclusive(options: FeatureDef[]): boolean`, `toggleOption(character, registry, optionId, on: boolean): Character`.
  - Character: `choices.spells[]` krijgt `ability?: Ability`; `inventory[].id` en `overrides[].id` voldoen aan `/^[a-z0-9-]+$/` (zoals `crypto.randomUUID()`).
  - `src/rules/spellcasting.ts`: `type SpellStatsFn = (ability: Ability) => { attack: number; dc: number }`, `makeSpellStats(abilities, pb, bonus, d20Penalty): SpellStatsFn`; `computeSpellcasting(character, registry, sources, stats)`; `computeCantripAttacks(character, registry, spellcasting, totalLevel, warnings, stats)`. Cantrip-attack-ID: `` `${spellId}@${classId}` ``.

- [ ] **Step 1: De falende tests schrijven**

`src/content/srd/options.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { convertAll } from '../../../scripts/convert-srd/convert';
import { loadBuiltinContent } from '../load';
import { OPTION_FEATURES, OPTION_GROUP_PARENTS } from './options';

const data = convertAll();
const texts = new Map(data.features.map((f) => [f.id, f.text]));

describe('OPTION_FEATURES', () => {
  it('each option belongs to an SRD feature and quotes its text verbatim', () => {
    for (const option of OPTION_FEATURES) {
      expect(texts.get(option.optionOf ?? ''), option.id).toContain(option.text);
      expect(option.id.startsWith(`${option.optionOf}:`), option.id).toBe(true);
    }
    expect(new Set(OPTION_FEATURES.map((o) => o.id)).size).toBe(OPTION_FEATURES.length);
  });

  it('effect values follow the option text', () => {
    const wood = OPTION_FEATURES.find((o) => o.name === 'Wood Elf')!;
    const elf = data.species.find((s) => s.id === 'srd:species:elf')!;
    const speed = Number(/Your Speed increases to (\d+) feet/.exec(wood.text)![1]);
    expect(wood.effects).toEqual([{ kind: 'bonus', target: 'speed', value: speed - elf.speed }]);
    for (const option of OPTION_FEATURES) {
      for (const effect of option.effects) {
        if (effect.kind === 'bonus' && typeof effect.value === 'object') {
          expect(option.text, option.id).toMatch(/equals your Wisdom modifier \(minimum (?:bonus )?of \+1\)/);
          expect(effect.value).toEqual({ mod: 'wis', min: 1 });
          expect(option.text.toLowerCase()).toContain(effect.target.replace('skill:', ''));
        }
        if (effect.kind === 'proficiency') expect(option.text.toLowerCase(), option.id).toContain(effect.target.split(':')[1]);
      }
    }
  });

  it('option groups point at the class feature that grants them', () => {
    for (const [group, parent] of Object.entries(OPTION_GROUP_PARENTS)) {
      expect(texts.has(parent), parent).toBe(true);
      expect(data.features.some((f) => f.optionGroup === group), group).toBe(true);
    }
    expect(loadBuiltinContent().find((i) => i.id === 'srd:feature:metamagic:careful-spell')).toMatchObject({
      optionOf: 'srd:feature:sorcerer:2:metamagic',
    });
  });
});
```

`src/rules/choices.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isExclusive, optionsFor, toggleOption } from './choices';
import { makeCharacter, registry } from './testing/fixtures';

const DIVINE_ORDER = 'srd:feature:cleric:1:divine-order';
const PROTECTOR = `${DIVINE_ORDER}:protector`;
const THAUMATURGE = `${DIVINE_ORDER}:thaumaturge`;
const CAREFUL = 'srd:feature:metamagic:careful-spell';
const DISTANT = 'srd:feature:metamagic:distant-spell';

describe('feature options', () => {
  it('lists the options of a parent feature', () => {
    expect(optionsFor(registry, DIVINE_ORDER).map((o) => o.name)).toEqual(['Protector', 'Thaumaturge']);
    expect(optionsFor(registry, 'srd:feature:sorcerer:2:metamagic').length).toBeGreaterThan(1);
  });

  it('Divine Order allows one option, Metamagic several', () => {
    expect(isExclusive(optionsFor(registry, DIVINE_ORDER))).toBe(true);
    expect(isExclusive(optionsFor(registry, 'srd:feature:sorcerer:2:metamagic'))).toBe(false);
  });

  it('choosing an exclusive option replaces its sibling; turning an option off removes it', () => {
    const protector = toggleOption(makeCharacter(), registry, PROTECTOR, true);
    expect(toggleOption(protector, registry, THAUMATURGE, true).choices.featureOptions).toEqual([THAUMATURGE]);
    const meta = toggleOption(toggleOption(makeCharacter(), registry, CAREFUL, true), registry, DISTANT, true);
    expect(meta.choices.featureOptions).toEqual([CAREFUL, DISTANT]);
    expect(toggleOption(meta, registry, CAREFUL, false).choices.featureOptions).toEqual([DISTANT]);
  });
});
```

Voeg toe aan `src/model/character.test.ts`, binnen `describe('CharacterSchema', …)`:

```ts
  it('inventory and override ids fit bonus targets such as attack:<id>', () => {
    const withItem = (id: string) => ({ ...valid, inventory: [{ id, qty: 1, equipped: false, attuned: false }] });
    expect(CharacterSchema.safeParse(withItem('6f1d2c3b-0a4e-4b5f-8a6d-7e8f9a0b1c2d')).success).toBe(true);
    expect(CharacterSchema.safeParse(withItem('Item 1')).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...valid, overrides: [{ id: 'O:1', target: 'ac', value: 1, reason: '' }] }).success).toBe(false);
  });

  it('a spell from a feat carries its own spellcasting ability', () => {
    const withSpell = (entry: object) => ({ ...valid, choices: { ...valid.choices, spells: [entry] } });
    const guidance = { classId: 'srd:class:cleric', spellId: 'srd:spell:guidance', prepared: true };
    expect(CharacterSchema.safeParse(withSpell({ ...guidance, ability: 'wis' })).success).toBe(true);
    expect(CharacterSchema.safeParse(withSpell({ ...guidance, ability: 'luck' })).success).toBe(false);
  });
```

In `src/rules/derive.test.ts`, pas de bestaande cantrip-tests aan de nieuwe attack-ID's aan:
- in `'Kael: wizard spellcasting, …'`: `id: 'srd:spell:fire-bolt',` wordt `id: 'srd:spell:fire-bolt@srd:class:wizard',`;
- in de `it.each` over Fire Bolt en in `'a cantrip from a class without spellcasting …'`: `a.id === 'srd:spell:fire-bolt'` wordt `a.name === 'Fire Bolt'`;
- in `'a cantrip that does not scale in dice (Eldritch Blast) …'`: `a.id === 'srd:spell:eldritch-blast'` wordt `a.name === 'Eldritch Blast'`;
- in `'a cantrip never borrows the stats of another casting class'` wordt `const fireBolts = sheet.attacks.filter((a) => a.id === 'srd:spell:fire-bolt');` vervangen door:

```ts
    const fireBolts = sheet.attacks.filter((a) => a.name === 'Fire Bolt');
    expect(fireBolts.map((a) => a.id)).toEqual(['srd:spell:fire-bolt@srd:class:sorcerer', 'srd:spell:fire-bolt@srd:class:wizard']);
```

En voeg onderaan toe:

```ts
describe('deriveSheet: choices that change numbers', () => {
  const cleric = (options: string[], wis = 14) =>
    makeCharacter({ choices: { baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis, cha: 10 }, levels: levels('cleric', 1), featureOptions: options } });

  it('Divine Order Protector: Martial weapons and Heavy armor', () => {
    const sheet = derive(cleric(['srd:feature:cleric:1:divine-order:protector']));
    expect(sheet.weaponProficiencies).toContain('martial');
    expect(sheet.armorTraining).toContain('heavy');
    expect(sheet.features.find((f) => f.origin === 'option')).toMatchObject({ name: 'Protector', ownerName: 'Divine Order' });
  });

  it('Divine Order Thaumaturge: Wisdom modifier, minimum +1, on Arcana and Religion', () => {
    const wise = derive(cleric(['srd:feature:cleric:1:divine-order:thaumaturge'], 14));
    expect([wise.skills.arcana.bonus, wise.skills.religion.bonus, wise.skills.history.bonus]).toEqual([2, 2, 0]);
    expect(derive(cleric(['srd:feature:cleric:1:divine-order:thaumaturge'], 8)).skills.arcana.bonus).toBe(1);
  });

  it('Primal Order Warden and Magician', () => {
    const base = { baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 12, cha: 10 }, levels: levels('druid', 1) };
    const warden = derive(makeCharacter({ choices: { ...base, featureOptions: ['srd:feature:druid:1:primal-order:warden'] } }));
    expect(warden.armorTraining).toContain('medium');
    expect(warden.weaponProficiencies).toContain('martial');
    const magician = derive(makeCharacter({ choices: { ...base, featureOptions: ['srd:feature:druid:1:primal-order:magician'] } }));
    expect(magician.skills.nature.bonus).toBe(1);
  });

  it('Wood Elf: Speed 35', () => {
    const elf = (options: string[]) => derive(makeCharacter({ choices: { speciesId: 'srd:species:elf', featureOptions: options } }));
    expect(elf([]).speed).toBe(30);
    expect(elf(['srd:feature:elf:elven-lineage:wood-elf']).speed).toBe(35);
  });

  it('an option only counts while its parent feature is active', () => {
    const wizard = derive(makeCharacter({
      choices: { levels: levels('wizard', 1), featureOptions: ['srd:feature:cleric:1:divine-order:protector', 'srd:feature:metamagic:careful-spell'] },
    }));
    expect(wizard.weaponProficiencies).not.toContain('martial');
    expect(wizard.features.some((f) => f.origin === 'option')).toBe(false);
    expect(wizard.warnings).toEqual([]);
  });

  it('Magic Initiate: a cantrip uses the ability chosen for the feat, without a casting class', () => {
    const fighter = derive(makeCharacter({
      choices: {
        baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 },
        levels: levels('fighter', 1),
        spells: [{ classId: 'srd:class:cleric', spellId: 'srd:spell:sacred-flame', prepared: true, ability: 'wis' }],
      },
    }));
    expect(fighter.attacks.find((a) => a.kind === 'cantrip')).toMatchObject({ id: 'srd:spell:sacred-flame@srd:class:cleric', saveDC: 13, saveAbility: 'dex' });
    expect(fighter.warnings).toEqual([]);
  });
});
```

- [ ] **Step 2: Tests draaien en zien falen**

Run: `npm test -- src/content src/model src/rules`
Expected: FAIL, `Failed to resolve import "./options"` en `"./choices"`, en de nieuwe verwachtingen in `derive.test.ts` en `character.test.ts` falen.

- [ ] **Step 3: Schema's uitbreiden**

In `src/content/schema.ts`, in `FeatureSchema` na `optionGroup: z.string().optional(),`:

```ts
  /** The feature this option belongs to; the option only counts while that feature is active. */
  optionOf: z.string().optional(),
```

In `src/model/character.ts`: de import wordt `import { AbilitySchema, BonusTargetSchema } from '../content/schema';`, en boven `LevelChoiceSchema`:

```ts
/** Inventory and override ids end up in bonus targets such as attack:<id>, so they use the same characters. */
const entryId = z.string().regex(/^[a-z0-9-]+$/);
```

Vervang in `CharacterSchema` `id: z.string().min(1),` binnen `inventory` en binnen `overrides` door `id: entryId,`. De regel met `spells:` wordt:

```ts
    /** `ability` is set for spells from a feat such as Magic Initiate; `classId` is then the spell list. */
    spells: z.array(z.strictObject({ classId: z.string(), spellId: z.string(), prepared: z.boolean(), ability: AbilitySchema.optional() })),
```

- [ ] **Step 4: Optie-features en optiegroepen**

`src/content/srd/options.ts`:

```ts
import { slugify } from '../ids';
import type { Effect, FeatureDef } from '../schema';

const DIVINE_ORDER = 'srd:feature:cleric:1:divine-order';
const PRIMAL_ORDER = 'srd:feature:druid:1:primal-order';
const ELVEN_LINEAGE = 'srd:feature:elf:elven-lineage';

const option = (parentId: string, name: string, text: string, effects: Effect[]): FeatureDef => ({
  id: `${parentId}:${slugify(name)}`,
  type: 'feature',
  source: 'srd',
  name,
  text,
  effects,
  optionOf: parentId,
});

const wisdomOn = (skill: 'arcana' | 'religion' | 'nature'): Effect => ({ kind: 'bonus', target: `skill:${skill}`, value: { mod: 'wis', min: 1 } });
const martialAnd = (armor: 'heavy' | 'medium'): Effect[] => [
  { kind: 'proficiency', target: 'weapon:martial' },
  { kind: 'proficiency', target: `armor:${armor}` },
];

/**
 * Choices inside an SRD feature, as option features. Each text is a verbatim part of the parent feature's text
 * (checked in options.test.ts). An option only counts while its parent feature is active.
 */
export const OPTION_FEATURES: FeatureDef[] = [
  option(DIVINE_ORDER, 'Protector', 'Trained for battle, you gain proficiency with Martial weapons and training with Heavy armor.', martialAnd('heavy')),
  option(
    DIVINE_ORDER,
    'Thaumaturge',
    'You know one extra cantrip from the Cleric spell list. In addition, your mystical connection to the divine gives you a bonus to your Intelligence (Arcana or Religion) checks. The bonus equals your Wisdom modifier (minimum of +1).',
    [wisdomOn('arcana'), wisdomOn('religion')],
  ),
  option(
    PRIMAL_ORDER,
    'Magician',
    'You know one extra cantrip from the Druid spell list. In addition, your mystical connection to nature gives you a bonus to your Intelligence (Arcana or Nature) checks. The bonus equals your Wisdom modifier (minimum bonus of +1).',
    [wisdomOn('arcana'), wisdomOn('nature')],
  ),
  option(PRIMAL_ORDER, 'Warden', 'Trained for battle, you gain proficiency with Martial weapons and training with Medium armor.', martialAnd('medium')),
  option(ELVEN_LINEAGE, 'Drow', 'The range of your Darkvision increases to 120 feet. You also know the Dancing Lights cantrip.', []),
  option(
    ELVEN_LINEAGE,
    'High Elf',
    'You know the Prestidigitation cantrip. Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list.',
    [],
  ),
  option(ELVEN_LINEAGE, 'Wood Elf', 'Your Speed increases to 35 feet. You also know the Druidcraft cantrip.', [{ kind: 'bonus', target: 'speed', value: 5 }]),
];

/** SRD option groups and the class feature that grants them; several options of a group can be chosen. */
export const OPTION_GROUP_PARENTS: Record<string, string> = {
  metamagic: 'srd:feature:sorcerer:2:metamagic',
  'eldritch-invocation': 'srd:feature:warlock:1:eldritch-invocations',
};
```

In `src/content/load.ts`: voeg `import { OPTION_FEATURES, OPTION_GROUP_PARENTS } from './srd/options';` toe, en onder `withEffects`:

```ts
function withOptionParents(items: FeatureDef[]): FeatureDef[] {
  return items.map((item) => {
    const parent = item.optionGroup ? OPTION_GROUP_PARENTS[item.optionGroup] : undefined;
    return parent ? { ...item, optionOf: parent } : item;
  });
}
```

In `loadBuiltinContent` wordt `...withEffects(asList<FeatureDef>(featuresJson)),` vervangen door:

```ts
    ...withEffects(withOptionParents(asList<FeatureDef>(featuresJson))),
    ...OPTION_FEATURES,
```

- [ ] **Step 5: Opties alleen bij een actieve feature**

In `src/rules/features.ts` wordt `for (const id of featureOptions) add(id, 'option');` vervangen door:

```ts
  for (const id of featureOptions) {
    // An option only counts while its parent feature is active (Divine Order needs a Cleric level).
    const parentId = registry.getOf('feature', id)?.optionOf;
    if (parentId !== undefined && !seen.has(parentId)) continue;
    add(id, 'option', parentId !== undefined ? registry.getOf('feature', parentId)?.name : undefined);
  }
```

`src/rules/choices.ts`:

```ts
import type { ContentRegistry } from '../content/registry';
import type { FeatureDef } from '../content/schema';
import type { Character } from '../model/character';

/** The option features of a parent feature, e.g. Protector and Thaumaturge for Divine Order. */
export function optionsFor(registry: ContentRegistry, parentId: string): FeatureDef[] {
  return registry.list('feature').filter((f) => f.optionOf === parentId);
}

/** Options outside an option group exclude each other (one per parent); Metamagic and invocations allow several. */
export function isExclusive(options: FeatureDef[]): boolean {
  return options.every((o) => o.optionGroup === undefined);
}

/** Turn an option on or off. Choosing an exclusive option replaces the other options of the same parent. */
export function toggleOption(character: Character, registry: ContentRegistry, optionId: string, on: boolean): Character {
  let ids = character.choices.featureOptions.filter((id) => id !== optionId);
  const parentId = registry.getOf('feature', optionId)?.optionOf;
  if (on && parentId !== undefined) {
    const siblings = optionsFor(registry, parentId);
    if (isExclusive(siblings)) ids = ids.filter((id) => !siblings.some((s) => s.id === id));
  }
  if (on) ids = [...ids, optionId];
  return { ...character, choices: { ...character.choices, featureOptions: ids } };
}
```

- [ ] **Step 6: Spell-statistieken per ability en unieke attack-ID's**

In `src/rules/spellcasting.ts`, onder `casterLevel`:

```ts
export type SpellStatsFn = (ability: Ability) => { attack: number; dc: number };

/** Spell attack bonus and save DC for a spellcasting ability: PB + modifier, and 8 + PB + modifier. */
export function makeSpellStats(abilities: Record<Ability, AbilityResult>, pb: number, bonus: BonusFn, d20Penalty: number): SpellStatsFn {
  return (ability) => {
    const mod = abilities[ability].mod;
    return { attack: pb + mod + bonus('spellAttack') - d20Penalty, dc: 8 + pb + mod + bonus('spellDC') };
  };
}
```

`computeSpellcasting` krijgt de parameters `(character: Character, registry: ContentRegistry, sources: CasterSource[], stats: SpellStatsFn)`, en in de `map` worden de regels met `const mod = …`, `attack: …` en `dc: …` vervangen door `...stats(source.ability),` (direct na `progression: source.progression,`).

`computeCantripAttacks` krijgt een zesde parameter `stats: SpellStatsFn`; de regels van `// A cantrip from a feat …` tot en met de `attacks.push({ … })` worden:

```ts
    // A spell from a feat (Magic Initiate) has its own ability; a class spell uses that class's caster stats and never
    // borrows another class's.
    const own = known.ability ? stats(known.ability) : spellcasting.classes.find((c) => c.classId === known.classId);
    if (!own) warnOnce(warnings, { code: 'cantrip-without-caster', detail: spell.id });
    const tier = spell.cantrip.scales ? 1 + [5, 11, 17].filter((l) => totalLevel >= l).length : 1;
    const dice = /^(\d+)d(\d+)$/.exec(spell.cantrip.damageDice);
    attacks.push({
      id: `${spell.id}@${known.classId}`,
      kind: 'cantrip',
      name: spell.name,
      toHit: spell.cantrip.attackType === 'attack' ? own?.attack : undefined,
      saveDC: spell.cantrip.attackType === 'save' ? own?.dc : undefined,
      saveAbility: spell.cantrip.saveAbility,
      damage: dice ? `${Number(dice[1]) * tier}d${dice[2]}` : spell.cantrip.damageDice,
      damageType: spell.cantrip.damageType,
      properties: [],
      proficient: true,
    });
```

In `src/rules/derive.ts`: importeer `makeSpellStats` uit `./spellcasting` en vervang de twee aanroepen:

```ts
  const stats = makeSpellStats(abilities, pb, bonus, d20Penalty);
  const spellcasting = computeSpellcasting(character, registry, sources, stats);
  const attacks = [
    ...computeWeaponAttacks(character, registry, abilities, prof, pb, bonus, d20Penalty),
    ...computeCantripAttacks(character, registry, spellcasting, totalLevel, warnings, stats),
  ];
```

- [ ] **Step 7: Tests en typecheck**

Run: `npm test && npm run typecheck && npm run convert:srd && git status --short src/content/srd/generated`
Expected: PASS, geen typefouten, en `git status` toont niets in `generated/` (de converter levert byte-voor-byte dezelfde JSON).

- [ ] **Step 8: Commit**

```bash
git add src/content src/model src/rules
git commit -m "feat: keuze-effecten voor Divine Order, Primal Order en Elven Lineage, Magic Initiate met eigen ability" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Sheet-API: class-kolommen en opbouw van bonussen

**Files:**
- Modify: `src/rules/types.ts`, `src/rules/bonuses.ts`, `src/rules/derive.ts`
- Test: `src/rules/derive.test.ts`

**Interfaces:**
- Consumes: `ActiveFeature`, `FormulaContext`, `Equipment`, `character.overrides`.
- Produces:
  - `interface SheetClassLevel extends ClassLevel { columns: Record<string, string> }`; `DerivedSheet.classLevels: SheetClassLevel[]`. Sleutels zijn de slugs uit de class-tabel (`rage-damage`, `sneak-attack`, `martial-arts`, `bardic-die`, …).
  - `interface BonusPart { target: string; source: string; value: number; override: boolean }`; `DerivedSheet.bonusParts: BonusPart[]`.
  - `src/rules/bonuses.ts`: `collectBonusParts(features, overrides, ctx, equipment): BonusPart[]`, `makeBonus(parts: BonusPart[]): BonusFn` (vervangt de oude signatuur).

- [ ] **Step 1: De falende tests schrijven**

Onderaan `src/rules/derive.test.ts`:

```ts
describe('deriveSheet: values for the screens', () => {
  it('class table values at the current level in each class', () => {
    const sheet = derive(makeCharacter({ choices: { levels: [...levels('barbarian', 5), ...levels('rogue', 3)] } }));
    expect(sheet.classLevels.map((cl) => [cl.name, cl.columns['rage-damage'] ?? cl.columns['sneak-attack']])).toEqual([
      ['Barbarian', '+2'],
      ['Rogue', '2d6'],
    ]);
  });

  it('lists every bonus with its source, overrides included, and leaves out bonuses that do not apply', () => {
    const sheet = derive(kael({ overrides: [{ id: 'o1', target: 'ac', value: 1, reason: 'Ring of Protection' }] }));
    expect(sheet.bonusParts.filter((p) => p.target === 'ac')).toEqual([
      { target: 'ac', source: 'Defense', value: 1, override: false },
      { target: 'ac', source: 'Ring of Protection', value: 1, override: true },
    ]);
    expect(sheet.ac.value).toBe(20);
    expect(derive(kael({ inventory: [] })).bonusParts.some((p) => p.source === 'Defense')).toBe(false);
  });
});
```

- [ ] **Step 2: Tests draaien en zien falen**

Run: `npm test -- src/rules/derive.test.ts`
Expected: FAIL, `cl.columns` is undefined en `sheet.bonusParts` is undefined.

- [ ] **Step 3: Types**

In `src/rules/types.ts`, onder `ClassLevel`:

```ts
/** A class with its table values at the character's level in that class, e.g. rage-damage: "+2". */
export interface SheetClassLevel extends ClassLevel {
  columns: Record<string, string>;
}

/** One contribution to a number on the sheet: an effect of a feature or feat, or an override with its reason. */
export interface BonusPart {
  target: string;
  source: string;
  value: number;
  override: boolean;
}
```

In `DerivedSheet` wordt `classLevels: ClassLevel[];` gewijzigd in `classLevels: SheetClassLevel[];`, en na `flags: string[];` komt `bonusParts: BonusPart[];`.

- [ ] **Step 4: Bonussen als losse delen**

In `src/rules/bonuses.ts` wordt alles vanaf `export type BonusFn` vervangen door:

```ts
type When = 'armored' | 'unarmored' | 'notHeavyArmor' | undefined;

function applies(when: When, equipment: Equipment): boolean {
  if (when === 'armored') return !!equipment.armor;
  if (when === 'unarmored') return !equipment.armor && !equipment.shield;
  if (when === 'notHeavyArmor') return equipment.armor?.category !== 'heavy';
  return true;
}

/** Every bonus effect of the active features that applies with this equipment, and every override, as separate parts. */
export function collectBonusParts(
  features: ActiveFeature[],
  overrides: Character['overrides'],
  ctx: FormulaContext,
  equipment: Equipment,
): BonusPart[] {
  const parts: BonusPart[] = [];
  for (const feature of features) {
    for (const effect of feature.effects) {
      if (effect.kind === 'bonus' && applies(effect.when, equipment)) {
        parts.push({ target: effect.target, source: feature.name || feature.ownerName, value: evalFormula(effect.value, ctx), override: false });
      }
    }
  }
  for (const override of overrides) parts.push({ target: override.target, source: override.reason, value: override.value, override: true });
  return parts;
}

export type BonusFn = (target: string) => number;

export function makeBonus(parts: BonusPart[]): BonusFn {
  return (target) => parts.reduce((total, part) => (part.target === target ? total + part.value : total), 0);
}
```

De imports bovenaan worden:

```ts
import type { ContentRegistry } from '../content/registry';
import type { ArmorDef } from '../content/schema';
import type { Character } from '../model/character';
import { evalFormula, type FormulaContext } from './formula';
import type { ActiveFeature, BonusPart } from './types';
```

- [ ] **Step 5: deriveSheet**

In `src/rules/derive.ts`: importeer `collectBonusParts` naast `equippedArmor` en `makeBonus`, en vervang `const bonus = makeBonus(effects, character.overrides, ctx, equipment);` door:

```ts
  const bonusParts = collectBonusParts(features, character.overrides, ctx, equipment);
  const bonus = makeBonus(bonusParts);
```

In het return-object wordt `classLevels,` vervangen door:

```ts
    classLevels: classLevels.map((cl) => ({ ...cl, columns: registry.getOf('class', cl.classId)?.levels[cl.level - 1]?.columns ?? {} })),
```

en na `flags: …,` komt `bonusParts,`.

- [ ] **Step 6: Tests en typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, geen typefouten.

- [ ] **Step 7: Commit**

```bash
git add src/rules
git commit -m "feat: class-kolommen op het huidige level en de opbouw van elke bonus" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Eigen inhoud: validatie, samenvoegen en gebruikte inhoud

**Files:**
- Create: `src/content/user.ts`, `src/content/user.test.ts`
- Modify: `src/content/registry.ts`, `src/content/registry.test.ts`
- Create: `src/storage/used-content.ts`, `src/storage/used-content.test.ts`

**Interfaces:**
- Consumes: `ContentItemSchema`, `ContentItem`, `ContentType`, `createRegistry`, `Character`.
- Produces:
  - `src/content/user.ts`: `USER_CONTENT_TYPES`, `FILLABLE_TYPES`, `interface UserContentIssue { index: number; id?: string; message: string }`, `interface UserContentResult { items: ContentItem[]; issues: UserContentIssue[] }`, `validateUserContent(raw: readonly unknown[]): UserContentResult`, `userContentId(type: ContentType, uuid?: string): string`.
  - `src/content/registry.ts`: `mergeFill(target: ContentItem, fill: ContentItem): ContentItem`; `createRegistry` gebruikt die.
  - `src/storage/used-content.ts`: `directContentIds(character): string[]`, `reachableContentIds(character, registry): Set<string>`, `usedUserContent(character, registry, userItems): ContentItem[]`. De `registry` moet de eigen inhoud al bevatten (`createRegistry(builtin, userItems)`).

- [ ] **Step 1: De falende tests schrijven**

`src/content/user.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadBuiltinContent } from './load';
import type { FeatureDef, SpellDef } from './schema';
import { userContentId, validateUserContent } from './user';

const spell: SpellDef = {
  id: 'user:spell:frost-whip', type: 'spell', source: 'user', name: 'Frost Whip', level: 0, school: 'Evocation',
  classes: ['srd:class:wizard'], castingTime: 'Action', ritual: false, range: '30 feet', components: 'V, S',
  duration: 'Instantaneous', concentration: false, text: 'A whip of frost.',
};
const fill: FeatureDef = {
  id: 'user:feature:abc', type: 'feature', source: 'user', fills: 'skeleton:feature:battle-master:3:feature',
  name: 'Combat Superiority', text: 'My notes', effects: [],
};

describe('validateUserContent', () => {
  it('accepts own items and fills of built-in features', () => {
    expect(validateUserContent([spell, fill])).toEqual({ items: [spell, fill], issues: [] });
  });

  it.each([
    ['a built-in source', { ...spell, source: 'srd' }, 'source must be "user"'],
    ['an id outside user:', { ...spell, id: 'srd:spell:fire-bolt' }, 'id must look like user:spell:<id>'],
    ['an id of another type', { ...spell, id: 'user:feat:frost-whip' }, 'id must look like user:spell:<id>'],
    ['a fill on a spell', { ...spell, fills: 'srd:spell:fire-bolt' }, 'a spell cannot fill another item'],
    ['a fill of an own item', { ...fill, fills: 'user:feature:other' }, 'fills must point at a built-in item'],
    ['an invalid shape', { ...spell, level: 12 }, 'level'],
  ])('rejects %s', (_name, item, message) => {
    const result = validateUserContent([item]);
    expect(result.items).toEqual([]);
    expect(result.issues[0].message).toContain(message);
  });

  it('rejects types that cannot be added as own content, such as a class', () => {
    const fighter = loadBuiltinContent().find((i) => i.id === 'srd:class:fighter')!;
    expect(validateUserContent([{ ...fighter, id: 'user:class:my-fighter', source: 'user' }]).issues[0].message).toBe(
      'type "class" cannot be added as own content',
    );
  });

  it('keeps the first of two items with the same id', () => {
    const result = validateUserContent([spell, { ...spell, name: 'Copy' }]);
    expect(result.items).toEqual([spell]);
    expect(result.issues).toEqual([{ index: 1, id: spell.id, message: 'duplicate id' }]);
  });

  it('makes ids that pass the gate', () => {
    expect(userContentId('magic-item', 'b1c2')).toBe('user:magic-item:b1c2');
    expect(validateUserContent([{ ...spell, id: userContentId('spell') }]).issues).toEqual([]);
  });
});
```

Voeg toe aan `src/content/registry.test.ts` (import `mergeFill` naast `createRegistry`, en `SubclassDef` naast de andere types):

```ts
describe('mergeFill', () => {
  const ekFeature: FeatureDef = {
    id: 'skeleton:feature:eldritch-knight:3:feature', type: 'feature', source: 'skeleton', name: '', text: '',
    effects: [{ kind: 'spellcasting', classId: 'srd:class:fighter', ability: 'int', progression: 'third' }],
  };
  const resource = { kind: 'resource', key: 'war-bond', name: 'War Bond', max: 1, recharge: 'long' } as const;

  it('keeps the target effects and adds those of the fill (Eldritch Knight keeps its spellcasting)', () => {
    const ekFill: FeatureDef = { id: 'user:feature:ek', type: 'feature', source: 'user', fills: ekFeature.id, name: 'Spellcasting', text: 'Notes', effects: [resource] };
    expect(createRegistry([ekFeature], [ekFill]).getOf('feature', ekFeature.id)!.effects).toEqual([...ekFeature.effects, resource]);
  });

  it('keeps name and text the fill leaves empty, and counts an effect the target already has once', () => {
    const target: FeatureDef = { ...ekFeature, name: 'Old', text: 'Old text' };
    const merged = mergeFill(target, { ...ekFeature, id: 'user:feature:x', source: 'user', name: '', text: '' });
    expect(merged).toMatchObject({ id: ekFeature.id, source: 'skeleton', name: 'Old', text: 'Old text' });
    expect((merged as FeatureDef).effects).toEqual(ekFeature.effects);
  });

  it('a subclass fill adds features after the built-in ones and never moves the subclass to another class', () => {
    const sub: SubclassDef = {
      id: 'skeleton:subclass:battle-master', type: 'subclass', source: 'skeleton', name: 'Battle Master', classId: 'srd:class:fighter',
      text: '', features: [{ level: 3, featureId: 'skeleton:feature:battle-master:3:feature' }],
    };
    const subFill: SubclassDef = {
      ...sub, id: 'user:subclass:bm', source: 'user', fills: sub.id, name: '', classId: 'srd:class:wizard',
      text: 'Masters of maneuvers.', features: [{ level: 3, featureId: 'user:feature:student-of-war' }],
    };
    const merged = mergeFill(sub, subFill) as SubclassDef;
    expect(merged.features.map((f) => f.featureId)).toEqual(['skeleton:feature:battle-master:3:feature', 'user:feature:student-of-war']);
    expect(merged).toMatchObject({ name: 'Battle Master', classId: 'srd:class:fighter', text: 'Masters of maneuvers.' });
  });
});
```

`src/storage/used-content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadBuiltinContent } from '../content/load';
import { createRegistry } from '../content/registry';
import type { ContentItem, FeatureDef, SpellDef, SubclassDef } from '../content/schema';
import { level, makeCharacter } from '../rules/testing/fixtures';
import { directContentIds, usedUserContent } from './used-content';

const fillFeature: FeatureDef = {
  id: 'user:feature:combat-superiority', type: 'feature', source: 'user', fills: 'skeleton:feature:battle-master:3:feature',
  name: 'Combat Superiority', text: '', effects: [],
};
const extraFeature: FeatureDef = { id: 'user:feature:student-of-war', type: 'feature', source: 'user', name: 'Student of War', text: '', effects: [] };
const subclassFill: SubclassDef = {
  id: 'user:subclass:battle-master', type: 'subclass', source: 'user', fills: 'skeleton:subclass:battle-master', name: '',
  classId: 'srd:class:fighter', text: '', features: [{ level: 3, featureId: extraFeature.id }],
};
const ownSpell: SpellDef = {
  id: 'user:spell:frost-whip', type: 'spell', source: 'user', name: 'Frost Whip', level: 0, school: 'Evocation',
  classes: ['srd:class:wizard'], castingTime: 'Action', ritual: false, range: '30 feet', components: 'V, S',
  duration: 'Instantaneous', concentration: false, text: 'A whip of frost.',
};
const unusedSpell: SpellDef = { ...ownSpell, id: 'user:spell:unused', name: 'Unused' };
const userItems: ContentItem[] = [fillFeature, extraFeature, subclassFill, ownSpell, unusedSpell];
const registry = createRegistry(loadBuiltinContent(), userItems);

describe('usedUserContent', () => {
  const character = makeCharacter({
    choices: {
      levels: [level('fighter'), level('fighter'), level('fighter', { subclassId: 'skeleton:subclass:battle-master' })],
      spells: [{ classId: 'srd:class:wizard', spellId: ownSpell.id, prepared: true }],
    },
  });

  it('lists the ids a character points at directly', () => {
    expect(directContentIds(character)).toEqual(expect.arrayContaining(['srd:class:fighter', 'skeleton:subclass:battle-master', ownSpell.id]));
  });

  it('finds the own items a character reaches, also through fills of its skeleton subclass', () => {
    expect(usedUserContent(character, registry, userItems).map((i) => i.id)).toEqual([fillFeature.id, extraFeature.id, subclassFill.id, ownSpell.id]);
  });

  it('finds nothing for a character with only SRD content', () => {
    expect(usedUserContent(makeCharacter({ choices: { levels: [level('wizard')] } }), registry, userItems)).toEqual([]);
  });
});
```

- [ ] **Step 2: Tests draaien en zien falen**

Run: `npm test -- src/content src/storage`
Expected: FAIL, `Failed to resolve import "./user"`, `"./used-content"` en `mergeFill` is not exported.

- [ ] **Step 3: De poort voor eigen inhoud**

`src/content/user.ts`:

```ts
import { ContentItemSchema, type ContentItem, type ContentType } from './schema';

/** Spec §6: the player adds species, backgrounds, feats, spells, items and complete subclasses (with their features). */
export const USER_CONTENT_TYPES = [
  'feature', 'subclass', 'species', 'background', 'feat', 'spell', 'weapon', 'armor', 'gear', 'magic-item',
] as const satisfies readonly ContentType[];

/** Only features and subclasses can fill a built-in item (the skeleton subclasses and their features). */
export const FILLABLE_TYPES: readonly ContentType[] = ['feature', 'subclass'];

export interface UserContentIssue {
  index: number;
  id?: string;
  message: string;
}

export interface UserContentResult {
  items: ContentItem[];
  issues: UserContentIssue[];
}

/** A new id for the player's own item: user:<type>:<uuid>. */
export function userContentId(type: ContentType, uuid: string = crypto.randomUUID()): string {
  return `user:${type}:${uuid}`;
}

const idOf = (entry: unknown): string | undefined =>
  entry !== null && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string' ? (entry as { id: string }).id : undefined;

function problemWith(item: ContentItem, seen: ReadonlySet<string>): string | undefined {
  if (item.source !== 'user') return `source must be "user", not "${item.source}"`;
  if (!(USER_CONTENT_TYPES as readonly string[]).includes(item.type)) return `type "${item.type}" cannot be added as own content`;
  if (!new RegExp(`^user:${item.type}:[a-z0-9-]+$`).test(item.id)) return `id must look like user:${item.type}:<id>`;
  if (seen.has(item.id)) return 'duplicate id';
  if (item.fills !== undefined) {
    if (!FILLABLE_TYPES.includes(item.type)) return `a ${item.type} cannot fill another item`;
    if (!/^(srd|skeleton):/.test(item.fills)) return 'fills must point at a built-in item';
  }
  return undefined;
}

/**
 * The gate for content that is not built in (stored own content, imported files): a valid schema, source "user", an
 * id "user:<type>:<id>" so it can never replace a built-in item, no duplicates, and `fills` only on features and
 * subclasses, pointing at a built-in id. Invalid entries are reported with their position, never thrown.
 */
export function validateUserContent(raw: readonly unknown[]): UserContentResult {
  const items: ContentItem[] = [];
  const issues: UserContentIssue[] = [];
  const seen = new Set<string>();
  raw.forEach((entry, index) => {
    const parsed = ContentItemSchema.safeParse(entry);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      issues.push({ index, id: idOf(entry), message: `${issue.path.map(String).join('.') || 'item'}: ${issue.message}` });
      return;
    }
    const problem = problemWith(parsed.data, seen);
    if (problem) {
      issues.push({ index, id: parsed.data.id, message: problem });
      return;
    }
    seen.add(parsed.data.id);
    items.push(parsed.data);
  });
  return { items, issues };
}
```

- [ ] **Step 4: Samenvoegen zonder iets weg te nemen**

`src/content/registry.ts` wordt:

```ts
import type { ContentItem, ContentOf, ContentType } from './schema';

export interface ContentRegistry {
  get(id: string): ContentItem | undefined;
  getOf<T extends ContentType>(type: T, id: string): ContentOf<T> | undefined;
  list<T extends ContentType>(type: T): ContentOf<T>[];
}

const appendUnique = <T>(base: readonly T[], extra: readonly T[]): T[] => {
  const known = new Set(base.map((x) => JSON.stringify(x)));
  return [...base, ...extra.filter((x) => !known.has(JSON.stringify(x)))];
};

/**
 * A fill completes a built-in item and never takes anything away: a non-empty name or text replaces the target's,
 * effects come after the target's own effects (so the Eldritch Knight keeps its spellcasting), subclass features come
 * after the target's features, and an effect or feature the target already has counts once. The target keeps its id,
 * type, source and every other field (a subclass keeps its class).
 */
export function mergeFill(target: ContentItem, fill: ContentItem): ContentItem {
  const merged: Record<string, unknown> = { ...target };
  if (fill.name !== '') merged.name = fill.name;
  if ('text' in fill && fill.text !== '') merged.text = fill.text;
  if ('effects' in fill && 'effects' in target) merged.effects = appendUnique(target.effects, fill.effects);
  if (fill.type === 'subclass' && target.type === 'subclass') merged.features = appendUnique(target.features, fill.features);
  return merged as ContentItem;
}

/**
 * Built-in items first, then user items. A user item with `fills` pointing at an item of the same type is merged into
 * that item with mergeFill. Otherwise the user item stands alone.
 */
export function createRegistry(builtin: ContentItem[], user: ContentItem[] = []): ContentRegistry {
  const items = new Map<string, ContentItem>();
  for (const item of builtin) items.set(item.id, item);
  for (const item of user) {
    const target = item.fills ? items.get(item.fills) : undefined;
    if (target && target.type === item.type) items.set(target.id, mergeFill(target, item));
    else items.set(item.id, item);
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

- [ ] **Step 5: Welke eigen inhoud een character gebruikt**

`src/storage/used-content.ts`:

```ts
import type { ContentRegistry } from '../content/registry';
import type { ContentItem } from '../content/schema';
import type { Character } from '../model/character';

/** Content ids the character points at directly through its choices and inventory. */
export function directContentIds(character: Character): string[] {
  const { choices } = character;
  return [
    ...(choices.speciesId ? [choices.speciesId] : []),
    ...(choices.backgroundId ? [choices.backgroundId] : []),
    ...choices.levels.flatMap((l) => [l.classId, ...(l.subclassId ? [l.subclassId] : []), ...(l.featId ? [l.featId] : [])]),
    ...choices.bonusFeatIds,
    ...choices.featureOptions,
    ...choices.spells.flatMap((s) => [s.spellId, s.classId]),
    ...character.inventory.flatMap((i) => (i.itemId ? [i.itemId] : [])),
  ];
}

function childIds(item: ContentItem): string[] {
  switch (item.type) {
    case 'class':
      return item.levels.flatMap((l) => l.featureIds);
    case 'subclass':
      return [item.classId, ...item.features.map((f) => f.featureId)];
    case 'species':
      return item.traitIds;
    case 'background':
      return item.featId ? [item.featId] : [];
    case 'feature':
      return item.optionOf ? [item.optionOf] : [];
    default:
      return [];
  }
}

/** Every content id reachable from the character: its choices plus the features, traits and feats those bring along. */
export function reachableContentIds(character: Character, registry: ContentRegistry): Set<string> {
  const seen = new Set<string>();
  const queue = directContentIds(character);
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const item = registry.get(id);
    if (item) queue.push(...childIds(item));
  }
  return seen;
}

/**
 * The player's own items a character needs (spec §12: a character export carries them): items it reaches, and fills
 * of items it reaches. The registry must already include the own items, so fills of a subclass add their features.
 */
export function usedUserContent(character: Character, registry: ContentRegistry, userItems: readonly ContentItem[]): ContentItem[] {
  const ids = reachableContentIds(character, registry);
  return userItems.filter((item) => ids.has(item.id) || (item.fills !== undefined && ids.has(item.fills)));
}
```

- [ ] **Step 6: Tests en typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, geen typefouten.

- [ ] **Step 7: Commit**

```bash
git add src/content src/storage
git commit -m "feat: poort voor eigen inhoud, aanvullingen die niets wegnemen en gebruikte inhoud per character" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Opslag: database, migraties, instellingen en bewaarwachtrij

**Files:**
- Create: `src/storage/db.ts`, `src/storage/migrations.ts`, `src/storage/characters.ts`, `src/storage/settings.ts`, `src/storage/user-content.ts`, `src/storage/persist.ts`, `src/storage/save-queue.ts`
- Create: `src/storage/fixtures/character-v1.json`
- Test: `src/storage/migrations.test.ts`, `src/storage/characters.test.ts`, `src/storage/settings.test.ts`, `src/storage/user-content.test.ts`, `src/storage/persist.test.ts`, `src/storage/save-queue.test.ts`

**Interfaces:**
- Consumes: `CharacterSchema`, `Character`, `createCharacter`, `validateUserContent`, `UserContentResult` (Task 6).
- Produces:
  - `db.ts`: `type StoredRow = { id: string } & Record<string, unknown>`, `interface SettingRow { key: string; value: unknown }`, `type TrackerDb`, `openDb(name = 'dnd-tracker'): TrackerDb` met tabellen `characters`, `customContent`, `settings` (databaseversie 1).
  - `migrations.ts`: `CHARACTER_SCHEMA_VERSION = 1`, `type Migration = (raw: Record<string, unknown>) => Record<string, unknown>`, `MIGRATIONS: Readonly<Record<number, Migration>>`, `class MigrationError extends Error { code: 'invalid' | 'newer-version' }`, `migrateCharacter(raw: unknown, migrations?, current?): Character`.
  - `characters.ts`: `interface BrokenCharacter { id: string; name: string; error: string }`, `interface LoadedCharacters { characters: Character[]; broken: BrokenCharacter[] }`, `loadCharacters(db)`, `loadCharacter(db, id): Promise<Character | undefined>`, `saveCharacter(db, character)`, `deleteCharacter(db, id)`.
  - `settings.ts`: `SettingsSchema`, `type Settings = { language: 'nl' | 'en' | null; theme: 'light' | 'dark' | 'auto'; persistRequested: boolean; lastExportAt: string | null }`, `DEFAULT_SETTINGS`, `loadSettings(db)`, `saveSettings(db, settings)`.
  - `user-content.ts`: `loadUserContent(db): Promise<UserContentResult>`.
  - `persist.ts`: `requestPersistence(storage: { persist?: () => Promise<boolean> } | undefined): Promise<boolean>`.
  - `save-queue.ts`: `interface SaveQueue<T> { push(value: T): void; flush(): Promise<void> }`, `createSaveQueue<T>(save, onError, delayMs = 400): SaveQueue<T>`.

- [ ] **Step 1: Het bevroren voorbeeld van schema 1 vastleggen**

`src/storage/fixtures/character-v1.json` (dit bestand verandert nooit meer; een volgende schemaversie krijgt een eigen fixture en deze moet via de migraties blijven laden):

```json
{
  "id": "9b2f4c1e-0d3a-4f7b-9c55-1a2b3c4d5e6f",
  "schemaVersion": 1,
  "createdAt": "2026-10-16T10:00:00.000Z",
  "updatedAt": "2026-10-16T12:30:00.000Z",
  "name": "Kael",
  "details": { "alignment": "Neutral Good", "backstory": "Former soldier." },
  "choices": {
    "abilityMethod": "standard",
    "baseAbilities": { "str": 15, "dex": 13, "con": 14, "int": 12, "wis": 10, "cha": 8 },
    "speciesId": "srd:species:human",
    "speciesChoices": {},
    "backgroundId": "srd:background:soldier",
    "backgroundAbilityBonuses": { "str": 2, "con": 1 },
    "backgroundChoices": {},
    "levels": [
      { "classId": "srd:class:fighter", "hp": "average", "featId": "srd:feat:defense", "featureChoices": {} },
      { "classId": "srd:class:fighter", "hp": 7, "featureChoices": {} },
      { "classId": "srd:class:fighter", "subclassId": "srd:subclass:champion", "hp": "average", "featureChoices": {} },
      { "classId": "srd:class:wizard", "hp": "average", "featureChoices": {} }
    ],
    "bonusFeatIds": [],
    "skillProficiencies": ["perception", "history"],
    "expertise": [],
    "languages": ["Common", "Dwarvish"],
    "toolProficiencies": [],
    "featureOptions": [],
    "spells": [
      { "classId": "srd:class:wizard", "spellId": "srd:spell:fire-bolt", "prepared": true },
      { "classId": "srd:class:cleric", "spellId": "srd:spell:guidance", "prepared": true, "ability": "wis" }
    ]
  },
  "state": {
    "hpCurrent": 21,
    "hpTemp": 0,
    "deathSaves": { "successes": 0, "failures": 0 },
    "hitDiceSpent": { "d10": 1 },
    "slotsUsed": { "1": 1 },
    "pactSlotsUsed": 0,
    "resourcesUsed": { "second-wind": 1 },
    "conditions": ["poisoned"],
    "exhaustion": 0,
    "heroicInspiration": true
  },
  "inventory": [
    { "id": "6f1d2c3b-0a4e-4b5f-8a6d-7e8f9a0b1c2d", "itemId": "srd:armor:chain-mail", "qty": 1, "equipped": true, "attuned": false },
    { "id": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", "itemId": "srd:weapon:longsword", "qty": 1, "equipped": true, "attuned": false, "notes": "Family heirloom" },
    { "id": "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e", "customName": "Lucky coin", "qty": 1, "equipped": false, "attuned": false }
  ],
  "currency": { "cp": 0, "sp": 12, "ep": 0, "gp": 35, "pp": 0 },
  "notes": [{ "id": "n1", "title": "Session 1", "body": "Met the innkeeper.", "updatedAt": "2026-10-16T12:00:00.000Z" }],
  "overrides": [{ "id": "o1", "target": "ac", "value": 1, "reason": "Ring of Protection" }]
}
```

- [ ] **Step 2: De falende tests schrijven**

`src/storage/migrations.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createCharacter } from '../model/character';
import v1 from './fixtures/character-v1.json';
import { CHARACTER_SCHEMA_VERSION, MigrationError, migrateCharacter } from './migrations';

describe('migrateCharacter', () => {
  it('reads the frozen schema 1 fixture unchanged', () => {
    expect(migrateCharacter(v1)).toEqual(v1);
  });

  it('runs every migration from the stored version up to the current one', () => {
    const current = createCharacter({ id: 'c1', name: 'Kael', now: '2026-10-16T10:00:00.000Z' });
    const { name, ...rest } = current;
    const v0 = { ...rest, naam: name, schemaVersion: 0 };
    const migrations = { 0: ({ naam, ...raw }: Record<string, unknown>) => ({ ...raw, name: naam }) };
    expect(migrateCharacter(v0, migrations)).toEqual(current);
  });

  it.each([
    ['not an object', 'banana', 'invalid'],
    ['no schema version', { id: 'x' }, 'invalid'],
    ['a newer schema version', { ...createCharacter(), schemaVersion: CHARACTER_SCHEMA_VERSION + 1 }, 'newer-version'],
    ['a version without migration', { ...createCharacter(), schemaVersion: 0 }, 'invalid'],
    ['an invalid character', { ...createCharacter(), state: { ...createCharacter().state, exhaustion: 9 } }, 'invalid'],
  ])('rejects %s', (_name, raw, code) => {
    let caught: unknown;
    try {
      migrateCharacter(raw);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(MigrationError);
    expect((caught as MigrationError).code).toBe(code);
  });
});
```

`src/storage/characters.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { kael } from '../rules/testing/fixtures';
import { deleteCharacter, loadCharacter, loadCharacters, saveCharacter } from './characters';
import { openDb } from './db';

const freshDb = () => openDb(`test-${crypto.randomUUID()}`);

describe('character storage', () => {
  it('saves and loads a character unchanged', async () => {
    const db = freshDb();
    await saveCharacter(db, kael());
    expect(await loadCharacter(db, 'test')).toEqual(kael());
    expect(await loadCharacter(db, 'nobody')).toBeUndefined();
  });

  it('lists the most recently changed character first', async () => {
    const db = freshDb();
    await saveCharacter(db, { ...kael(), id: 'old', updatedAt: '2026-10-01T00:00:00.000Z' });
    await saveCharacter(db, { ...kael(), id: 'new', updatedAt: '2026-10-10T00:00:00.000Z' });
    expect((await loadCharacters(db)).characters.map((c) => c.id)).toEqual(['new', 'old']);
  });

  it('never writes an invalid character', async () => {
    const db = freshDb();
    await expect(saveCharacter(db, { ...kael(), state: { ...kael().state, exhaustion: 9 } })).rejects.toThrow();
    expect(await db.characters.count()).toBe(0);
  });

  it('lists rows it cannot read as broken instead of failing', async () => {
    const db = freshDb();
    await saveCharacter(db, kael());
    await db.characters.put({ id: 'future', name: 'From the future', schemaVersion: 99 });
    await db.characters.put({ id: 'garbage', name: 42 });
    const loaded = await loadCharacters(db);
    expect(loaded.characters.map((c) => c.id)).toEqual(['test']);
    expect(loaded.broken.map((b) => [b.id, b.name])).toEqual([['future', 'From the future'], ['garbage', '']]);
  });

  it('deletes a character', async () => {
    const db = freshDb();
    await saveCharacter(db, kael());
    await deleteCharacter(db, 'test');
    expect((await loadCharacters(db)).characters).toEqual([]);
  });
});
```

`src/storage/settings.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDb } from './db';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings';

const freshDb = () => openDb(`test-${crypto.randomUUID()}`);

describe('settings', () => {
  it('starts with the defaults', async () => {
    expect(await loadSettings(freshDb())).toEqual(DEFAULT_SETTINGS);
  });

  it('saves and loads settings', async () => {
    const db = freshDb();
    const settings = { ...DEFAULT_SETTINGS, language: 'nl' as const, theme: 'dark' as const, lastExportAt: '2026-10-16T12:00:00.000Z' };
    await saveSettings(db, settings);
    expect(await loadSettings(db)).toEqual(settings);
  });

  it('replaces unknown values with defaults and drops unknown keys', async () => {
    const db = freshDb();
    await db.settings.put({ key: 'app', value: { language: 'fr', theme: 'dark', lastExportAt: 'yesterday', extra: true } });
    expect(await loadSettings(db)).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
    await db.settings.put({ key: 'app', value: 5 });
    expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
  });
});
```

`src/storage/user-content.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { SpellDef } from '../content/schema';
import { openDb } from './db';
import { loadUserContent } from './user-content';

const spell: SpellDef = {
  id: 'user:spell:frost-whip', type: 'spell', source: 'user', name: 'Frost Whip', level: 0, school: 'Evocation',
  classes: ['srd:class:wizard'], castingTime: 'Action', ritual: false, range: '30 feet', components: 'V, S',
  duration: 'Instantaneous', concentration: false, text: 'A whip of frost.',
};

describe('loadUserContent', () => {
  it('returns valid own content and reports the rest without deleting it', async () => {
    const db = openDb(`test-${crypto.randomUUID()}`);
    await db.customContent.bulkPut([spell, { ...spell, id: 'srd:spell:sneaky', source: 'srd' }]);
    const result = await loadUserContent(db);
    expect(result.items).toEqual([spell]);
    expect(result.issues.map((i) => i.id)).toEqual(['srd:spell:sneaky']);
    expect(await db.customContent.count()).toBe(2);
  });
});
```

`src/storage/persist.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { requestPersistence } from './persist';

describe('requestPersistence', () => {
  it('reports what the browser answers, and false when it cannot ask', async () => {
    expect(await requestPersistence({ persist: async () => true })).toBe(true);
    expect(await requestPersistence({ persist: async () => false })).toBe(false);
    expect(await requestPersistence(undefined)).toBe(false);
    expect(await requestPersistence({})).toBe(false);
    expect(await requestPersistence({ persist: async () => { throw new Error('denied'); } })).toBe(false);
  });
});
```

`src/storage/save-queue.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSaveQueue } from './save-queue';

describe('createSaveQueue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('saves only the latest value after a quiet period', async () => {
    const save = vi.fn(async (_value: number) => {});
    const queue = createSaveQueue(save, () => {}, 400);
    queue.push(1);
    queue.push(2);
    queue.push(3);
    await vi.advanceTimersByTimeAsync(399);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save.mock.calls).toEqual([[3]]);
  });

  it('flush saves right away, e.g. when the app goes to the background', async () => {
    const save = vi.fn(async (_value: number) => {});
    const queue = createSaveQueue(save, () => {}, 400);
    queue.push(7);
    await queue.flush();
    expect(save.mock.calls).toEqual([[7]]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('reports a failed save and tries it again on the next flush', async () => {
    const errors: unknown[] = [];
    const save = vi.fn(async (_value: number) => {}).mockRejectedValueOnce(new Error('QuotaExceededError'));
    const queue = createSaveQueue(save, (error) => errors.push(error), 400);
    queue.push(5);
    await queue.flush();
    expect(errors).toHaveLength(1);
    await queue.flush();
    expect(save.mock.calls).toEqual([[5], [5]]);
  });

  it('a newer value replaces one that failed', async () => {
    const save = vi.fn(async (_value: number) => {}).mockRejectedValueOnce(new Error('busy'));
    const queue = createSaveQueue(save, () => {}, 400);
    queue.push(5);
    await queue.flush();
    queue.push(6);
    await queue.flush();
    expect(save.mock.calls).toEqual([[5], [6]]);
  });
});
```

- [ ] **Step 3: Tests draaien en zien falen**

Run: `npm test -- src/storage`
Expected: FAIL, `Failed to resolve import "./migrations"` (en de andere nieuwe modules).

- [ ] **Step 4: Database en migraties**

`src/storage/db.ts`:

```ts
import Dexie, { type Table } from 'dexie';

/** Rows as stored: validated on the way in, migrated and validated again on the way out. */
export type StoredRow = { id: string } & Record<string, unknown>;

export interface SettingRow {
  key: string;
  value: unknown;
}

export type TrackerDb = Dexie & {
  characters: Table<StoredRow, string>;
  customContent: Table<StoredRow, string>;
  settings: Table<SettingRow, string>;
};

/** Database version 1 (spec §12): characters, the player's own content and settings. */
export function openDb(name = 'dnd-tracker'): TrackerDb {
  const db = new Dexie(name) as TrackerDb;
  db.version(1).stores({ characters: 'id', customContent: 'id', settings: 'key' });
  return db;
}
```

`src/storage/migrations.ts`:

```ts
import { CharacterSchema, type Character } from '../model/character';

export const CHARACTER_SCHEMA_VERSION = 1;

export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[n] turns a character of schema version n into version n + 1. Schema 1 is the first stored version. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

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
```

- [ ] **Step 5: Characters, instellingen, eigen inhoud, persist en wachtrij**

`src/storage/characters.ts`:

```ts
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
```

`src/storage/settings.ts`:

```ts
import { z } from 'zod';
import type { TrackerDb } from './db';

/** Every field falls back to its default on its own, so a later version can add settings without a migration. */
export const SettingsSchema = z.object({
  /** null: the language of the device (spec §11). */
  language: z.enum(['nl', 'en']).nullable().catch(null),
  theme: z.enum(['light', 'dark', 'auto']).catch('auto'),
  persistRequested: z.boolean().catch(false),
  lastExportAt: z.iso.datetime().nullable().catch(null),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = { language: null, theme: 'auto', persistRequested: false, lastExportAt: null };

const KEY = 'app';

export async function loadSettings(db: TrackerDb): Promise<Settings> {
  const row = await db.settings.get(KEY);
  const parsed = SettingsSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : { ...DEFAULT_SETTINGS };
}

export async function saveSettings(db: TrackerDb, settings: Settings): Promise<void> {
  await db.settings.put({ key: KEY, value: SettingsSchema.parse(settings) });
}
```

`src/storage/user-content.ts`:

```ts
import { validateUserContent, type UserContentResult } from '../content/user';
import type { TrackerDb } from './db';

/** The player's own content, through the same gate as imports. Invalid rows are reported and stay in the database. */
export async function loadUserContent(db: TrackerDb): Promise<UserContentResult> {
  return validateUserContent(await db.customContent.toArray());
}
```

`src/storage/persist.ts`:

```ts
/** Asks the browser to keep this site's storage (spec §12). No support or a refusal is not an error. */
export async function requestPersistence(storage: { persist?: () => Promise<boolean> } | undefined): Promise<boolean> {
  try {
    return (await storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
```

`src/storage/save-queue.ts`:

```ts
export interface SaveQueue<T> {
  /** Schedule a save of the latest value; an earlier pending value is replaced. */
  push(value: T): void;
  /** Save the pending value now (leaving the sheet, hiding the app). */
  flush(): Promise<void>;
}

/** Bundles quick successive changes into one write (spec §12). A failed write is reported and kept for the next try. */
export function createSaveQueue<T>(save: (value: T) => Promise<void>, onError: (error: unknown) => void, delayMs = 400): SaveQueue<T> {
  let pending: { value: T } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = async () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (!pending) return;
    const { value } = pending;
    pending = undefined;
    try {
      await save(value);
    } catch (error) {
      pending ??= { value };
      onError(error);
    }
  };

  return {
    push(value) {
      pending = { value };
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => void flush(), delayMs);
    },
    flush,
  };
}
```

- [ ] **Step 6: Tests en typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, geen typefouten.

- [ ] **Step 7: Commit**

```bash
git add src/storage
git commit -m "feat: opslag in IndexedDB met migraties, instellingen en gebundeld bewaren" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Export en back-upherinnering (datalaag)

**Files:**
- Create: `src/storage/export.ts`, `src/storage/export.test.ts`
- Create: `src/storage/backup.ts`, `src/storage/backup.test.ts`

**Interfaces:**
- Consumes: `migrateCharacter`, `MigrationError` (Task 7), `validateUserContent` (Task 6), `usedUserContent` (Task 6), `slugify`.
- Produces:
  - `export.ts`: `EXPORT_FORMAT = 'dnd-tracker-export'`, `ExportFileSchema`, `interface ExportFile { format; version: 1; kind: 'character' | 'backup'; exportedAt: string; characters: Character[]; customContent: ContentItem[] }`, `buildCharacterExport(character, registry, userItems, now): ExportFile`, `buildBackup(characters, userItems, now): ExportFile`, `serializeExport(file): string`, `exportFileName(file): string`, `type ImportErrorCode = 'not-json' | 'wrong-format' | 'newer-version' | 'invalid-character' | 'invalid-content'`, `class ImportError extends Error { code }`, `interface ParsedImport { kind; exportedAt; characters: Character[]; customContent: ContentItem[] }`, `parseExportFile(text): ParsedImport`.
  - `backup.ts`: `BACKUP_REMINDER_DAYS = 14`, `backupDue(lastExportAt: string | null, oldestCharacterAt: string | null, now: string): boolean`.

- [ ] **Step 1: De falende tests schrijven**

`src/storage/export.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadBuiltinContent } from '../content/load';
import { createRegistry } from '../content/registry';
import type { ContentItem, SpellDef } from '../content/schema';
import { kael } from '../rules/testing/fixtures';
import { buildBackup, buildCharacterExport, exportFileName, ImportError, parseExportFile, serializeExport } from './export';

const NOW = '2026-10-16T12:00:00.000Z';
const spell: SpellDef = {
  id: 'user:spell:frost-whip', type: 'spell', source: 'user', name: 'Frost Whip', level: 0, school: 'Evocation',
  classes: ['srd:class:wizard'], castingTime: 'Action', ritual: false, range: '30 feet', components: 'V, S',
  duration: 'Instantaneous', concentration: false, text: 'A whip of frost.',
};
const userItems: ContentItem[] = [spell, { ...spell, id: 'user:spell:unused', name: 'Unused' }];
const registry = createRegistry(loadBuiltinContent(), userItems);
const character = kael({ choices: { spells: [{ classId: 'srd:class:wizard', spellId: spell.id, prepared: true }] } });

const codeOf = (text: string): string => {
  try {
    parseExportFile(text);
    return 'ok';
  } catch (error) {
    return error instanceof ImportError ? error.code : 'other';
  }
};

describe('export', () => {
  it('export, then import, gives an identical character with the own content it uses (spec §16)', () => {
    const file = buildCharacterExport(character, registry, userItems, NOW);
    expect(parseExportFile(serializeExport(file))).toEqual({ kind: 'character', exportedAt: NOW, characters: [character], customContent: [spell] });
  });

  it('a backup holds every character and all own content', () => {
    const file = buildBackup([character, { ...character, id: 'second' }], userItems, NOW);
    const parsed = parseExportFile(serializeExport(file));
    expect(parsed.characters.map((c) => c.id)).toEqual(['test', 'second']);
    expect(parsed.customContent).toEqual(userItems);
  });

  it('names files after the character and the date', () => {
    expect(exportFileName(buildCharacterExport({ ...character, name: 'Kael Stormborn' }, registry, [], NOW))).toBe('kael-stormborn-2026-10-16.json');
    expect(exportFileName(buildCharacterExport({ ...character, name: '' }, registry, [], NOW))).toBe('character-2026-10-16.json');
    expect(exportFileName(buildBackup([], [], NOW))).toBe('dnd-tracker-backup-2026-10-16.json');
  });

  it('rejects anything that is not a valid export, as a whole', () => {
    const good = JSON.parse(serializeExport(buildCharacterExport(character, registry, userItems, NOW)));
    const first = good.characters[0];
    expect(codeOf('not json')).toBe('not-json');
    expect(codeOf(JSON.stringify({ hello: 'world' }))).toBe('wrong-format');
    expect(codeOf(JSON.stringify({ ...good, version: 2 }))).toBe('newer-version');
    expect(codeOf(JSON.stringify({ ...good, characters: [{ ...first, schemaVersion: 99 }] }))).toBe('newer-version');
    expect(codeOf(JSON.stringify({ ...good, characters: [{ ...first, state: { ...first.state, exhaustion: 9 } }] }))).toBe('invalid-character');
    expect(codeOf(JSON.stringify({ ...good, customContent: [{ ...spell, source: 'srd' }] }))).toBe('invalid-content');
  });
});
```

`src/storage/backup.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { backupDue } from './backup';

describe('backupDue', () => {
  it('reminds 14 days after the last export', () => {
    expect(backupDue('2026-10-01T12:00:00.000Z', '2026-09-01T00:00:00.000Z', '2026-10-15T11:59:00.000Z')).toBe(false);
    expect(backupDue('2026-10-01T12:00:00.000Z', '2026-09-01T00:00:00.000Z', '2026-10-15T12:00:00.000Z')).toBe(true);
  });

  it('counts from the oldest character when nothing was exported yet, and never without characters', () => {
    expect(backupDue(null, '2026-10-10T00:00:00.000Z', '2026-10-16T00:00:00.000Z')).toBe(false);
    expect(backupDue(null, '2026-09-10T00:00:00.000Z', '2026-10-16T00:00:00.000Z')).toBe(true);
    expect(backupDue(null, null, '2026-10-16T00:00:00.000Z')).toBe(false);
  });
});
```

- [ ] **Step 2: Tests draaien en zien falen**

Run: `npm test -- src/storage/export.test.ts src/storage/backup.test.ts`
Expected: FAIL, `Failed to resolve import "./export"` en `"./backup"`.

- [ ] **Step 3: Implementeren**

`src/storage/export.ts`:

```ts
import { z } from 'zod';
import { slugify } from '../content/ids';
import type { ContentRegistry } from '../content/registry';
import type { ContentItem } from '../content/schema';
import { validateUserContent } from '../content/user';
import type { Character } from '../model/character';
import { MigrationError, migrateCharacter } from './migrations';
import { usedUserContent } from './used-content';

export const EXPORT_FORMAT = 'dnd-tracker-export';

/** Export file version 1 (spec §12). Characters and content are checked one by one in parseExportFile. */
export const ExportFileSchema = z.strictObject({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(1),
  kind: z.enum(['character', 'backup']),
  exportedAt: z.iso.datetime(),
  characters: z.array(z.unknown()),
  customContent: z.array(z.unknown()),
});

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: 1;
  kind: 'character' | 'backup';
  exportedAt: string;
  characters: Character[];
  customContent: ContentItem[];
}

/** One character with the own content it uses, also through fills of its skeleton subclass. */
export function buildCharacterExport(character: Character, registry: ContentRegistry, userItems: readonly ContentItem[], now: string): ExportFile {
  return { format: EXPORT_FORMAT, version: 1, kind: 'character', exportedAt: now, characters: [character], customContent: usedUserContent(character, registry, userItems) };
}

/** Every character and all own content. */
export function buildBackup(characters: readonly Character[], userItems: readonly ContentItem[], now: string): ExportFile {
  return { format: EXPORT_FORMAT, version: 1, kind: 'backup', exportedAt: now, characters: [...characters], customContent: [...userItems] };
}

export function serializeExport(file: ExportFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** "kael-stormborn-2026-10-16.json", or "dnd-tracker-backup-2026-10-16.json" for a backup. */
export function exportFileName(file: ExportFile): string {
  const date = file.exportedAt.slice(0, 10);
  if (file.kind === 'backup') return `dnd-tracker-backup-${date}.json`;
  return `${slugify(file.characters[0]?.name ?? '') || 'character'}-${date}.json`;
}

export type ImportErrorCode = 'not-json' | 'wrong-format' | 'newer-version' | 'invalid-character' | 'invalid-content';

export class ImportError extends Error {
  readonly code: ImportErrorCode;

  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.name = 'ImportError';
    this.code = code;
  }
}

export interface ParsedImport {
  kind: 'character' | 'backup';
  exportedAt: string;
  characters: Character[];
  customContent: ContentItem[];
}

const isNewerFile = (json: unknown): boolean => {
  const file = json as { format?: unknown; version?: unknown } | null;
  return file !== null && typeof file === 'object' && file.format === EXPORT_FORMAT && typeof file.version === 'number' && file.version > 1;
};

/**
 * The gate for imported files (spec §15): JSON in this format, every character migrated and valid, all own content
 * valid. Anything wrong throws an ImportError for the whole file, so nothing is written. Plan 1C builds the import
 * screen on top of this.
 */
export function parseExportFile(text: string): ParsedImport {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ImportError('not-json', 'The file is not valid JSON.');
  }
  if (isNewerFile(json)) throw new ImportError('newer-version', 'The file was made with a newer version of the app.');
  const file = ExportFileSchema.safeParse(json);
  if (!file.success) throw new ImportError('wrong-format', 'The file is not an export of this app.');
  const characters = file.data.characters.map((raw, index) => {
    try {
      return migrateCharacter(raw);
    } catch (error) {
      if (error instanceof MigrationError && error.code === 'newer-version') throw new ImportError('newer-version', error.message);
      throw new ImportError('invalid-character', `Character ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  const content = validateUserContent(file.data.customContent);
  if (content.issues.length > 0) {
    throw new ImportError('invalid-content', content.issues.map((i) => `${i.id ?? `#${i.index + 1}`}: ${i.message}`).join('; '));
  }
  return { kind: file.data.kind, exportedAt: file.data.exportedAt, characters, customContent: content.items };
}
```

`src/storage/backup.ts`:

```ts
export const BACKUP_REMINDER_DAYS = 14;

/**
 * Spec §12: a reminder after 14 days without an export. Before the first export the days count from the oldest
 * character, so a new player is not reminded on day one; without characters there is nothing to lose.
 */
export function backupDue(lastExportAt: string | null, oldestCharacterAt: string | null, now: string): boolean {
  if (oldestCharacterAt === null) return false;
  const since = Date.parse(lastExportAt ?? oldestCharacterAt);
  return Date.parse(now) - since >= BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
}
```

- [ ] **Step 4: Tests en typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, geen typefouten.

- [ ] **Step 5: Commit**

```bash
git add src/storage
git commit -m "feat: exportbestand met controle bij inlezen en back-upherinnering" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 9: App-shell: i18n, thema, router, meldingen en foutafhandeling

**Files:**
- Create: `src/i18n/en.json`, `src/i18n/nl.json`, `src/i18n/i18n.tsx`, `src/i18n/i18n.test.ts`
- Create: `src/ui/format.ts`, `src/ui/format.test.ts`
- Create: `src/ui/theme.ts`, `src/ui/theme.test.ts`
- Create: `src/ui/router.ts`, `src/ui/router.test.ts`
- Create: `src/ui/hooks.ts`
- Create: `src/ui/warnings.ts`, `src/ui/warnings.test.ts`
- Create: `src/ui/deliver.ts`, `src/ui/deliver.test.ts`
- Create: `src/ui/data.tsx`, `src/ui/use-export.ts`
- Create: `src/ui/components/Toast.tsx`, `src/ui/components/Dialog.tsx`, `src/ui/components/ErrorBoundary.tsx`, `src/ui/components/WarningList.tsx`
- Create: `src/ui/styles.css`, `src/ui/App.tsx`, `src/ui/App.test.tsx`, `src/ui/testing/render.tsx`
- Modify: `src/main.tsx`, `index.html`
- Delete: `src/App.tsx`

**Interfaces:**
- Consumes: opslag (Task 7), export (Task 8), `loadBuiltinContent`, `createRegistry`, `WARNING_CODES` (Task 3).
- Produces:
  - `src/i18n/i18n.tsx`: `type Lang = 'nl' | 'en'`, `type MessageKey = keyof typeof en`, `type Translate = (key: MessageKey, params?: Record<string, string | number>) => string`, `detectLanguage(languages: readonly string[]): Lang`, `translate(lang, key, params?)`, `I18nProvider({ lang, children })`, `useI18n(): { lang: Lang; t: Translate }`. Sleutels zijn plat (`"list.title"`); latere tasks voegen sleutels toe aan **beide** JSON-bestanden.
  - `src/ui/format.ts`: `formatMod(n)` (`+3`, `-1`), `abilityName(a)` (`Strength`), `titleCase(slug)` (`Sleight of Hand`), `classSummary(sheet)` (`Fighter 3 (Champion) / Wizard 2`), `plainParagraphs(text): string[]`.
  - `src/ui/theme.ts`: `applyTheme(theme, root?)`. `src/ui/router.ts`: `type Route`, `parseHash(hash)`, `hrefFor(route)`, `navigate(route)`, `useRoute()`. `src/ui/hooks.ts`: `useMediaQuery(query): boolean`.
  - `src/ui/warnings.ts`: `warningText(warning, t, registry): string`. `src/ui/components/WarningList.tsx`: `WarningList({ warnings })`.
  - `src/ui/deliver.ts`: `interface DeliverEnv`, `deliverFile(name, text, env?): Promise<boolean>` (deelmenu op een touch-apparaat, anders download; `false` als de gebruiker het deelmenu sluit).
  - `src/ui/data.tsx`: `interface AppData { db; registry; userItems; userContentIssues; settings; updateSettings(patch): Promise<void> }`, `AppDataProvider({ db, children })`, `useAppData()`.
  - `src/ui/use-export.ts`: `useExport(): { exportCharacter(character): Promise<void>; exportBackup(): Promise<void> }` (zet na een gelukte export `lastExportAt`).
  - `src/ui/components/Toast.tsx`: `interface ToastInput { message: string; action?: { label: string; run: () => void }; error?: boolean }`, `ToastProvider`, `useToast(): (toast: ToastInput) => void`.
  - `src/ui/components/Dialog.tsx`: `Dialog({ title, onClose, actions?, children })`.
  - `src/ui/components/ErrorBoundary.tsx`: `ErrorBoundary` en `Section({ children })` (spec §15: melding plus knop *Alle data exporteren*).
  - `src/ui/App.tsx`: `Providers({ db, children })`, `App({ db })`, en binnen `App` de functie `Screens()` die latere tasks uitbreiden.
  - `src/ui/testing/render.tsx`: `testDb()`, `renderWithProviders(ui, db?)`, `renderApp(hash, db?)`, `setMatchMedia(matches: (query: string) => boolean)`.

- [ ] **Step 1: De falende tests schrijven**

`src/i18n/i18n.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import en from './en.json';
import { detectLanguage, translate } from './i18n';
import nl from './nl.json';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n', () => {
  it('Dutch and English have the same keys and the same placeholders', () => {
    expect(Object.keys(nl).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) expect(placeholders(nl[key]), key).toEqual(placeholders(en[key]));
  });

  it('uses Dutch only when the device prefers Dutch', () => {
    expect(detectLanguage(['nl-NL', 'en'])).toBe('nl');
    expect(detectLanguage(['nl'])).toBe('nl');
    expect(detectLanguage(['en-US', 'nl-NL'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });

  it('fills in placeholders and leaves unknown ones visible', () => {
    expect(translate('en', 'export.failed', { reason: 'disk full' })).toBe('Export failed: disk full');
    expect(translate('nl', 'export.failed')).toBe('Exporteren mislukt: {reason}');
  });
});
```

`src/ui/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { deriveSheet } from '../rules/derive';
import { kael, registry } from '../rules/testing/fixtures';
import { abilityName, classSummary, formatMod, plainParagraphs, titleCase } from './format';

describe('format', () => {
  it('modifiers, ability names and skill names', () => {
    expect([formatMod(3), formatMod(0), formatMod(-1)]).toEqual(['+3', '+0', '-1']);
    expect(abilityName('wis')).toBe('Wisdom');
    expect([titleCase('sleight-of-hand'), titleCase('animal-handling'), titleCase('grappled')]).toEqual(['Sleight of Hand', 'Animal Handling', 'Grappled']);
  });

  it('summarises classes with subclasses', () => {
    expect(classSummary(deriveSheet(kael(), registry))).toBe('Fighter 3 (Champion) / Wizard 2');
  });

  it('turns SRD text with tables and emphasis into plain paragraphs', () => {
    const text = 'Choose one.\n\n_Protector._ Trained for **battle**.\n\n<table>\n  <tbody>\n    <tr>\n      <td>Drow</td>\n      <td>Darkvision</td>\n    </tr>\n    <tr>\n      <td>Wood Elf</td>\n      <td>Speed 35</td>\n    </tr>\n  </tbody>\n</table>';
    expect(plainParagraphs(text)).toEqual(['Choose one.', 'Protector. Trained for battle.', 'Drow · Darkvision\nWood Elf · Speed 35']);
  });
});
```

`src/ui/theme.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyTheme } from './theme';

describe('applyTheme', () => {
  it('forces light or dark, and follows the device on auto', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    applyTheme('auto');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
```

`src/ui/router.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { hrefFor, parseHash, type Route } from './router';

describe('router', () => {
  it.each<Route>([
    { name: 'list' },
    { name: 'new' },
    { name: 'settings' },
    { name: 'credits' },
    { name: 'sheet', id: '9b2f4c1e-0d3a' },
    { name: 'edit', id: '9b2f4c1e-0d3a' },
  ])('round-trips %o', (route) => {
    expect(parseHash(hrefFor(route))).toEqual(route);
  });

  it('sends unknown or empty hashes to the list', () => {
    expect(parseHash('')).toEqual({ name: 'list' });
    expect(parseHash('#/nowhere')).toEqual({ name: 'list' });
    expect(parseHash('#/c/')).toEqual({ name: 'list' });
  });
});
```

`src/ui/warnings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { translate, type Lang } from '../i18n/i18n';
import { registry } from '../rules/testing/fixtures';
import { WARNING_CODES } from '../rules/types';
import { warningText } from './warnings';

describe('warningText', () => {
  it.each<Lang>(['en', 'nl'])('has a message with the name for every warning code (%s)', (lang) => {
    const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate(lang, key, params);
    for (const code of WARNING_CODES) {
      const text = warningText({ code, detail: 'srd:class:fighter' }, t, registry);
      expect(text, code).toContain('Fighter');
      expect(text, code).not.toContain('{');
    }
  });

  it('shows an unknown id as it is, and an ability by its name', () => {
    const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate('nl', key, params);
    expect(warningText({ code: 'unknown-content', detail: 'user:feat:gone' }, t, registry)).toBe('Onbekend: user:feat:gone');
    expect(warningText({ code: 'ability-over-max', detail: 'str' }, t, registry)).toContain('Strength');
  });
});
```

`src/ui/deliver.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deliverFile, type DeliverEnv } from './deliver';

const env = (patch: Partial<DeliverEnv>): DeliverEnv => ({ preferShare: false, document, ...patch });

describe('deliverFile', () => {
  afterEach(() => vi.restoreAllMocks());

  it('downloads the file on a PC', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('kael.json');
    });
    expect(await deliverFile('kael.json', '{}', env({}))).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it('opens the share sheet on a touch device that can share files', async () => {
    const share = vi.fn(async () => {});
    expect(await deliverFile('kael.json', '{}', env({ preferShare: true, canShare: () => true, share }))).toBe(true);
    expect(share).toHaveBeenCalledOnce();
  });

  it('reports a closed share sheet as not delivered', async () => {
    const share = vi.fn(async () => {
      throw new DOMException('cancelled', 'AbortError');
    });
    expect(await deliverFile('kael.json', '{}', env({ preferShare: true, canShare: () => true, share }))).toBe(false);
  });
});
```

`src/ui/App.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Section } from './components/ErrorBoundary';
import { renderApp, renderWithProviders } from './testing/render';

describe('app shell', () => {
  it('loads the data and shows the app', async () => {
    renderApp('#/');
    expect(await screen.findByRole('heading', { name: 'D&D Character Tracker' })).toBeTruthy();
  });

  it('an error in one part shows a message with an export button; the rest keeps working', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Boom = () => {
      throw new Error('boom');
    };
    renderWithProviders(
      <>
        <Section>
          <Boom />
        </Section>
        <p>Still here</p>
      </>,
    );
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export all data' })).toBeTruthy();
    expect(screen.getByText('Still here')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Tests draaien en zien falen**

Run: `npm test -- src/i18n src/ui`
Expected: FAIL, `Failed to resolve import` voor de nieuwe modules.

- [ ] **Step 3: Vertalingen en i18n**

`src/i18n/en.json`:

```json
{
  "app.title": "D&D Character Tracker",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.delete": "Delete",
  "common.none": "None",
  "common.unnamed": "Unnamed",
  "nav.back": "Back",
  "nav.settings": "Settings",
  "error.section": "Something went wrong in this part. The rest of the app keeps working.",
  "error.export": "Export all data",
  "export.done": "Export ready.",
  "export.failed": "Export failed: {reason}",
  "save.failed": "Saving failed: {reason}. Export your data to be safe.",
  "warning.unknown-content": "Unknown: {name}",
  "warning.multiclass-prerequisite": "Multiclass prerequisite not met for {name}: 13 in its primary ability.",
  "warning.ability-over-max": "{name} is above its maximum; the maximum counts.",
  "warning.cantrip-without-caster": "{name} belongs to no class with Spellcasting: no attack bonus or save DC.",
  "warning.armor-untrained": "No training with {name}: Disadvantage on Strength and Dexterity D20 Tests, and no spellcasting."
}
```

`src/i18n/nl.json`:

```json
{
  "app.title": "D&D Character Tracker",
  "common.save": "Opslaan",
  "common.cancel": "Annuleren",
  "common.close": "Sluiten",
  "common.delete": "Verwijderen",
  "common.none": "Geen",
  "common.unnamed": "Naamloos",
  "nav.back": "Terug",
  "nav.settings": "Instellingen",
  "error.section": "Er ging iets mis in dit onderdeel. De rest van de app blijft werken.",
  "error.export": "Alle data exporteren",
  "export.done": "Export klaar.",
  "export.failed": "Exporteren mislukt: {reason}",
  "save.failed": "Opslaan mislukt: {reason}. Exporteer je data voor de zekerheid.",
  "warning.unknown-content": "Onbekend: {name}",
  "warning.multiclass-prerequisite": "Multiclass-vereiste niet gehaald voor {name}: 13 in de primary ability.",
  "warning.ability-over-max": "{name} komt boven het maximum uit; het maximum telt.",
  "warning.cantrip-without-caster": "{name} hoort bij geen class met Spellcasting: geen attack bonus of save DC.",
  "warning.armor-untrained": "Geen training voor {name}: Disadvantage op D20 Tests met Strength en Dexterity, en geen spellcasting."
}
```

`src/i18n/i18n.tsx`:

```tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import en from './en.json';
import nl from './nl.json';

export type Lang = 'nl' | 'en';
export type MessageKey = keyof typeof en;
export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

/** Typed as complete: a key missing from nl.json is a compile error. */
const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, nl };

/** Spec §11: the device language decides, Dutch only when the device prefers Dutch. */
export function detectLanguage(languages: readonly string[]): Lang {
  return languages[0]?.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

export function translate(lang: Lang, key: MessageKey, params: Record<string, string | number> = {}): string {
  return MESSAGES[lang][key].replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

const I18nContext = createContext<{ lang: Lang; t: Translate }>({ lang: 'en', t: (key, params) => translate('en', key, params) });

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => ({ lang, t: ((key, params) => translate(lang, key, params)) as Translate }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): { lang: Lang; t: Translate } {
  return useContext(I18nContext);
}
```

- [ ] **Step 4: Opmaak, thema, router en hooks**

`src/ui/format.ts`:

```ts
import { ABILITY_BY_NAME, type Ability } from '../content/constants';
import type { DerivedSheet } from '../rules/types';

/** +3 / +0 / -1, as on a character sheet. */
export function formatMod(value: number): string {
  return value >= 0 ? `+${value}` : `-${Math.abs(value)}`;
}

const ABILITY_NAMES = Object.fromEntries(Object.entries(ABILITY_BY_NAME).map(([name, ability]) => [ability, name])) as Record<Ability, string>;

export function abilityName(ability: Ability): string {
  return ABILITY_NAMES[ability];
}

/** "sleight-of-hand" -> "Sleight of Hand". Skill, condition and column names are English game terms. */
export function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((word, i) => (i > 0 && word === 'of' ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

/** "Fighter 3 (Champion) / Wizard 2" */
export function classSummary(sheet: DerivedSheet): string {
  return sheet.classLevels.map((cl) => `${cl.name} ${cl.level}${cl.subclassName ? ` (${cl.subclassName})` : ''}`).join(' / ');
}

/**
 * SRD text as plain paragraphs: table rows become lines with " · " between the cells, HTML tags and Markdown emphasis
 * markers are dropped. Nothing is rendered as HTML, so text from own content can never inject markup.
 */
export function plainParagraphs(text: string): string[] {
  const plain = text
    .replace(/<\/t[hd]>\s*<t[hd][^>]*>/g, ' · ')
    .replace(/\s*<\/tr>\s*(?:<\/?t(?:head|body)[^>]*>\s*)*<tr[^>]*>\s*/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[\s(])_([^_\n]+)_/g, '$1$2');
  return plain
    .split(/\n\s*\n/)
    .map((p) => p.split('\n').map((line) => line.trim()).filter(Boolean).join('\n'))
    .filter(Boolean);
}
```

`src/ui/theme.ts`:

```ts
export type ThemeSetting = 'light' | 'dark' | 'auto';

/** 'auto' follows the device through prefers-color-scheme; light and dark are forced with data-theme on <html>. */
export function applyTheme(theme: ThemeSetting, root: HTMLElement = document.documentElement): void {
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
```

`src/ui/router.ts`:

```ts
import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'settings' }
  | { name: 'credits' }
  | { name: 'sheet'; id: string }
  | { name: 'edit'; id: string };

/** Hash routes work on GitHub Pages without a 404 page: #/, #/new, #/settings, #/credits, #/c/<id>, #/c/<id>/edit. */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'new') return { name: 'new' };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'credits') return { name: 'credits' };
  if (parts[0] === 'c' && parts[1]) return parts[2] === 'edit' ? { name: 'edit', id: parts[1] } : { name: 'sheet', id: parts[1] };
  return { name: 'list' };
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'list':
      return '#/';
    case 'new':
      return '#/new';
    case 'settings':
      return '#/settings';
    case 'credits':
      return '#/credits';
    case 'sheet':
      return `#/c/${encodeURIComponent(route.id)}`;
    case 'edit':
      return `#/c/${encodeURIComponent(route.id)}/edit`;
  }
}

export function navigate(route: Route): void {
  window.location.hash = hrefFor(route);
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

export function useRoute(): Route {
  return parseHash(useSyncExternalStore(subscribe, () => window.location.hash));
}
```

`src/ui/hooks.ts`:

```ts
import { useCallback, useSyncExternalStore } from 'react';

/** True while the media query matches, e.g. '(max-width: 900px)' for iPad portrait. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
```

- [ ] **Step 5: Meldingen, bestanden afleveren en app-data**

`src/ui/warnings.ts`:

```ts
import { ABILITIES, type Ability } from '../content/constants';
import type { ContentRegistry } from '../content/registry';
import type { MessageKey, Translate } from '../i18n/i18n';
import type { Warning, WarningCode } from '../rules/types';
import { abilityName } from './format';

/** One message per warning code; a new code without a message is a compile error. */
const WARNING_KEYS: Record<WarningCode, MessageKey> = {
  'unknown-content': 'warning.unknown-content',
  'multiclass-prerequisite': 'warning.multiclass-prerequisite',
  'ability-over-max': 'warning.ability-over-max',
  'cantrip-without-caster': 'warning.cantrip-without-caster',
  'armor-untrained': 'warning.armor-untrained',
};

/** Spec §15: unknown content shows as "Unknown: <id>"; other details show the content name or ability name. */
export function warningText(warning: Warning, t: Translate, registry: ContentRegistry): string {
  const { detail } = warning;
  const name = (ABILITIES as readonly string[]).includes(detail) ? abilityName(detail as Ability) : registry.get(detail)?.name || detail;
  return t(WARNING_KEYS[warning.code], { name });
}
```

`src/ui/deliver.ts`:

```ts
export interface DeliverEnv {
  /** Touch devices (the iPad) get the share sheet; a PC gets a download (spec §12). */
  preferShare: boolean;
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
  document: Document;
}

const browserEnv = (): DeliverEnv => ({
  preferShare: window.matchMedia('(pointer: coarse)').matches,
  canShare: navigator.canShare?.bind(navigator),
  share: navigator.share?.bind(navigator),
  document,
});

/** Hands a JSON file to the player. Returns false when the share sheet was closed without sharing. */
export async function deliverFile(name: string, text: string, env: DeliverEnv = browserEnv()): Promise<boolean> {
  const file = new File([text], name, { type: 'application/json' });
  if (env.preferShare && env.share && env.canShare?.({ files: [file] })) {
    try {
      await env.share({ files: [file], title: name });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
      throw error;
    }
  }
  const url = URL.createObjectURL(file);
  const link = env.document.createElement('a');
  link.href = url;
  link.download = name;
  env.document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
```

`src/ui/data.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadBuiltinContent } from '../content/load';
import { createRegistry, type ContentRegistry } from '../content/registry';
import type { ContentItem } from '../content/schema';
import type { UserContentIssue, UserContentResult } from '../content/user';
import type { TrackerDb } from '../storage/db';
import { requestPersistence } from '../storage/persist';
import { loadSettings, saveSettings, type Settings } from '../storage/settings';
import { loadUserContent } from '../storage/user-content';

export interface AppData {
  db: TrackerDb;
  registry: ContentRegistry;
  userItems: ContentItem[];
  userContentIssues: UserContentIssue[];
  settings: Settings;
  updateSettings(patch: Partial<Settings>): Promise<void>;
}

const AppDataContext = createContext<AppData | null>(null);

/** Loads settings and own content once, builds the registry and asks for persistent storage on the first start. */
export function AppDataProvider({ db, children }: { db: TrackerDb; children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>();
  const [content, setContent] = useState<UserContentResult>();
  const latest = useRef<Settings>(undefined);

  useEffect(() => {
    let alive = true;
    void Promise.all([loadSettings(db), loadUserContent(db)]).then(([loadedSettings, loadedContent]) => {
      if (!alive) return;
      latest.current = loadedSettings;
      setSettings(loadedSettings);
      setContent(loadedContent);
    });
    return () => {
      alive = false;
    };
  }, [db]);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      if (!latest.current) return;
      const next = { ...latest.current, ...patch };
      latest.current = next;
      setSettings(next);
      await saveSettings(db, next);
    },
    [db],
  );

  useEffect(() => {
    if (settings && !settings.persistRequested) {
      void requestPersistence(navigator.storage).then(() => updateSettings({ persistRequested: true }));
    }
  }, [settings, updateSettings]);

  const registry = useMemo(() => createRegistry(loadBuiltinContent(), content?.items ?? []), [content]);
  const value = useMemo(
    () =>
      settings && content
        ? { db, registry, userItems: content.items, userContentIssues: content.issues, settings, updateSettings }
        : null,
    [db, registry, content, settings, updateSettings],
  );
  if (!value) return <p className="loading" role="status">…</p>;
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const data = useContext(AppDataContext);
  if (!data) throw new Error('useAppData outside AppDataProvider');
  return data;
}
```

`src/ui/use-export.ts`:

```ts
import { useI18n } from '../i18n/i18n';
import type { Character } from '../model/character';
import { loadCharacters } from '../storage/characters';
import { buildBackup, buildCharacterExport, exportFileName, serializeExport, type ExportFile } from '../storage/export';
import { useToast } from './components/Toast';
import { useAppData } from './data';
import { deliverFile } from './deliver';

/** Export one character or a full backup; a delivered export also resets the backup reminder (spec §12). */
export function useExport() {
  const { db, registry, userItems, updateSettings } = useAppData();
  const toast = useToast();
  const { t } = useI18n();

  const finish = async (file: ExportFile) => {
    try {
      if (await deliverFile(exportFileName(file), serializeExport(file))) {
        await updateSettings({ lastExportAt: file.exportedAt });
        toast({ message: t('export.done') });
      }
    } catch (error) {
      toast({ message: t('export.failed', { reason: error instanceof Error ? error.message : String(error) }), error: true });
    }
  };

  return {
    exportCharacter: (character: Character) => finish(buildCharacterExport(character, registry, userItems, new Date().toISOString())),
    exportBackup: async () => {
      const { characters } = await loadCharacters(db);
      await finish(buildBackup(characters, userItems, new Date().toISOString()));
    },
  };
}
```

- [ ] **Step 6: Componenten voor meldingen, dialogen en fouten**

`src/ui/components/Toast.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n/i18n';

export interface ToastInput {
  message: string;
  action?: { label: string; run: () => void };
  /** Errors stay until closed; other toasts close after 6 seconds. */
  error?: boolean;
}

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [toast, setToast] = useState<(ToastInput & { key: number }) | null>(null);
  const counter = useRef(0);
  const show = useCallback((input: ToastInput) => {
    counter.current += 1;
    setToast({ ...input, key: counter.current });
  }, []);

  useEffect(() => {
    if (!toast || toast.error) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div key={toast.key} className={toast.error ? 'toast toast-error' : 'toast'}>
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button type="button" aria-label={t('common.close')} onClick={() => setToast(null)}>
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (toast: ToastInput) => void {
  return useContext(ToastContext);
}
```

`src/ui/components/Dialog.tsx`:

```tsx
import { useEffect, type ReactNode } from 'react';
import { useI18n } from '../../i18n/i18n';

/** A modal dialog; Escape, the backdrop and Cancel close it. `actions` are the confirming buttons. */
export function Dialog({ title, onClose, actions, children }: { title: string; onClose: () => void; actions?: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        {children}
        <div className="dialog-actions">
          {actions}
          <button type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

`src/ui/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode } from 'react';
import { useI18n } from '../../i18n/i18n';
import { useExport } from '../use-export';

interface Props {
  message: string;
  exportLabel: string;
  onExport: () => void;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="error-box">
        <p>{this.props.message}</p>
        <button type="button" onClick={this.props.onExport}>
          {this.props.exportLabel}
        </button>
      </div>
    );
  }
}

/** Spec §15: an error in one part shows a message and a button to export all data; the rest keeps working. */
export function Section({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { exportBackup } = useExport();
  return (
    <ErrorBoundary message={t('error.section')} exportLabel={t('error.export')} onExport={() => void exportBackup()}>
      {children}
    </ErrorBoundary>
  );
}
```

`src/ui/components/WarningList.tsx`:

```tsx
import { useI18n } from '../../i18n/i18n';
import type { Warning } from '../../rules/types';
import { useAppData } from '../data';
import { warningText } from '../warnings';

export function WarningList({ warnings }: { warnings: Warning[] }) {
  const { registry } = useAppData();
  const { t } = useI18n();
  if (warnings.length === 0) return null;
  return (
    <ul className="warnings">
      {warnings.map((w) => (
        <li key={`${w.code}:${w.detail}`}>{warningText(w, t, registry)}</li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 7: Stijl, app en testhulp**

`src/ui/styles.css`:

```css
:root {
  --bg: #f7f4ee;
  --surface: #ffffff;
  --surface-2: #efeae0;
  --text: #1f1c17;
  --muted: #6a6358;
  --border: #d6cfc1;
  --accent: #8b1e1e;
  --accent-text: #ffffff;
  --danger: #b3261e;
  --ok: #2e6b30;
  --warning: #8a5a00;
  --focus: #1f5fbf;
  --radius: 10px;
  --tap: 44px;
  color-scheme: light;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.4;
}

:root[data-theme='dark'] {
  --bg: #16140f;
  --surface: #221f19;
  --surface-2: #2c2820;
  --text: #f1ece2;
  --muted: #a89f90;
  --border: #4a443a;
  --accent: #d0574e;
  --accent-text: #16140f;
  --danger: #f08a80;
  --ok: #8fcf8f;
  --warning: #f0c060;
  --focus: #8ab4ff;
  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --bg: #16140f;
    --surface: #221f19;
    --surface-2: #2c2820;
    --text: #f1ece2;
    --muted: #a89f90;
    --border: #4a443a;
    --accent: #d0574e;
    --accent-text: #16140f;
    --danger: #f08a80;
    --ok: #8fcf8f;
    --warning: #f0c060;
    --focus: #8ab4ff;
    color-scheme: dark;
  }
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); -webkit-tap-highlight-color: transparent; }
h1, h2 { margin: 0 0 0.5rem; }
h1 { font-size: 1.4rem; }
h2 { font-size: 1.1rem; }

button, .button, input, select, textarea { font: inherit; font-size: 16px; color: inherit; }
button, .button {
  min-height: var(--tap); min-width: var(--tap); padding: 0 0.8rem;
  border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface);
  display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem;
  text-decoration: none; cursor: pointer;
}
button:disabled { opacity: 0.45; cursor: default; }
button.primary, .button.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
button.danger { color: var(--danger); }
button[aria-pressed='true'], button[aria-selected='true'] { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
input, select, textarea { min-height: var(--tap); padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); max-width: 100%; }
input[type='checkbox'], input[type='radio'] { min-height: auto; width: 1.4rem; height: 1.4rem; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }

.screen { max-width: 1100px; margin: 0 auto; padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom)); }
.screen-header { display: flex; align-items: center; gap: 0.75rem; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; }
.row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.field { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.75rem; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem; }
.muted { color: var(--muted); }
.warning { color: var(--warning); }
.warnings { list-style: none; padding: 0.5rem 0.75rem; margin: 0.5rem 0; border-left: 4px solid var(--warning); background: var(--surface-2); border-radius: var(--radius); }
.notice { padding: 0.75rem; border-radius: var(--radius); background: var(--surface-2); margin-bottom: 1rem; }
.loading { padding: 2rem; text-align: center; }

.dialog-backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 45%); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 20; }
.dialog { background: var(--surface); border-radius: var(--radius); padding: 1rem; width: min(480px, 100%); max-height: 90vh; overflow: auto; }
.dialog-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; flex-wrap: wrap; }

.toast-region { position: fixed; left: 0; right: 0; bottom: calc(1rem + env(safe-area-inset-bottom)); display: flex; justify-content: center; pointer-events: none; z-index: 30; }
.toast { pointer-events: auto; display: flex; gap: 0.5rem; align-items: center; background: var(--text); color: var(--bg); padding: 0.25rem 0.25rem 0.25rem 1rem; border-radius: var(--radius); box-shadow: 0 4px 16px rgb(0 0 0 / 25%); }
.toast button { background: transparent; color: inherit; border-color: transparent; }
.toast-error { background: var(--danger); color: #fff; }
.error-box { border: 2px solid var(--danger); border-radius: var(--radius); padding: 1rem; background: var(--surface); }
```

`src/ui/App.tsx`:

```tsx
import { useEffect, type ReactNode } from 'react';
import { detectLanguage, I18nProvider, useI18n } from '../i18n/i18n';
import type { TrackerDb } from '../storage/db';
import { Section } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { AppDataProvider, useAppData } from './data';
import { hrefFor, useRoute } from './router';
import { applyTheme } from './theme';
import './styles.css';

function ShellProviders({ children }: { children: ReactNode }) {
  const { settings } = useAppData();
  const lang = settings.language ?? detectLanguage(navigator.languages);
  useEffect(() => applyTheme(settings.theme), [settings.theme]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <I18nProvider lang={lang}>
      <ToastProvider>{children}</ToastProvider>
    </I18nProvider>
  );
}

export function Providers({ db, children }: { db: TrackerDb; children: ReactNode }) {
  return (
    <AppDataProvider db={db}>
      <ShellProviders>{children}</ShellProviders>
    </AppDataProvider>
  );
}

function Screens() {
  const route = useRoute();
  const { t } = useI18n();
  return (
    <Section key={hrefFor(route)}>
      <main className="screen">
        <h1>{t('app.title')}</h1>
      </main>
    </Section>
  );
}

export function App({ db }: { db: TrackerDb }) {
  return (
    <Providers db={db}>
      <Screens />
    </Providers>
  );
}
```

`src/main.tsx` wordt:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { openDb } from './storage/db';
import { App } from './ui/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App db={openDb()} />
  </StrictMode>,
);
```

Verwijder `src/App.tsx`: `git rm src/App.tsx`.

In `index.html` wordt de viewport-regel:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

`src/ui/testing/render.tsx`:

```tsx
import 'fake-indexeddb/auto';
import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach } from 'vitest';
import { openDb, type TrackerDb } from '../../storage/db';
import { App, Providers } from '../App';

/** jsdom has no matchMedia; tests set the answer per query (default: nothing matches). */
export function setMatchMedia(matches: (query: string) => boolean): void {
  window.matchMedia = (query: string) =>
    ({
      matches: matches(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

setMatchMedia(() => false);

afterEach(() => {
  cleanup();
  window.location.hash = '';
  document.documentElement.removeAttribute('data-theme');
  setMatchMedia(() => false);
});

export const testDb = (): TrackerDb => openDb(`test-${crypto.randomUUID()}`);

export function renderWithProviders(ui: ReactElement, db: TrackerDb = testDb()) {
  return { db, ...render(<Providers db={db}>{ui}</Providers>) };
}

export function renderApp(hash: string, db: TrackerDb = testDb()) {
  window.location.hash = hash;
  return { db, ...render(<App db={db} />) };
}
```

- [ ] **Step 8: Tests, typecheck en build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS, geen typefouten, build schrijft `dist/`. Een snelle blik: `npm run dev`, open de getoonde URL; de pagina toont "D&D Character Tracker" en volgt het licht/donker van het apparaat.

- [ ] **Step 9: Commit**

```bash
git add -A src index.html
git commit -m "feat: app-shell met NL/EN, thema, navigatie, meldingen en foutafhandeling per onderdeel" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 10: Characterlijst, instellingen en credits

**Files:**
- Create: `src/ui/list/CharacterList.tsx`, `src/ui/list/list.css`, `src/ui/list/CharacterList.test.tsx`
- Create: `src/ui/settings/SettingsScreen.tsx`, `src/ui/settings/CreditsScreen.tsx`, `src/ui/settings/SettingsScreen.test.tsx`
- Modify: `src/ui/App.tsx` (`Screens`), `src/ui/App.test.tsx`, `src/i18n/en.json`, `src/i18n/nl.json`

**Interfaces:**
- Consumes: `loadCharacters`, `deleteCharacter` (Task 7), `backupDue` (Task 8), `useExport`, `Dialog`, `useAppData`, `hrefFor`, `classSummary`, `deriveSheet`, `SRD_ATTRIBUTION`.
- Produces: `CharacterList()`, `SettingsScreen()`, `CreditsScreen()`; routes `list`, `settings` en `credits` in `Screens`. *Importeren* op de lijst komt in 1C.

- [ ] **Step 1: Vertalingen toevoegen**

Voeg toe aan `src/i18n/en.json`:

```json
  "list.title": "Characters",
  "list.new": "New character",
  "list.empty": "No characters yet.",
  "list.level": "Level {level}",
  "list.noClass": "No class yet",
  "list.export": "Export",
  "list.deleteTitle": "Delete character",
  "list.deleteConfirm": "Delete {name}? This cannot be undone.",
  "list.broken": "{name} cannot be loaded: {error}",
  "backup.reminder": "It has been more than 14 days since your last export.",
  "backup.now": "Export all data",
  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageDevice": "Device language",
  "settings.theme": "Theme",
  "settings.themeAuto": "Automatic",
  "settings.themeLight": "Light",
  "settings.themeDark": "Dark",
  "settings.backup": "Backup",
  "settings.lastExport": "Last export: {date}",
  "settings.neverExported": "No export yet.",
  "settings.credits": "Credits",
  "credits.title": "Credits",
  "credits.skeletons": "Subclasses that are not in the SRD only have a name in this app; you fill in the rest yourself."
```

en aan `src/i18n/nl.json`:

```json
  "list.title": "Characters",
  "list.new": "Nieuw character",
  "list.empty": "Nog geen characters.",
  "list.level": "Level {level}",
  "list.noClass": "Nog geen class",
  "list.export": "Exporteren",
  "list.deleteTitle": "Character verwijderen",
  "list.deleteConfirm": "{name} verwijderen? Dit kan niet ongedaan worden gemaakt.",
  "list.broken": "{name} kan niet worden geladen: {error}",
  "backup.reminder": "Je hebt al meer dan 14 dagen niet geëxporteerd.",
  "backup.now": "Alle data exporteren",
  "settings.title": "Instellingen",
  "settings.language": "Taal",
  "settings.languageDevice": "Taal van het apparaat",
  "settings.theme": "Thema",
  "settings.themeAuto": "Automatisch",
  "settings.themeLight": "Licht",
  "settings.themeDark": "Donker",
  "settings.backup": "Back-up",
  "settings.lastExport": "Laatste export: {date}",
  "settings.neverExported": "Nog niet geëxporteerd.",
  "settings.credits": "Credits",
  "credits.title": "Credits",
  "credits.skeletons": "Subclasses die niet in de SRD staan, hebben in deze app alleen een naam; de rest vul je zelf aan."
```

- [ ] **Step 2: De falende tests schrijven**

`src/ui/list/CharacterList.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { kael } from '../../rules/testing/fixtures';
import { loadCharacters, saveCharacter } from '../../storage/characters';
import { DEFAULT_SETTINGS, saveSettings } from '../../storage/settings';
import { renderApp, testDb } from '../testing/render';

describe('character list', () => {
  it('starts empty with a link to a new character', async () => {
    renderApp('#/');
    expect(await screen.findByText('No characters yet.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'New character' }).getAttribute('href')).toBe('#/new');
  });

  it('shows each character with classes and level, linking to its sheet', async () => {
    const db = testDb();
    await saveCharacter(db, kael({ state: { hpCurrent: 40 } }));
    renderApp('#/', db);
    const link = await screen.findByRole('link', { name: /Test/ });
    expect(link.textContent).toContain('Fighter 3 (Champion) / Wizard 2');
    expect(link.textContent).toContain('Level 5');
    expect(link.getAttribute('href')).toBe('#/c/test');
  });

  it('deletes a character only after confirming', async () => {
    const db = testDb();
    await saveCharacter(db, kael());
    renderApp('#/', db);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('dialog').querySelector('button.danger')!);
    await waitFor(async () => expect((await loadCharacters(db)).characters).toEqual([]));
    expect(await screen.findByText('No characters yet.')).toBeTruthy();
  });

  it('shows a row it cannot read as broken, and keeps working', async () => {
    const db = testDb();
    await saveCharacter(db, kael());
    await db.characters.put({ id: 'future', name: 'From the future', schemaVersion: 99 });
    renderApp('#/', db);
    expect(await screen.findByText(/From the future cannot be loaded/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Test/ })).toBeTruthy();
  });

  it('reminds to make a backup after 14 days without an export', async () => {
    const db = testDb();
    await saveCharacter(db, { ...kael(), createdAt: '2026-01-01T00:00:00.000Z' });
    await saveSettings(db, { ...DEFAULT_SETTINGS, lastExportAt: '2026-01-02T00:00:00.000Z' });
    renderApp('#/', db);
    expect(await screen.findByText('It has been more than 14 days since your last export.')).toBeTruthy();
  });
});
```

`src/ui/settings/SettingsScreen.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SRD_ATTRIBUTION } from '../../content/srd/attribution';
import { loadSettings } from '../../storage/settings';
import { renderApp } from '../testing/render';

describe('settings and credits', () => {
  it('switches the language and the theme, and remembers them', async () => {
    const { db } = renderApp('#/settings');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Language'), 'nl');
    expect(await screen.findByRole('heading', { name: 'Instellingen' })).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Thema'), 'dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    await waitFor(async () => expect(await loadSettings(db)).toMatchObject({ language: 'nl', theme: 'dark' }));
  });

  it('credits show the SRD attribution verbatim', async () => {
    renderApp('#/credits');
    expect((await screen.findByText(SRD_ATTRIBUTION)).textContent).toBe(SRD_ATTRIBUTION);
  });
});
```

In `src/ui/App.test.tsx` wordt de eerste test:

```tsx
  it('loads the data and starts on the character list', async () => {
    renderApp('#/');
    expect(await screen.findByRole('heading', { name: 'Characters' })).toBeTruthy();
  });
```

- [ ] **Step 3: Tests draaien en zien falen**

Run: `npm test -- src/ui`
Expected: FAIL, de lijst, instellingen en credits bestaan nog niet.

- [ ] **Step 4: De characterlijst**

`src/ui/list/CharacterList.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import type { Character } from '../../model/character';
import { deriveSheet } from '../../rules/derive';
import { backupDue } from '../../storage/backup';
import { deleteCharacter, loadCharacters, type LoadedCharacters } from '../../storage/characters';
import { Dialog } from '../components/Dialog';
import { useAppData } from '../data';
import { classSummary } from '../format';
import { hrefFor } from '../router';
import { useExport } from '../use-export';
import './list.css';

/** Spec §8: the start screen, one card per character. */
export function CharacterList() {
  const { db, registry, settings } = useAppData();
  const { t } = useI18n();
  const { exportCharacter, exportBackup } = useExport();
  const [loaded, setLoaded] = useState<LoadedCharacters>();
  const [toDelete, setToDelete] = useState<{ id: string; name: string }>();

  const reload = useCallback(() => loadCharacters(db).then(setLoaded), [db]);
  useEffect(() => {
    void reload();
  }, [reload]);
  if (!loaded) return null;

  const oldest = loaded.characters.reduce<string | null>((min, c) => (min === null || c.createdAt < min ? c.createdAt : min), null);
  const remind = backupDue(settings.lastExportAt, oldest, new Date().toISOString());
  const nameOf = (character: Pick<Character, 'name'>) => character.name || t('common.unnamed');

  return (
    <main className="screen">
      <header className="screen-header">
        <h1>{t('list.title')}</h1>
        <a className="button" href={hrefFor({ name: 'settings' })}>
          {t('nav.settings')}
        </a>
      </header>
      {remind && (
        <div className="notice" role="status">
          <span>{t('backup.reminder')}</span>{' '}
          <button type="button" onClick={() => void exportBackup()}>
            {t('backup.now')}
          </button>
        </div>
      )}
      <p>
        <a className="button primary" href={hrefFor({ name: 'new' })}>
          {t('list.new')}
        </a>
      </p>
      {loaded.characters.length === 0 && loaded.broken.length === 0 && <p className="muted">{t('list.empty')}</p>}
      <ul className="card-list">
        {loaded.characters.map((character) => {
          const sheet = deriveSheet(character, registry);
          return (
            <li key={character.id} className="card character-card">
              <a className="card-main" href={hrefFor({ name: 'sheet', id: character.id })}>
                <strong>{nameOf(character)}</strong>
                <span>{classSummary(sheet) || t('list.noClass')}</span>
                <span className="muted">{t('list.level', { level: sheet.totalLevel })}</span>
              </a>
              <div className="row">
                <button type="button" onClick={() => void exportCharacter(character)}>
                  {t('list.export')}
                </button>
                <button type="button" onClick={() => setToDelete({ id: character.id, name: nameOf(character) })}>
                  {t('common.delete')}
                </button>
              </div>
            </li>
          );
        })}
        {loaded.broken.map((broken) => (
          <li key={broken.id} className="card character-card broken">
            <span>{t('list.broken', { name: broken.name || broken.id, error: broken.error })}</span>
            <button type="button" onClick={() => setToDelete({ id: broken.id, name: broken.name || broken.id })}>
              {t('common.delete')}
            </button>
          </li>
        ))}
      </ul>
      {toDelete && (
        <Dialog
          title={t('list.deleteTitle')}
          onClose={() => setToDelete(undefined)}
          actions={
            <button
              type="button"
              className="danger"
              onClick={async () => {
                await deleteCharacter(db, toDelete.id);
                setToDelete(undefined);
                await reload();
              }}
            >
              {t('common.delete')}
            </button>
          }
        >
          <p>{t('list.deleteConfirm', { name: toDelete.name })}</p>
        </Dialog>
      )}
    </main>
  );
}
```

`src/ui/list/list.css`:

```css
.card-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.character-card { display: flex; flex-direction: column; gap: 0.75rem; margin: 0; }
.card-main { display: flex; flex-direction: column; gap: 0.2rem; color: inherit; text-decoration: none; min-height: var(--tap); }
.card-main strong { font-size: 1.15rem; }
.character-card.broken { border-color: var(--danger); }
```

- [ ] **Step 5: Instellingen en credits**

`src/ui/settings/SettingsScreen.tsx`:

```tsx
import { useI18n, type Lang } from '../../i18n/i18n';
import type { Settings } from '../../storage/settings';
import { useAppData } from '../data';
import { hrefFor } from '../router';
import { useExport } from '../use-export';

/** Spec §8: language, theme, backup and credits. Export and import of single characters live on the list (import: 1C). */
export function SettingsScreen() {
  const { settings, updateSettings } = useAppData();
  const { t, lang } = useI18n();
  const { exportBackup } = useExport();
  return (
    <main className="screen">
      <header className="screen-header">
        <a className="button" href={hrefFor({ name: 'list' })}>
          {t('nav.back')}
        </a>
        <h1>{t('settings.title')}</h1>
      </header>
      <section className="card">
        <label className="field">
          {t('settings.language')}
          <select
            value={settings.language ?? 'device'}
            onChange={(e) => void updateSettings({ language: e.target.value === 'device' ? null : (e.target.value as Lang) })}
          >
            <option value="device">{t('settings.languageDevice')}</option>
            <option value="nl">Nederlands</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="field">
          {t('settings.theme')}
          <select value={settings.theme} onChange={(e) => void updateSettings({ theme: e.target.value as Settings['theme'] })}>
            <option value="auto">{t('settings.themeAuto')}</option>
            <option value="light">{t('settings.themeLight')}</option>
            <option value="dark">{t('settings.themeDark')}</option>
          </select>
        </label>
      </section>
      <section className="card">
        <h2>{t('settings.backup')}</h2>
        <p className="muted">
          {settings.lastExportAt
            ? t('settings.lastExport', { date: new Date(settings.lastExportAt).toLocaleDateString(lang) })
            : t('settings.neverExported')}
        </p>
        <button type="button" onClick={() => void exportBackup()}>
          {t('backup.now')}
        </button>
      </section>
      <section className="card">
        <a className="button" href={hrefFor({ name: 'credits' })}>
          {t('settings.credits')}
        </a>
      </section>
    </main>
  );
}
```

`src/ui/settings/CreditsScreen.tsx`:

```tsx
import { SRD_ATTRIBUTION } from '../../content/srd/attribution';
import { useI18n } from '../../i18n/i18n';
import { hrefFor } from '../router';

/** Spec §6: the attribution the SRD 5.2.1 asks for, verbatim, and no other attribution to Wizards. */
export function CreditsScreen() {
  const { t } = useI18n();
  return (
    <main className="screen">
      <header className="screen-header">
        <a className="button" href={hrefFor({ name: 'settings' })}>
          {t('nav.back')}
        </a>
        <h1>{t('credits.title')}</h1>
      </header>
      <section className="card">
        <p lang="en">{SRD_ATTRIBUTION}</p>
      </section>
      <section className="card">
        <p>{t('credits.skeletons')}</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Routes**

In `src/ui/App.tsx`: importeer `CharacterList`, `SettingsScreen` en `CreditsScreen`, verwijder de import van `useI18n` als die niet meer gebruikt wordt, en vervang `Screens` door:

```tsx
function Screen() {
  const route = useRoute();
  switch (route.name) {
    case 'settings':
      return <SettingsScreen />;
    case 'credits':
      return <CreditsScreen />;
    default:
      return <CharacterList />;
  }
}

function Screens() {
  const route = useRoute();
  return (
    <Section key={hrefFor(route)}>
      <Screen />
    </Section>
  );
}
```

- [ ] **Step 7: Tests, typecheck en build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS, geen typefouten, build slaagt.

- [ ] **Step 8: Commit**

```bash
git add src/ui src/i18n
git commit -m "feat: characterlijst met back-upherinnering, instellingen en credits" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 11: Formulierlogica

**Files:**
- Create: `src/ui/form/form-logic.ts`, `src/ui/form/form-logic.test.ts`

**Interfaces:**
- Consumes: `STANDARD_ARRAY` (Task 2), `syncHitPoints` (Task 3), `deriveSheet`, `createCharacter`, `ContentRegistry`.
- Produces (pure functies, alle met `Character` erin en eruit, zodat het formulier in Task 12 alleen nog tekent):
  - `ASI_FEAT_ID = 'srd:feat:ability-score-improvement'`, `MAX_LEVEL = 20`, `type AbilityMethod`, `type BonusMode = 'two' | 'three'`.
  - `setAbilityMethod(character, method)`, `assignStandard(character, ability, value)`, `setBaseAbility(character, ability, value)`.
  - `setBackground(character, backgroundId | null)`, `setBackgroundBonuses(character, options, mode, plusTwo?, plusOne?)`, `bonusMode(bonuses): BonusMode`.
  - `addLevel(character, classId)`, `removeLastLevel(character)`, `setLevelHp(character, index, hp)`, `setLevelFeat(character, index, featId | undefined)`, `setLevelAsi(character, index, first, second)`.
  - `subclassLevel(registry, classId): number | undefined`, `setSubclass(character, registry, classId, subclassId | undefined)`.
  - `setSkill(character, skill, on)`, `setExpertise(character, skill, on)`, `parseList(text): string[]`.
  - `pruneOptions(character, registry, activeFeatureIds)`, `finishForm(original | undefined, draft, registry, now): Character`.

- [ ] **Step 1: De falende test schrijven**

`src/ui/form/form-logic.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readVendor } from '../../../scripts/convert-srd/vendor';
import { kael, level, levels, makeCharacter, registry } from '../../rules/testing/fixtures';
import {
  addLevel, ASI_FEAT_ID, assignStandard, bonusMode, finishForm, MAX_LEVEL, parseList, pruneOptions, removeLastLevel,
  setAbilityMethod, setBackground, setBackgroundBonuses, setBaseAbility, setExpertise, setLevelAsi, setLevelFeat,
  setLevelHp, setSkill, setSubclass, subclassLevel,
} from './form-logic';

const NOW = '2026-10-16T12:00:00.000Z';

describe('abilities', () => {
  it('standard array and point buy set the starting scores; other methods keep them', () => {
    expect(setAbilityMethod(makeCharacter(), 'standard').choices.baseAbilities).toEqual({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });
    expect(Object.values(setAbilityMethod(makeCharacter(), 'pointbuy').choices.baseAbilities)).toEqual([8, 8, 8, 8, 8, 8]);
    expect(setAbilityMethod(kael(), 'manual').choices.baseAbilities).toEqual(kael().choices.baseAbilities);
  });

  it('a standard array value swaps with the ability that had it', () => {
    const standard = setAbilityMethod(makeCharacter(), 'standard');
    expect(assignStandard(standard, 'cha', 15).choices.baseAbilities).toMatchObject({ str: 8, cha: 15 });
  });

  it('typed scores are whole numbers from 1 to 30; anything else changes nothing', () => {
    const c = makeCharacter();
    expect(setBaseAbility(c, 'str', 31).choices.baseAbilities.str).toBe(30);
    expect(setBaseAbility(c, 'str', -4).choices.baseAbilities.str).toBe(1);
    expect(setBaseAbility(c, 'str', 13.6).choices.baseAbilities.str).toBe(14);
    expect(setBaseAbility(c, 'str', NaN)).toBe(c);
  });
});

describe('background', () => {
  const options = ['str', 'dex', 'con'] as const;

  it('+2 and +1 on two different abilities of the background, or +1 on all three', () => {
    const c = setBackground(makeCharacter(), 'srd:background:soldier');
    expect(setBackgroundBonuses(c, options, 'two', 'str', 'con').choices.backgroundAbilityBonuses).toEqual({ str: 2, con: 1 });
    expect(setBackgroundBonuses(c, options, 'two', 'str', 'str').choices.backgroundAbilityBonuses).toEqual({ str: 2 });
    expect(setBackgroundBonuses(c, options, 'two', 'wis', 'con').choices.backgroundAbilityBonuses).toEqual({ con: 1 });
    const three = setBackgroundBonuses(c, options, 'three');
    expect(three.choices.backgroundAbilityBonuses).toEqual({ str: 1, dex: 1, con: 1 });
    expect(bonusMode(three.choices.backgroundAbilityBonuses)).toBe('three');
  });

  it('another background clears the old bonuses', () => {
    expect(setBackground(kael(), 'srd:background:sage').choices.backgroundAbilityBonuses).toEqual({});
  });
});

describe('levels', () => {
  it('adds levels up to 20 and removes the last one', () => {
    const one = addLevel(makeCharacter(), 'srd:class:fighter');
    expect(one.choices.levels).toEqual([{ classId: 'srd:class:fighter', hp: 'average', featureChoices: {} }]);
    expect(removeLastLevel(one).choices.levels).toEqual([]);
    const full = makeCharacter({ choices: { levels: levels('fighter', MAX_LEVEL) } });
    expect(addLevel(full, 'srd:class:wizard')).toBe(full);
  });

  it('rolled hit points are whole numbers of at least 1', () => {
    const c = makeCharacter({ choices: { levels: levels('fighter', 2) } });
    expect(setLevelHp(c, 1, 7.4).choices.levels[1].hp).toBe(7);
    expect(setLevelHp(c, 1, 0).choices.levels[1].hp).toBe(1);
    expect(setLevelHp(c, 1, NaN)).toBe(c);
    expect(setLevelHp(c, 1, 'average').choices.levels[1].hp).toBe('average');
  });

  it('the Ability Score Improvement feat gives +2 to one score or +1 to two', () => {
    expect(readVendor('feats.md')).toContain('Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1.');
    const c = makeCharacter({ choices: { levels: levels('fighter', 4) } });
    expect(setLevelAsi(c, 3, 'str', 'str').choices.levels[3]).toMatchObject({ featId: ASI_FEAT_ID, asi: { str: 2 } });
    expect(setLevelAsi(c, 3, 'str', 'con').choices.levels[3].asi).toEqual({ str: 1, con: 1 });
    const other = setLevelFeat(setLevelAsi(c, 3, 'str', 'con'), 3, 'srd:feat:grappler');
    expect(other.choices.levels[3]).toEqual({ classId: 'srd:class:fighter', hp: 'average', featureChoices: {}, featId: 'srd:feat:grappler' });
    expect(setLevelFeat(other, 3, undefined).choices.levels[3]).toEqual({ classId: 'srd:class:fighter', hp: 'average', featureChoices: {} });
  });

  it('stores the subclass on the level that reaches the subclass level, and nowhere else', () => {
    expect(subclassLevel(registry, 'srd:class:fighter')).toBe(3);
    const c = makeCharacter({
      choices: { levels: [level('fighter'), level('wizard'), level('fighter'), level('fighter'), level('fighter', { subclassId: 'srd:subclass:champion' })] },
    });
    const set = setSubclass(c, registry, 'srd:class:fighter', 'skeleton:subclass:battle-master');
    expect(set.choices.levels.map((l) => l.subclassId)).toEqual([undefined, undefined, undefined, 'skeleton:subclass:battle-master', undefined]);
    expect(setSubclass(set, registry, 'srd:class:fighter', undefined).choices.levels.every((l) => l.subclassId === undefined)).toBe(true);
  });
});

describe('proficiencies', () => {
  it('turning a skill off also removes its expertise', () => {
    const c = setExpertise(setSkill(makeCharacter(), 'stealth', true), 'stealth', true);
    expect(c.choices).toMatchObject({ skillProficiencies: ['stealth'], expertise: ['stealth'] });
    expect(setSkill(c, 'stealth', false).choices).toMatchObject({ skillProficiencies: [], expertise: [] });
  });

  it('reads a comma-separated list, each entry once', () => {
    expect(parseList('Common, Dwarvish , ,Elvish, Common')).toEqual(['Common', 'Dwarvish', 'Elvish']);
  });
});

describe('saving the form', () => {
  it('a new character starts at full hit points and gets updatedAt', () => {
    const saved = finishForm(undefined, makeCharacter({ choices: { levels: levels('fighter', 1) } }), registry, NOW);
    expect(saved.state.hpCurrent).toBe(10);
    expect(saved.updatedAt).toBe(NOW);
  });

  it('a new level adds the hit points it gained', () => {
    const original = kael({ state: { hpCurrent: 30 } });
    const draft = { ...original, choices: { ...original.choices, levels: [...original.choices.levels, level('fighter')] } };
    expect(finishForm(original, draft, registry, NOW).state.hpCurrent).toBe(38);
  });

  it('drops chosen options whose parent feature is gone', () => {
    const cleric = makeCharacter({ choices: { levels: levels('cleric', 1), featureOptions: ['srd:feature:cleric:1:divine-order:protector'] } });
    const wizard = { ...cleric, choices: { ...cleric.choices, levels: levels('wizard', 1) } };
    expect(finishForm(cleric, wizard, registry, NOW).choices.featureOptions).toEqual([]);
    expect(pruneOptions(cleric, registry, new Set(['srd:feature:cleric:1:divine-order'])).choices.featureOptions).toEqual(cleric.choices.featureOptions);
  });
});
```

- [ ] **Step 2: Test draaien en zien falen**

Run: `npm test -- src/ui/form/form-logic.test.ts`
Expected: FAIL, `Failed to resolve import "./form-logic"`.

- [ ] **Step 3: Implementeren**

`src/ui/form/form-logic.ts`:

```ts
import { ABILITIES, type Ability } from '../../content/constants';
import type { ContentRegistry } from '../../content/registry';
import { STANDARD_ARRAY } from '../../content/srd/creation';
import { createCharacter, type Character, type LevelChoice } from '../../model/character';
import { syncHitPoints } from '../../rules/actions';
import { deriveSheet } from '../../rules/derive';

export const ASI_FEAT_ID = 'srd:feat:ability-score-improvement';
export const MAX_LEVEL = 20;

type Choices = Character['choices'];
export type AbilityMethod = Choices['abilityMethod'];
export type BonusMode = 'two' | 'three';

const withChoices = (character: Character, patch: Partial<Choices>): Character => ({ ...character, choices: { ...character.choices, ...patch } });
const scores = (pick: (index: number) => number) => Object.fromEntries(ABILITIES.map((a, i) => [a, pick(i)])) as Record<Ability, number>;
const mapLevel = (character: Character, index: number, update: (level: LevelChoice) => LevelChoice): Character =>
  withChoices(character, { levels: character.choices.levels.map((level, i) => (i === index ? update(level) : level)) });

/** Standard array assigns 15, 14, 13, 12, 10, 8 from STR to CHA; point buy starts at all 8s; rolled and manual keep the scores. */
export function setAbilityMethod(character: Character, method: AbilityMethod): Character {
  if (method === 'standard') return withChoices(character, { abilityMethod: method, baseAbilities: scores((i) => STANDARD_ARRAY[i]) });
  if (method === 'pointbuy') return withChoices(character, { abilityMethod: method, baseAbilities: scores(() => 8) });
  return withChoices(character, { abilityMethod: method });
}

/** Standard array: the value moves to this ability and this ability's old value goes to the one that had it. */
export function assignStandard(character: Character, ability: Ability, value: number): Character {
  const next = { ...character.choices.baseAbilities };
  const holder = ABILITIES.find((a) => next[a] === value);
  if (holder) next[holder] = next[ability];
  next[ability] = value;
  return withChoices(character, { baseAbilities: next });
}

/** A typed score becomes a whole number from 1 to 30 (the schema's range); a non-number changes nothing. */
export function setBaseAbility(character: Character, ability: Ability, value: number): Character {
  if (!Number.isFinite(value)) return character;
  return withChoices(character, { baseAbilities: { ...character.choices.baseAbilities, [ability]: Math.min(30, Math.max(1, Math.round(value))) } });
}

export function setBackground(character: Character, backgroundId: string | null): Character {
  return withChoices(character, { backgroundId, backgroundAbilityBonuses: {} });
}

/** SRD backgrounds: +2 to one and +1 to another of the background's three abilities, or +1 to all three. */
export function setBackgroundBonuses(
  character: Character,
  options: readonly Ability[],
  mode: BonusMode,
  plusTwo?: Ability,
  plusOne?: Ability,
): Character {
  if (mode === 'three') return withChoices(character, { backgroundAbilityBonuses: Object.fromEntries(options.map((a) => [a, 1])) });
  const bonuses: Partial<Record<Ability, number>> = {};
  if (plusTwo && options.includes(plusTwo)) bonuses[plusTwo] = 2;
  if (plusOne && plusOne !== plusTwo && options.includes(plusOne)) bonuses[plusOne] = 1;
  return withChoices(character, { backgroundAbilityBonuses: bonuses });
}

export function bonusMode(bonuses: Partial<Record<Ability, number>>): BonusMode {
  return Object.values(bonuses).filter((v) => v === 1).length === 3 ? 'three' : 'two';
}

export function addLevel(character: Character, classId: string): Character {
  if (character.choices.levels.length >= MAX_LEVEL) return character;
  return withChoices(character, { levels: [...character.choices.levels, { classId, hp: 'average', featureChoices: {} }] });
}

/** Spec §5: undoing a level removes the last LevelChoice. */
export function removeLastLevel(character: Character): Character {
  return withChoices(character, { levels: character.choices.levels.slice(0, -1) });
}

/** Average, or a rolled whole number of at least 1; a non-number changes nothing. */
export function setLevelHp(character: Character, index: number, hp: 'average' | number): Character {
  if (hp !== 'average' && !Number.isFinite(hp)) return character;
  return mapLevel(character, index, (level) => ({ ...level, hp: hp === 'average' ? 'average' : Math.max(1, Math.round(hp)) }));
}

/** A feat on this level; any other feat than Ability Score Improvement drops the ASI scores. */
export function setLevelFeat(character: Character, index: number, featId: string | undefined): Character {
  return mapLevel(character, index, ({ featId: _old, asi, ...rest }) => {
    if (!featId) return rest;
    return featId === ASI_FEAT_ID && asi ? { ...rest, featId, asi } : { ...rest, featId };
  });
}

/** SRD Ability Score Improvement feat: +2 to one score, or +1 to two; the same ability twice means +2. */
export function setLevelAsi(character: Character, index: number, first: Ability, second: Ability): Character {
  return mapLevel(character, index, (level) => ({ ...level, featId: ASI_FEAT_ID, asi: first === second ? { [first]: 2 } : { [first]: 1, [second]: 1 } }));
}

/** The class level at which the subclass is chosen, from the SRD class table (3 for every SRD class). */
export function subclassLevel(registry: ContentRegistry, classId: string): number | undefined {
  return registry.getOf('class', classId)?.subclassLevels[0];
}

/** The subclass goes on the level that reaches the class's subclass level, and off its other levels. */
export function setSubclass(character: Character, registry: ContentRegistry, classId: string, subclassId: string | undefined): Character {
  const at = subclassLevel(registry, classId) ?? 1;
  let count = 0;
  let target = -1;
  character.choices.levels.forEach((level, i) => {
    if (level.classId !== classId) return;
    count += 1;
    if (count <= at) target = i;
  });
  return withChoices(character, {
    levels: character.choices.levels.map((level, i) => {
      if (level.classId !== classId) return level;
      const { subclassId: _old, ...rest } = level;
      return i === target && subclassId ? { ...rest, subclassId } : rest;
    }),
  });
}

export function setSkill(character: Character, skill: string, on: boolean): Character {
  const skills = character.choices.skillProficiencies.filter((s) => s !== skill);
  return withChoices(character, {
    skillProficiencies: on ? [...skills, skill] : skills,
    expertise: on ? character.choices.expertise : character.choices.expertise.filter((s) => s !== skill),
  });
}

export function setExpertise(character: Character, skill: string, on: boolean): Character {
  const expertise = character.choices.expertise.filter((s) => s !== skill);
  return withChoices(character, { expertise: on ? [...expertise, skill] : expertise });
}

/** "Common, Dwarvish , ,Elvish" -> ["Common", "Dwarvish", "Elvish"], each entry once. */
export function parseList(text: string): string[] {
  return [...new Set(text.split(',').map((s) => s.trim()).filter(Boolean))];
}

/** Drops chosen options whose parent feature is no longer active, e.g. Divine Order after the Cleric level was removed. */
export function pruneOptions(character: Character, registry: ContentRegistry, activeFeatureIds: ReadonlySet<string>): Character {
  const featureOptions = character.choices.featureOptions.filter((id) => {
    const parentId = registry.getOf('feature', id)?.optionOf;
    return parentId === undefined || activeFeatureIds.has(parentId);
  });
  return withChoices(character, { featureOptions });
}

/**
 * What saving the form stores: options without an active parent dropped, hit points following the new maximum (full
 * for a character that had no levels), and updatedAt set.
 */
export function finishForm(original: Character | undefined, draft: Character, registry: ContentRegistry, now: string): Character {
  const pruned = pruneOptions(draft, registry, new Set(deriveSheet(draft, registry).features.map((f) => f.id)));
  const before = deriveSheet(original ?? createCharacter({ id: draft.id, now }), registry);
  const synced = syncHitPoints(pruned, before, deriveSheet(pruned, registry));
  return { ...synced, updatedAt: now };
}
```

- [ ] **Step 4: Test en typecheck**

Run: `npm test -- src/ui/form && npm run typecheck`
Expected: PASS, geen typefouten.

- [ ] **Step 5: Commit**

```bash
git add src/ui/form
git commit -m "feat: formulierlogica voor abilities, background, levels, subclass en proficiencies" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 12: Aanmaakformulier

**Files:**
- Modify: `src/dice/dice.ts`, `src/dice/dice.test.ts` (`rollAbilityScore`)
- Create: `src/ui/components/NumberInput.tsx`
- Create: `src/ui/form/types.ts`, `src/ui/form/ListInput.tsx`, `src/ui/form/AbilitySection.tsx`, `src/ui/form/OriginSection.tsx`, `src/ui/form/LevelsSection.tsx`, `src/ui/form/OptionsSection.tsx`, `src/ui/form/ProficiencySection.tsx`, `src/ui/form/DetailsSection.tsx`, `src/ui/form/CharacterForm.tsx`, `src/ui/form/form.css`
- Test: `src/ui/form/CharacterForm.test.tsx`
- Modify: `src/ui/App.tsx`, `src/i18n/en.json`, `src/i18n/nl.json`

**Interfaces:**
- Consumes: alles uit Task 11, `optionsFor`, `isExclusive`, `toggleOption` (Task 4), `STANDARD_ARRAY`, `POINT_BUY_BUDGET`, `pointBuyCost` (Task 2), `loadCharacter`, `saveCharacter`, `WarningList`, `useToast`, `navigate`.
- Produces:
  - `rollAbilityScore(rng?: Rng): number` in `src/dice/dice.ts`.
  - `NumberInput({ value, onChange, ...inputProps })`: een getalveld dat leeg mag tijdens het typen; alleen getallen gaan naar `onChange`.
  - `interface SectionProps { character: Character; sheet: DerivedSheet; onChange: (next: Character) => void }` in `src/ui/form/types.ts`.
  - `CharacterForm({ id?: string })`: zonder `id` een nieuw character, met `id` bewerken. Opslaan gaat via `finishForm` en opent daarna de sheet (`#/c/<id>`). Routes `new` en `edit`.

- [ ] **Step 1: Vertalingen toevoegen**

Voeg toe aan `src/i18n/en.json`:

```json
  "form.newTitle": "New character",
  "form.editTitle": "Edit character",
  "form.name": "Name",
  "form.method": "Method",
  "form.method.standard": "Standard Array",
  "form.method.pointbuy": "Point Buy",
  "form.method.rolled": "Rolled (4d6)",
  "form.method.manual": "Manual",
  "form.points": "{spent} of {budget} points",
  "form.roll": "Roll",
  "form.final": "Total {score} ({mod})",
  "form.origin": "Species and background",
  "form.hpMax": "Maximum (first level)",
  "form.hpAverage": "Average ({value})",
  "form.hpRolled": "Rolled",
  "form.hpRolledValue": "Rolled HP",
  "form.addLevel": "Add level",
  "form.removeLevel": "Remove last level",
  "form.skeleton": "skeleton, fill in yourself",
  "form.languages": "Languages (comma-separated)",
  "form.tools": "Tools (comma-separated)",
  "form.options": "Choices",
  "form.details": "Details",
  "form.appearance": "Appearance",
  "form.personality": "Personality",
  "form.backstory": "Backstory",
  "sheet.missing": "This character does not exist (anymore)."
```

en aan `src/i18n/nl.json`:

```json
  "form.newTitle": "Nieuw character",
  "form.editTitle": "Character bewerken",
  "form.name": "Naam",
  "form.method": "Methode",
  "form.method.standard": "Standard Array",
  "form.method.pointbuy": "Point Buy",
  "form.method.rolled": "Gerold (4d6)",
  "form.method.manual": "Handmatig",
  "form.points": "{spent} van {budget} punten",
  "form.roll": "Rol",
  "form.final": "Totaal {score} ({mod})",
  "form.origin": "Species en background",
  "form.hpMax": "Maximum (eerste level)",
  "form.hpAverage": "Gemiddeld ({value})",
  "form.hpRolled": "Gerold",
  "form.hpRolledValue": "Gerolde HP",
  "form.addLevel": "Level toevoegen",
  "form.removeLevel": "Laatste level verwijderen",
  "form.skeleton": "skelet, zelf aanvullen",
  "form.languages": "Talen (gescheiden door komma's)",
  "form.tools": "Tools (gescheiden door komma's)",
  "form.options": "Keuzes",
  "form.details": "Details",
  "form.appearance": "Uiterlijk",
  "form.personality": "Persoonlijkheid",
  "form.backstory": "Achtergrondverhaal",
  "sheet.missing": "Dit character bestaat niet (meer)."
```

- [ ] **Step 2: De falende tests schrijven**

Voeg toe aan `src/dice/dice.test.ts` (importeer `rollAbilityScore` naast de bestaande imports, en `readVendor` uit `'../../scripts/convert-srd/vendor'`):

```ts
describe('rollAbilityScore', () => {
  it('rolls four d6 and adds the highest three (SRD Random Generation)', () => {
    expect(readVendor('character-creation.md')).toContain('Roll four d6s and record the total of the highest three dice.');
    expect(rollAbilityScore(faces(6, 1, 4, 6, 3))).toBe(13);
    expect(rollAbilityScore(faces(6, 6, 6, 6, 6))).toBe(18);
  });
});
```

`src/ui/form/CharacterForm.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { kael } from '../../rules/testing/fixtures';
import { loadCharacter, loadCharacters, saveCharacter } from '../../storage/characters';
import { renderApp, testDb } from '../testing/render';

describe('character form', () => {
  it('creates a Fighter 1 / Wizard 1 at full hit points and opens its sheet', async () => {
    const { db } = renderApp('#/new');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Name'), 'Kael');
    await user.selectOptions(screen.getByLabelText('Class'), 'srd:class:fighter');
    await user.click(screen.getByRole('button', { name: 'Add level' }));
    await user.selectOptions(screen.getByLabelText('Class'), 'srd:class:wizard');
    await user.click(screen.getByRole('button', { name: 'Add level' }));
    expect(screen.getByText(/Multiclass prerequisite not met for Fighter/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await loadCharacters(db)).characters).toHaveLength(1));
    const [saved] = (await loadCharacters(db)).characters;
    expect(saved).toMatchObject({ name: 'Kael', state: { hpCurrent: 14 } });
    expect(saved.choices.levels.map((l) => l.classId)).toEqual(['srd:class:fighter', 'srd:class:wizard']);
    await waitFor(() => expect(window.location.hash).toBe(`#/c/${saved.id}`));
  });

  it('offers Divine Order for a Cleric and stores the choice', async () => {
    const { db } = renderApp('#/new');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Class'), 'srd:class:cleric');
    await user.click(screen.getByRole('button', { name: 'Add level' }));
    await user.click(screen.getByLabelText('Protector'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () =>
      expect((await loadCharacters(db)).characters[0]?.choices.featureOptions).toEqual(['srd:feature:cleric:1:divine-order:protector']),
    );
  });

  it('edits an existing character, keeps its id and adds the hit points of a new level', async () => {
    const db = testDb();
    await saveCharacter(db, kael({ state: { hpCurrent: 30 } }));
    renderApp('#/c/test/edit', db);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Class'), 'srd:class:fighter');
    await user.click(screen.getByRole('button', { name: 'Add level' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.state.hpCurrent).toBe(38));
  });

  it('point buy counts the points, also while a field is cleared and typed again', async () => {
    renderApp('#/new');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Method'), 'pointbuy');
    expect(screen.getByText('0 of 27 points')).toBeTruthy();
    const str = screen.getByLabelText('STR');
    await user.clear(str);
    await user.type(str, '15');
    expect(screen.getByText('9 of 27 points')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Tests draaien en zien falen**

Run: `npm test -- src/dice src/ui/form`
Expected: FAIL, `rollAbilityScore` is not exported en het formulier bestaat nog niet.

- [ ] **Step 4: `rollAbilityScore` en de invoervelden**

Onderaan `src/dice/dice.ts`:

```ts
/** SRD Character Creation, Random Generation: roll four d6 and add the highest three. */
export function rollAbilityScore(rng: Rng = cryptoRng): number {
  const dice = [rollDie(6, rng), rollDie(6, rng), rollDie(6, rng), rollDie(6, rng)].sort((a, b) => a - b);
  return dice[1] + dice[2] + dice[3];
}
```

`src/ui/components/NumberInput.tsx`:

```tsx
import { useEffect, useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number;
  onChange: (value: number) => void;
};

/**
 * A number field the player can clear while typing: only numbers reach onChange, and leaving the field shows the
 * stored value again, so an empty or half-typed field never ends up in the character.
 */
export function NumberInput({ value, onChange, onBlur, ...rest }: Props) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <input
      {...rest}
      type="number"
      inputMode="numeric"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        const number = Number(event.target.value);
        if (event.target.value.trim() !== '' && Number.isFinite(number)) onChange(number);
      }}
      onBlur={(event) => {
        setText(String(value));
        onBlur?.(event);
      }}
    />
  );
}
```

`src/ui/form/types.ts`:

```ts
import type { Character } from '../../model/character';
import type { DerivedSheet } from '../../rules/types';

export interface SectionProps {
  character: Character;
  sheet: DerivedSheet;
  onChange: (next: Character) => void;
}
```

`src/ui/form/ListInput.tsx`:

```tsx
import { useEffect, useState, type InputHTMLAttributes } from 'react';
import { parseList } from './form-logic';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: string[]; onCommit: (list: string[]) => void };

/** A comma-separated list, read when the field is left, so the player can type commas freely. */
export function ListInput({ value, onCommit, ...rest }: Props) {
  const [text, setText] = useState(value.join(', '));
  useEffect(() => setText(value.join(', ')), [value]);
  return <input {...rest} value={text} onChange={(event) => setText(event.target.value)} onBlur={() => onCommit(parseList(text))} />;
}
```

- [ ] **Step 5: De secties van het formulier**

`src/ui/form/AbilitySection.tsx`:

```tsx
import { ABILITIES } from '../../content/constants';
import { POINT_BUY_BUDGET, STANDARD_ARRAY, pointBuyCost } from '../../content/srd/creation';
import { rollAbilityScore } from '../../dice/dice';
import { useI18n } from '../../i18n/i18n';
import { NumberInput } from '../components/NumberInput';
import { formatMod } from '../format';
import { assignStandard, setAbilityMethod, setBaseAbility, type AbilityMethod } from './form-logic';
import type { SectionProps } from './types';

const METHODS: AbilityMethod[] = ['standard', 'pointbuy', 'rolled', 'manual'];

export function AbilitySection({ character, sheet, onChange }: SectionProps) {
  const { t } = useI18n();
  const { abilityMethod, baseAbilities } = character.choices;
  const cost = pointBuyCost(baseAbilities);
  return (
    <section className="card">
      <h2>Ability Scores</h2>
      <label className="field">
        {t('form.method')}
        <select value={abilityMethod} onChange={(e) => onChange(setAbilityMethod(character, e.target.value as AbilityMethod))}>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {t(`form.method.${m}`)}
            </option>
          ))}
        </select>
      </label>
      {abilityMethod === 'pointbuy' && (
        <p className={cost === undefined || cost > POINT_BUY_BUDGET ? 'warning' : 'muted'}>
          {t('form.points', { spent: cost ?? '–', budget: POINT_BUY_BUDGET })}
        </p>
      )}
      <div className="ability-grid">
        {ABILITIES.map((ability) => (
          <div key={ability} className="ability-input">
            <span className="ability-label">{ability.toUpperCase()}</span>
            {abilityMethod === 'standard' ? (
              <select
                aria-label={ability.toUpperCase()}
                value={baseAbilities[ability]}
                onChange={(e) => onChange(assignStandard(character, ability, Number(e.target.value)))}
              >
                {STANDARD_ARRAY.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : (
              <NumberInput
                aria-label={ability.toUpperCase()}
                min={abilityMethod === 'pointbuy' ? 8 : 1}
                max={abilityMethod === 'pointbuy' ? 15 : 30}
                value={baseAbilities[ability]}
                onChange={(value) => onChange(setBaseAbility(character, ability, value))}
              />
            )}
            {abilityMethod === 'rolled' && (
              <button type="button" onClick={() => onChange(setBaseAbility(character, ability, rollAbilityScore()))}>
                {t('form.roll')}
              </button>
            )}
            <span className="muted">{t('form.final', { score: sheet.abilities[ability].score, mod: formatMod(sheet.abilities[ability].mod) })}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

`src/ui/form/OriginSection.tsx`:

```tsx
import { ABILITIES, type Ability } from '../../content/constants';
import { useI18n } from '../../i18n/i18n';
import { useAppData } from '../data';
import { abilityName, titleCase } from '../format';
import { bonusMode, setBackground, setBackgroundBonuses } from './form-logic';
import type { SectionProps } from './types';

function AbilityPick({ label, options, value, onPick }: { label: string; options: readonly Ability[]; value?: Ability; onPick: (a?: Ability) => void }) {
  return (
    <label>
      {label}{' '}
      <select value={value ?? ''} onChange={(e) => onPick(e.target.value === '' ? undefined : (e.target.value as Ability))}>
        <option value="">–</option>
        {options.map((a) => (
          <option key={a} value={a}>
            {abilityName(a)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OriginSection({ character, onChange }: SectionProps) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const { speciesId, backgroundId, backgroundAbilityBonuses: bonuses } = character.choices;
  const background = backgroundId ? registry.getOf('background', backgroundId) : undefined;
  const mode = bonusMode(bonuses);
  const plusTwo = ABILITIES.find((a) => bonuses[a] === 2);
  const plusOne = mode === 'two' ? ABILITIES.find((a) => bonuses[a] === 1) : undefined;
  const feat = background?.featId ? registry.get(background.featId)?.name : undefined;
  return (
    <section className="card">
      <h2>{t('form.origin')}</h2>
      <label className="field">
        Species
        <select value={speciesId ?? ''} onChange={(e) => onChange({ ...character, choices: { ...character.choices, speciesId: e.target.value || null } })}>
          <option value="">{t('common.none')}</option>
          {registry.list('species').map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Background
        <select value={backgroundId ?? ''} onChange={(e) => onChange(setBackground(character, e.target.value || null))}>
          <option value="">{t('common.none')}</option>
          {registry.list('background').map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      {background && (
        <fieldset>
          <legend>Ability Score Increases</legend>
          <label>
            <input type="radio" name="bonus-mode" checked={mode === 'two'} onChange={() => onChange(setBackgroundBonuses(character, background.abilityOptions, 'two'))} />
            +2 / +1
          </label>
          <label>
            <input type="radio" name="bonus-mode" checked={mode === 'three'} onChange={() => onChange(setBackgroundBonuses(character, background.abilityOptions, 'three'))} />
            +1 / +1 / +1
          </label>
          {mode === 'two' && (
            <div className="row">
              <AbilityPick label="+2" options={background.abilityOptions} value={plusTwo} onPick={(a) => onChange(setBackgroundBonuses(character, background.abilityOptions, 'two', a, plusOne))} />
              <AbilityPick label="+1" options={background.abilityOptions} value={plusOne} onPick={(a) => onChange(setBackgroundBonuses(character, background.abilityOptions, 'two', plusTwo, a))} />
            </div>
          )}
          <p className="muted">
            Skills: {background.skillProficiencies.map(titleCase).join(', ')}
            {feat ? ` · Feat: ${feat}${background.featNote ? ` (${background.featNote})` : ''}` : ''}
          </p>
        </fieldset>
      )}
    </section>
  );
}
```

`src/ui/form/LevelsSection.tsx`:

```tsx
import { useState } from 'react';
import { ABILITIES, type Ability } from '../../content/constants';
import { useI18n } from '../../i18n/i18n';
import type { LevelChoice } from '../../model/character';
import { NumberInput } from '../components/NumberInput';
import { useAppData } from '../data';
import { abilityName } from '../format';
import { addLevel, ASI_FEAT_ID, MAX_LEVEL, removeLastLevel, setLevelAsi, setLevelFeat, setLevelHp, setSubclass, subclassLevel } from './form-logic';
import type { SectionProps } from './types';

function AsiPicker({ asi, onPick }: { asi: LevelChoice['asi']; onPick: (first: Ability, second: Ability) => void }) {
  const picked = ABILITIES.flatMap((a) => Array.from({ length: asi?.[a] ?? 0 }, () => a));
  const first = picked[0];
  const second = picked[1] ?? picked[0];
  const options = ABILITIES.map((a) => (
    <option key={a} value={a}>
      {abilityName(a)}
    </option>
  ));
  return (
    <span className="row">
      <select aria-label="Ability Score Improvement 1" value={first ?? ''} onChange={(e) => e.target.value && onPick(e.target.value as Ability, second ?? (e.target.value as Ability))}>
        <option value="">–</option>
        {options}
      </select>
      <select aria-label="Ability Score Improvement 2" value={second ?? ''} onChange={(e) => e.target.value && onPick(first ?? (e.target.value as Ability), e.target.value as Ability)}>
        <option value="">–</option>
        {options}
      </select>
    </span>
  );
}

/** Levels in the order taken (spec §5), hit points per level, a feat per level, and the subclass per class. */
export function LevelsSection({ character, sheet, onChange }: SectionProps) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const classes = registry.list('class');
  const feats = registry.list('feat');
  const [newClass, setNewClass] = useState(classes[0]?.id ?? '');
  const levels = character.choices.levels;
  const classLevelAt = (index: number) => levels.slice(0, index + 1).filter((l) => l.classId === levels[index].classId).length;
  return (
    <section className="card">
      <h2>Levels</h2>
      <ol className="level-list">
        {levels.map((level, index) => {
          const cls = registry.getOf('class', level.classId);
          const average = cls ? cls.hitDie / 2 + 1 : 1;
          return (
            <li key={index} className="level-row">
              <strong>
                {cls?.name ?? level.classId} {classLevelAt(index)}
              </strong>
              {index === 0 ? (
                <span className="muted">HP: {t('form.hpMax')}</span>
              ) : (
                <span className="row">
                  <select
                    aria-label={`HP ${index + 1}`}
                    value={level.hp === 'average' ? 'average' : 'rolled'}
                    onChange={(e) => onChange(setLevelHp(character, index, e.target.value === 'average' ? 'average' : average))}
                  >
                    <option value="average">{t('form.hpAverage', { value: average })}</option>
                    <option value="rolled">{t('form.hpRolled')}</option>
                  </select>
                  {level.hp !== 'average' && (
                    <NumberInput aria-label={t('form.hpRolledValue')} min={1} max={cls?.hitDie} value={level.hp} onChange={(hp) => onChange(setLevelHp(character, index, hp))} />
                  )}
                </span>
              )}
              <select aria-label={`Feat ${index + 1}`} value={level.featId ?? ''} onChange={(e) => onChange(setLevelFeat(character, index, e.target.value || undefined))}>
                <option value="">Feat: {t('common.none')}</option>
                {feats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              {level.featId === ASI_FEAT_ID && <AsiPicker asi={level.asi} onPick={(a, b) => onChange(setLevelAsi(character, index, a, b))} />}
            </li>
          );
        })}
      </ol>
      <div className="row">
        <select aria-label="Class" value={newClass} onChange={(e) => setNewClass(e.target.value)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="button" disabled={levels.length >= MAX_LEVEL} onClick={() => onChange(addLevel(character, newClass))}>
          {t('form.addLevel')}
        </button>
        <button type="button" disabled={levels.length === 0} onClick={() => onChange(removeLastLevel(character))}>
          {t('form.removeLevel')}
        </button>
      </div>
      {sheet.classLevels.map((cl) => {
        const at = subclassLevel(registry, cl.classId);
        if (at === undefined || cl.level < at) return null;
        return (
          <label key={cl.classId} className="field">
            Subclass ({cl.name})
            <select value={cl.subclassId ?? ''} onChange={(e) => onChange(setSubclass(character, registry, cl.classId, e.target.value || undefined))}>
              <option value="">{t('common.none')}</option>
              {registry
                .list('subclass')
                .filter((s) => s.classId === cl.classId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.source === 'skeleton' ? ` (${t('form.skeleton')})` : ''}
                  </option>
                ))}
            </select>
          </label>
        );
      })}
    </section>
  );
}
```

`src/ui/form/OptionsSection.tsx`:

```tsx
import { useI18n } from '../../i18n/i18n';
import { isExclusive, optionsFor, toggleOption } from '../../rules/choices';
import { useAppData } from '../data';
import type { SectionProps } from './types';

/** Choices inside active features: Divine Order, Primal Order, Elven Lineage (one each), Metamagic and invocations (several). */
export function OptionsSection({ character, sheet, onChange }: SectionProps) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const parents = sheet.features.filter((f) => optionsFor(registry, f.id).length > 0);
  if (parents.length === 0) return null;
  return (
    <section className="card">
      <h2>{t('form.options')}</h2>
      {parents.map((parent) => {
        const options = optionsFor(registry, parent.id);
        const exclusive = isExclusive(options);
        return (
          <fieldset key={parent.id}>
            <legend>{parent.name}</legend>
            {options.map((option) => (
              <label key={option.id} className="option">
                <input
                  type={exclusive ? 'radio' : 'checkbox'}
                  name={parent.id}
                  checked={character.choices.featureOptions.includes(option.id)}
                  onChange={(e) => onChange(toggleOption(character, registry, option.id, e.target.checked))}
                />
                {option.name}
              </label>
            ))}
          </fieldset>
        );
      })}
    </section>
  );
}
```

`src/ui/form/ProficiencySection.tsx`:

```tsx
import { SKILL_IDS } from '../../content/constants';
import { useI18n } from '../../i18n/i18n';
import { useAppData } from '../data';
import { titleCase } from '../format';
import { setExpertise, setSkill } from './form-logic';
import { ListInput } from './ListInput';
import type { SectionProps } from './types';

/** Skills the background gives are fixed; class skills, expertise, languages and tools are chosen here. */
export function ProficiencySection({ character, onChange }: SectionProps) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const { backgroundId, skillProficiencies, expertise, languages, toolProficiencies } = character.choices;
  const fromBackground = new Set(backgroundId ? (registry.getOf('background', backgroundId)?.skillProficiencies ?? []) : []);
  const setLanguages = (next: string[]) => onChange({ ...character, choices: { ...character.choices, languages: next } });
  const setTools = (next: string[]) => onChange({ ...character, choices: { ...character.choices, toolProficiencies: next } });
  return (
    <section className="card">
      <h2>Proficiencies</h2>
      <table className="skill-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th>Proficient</th>
            <th>Expertise</th>
          </tr>
        </thead>
        <tbody>
          {SKILL_IDS.map((skill) => {
            const name = titleCase(skill);
            const proficient = fromBackground.has(skill) || skillProficiencies.includes(skill);
            return (
              <tr key={skill}>
                <td>{name}</td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${name} Proficient`}
                    checked={proficient}
                    disabled={fromBackground.has(skill)}
                    onChange={(e) => onChange(setSkill(character, skill, e.target.checked))}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${name} Expertise`}
                    checked={expertise.includes(skill)}
                    disabled={!proficient}
                    onChange={(e) => onChange(setExpertise(character, skill, e.target.checked))}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <label className="field">
        {t('form.languages')}
        <ListInput value={languages} onCommit={setLanguages} />
      </label>
      <label className="field">
        {t('form.tools')}
        <ListInput value={toolProficiencies} onCommit={setTools} />
      </label>
    </section>
  );
}
```

`src/ui/form/DetailsSection.tsx`:

```tsx
import { useI18n } from '../../i18n/i18n';
import type { Character } from '../../model/character';
import type { SectionProps } from './types';

export function DetailsSection({ character, onChange }: SectionProps) {
  const { t } = useI18n();
  const set = (field: keyof Character['details']) => (value: string) => onChange({ ...character, details: { ...character.details, [field]: value } });
  return (
    <section className="card">
      <h2>{t('form.details')}</h2>
      <label className="field">
        Alignment
        <input value={character.details.alignment ?? ''} onChange={(e) => set('alignment')(e.target.value)} />
      </label>
      {(['appearance', 'personality', 'backstory'] as const).map((field) => (
        <label key={field} className="field">
          {t(`form.${field}`)}
          <textarea rows={3} value={character.details[field] ?? ''} onChange={(e) => set(field)(e.target.value)} />
        </label>
      ))}
    </section>
  );
}
```

`src/ui/form/form.css`:

```css
.ability-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }
.ability-input { display: flex; flex-direction: column; gap: 0.25rem; }
.ability-label { font-weight: 700; }
.level-list { padding-left: 1.5rem; display: grid; gap: 0.5rem; }
.level-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
fieldset { border: 1px solid var(--border); border-radius: var(--radius); margin: 0 0 0.75rem; padding: 0.5rem 0.75rem; }
fieldset label, label.option { display: inline-flex; align-items: center; gap: 0.4rem; min-height: var(--tap); margin-right: 1rem; }
.skill-table { border-collapse: collapse; width: 100%; max-width: 520px; }
.skill-table td, .skill-table th { padding: 0.15rem 0.5rem; text-align: left; }
```

- [ ] **Step 6: Het formulier en de routes**

`src/ui/form/CharacterForm.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import { createCharacter, type Character } from '../../model/character';
import { deriveSheet } from '../../rules/derive';
import { loadCharacter, saveCharacter } from '../../storage/characters';
import { useToast } from '../components/Toast';
import { WarningList } from '../components/WarningList';
import { useAppData } from '../data';
import { hrefFor, navigate } from '../router';
import { AbilitySection } from './AbilitySection';
import { DetailsSection } from './DetailsSection';
import { finishForm } from './form-logic';
import { LevelsSection } from './LevelsSection';
import { OptionsSection } from './OptionsSection';
import { OriginSection } from './OriginSection';
import { ProficiencySection } from './ProficiencySection';
import './form.css';

/** Spec §8, phase 1: one form to create or edit a character. The wizards follow in phase 2. */
export function CharacterForm({ id }: { id?: string }) {
  const { db, registry } = useAppData();
  const { t } = useI18n();
  const toast = useToast();
  const [original, setOriginal] = useState<Character>();
  const [draft, setDraft] = useState<Character | undefined>(() => (id ? undefined : createCharacter()));
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    loadCharacter(db, id).then(
      (character) => {
        if (!alive) return;
        if (character) {
          setOriginal(character);
          setDraft(character);
        } else setMissing(true);
      },
      () => {
        if (alive) setMissing(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [db, id]);

  const sheet = useMemo(() => (draft ? deriveSheet(draft, registry) : undefined), [draft, registry]);
  if (missing) {
    return (
      <main className="screen">
        <p>{t('sheet.missing')}</p>
        <a className="button" href={hrefFor({ name: 'list' })}>
          {t('nav.back')}
        </a>
      </main>
    );
  }
  if (!draft || !sheet) return null;

  const save = async () => {
    const final = finishForm(original, draft, registry, new Date().toISOString());
    try {
      await saveCharacter(db, final);
      navigate({ name: 'sheet', id: final.id });
    } catch (error) {
      toast({ message: t('save.failed', { reason: error instanceof Error ? error.message : String(error) }), error: true });
    }
  };
  const section = { character: draft, sheet, onChange: setDraft };

  return (
    <main className="screen form">
      <header className="screen-header">
        <a className="button" href={id ? hrefFor({ name: 'sheet', id }) : hrefFor({ name: 'list' })}>
          {t('common.cancel')}
        </a>
        <h1>{id ? t('form.editTitle') : t('form.newTitle')}</h1>
        <button type="button" className="primary" onClick={() => void save()}>
          {t('common.save')}
        </button>
      </header>
      <section className="card">
        <label className="field">
          {t('form.name')}
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <p className="muted">
          HP {sheet.hp.max} · AC {sheet.ac.value} · Level {sheet.totalLevel}
        </p>
        <WarningList warnings={sheet.warnings} />
      </section>
      <AbilitySection {...section} />
      <OriginSection {...section} />
      <LevelsSection {...section} />
      <OptionsSection {...section} />
      <ProficiencySection {...section} />
      <DetailsSection {...section} />
    </main>
  );
}
```

In `src/ui/App.tsx`: importeer `CharacterForm` en zet in `Screen()` vóór `default:`:

```tsx
    case 'new':
      return <CharacterForm />;
    case 'edit':
      return <CharacterForm id={route.id} />;
```

- [ ] **Step 7: Tests, typecheck en build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS, geen typefouten, build slaagt. Kort handmatig: `npm run dev`, maak een Cleric aan, kies *Protector*, sla op; de lijst toont het character.

- [ ] **Step 8: Commit**

```bash
git add src/dice src/ui src/i18n
git commit -m "feat: formulier om een character aan te maken en te bewerken" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 13: Dobbelstenen-paneel

**Files:**
- Modify: `src/dice/dice.ts`, `src/dice/dice.test.ts` (maximum op de modifier)
- Create: `src/ui/dice/history.ts`, `src/ui/dice/history.test.ts`
- Create: `src/ui/dice/DiceContext.tsx`, `src/ui/dice/DicePanel.tsx`, `src/ui/dice/dice.css`, `src/ui/dice/DicePanel.test.tsx`
- Modify: `src/ui/App.tsx` (`DiceProvider` in `ShellProviders`), `src/i18n/en.json`, `src/i18n/nl.json`

**Interfaces:**
- Consumes: `parseRoll`, `roll`, `rollD20`, `cryptoRng`, `DiceError`, `D20Mode`, `D20Result`, `RollResult`, `Rng` uit `src/dice/dice.ts`; `useToast`.
- Produces:
  - `src/ui/dice/history.ts`: `interface DiceEntry { id: number; label: string; total: number; detail: string; natural20?: boolean; natural1?: boolean }`, `HISTORY_LIMIT = 20`, `addEntry(history, entry)`, `describeD20(result, mode)`, `describeRoll(result)`.
  - `src/ui/dice/DiceContext.tsx`: `interface DiceApi { rollD20(label, bonus): D20Result; roll(label, expression, options?: { damage?: boolean }): RollResult | undefined; mode; setMode; critical; setCritical; history; open; setOpen }`, `DiceProvider({ children, rng? })`, `useDice()`.
  - `src/ui/dice/DicePanel.tsx`: `DicePanel()`, een balk onderaan met de laatste worp, uitklapbaar naar Advantage/Disadvantage, Kritiek, vrije worp, snelknoppen en de geschiedenis (spec §10).

- [ ] **Step 1: Vertalingen toevoegen**

`src/i18n/en.json`:

```json
  "dice.title": "Dice",
  "dice.open": "Open dice",
  "dice.mode": "Roll mode",
  "dice.normal": "Normal",
  "dice.critical": "Critical",
  "dice.expression": "Dice notation",
  "dice.roll": "Roll",
  "dice.invalid": "Cannot roll \"{expression}\"",
  "dice.history": "Last rolls"
```

`src/i18n/nl.json`:

```json
  "dice.title": "Dobbelstenen",
  "dice.open": "Dobbelstenen openen",
  "dice.mode": "Rolmodus",
  "dice.normal": "Normaal",
  "dice.critical": "Kritiek",
  "dice.expression": "Worp",
  "dice.roll": "Rollen",
  "dice.invalid": "Kan \"{expression}\" niet rollen",
  "dice.history": "Laatste worpen"
```

- [ ] **Step 2: De falende tests schrijven**

In `src/dice/dice.test.ts`: voeg `'1d6+1001'` en `'1d6-1001'` toe aan de lijst in `it.each([...])('rejects "%s"', …)`, en onder `describe('parseRoll', …)`:

```ts
  it('accepts a modifier up to 1000', () => {
    expect(parseRoll('1d6+1000').modifier).toBe(1000);
  });
```

`src/ui/dice/history.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { addEntry, describeD20, describeRoll, type DiceEntry } from './history';

const d20 = (rolls: number[], kept: number, bonus: number) => ({ rolls, kept, bonus, total: kept + bonus, natural20: false, natural1: false });

describe('dice history', () => {
  it('keeps the 20 newest rolls, newest first (spec §10)', () => {
    let history: DiceEntry[] = [];
    for (let i = 1; i <= 25; i += 1) history = addEntry(history, { id: i, label: `roll ${i}`, total: i, detail: '' });
    expect(history).toHaveLength(20);
    expect([history[0].id, history[19].id]).toEqual([25, 6]);
  });

  it('describes d20 tests, with both dice under Advantage or Disadvantage', () => {
    expect(describeD20(d20([14], 14, 5), 'normal')).toBe('d20 (14) +5');
    expect(describeD20(d20([9, 14], 14, -1), 'advantage')).toBe('d20 Advantage (9, 14) -1');
    expect(describeD20(d20([9, 14], 9, 0), 'disadvantage')).toBe('d20 Disadvantage (9, 14)');
  });

  it('describes free rolls die by die', () => {
    expect(describeRoll({ expression: '2d6+3', dice: [{ sides: 6, value: 4, sign: 1 }, { sides: 6, value: 6, sign: 1 }], modifier: 3, total: 13 })).toBe('2d6+3: 4 + 6 + 3');
    expect(describeRoll({ expression: '1d4-1d4-2', dice: [{ sides: 4, value: 3, sign: 1 }, { sides: 4, value: 1, sign: -1 }], modifier: -2, total: 0 })).toBe('1d4-1d4-2: 3 - 1 - 2');
    expect(describeRoll({ expression: '5', dice: [], modifier: 5, total: 5 })).toBe('5: 5');
  });
});
```

`src/ui/dice/DicePanel.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Rng } from '../../dice/dice';
import { renderWithProviders } from '../testing/render';
import { DiceProvider, useDice } from './DiceContext';
import { DicePanel } from './DicePanel';

/** Every die lands on the face just above its middle: d6 -> 4, d8 -> 5, d20 -> 11. */
const middle: Rng = () => 0.5;

function Rollers() {
  const dice = useDice();
  return (
    <>
      <button type="button" onClick={() => dice.rollD20('Longsword: attack', 5)}>
        attack
      </button>
      <button type="button" onClick={() => dice.roll('Longsword: damage', '1d8+3', { damage: true })}>
        damage
      </button>
    </>
  );
}

async function openPanel() {
  renderWithProviders(
    <DiceProvider rng={middle}>
      <Rollers />
      <DicePanel />
    </DiceProvider>,
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Dice' }));
  return user;
}

describe('dice panel', () => {
  it('rolls free notation and shows each die', async () => {
    const user = await openPanel();
    await user.type(screen.getByLabelText('Dice notation'), '2d6+3');
    await user.click(screen.getByRole('button', { name: 'Roll' }));
    expect(screen.getAllByText('2d6+3: 4 + 4 + 3').length).toBeGreaterThan(0);
  });

  it('a d20 test with Advantage shows both dice', async () => {
    const user = await openPanel();
    await user.click(screen.getByRole('button', { name: 'Advantage' }));
    await user.click(screen.getByRole('button', { name: 'attack' }));
    expect(screen.getAllByText('d20 Advantage (11, 11) +5').length).toBeGreaterThan(0);
  });

  it('Critical doubles the damage dice once and then switches off', async () => {
    const user = await openPanel();
    await user.click(screen.getByRole('button', { name: 'Critical' }));
    await user.click(screen.getByRole('button', { name: 'damage' }));
    expect(screen.getAllByText('1d8+3: 5 + 5 + 3').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Critical' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('shows a message for notation it cannot roll, instead of rolling something else', async () => {
    const user = await openPanel();
    await user.type(screen.getByLabelText('Dice notation'), '2d6 3');
    await user.click(screen.getByRole('button', { name: 'Roll' }));
    expect(await screen.findByText('Cannot roll "2d6 3"')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Tests draaien en zien falen**

Run: `npm test -- src/dice src/ui/dice`
Expected: FAIL, `'1d6+1001'` wordt niet geweigerd en de nieuwe modules ontbreken.

- [ ] **Step 4: Maximum op de modifier**

In `src/dice/dice.ts`, onder `const MAX_SIDES = 1000;`:

```ts
const MAX_MODIFIER = 1000;
```

en in `parseRoll`, direct vóór `return { terms, modifier };`:

```ts
  if (Math.abs(modifier) > MAX_MODIFIER) throw new DiceError(`Modifier too large in "${expression}"`);
```

- [ ] **Step 5: Geschiedenis, context en paneel**

`src/ui/dice/history.ts`:

```ts
import type { D20Mode, D20Result, RollResult } from '../../dice/dice';
import { formatMod } from '../format';

export interface DiceEntry {
  id: number;
  label: string;
  total: number;
  detail: string;
  natural20?: boolean;
  natural1?: boolean;
}

export const HISTORY_LIMIT = 20;

/** Spec §10: the last 20 rolls, newest first. */
export function addEntry(history: readonly DiceEntry[], entry: DiceEntry): DiceEntry[] {
  return [entry, ...history].slice(0, HISTORY_LIMIT);
}

/** "d20 (14) +5"; with Advantage or Disadvantage both dice: "d20 Advantage (9, 14) +5". */
export function describeD20(result: D20Result, mode: D20Mode): string {
  const dice = mode === 'normal' ? `d20 (${result.kept})` : `d20 ${mode === 'advantage' ? 'Advantage' : 'Disadvantage'} (${result.rolls.join(', ')})`;
  return result.bonus === 0 ? dice : `${dice} ${formatMod(result.bonus)}`;
}

/** "2d6+3: 4 + 6 + 3", with minus signs for subtracted dice and modifiers. */
export function describeRoll(result: RollResult): string {
  const dice = result.dice.map((die, i) => (i === 0 ? `${die.sign < 0 ? '-' : ''}${die.value}` : `${die.sign < 0 ? ' - ' : ' + '}${die.value}`)).join('');
  const sign = result.modifier < 0 ? '-' : '+';
  const modifier = result.modifier === 0 ? '' : dice === '' ? `${result.modifier}` : ` ${sign} ${Math.abs(result.modifier)}`;
  return `${result.expression}: ${dice}${modifier}`;
}
```

`src/ui/dice/DiceContext.tsx`:

```tsx
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cryptoRng, DiceError, roll, rollD20, type D20Mode, type D20Result, type Rng, type RollResult } from '../../dice/dice';
import { useI18n } from '../../i18n/i18n';
import { useToast } from '../components/Toast';
import { addEntry, describeD20, describeRoll, type DiceEntry } from './history';

export interface DiceApi {
  /** A d20 test with the panel's Advantage/Disadvantage setting; the result is returned (death saves use it). */
  rollD20(label: string, bonus: number): D20Result;
  /** A roll in dice notation. Damage uses the Critical setting once (double dice). Invalid notation shows a message. */
  roll(label: string, expression: string, options?: { damage?: boolean }): RollResult | undefined;
  mode: D20Mode;
  setMode(mode: D20Mode): void;
  critical: boolean;
  setCritical(on: boolean): void;
  history: DiceEntry[];
  open: boolean;
  setOpen(open: boolean): void;
}

const DiceContext = createContext<DiceApi | null>(null);

export function DiceProvider({ children, rng = cryptoRng }: { children: ReactNode; rng?: Rng }) {
  const { t } = useI18n();
  const toast = useToast();
  const [mode, setMode] = useState<D20Mode>('normal');
  const [critical, setCritical] = useState(false);
  const [history, setHistory] = useState<DiceEntry[]>([]);
  const [open, setOpen] = useState(false);
  const nextId = useRef(1);

  const push = useCallback((entry: Omit<DiceEntry, 'id'>) => {
    const id = nextId.current;
    nextId.current += 1;
    setHistory((current) => addEntry(current, { ...entry, id }));
  }, []);

  const rollD20Fn = useCallback(
    (label: string, bonus: number) => {
      const result = rollD20(bonus, mode, rng);
      push({ label, total: result.total, detail: describeD20(result, mode), natural20: result.natural20, natural1: result.natural1 });
      return result;
    },
    [mode, rng, push],
  );

  const rollFn = useCallback(
    (label: string, expression: string, options: { damage?: boolean } = {}) => {
      const crit = options.damage === true && critical;
      try {
        const result = roll(expression, { rng, critical: crit });
        push({ label: crit ? `${label} (${t('dice.critical')})` : label, total: result.total, detail: describeRoll(result) });
        if (crit) setCritical(false);
        return result;
      } catch (error) {
        if (!(error instanceof DiceError)) throw error;
        toast({ message: t('dice.invalid', { expression }), error: true });
        return undefined;
      }
    },
    [critical, rng, push, t, toast],
  );

  const value = useMemo<DiceApi>(
    () => ({ rollD20: rollD20Fn, roll: rollFn, mode, setMode, critical, setCritical, history, open, setOpen }),
    [rollD20Fn, rollFn, mode, critical, history, open],
  );
  return <DiceContext.Provider value={value}>{children}</DiceContext.Provider>;
}

export function useDice(): DiceApi {
  const dice = useContext(DiceContext);
  if (!dice) throw new Error('useDice outside DiceProvider');
  return dice;
}
```

`src/ui/dice/DicePanel.tsx`:

```tsx
import { useState } from 'react';
import type { D20Mode } from '../../dice/dice';
import { useI18n } from '../../i18n/i18n';
import { useDice } from './DiceContext';
import './dice.css';

const MODES: D20Mode[] = ['normal', 'advantage', 'disadvantage'];
const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100];

/** Spec §10: the result at the bottom with the single dice, Advantage/Disadvantage, Critical, free rolls and the last 20 rolls. */
export function DicePanel() {
  const dice = useDice();
  const { t } = useI18n();
  const [expression, setExpression] = useState('');
  const latest = dice.history[0];
  return (
    <aside className="dice-panel" aria-label={t('dice.title')}>
      <button type="button" className="dice-latest" aria-expanded={dice.open} onClick={() => dice.setOpen(!dice.open)}>
        {latest ? (
          <>
            <strong className={latest.natural20 ? 'nat20' : latest.natural1 ? 'nat1' : undefined}>{latest.total}</strong>
            <span>{latest.label}</span>
            <span className="muted">{latest.detail}</span>
          </>
        ) : (
          t('dice.title')
        )}
      </button>
      {dice.open && (
        <div className="dice-body">
          <div className="row" role="group" aria-label={t('dice.mode')}>
            {MODES.map((m) => (
              <button key={m} type="button" aria-pressed={dice.mode === m} onClick={() => dice.setMode(m)}>
                {m === 'normal' ? t('dice.normal') : m === 'advantage' ? 'Advantage' : 'Disadvantage'}
              </button>
            ))}
            <button type="button" aria-pressed={dice.critical} onClick={() => dice.setCritical(!dice.critical)}>
              {t('dice.critical')}
            </button>
          </div>
          <form
            className="row"
            onSubmit={(event) => {
              event.preventDefault();
              const text = expression.trim();
              if (text && dice.roll(text, text)) setExpression('');
            }}
          >
            <input aria-label={t('dice.expression')} placeholder="2d6+3" value={expression} onChange={(e) => setExpression(e.target.value)} />
            <button type="submit">{t('dice.roll')}</button>
          </form>
          <div className="row">
            {QUICK_DICE.map((sides) => (
              <button key={sides} type="button" onClick={() => dice.roll(`d${sides}`, `1d${sides}`)}>
                d{sides}
              </button>
            ))}
          </div>
          <ol className="dice-history" aria-label={t('dice.history')}>
            {dice.history.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.total}</strong> {entry.label} <span className="muted">{entry.detail}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  );
}
```

`src/ui/dice/dice.css`:

```css
.dice-panel { position: sticky; bottom: 0; z-index: 10; background: var(--surface); border-top: 1px solid var(--border); padding: 0.25rem 1rem calc(0.25rem + env(safe-area-inset-bottom)); }
.dice-latest { width: 100%; justify-content: flex-start; border: none; background: transparent; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.dice-latest strong { font-size: 1.3rem; }
.dice-body { display: grid; gap: 0.5rem; padding: 0.5rem 0; max-height: 45vh; overflow: auto; }
.dice-history { margin: 0; padding-left: 1.5rem; }
.nat20 { color: var(--ok); }
.nat1 { color: var(--danger); }
```

In `src/ui/App.tsx`: importeer `DiceProvider` uit `./dice/DiceContext` en vervang in `ShellProviders` `<ToastProvider>{children}</ToastProvider>` door:

```tsx
      <ToastProvider>
        <DiceProvider>{children}</DiceProvider>
      </ToastProvider>
```

- [ ] **Step 6: Tests en typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, geen typefouten.

- [ ] **Step 7: Commit**

```bash
git add src/dice src/ui src/i18n
git commit -m "feat: dobbelstenen-paneel met advantage, kritiek, vrije worpen en geschiedenis" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 14: Sheet: vaste balk, linkerkolom, ongedaan maken en notities

**Files:**
- Create: `src/ui/sheet/undo.ts`, `src/ui/sheet/undo.test.ts`
- Create: `src/ui/sheet/session.ts`
- Create: `src/ui/sheet/TopBar.tsx`, `src/ui/sheet/RestDialogs.tsx`, `src/ui/sheet/AbilityColumn.tsx`, `src/ui/sheet/NotesTab.tsx`, `src/ui/sheet/tabs.tsx`, `src/ui/sheet/Sheet.tsx`, `src/ui/sheet/sheet.css`
- Test: `src/ui/sheet/Sheet.test.tsx`
- Modify: `src/ui/App.tsx` (route `sheet`), `src/i18n/en.json`, `src/i18n/nl.json`

**Interfaces:**
- Consumes: state-acties uit Task 3 (`applyDamage`, `applyHealing`, `setTempHp`, `setDeathSaves`, `recordDeathSave`, `lifeState`, `setConditions`, `setExhaustion`, `setHeroicInspiration`, `canRest`, `shortRest`, `longRest`, `HitDieRoll`), `createSaveQueue` (Task 7), `useDice` (Task 13), `Dialog`, `WarningList`, `useMediaQuery`, `Section`.
- Produces:
  - `src/ui/sheet/undo.ts`: `interface UndoEntry<T> { label: string; before: T }`, `class UndoStack<T> { push(entry); pop(); size }` (maximaal 20).
  - `src/ui/sheet/session.ts`: `interface ReadySession { status: 'ready'; character; sheet; commit(next: Character, undoLabel?: string): void; undo(): void; canUndo: boolean }`, `type SessionState`, `useCharacterSession(id): SessionState`. `commit` met een `undoLabel` is een wijziging in `state`: die toont "label · Undo" en kan terug.
  - `src/ui/sheet/tabs.tsx`: `interface SheetTab { id: string; label: string; render(session: ReadySession): ReactNode }`, `sheetTabs(t): SheetTab[]`. Task 15 en 16 voegen hun tabbladen hier toe, in de volgorde Acties, Spells, Spullen, Features, Notities.
  - `Sheet({ id })`, `TopBar({ session })`, `AbilityColumn({ sheet })`, `NotesTab({ session })`, `ShortRestDialog`, `LongRestDialog`.
  - Testbare ankers: `data-testid="hp"` (tekst `current/max`) en `data-testid="ac"`. Knoppen met "Damage" (hoofdletter) in hun naam zijn alleen de schadeknop in de vaste balk.

- [ ] **Step 1: Vertalingen toevoegen**

`src/i18n/en.json`:

```json
  "sheet.broken": "This character cannot be loaded: {error}",
  "sheet.edit": "Edit",
  "sheet.amount": "Amount",
  "sheet.damage": "Damage",
  "sheet.heal": "Heal",
  "sheet.setTemp": "Set temp HP",
  "sheet.criticalHit": "Critical hit",
  "sheet.rollDeathSave": "Roll death save",
  "sheet.resetDeathSaves": "Reset",
  "sheet.addCondition": "Add condition",
  "sheet.removeCondition": "Remove {name}",
  "life.dying": "Dying",
  "life.stable": "Stable",
  "life.dead": "Dead",
  "undo.action": "Undo",
  "undo.last": "Undo last change",
  "undo.done": "Undone: {label}",
  "undo.damage": "HP −{amount}",
  "undo.heal": "HP +{amount}",
  "undo.temp": "Temp HP {amount}",
  "undo.deathSave": "Death save: {roll}",
  "undo.deathSavesReset": "Death saves reset",
  "undo.conditionOn": "{name} on",
  "undo.conditionOff": "{name} off",
  "undo.shortRest": "Short Rest: +{hp} HP",
  "rest.needsHp": "Resting needs at least 1 HP.",
  "rest.shortHelp": "Choose the Hit Point Dice to spend. Each one heals its roll plus your Constitution modifier, at least 1.",
  "rest.diceLeft": "{left} of {total} left",
  "rest.fewer": "One less d{die}",
  "rest.more": "One more d{die}",
  "rest.takeShort": "Roll and rest",
  "rest.longHelp": "All HP, Hit Point Dice, spell slots and resources come back, and Exhaustion goes down by 1.",
  "rest.takeLong": "Take Long Rest",
  "tab.abilities": "Abilities",
  "tab.notes": "Notes",
  "notes.add": "New note",
  "notes.empty": "No notes yet.",
  "notes.title": "Title",
  "notes.body": "Note",
  "notes.deleteTitle": "Delete note",
  "notes.deleteConfirm": "Delete this note?"
```

`src/i18n/nl.json`:

```json
  "sheet.broken": "Dit character kan niet worden geladen: {error}",
  "sheet.edit": "Bewerken",
  "sheet.amount": "Bedrag",
  "sheet.damage": "Schade",
  "sheet.heal": "Genezen",
  "sheet.setTemp": "Temp HP zetten",
  "sheet.criticalHit": "Kritieke treffer",
  "sheet.rollDeathSave": "Death save rollen",
  "sheet.resetDeathSaves": "Wissen",
  "sheet.addCondition": "Conditie toevoegen",
  "sheet.removeCondition": "{name} weghalen",
  "life.dying": "Stervende",
  "life.stable": "Stable",
  "life.dead": "Dood",
  "undo.action": "Ongedaan maken",
  "undo.last": "Laatste wijziging ongedaan maken",
  "undo.done": "Teruggedraaid: {label}",
  "undo.damage": "HP −{amount}",
  "undo.heal": "HP +{amount}",
  "undo.temp": "Temp HP {amount}",
  "undo.deathSave": "Death save: {roll}",
  "undo.deathSavesReset": "Death saves gewist",
  "undo.conditionOn": "{name} aan",
  "undo.conditionOff": "{name} uit",
  "undo.shortRest": "Short Rest: +{hp} HP",
  "rest.needsHp": "Rusten kan pas vanaf 1 HP.",
  "rest.shortHelp": "Kies de Hit Point Dice die je uitgeeft. Elke dobbelsteen geneest de worp plus je Constitution-modifier, minstens 1.",
  "rest.diceLeft": "{left} van {total} over",
  "rest.fewer": "Eén d{die} minder",
  "rest.more": "Eén d{die} meer",
  "rest.takeShort": "Rollen en rusten",
  "rest.longHelp": "Alle HP, Hit Point Dice, spell slots en resources komen terug en Exhaustion gaat 1 omlaag.",
  "rest.takeLong": "Long Rest nemen",
  "tab.abilities": "Abilities",
  "tab.notes": "Notities",
  "notes.add": "Nieuwe notitie",
  "notes.empty": "Nog geen notities.",
  "notes.title": "Titel",
  "notes.body": "Notitie",
  "notes.deleteTitle": "Notitie verwijderen",
  "notes.deleteConfirm": "Deze notitie verwijderen?"
```

- [ ] **Step 2: De falende tests schrijven**

`src/ui/sheet/undo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { UndoStack } from './undo';

describe('UndoStack', () => {
  it('keeps the last 20 changes and undoes the newest first (spec §8)', () => {
    const stack = new UndoStack<number>();
    for (let i = 1; i <= 25; i += 1) stack.push({ label: `change ${i}`, before: i });
    expect(stack.size).toBe(20);
    expect(stack.pop()).toEqual({ label: 'change 25', before: 25 });
    for (let i = 0; i < 19; i += 1) stack.pop();
    expect(stack.pop()).toBeUndefined();
  });
});
```

`src/ui/sheet/Sheet.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { kael } from '../../rules/testing/fixtures';
import { loadCharacter, saveCharacter } from '../../storage/characters';
import { renderApp, setMatchMedia, testDb } from '../testing/render';

async function openKael(state: { hpCurrent: number } = { hpCurrent: 40 }) {
  const db = testDb();
  await saveCharacter(db, kael({ state }));
  const view = renderApp('#/c/test', db);
  await screen.findByTestId('hp');
  return { ...view, user: userEvent.setup() };
}

async function damage(user: ReturnType<typeof userEvent.setup>, amount: string) {
  await user.type(screen.getByLabelText('Amount'), amount);
  await user.click(screen.getByRole('button', { name: /Damage/ }));
}

describe('sheet', () => {
  it('shows the fixed bar and the left column', async () => {
    await openKael();
    expect(screen.getByTestId('hp').textContent).toBe('40/40');
    expect(screen.getByTestId('ac').textContent).toBe('19');
    expect(screen.getByText('Fighter 3 (Champion) / Wizard 2 · Level 5')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Initiative \+1/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Athletics/ })).toBeTruthy();
  });

  it('takes damage, offers to undo it, and saves both', async () => {
    const { db, user } = await openKael();
    await damage(user, '7');
    expect(screen.getByTestId('hp').textContent).toBe('33/40');
    expect(screen.getByText('HP −7')).toBeTruthy();
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.state.hpCurrent).toBe(33));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('hp').textContent).toBe('40/40');
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.state.hpCurrent).toBe(40));
  });

  it('undoes older changes one by one from the top bar', async () => {
    const { user } = await openKael();
    await damage(user, '5');
    await damage(user, '3');
    expect(screen.getByTestId('hp').textContent).toBe('32/40');
    await user.click(screen.getByRole('button', { name: 'Undo last change' }));
    await user.click(screen.getByRole('button', { name: 'Undo last change' }));
    expect(screen.getByTestId('hp').textContent).toBe('40/40');
    expect(screen.getByRole('button', { name: 'Undo last change' }).hasAttribute('disabled')).toBe(true);
  });

  it('an empty, zero or negative amount cannot be applied', async () => {
    const { user } = await openKael();
    const button = screen.getByRole('button', { name: /Damage/ });
    expect(button.hasAttribute('disabled')).toBe(true);
    await user.type(screen.getByLabelText('Amount'), '-3');
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('at 0 hit points: death saves, a critical hit counts twice, and no rest', async () => {
    const { user } = await openKael({ hpCurrent: 0 });
    expect(screen.getByRole('group', { name: 'Death Saving Throws' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Short Rest' }).hasAttribute('disabled')).toBe(true);
    await user.click(screen.getByLabelText('Critical hit'));
    await damage(user, '2');
    expect(screen.getByText('Failures ●●○')).toBeTruthy();
  });

  it('saves a change straight away when the sheet is left', async () => {
    const { db, user, unmount } = await openKael();
    await damage(user, '4');
    unmount();
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.state.hpCurrent).toBe(36));
  });

  it('on a narrow screen the left column becomes a tab', async () => {
    setMatchMedia((query) => query === '(max-width: 900px)');
    const { user } = await openKael();
    expect(screen.queryByRole('button', { name: /Athletics/ })).toBeNull();
    await user.click(screen.getByRole('tab', { name: 'Abilities' }));
    expect(screen.getByRole('button', { name: /Athletics/ })).toBeTruthy();
  });

  it('a Short Rest spends the chosen hit dice and heals die + CON', async () => {
    const { user } = await openKael({ hpCurrent: 20 });
    await user.click(screen.getByRole('button', { name: 'Short Rest' }));
    await user.click(screen.getByRole('button', { name: 'One more d10' }));
    await user.click(screen.getByRole('button', { name: 'Roll and rest' }));
    const hp = Number(screen.getByTestId('hp').textContent!.split('/')[0]);
    expect(hp).toBeGreaterThanOrEqual(23);
    expect(hp).toBeLessThanOrEqual(32);
  });

  it('keeps notes', async () => {
    const { db, user } = await openKael();
    await user.click(screen.getByRole('tab', { name: 'Notes' }));
    await user.click(screen.getByRole('button', { name: 'New note' }));
    await user.type(screen.getByLabelText('Title'), 'Session 1');
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.notes.map((n) => n.title)).toEqual(['Session 1']));
  });
});
```

- [ ] **Step 3: Tests draaien en zien falen**

Run: `npm test -- src/ui/sheet`
Expected: FAIL, `Failed to resolve import "./undo"` en er is nog geen sheet.

- [ ] **Step 4: Ongedaan maken en de sessie**

`src/ui/sheet/undo.ts`:

```ts
export interface UndoEntry<T> {
  label: string;
  before: T;
}

/** Spec §8: the last 20 changes can be undone while the app is open. */
export class UndoStack<T> {
  readonly limit: number;
  private entries: UndoEntry<T>[] = [];

  constructor(limit = 20) {
    this.limit = limit;
  }

  push(entry: UndoEntry<T>): void {
    this.entries = [...this.entries, entry].slice(-this.limit);
  }

  pop(): UndoEntry<T> | undefined {
    return this.entries.pop();
  }

  get size(): number {
    return this.entries.length;
  }
}
```

`src/ui/sheet/session.ts`:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import type { Character } from '../../model/character';
import { deriveSheet } from '../../rules/derive';
import type { DerivedSheet } from '../../rules/types';
import { loadCharacter, saveCharacter } from '../../storage/characters';
import { createSaveQueue } from '../../storage/save-queue';
import { useToast } from '../components/Toast';
import { useAppData } from '../data';
import { UndoStack } from './undo';

export interface ReadySession {
  status: 'ready';
  character: Character;
  sheet: DerivedSheet;
  /** Store a change. With an undo label it is a state change that shows "label · Undo" and can be undone (spec §8). */
  commit(next: Character, undoLabel?: string): void;
  undo(): void;
  canUndo: boolean;
}

type LoadState = { status: 'loading' } | { status: 'missing' } | { status: 'broken'; error: string } | { status: 'ready' };
export type SessionState = Exclude<LoadState, { status: 'ready' }> | ReadySession;

/** Undo stacks live as long as the app is open, per character, also while the player is on another screen. */
const stacks = new Map<string, UndoStack<Character['state']>>();

export function useCharacterSession(id: string): SessionState {
  const { db, registry } = useAppData();
  const { t } = useI18n();
  const toast = useToast();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [character, setCharacter] = useState<Character>();
  const [undoCount, setUndoCount] = useState(0);
  const current = useRef<Character | undefined>(undefined);
  const notify = useRef({ t, toast });
  useEffect(() => {
    notify.current = { t, toast };
  });

  const queue = useMemo(
    () =>
      createSaveQueue<Character>(
        (c) => saveCharacter(db, c),
        (error) => {
          const reason = error instanceof Error ? error.message : String(error);
          notify.current.toast({ message: notify.current.t('save.failed', { reason }), error: true });
        },
      ),
    [db],
  );

  useEffect(() => {
    let alive = true;
    setLoad({ status: 'loading' });
    loadCharacter(db, id).then(
      (loaded) => {
        if (!alive) return;
        if (!loaded) {
          setLoad({ status: 'missing' });
          return;
        }
        current.current = loaded;
        setCharacter(loaded);
        setLoad({ status: 'ready' });
      },
      (error: unknown) => {
        if (alive) setLoad({ status: 'broken', error: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      alive = false;
    };
  }, [db, id]);

  // Review Focus 1: leaving the sheet, closing the page or hiding the app saves right away.
  useEffect(() => {
    const flush = () => void queue.flush();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [queue]);

  const stack = useMemo(() => {
    let found = stacks.get(id);
    if (!found) {
      found = new UndoStack<Character['state']>();
      stacks.set(id, found);
    }
    return found;
  }, [id]);
  useEffect(() => setUndoCount(stack.size), [stack]);

  const store = useCallback(
    (next: Character) => {
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      current.current = stamped;
      setCharacter(stamped);
      queue.push(stamped);
    },
    [queue],
  );

  const undo = useCallback(() => {
    const entry = stack.pop();
    setUndoCount(stack.size);
    if (!entry || !current.current) return;
    store({ ...current.current, state: entry.before });
    notify.current.toast({ message: notify.current.t('undo.done', { label: entry.label }) });
  }, [stack, store]);

  const commit = useCallback(
    (next: Character, undoLabel?: string) => {
      const previous = current.current;
      store(next);
      if (undoLabel && previous) {
        stack.push({ label: undoLabel, before: previous.state });
        setUndoCount(stack.size);
        notify.current.toast({ message: undoLabel, action: { label: notify.current.t('undo.action'), run: undo } });
      }
    },
    [stack, store, undo],
  );

  const sheet = useMemo(() => (character ? deriveSheet(character, registry) : undefined), [character, registry]);
  if (load.status !== 'ready') return load;
  if (!character || !sheet) return { status: 'loading' };
  return { status: 'ready', character, sheet, commit, undo, canUndo: undoCount > 0 };
}
```

- [ ] **Step 5: Vaste balk, rusten en linkerkolom**

`src/ui/sheet/TopBar.tsx`:

```tsx
import { useState } from 'react';
import { CONDITIONS } from '../../content/constants';
import { useI18n } from '../../i18n/i18n';
import {
  applyDamage, applyHealing, canRest, lifeState, recordDeathSave, setConditions, setDeathSaves, setExhaustion,
  setHeroicInspiration, setTempHp,
} from '../../rules/actions';
import { WarningList } from '../components/WarningList';
import { useDice } from '../dice/DiceContext';
import { classSummary, formatMod, titleCase } from '../format';
import { hrefFor } from '../router';
import { LongRestDialog, ShortRestDialog } from './RestDialogs';
import type { ReadySession } from './session';

function HitPoints({ session }: { session: ReadySession }) {
  const { character, sheet, commit } = session;
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [critical, setCritical] = useState(false);
  const value = Math.floor(Number(amount));
  const isNumber = amount.trim() !== '' && Number.isFinite(value) && value >= 0;
  const done = () => {
    setAmount('');
    setCritical(false);
  };
  return (
    <div className="hp-control">
      <span className="hp-value" data-testid="hp">
        {sheet.hp.current}/{sheet.hp.max}
      </span>
      {sheet.hp.temp > 0 && <span className="muted">+{sheet.hp.temp} temp</span>}
      <input aria-label={t('sheet.amount')} type="number" inputMode="numeric" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button
        type="button"
        className="big danger"
        disabled={!isNumber || value === 0}
        onClick={() => {
          commit(applyDamage(character, value, sheet, { critical }), t('undo.damage', { amount: value }));
          done();
        }}
      >
        − {t('sheet.damage')}
      </button>
      <button
        type="button"
        className="big"
        disabled={!isNumber || value === 0}
        onClick={() => {
          commit(applyHealing(character, value, sheet), t('undo.heal', { amount: value }));
          done();
        }}
      >
        + {t('sheet.heal')}
      </button>
      <button
        type="button"
        disabled={!isNumber}
        onClick={() => {
          commit(setTempHp(character, value), t('undo.temp', { amount: value }));
          done();
        }}
      >
        {t('sheet.setTemp')}
      </button>
      {sheet.hp.current === 0 && sheet.hp.max > 0 && (
        <label className="option">
          <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
          {t('sheet.criticalHit')}
        </label>
      )}
    </div>
  );
}

function DeathSaves({ session }: { session: ReadySession }) {
  const { character, sheet, commit } = session;
  const { t } = useI18n();
  const dice = useDice();
  const life = lifeState(character, sheet);
  if (life === 'alive') return null;
  const { successes, failures } = character.state.deathSaves;
  const dots = (n: number) => `${'●'.repeat(n)}${'○'.repeat(Math.max(0, 3 - n))}`;
  const roll = () => {
    const result = dice.rollD20('Death Saving Throw', -sheet.d20Penalty);
    commit(recordDeathSave(character, result.kept, sheet), t('undo.deathSave', { roll: result.kept }));
  };
  return (
    <div className={`death-saves ${life}`} role="group" aria-label="Death Saving Throws">
      <strong>{t(`life.${life}`)}</strong>
      <span>Successes {dots(successes)}</span>
      <span>Failures {dots(failures)}</span>
      {life === 'dying' && (
        <button type="button" onClick={roll}>
          {t('sheet.rollDeathSave')}
        </button>
      )}
      <button type="button" onClick={() => commit(setDeathSaves(character, 0, 0), t('undo.deathSavesReset'))}>
        {t('sheet.resetDeathSaves')}
      </button>
    </div>
  );
}

function Conditions({ session }: { session: ReadySession }) {
  const { character, commit } = session;
  const { t } = useI18n();
  const { conditions, exhaustion, heroicInspiration } = character.state;
  return (
    <div className="row conditions">
      {conditions.map((c) => (
        <button
          key={c}
          type="button"
          className="chip"
          aria-label={t('sheet.removeCondition', { name: titleCase(c) })}
          onClick={() => commit(setConditions(character, conditions.filter((x) => x !== c)), t('undo.conditionOff', { name: titleCase(c) }))}
        >
          {titleCase(c)} ×
        </button>
      ))}
      <select
        aria-label={t('sheet.addCondition')}
        value=""
        onChange={(e) => {
          const c = e.target.value;
          if (c) commit(setConditions(character, [...conditions, c]), t('undo.conditionOn', { name: titleCase(c) }));
        }}
      >
        <option value="">{t('sheet.addCondition')}</option>
        {CONDITIONS.filter((c) => !conditions.includes(c)).map((c) => (
          <option key={c} value={c}>
            {titleCase(c)}
          </option>
        ))}
      </select>
      <span className="row">
        Exhaustion
        <button type="button" aria-label="Exhaustion −1" disabled={exhaustion === 0} onClick={() => commit(setExhaustion(character, exhaustion - 1), `Exhaustion ${exhaustion - 1}`)}>
          −
        </button>
        <strong>{exhaustion}</strong>
        <button type="button" aria-label="Exhaustion +1" disabled={exhaustion >= 6} onClick={() => commit(setExhaustion(character, exhaustion + 1), `Exhaustion ${exhaustion + 1}`)}>
          +
        </button>
      </span>
      <label className="option">
        <input type="checkbox" checked={heroicInspiration} onChange={(e) => commit(setHeroicInspiration(character, e.target.checked), 'Heroic Inspiration')} />
        Heroic Inspiration
      </label>
    </div>
  );
}

function Rests({ session }: { session: ReadySession }) {
  const { t } = useI18n();
  const [dialog, setDialog] = useState<'short' | 'long' | null>(null);
  const allowed = canRest(session.sheet);
  return (
    <div className="row">
      <button type="button" disabled={!allowed} onClick={() => setDialog('short')}>
        Short Rest
      </button>
      <button type="button" disabled={!allowed} onClick={() => setDialog('long')}>
        Long Rest
      </button>
      {!allowed && <span className="muted">{t('rest.needsHp')}</span>}
      <span className="muted">
        Hit Point Dice: {session.sheet.hitDice.map((hd) => `d${hd.die} ${hd.total - hd.spent}/${hd.total}`).join(' · ') || '–'}
      </span>
      {dialog === 'short' && <ShortRestDialog session={session} onClose={() => setDialog(null)} />}
      {dialog === 'long' && <LongRestDialog session={session} onClose={() => setDialog(null)} />}
    </div>
  );
}

/** Spec §8: the fixed bar with name and classes, HP with big buttons and temp HP, AC, Initiative, conditions, rests and dice. */
export function TopBar({ session }: { session: ReadySession }) {
  const { character, sheet } = session;
  const { t } = useI18n();
  const dice = useDice();
  return (
    <header className="top-bar">
      <div className="row top-row">
        <a className="button" href={hrefFor({ name: 'list' })} aria-label={t('nav.back')}>
          ←
        </a>
        <div className="identity">
          <h1>{character.name || t('common.unnamed')}</h1>
          <span className="muted">
            {classSummary(sheet) || '–'} · Level {sheet.totalLevel}
          </span>
        </div>
        <button type="button" aria-label={t('undo.last')} disabled={!session.canUndo} onClick={session.undo}>
          ↶
        </button>
        <button type="button" aria-label={t('dice.open')} onClick={() => dice.setOpen(!dice.open)}>
          ⚄
        </button>
        <a className="button" href={hrefFor({ name: 'edit', id: character.id })}>
          {t('sheet.edit')}
        </a>
      </div>
      <div className="row top-row">
        <HitPoints session={session} />
        <div className="stat" title={sheet.ac.source}>
          <span>AC</span>
          <strong data-testid="ac">{sheet.ac.value}</strong>
        </div>
        <button type="button" className="stat" onClick={() => dice.rollD20('Initiative', sheet.initiative)}>
          <span>Initiative</span>
          <strong>{formatMod(sheet.initiative)}</strong>
        </button>
        <div className="stat">
          <span>Speed</span>
          <strong>{sheet.speed} ft.</strong>
        </div>
        <div className="stat">
          <span>Proficiency Bonus</span>
          <strong>{formatMod(sheet.proficiencyBonus)}</strong>
        </div>
      </div>
      <DeathSaves session={session} />
      <Conditions session={session} />
      <Rests session={session} />
      <WarningList warnings={sheet.warnings} />
    </header>
  );
}
```

`src/ui/sheet/RestDialogs.tsx`:

```tsx
import { useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import { longRest, shortRest, type HitDieRoll } from '../../rules/actions';
import { Dialog } from '../components/Dialog';
import { useDice } from '../dice/DiceContext';
import type { ReadySession } from './session';

/** The player picks the Hit Point Dice; each chosen die is rolled in the dice panel and only those dice count. */
export function ShortRestDialog({ session, onClose }: { session: ReadySession; onClose: () => void }) {
  const { character, sheet, commit } = session;
  const { t } = useI18n();
  const dice = useDice();
  const [spend, setSpend] = useState<Record<number, number>>({});
  const confirm = () => {
    const rolls: HitDieRoll[] = [];
    for (const hd of sheet.hitDice) {
      for (let i = 0; i < (spend[hd.die] ?? 0); i += 1) {
        const result = dice.roll(`Hit Point Die (d${hd.die})`, `1d${hd.die}`);
        if (result) rolls.push({ die: hd.die, roll: result.total });
      }
    }
    const next = shortRest(character, sheet, { rolls });
    commit(next, t('undo.shortRest', { hp: next.state.hpCurrent - sheet.hp.current }));
    onClose();
  };
  return (
    <Dialog
      title="Short Rest"
      onClose={onClose}
      actions={
        <button type="button" className="primary" onClick={confirm}>
          {t('rest.takeShort')}
        </button>
      }
    >
      <p>{t('rest.shortHelp')}</p>
      {sheet.hitDice.map((hd) => {
        const left = hd.total - hd.spent;
        const count = spend[hd.die] ?? 0;
        return (
          <div key={hd.die} className="row">
            <span>
              d{hd.die}: {t('rest.diceLeft', { left, total: hd.total })}
            </span>
            <button type="button" aria-label={t('rest.fewer', { die: hd.die })} disabled={count === 0} onClick={() => setSpend({ ...spend, [hd.die]: count - 1 })}>
              −
            </button>
            <strong>{count}</strong>
            <button type="button" aria-label={t('rest.more', { die: hd.die })} disabled={count >= left} onClick={() => setSpend({ ...spend, [hd.die]: count + 1 })}>
              +
            </button>
          </div>
        );
      })}
    </Dialog>
  );
}

export function LongRestDialog({ session, onClose }: { session: ReadySession; onClose: () => void }) {
  const { character, sheet, commit } = session;
  const { t } = useI18n();
  return (
    <Dialog
      title="Long Rest"
      onClose={onClose}
      actions={
        <button
          type="button"
          className="primary"
          onClick={() => {
            commit(longRest(character, sheet), 'Long Rest');
            onClose();
          }}
        >
          {t('rest.takeLong')}
        </button>
      }
    >
      <p>{t('rest.longHelp')}</p>
    </Dialog>
  );
}
```

`src/ui/sheet/AbilityColumn.tsx`:

```tsx
import { ABILITIES, SKILL_IDS } from '../../content/constants';
import type { DerivedSheet } from '../../rules/types';
import { useDice } from '../dice/DiceContext';
import { abilityName, formatMod, titleCase } from '../format';

/** Spec §8: the six abilities, Saving Throws and Skills. Tapping a number rolls it (spec §10). */
export function AbilityColumn({ sheet }: { sheet: DerivedSheet }) {
  const dice = useDice();
  return (
    <div className="ability-column">
      <section aria-label="Abilities" className="abilities">
        {ABILITIES.map((a) => (
          <button key={a} type="button" className="ability" onClick={() => dice.rollD20(`${abilityName(a)} check`, sheet.abilities[a].mod - sheet.d20Penalty)}>
            <span className="ability-label">{a.toUpperCase()}</span>
            <strong>{formatMod(sheet.abilities[a].mod)}</strong>
            <span className="muted">{sheet.abilities[a].score}</span>
          </button>
        ))}
      </section>
      <section>
        <h2>Saving Throws</h2>
        <ul className="check-list">
          {ABILITIES.map((a) => (
            <li key={a}>
              <button type="button" onClick={() => dice.rollD20(`${abilityName(a)} save`, sheet.saves[a].bonus)}>
                <span className={sheet.saves[a].proficient ? 'dot on' : 'dot'} aria-hidden="true" />
                <span className="check-name">{abilityName(a)}</span>
                <strong>{formatMod(sheet.saves[a].bonus)}</strong>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Skills</h2>
        <ul className="check-list">
          {SKILL_IDS.map((s) => {
            const skill = sheet.skills[s];
            return (
              <li key={s}>
                <button type="button" onClick={() => dice.rollD20(titleCase(s), skill.bonus)}>
                  <span className={skill.expertise ? 'dot on double' : skill.proficient ? 'dot on' : 'dot'} aria-hidden="true" />
                  <span className="check-name">
                    {titleCase(s)} <span className="muted">({skill.ability.toUpperCase()})</span>
                  </span>
                  <strong>{formatMod(skill.bonus)}</strong>
                </button>
              </li>
            );
          })}
        </ul>
        <p>
          Passive Perception <strong>{sheet.passivePerception}</strong>
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Notities, tabbladen en de sheet**

`src/ui/sheet/NotesTab.tsx`:

```tsx
import { useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import type { Character } from '../../model/character';
import { Dialog } from '../components/Dialog';
import type { ReadySession } from './session';

type Note = Character['notes'][number];

export function NotesTab({ session }: { session: ReadySession }) {
  const { character, commit } = session;
  const { t } = useI18n();
  const [toDelete, setToDelete] = useState<string>();
  const now = () => new Date().toISOString();
  const update = (notes: Note[]) => commit({ ...character, notes });
  const edit = (id: string, patch: Partial<Pick<Note, 'title' | 'body'>>) =>
    update(character.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)));
  return (
    <div className="notes">
      <button type="button" onClick={() => update([{ id: crypto.randomUUID(), title: '', body: '', updatedAt: now() }, ...character.notes])}>
        {t('notes.add')}
      </button>
      {character.notes.length === 0 && <p className="muted">{t('notes.empty')}</p>}
      {character.notes.map((note) => (
        <article key={note.id} className="card note">
          <input aria-label={t('notes.title')} placeholder={t('notes.title')} value={note.title} onChange={(e) => edit(note.id, { title: e.target.value })} />
          <textarea aria-label={t('notes.body')} rows={6} value={note.body} onChange={(e) => edit(note.id, { body: e.target.value })} />
          <button type="button" className="danger" onClick={() => setToDelete(note.id)}>
            {t('common.delete')}
          </button>
        </article>
      ))}
      {toDelete && (
        <Dialog
          title={t('notes.deleteTitle')}
          onClose={() => setToDelete(undefined)}
          actions={
            <button
              type="button"
              className="danger"
              onClick={() => {
                update(character.notes.filter((n) => n.id !== toDelete));
                setToDelete(undefined);
              }}
            >
              {t('common.delete')}
            </button>
          }
        >
          <p>{t('notes.deleteConfirm')}</p>
        </Dialog>
      )}
    </div>
  );
}
```

`src/ui/sheet/tabs.tsx`:

```tsx
import type { ReactNode } from 'react';
import type { Translate } from '../../i18n/i18n';
import { NotesTab } from './NotesTab';
import type { ReadySession } from './session';

export interface SheetTab {
  id: string;
  label: string;
  render(session: ReadySession): ReactNode;
}

/** Spec §8: Actions, Spells, Inventory, Features, Notes. Tasks 15 and 16 add theirs in this order. */
export function sheetTabs(t: Translate): SheetTab[] {
  return [{ id: 'notes', label: t('tab.notes'), render: (session) => <NotesTab session={session} /> }];
}
```

`src/ui/sheet/Sheet.tsx`:

```tsx
import { useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import { Section } from '../components/ErrorBoundary';
import { DicePanel } from '../dice/DicePanel';
import { useMediaQuery } from '../hooks';
import { hrefFor } from '../router';
import { AbilityColumn } from './AbilityColumn';
import { useCharacterSession } from './session';
import { sheetTabs, type SheetTab } from './tabs';
import { TopBar } from './TopBar';
import './sheet.css';

/**
 * Spec §8, the hybrid sheet: a fixed bar on top, abilities on the left, tabs on the right. On iPad portrait and other
 * narrow screens the left column becomes a tab; the first other tab stays the default.
 */
export function Sheet({ id }: { id: string }) {
  const session = useCharacterSession(id);
  const { t } = useI18n();
  const narrow = useMediaQuery('(max-width: 900px)');
  const [tab, setTab] = useState<string>();
  if (session.status === 'loading') return null;
  if (session.status !== 'ready') {
    return (
      <main className="screen">
        <p role="alert">{session.status === 'missing' ? t('sheet.missing') : t('sheet.broken', { error: session.error })}</p>
        <a className="button" href={hrefFor({ name: 'list' })}>
          {t('nav.back')}
        </a>
      </main>
    );
  }
  const abilitiesTab: SheetTab = { id: 'abilities', label: t('tab.abilities'), render: (s) => <AbilityColumn sheet={s.sheet} /> };
  const tabs = narrow ? [abilitiesTab, ...sheetTabs(t)] : sheetTabs(t);
  const current = tabs.find((x) => x.id === tab) ?? tabs.find((x) => x.id !== 'abilities') ?? tabs[0];
  return (
    <div className="sheet">
      <Section>
        <TopBar session={session} />
      </Section>
      <div className="sheet-body">
        {!narrow && (
          <aside className="sheet-left">
            <Section>
              <AbilityColumn sheet={session.sheet} />
            </Section>
          </aside>
        )}
        <main className="sheet-main">
          <div role="tablist" className="tabs">
            {tabs.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={x.id === current.id} onClick={() => setTab(x.id)}>
                {x.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="tab-panel">
            <Section key={current.id}>{current.render(session)}</Section>
          </div>
        </main>
      </div>
      <DicePanel />
    </div>
  );
}
```

`src/ui/sheet/sheet.css`:

```css
.sheet { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; }
.top-bar { position: sticky; top: 0; z-index: 5; background: var(--bg); border-bottom: 1px solid var(--border); padding: calc(0.5rem + env(safe-area-inset-top)) 1rem 0.5rem; display: grid; gap: 0.4rem; }
.top-row { justify-content: space-between; }
.identity { flex: 1; min-width: 0; }
.identity h1 { margin: 0; font-size: 1.2rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hp-control { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
.hp-value { font-size: 1.6rem; font-weight: 700; min-width: 5ch; }
.hp-control input { width: 6rem; }
button.big { min-width: 5.5rem; font-weight: 700; }
.stat { display: inline-flex; flex-direction: column; align-items: center; min-width: 4.5rem; padding: 0.2rem 0.5rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
.stat span { font-size: 0.75rem; color: var(--muted); }
.death-saves { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; padding: 0.4rem 0.75rem; border-radius: var(--radius); background: var(--surface-2); }
.death-saves.dead { border: 2px solid var(--danger); }
.chip { border-radius: 999px; }
.sheet-body { flex: 1; display: grid; grid-template-columns: minmax(260px, 320px) minmax(0, 1fr); gap: 1rem; padding: 1rem; max-width: 1400px; width: 100%; margin: 0 auto; }
.sheet-main { min-width: 0; }
.tabs { display: flex; gap: 0.25rem; overflow-x: auto; margin-bottom: 0.75rem; }
.abilities { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1rem; }
.ability { flex-direction: column; min-height: 4.5rem; }
.check-list { list-style: none; padding: 0; margin: 0 0 1rem; }
.check-list button { width: 100%; justify-content: flex-start; border: none; background: transparent; }
.check-name { flex: 1; text-align: left; }
.dot { width: 0.7rem; height: 0.7rem; border-radius: 50%; border: 2px solid var(--muted); flex: none; }
.dot.on { background: var(--text); border-color: var(--text); }
.dot.double { box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--text); }
.note { display: grid; gap: 0.5rem; }
.rules-text { white-space: pre-line; }
@media (max-width: 900px) {
  .sheet-body { grid-template-columns: minmax(0, 1fr); padding: 0.5rem; }
}
```

In `src/ui/App.tsx`: importeer `Sheet` en zet in `Screen()` vóór `default:`:

```tsx
    case 'sheet':
      return <Sheet id={route.id} />;
```

- [ ] **Step 7: Tests, typecheck en build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS, geen typefouten, build slaagt. Handmatig: `npm run dev`, open een character, tik −5, zie "HP −5 · Undo", tik op *Undo*; versmal het venster onder 900 px en zie het tabblad *Abilities*.

- [ ] **Step 8: Commit**

```bash
git add src/ui src/i18n
git commit -m "feat: sheet met vaste balk, linkerkolom, death saves, rusten, ongedaan maken en notities" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 15: Tabbladen Acties en Spells

**Files:**
- Create: `src/ui/sheet/spell-logic.ts`, `src/ui/sheet/spell-logic.test.ts`
- Create: `src/ui/sheet/ActionsTab.tsx`, `src/ui/sheet/SpellsTab.tsx`, `src/ui/sheet/tabs.test.tsx`
- Modify: `src/ui/sheet/tabs.tsx`, `src/ui/sheet/sheet.css`, `src/i18n/en.json`, `src/i18n/nl.json`

**Interfaces:**
- Consumes: `DerivedSheet.attacks`, `.resources`, `.spellcasting`, `.classLevels[].columns` (Task 5), `setResourceUsed`, `setSlotsUsed`, `setPactSlotsUsed`, `useDice`, `plainParagraphs`, `ReadySession`.
- Produces:
  - `src/ui/sheet/spell-logic.ts`: `type SpellEntry = Character['choices']['spells'][number]`, `addSpell(spells, entry)`, `removeSpell(spells, index)`, `setPrepared(spells, index, prepared)`, `MAGIC_INITIATE_LISTS`, `MAGIC_INITIATE_ABILITIES`, `HIDDEN_COLUMNS`, `playColumns(sheet): Array<{ key: string; label: string; value: string }>`.
  - `ActionsTab({ session })` en `SpellsTab({ session })`, als eerste twee tabbladen in `sheetTabs`.
  - Knoppen: aanval `"<naam>: attack <bonus>"`, schade `"<naam>: damage <dobbelstenen>"`, resources `"Use <naam>"` / `"Regain <naam>"`, slots `"Level <n> slot <i>"`.

- [ ] **Step 1: Vertalingen toevoegen**

`src/i18n/en.json`:

```json
  "common.unknown": "Unknown: {id}",
  "tab.actions": "Actions",
  "tab.spells": "Spells",
  "actions.attacks": "Attacks",
  "actions.noAttacks": "No equipped weapons and no damage cantrips.",
  "actions.notProficient": "not proficient",
  "actions.classTable": "Class table",
  "actions.resources": "Resources",
  "actions.use": "Use {name}",
  "actions.regain": "Regain {name}",
  "slots.slot": "Level {level} slot {n}",
  "undo.slots": "Level {level} slots: {left}/{max}",
  "spells.noCaster": "No class with Spellcasting.",
  "spells.other": "Spells from feats",
  "spells.otherHelp": "Magic Initiate: choose the spell list and the spellcasting ability of the feat.",
  "spells.none": "No spells yet.",
  "spells.prepared": "{name} prepared",
  "spells.remove": "Remove {name}",
  "spells.addFor": "Add a {name} spell",
  "spells.add": "Add",
  "spells.list": "Spell list",
  "spells.addFromFeat": "Add spell from a feat"
```

`src/i18n/nl.json`:

```json
  "common.unknown": "Onbekend: {id}",
  "tab.actions": "Acties",
  "tab.spells": "Spells",
  "actions.attacks": "Aanvallen",
  "actions.noAttacks": "Geen uitgeruste wapens en geen damage-cantrips.",
  "actions.notProficient": "geen proficiency",
  "actions.classTable": "Class-tabel",
  "actions.resources": "Resources",
  "actions.use": "{name} gebruiken",
  "actions.regain": "{name} terugkrijgen",
  "slots.slot": "Level {level} slot {n}",
  "undo.slots": "Level {level} slots: {left}/{max}",
  "spells.noCaster": "Geen class met Spellcasting.",
  "spells.other": "Spells uit feats",
  "spells.otherHelp": "Magic Initiate: kies de spell list en de spellcasting ability van de feat.",
  "spells.none": "Nog geen spells.",
  "spells.prepared": "{name} voorbereid",
  "spells.remove": "{name} verwijderen",
  "spells.addFor": "{name}-spell toevoegen",
  "spells.add": "Toevoegen",
  "spells.list": "Spell list",
  "spells.addFromFeat": "Spell uit een feat toevoegen"
```

- [ ] **Step 2: De falende tests schrijven**

`src/ui/sheet/spell-logic.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readVendor } from '../../../scripts/convert-srd/vendor';
import { deriveSheet } from '../../rules/derive';
import { levels, makeCharacter, registry } from '../../rules/testing/fixtures';
import { addSpell, MAGIC_INITIATE_ABILITIES, MAGIC_INITIATE_LISTS, playColumns, removeSpell, setPrepared } from './spell-logic';

const fireBolt = { classId: 'srd:class:wizard', spellId: 'srd:spell:fire-bolt', prepared: true };

describe('spell list', () => {
  it('adds a spell once per spell list and ability', () => {
    const once = addSpell([], fireBolt);
    expect(addSpell(once, fireBolt)).toEqual([fireBolt]);
    expect(addSpell(once, { ...fireBolt, classId: 'srd:class:sorcerer' })).toHaveLength(2);
    expect(addSpell(once, { ...fireBolt, ability: 'cha' })).toHaveLength(2);
  });

  it('prepares and removes by position', () => {
    const two = [fireBolt, { ...fireBolt, spellId: 'srd:spell:magic-missile', prepared: false }];
    expect(setPrepared(two, 1, true)[1].prepared).toBe(true);
    expect(removeSpell(two, 0)).toEqual([two[1]]);
  });

  it('Magic Initiate lists and abilities come from the feat text', () => {
    const feat = readVendor('feats.md');
    expect(feat).toContain('from the Cleric, Druid, or Wizard spell list. Intelligence, Wisdom, or Charisma is your spellcasting ability');
    expect(MAGIC_INITIATE_LISTS).toEqual(['srd:class:cleric', 'srd:class:druid', 'srd:class:wizard']);
    expect(MAGIC_INITIATE_ABILITIES).toEqual(['int', 'wis', 'cha']);
  });
});

describe('playColumns', () => {
  it('shows the class table values that matter in play, not the ones shown elsewhere', () => {
    const sheet = deriveSheet(makeCharacter({ choices: { levels: [...levels('barbarian', 5), ...levels('wizard', 1)] } }), registry);
    expect(playColumns(sheet)).toEqual([
      { key: 'srd:class:barbarian:rages', label: 'Barbarian: Rages', value: '3' },
      { key: 'srd:class:barbarian:rage-damage', label: 'Barbarian: Rage Damage', value: '+2' },
      { key: 'srd:class:barbarian:weapon-mastery', label: 'Barbarian: Weapon Mastery', value: '3' },
    ]);
  });
});
```

`src/ui/sheet/tabs.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { kael } from '../../rules/testing/fixtures';
import { loadCharacter, saveCharacter } from '../../storage/characters';
import { renderApp, testDb } from '../testing/render';

async function openKael(patch: Parameters<typeof kael>[0] = {}) {
  const db = testDb();
  await saveCharacter(db, kael({ ...patch, state: { hpCurrent: 40 } }));
  renderApp('#/c/test', db);
  await screen.findByTestId('hp');
  return { db, user: userEvent.setup() };
}

describe('actions tab', () => {
  it('rolls attacks and counts down resources and spell slots', async () => {
    const { db, user } = await openKael({ choices: { spells: [{ classId: 'srd:class:wizard', spellId: 'srd:spell:fire-bolt', prepared: true }] } });
    await user.click(screen.getByRole('button', { name: 'Longsword: attack +6' }));
    expect(screen.getAllByText('Longsword: attack').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Fire Bolt: damage 2d10' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Use Second Wind' }));
    expect(screen.getByText('Second Wind 1/2')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Level 1 slot 1' }));
    expect(screen.getByRole('button', { name: 'Level 1 slot 1' }).getAttribute('aria-pressed')).toBe('true');
    await waitFor(async () =>
      expect((await loadCharacter(db, 'test'))?.state).toMatchObject({ resourcesUsed: { 'second-wind': 1 }, slotsUsed: { '1': 1 } }),
    );
  });
});

describe('spells tab', () => {
  it('shows the caster stats and adds and prepares a class spell', async () => {
    const { db, user } = await openKael();
    await user.click(screen.getByRole('tab', { name: 'Spells' }));
    expect(screen.getByText('Intelligence · Spell Attack +5 · Spell Save DC 13')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Add a Wizard spell'), 'srd:spell:magic-missile');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Magic Missile')).toBeTruthy();
    await user.click(screen.getByLabelText('Magic Missile prepared'));
    await waitFor(async () =>
      expect((await loadCharacter(db, 'test'))?.choices.spells).toEqual([{ classId: 'srd:class:wizard', spellId: 'srd:spell:magic-missile', prepared: false }]),
    );
  });

  it('adds a Magic Initiate cantrip with the ability chosen for the feat', async () => {
    const { db, user } = await openKael();
    await user.click(screen.getByRole('tab', { name: 'Spells' }));
    await user.selectOptions(screen.getByLabelText('Spell list'), 'srd:class:cleric');
    await user.selectOptions(screen.getByLabelText('Spellcasting ability'), 'wis');
    await user.selectOptions(screen.getByLabelText('Spell'), 'srd:spell:sacred-flame');
    await user.click(screen.getByRole('button', { name: 'Add spell from a feat' }));
    await waitFor(async () =>
      expect((await loadCharacter(db, 'test'))?.choices.spells).toEqual([
        { classId: 'srd:class:cleric', spellId: 'srd:spell:sacred-flame', prepared: true, ability: 'wis' },
      ]),
    );
  });
});
```

- [ ] **Step 3: Tests draaien en zien falen**

Run: `npm test -- src/ui/sheet`
Expected: FAIL, `Failed to resolve import "./spell-logic"` en de knoppen bestaan nog niet.

- [ ] **Step 4: Spell-logica**

`src/ui/sheet/spell-logic.ts`:

```ts
import type { Ability } from '../../content/constants';
import type { Character } from '../../model/character';
import type { DerivedSheet } from '../../rules/types';
import { titleCase } from '../format';

export type SpellEntry = Character['choices']['spells'][number];

/** The same spell from the same list with the same ability is added once. */
export function addSpell(spells: readonly SpellEntry[], entry: SpellEntry): SpellEntry[] {
  const same = (s: SpellEntry) => s.spellId === entry.spellId && s.classId === entry.classId && s.ability === entry.ability;
  return spells.some(same) ? [...spells] : [...spells, entry];
}

export function removeSpell(spells: readonly SpellEntry[], index: number): SpellEntry[] {
  return spells.filter((_, i) => i !== index);
}

export function setPrepared(spells: readonly SpellEntry[], index: number, prepared: boolean): SpellEntry[] {
  return spells.map((s, i) => (i === index ? { ...s, prepared } : s));
}

/** SRD Magic Initiate: the Cleric, Druid or Wizard spell list, with Intelligence, Wisdom or Charisma (checked in the test). */
export const MAGIC_INITIATE_LISTS = ['srd:class:cleric', 'srd:class:druid', 'srd:class:wizard'];
export const MAGIC_INITIATE_ABILITIES: Ability[] = ['int', 'wis', 'cha'];

/** Columns the sheet already shows elsewhere (proficiency bonus, spell counts, slots). */
export const HIDDEN_COLUMNS: ReadonlySet<string> = new Set(['proficiency-bonus', 'cantrips', 'prepared-spells', 'spell-slots', 'slot-level']);

/** Class table values at the current class level, e.g. "Barbarian: Rage Damage" +2 or "Rogue: Sneak Attack" 2d6. */
export function playColumns(sheet: DerivedSheet): Array<{ key: string; label: string; value: string }> {
  return sheet.classLevels.flatMap((cl) =>
    Object.entries(cl.columns)
      .filter(([key]) => !HIDDEN_COLUMNS.has(key))
      .map(([key, value]) => ({ key: `${cl.classId}:${key}`, label: `${cl.name}: ${titleCase(key)}`, value })),
  );
}
```

- [ ] **Step 5: Het tabblad Acties**

`src/ui/sheet/ActionsTab.tsx`:

```tsx
import { useI18n } from '../../i18n/i18n';
import { setPactSlotsUsed, setResourceUsed, setSlotsUsed } from '../../rules/actions';
import { useDice } from '../dice/DiceContext';
import { formatMod } from '../format';
import type { ReadySession } from './session';
import { playColumns } from './spell-logic';

function Slots({ session }: { session: ReadySession }) {
  const { character, sheet, commit } = session;
  const { t } = useI18n();
  const { slots, pact } = sheet.spellcasting;
  if (slots.length === 0 && !pact) return null;
  const boxes = (level: number, max: number, used: number, set: (used: number) => void) =>
    Array.from({ length: max }, (_, i) => (
      <button
        key={i}
        type="button"
        className={i < used ? 'slot used' : 'slot'}
        aria-pressed={i < used}
        aria-label={t('slots.slot', { level, n: i + 1 })}
        onClick={() => set(i < used ? i : i + 1)}
      />
    ));
  return (
    <section>
      <h2>Spell Slots</h2>
      {slots.map((s) => (
        <div key={s.level} className="row slot-row">
          <span>Level {s.level}</span>
          {boxes(s.level, s.max, s.used, (used) => commit(setSlotsUsed(character, s.level, used, sheet), t('undo.slots', { level: s.level, left: s.max - used, max: s.max })))}
        </div>
      ))}
      {pact && (
        <div className="row slot-row">
          <span>Pact Magic (Level {pact.slotLevel})</span>
          {boxes(pact.slotLevel, pact.slots, pact.used, (used) => commit(setPactSlotsUsed(character, used, sheet), `Pact Magic: ${pact.slots - used}/${pact.slots}`))}
        </div>
      )}
    </section>
  );
}

/** Spec §8: attacks, resources and spell slots, plus the class table values for this level. */
export function ActionsTab({ session }: { session: ReadySession }) {
  const { character, sheet, commit } = session;
  const { t } = useI18n();
  const dice = useDice();
  const columns = playColumns(sheet);
  return (
    <div className="actions-tab">
      <section>
        <h2>{t('actions.attacks')}</h2>
        {sheet.attacks.length === 0 ? (
          <p className="muted">{t('actions.noAttacks')}</p>
        ) : (
          <ul className="attack-list">
            {sheet.attacks.map((a) => (
              <li key={a.id} className="attack">
                <span className="attack-name">
                  {a.name}
                  {!a.proficient && <span className="muted"> ({t('actions.notProficient')})</span>}
                </span>
                {a.toHit !== undefined ? (
                  <button type="button" aria-label={`${a.name}: attack ${formatMod(a.toHit)}`} onClick={() => dice.rollD20(`${a.name}: attack`, a.toHit!)}>
                    {formatMod(a.toHit)}
                  </button>
                ) : (
                  <span>{a.saveDC !== undefined ? `DC ${a.saveDC}${a.saveAbility ? ` ${a.saveAbility.toUpperCase()}` : ''}` : '–'}</span>
                )}
                <button type="button" aria-label={`${a.name}: damage ${a.damage}`} onClick={() => dice.roll(`${a.name}: damage`, a.damage, { damage: true })}>
                  {a.damage} {a.damageType}
                </button>
                <span className="muted">{[...a.properties, ...(a.mastery ? [`Mastery: ${a.mastery}`] : [])].join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {columns.length > 0 && (
        <section>
          <h2>{t('actions.classTable')}</h2>
          <dl className="columns">
            {columns.map((c) => (
              <div key={c.key}>
                <dt>{c.label}</dt>
                <dd>{c.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {sheet.resources.length > 0 && (
        <section>
          <h2>{t('actions.resources')}</h2>
          <ul className="resource-list">
            {sheet.resources.map((r) => {
              const left = r.max - r.used;
              return (
                <li key={r.key} className="row resource">
                  <span className="resource-name">
                    {r.name} <span className="muted">({r.recharge === 'short' ? 'Short Rest' : 'Long Rest'})</span>
                  </span>
                  <button type="button" aria-label={t('actions.use', { name: r.name })} disabled={left === 0} onClick={() => commit(setResourceUsed(character, r.key, r.used + 1, sheet), `${r.name} ${left - 1}/${r.max}`)}>
                    −
                  </button>
                  <strong>
                    {left}/{r.max}
                  </strong>
                  <button type="button" aria-label={t('actions.regain', { name: r.name })} disabled={r.used === 0} onClick={() => commit(setResourceUsed(character, r.key, r.used - 1, sheet), `${r.name} ${left + 1}/${r.max}`)}>
                    +
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <Slots session={session} />
    </div>
  );
}
```

- [ ] **Step 6: Het tabblad Spells**

`src/ui/sheet/SpellsTab.tsx`:

```tsx
import { useState } from 'react';
import type { Ability } from '../../content/constants';
import { useI18n } from '../../i18n/i18n';
import { useAppData } from '../data';
import { abilityName, formatMod, plainParagraphs } from '../format';
import type { ReadySession } from './session';
import { addSpell, MAGIC_INITIATE_ABILITIES, MAGIC_INITIATE_LISTS, removeSpell, setPrepared, type SpellEntry } from './spell-logic';

type Indexed = { entry: SpellEntry; index: number };

function SpellList({ items, onPrepare, onRemove }: { items: Indexed[]; onPrepare: (index: number, on: boolean) => void; onRemove: (index: number) => void }) {
  const { registry } = useAppData();
  const { t } = useI18n();
  if (items.length === 0) return <p className="muted">{t('spells.none')}</p>;
  const levelOf = (item: Indexed) => registry.getOf('spell', item.entry.spellId)?.level ?? 99;
  return (
    <ul className="spell-list">
      {[...items].sort((a, b) => levelOf(a) - levelOf(b)).map(({ entry, index }) => {
        const spell = registry.getOf('spell', entry.spellId);
        const name = spell?.name ?? t('common.unknown', { id: entry.spellId });
        const tags = spell
          ? [spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`, spell.school, ...(spell.concentration ? ['Concentration'] : []), ...(spell.ritual ? ['Ritual'] : []), ...(entry.ability ? [abilityName(entry.ability)] : [])]
          : [];
        return (
          <li key={`${entry.classId}|${entry.spellId}|${entry.ability ?? ''}`} className="spell-row">
            {spell && spell.level > 0 && (
              <input type="checkbox" aria-label={t('spells.prepared', { name })} checked={entry.prepared} onChange={(e) => onPrepare(index, e.target.checked)} />
            )}
            <details>
              <summary>
                <span className="spell-name">{name}</span> <span className="muted">{tags.join(' · ')}</span>
              </summary>
              {spell && (
                <>
                  <p className="muted">
                    {spell.castingTime} · {spell.range} · {spell.components} · {spell.duration}
                  </p>
                  {plainParagraphs(spell.text).map((p, i) => (
                    <p key={i} className="rules-text">
                      {p}
                    </p>
                  ))}
                </>
              )}
            </details>
            <button type="button" aria-label={t('spells.remove', { name })} onClick={() => onRemove(index)}>
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AddClassSpell({ classId, className, onAdd }: { classId: string; className: string; onAdd: (spellId: string) => void }) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const [spellId, setSpellId] = useState('');
  const options = registry
    .list('spell')
    .filter((s) => s.classes.includes(classId))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  return (
    <div className="row">
      <select aria-label={t('spells.addFor', { name: className })} value={spellId} onChange={(e) => setSpellId(e.target.value)}>
        <option value="">–</option>
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.level === 0 ? 'Cantrip' : `Level ${s.level}`})
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!spellId}
        onClick={() => {
          onAdd(spellId);
          setSpellId('');
        }}
      >
        {t('spells.add')}
      </button>
    </div>
  );
}

/** Magic Initiate: two cantrips and one level 1 spell from one list, with the ability chosen for the feat. */
function AddFeatSpell({ onAdd }: { onAdd: (entry: SpellEntry) => void }) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const [listId, setListId] = useState(MAGIC_INITIATE_LISTS[0]);
  const [ability, setAbility] = useState<Ability>(MAGIC_INITIATE_ABILITIES[0]);
  const [spellId, setSpellId] = useState('');
  const options = registry
    .list('spell')
    .filter((s) => s.classes.includes(listId) && s.level <= 1)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  return (
    <div className="row">
      <select
        aria-label={t('spells.list')}
        value={listId}
        onChange={(e) => {
          setListId(e.target.value);
          setSpellId('');
        }}
      >
        {MAGIC_INITIATE_LISTS.map((id) => (
          <option key={id} value={id}>
            {registry.get(id)?.name ?? id}
          </option>
        ))}
      </select>
      <select aria-label="Spellcasting ability" value={ability} onChange={(e) => setAbility(e.target.value as Ability)}>
        {MAGIC_INITIATE_ABILITIES.map((a) => (
          <option key={a} value={a}>
            {abilityName(a)}
          </option>
        ))}
      </select>
      <select aria-label="Spell" value={spellId} onChange={(e) => setSpellId(e.target.value)}>
        <option value="">–</option>
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.level === 0 ? 'Cantrip' : `Level ${s.level}`})
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!spellId}
        onClick={() => {
          onAdd({ classId: listId, spellId, prepared: true, ability });
          setSpellId('');
        }}
      >
        {t('spells.addFromFeat')}
      </button>
    </div>
  );
}

/** Spec §7: casting ability, spell attack and save DC per class, prepared spells against the class table, spells from feats. */
export function SpellsTab({ session }: { session: ReadySession }) {
  const { character, sheet, commit } = session;
  const { registry } = useAppData();
  const { t } = useI18n();
  const spells = character.choices.spells;
  const setSpells = (next: SpellEntry[]) => commit({ ...character, choices: { ...character.choices, spells: next } });
  const indexed: Indexed[] = spells.map((entry, index) => ({ entry, index }));
  const casters = new Set(sheet.spellcasting.classes.map((c) => c.classId));
  const isCantrip = (spellId: string) => registry.getOf('spell', spellId)?.level === 0;
  const prepare = (index: number, on: boolean) => setSpells(setPrepared(spells, index, on));
  const remove = (index: number) => setSpells(removeSpell(spells, index));
  return (
    <div className="spells-tab">
      {sheet.spellcasting.classes.length === 0 && <p className="muted">{t('spells.noCaster')}</p>}
      {sheet.spellcasting.classes.map((c) => {
        const own = indexed.filter(({ entry }) => entry.classId === c.classId && !entry.ability);
        const cantrips = own.filter(({ entry }) => isCantrip(entry.spellId)).length;
        const prepared = own.filter(({ entry }) => entry.prepared && !isCantrip(entry.spellId)).length;
        return (
          <section key={c.classId} className="card">
            <h2>{c.name}</h2>
            <p>
              {abilityName(c.ability)} · Spell Attack {formatMod(c.attack)} · Spell Save DC {c.dc}
            </p>
            <p className="muted">
              Cantrips {cantrips}/{c.cantripsMax ?? '–'} · Prepared {prepared}/{c.preparedMax ?? '–'}
            </p>
            <SpellList items={own} onPrepare={prepare} onRemove={remove} />
            <AddClassSpell classId={c.classId} className={c.name} onAdd={(spellId) => setSpells(addSpell(spells, { classId: c.classId, spellId, prepared: true }))} />
          </section>
        );
      })}
      <section className="card">
        <h2>{t('spells.other')}</h2>
        <p className="muted">{t('spells.otherHelp')}</p>
        <SpellList items={indexed.filter(({ entry }) => entry.ability !== undefined || !casters.has(entry.classId))} onPrepare={prepare} onRemove={remove} />
        <AddFeatSpell onAdd={(entry) => setSpells(addSpell(spells, entry))} />
      </section>
    </div>
  );
}
```

- [ ] **Step 7: Tabbladen en stijl**

In `src/ui/sheet/tabs.tsx`: importeer `ActionsTab` en `SpellsTab`, en zet in de lijst vóór het tabblad `notes`:

```tsx
    { id: 'actions', label: t('tab.actions'), render: (session) => <ActionsTab session={session} /> },
    { id: 'spells', label: t('tab.spells'), render: (session) => <SpellsTab session={session} /> },
```

Onderaan `src/ui/sheet/sheet.css`:

```css
.attack-list, .resource-list, .spell-list { list-style: none; padding: 0; margin: 0 0 1rem; display: grid; gap: 0.4rem; }
.attack { display: grid; grid-template-columns: minmax(8rem, 1fr) auto auto; gap: 0.4rem; align-items: center; }
.attack > .muted { grid-column: 1 / -1; font-size: 0.85rem; }
.resource-name { flex: 1; }
.columns { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.5rem; }
.columns dt { color: var(--muted); font-size: 0.85rem; }
.columns dd { margin: 0; font-weight: 700; }
.slot-row { gap: 0.3rem; }
.slot { min-width: var(--tap); border-radius: 50%; }
.slot.used { background: var(--muted); }
.spell-row { display: flex; gap: 0.5rem; align-items: flex-start; }
.spell-row details { flex: 1; }
.spell-row summary { min-height: var(--tap); display: flex; align-items: center; gap: 0.4rem; cursor: pointer; flex-wrap: wrap; }
```

- [ ] **Step 8: Tests, typecheck en build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS, geen typefouten, build slaagt.

- [ ] **Step 9: Commit**

```bash
git add src/ui src/i18n
git commit -m "feat: tabbladen Acties en Spells met aanvallen, resources, slots en Magic Initiate" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 16: Tabbladen Spullen en Features

**Files:**
- Create: `src/ui/sheet/inventory-logic.ts`, `src/ui/sheet/override-targets.ts`, `src/ui/sheet/feature-groups.ts`, `src/ui/sheet/sheet-logic.test.ts`
- Create: `src/ui/sheet/InventoryTab.tsx`, `src/ui/sheet/FeaturesTab.tsx`
- Modify: `src/ui/sheet/tabs.tsx`, `src/ui/sheet/tabs.test.tsx`, `src/ui/sheet/sheet.css`, `src/i18n/en.json`, `src/i18n/nl.json`

**Interfaces:**
- Consumes: `InventoryItem`, `BonusTargetSchema`, `DerivedSheet.features`, `.bonusParts` (Task 5), `optionsFor` (Task 4), `NumberInput`, `Dialog`, `WarningList`, `plainParagraphs`.
- Produces:
  - `src/ui/sheet/inventory-logic.ts`: `MAX_ATTUNED = 3`, `newItem(entry, id?)`, `updateItem(items, id, patch)`, `removeItem(items, id)`, `setQty(items, id, qty)`, `setCoin(currency, coin, value)`.
  - `src/ui/sheet/override-targets.ts`: `interface TargetOption { value: string; label: string }`, `overrideTargets(character, registry): TargetOption[]`, `targetLabel(target, options): string`.
  - `src/ui/sheet/feature-groups.ts`: `interface FeatureGroup { key: string; title: string; features: ActiveFeature[] }`, `groupFeatures(features): FeatureGroup[]`.
  - `InventoryTab({ session })` en `FeaturesTab({ session })` in `sheetTabs`, tussen Spells en Notities.

- [ ] **Step 1: Vertalingen toevoegen**

`src/i18n/en.json`:

```json
  "tab.inventory": "Inventory",
  "tab.features": "Features",
  "inventory.search": "Search items or type a name",
  "inventory.addCustom": "Add \"{name}\" as your own item",
  "inventory.empty": "Nothing in the inventory yet.",
  "inventory.item": "Item",
  "inventory.qtyHeader": "Qty",
  "inventory.equippedHeader": "Equipped",
  "inventory.attunedHeader": "Attuned",
  "inventory.qty": "Quantity of {name}",
  "inventory.equipped": "{name} equipped",
  "inventory.attuned": "{name} attuned",
  "inventory.remove": "Remove {name}",
  "inventory.removeTitle": "Remove item",
  "inventory.removeConfirm": "Remove {name} from the inventory?",
  "inventory.tooManyAttuned": "Attuned to {count} items; the SRD allows {max}.",
  "inventory.currency": "Coins",
  "features.placeholder": "Not filled in yet",
  "features.placeholderHelp": "Skeleton feature without text. You will be able to fill it in in the library.",
  "features.chooseOption": "no choice yet (Edit)",
  "features.bonuses": "Where the numbers come from",
  "features.override": "override",
  "overrides.title": "Overrides",
  "overrides.help": "Magic items, DM rulings and homebrew: a fixed plus or minus on a number, with a reason.",
  "overrides.target": "Number",
  "overrides.value": "Value",
  "overrides.reason": "Reason",
  "overrides.reasonPlaceholder": "e.g. Ring of Protection",
  "overrides.add": "Add override",
  "overrides.remove": "Remove override {name}"
```

`src/i18n/nl.json`:

```json
  "tab.inventory": "Spullen",
  "tab.features": "Features",
  "inventory.search": "Zoek een item of typ een naam",
  "inventory.addCustom": "\"{name}\" toevoegen als eigen item",
  "inventory.empty": "Nog niets in de inventory.",
  "inventory.item": "Item",
  "inventory.qtyHeader": "Aantal",
  "inventory.equippedHeader": "Uitgerust",
  "inventory.attunedHeader": "Attuned",
  "inventory.qty": "Aantal {name}",
  "inventory.equipped": "{name} uitgerust",
  "inventory.attuned": "{name} attuned",
  "inventory.remove": "{name} verwijderen",
  "inventory.removeTitle": "Item verwijderen",
  "inventory.removeConfirm": "{name} uit de inventory halen?",
  "inventory.tooManyAttuned": "Attuned aan {count} items; de SRD staat er {max} toe.",
  "inventory.currency": "Geld",
  "features.placeholder": "Nog niet ingevuld",
  "features.placeholderHelp": "Skelet-feature zonder tekst. Aanvullen kan straks in de bibliotheek.",
  "features.chooseOption": "nog geen keuze (Bewerken)",
  "features.bonuses": "Waar de getallen vandaan komen",
  "features.override": "aanpassing",
  "overrides.title": "Aanpassingen",
  "overrides.help": "Magische items, DM-regels en homebrew: een vaste plus of min op een getal, met een reden.",
  "overrides.target": "Getal",
  "overrides.value": "Waarde",
  "overrides.reason": "Reden",
  "overrides.reasonPlaceholder": "bijv. Ring of Protection",
  "overrides.add": "Aanpassing toevoegen",
  "overrides.remove": "Aanpassing {name} verwijderen"
```

- [ ] **Step 2: De falende tests schrijven**

`src/ui/sheet/sheet-logic.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readVendor } from '../../../scripts/convert-srd/vendor';
import { BonusTargetSchema } from '../../content/schema';
import { deriveSheet } from '../../rules/derive';
import { kael, registry } from '../../rules/testing/fixtures';
import { groupFeatures } from './feature-groups';
import { MAX_ATTUNED, newItem, removeItem, setCoin, setQty, updateItem } from './inventory-logic';
import { overrideTargets, targetLabel } from './override-targets';

describe('inventory', () => {
  const items = [newItem({ customName: 'Rope', qty: 1, equipped: false, attuned: false }, 'a'), newItem({ itemId: 'srd:armor:chain-mail', qty: 1, equipped: false, attuned: false }, 'b')];

  it('changes and removes items by id', () => {
    expect(updateItem(items, 'b', { equipped: true })[1].equipped).toBe(true);
    expect(removeItem(items, 'a').map((i) => i.id)).toEqual(['b']);
  });

  it('quantities and coins are whole numbers from 0; anything else changes nothing', () => {
    expect(setQty(items, 'a', 2.6)[0].qty).toBe(3);
    expect(setQty(items, 'a', -4)[0].qty).toBe(0);
    expect(setQty(items, 'a', NaN)[0].qty).toBe(1);
    const coins = { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 };
    expect(setCoin(coins, 'gp', 12.2).gp).toBe(12);
    expect(setCoin(coins, 'gp', NaN)).toEqual(coins);
  });

  it('new items get ids that fit attack:<id>', () => {
    expect(BonusTargetSchema.safeParse(`attack:${newItem({ qty: 1, equipped: false, attuned: false }).id}`).success).toBe(true);
  });

  it('three attuned items at most (SRD)', () => {
    expect(readVendor('equipment.md')).toContain('You can be attuned to no more than three magic items at a time.');
    expect(MAX_ATTUNED).toBe(3);
  });
});

describe('override targets', () => {
  const options = overrideTargets(kael(), registry);

  it('every target is a valid bonus target', () => {
    for (const option of options) expect(BonusTargetSchema.safeParse(option.value).success, option.value).toBe(true);
  });

  it('weapons in the inventory get their own attack and damage targets', () => {
    expect(targetLabel('attack:i3', options)).toBe('Attack (Longsword)');
    expect(targetLabel('skill:sleight-of-hand', options)).toBe('Sleight of Hand');
    expect(targetLabel('attack:gone', options)).toBe('attack:gone');
  });
});

describe('groupFeatures', () => {
  it('groups by class, subclass, species and feats, in sheet order', () => {
    expect(groupFeatures(deriveSheet(kael(), registry).features).map((g) => g.title)).toEqual(['Fighter', 'Champion', 'Wizard', 'Human', 'Feats']);
  });
});
```

Voeg toe aan `src/ui/sheet/tabs.test.tsx`:

```tsx
describe('inventory tab', () => {
  it('adds an SRD item and an own item, equips armor and never stores an empty quantity', async () => {
    const { db, user } = await openKael({ inventory: [] });
    expect(screen.getByTestId('ac').textContent).toBe('11');
    await user.click(screen.getByRole('tab', { name: 'Inventory' }));
    await user.type(screen.getByLabelText('Search items or type a name'), 'chain mail');
    await user.click(screen.getByRole('button', { name: 'Chain Mail (Armor)' }));
    await user.click(screen.getByLabelText('Chain Mail equipped'));
    expect(screen.getByTestId('ac').textContent).toBe('17');
    await user.type(screen.getByLabelText('Search items or type a name'), 'Lucky coin');
    await user.click(screen.getByRole('button', { name: 'Add "Lucky coin" as your own item' }));
    const qty = screen.getByLabelText('Quantity of Lucky coin');
    await user.clear(qty);
    await user.tab();
    expect((qty as HTMLInputElement).value).toBe('1');
    await waitFor(async () =>
      expect((await loadCharacter(db, 'test'))?.inventory.map((i) => [i.customName ?? i.itemId, i.qty, i.equipped])).toEqual([
        ['srd:armor:chain-mail', 1, true],
        ['Lucky coin', 1, false],
      ]),
    );
  });
});

describe('features tab', () => {
  it('groups features with SRD text and adds an override that changes the AC', async () => {
    const { user } = await openKael();
    await user.click(screen.getByRole('tab', { name: 'Features' }));
    expect(screen.getByRole('heading', { name: 'Champion' })).toBeTruthy();
    expect(screen.getByText('Second Wind')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Number'), 'ac');
    await user.type(screen.getByLabelText('Reason'), 'Ring of Protection');
    await user.click(screen.getByRole('button', { name: 'Add override' }));
    expect(screen.getByTestId('ac').textContent).toBe('20');
    expect(screen.getByText(/\+1 Ring of Protection \(override\)/)).toBeTruthy();
  });
});
```

- [ ] **Step 3: Tests draaien en zien falen**

Run: `npm test -- src/ui/sheet`
Expected: FAIL, de nieuwe modules en tabbladen ontbreken.

- [ ] **Step 4: Logica voor spullen, aanpassingen en features**

`src/ui/sheet/inventory-logic.ts`:

```ts
import type { Character, InventoryItem } from '../../model/character';

/** SRD Equipment, Attunement: no more than three magic items at a time. */
export const MAX_ATTUNED = 3;

type Currency = Character['currency'];

/** crypto.randomUUID() ids fit attack:<id> and damage:<id> (Task 4). */
export function newItem(entry: Omit<InventoryItem, 'id'>, id: string = crypto.randomUUID()): InventoryItem {
  return { id, ...entry };
}

export function updateItem(items: readonly InventoryItem[], id: string, patch: Partial<Omit<InventoryItem, 'id'>>): InventoryItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function removeItem(items: readonly InventoryItem[], id: string): InventoryItem[] {
  return items.filter((item) => item.id !== id);
}

/** Whole numbers from 0; a non-number keeps the old quantity. */
export function setQty(items: readonly InventoryItem[], id: string, qty: number): InventoryItem[] {
  return Number.isFinite(qty) ? updateItem(items, id, { qty: Math.max(0, Math.round(qty)) }) : [...items];
}

export function setCoin(currency: Currency, coin: keyof Currency, value: number): Currency {
  return Number.isFinite(value) ? { ...currency, [coin]: Math.max(0, Math.round(value)) } : currency;
}
```

`src/ui/sheet/override-targets.ts`:

```ts
import { ABILITIES, SKILL_IDS } from '../../content/constants';
import type { ContentRegistry } from '../../content/registry';
import type { Character } from '../../model/character';
import { abilityName, titleCase } from '../format';

export interface TargetOption {
  value: string;
  label: string;
}

const FIXED: TargetOption[] = [
  { value: 'ac', label: 'AC' },
  { value: 'initiative', label: 'Initiative' },
  { value: 'speed', label: 'Speed' },
  { value: 'hpMax', label: 'Hit Point maximum' },
  { value: 'passivePerception', label: 'Passive Perception' },
  { value: 'spellAttack', label: 'Spell Attack' },
  { value: 'spellDC', label: 'Spell Save DC' },
  { value: 'attack', label: 'Attack rolls' },
  { value: 'damage', label: 'Damage rolls' },
];

/** Every number an override can change (spec §5), with each weapon in the inventory as attack:<id> and damage:<id>. */
export function overrideTargets(character: Character, registry: ContentRegistry): TargetOption[] {
  const weapons = character.inventory.filter((item) => item.itemId !== undefined && registry.getOf('weapon', item.itemId));
  return [
    ...FIXED,
    ...ABILITIES.flatMap((a) => [
      { value: `ability:${a}`, label: abilityName(a) },
      { value: `abilityMax:${a}`, label: `${abilityName(a)} maximum` },
      { value: `save:${a}`, label: `${abilityName(a)} save` },
    ]),
    ...SKILL_IDS.map((s) => ({ value: `skill:${s}`, label: titleCase(s) })),
    ...weapons.flatMap((w) => {
      const name = w.customName || registry.get(w.itemId ?? '')?.name || w.id;
      return [
        { value: `attack:${w.id}`, label: `Attack (${name})` },
        { value: `damage:${w.id}`, label: `Damage (${name})` },
      ];
    }),
  ];
}

export function targetLabel(target: string, options: readonly TargetOption[]): string {
  return options.find((o) => o.value === target)?.label ?? target;
}
```

`src/ui/sheet/feature-groups.ts`:

```ts
import type { ActiveFeature } from '../../rules/types';

export interface FeatureGroup {
  key: string;
  title: string;
  features: ActiveFeature[];
}

/** Features per class, subclass, species and one group for feats. Chosen options show inside their parent feature. */
export function groupFeatures(features: readonly ActiveFeature[]): FeatureGroup[] {
  const groups: FeatureGroup[] = [];
  for (const feature of features) {
    if (feature.origin === 'option') continue;
    const title = feature.origin === 'feat' ? 'Feats' : feature.ownerName;
    const key = `${feature.origin}:${title}`;
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, title, features: [] };
      groups.push(group);
    }
    group.features.push(feature);
  }
  return groups;
}
```

- [ ] **Step 5: Het tabblad Spullen**

`src/ui/sheet/InventoryTab.tsx`:

```tsx
import { useState } from 'react';
import type { ContentItem } from '../../content/schema';
import { useI18n } from '../../i18n/i18n';
import type { Character, InventoryItem } from '../../model/character';
import { Dialog } from '../components/Dialog';
import { NumberInput } from '../components/NumberInput';
import { useAppData } from '../data';
import { MAX_ATTUNED, newItem, removeItem, setCoin, setQty, updateItem } from './inventory-logic';
import type { ReadySession } from './session';

const TYPE_LABELS: Partial<Record<ContentItem['type'], string>> = { weapon: 'Weapon', armor: 'Armor', gear: 'Gear', 'magic-item': 'Magic Item' };
const COINS: Array<keyof Character['currency']> = ['cp', 'sp', 'ep', 'gp', 'pp'];

function AddItem({ onAdd }: { onAdd: (item: InventoryItem) => void }) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const text = query.trim();
  const items = [...registry.list('weapon'), ...registry.list('armor'), ...registry.list('gear'), ...registry.list('magic-item')];
  const matches = text.length < 2 ? [] : items.filter((i) => i.name.toLowerCase().includes(text.toLowerCase())).slice(0, 20);
  const add = (entry: Omit<InventoryItem, 'id'>) => {
    onAdd(newItem(entry));
    setQuery('');
  };
  return (
    <section className="add-item">
      <input aria-label={t('inventory.search')} placeholder={t('inventory.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      {matches.length > 0 && (
        <ul className="matches">
          {matches.map((i) => (
            <li key={i.id}>
              <button type="button" aria-label={`${i.name} (${TYPE_LABELS[i.type]})`} onClick={() => add({ itemId: i.id, qty: 1, equipped: false, attuned: false })}>
                {i.name} <span className="muted">{TYPE_LABELS[i.type]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {text && (
        <button type="button" onClick={() => add({ customName: text, qty: 1, equipped: false, attuned: false })}>
          {t('inventory.addCustom', { name: text })}
        </button>
      )}
    </section>
  );
}

/** Spec §8: inventory, coins and attunement. Equipping armor or a weapon changes AC and attacks right away. */
export function InventoryTab({ session }: { session: ReadySession }) {
  const { character, commit } = session;
  const { registry } = useAppData();
  const { t } = useI18n();
  const [toRemove, setToRemove] = useState<{ id: string; name: string }>();
  const setInventory = (inventory: InventoryItem[]) => commit({ ...character, inventory });
  const attuned = character.inventory.filter((i) => i.attuned).length;
  return (
    <div className="inventory-tab">
      <AddItem onAdd={(item) => setInventory([...character.inventory, item])} />
      {attuned > MAX_ATTUNED && <p className="warning">{t('inventory.tooManyAttuned', { count: attuned, max: MAX_ATTUNED })}</p>}
      {character.inventory.length === 0 ? (
        <p className="muted">{t('inventory.empty')}</p>
      ) : (
        <table className="inventory">
          <thead>
            <tr>
              <th>{t('inventory.item')}</th>
              <th>{t('inventory.qtyHeader')}</th>
              <th>{t('inventory.equippedHeader')}</th>
              <th>{t('inventory.attunedHeader')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {character.inventory.map((entry) => {
              const def = entry.itemId ? registry.get(entry.itemId) : undefined;
              const name = entry.customName || def?.name || t('common.unknown', { id: entry.itemId ?? entry.id });
              const equippable = def?.type === 'weapon' || def?.type === 'armor';
              const attunable = def?.type === 'magic-item' && def.attunement;
              return (
                <tr key={entry.id}>
                  <td>
                    {name}
                    {def?.type === 'magic-item' && <span className="muted"> · {def.rarity}</span>}
                  </td>
                  <td>
                    <NumberInput aria-label={t('inventory.qty', { name })} min={0} value={entry.qty} onChange={(qty) => setInventory(setQty(character.inventory, entry.id, qty))} />
                  </td>
                  <td>
                    {equippable && (
                      <input type="checkbox" aria-label={t('inventory.equipped', { name })} checked={entry.equipped} onChange={(e) => setInventory(updateItem(character.inventory, entry.id, { equipped: e.target.checked }))} />
                    )}
                  </td>
                  <td>
                    {attunable && (
                      <input type="checkbox" aria-label={t('inventory.attuned', { name })} checked={entry.attuned} onChange={(e) => setInventory(updateItem(character.inventory, entry.id, { attuned: e.target.checked }))} />
                    )}
                  </td>
                  <td>
                    <button type="button" aria-label={t('inventory.remove', { name })} onClick={() => setToRemove({ id: entry.id, name })}>
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <section>
        <h2>{t('inventory.currency')}</h2>
        <div className="row coins">
          {COINS.map((coin) => (
            <label key={coin}>
              {coin.toUpperCase()}
              <NumberInput min={0} value={character.currency[coin]} onChange={(value) => commit({ ...character, currency: setCoin(character.currency, coin, value) })} />
            </label>
          ))}
        </div>
      </section>
      {toRemove && (
        <Dialog
          title={t('inventory.removeTitle')}
          onClose={() => setToRemove(undefined)}
          actions={
            <button
              type="button"
              className="danger"
              onClick={() => {
                setInventory(removeItem(character.inventory, toRemove.id));
                setToRemove(undefined);
              }}
            >
              {t('common.delete')}
            </button>
          }
        >
          <p>{t('inventory.removeConfirm', { name: toRemove.name })}</p>
        </Dialog>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Het tabblad Features**

`src/ui/sheet/FeaturesTab.tsx`:

```tsx
import { useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import { optionsFor } from '../../rules/choices';
import { NumberInput } from '../components/NumberInput';
import { WarningList } from '../components/WarningList';
import { useAppData } from '../data';
import { formatMod, plainParagraphs } from '../format';
import { groupFeatures } from './feature-groups';
import { overrideTargets, targetLabel } from './override-targets';
import type { ReadySession } from './session';

/** Spec §4: overrides stay visible as the source of a number, next to the feature effects. */
function BonusBreakdown({ session }: { session: ReadySession }) {
  const { character, sheet } = session;
  const { registry } = useAppData();
  const { t } = useI18n();
  if (sheet.bonusParts.length === 0) return null;
  const options = overrideTargets(character, registry);
  const targets = [...new Set(sheet.bonusParts.map((p) => p.target))];
  return (
    <section>
      <h2>{t('features.bonuses')}</h2>
      <dl className="breakdown">
        {targets.map((target) => (
          <div key={target}>
            <dt>{targetLabel(target, options)}</dt>
            <dd>
              {sheet.bonusParts
                .filter((p) => p.target === target)
                .map((p) => `${formatMod(p.value)} ${p.source || '?'}${p.override ? ` (${t('features.override')})` : ''}`)
                .join(' · ')}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function OverridesEditor({ session }: { session: ReadySession }) {
  const { character, commit } = session;
  const { registry } = useAppData();
  const { t } = useI18n();
  const options = overrideTargets(character, registry);
  const [target, setTarget] = useState('ac');
  const [value, setValue] = useState(1);
  const [reason, setReason] = useState('');
  const add = () => {
    if (!Number.isInteger(value) || value === 0) return;
    commit({ ...character, overrides: [...character.overrides, { id: crypto.randomUUID(), target, value, reason: reason.trim() }] });
    setReason('');
  };
  return (
    <section>
      <h2>{t('overrides.title')}</h2>
      <p className="muted">{t('overrides.help')}</p>
      <ul className="overrides">
        {character.overrides.map((o) => (
          <li key={o.id} className="row">
            <span>
              {targetLabel(o.target, options)} {formatMod(o.value)}
              {o.reason ? ` · ${o.reason}` : ''}
            </span>
            <button
              type="button"
              aria-label={t('overrides.remove', { name: targetLabel(o.target, options) })}
              onClick={() => commit({ ...character, overrides: character.overrides.filter((x) => x.id !== o.id) })}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="row">
        <select aria-label={t('overrides.target')} value={target} onChange={(e) => setTarget(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <NumberInput aria-label={t('overrides.value')} value={value} onChange={(v) => setValue(Math.round(v))} />
        <input aria-label={t('overrides.reason')} placeholder={t('overrides.reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="button" onClick={add}>
          {t('overrides.add')}
        </button>
      </div>
    </section>
  );
}

/** Spec §8: features per class, subclass, species and feats with their SRD text; placeholders for unfilled skeletons. */
export function FeaturesTab({ session }: { session: ReadySession }) {
  const { character, sheet } = session;
  const { registry } = useAppData();
  const { t } = useI18n();
  const chosen = new Set(character.choices.featureOptions);
  return (
    <div className="features-tab">
      <WarningList warnings={sheet.warnings} />
      {groupFeatures(sheet.features).map((group) => (
        <section key={group.key}>
          <h2>{group.title}</h2>
          {group.features.map((feature) => {
            const picked = optionsFor(registry, feature.id).filter((o) => chosen.has(o.id));
            const hasOptions = optionsFor(registry, feature.id).length > 0;
            return (
              <details key={feature.id} className="feature">
                <summary>
                  <span className="feature-name">{feature.placeholder ? t('features.placeholder') : feature.name}</span>
                  {feature.level !== undefined && <span className="muted"> · Level {feature.level}</span>}
                  {hasOptions && (
                    <span className={picked.length > 0 ? 'muted' : 'warning'}> · {picked.length > 0 ? picked.map((o) => o.name).join(', ') : t('features.chooseOption')}</span>
                  )}
                </summary>
                {feature.placeholder ? (
                  <p className="muted">{t('features.placeholderHelp')}</p>
                ) : (
                  plainParagraphs(feature.text).map((p, i) => (
                    <p key={i} className="rules-text">
                      {p}
                    </p>
                  ))
                )}
                {picked.map((o) => (
                  <p key={o.id} className="rules-text">
                    <strong>{o.name}.</strong> {plainParagraphs(o.text).join(' ')}
                  </p>
                ))}
              </details>
            );
          })}
        </section>
      ))}
      <BonusBreakdown session={session} />
      <OverridesEditor session={session} />
    </div>
  );
}
```

- [ ] **Step 7: Tabbladen en stijl**

In `src/ui/sheet/tabs.tsx`: importeer `InventoryTab` en `FeaturesTab`, en zet na het tabblad `spells` en vóór `notes`:

```tsx
    { id: 'inventory', label: t('tab.inventory'), render: (session) => <InventoryTab session={session} /> },
    { id: 'features', label: t('tab.features'), render: (session) => <FeaturesTab session={session} /> },
```

Onderaan `src/ui/sheet/sheet.css`:

```css
.add-item { display: grid; gap: 0.4rem; margin-bottom: 1rem; }
.matches { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.25rem; }
.matches button { width: 100%; justify-content: flex-start; }
.inventory { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
.inventory th, .inventory td { padding: 0.25rem 0.4rem; text-align: left; border-bottom: 1px solid var(--border); }
.inventory input[type='number'] { width: 5rem; }
.coins label { display: inline-flex; flex-direction: column; gap: 0.2rem; }
.coins input { width: 6rem; }
.feature { border-bottom: 1px solid var(--border); padding: 0.25rem 0; }
.feature summary { min-height: var(--tap); display: flex; align-items: center; flex-wrap: wrap; gap: 0.3rem; cursor: pointer; }
.feature-name { font-weight: 600; }
.breakdown { display: grid; gap: 0.4rem; }
.breakdown dt { font-weight: 600; }
.breakdown dd { margin: 0; color: var(--muted); }
.overrides { list-style: none; padding: 0; }
```

- [ ] **Step 8: Tests, typecheck en build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS, geen typefouten, build slaagt.

- [ ] **Step 9: Commit**

```bash
git add src/ui src/i18n
git commit -m "feat: tabbladen Spullen en Features met attunement, geld, opbouw van bonussen en aanpassingen" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 17: PWA, offline, end-to-end-tests en GitHub Pages

**Files:**
- Modify: `package.json` (dev-dependencies, scripts), `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`
- Create: `scripts/png.ts`, `scripts/png.test.ts`, `scripts/make-icons.ts`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/apple-touch-icon.png`
- Create: `src/ui/UpdatePrompt.tsx`, `src/ui/UpdatePrompt.test.tsx`, `src/ui/testing/pwa-register-stub.ts`
- Modify: `src/ui/App.tsx`, `src/ui/styles.css`, `src/i18n/en.json`, `src/i18n/nl.json`
- Create: `playwright.config.ts`, `tests/e2e/app.spec.ts`, `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: de hele app; `useRegisterSW` uit `virtual:pwa-register/react` (vite-plugin-pwa).
- Produces: `encodePng(size, pixel): Buffer` en `iconPixel(size)` in `scripts/png.ts`; scripts `npm run icons` en `npm run test:e2e`; `UpdatePrompt()`; in tests de stub `stubUpdateWaiting(value)` en `reloads: boolean[]`; een workflow die bij elke push naar `main` test, bouwt en publiceert.

- [ ] **Step 1: Dependencies, scripts en vertalingen**

```bash
npm install -D vite-plugin-pwa@2.0.0 @playwright/test@1.64.1
npx playwright install chromium webkit
```

Expected: geen `ERR!`; Playwright downloadt Chromium en WebKit. Voeg in `package.json` bij `scripts` toe:

```json
    "icons": "tsx scripts/make-icons.ts",
    "test:e2e": "playwright test"
```

Voeg onderaan `.gitignore` toe:

```
test-results/
playwright-report/
```

`src/i18n/en.json`: `"update.available": "A new version is available.",` en `"update.reload": "Reload"`.
`src/i18n/nl.json`: `"update.available": "Nieuwe versie beschikbaar.",` en `"update.reload": "Herladen"`.

- [ ] **Step 2: De falende tests schrijven**

`scripts/png.test.ts`:

```ts
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { encodePng, iconPixel } from './png';

describe('encodePng', () => {
  it('writes a PNG signature, the size and the pixels', () => {
    const png = encodePng(4, (x) => (x < 2 ? [255, 0, 0] : [0, 0, 255]));
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([4, 4]);
    expect(png.subarray(37, 41).toString('ascii')).toBe('IDAT');
    const raw = inflateSync(png.subarray(41, 41 + png.readUInt32BE(33)));
    expect([...raw.subarray(0, 13)]).toEqual([0, 255, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0, 255]);
  });

  it('draws the hexagon in the middle and leaves the corners red', () => {
    const pixel = iconPixel(192);
    expect(pixel(96, 96)).toEqual([0xf7, 0xf4, 0xee]);
    expect(pixel(0, 0)).toEqual([0x8b, 0x1e, 0x1e]);
  });
});
```

`src/ui/UpdatePrompt.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { reloads, stubUpdateWaiting } from './testing/pwa-register-stub';
import { renderApp } from './testing/render';

describe('update prompt', () => {
  afterEach(() => stubUpdateWaiting(false));

  it('stays hidden without a new version', async () => {
    renderApp('#/');
    await screen.findByRole('heading', { name: 'Characters' });
    expect(screen.queryByText('A new version is available.')).toBeNull();
  });

  it('announces a new version and reloads only when the player taps (spec §13)', async () => {
    stubUpdateWaiting(true);
    renderApp('#/');
    expect(await screen.findByText('A new version is available.')).toBeTruthy();
    expect(reloads).toEqual([]);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reload' }));
    expect(reloads).toEqual([true]);
  });
});
```

- [ ] **Step 3: Tests draaien en zien falen**

Run: `npm test -- scripts/png.test.ts src/ui/UpdatePrompt.test.tsx`
Expected: FAIL, `Failed to resolve import "./png"` en `"./testing/pwa-register-stub"`.

- [ ] **Step 4: Iconen**

`scripts/png.ts`:

```ts
import { deflateSync } from 'node:zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

export type Pixel = (x: number, y: number) => [number, number, number];

/** A minimal RGB PNG encoder (8 bits per channel, no filtering): enough for app icons without another dependency. */
export function encodePng(size: number, pixel: Pixel): Buffer {
  const row = size * 3 + 1;
  const raw = Buffer.alloc(row * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) raw.set(pixel(x, y), y * row + 1 + x * 3);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits per channel
  header[9] = 2; // colour type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** The app icon: a light hexagon (a d20 seen from above) on dark red, small enough to survive maskable cropping. */
export function iconPixel(size: number): Pixel {
  const centre = size / 2;
  const radius = size * 0.34;
  return (x, y) => {
    const dx = Math.abs(x + 0.5 - centre);
    const dy = Math.abs(y + 0.5 - centre);
    const inside = dx <= (radius * Math.sqrt(3)) / 2 && dy <= radius - dx / Math.sqrt(3);
    return inside ? [0xf7, 0xf4, 0xee] : [0x8b, 0x1e, 0x1e];
  };
}
```

`scripts/make-icons.ts`:

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { encodePng, iconPixel } from './png';

const ICONS: Array<[string, number]> = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];

mkdirSync('public/icons', { recursive: true });
for (const [name, size] of ICONS) writeFileSync(`public/icons/${name}`, encodePng(size, iconPixel(size)));
console.log(`wrote ${ICONS.length} icons to public/icons`);
```

Run: `npm run icons`
Expected: `wrote 3 icons to public/icons`; de bestanden openen als rood vierkant met een lichte zeshoek.

- [ ] **Step 5: Service worker, manifest en update-melding**

`vite.config.ts` wordt:

```ts
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/dnd-tracker/',
  plugins: [
    react(),
    // Spec §13: the service worker caches the whole app; a new version waits until the player taps "Reload".
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'D&D Character Tracker',
        short_name: 'D&D Tracker',
        description: 'Character sheet for D&D 5e (2024 rules) that works offline.',
        lang: 'nl',
        display: 'standalone',
        background_color: '#16140f',
        theme_color: '#8b1e1e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    alias: {
      'virtual:pwa-register/react': fileURLToPath(new URL('./src/ui/testing/pwa-register-stub.ts', import.meta.url)),
    },
  },
});
```

In `tsconfig.json` wordt `"types": ["vite/client", "node"]` gewijzigd in `"types": ["vite/client", "node", "vite-plugin-pwa/react"]` en `"include"` in `["src", "scripts", "tests", "vite.config.ts", "playwright.config.ts"]`.

`index.html` wordt:

```html
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#8b1e1e" />
    <meta name="description" content="Character sheet for D&amp;D 5e (2024 rules) that works offline." />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="D&amp;D Tracker" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <title>D&amp;D Character Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/ui/testing/pwa-register-stub.ts`:

```ts
import { useState } from 'react';

/** Test stand-in for vite-plugin-pwa's virtual module (alias in vite.config.ts). Tests decide whether an update waits. */
let waiting = false;
export const reloads: boolean[] = [];

export function stubUpdateWaiting(value: boolean): void {
  waiting = value;
}

export function useRegisterSW() {
  const needRefresh = useState(waiting);
  const offlineReady = useState(false);
  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: async (reloadPage?: boolean) => {
      reloads.push(reloadPage === true);
    },
  };
}
```

`src/ui/UpdatePrompt.tsx`:

```tsx
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useI18n } from '../i18n/i18n';

/** Spec §13: "New version available · Reload". The app never reloads by itself. */
export function UpdatePrompt() {
  const { t } = useI18n();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="status">
      <span>{t('update.available')}</span>
      <button type="button" className="primary" onClick={() => void updateServiceWorker(true)}>
        {t('update.reload')}
      </button>
    </div>
  );
}
```

In `src/ui/App.tsx`: importeer `UpdatePrompt` en render het in `App` vóór `<Screens />`:

```tsx
    <Providers db={db}>
      <UpdatePrompt />
      <Screens />
    </Providers>
```

Onderaan `src/ui/styles.css`:

```css
.update-banner { position: fixed; top: env(safe-area-inset-top); left: 0; right: 0; z-index: 40; display: flex; gap: 0.75rem; justify-content: center; align-items: center; padding: 0.5rem; background: var(--surface-2); border-bottom: 1px solid var(--border); }
```

- [ ] **Step 6: Unit-tests, typecheck en build**

Run: `npm test && npm run typecheck && npm run build && grep -o 'href="[^"]*apple-touch-icon.png"' dist/index.html && ls dist/sw.js dist/manifest.webmanifest`
Expected: PASS, geen typefouten; de build meldt `PWA v2.0.0` met een aantal precache-entries; `href="/dnd-tracker/icons/apple-touch-icon.png"`; `dist/sw.js` en `dist/manifest.webmanifest` bestaan. Staat het icoonpad zonder `/dnd-tracker/`, zet het in `index.html` dan op `%BASE_URL%icons/apple-touch-icon.png`.

- [ ] **Step 7: End-to-end-tests**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/dnd-tracker/',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // WebKit at iPad size in portrait: the left column becomes a tab (Review Focus 5).
    { name: 'webkit', use: { ...devices['iPad (gen 7)'] } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/dnd-tracker/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

`tests/e2e/app.spec.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function createKael(page: Page) {
  await page.goto('./');
  await page.getByRole('link', { name: 'New character' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Kael');
  await page.getByLabel('Class', { exact: true }).selectOption('srd:class:fighter');
  await page.getByRole('button', { name: 'Add level' }).click();
  await page.getByLabel('Class', { exact: true }).selectOption('srd:class:wizard');
  await page.getByRole('button', { name: 'Add level' }).click();
  await expect(page.getByText(/Multiclass prerequisite not met for Fighter/)).toBeVisible();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: 'Kael' })).toBeVisible();
}

async function damage(page: Page, amount: string) {
  await page.getByLabel('Amount').fill(amount);
  await page.getByRole('button', { name: /Damage/ }).click();
}

test('create a multiclass character, take damage, undo, rest, and find it again', async ({ page }) => {
  await createKael(page);
  await expect(page.getByText('Fighter 1 / Wizard 1 · Level 2')).toBeVisible();
  const hp = page.getByTestId('hp');
  await expect(hp).toHaveText('14/14');
  await damage(page, '5');
  await expect(hp).toHaveText('9/14');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(hp).toHaveText('14/14');
  await damage(page, '5');
  await page.getByRole('button', { name: 'Long Rest' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Take Long Rest' }).click();
  await expect(hp).toHaveText('14/14');
  await damage(page, '3');
  await expect(hp).toHaveText('11/14');
  await page.getByRole('link', { name: 'Back' }).click();
  await page.getByRole('link', { name: /Kael/ }).click();
  await expect(page.getByTestId('hp')).toHaveText('11/14');
  await page.reload();
  await expect(page.getByTestId('hp')).toHaveText('11/14');
});

test('export a character as a JSON file', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'On the iPad export opens the share sheet; that is checked by hand (spec §16).');
  await createKael(page);
  await page.getByRole('link', { name: 'Back' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^kael-\d{4}-\d{2}-\d{2}\.json$/);
  const json = JSON.parse(await readFile(await file.path(), 'utf8'));
  expect(json).toMatchObject({ format: 'dnd-tracker-export', version: 1, kind: 'character', characters: [{ name: 'Kael' }] });
});

test('switches the interface to Dutch and the theme to dark', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByLabel('Language').selectOption('nl');
  await expect(page.getByRole('heading', { name: 'Instellingen' })).toBeVisible();
  await page.getByLabel('Thema').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('works offline after the first visit', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Offline runs in Chromium here; on the iPad it is checked by hand in airplane mode (spec §16).');
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible();
});
```

Run: `npm run test:e2e`
Expected: alle tests PASS in `chromium` en `webkit`; de tests voor export en offline staan in `webkit` als *skipped*.

- [ ] **Step 8: GitHub Actions**

`.github/workflows/deploy.yml`:

```yaml
name: Testen en publiceren

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - name: Generated SRD JSON matches the converter
        run: npm run convert:srd && git diff --exit-code -- src/content/srd/generated
      - run: npx playwright install --with-deps chromium webkit
      - run: npm run test:e2e
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

De workflow draait pas als de repository op GitHub staat (Task 18). Node 24 in de workflow volgt `engines` in `package.json`.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json index.html .gitignore scripts public src tests playwright.config.ts .github
git commit -m "feat: installeerbaar en offline, end-to-end-tests in Chromium en WebKit, publiceren via GitHub Pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Eindcontrole fase 1B

Geen nieuwe code. De controller (of Sam) voert deze stappen uit; stap 4 en 5 vragen Sam.

**Files:**
- Create: `docs/superpowers/notes/JJJJ-MM-DD-fase-1b-overdracht.md` (de datum van die dag)

- [ ] **Step 1: Alles in één keer controleren**

Run: `npm test && npm run typecheck && npm run build && npm run test:e2e && npm run convert:srd && git diff --exit-code -- src/content/srd/generated`
Expected: alle unit-tests en e2e-tests PASS (export en offline *skipped* in WebKit), geen typefouten, build geslaagd, geen verschil in `generated/`.

- [ ] **Step 2: Handmatig op de PC**

Run: `npm run preview` en open `http://localhost:4173/dnd-tracker/` in Chrome.
Controleer: installeren via het installatie-icoon in de adresbalk; een character aanmaken (Cleric met Divine Order, Elf met Wood Elf: Speed 35); schade nemen tot 0 en een death save rollen; een Short Rest met één Hit Point Die; thema donker; taal Nederlands; *Alle data exporteren* downloadt een `.json`.

- [ ] **Step 3: Overdracht schrijven**

Schrijf `docs/superpowers/notes/JJJJ-MM-DD-fase-1b-overdracht.md` (de datum van die dag) met: de beslissingen tijdens de uitvoering (rulings uit het SDD-logboek), wat 1C moet meenemen (import met conflictkeuze, bibliotheek met effecten-editor die alleen eigen toevoegingen opslaat, ontbrekende effecten en Eldritch Blast-beams uit de tabel bovenaan dit plan, en wat er tijdens 1B bijkwam), en de open vragen voor Sam. Commit:

```bash
git add docs/superpowers/notes
git commit -m "docs: overdracht fase 1B met beslissingen en open punten voor plan 1C" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Online zetten (alleen met Sam's akkoord en een GitHub-account)**

Na de review van de hele branch en het samenvoegen in `main` (superpowers:finishing-a-development-branch):
1. Sam maakt op github.com een **openbare**, lege repository `dnd-tracker` (zonder README) en zet *Settings → Pages → Source* op *GitHub Actions*.
2. Daarna, met Sam's gebruikersnaam:

```bash
git remote add origin https://github.com/<gebruikersnaam>/dnd-tracker.git
git push -u origin main
```

3. Onder *Actions* moet de workflow *Testen en publiceren* slagen; de app staat daarna op `https://<gebruikersnaam>.github.io/dnd-tracker/`.

Zonder GitHub-account: deze stap blijft open; de app werkt lokaal.

- [ ] **Step 5: Handmatig op de iPad (spec §16)**

Op de gepubliceerde URL in Safari:
1. *Deel → Zet op beginscherm*, open de app vanaf het beginscherm.
2. Maak een character aan, neem schade, zet de iPad in vliegtuigmodus, sluit de app helemaal en open hem opnieuw: de app start en de schade staat er nog.
3. *Exporteren* op de lijst opent het deelmenu; bewaar het bestand in *Bestanden*.
4. Draai de iPad naar staand: de linkerkolom wordt het tabblad *Abilities*.
