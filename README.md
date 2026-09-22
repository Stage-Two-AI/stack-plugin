# Stage Two-plugin voor Claude Code

Je hebt een app die Stage Two voor je heeft gebouwd, en je werkt eraan met Claude Code.
Deze plugin zorgt dat Claude Code daarbij de werkwijze van Stage Two kent en bewaakt, en
dat je zelf verbeteringen aan die werkwijze kunt ophalen. Ook als Stage Two er niet meer
bij is.

Je hoeft geen programmeur te zijn om dit te gebruiken. De eerste keer loopt Stage Two het
met je door; daarna merk je er weinig van, behalve dat je assistent af en toe iets uitlegt
en je zelf nieuwe apps kunt beginnen.

## Wat de plugin doet

- **Een begin op een nieuwe computer.** Typ `/stack:starten` en je assistent kijkt wat
  er op je computer ontbreekt, installeert het, helpt je inloggen bij GitHub en vraagt
  daarna wat je wilt doen. Zie hieronder.
- **Zelf een nieuwe app beginnen.** Typ `/stack:nieuwe-app`. Je assistent denkt eerst
  met je mee (wat moet de app doen, voor wie, en heeft hij een database nodig) en maakt
  hem daarna aan uit de nieuwste Stage Two-template, onder het GitHub-account van je
  bedrijf. Zie hieronder.
- **De vaste routes als commando's.** Je assistent kent vier vaste manieren van werken,
  die ook in je app beschreven staan (`docs/routes/`). Met de plugin kun je ze ook
  aanroepen: `/stack:verder-werken` (iets toevoegen of wijzigen), `/stack:databasewijziging`,
  `/stack:nieuwe-app-aanvragen` (alleen voor het allereerste project) en `/stack:lokaal-kijken`.
  Je hoeft ze niet te gebruiken; gewoon vragen wat je wilt werkt ook.
- **Een bewaker.** Een deel van de bestanden in je app is niet van jou maar van de
  gedeelde werkwijze: de automatische controles, de afspraken, de routes. Vraag je je
  assistent om daar iets in te wijzigen, dan houdt de plugin dat tegen en legt hij uit
  waarom. Zonder plugin houdt de controle op GitHub het alsnog tegen; met plugin hoor je
  het meteen.
- **Een melding als er een nieuwere werkwijze is.** Open je je app en heeft Stage Two de
  gedeelde werkwijze verbeterd, dan zegt je assistent dat één keer, hooguit één keer per
  dag. Meer niet: hij doet niets zonder dat jij het vraagt.
- **Bijwerken met één commando.** Typ `/stack:bijwerken` en je assistent brengt je app
  naar de nieuwste werkwijze, als voorstel (een pull request) dat jij bekijkt en
  goedkeurt. Je eigen werk raakt hij nooit aan.

Er komt geen wachtwoord, sleutel of computer van Stage Two aan te pas. Alles loopt via je
eigen GitHub-account en je eigen computer.

## Installeren

Je hebt alleen Claude Code nodig: het tabblad **Code** in de Claude-app op je computer,
of Claude Code in een terminal. Open een map (leeg mag) en typ in het chatvenster:

```text
/plugin marketplace add Stage-Two-AI/stack-plugin
```

Er verschijnt een klein venster met de vraag of je deze bron vertrouwt. Bevestig dat.
Daarna opent een scherm met plugins waarin `stack` al klaarstaat: klik op het **plusje**
ernaast om hem te installeren. Dat is alles.

Werk je in een terminal en verschijnt dat scherm niet, typ dan ook nog:

```text
/plugin install stack@stagetwo
```

**Controleren dat het werkt.** Typ `/stack:` en kijk of de commando's verschijnen
(starten, nieuwe-app, bijwerken, verder-werken, databasewijziging, lokaal-kijken en
nieuwe-app-aanvragen). Zie je ze niet, sluit Claude Code dan en open de map opnieuw.

**Bijwerken van de plugin zelf.** Typ `/plugin`: daar staat de plugin met zijn versie en
een knop om bij te werken. Zet daar ook "automatisch bijwerken" aan, dan hoef je hier
nooit meer aan te denken.

