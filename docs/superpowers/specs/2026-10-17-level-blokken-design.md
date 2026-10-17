# Ontwerp: class-blokken met subclass en keuzes per level

Datum: 2026-10-17. Status: concept, ter goedkeuring door Sam.
Hoort bij: `docs/superpowers/specs/2026-10-15-dnd-character-tracker-design.md` (de hoofdspec blijft gelden; dit ontwerp vervangt alleen de indeling van het blok *Levels* en het blok *Keuzes* in het characterformulier).

## 1. Waarom

Sam zag in het formulier geen subclasses. De keuzelijst voor de subclass verschijnt nu pas als een class het subclass-level heeft (meestal level 3), en dan los onderaan het blok *Levels*. Wie een character op level 1 of 2 aanmaakt, ziet dus nergens dat er subclasses zijn. Daarnaast staan keuzes los van het level waarop je ze krijgt: Divine Order staat in een apart blok *Keuzes*, en de feat-keuzelijst staat op elk level, ook waar je geen feat krijgt.

Sam wil: **een blok voor de class die je kiest, daaronder de subclass die bij die class hoort, en daaronder een overzicht van wat je per level hebt gekozen.** Gekozen indeling: per class een eigen blok (optie A uit de schets). Bij multiclass komt er een tweede blok.

Succes is: Sam maakt een Fighter 1 aan en ziet direct de subclass-keuzelijst met Champion en de PHB-subclasses; per level ziet hij wat hij koos, wat hij kreeg en op welke levels er iets te kiezen is.

## 2. Doelen

1. **Blok per class.** Elke class van het character krijgt een eigen kaart in het formulier, in de volgorde waarin de class voor het eerst genomen is.
2. **Subclass direct onder de class.** Een keuzelijst met alleen de subclasses van die class (SRD-subclass plus skeletten, skeletten gemarkeerd zoals nu met *(skelet)* / `form.skeleton`). De keuzelijst is altijd zichtbaar, ook vóór het subclass-level, met de uitleg "telt mee vanaf level N" (N uit `subclassLevels[0]` van de class).
3. **Een regel per level van die class.** Elke regel toont:
   - het class-level (bijv. *Level 3*) en klein het characterlevel waarop het genomen is (bijv. *character level 5*), zodat de volgorde bij multiclass zichtbaar blijft;
   - **wat je koos:** HP (zoals nu: level 1 van het character = maximum; anders gemiddeld of gerold), een feat-keuze waar die hoort (zie 4), en de opties van features die op dit level binnenkomen (zie 5);
   - **wat je krijgt:** de namen van de class- en subclass-features van dit level, gedempt weergegeven en aantikbaar (zie 6);
   - **een notitieveld** (zie 7).
4. **Feat-keuze alleen waar je een feat krijgt.** De feat-keuzelijst (met de Ability Score Improvement-verdeling zoals nu) staat op een levelregel als:
   - de class-features van dat level een feature bevatten die een feat geeft: `ability-score-improvement`, `epic-boon` of `fighting-style` (in de SRD-data: ASI- en Epic Boon-levels van alle classes; Fighting Style bij Fighter 1, Paladin 2 en Ranger 2); of
   - het het eerste characterlevel is (voor een extra origin feat, zoals nu mogelijk is); of
   - er op dat level al een feat is opgeslagen (opgeslagen keuzes worden nooit verborgen; toon dan de bestaande melding-stijl dat dit level normaal geen feat geeft).
