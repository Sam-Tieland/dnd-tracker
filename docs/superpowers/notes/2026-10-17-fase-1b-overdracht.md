# Overdracht fase 1B: de app aan tafel

Geschreven op 2026-10-17, na Task 17 van plan 1B (`docs/superpowers/plans/2026-10-16-fase-1b-app-aan-tafel.md`). Voor Sam en voor de sessie die plan 1C schrijft.

## 1. Wat er nu staat

Branch `fase-1b`, gestart vanaf `main` op `f34a584`. Alle 17 bouwtaken zijn uitgevoerd door een bouwer (subagent), beoordeeld door een reviewer en waar nodig hersteld in een fixronde.

De app kan nu:

- Characters maken, bewerken en verwijderen, met multiclass, keuze-features (Divine Order, Primal Order, Elven Lineage), Magic Initiate, feats en ability scores via Standard Array, Point Buy, gerold of handmatig.
- De sheet in de hybride indeling: bovenbalk met HP, schade, genezen, temp HP, AC, Initiative, Speed, condities, Exhaustion, Heroic Inspiration, death saves en rusten. De vijf tabbladen zijn Acties, Spells, Spullen, Features en Notities. Op smalle schermen en een staande iPad wordt de linkerkolom het tabblad Abilities.
- Een dobbelstenenpaneel met Advantage, Disadvantage en kritieke treffers.
- Ongedaan maken voor de laatste 20 wijzigingen per character.
- Opslag in IndexedDB met validatie en migraties. Beschadigde rijen blijven zichtbaar als *beschadigd*.
- Export per character en van alle data, met een back-upherinnering.
- Nederlands en Engels, licht en donker thema, en credits met de letterlijke SRD-attributie.
- Installeerbaar als PWA en offline te gebruiken. De melding "Nieuwe versie beschikbaar · Herladen" herlaadt de app pas als je erop tikt.
- End-to-end-tests in Chromium en in WebKit op iPad-formaat (staand), plus een GitHub Actions-workflow die test, bouwt en naar GitHub Pages publiceert.

### Controle op 2026-10-17

| Controle | Uitkomst |
|---|---|
| Unit-tests | 62 bestanden, 639 tests groen |
| Typecheck | Schoon |
| Build | Geslaagd: PWA v2.0.0 met 12 precache-items |
| `convert:srd` | Geen verschil in `generated/` |
| e2e Chromium | 4 geslaagd |
| e2e WebKit | 2 geslaagd, 2 bewust overgeslagen (export en offline, die controleer je op de iPad) |

De handmatige controle op de pc (`npm run preview`, in de browser van de Claude-app):

- De service worker en het manifest zijn actief.
- Een Cleric 1, Elf, met Wood Elf en Protector heeft Speed 35 ft en HP 10/10.
- 10 schade brengt haar naar 0 HP. De death-save-rij verschijnt en een rol telt mee.
- Na 1 HP genezen geeft een Short Rest met één d8 +4 (worp 2 + CON 2).
- Thema en taal wisselen direct.

Niet door Claude gedaan:

- Op de installatieknop in Chrome klikken.
- *Alle data exporteren* echt laten downloaden. De e2e-test in Chromium dekt die download wel.

## 2. Beslissingen tijdens de uitvoering (rulings)

De volledige tekst staat in het SDD-ledger. Die map wordt door git genegeerd en verdwijnt na de eindreview. Daarom staan ze hier.

1. **Worktree.** Er is gewerkt in een git-worktree (`C:\Users\SamTieland\dev\dnd-tracker-fase-1b`, branch `fase-1b`) en niet met `git switch` in de hoofdmap. Andere sessies gebruiken die hoofdmap.
2. **Plan op `main`.** Het plan is als docs-commit `f34a584` op `main` gezet, zodat de worktree het heeft.
3. **Modellen.** Haiku voor taken met bijna kant-en-klare code, sonnet voor opslag, UI en omgevingsgevoelig werk. Reviewers draaien op sonnet. De eindreview draait op het meest capabele model.
4. **Co-Authored-By.** Deze regel noemt het model dat de commit schreef.
5. **Task 18.** Stap 1 t/m 3 doet de controller. Online zetten gebeurt alleen met Sams akkoord en een GitHub-account. De iPad-controle doet Sam.
6. **Modellen bijgesteld.** Om gebruik te sparen draaiden bouwers op haiku, behalve Task 7, 9, 12 en 14. Een bouwer die vastloopt of twee fixrondes nodig heeft, gaat naar sonnet.
7. **Gecombineerde reviews.** Kleine aangrenzende taken zijn samen beoordeeld: 7+8, 10+11, 15+16.
8. **Gebruiksgrens.** Bij een weekgebruik van 90% of meer stopt de uitvoering op een taakgrens.
9. **Task 5 en 6** zijn samen beoordeeld.
10. **Bewaarwachtrij.** Opslagen gaan na elkaar via één keten. `flush()` wacht op een lopende schrijfactie. Een mislukte waarde komt alleen terug in de wachtrij als er niets nieuwers wacht. Zo overschrijft een oude mislukte save nooit een nieuwere.
11. **App-shell (Task 9).** De laadfout krijgt een tweetalige melding. *Alles exporteren* zit volledig in de foutafhandeling. Een back-up met onleesbare characters meldt dat (`export.partial`). Een kapotte hash valt terug op de lijst. Checkboxen en radio's zijn 44 px groot.
12. **`syncHitPoints`.** Bij meer dan 0 HP zet deze functie de death saves op 0/0, zoals de SRD zegt.
13. **Characterlijst.** De lijst toont een foutmelding met export en een link naar Instellingen als lezen mislukt. Een mislukte verwijdering geeft een toast.
14. **Gerolde HP** worden begrensd tot 1 t/m de hit die. Lijstvelden (talen, tools) bewaren bij elke wijziging en niet pas bij blur. Anders gaat invoer op de iPad verloren.
15. **Chip in de bovenbalk.** Die toont een actieve Advantage of Disadvantage en een gewapende Critical. Een tik zet hem uit.
16. **Dood character** (3 failures of Exhaustion 6). Schade, genezen, temp HP en rusten zijn geblokkeerd. Undo, de death-save-reset en Exhaustion −/+ blijven werken.
17. **Bewerken direct na een wijziging.** Het formulier wacht tot de lopende bewaaractie klaar is (`whenSaved()`, hooguit 2 s). Zonder die wachttijd zou het formulier de oude stand laden en terugschrijven.
18. **Task 17 op sonnet**, met de eindreview op het meest capabele model.
19. **`vite-plugin-pwa`** staat bij de devDependencies. Het is een build-plugin.
20. **e2e-selectors** mochten worden aangepast aan de huidige UI zolang elke controle haar bedoeling houdt. Uiteindelijk bleken ze allemaal ongewijzigd te kloppen.
21. **Update-melding.** Die staat bovenaan in de normale paginaflow en niet `fixed`, zodat ze de bovenbalk van de sheet (HP, Undo, Schade) niet afdekt. De workflow bouwt expliciet vóór het publiceren.