## Beginnen op een nieuwe computer

Typ `/stack:starten`. Je assistent kijkt wat er ontbreekt (Git, Node, pnpm en de
GitHub-opdrachtregel) en installeert dat. Twee dingen om te weten:

- **Windows vraagt een paar keer om toestemming.** Er verschijnt dan een venster of dit
  programma wijzigingen mag aanbrengen. Klik op **Ja**. Op een Mac kan om je wachtwoord
  worden gevraagd.
- **Inloggen bij GitHub doe je zelf, één keer, in een terminal.** Je assistent legt het
  precies uit: je opent Git Bash (Windows) of Terminal (Mac), typt `gh auth login`,
  kiest GitHub.com, HTTPS, Yes en "Login with a web browser", en plakt een code in de
  browser. Daarna zeg je "klaar" in het chatvenster.

Soms kent Claude Code een net geïnstalleerd programma nog niet. Je assistent vraagt je
dan Claude Code af te sluiten en opnieuw te openen. Dat is normaal en gebeurt maar één
keer.

Tot slot zet je assistent je naam in Git, zodat later zichtbaar blijft welke wijziging
van jou is, welke van een collega en welke van Stage Two. Daarna vraagt hij wat je wilt:
een nieuwe app beginnen, verder werken aan een bestaande app, of een app bijwerken.

## Een nieuwe app beginnen

Typ `/stack:nieuwe-app`. Het eerste deel is een gesprek, en dat is bewust: de keuzes
daar zijn achteraf duur om te veranderen.

1. Is het echt een nieuwe app, of past het bij een app die je al hebt? De regel is: één
   app per verzameling gegevens. Gaat het over gegevens die al in een app zitten, dan is
   het een uitbreiding van die app, en die maak je met `/stack:verder-werken`.
2. Wat moet de app doen, voor wie, met welke gegevens, en wat is de eerste versie waar
   iemand echt iets aan heeft?
3. **Heeft de app een database nodig?** Je assistent geeft advies, met de reden:
   - *geen*: de app draait alleen op de hosting; kost niets extra;
   - *eigen*: een eigen databaseproject, nodig bij inloggen, meerdere mensen die tegelijk
     werken of veel gegevens. **Dit kost maandelijks geld** en wordt eenmalig door Stage
     Two ingericht.
4. Een naam en de plek: onder het GitHub-account van je bedrijf, in een nieuwe map op
   je computer.

Daarna maakt je assistent de app aan uit de nieuwste template, zet de eerste versie op
GitHub en beschermt de hoofdtak. Hij eindigt met wat er nog open staat en met de
volgende stap: open de nieuwe map in Claude Code en typ `/stack:verder-werken`.

De hosting en een eigen database worden daarna ingericht door een workflow op GitHub, in
de beheer-repo van je bedrijf (Stage Two zet die bij de start neer). Je assistent start
die workflow en wacht op het resultaat; bij een eigen database vraagt hij eerst of het
goed is dat er een databaseproject bij komt dat maandelijks geld kost. Dat is bewust zo
gebouwd: de toegang tot Vercel en Supabase hoort niet op een werkcomputer te staan.
GitHub is de enige plek waar de regels worden afgedwongen, en zo blijft dat. Heeft je
bedrijf nog geen beheer-repo, dan koppelt Stage Two de hosting en de database.

Laat Stage Two weten dat de app bestaat. Dan komt hij in het overzicht en doet hij mee
met updates van de werkwijze.

## Je app bijwerken

Zegt je assistent dat er een nieuwere versie van de werkwijze is, of wil je het gewoon
weten, typ dan:

```text
/stack:bijwerken
```

Wat er dan gebeurt:

1. Je assistent controleert of je bent ingelogd bij GitHub en of je aan je app mag werken.
2. Hij haalt de nieuwste werkwijze op en maakt in een tijdelijke kopie van je app een
   voorstel klaar. Je eigen bestanden en je lopende werk blijven onaangeraakt.