5. **Opties op hun level.** Keuzes binnen een class-feature (Divine Order, Primal Order, Metamagic, Eldritch Invocations en andere opties met `optionOf`) staan in de levelregel waar de bovenliggende feature binnenkomt, met dezelfde bediening als nu (radio bij uitsluitend, checkbox bij meerkeuze; `toggleOption`). Opties van species-traits (Elven Lineage) verhuizen naar het blok *Species en background*, onder de species-keuzelijst. Het losse blok *Keuzes* (`OptionsSection`) verdwijnt.
6. **Aantikbare features.** Een featurenaam in een levelregel klapt open en toont de featuretekst (zoals de rijen op het tabblad Features op de sheet). Bij een skelet-feature zonder tekst staat een korte melding dat deze subclass nog leeg is en later zelf aangevuld kan worden. Voor een skelet-subclass toont de regel op het subclass-level de naam van de subclass als "krijgt"-regel.
7. **Notitie per level.** Een vrij tekstveld per levelregel voor keuzes die de app niet kent (maneuvers, geleerde spells, keuzes uit een PHB-subclass). Alleen tekst; de rules-motor gebruikt het niet. De notities staan ook in de export.
8. **Knoppen.** Onder elk class-blok *+ Level <class>* (voegt een level van die class toe aan het eind van de levelvolgorde) en *Laatste level <class> verwijderen* (verwijdert het hoogste level van die class, waar het ook in de volgorde staat). Onder alle blokken een keuzelijst met een class plus *+ Andere class* om een eerste level van een nieuwe class toe te voegen (de bestaande multiclass-voorwaarde-melding blijft). Een nieuw character zonder levels toont alleen dat laatste onderdeel, met als tekst *Kies een class*.

## 3. Niet-doelen

- Geen PHB-teksten of -effecten. De 36 skelet-subclasses blijven leeg; aanvullen gebeurt later (bibliotheek en import, plan 1C) uit Sams eigen boek, in eigen woorden, in een privébestand buiten de openbare repository.
- Geen spells kiezen per level; spells blijven op het tabblad Spells.
- Geen wijziging van de sheet zelf, behalve dat de levelnotities nergens op de sheet hoeven te verschijnen (zie Open punten).
- Geen nieuwe effect-soorten.

## 4. Anti-doelen (dit zou een mislukking zijn, ook als het technisch werkt)

- Opgeslagen keuzes (feat, ASI, opties, subclass) die stil verdwijnen of verborgen worden door de nieuwe indeling.
- Een subclass die vóór het subclass-level al features geeft.
- Een formulier dat op de iPad staand niet meer past of tikvlakken kleiner dan 44×44 px heeft.
- Bestaande characters die niet meer laden.

## 5. Randvoorwaarden

- Alle Global Constraints van plan 1B blijven gelden (NL/EN in beide JSON-bestanden, spelregeltermen Engels, tikvlakken ≥ 44 px, invoer 16 px, TypeScript strict zonder `any`, `src/rules` puur, UI-tests met `// @vitest-environment jsdom` via `src/ui/testing/render.tsx`).
- De levelvolgorde in `choices.levels` blijft de bron van waarheid (de rules-motor rekent multiclass, HP van het eerste level en de proficiency daarmee). De blokken zijn alleen een andere weergave van dezelfde lijst.
- Het subclass-ID blijft opgeslagen op een `LevelChoice` zoals nu. Bij minder levels dan het subclass-level staat het op het hoogste bestaande level van die class (dit doet `setSubclass` al); de rules-motor laat subclass-features al pas meetellen vanaf hun eigen level (`f.level <= cl.level` in `src/rules/features.ts`). Bij het toevoegen van levels moet het subclass-ID meeverhuizen naar het subclass-level, of de rules-motor moet het van elk level van die class accepteren; de bouwer kiest, met een test dat het na *+ Level* blijft staan en na *Laatste level verwijderen* niet verloren gaat zolang er nog een level van die class is.
- **Schemawijziging voor de notitie (mijn keuze):** `LevelChoice` krijgt een optioneel veld `note: string`. Dat gaat via `schemaVersion: 2` met een migratie 1 → 2 die niets verandert (het veld is optioneel), plus de bestaande migratietests en de vaste fixture `character-v1.json` die door de migratie geldig blijft. Exportversie blijft 1; `parseExportFile` migreert characters al. Reden: de hoofdspec legt `schemaVersion` vast als contract; een veld stil toevoegen zou een oudere app-versie (een open tabblad met de vorige versie) data laten afwijzen zonder duidelijke melding.