## 3. Wat plan 1C moet meenemen

Uit het plan:

- **Importeren** met validatie en de keuze *vervangen* of *als kopie toevoegen*. De importpoort `parseExportFile` bestaat al. Let op:
  - dubbele character-ID's in één bestand;
  - een `kind: 'character'`-bestand met een ander aantal characters dan één;
  - een back-up zonder de onleesbare characters (de export meldt dat al);
  - `lastExportAt` accepteert alleen UTC-tijden (`Z`): `+02:00` wordt nu `null`.
- **Bibliotheek:** doorbladeren en zoeken, skeletten aanvullen en eigen inhoud toevoegen. De effecten-editor slaat alleen de eigen toevoegingen op, nooit een kopie van de effecten van het doel (`mergeFill` neemt niets weg). Eigen inhoud gaat door `validateUserContent` en heeft `user:`-ID's.
- **Ontbrekende effecten:**
  - Monk Martial Arts en Unarmed Strike;
  - Archery (alleen ranged);
  - Tireless, Nature's Veil, Stroke of Luck;
  - Divine Intervention, Holy Nimbus;
  - Draconic Flight, Large Form;
  - lineage-spells;
  - de gratis cast van Magic Initiate;
  - Persistent Rage, Wild Resurgence;
  - Eldritch Blast-beams.

Erbij gekomen tijdens 1B:

- **Bewaarwachtrij:** hij heeft geen `cancel`. Wie na een bewerking verwijdert, moet eerst flushen. Een flush die nooit klaar is, blijft in `pendingFlushes`, waardoor elke volgende `whenSaved()` 2 s wacht.
- **Gevalideerd schrijfpad voor `customContent`:** dat bestaat nog niet.
- **Ongedaan maken:** de undo-stapel wordt niet geleegd na een bewerking in het formulier. Een oudere undo zet dan ook HP en slots terug. Een undo-toast blijft na het verlaten van de sheet staan en schrijft bij een tik een oude stand weg.
- **Magic Initiate:** er is geen limiet (2 cantrips + 1 spell) en geen controle op de feat.
- **Dode characters:** die kunnen op het tabblad Acties nog resources en slots gebruiken en rollen.
- **Kleine UX-punten:**
  - een tweede body armor of schild geeft geen melding;
  - een uitgerust wapen met aantal 0 geeft nog een aanval;
  - een aanpassing met waarde 0 of leeg wordt stil genegeerd;
  - de update-melding heeft geen knop *Later*.

De punten die de eindreview van 1B niet oplost, komen in sectie 5 te staan.

## 4. Open vragen voor Sam

- **GitHub-account:** heb je er een, en mag de app online? Gratis GitHub Pages werkt alleen vanuit een openbare repository. Daarin staan alleen code, SRD-inhoud onder CC-BY-4.0 en de namen van de skelet-subclasses.
- **PHB-controle uit 1A** (staat nog open):
  - Eldritch Knight en Arcane Trickster gebruiken Intelligence.
  - Hun slots als enige caster horen bij `ceil(level / 3)`, in een multiclass bij `floor(level / 3)`.
  - Paladin + Ranger: de code rondt per class af (3+3 → 4), maar de SRD-tekst kan ook 3 betekenen.
- **Samenvoegen:** gaat `fase-1b` in `main`? Dat besluit je na de eindreview.
- **iPad:** hoe voelen de checkboxen van 44 px (grote grijze vierkanten, bijvoorbeeld Heroic Inspiration)? En werkt export via het deelmenu? Een fout als `NotAllowedError` valt nu niet terug op downloaden.

## 5. Eindreview

Wordt aangevuld na de eindreview van de hele branch.