3. Hij vertelt je in een paar regels wat er verandert.
4. Alleen als een bestand van de werkwijze bij jou anders is dan verwacht (omdat iemand
   het ooit heeft aangepast) stelt hij een vraag: de nieuwe versie overnemen, of jouw
   versie houden. Twijfel je? Kies "houden"; dat verandert niets aan wat nu werkt, en
   Stage Two kan er later naar kijken.
5. Hij zet het voorstel op GitHub als pull request, onder jouw naam, met een uitleg in
   gewone taal.

Daarna is het aan jou, precies zoals bij elke andere wijziging: open de pull request,
wacht tot de controles groen zijn en klik op **Merge**. Zijn de controles rood, dan
voldoet je app niet aan een nieuwe regel. Neem dan contact op met Stage Two en zet de
controle niet uit.

## Als iets niet lukt

| Je ziet | Wat er aan de hand is | Wat je doet |
|---|---|---|
| "log eerst in bij GitHub met `gh auth login`" | Je computer is niet ingelogd bij GitHub | Typ `gh auth login` in een terminal en volg de stappen |
| "de template is niet bereikbaar" | Geen internet, of GitHub is even niet bereikbaar | Later opnieuw proberen |
| "je hebt geen schrijfrecht" | Je account mag niet in deze app schrijven | Vraag de eigenaar van de app je toe te voegen |
| "installeer pnpm" | `pnpm` ontbreekt op je computer | Vraag Stage Two, of installeer het zoals bij de start is uitgelegd |
| "er staat al een pull request open" | Er ligt al een voorstel voor deze versie | Bekijk die pull request en merge hem, of vraag Stage Two |
| Je assistent weigert een bestand te wijzigen | Dat bestand hoort bij de gedeelde werkwijze | Wil je de nieuwste versie: `/stack:bijwerken`. Wil je het anders: vraag het Stage Two |
| Na installeren zegt `/stack:starten` nog steeds dat iets ontbreekt | Claude Code kent het nieuwe programma nog niet | Claude Code afsluiten, opnieuw openen, weer `/stack:starten` |
| "de repo bestaat al" bij `/stack:nieuwe-app` | Er is al een app met die naam | Kies een andere naam |
| "main is nog niet beschermd" na `/stack:nieuwe-app` | Het GitHub-account staat op het gratis plan | Vraag Stage Two; de app werkt, alleen de bescherming ontbreekt nog |

Kom je er niet uit, dan is de vraag altijd welkom bij Stage Two. Vertel wat je typte en
wat er terugkwam; de melding is bedoeld om door te geven.

## Voor Stage Two

Alles hieronder is voor wie de plugin en de template onderhoudt.

### Wat waar staat

```text
.claude-plugin/    plugin.json (naam stack, versie) en marketplace.json (naam stagetwo)
hooks/             de bewaker (PreToolUse) en de melding bij sessiestart (SessionStart)
skills/            de zeven skills; met een script: bijwerken (bijwerken.mjs), starten
                   (controle.sh, shell omdat Node kan ontbreken) en nieuwe-app
                   (nieuwe-app.mjs: aanmaken, en --inrichten start de workflow in de
                   beheer-repo van de klant; plus ruleset.json voor main)
lib/               de kern: manifest lezen, toepassen, PR-tekst, git- en PR-stappen
beheer/            de beheerde run over het register van Stage Two; geen skill, alleen voor Stage Two
test/              de geheimenscan over boom en geschiedenis
```

`beheer/beheerd.mjs` staat bewust niet onder `bin/`: die map zet Claude Code op het
PATH van elke sessie waarin de plugin aanstaat, ook bij klanten. De beheerde run wordt
gestart vanuit `Stack/bin/stack-sync.mjs`, dat het register en de ruleset meegeeft.

### Hoe het werkt, in het kort

- De bewaker leest de beschermde paden uit `.claude/stack-manifest.json` van de repo
  (de lijst `vervangen`, plus `.github/CODEOWNERS` en alles onder `.github/workflows/`
  en `.claude/`). Zonder manifest doet hij niets. `STACK_ALLOW_POLICY_EDIT=1` laat
  padbewerkingen door, voor onderhoud aan de template zelf.