## 5a. Beslissingen na de bouwerscontrole (mijn keuzes, Sam kan ze terugdraaien)

1. **Subclass-ID.** `src/rules/levels.ts` neemt het subclass-ID al over van elk level van die class; `setSubclass` blijft zoals het is (op het subclass-level, of het hoogste bestaande level). Wordt het level dat het ID draagt verwijderd terwijl er nog levels van die class zijn, dan verhuist het ID naar het hoogste overgebleven level van die class. Test: kiezen op level 1, dan *+ Level* tot 4, dan twee keer verwijderen: de subclass blijft gekozen; features verschijnen pas vanaf hun level.
2. **Opties zonder actieve bovenliggende feature** (bijv. een Divine Order van een verwijderde Cleric) worden in het formulier niet getoond en bij opslaan weggegooid (`finishForm` → `pruneOptions`), zoals al vóór dit werk; de rules-motor negeert ze al. Daarom vraagt het verwijderen van een level dat de bovenliggende feature van een gekozen optie meebrengt eerst bevestiging (zie 4). Komt de class later terug, dan moet de keuze opnieuw gemaakt worden.
3. **Feat-levels.** Per levelregel wordt gekeken naar de features van díe regel (class-level én subclass-features van dat level), niet naar de eerste keer dat een ID voorkomt. Een feature telt als feat-gevend als het ID eindigt op `ability-score-improvement`, `epic-boon`, `fighting-style` of `additional-fighting-style` (Champion 7). Multiclass: per class-level, zoals de SRD-tabellen.
4. **Laatste level verwijderen** vraagt eerst bevestiging als dat level een feat, ASI, een niet-lege notitie, het subclass-ID (alleen als het de laatste level van die class is; anders verhuist het ID, zie 1) of de bovenliggende feature van een gekozen optie draagt (de bestaande `Dialog`); anders direct, zoals nu.
5. **Schemaversie 2 blijft de keuze** (zie 5), ook al raakt het de tests die `schemaVersion: 1` hard gebruiken: die worden bijgewerkt, de fixture `character-v1.json` blijft ongewijzigd en moet via de migratie geldig laden.
6. **Export.** De notitie gaat mee omdat `choices.levels` al in de export zit; er komt geen apart formaat.
7. **Plaatshouder `<class>-subclass`** (bijv. *Fighter Subclass* op level 3): is er een subclass gekozen, dan toont de "krijgt"-regel de naam van de subclass in plaats van de plaatshouder; zonder keuze staat er de plaatshouder met de tekst dat je de subclass hierboven kiest.

## 6. Wat aan de bouwer is

- De exacte componentindeling (bijv. `ClassBlock`, `LevelRow`) en of `LevelsSection` wordt herschreven of vervangen.
- Of de herkenning van feat-levels gebeurt via de feature-ID's (`…:ability-score-improvement`, `…:epic-boon`, `…:fighting-style`) of via een eigenschap in de data; een test per soort is nodig.
- De vorm van het openklappen (een `<details>` met zichtbaar uitklappijltje, of een knop). Let op: op het tabblad Features is het ijltje mogelijk verdwenen door `display:flex` op `<summary>`; dat hier niet herhalen.
- De nieuwe i18n-sleutels en hun teksten.
- De e2e-test `tests/e2e/app.spec.ts` bijwerken waar selectors veranderen (*Add level* per blok), zonder de controle te verzwakken; plus een e2e-stap die een subclass kiest op level 1 en controleert dat die op de sheet pas vanaf het subclass-level verschijnt.

## 7. Open punten (beslissingen die later kunnen)

- Of de levelnotities ook op de sheet zichtbaar moeten zijn (bijv. op het tabblad Features). Nu: alleen in het formulier en in de export.
- De bekende kleine punten op het formulier uit de overdracht 1B (Engelse labels als *Class*, *Subclass*, *Feat:*; ongelabelde Roll-knoppen) mogen in dit werk meegenomen worden waar de bouwer die regels toch aanraakt.
