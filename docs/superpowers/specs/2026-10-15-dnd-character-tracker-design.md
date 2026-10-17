# D&D Character Tracker — ontwerp

**Datum:** 2026-10-15
**Status:** ontwerp goedgekeurd in gesprek, spec ter review

## 1. Doel

Een digitale character sheet voor D&D 5e (2024-regels) die Sam als speler gebruikt: op de iPad tijdens sessies en op de Windows-PC thuis.

**Geslaagd als:** Sam een hele sessie op de iPad speelt zonder papieren sheet, en thuis op de PC het character bijwerkt, ook met multiclassing.

## 2. Uitgangspunten

**Vastgesteld in het gesprek**

- Eén gebruiker (Sam, speler); eigen character(s), meerdere characters mogelijk.
- Regels: D&D 5e 2024.
- Werkt op PC en iPad. Handmatig overzetten via export/import is genoeg; automatische sync is een wens voor later.
- Volledige character sheet: HP en combat, automatisch berekende stats, spells en resources, inventory en notities.
- Inhoud: alles uit de SRD 5.2 volledig; de overige subclasses als skelet dat Sam zelf aanvult uit het eigen Player's Handbook.
- Volledige wizard voor creation en level-ups, inclusief multiclassing.
- Bediening schakelbaar tussen Nederlands en Engels.
- Extra's: dobbelstenen, meerdere characters, afdrukken/PDF, donkere modus.
- Aanpak: installeerbare web-app (PWA), sheet-indeling "hybride" (zie §8).
- Hosting op GitHub Pages; code in een map buiten OneDrive.

**Aannames**