- De melding vergelijkt `.claude/stack-version` met de hoogste tag `stack-v<n>` op de
  publieke template (één anonieme `git ls-remote`, drie seconden), met een dagstempel
  per repo in `${CLAUDE_PLUGIN_DATA}`.
- `/stack:bijwerken` draait in twee stappen: `--droogloop` (voorcontrole, tijdelijke
  kloon, kern toepassen, resultaat als JSON) en `--werkmap <map>` (keuzes toepassen,
  committen met de identiteit van de gebruiker, pushen als de boom verschilt, PR openen
  of bijwerken). Elke commit draagt de trailer `Stack-bijwerken: v<n>`; een branch met
  een commit zonder die trailer wordt nooit opnieuw opgebouwd. De tijdelijke map
  verdwijnt na de tweede aanroep en bij elke mislukking.
- De kern (`lib/toepassen.mjs`) controleert zichzelf: raakt er iets buiten het manifest,
  dan stopt hij. Een eigen bestand van de klant wordt nooit stil overschreven of
  verwijderd; het komt in `overgeslagen` met een reden en een keuze.

### Een klant aansluiten (checklist)

Vooraf: de template is publiek, de tag `stack-v<n>` van de nieuwste versie staat, de
accounts van de klant staan (GitHub-organisatie op een betaald plan, Vercel, Supabase als
er een app met eigen database komt; BOOTSTRAP.md in Stack).

1. Plugin installeren zoals hierboven onder "Installeren" (desktop-app: één commando,
   vertrouwen bevestigen, plusje). Getest 22-09-2026 op Windows in de desktop-app.
2. `/stack:starten` samen doorlopen: installaties, de terminalstap voor `gh auth login`,
   de git-identiteit. Leg de UAC-vensters vooraf uit.
3. Controleer dat de zeven skills verschijnen als `/stack:<naam>`.
4. Open een app op versie 9 of nieuwer en controleer dat de bewaker vuurt: vraag de agent
   één regel te wijzigen in `.github/workflows/ci.yml`; dat moet geweigerd worden.
5. Zet automatisch bijwerken van de plugin aan in `/plugin`.
6. Loop de melding en `/stack:bijwerken` één keer samen door, en `/stack:nieuwe-app` als
   de klant zelf apps gaat starten. Vercel en Supabase koppelt de workflow "App
   inrichten" in `<klantorg>/stack-beheer` (recept: Stage-Two-AI/stack-beheer); die
   toegang komt nooit op de computer van de klant (besluit 22-09-2026).
7. Zet in `Stack/projecten.json` de `route` van het project op `plugin`; een app die de
   klant zelf met `/stack:nieuwe-app` maakte, voeg je toe zodra hij hem meldt.

### Een nieuwe versie uitbrengen

Volgorde bij elke release: eerst de plugin, dan de template. Een oude plugin stopt op
een nieuwer manifestformaat; een nieuwe plugin kan altijd met een oudere template
overweg.

1. Plugin: versie in `.claude-plugin/plugin.json` ophogen, pull request, groene check,
   merge naar `main`. Alleen een hoger versienummer laat een klant een update zien.
2. Template: wijzigingen als pull request op `stack-template`, met
   `.claude/stack-version` en `stackVersion` in het manifest opgehoogd. Een bestand uit
   `vervangen` wijzigt alleen samen met zo'n versieverhoging.
3. Na de merge de tag zetten: `git tag stack-v<n> && git push origin stack-v<n>`. Pas
   dan bestaat de versie voor de melding en de skill. Een tag wordt nooit verplaatst;
   de ruleset op de template weigert dat.
4. Registerprojecten: `node bin/stack-sync.mjs --status` in Stack, dan de droogloop,
   dan `--doe-het`.

### De repo beschermen

De ruleset op `main` (`.github/ruleset.json`) staat: geen directe push, pull request
met de check `Tests` groen. Opnieuw zetten na een herinrichting:

```sh
gh api repos/Stage-Two-AI/stack-plugin/rulesets -X POST --input .github/ruleset.json
```

### Tests

```sh
npm test
claude plugin validate .
```

Licentie: MIT (zie `LICENSE`). De naam Stage Two en de huisstijl vallen daar niet onder.
