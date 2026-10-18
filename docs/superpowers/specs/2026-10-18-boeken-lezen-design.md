# Ontwerp: je eigen boeken lezen in de app

Datum: 2026-10-18. Status: concept, ter goedkeuring door Sam.
Hoort bij: `docs/superpowers/specs/2026-10-15-dnd-character-tracker-design.md` (de hoofdspec blijft gelden; dit ontwerp voegt een boekenlezer toe).

## 1. Waarom

Sam wil zijn eigen PDF-boeken (PHB 2024, Xanathar's Guide to Everything, Tasha's Cauldron of Everything) in de app kunnen lezen, om twee redenen:

1. **Controleren:** nagaan of wat de app over een feature, subclass of regel zegt klopt met het boek.
2. **Het idee achter een class lezen:** de sfeer en het verhaal van een class of subclass, niet alleen de regels.

Succes is: Sam zit aan tafel met de iPad, tikt bij *Twilight Sanctuary* op zijn sheet op "boek", en Tasha's opent op die pagina. Of: hij opent *Boeken*, typt "twilight" in de zoekbalk en tikt op *Twilight Domain*.

## 2. Wat er al is (feiten)

- De drie PDF's staan in Sams OneDrive-map (`C:\Users\SamTieland\OneDrive - BASED\Documents\DnD\`): `DnD 5e PHB 2024.pdf` (387 pagina's, 232 MB), `Xanathar's Guide To Everything.pdf` (196 pagina's, 97 MB), `Tasha's Cauldron of Everything.pdf` (194 pagina's, 73 MB). Ze zijn **scans zonder tekstlaag** en **zonder bladwijzers** (outline leeg, gecontroleerd met pypdf).
- Paginanummering: PHB is enkelzijdig, pdf-pagina = boekpagina − 1. Xanathar's en Tasha's mengen enkele pagina's en **dubbele spreads** (twee boekpagina's op één pdf-pagina). Zie `boek/_tools/WERKINSTRUCTIE.md` in de OneDrive-map.
- Elke subclass-notitie in `boek/subclasses/*.md` (105 stuks) heeft al `bron` en `pagina` (boekpagina) in de kop. `WERKINSTRUCTIE.md` bevat inhoudsopgaven met boekpagina's per class en subclass.
- De app bewaart alles lokaal in IndexedDB via Dexie (`src/storage/db.ts`, versie 1: `characters`, `customContent`, `settings`), gebruikt hash-routes (`src/ui/router.ts`) en is een PWA (`vite.config.ts`, workbox, max. 5 MB per gecached bestand).
- Er bestaat een converter voor de subclass-notities (`scripts/boek/`, branch `boek-import`, **nog niet gemerged**) die weigert uitvoer in de repo te schrijven.

## 3. Doelen

1. **Boeken toevoegen per apparaat.** In Instellingen staat een blok *Boeken*: "Boek toevoegen" opent een bestandskiezer voor een PDF. De app herkent het boek (zie §6.2) en bewaart het bestand lokaal op dat apparaat. Per boek zie je of het er is, hoe groot het is, en een knop om het van dit apparaat te verwijderen. Er gaat niets naar internet.
2. **Boekenscherm (versie A uit de schets).** Een vast menu-item *Boeken*. Het boek beslaat het hele scherm:
   - bovenbalk: *← terug* (naar waar je vandaan kwam, meestal de sheet), boektitel, huidige **boekpagina**, vorige/volgende, zoom − / +;
   - links een zijpaneel met bovenaan een **zoekbalk**; bij een leeg zoekveld toont het paneel de **inhoudsopgave** van het gekozen boek (hoofdstukken → classes → subclasses), klikbaar;
   - rechts de pagina, met vegen of knoppen om te bladeren en knijpen om te zoomen op touch.
   - Zonder boeken op het apparaat toont het scherm uitleg en een knop naar Instellingen → Boeken.
3. **Zoeken op namen.** De zoekbalk zoekt (hoofdletterongevoelig, op deel van een woord) in de namen uit de privé inhoudsopgave van **alle aanwezige boeken**: hoofdstukken, classes, subclasses, features, spells, feats, species, backgrounds. Een resultaat toont naam, boek, soort en boekpagina; tikken opent die pagina.
4. **Naar de juiste pagina vanaf de sheet.** Bij een feature, subclass of class op de sheet (tabblad Features, en de subclass in de bovenbalk/het formulier) staat een knopje "boek" als de inhoudsopgave een pagina voor dat onderdeel kent. Tikken opent het boekenscherm op die pagina. Kent de inhoudsopgave het onderdeel wel maar staat het boek niet op dit apparaat, dan blijft de knop zichtbaar en zegt hij bij tikken "Voeg <boek> toe in Instellingen → Boeken". Zonder bekende pagina is er geen knop.
5. **Boekpagina's, niet pdf-pagina's.** Overal (bovenbalk, zoekresultaten, "ga naar pagina") werkt de gebruiker met het paginanummer dat in het boek gedrukt staat. Een veld "ga naar blz." in de bovenbalk accepteert een boekpagina. De app rekent zelf om naar de pdf-pagina, ook bij spreads.
6. **Onthouden.** Per boek onthoudt de app de laatst bekeken pagina en het zoomniveau (in de `settings`-tabel); *Boeken* openen zonder doel brengt je terug naar het laatst gelezen boek op die pagina.
7. **De privé inhoudsopgave.** Claude maakt één privé bestand met de inhoudsopgave en zoeklijst van de drie boeken (zie §6.3) en zet het in `boek/import/` in Sams OneDrive-map. Sam importeert het via Instellingen → Boeken → "Inhoudsopgave importeren". Opnieuw importeren vervangt de vorige versie.
8. **Telefoon.** Hetzelfde scherm; onder `NARROW_QUERY` (max-width 760px) klapt het zijpaneel in tot een knop "Inhoud / zoeken" die het paneel over de pagina schuift.
9. **Snel blijven.** Alleen de getoonde pagina (en eventueel de volgende) wordt gerenderd; openen van een boek mag de sheet niet trager maken; de lezer en pdf.js worden pas geladen als je het boekenscherm opent.

## 4. Niet-doelen

- **Geen zoeken in de tekst zelf (OCR).** Bewust uitgesteld; kan later als aparte uitbreiding (OCR lokaal op Sams pc, privé tekstindex).
- Geen aantekeningen, markeringen of bladwijzers in de boeken.
- Geen synchronisatie van boeken tussen apparaten; elk apparaat krijgt ze apart.
- Boeken en inhoudsopgave gaan **niet** mee in export, back-up of PDF-export van een character.
- Geen andere boeken dan de drie hierboven in deze versie (de opzet mag wel uitbreidbaar zijn).

## 5. Anti-doelen (een mislukking, ook als het technisch werkt)

- **Boekinhoud in de openbare repo, op GitHub Pages of over het netwerk.** Geen PDF, geen pagina-afbeelding, geen tekst uit de boeken, en ook de privé inhoudsopgave niet (titels + paginanummers van niet-SRD-onderdelen horen niet in de repo). Tests gebruiken zelfgemaakte nep-PDF's.
- Een knop "boek" die stil niets doet, of een boek dat op de verkeerde pagina opent zonder dat iemand het merkt.
- Een app die trager of instabiel wordt op de iPad door de grote bestanden (bijvoorbeeld door een PDF van 232 MB in één keer in het geheugen te laden waar dat niet hoeft, of door de PWA-cache te laten vollopen).
- Bij een iPad die ruimte opruimt stilletjes de boeken kwijtraken zonder dat de app dat laat zien.

## 6. Hoe

### 6.1 Lezen: pdf.js

PDF's renderen met **pdf.js** (`pdfjs-dist`), pagina voor pagina naar een canvas op de pixeldichtheid van het scherm. De worker en het lezerscherm worden lazy geladen (dynamic import) zodat de rest van de app er niet groter van wordt. De worker moet in de PWA-cache komen zodat lezen offline werkt; let op de grens van 5 MB per bestand in `workbox.maximumFileSizeToCacheInBytes`. Pin een exacte versie, zoals bij pdf-lib.

### 6.2 Boeken bewaren en herkennen

- Opslag lokaal in de browser. De PDF wordt bewaard als bestand/Blob; het bestand mag niet bij elke paginawissel volledig opnieuw in het geheugen worden gelezen (pdf.js kan vanuit een Blob met range-reads werken, of via een object-URL).
- Na het toevoegen van het eerste boek vraagt de app `navigator.storage.persist()` aan, zodat iPadOS de opslag niet zomaar opruimt. Het blok *Boeken* in Instellingen toont de gebruikte ruimte (`navigator.storage.estimate()`) en of de opslag "blijvend" is.
- **Herkennen:** de app stelt voor welk boek het is aan de hand van het aantal pagina's (387 / 196 / 194 bij Sams bestanden) en de bestandsnaam, en vraagt de gebruiker het te bevestigen of een ander boek te kiezen in een keuzelijst (PHB 2024, Xanathar's, Tasha's). Een tweede bestand voor hetzelfde boek vervangt het eerste na bevestiging.
- Mislukt het bewaren (te weinig ruimte), dan zegt de app dat duidelijk en blijft er geen half bestand achter.
- **Afwijkend aantal pagina's.** Bevestigt de gebruiker een PDF waarvan het aantal pagina's niet past bij de paginakaart van dat boek (andere druk of scan), dan wordt het bestand wel bewaard, maar staan de paginakaart, de inhoudsopgave en de "boek"-knoppen voor dat boek uit. Je kunt dan alleen op pdf-pagina bladeren, en een vaste melding legt uit waarom. Zo opent nooit stilletjes een verkeerde pagina. *(Keuze van Claude.)*

### 6.3 De privé inhoudsopgave (bestand)

Eén JSON-bestand, bijvoorbeeld `boek/import/boeken-inhoud.json` in Sams OneDrive-map, met een eigen `format`-waarde (los van de bestaande export-`format` met `kind: character|backup`), een `version` en per boek:

- `bookId` (`phb-2024`, `xge`, `tce`), titel, verwacht aantal pdf-pagina's;
- **paginakaart** boekpagina → pdf-pagina, en bij een spread welke helft (links/rechts). Voor PHB is dat de vaste verschuiving −1; voor Xanathar's en Tasha's een tabel, opgemaakt door de voetteksten van de scans te lezen (zoals in `WERKINSTRUCTIE.md`);
- **items**: `{ title, type (chapter | class | subclass | feature | spell | feat | species | background | section), bookPage, parent?, contentIds? }`. `parent` bouwt de boom van de inhoudsopgave; `contentIds` koppelt een item aan ids uit de app-registry (SRD-ids, skelet-ids, de ids uit het subclass-importbestand), zodat de knop "boek" op de sheet weet welke pagina hoort bij welk onderdeel.

**Meer dan één plek per onderdeel.** Een onderdeel kan in meer boeken staan (een class in de PHB plus optionele features in Tasha's). De koppeling is daarom veel-op-veel: hetzelfde `contentId` mag bij meerdere items staan. Heeft een onderdeel meer dan één plek, dan opent "boek" een klein keuzemenu ("PHB 2024 blz. 68 · Tasha's blz. 30"). Plekken in boeken die niet op het apparaat staan, staan grijs in dat menu met de melding uit doel 4. *(Keuze van Claude.)*

**Koppelen aan de app.** `contentIds` zijn de echte registry-ids, zodat de app niet op namen hoeft te gokken. De bouw begint daarom met het mergen van branch `boek-import` (na controle) zodat het id-schema van het subclass-importbestand vastligt. Bij het importeren van de inhoudsopgave meldt de app welke `contentIds` hij niet kent ("12 onderdelen niet gevonden"), en het script dat het bestand maakt controleert de ids ook tegen het subclass-importbestand en de SRD-registry. Een kapotte koppeling valt zo op en blijft nooit stil. *(Keuze van Claude.)*

Het bestand wordt bij import gevalideerd (zod, zoals de rest van de opslag) en lokaal bewaard; een kapot of verkeerd bestand geeft een duidelijke melding en verandert niets.

Het bestand wordt **gemaakt door een script plus handwerk van Claude**, buiten de repo:
- subclasses en hun features: uit `boek/subclasses/*.md` (`bron`, `pagina`, featurekoppen);
- classes en hoofdstukken: uit de inhoudsopgaven in de boeken zelf (pagina's renderen met `boek/_tools/render.py` en lezen);
- spells, feats, species, backgrounds: uit de inhoudsopgave/index van de boeken;
- paginakaart voor spreads: door voetteksten te lezen.
**In twee stappen (besluit Sam).** Versie 1 van het bestand bevat: de paginakaart van alle drie de boeken (inclusief alle spreads), hoofdstukken, classes, subclasses en hun features. Daarmee werken het boekenscherm, de inhoudsopgave, het zoeken op die namen en de "boek"-knoppen. Spells, feats, species en backgrounds komen in een latere versie van hetzelfde bestand; de app en het bestandsformaat ondersteunen die soorten vanaf het begin, zodat later alleen een nieuw bestand geïmporteerd hoeft te worden.

Het script mag in de repo staan (zoals `scripts/boek/`), maar moet net als de converter weigeren uitvoer binnen de repo te schrijven. De gegevens zelf komen nooit in de repo.

### 6.4 Routes en navigatie

Nieuwe hash-routes naast de bestaande, bijvoorbeeld `#/books` (laatst gelezen) en `#/books/<bookId>/<boekpagina>`. *← terug* gaat terug in de geschiedenis als je vanaf de sheet kwam, anders naar de lijst. Het menu krijgt een item *Boeken*.

### 6.5 Spreads tonen

Bij een spread toont de app de hele pdf-pagina, gezoomd en verschoven naar de juiste helft, zodat de bedoelde boekpagina in beeld staat. *(Keuze van Claude; zie §8.)*

### 6.6 Taal en stijl

UI-teksten in NL en EN via `src/i18n` zoals de rest. Het scherm volgt de Herbergtafel-stijl (perkament op eiken, tokens uit `src/ui/styles.css`), zoals in de goedgekeurde schets (versie A met zoekbalk): `.superpowers/brainstorm/1993-1792281919/content/boek-weergave-v2.html` in de DnD-map.

## 7. Wat Sam besliste

- Beide doelen: controleren en het idee van een class lezen.
- Eerst moet het boek openen en bladeren via de inhoudsopgave; direct springen vanaf de sheet is "fijn als het kan". Beide zitten in dit ontwerp.
- Een klikbare privé inhoudsopgave door Claude: ja.
- Weergave: **versie A** (boek over het hele scherm, terugknop, inhoudsopgave links), **met een zoekbalk linksboven**.
- Boeken één keer per apparaat zelf toevoegen: akkoord.
- De inhoudsopgave komt in twee stappen: eerst hoofdstukken, classes, subclasses en features, later spells, feats, species en backgrounds.

## 8. Keuzes van Claude (ter controle door Sam)

- Zoeken alleen op namen, geen OCR (Sam reageerde "dit is top" op de schets met zoeken op namen; OCR is apart genoemd en niet gekozen).
- Boeken en inhoudsopgave niet in back-up/export (te groot, en privé).
- Herkennen op aantal pagina's + bevestigen.
- Spreads: hele scan tonen, gericht op de juiste helft.
- pdf.js als lezer.
- Het "boek"-knopje bij features, subclass en class; niet bij spells en items (die zijn grotendeels SRD en staan al in de app). Kan later.

## 9. Aan de bouwer

- Opslagtechniek voor de PDF's (Dexie-tabel met Blobs in een nieuwe db-versie, of het Origin Private File System), mits §5 en §6.2 gehaald worden; test op iPad Safari als geïnstalleerde PWA.
- Precieze vorm van het bestand in §6.3 en hoe `contentIds` gegenereerd worden. Afhankelijkheid: de ids uit het subclass-importbestand komen uit `scripts/boek/` op branch `boek-import`, die nog niet in `main` zit.
- Hoe "ga naar blz." omgaat met een pagina die niet bestaat of in een overgeslagen deel valt.
- Hoeveel pagina's vooruit renderen; geheugenbeheer van canvassen.
- Waar het knopje "boek" precies staat op de sheet.