- De app werkt volledig offline; data staat lokaal op elk apparaat.
- Geen accounts, geen delen met de groep, geen DM-functies.
- Spelregelteksten (SRD en skeletten) zijn Engels. Spelregeltermen (Saving Throw, Spell Slot, STR/DEX enz.) blijven in beide talen Engels, zodat ze overeenkomen met het boek; alleen de bediening (knoppen, menu's, meldingen, uitleg) wisselt van taal.

## 3. Fasering

Deze spec beschrijft de hele app, zodat het datamodel en de opbouw vanaf fase 1 kloppen. Elke fase krijgt een eigen implementatieplan en is op zichzelf bruikbaar.

| Fase | Inhoud |
|---|---|
| **1. Sheet aan tafel** | Rules-motor (inclusief multiclass-berekeningen), SRD-inhoud en skeletten, bibliotheek, characterlijst, character sheet, eenvoudig formulier om een character aan te maken en levels toe te voegen, dobbelstenen, ongedaan maken, donkere modus, NL/EN, opslag, export/import, PWA/offline, hosting |
| **2. Wizard** | Creation-wizard en level-up-wizard met multiclass-vereisten, HP-keuze en level ongedaan maken |
| **3. Afwerking** | Afdrukken/PDF en automatische sync |

## 4. Architectuur

**Techniek:** React + TypeScript, gebouwd met Vite. `vite-plugin-pwa` voor installeren en offline. IndexedDB via Dexie voor opslag. Zod voor schema-validatie. Vitest voor unit-tests, Playwright (Chromium en WebKit) voor end-to-end-tests. Gewone CSS met CSS-variabelen voor thema's.

**Onderdelen**

```
src/
  rules/     pure TypeScript: berekeningen, geen UI of opslag
  content/   spelinhoud als data, schema's, ContentRegistry (opzoeken op ID)
  storage/   Dexie-database, opslaan/laden, export/import, migraties
  ui/        React-schermen en componenten
  i18n/      nl.json, en.json en een vertaal-hook
tests/e2e/   Playwright-tests
```

**Afhankelijkheden**

- `rules` kent alleen de types uit `content`, niet hoe inhoud geladen wordt. De kern is één pure functie: `deriveSheet(character, registry) → DerivedSheet`.
- `storage` kent de types van characters en inhoud, niet de spelregels.
- `ui` gebruikt alle onderdelen; geen enkel ander onderdeel gebruikt `ui`.

**Ontwerpprincipe: keuzes + stand, de rest wordt berekend**

Een character wordt opgeslagen als *keuzes* (wat je gekozen hebt) en *stand* (hoe het er nu voor staat). Alles wat daaruit volgt (modifiers, AC, spell slots, features, max HP) wordt bij elke weergave opnieuw berekend door `deriveSheet` en nooit opgeslagen. Handmatige *aanpassingen* (magische items, DM-regels, homebrew) zijn expliciete regels die meetellen en zichtbaar blijven als bron van een getal.

## 5. Datamodel

### Character

```ts
Character {
  id: string                 // uuid
  schemaVersion: number
  createdAt, updatedAt: string  // ISO-tijd
  name: string
  details: { alignment?, appearance?, personality?, backstory? }  // vrije tekst

  choices: {
    abilityMethod: 'standard' | 'pointbuy' | 'rolled' | 'manual'
    baseAbilities: Record<Ability, number>
    speciesId: string; speciesChoices: Record<string, unknown>
    backgroundId: string
    backgroundAbilityBonuses: Partial<Record<Ability, number>>  // +2/+1 of +1/+1/+1
    backgroundChoices: Record<string, unknown>
    levels: LevelChoice[]    // in volgorde genomen; index 0 = eerste character-level
    skillProficiencies, expertise, languages, toolProficiencies: string[]
    spells: { classId: string; spellId: string; prepared: boolean }[]
  }

  state: {
    hpCurrent: number; hpTemp: number
    deathSaves: { successes: 0-3; failures: 0-3 }
    hitDiceSpent: Record<Die, number>
    slotsUsed: Record<SpellLevel, number>; pactSlotsUsed: number
    resourcesUsed: Record<ResourceId, number>
    conditions: ConditionId[]; exhaustion: 0-6
    heroicInspiration: boolean
  }

  inventory: { itemId?: string; customName?: string; qty: number;
               equipped: boolean; attuned: boolean; notes?: string }[]
  currency: { cp, sp, ep, gp, pp: number }
  notes: { id: string; title: string; body: string; updatedAt: string }[]
  overrides: { target: OverrideTarget; value: number; reason: string }[]
}

LevelChoice {
  classId: string
  subclassId?: string
  hp: 'average' | number       // eerste character-level is altijd maximaal
  asi?: Partial<Record<Ability, number>>
  featId?: string
  featureChoices: Record<string, unknown>  // bv. fighting style, expertise-keuzes
}
```

Het level per class is het aantal `LevelChoice`-items met die `classId`. Een level ongedaan maken is het laatste item verwijderen.

`OverrideTarget` is één van: `ac`, `initiative`, `speed`, `hpMax`, `ability:<ability>`, `abilityMax:<ability>`, `skill:<id>`, `save:<ability>`, `attack:<id>`, `spellAttack`, `spellDC`.

### Spelinhoud

Elk inhoudsitem heeft een stabiele ID (`srd:class:fighter`, `skeleton:subclass:battle-master`, `user:item:<uuid>`), een `type` (class, subclass, feature, species, background, feat, spell, item) en een `source`:

| source | Betekenis |
|---|---|
| `srd` | Volledige tekst en mechaniek uit de SRD 5.2 |
| `skeleton` | Naam en feature-levels, zonder beschrijving |
| `user` | Door Sam toegevoegd of aangevuld |

Belangrijkste vormen:

```ts
ClassDef { hitDie; primaryAbilities; savingThrows; proficiencies;
           multiclassPrerequisites; multiclassProficiencies;
           spellcasting?: { ability; progression: 'full'|'half'|'third'|'pact' };
           features: { level: number; featureId: string }[];
           subclassLevels: number[];
           tableColumns: { name; valuesByLevel: (number|string)[] }[] }  // bv. Rages, Prepared Spells

SubclassDef { classId; features: { level: number; featureId: string }[] }

FeatureDef { name; text; effects: Effect[]; choices?: ChoiceDef[] }

Effect =
  | { kind: 'resource';  name; max: Formula; recharge: 'short'|'long'; shortRestRegain?: Formula }
  | { kind: 'bonus';     target: OverrideTarget; value: Formula }
  | { kind: 'proficiency'; target: string }
  | { kind: 'spellcasting'; ability; progression: 'full'|'half'|'third'|'pact' }
  | { kind: 'acFormula'; base: number; abilities: Ability[]; allowShield: boolean }

Formula = number | 'pb' | `mod:${Ability}` | `classLevel:${ClassId}` | Formula[]  // array = som
```

**Eigen aanvullingen op ingebouwde inhoud** worden apart opgeslagen in de tabel `customContent`, met een verwijzing naar het item dat ze aanvullen. Ingebouwde data wordt nooit gewijzigd; een app-update laat aanvullingen intact.

## 6. Spelinhoud

**SRD 5.2** (Creative Commons Attribution 4.0): alle 12 classes met hun features op level 1–20 en één subclass per class, plus de species, backgrounds, feats, spells en items die de SRD bevat. Bron is de officiële SRD 5.2 van Wizards of the Coast. Tijdens het plan voor fase 1 wordt bepaald of een betrouwbare open JSON-versie bruikbaar is of dat de PDF wordt omgezet.

**Skeletten:** de overige 36 subclasses uit het 2024 Player's Handbook staan in de app met hun naam. Hun feature-levels komen uit de `subclassLevels` van de class (uit de SRD-class-tabellen), niet uit geheugen. Per level staat een lege feature die Sam invult (naam, tekst en eventueel effecten); per level kunnen ook extra features worden toegevoegd. Eldritch Knight en Arcane Trickster hebben in hun skelet al een `spellcasting`-effect (INT, third-caster), omdat dat nodig is voor de multiclass-spell-slots.

| Class | SRD-subclass | Skeletten |
|---|---|---|
| Barbarian | Path of the Berserker | Wild Heart, World Tree, Zealot |
| Bard | College of Lore | Dance, Glamour, Valor |
| Cleric | Life Domain | Light, Trickery, War |
| Druid | Circle of the Land | Moon, Sea, Stars |
| Fighter | Champion | Battle Master, Eldritch Knight, Psi Warrior |
| Monk | Warrior of the Open Hand | Mercy, Shadow, Elements |
| Paladin | Oath of Devotion | Glory, Ancients, Vengeance |
| Ranger | Hunter | Beast Master, Fey Wanderer, Gloom Stalker |
| Rogue | Thief | Arcane Trickster, Assassin, Soulknife |
| Sorcerer | Draconic Sorcery | Aberrant, Clockwork, Wild Magic |
| Warlock | Fiend Patron | Archfey, Celestial, Great Old One |
| Wizard | Evoker | Abjurer, Diviner, Illusionist |

**Eigen inhoud:** in de bibliotheek kan Sam species, backgrounds, feats, spells, items en complete subclasses toevoegen, met dezelfde effecten als ingebouwde features.

**Credits:** een Credits-scherm toont de attributietekst die de SRD 5.2 zelf voorschrijft.

## 7. Rules-motor

`deriveSheet` berekent volgens de 2024-regels:

- **Abilities:** basis + background-bonus + ASI's + feats + aanpassingen; maximaal 20, tenzij een effect of aanpassing op `abilityMax:<ability>` het maximum verhoogt (bijvoorbeeld een Epic Boon); daarna de modifiers.
- **Proficiency bonus** op basis van het totale character-level.
- **Skills** (proficiency, expertise) en **passive Perception**.
- **Saving throws:** proficiencies alleen van de eerste class.
- **Max HP:** eerste character-level maximaal hit die + CON; daarna per level gemiddeld of gerold (de keuze in `LevelChoice`) + CON; plus effecten.
- **Hit dice** per dobbelsteentype.
- **AC:** armor-regels, shield, AC-formules (bij meerdere formules telt de hoogste, ze stapelen niet), aanpassingen.
- **Initiative, speed** (inclusief Exhaustion-straf).
- **Aanvallen:** to-hit en damage voor wapens en cantrips; cantrip-schaling op character-level.
- **Spellcasting:** casting-ability, spell attack en save DC per class; aantal prepared spells uit de class-tabel; spell slots via de multiclass-regels uit de SRD 5.2; Pact Magic apart.
- **Features** per level van class en subclass, inclusief resources met hun maximum.
- **Condities en Exhaustion** (per level −2 op d20-worpen en −5 ft speed).
- **Multiclassing:** vereisten (13 in de primaire abilities van huidige en nieuwe class) geven een **waarschuwing, geen blokkade**; beperkte proficiencies bij het multiclassen volgens de class-tabel.

Getallen en afrondingsregels (bijvoorbeeld bij half-casters in de multiclass-slot-berekening) worden nagelezen in de SRD 5.2 en vastgelegd in referentietests; niets wordt uit geheugen overgenomen.

**Rests**

- *Short rest:* hit dice uitgeven (dobbelsteen rollen + CON), resources met `recharge: 'short'` herstellen, `shortRestRegain` toepassen, Pact Magic-slots herstellen.
- *Long rest:* alle HP, alle hit dice, alle spell slots en resources herstellen, Exhaustion −1.

## 8. Schermen

1. **Characterlijst** (start): kaart per character (naam, classes, level), knoppen *Nieuw character* en *Importeren*.
2. **Character sheet**, indeling *hybride*:
   - Vaste balk bovenaan: naam en classes, HP met grote −/+ knoppen en temp HP, AC, initiative, condities, rustmenu (short/long rest), dobbelstenen.
   - Linkerkolom, altijd zichtbaar: zes abilities, skills en saves.
   - Rechts tabbladen: *Acties* (aanvallen, resources, spell slots), *Spells*, *Spullen* (inventory, geld, attunement), *Features*, *Notities*.
   - Op de iPad staand en op smalle schermen wordt de linkerkolom een eigen tabblad.
3. **Character aanmaken** — fase 1: één formulier (naam, abilities, species, background, class-levels toevoegen/verwijderen, proficiencies). Fase 2: wizard (§9).
4. **Bibliotheek:** alle inhoud doorbladeren en doorzoeken, skeletten aanvullen, eigen inhoud toevoegen.
5. **Instellingen:** taal, thema (licht/donker/automatisch), export/import, back-up, credits.

Tikvlakken zijn minimaal 44×44 pt. Getallen waarmee je kunt rollen zijn herkenbaar als tikbaar.

**Ongedaan maken:** elke wijziging in `state` (HP, slots, resources, condities) toont kort een melding met *Ongedaan maken*, bijvoorbeeld "HP −7 · Ongedaan maken". De laatste 20 wijzigingen zijn terug te draaien zolang de app open is.

## 9. Wizards (fase 2)

**Creation**, in de volgorde van het 2024 Player's Handbook:

1. Class
2. Background (inclusief de keuze +2/+1 of +1/+1/+1 en het Origin feat)
3. Species
4. Ability scores (standard array, point buy of rollen; background-bonus direct zichtbaar)
5. Equipment
6. Spells (als de class spells heeft)
7. Naam en details
8. Overzicht

Elke stap is terug te nemen. De wizard schrijft alleen naar `choices`; de sheet berekent de rest.

**Level-up**

1. Kies de class die omhoog gaat. Een nieuwe class = multiclassen: de vereisten worden gecontroleerd en een waarschuwing getoond als ze niet gehaald worden.
2. HP: gemiddeld of rollen.
3. Wat er nieuw is op dit level.
4. Keuzes: subclass, ASI of feat, nieuwe spells, feature-keuzes.
5. Overzicht.

**Level ongedaan maken** verwijdert de laatste `LevelChoice`, na bevestiging.

## 10. Dobbelstenen

- Tik op een skill, save, attack of damage om te rollen. Schakelaar advantage/disadvantage; bij een attack ook *kritiek* (dubbele damage-dobbelstenen).
- Uitkomst in een paneel onderaan met de losse worpen en een geschiedenis van de laatste 20 worpen.
- Vrije worpen in notatie `XdY+Z` (bijvoorbeeld `2d6+3`).
- Willekeur via `crypto.getRandomValues`.

## 11. Taal

- `i18n/nl.json` en `i18n/en.json` met alle bedieningsteksten; taalkeuze in de instellingen, standaard de taal van het apparaat.
- Spelregelteksten en -termen blijven Engels (zie §2).

## 12. Opslag, export en import

- **Opslag:** Dexie-database met de tabellen `characters`, `customContent` en `settings`. Elke wijziging wordt direct opgeslagen (met een korte vertraging om veel schrijfacties te bundelen). Bij de eerste start vraagt de app `navigator.storage.persist()` aan.
- **Migraties:** de database en elk character hebben een `schemaVersion`; bij een app-update worden oudere versies automatisch omgezet.
- **Export:** een `.json`-bestand per character of een volledige back-up (alle characters + eigen inhoud). Een character-export bevat ook de eigen inhoud die het character gebruikt. Op de iPad via het iOS-deelmenu (Web Share API met bestanden); op de PC als download.
- **Import:** via een bestandskiezer. Het bestand wordt eerst gevalideerd. Bestaat het character al, dan toont de app welke versie nieuwer is (`updatedAt`) en kiest Sam *vervangen* of *als kopie toevoegen*.
- **Back-upherinnering:** na 14 dagen zonder export een melding.
- **Voorbereiding op sync (fase 3):** `id` en `updatedAt` per character. Hoe sync werkt wordt in fase 3 ontworpen.

## 13. Hosting, offline en updates

- Code in een git-repository op GitHub, lokaal buiten OneDrive (voorstel: `C:\Users\SamTieland\dev\dnd-tracker`). Deze spec en de plannen gaan mee naar die repository.
- GitHub Actions bouwt en publiceert naar GitHub Pages bij elke push naar `main`.
- De service worker cachet de hele app; na de eerste keer laden werkt alles offline.
- Is er een nieuwe versie, dan toont de app *"Nieuwe versie beschikbaar · Herladen"*. De app herlaadt nooit zonder dat Sam erop tikt.

## 14. Afdrukken / PDF (fase 3)

Een print-stylesheet die de sheet netjes op A4 zet; PDF via de printfunctie van de browser.

Daarnaast bestaat een PDF-export op het eigen invulbare 5E-characterblad van de speler (plan `docs/superpowers/plans/2026-10-17-pdf-export.md`).

## 15. Foutafhandeling

- **Import:** een ongeldig of kapot bestand geeft een duidelijke melding; er wordt niets overschreven.
- **Validatie:** alles wat van buiten komt (imports, eigen inhoud) wordt met zod-schema's gecontroleerd voordat het wordt opgeslagen.
- **Onbekende inhoud:** verwijst een character naar een ID die niet bestaat, dan toont de sheet "Onbekend: <ID>" en rekent verder; `deriveSheet` gooit nooit een fout om ontbrekende inhoud, maar geeft waarschuwingen terug.
- **Opslaan mislukt** (bijvoorbeeld opslag vol): melding met het advies om te exporteren.
- **Fout in een scherm:** een React error boundary per onderdeel toont "Er ging iets mis in dit onderdeel" met een knop om data te exporteren; de rest van de app blijft werken.

## 16. Testen

- **Rules (Vitest):** referentie-characters met uitkomsten die met de hand zijn nagerekend tegen de SRD 5.2, minimaal:
  - Fighter 3 (Champion) / Wizard 2
  - Paladin 2 / Sorcerer 3 (half- plus full caster)
  - Warlock 3 / Sorcerer 2 (Pact Magic apart)
  - Eldritch Knight 7 (third-caster)
  - Monk en Barbarian (Unarmored Defense)

  Plus: de multiclass-spell-slot-tabel voor caster-level 1–20, rests, Exhaustion en aanpassingen.
- **Content:** elke class heeft features voor level 1–20 waar de SRD die geeft, elke verwezen ID bestaat, alle data voldoet aan de schema's.
- **Storage:** export → import geeft een identiek character; migratietests per schemaversie.
- **End-to-end (Playwright, Chromium en WebKit):** character aanmaken, level toevoegen met multiclass, schade nemen en long rest, ongedaan maken, export en import. In fase 2 ook beide wizards.
- **Handmatig op de iPad** aan het eind van elke fase: installeren via *Zet op beginscherm*, gebruik in vliegtuigmodus, export via het deelmenu, PDF via het deelmenu.

## 17. Buiten scope

- Accounts, inloggen, delen met de groep, DM-functies, monsters of een initiative tracker.
- Vertaling van spelregelteksten.
- Volledige Player's Handbook-inhoud buiten de SRD.
- Native iOS- of Windows-apps.
- Character-afbeeldingen.

## 18. Open punten voor het plan van fase 1

- Bron van de SRD 5.2-data: bestaande open JSON-versie of eigen omzetting van de PDF.
- Of Sam al een GitHub-account heeft.
- Definitieve lokale map voor de code.
