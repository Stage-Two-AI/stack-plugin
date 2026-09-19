# Stage Two-plugin voor Claude Code

Deze plugin brengt de werkwijze van Stage Two naar Claude Code. Wie een app heeft die
uit de [stack-template](https://github.com/Stage-Two-AI/stack-template) is gebouwd,
installeert deze plugin één keer en heeft dan:

- de vaste routes als skills: `/stack:verder-werken`, `/stack:databasewijziging`,
  `/stack:nieuwe-app-aanvragen` en `/stack:lokaal-kijken`;
- een bewaker die de agent bij de toetsaanslag tegenhoudt als hij een bestand van de
  gedeelde template wil wijzigen of een riskant commando wil draaien;
- een melding bij het openen van de app als er een nieuwere template is;
- de skill `/stack:bijwerken`, waarmee je je app zelf naar de nieuwste template brengt,
  als pull request van jezelf, in je eigen GitHub.

Er komt geen token, machine of proces van Stage Two aan te pas. Ook als Stage Two er
niet meer bij is, blijft dit werken.

Licentie: nog te kiezen; tot die tijd alle rechten voorbehouden aan Stage Two.

## Voor de klant

### Wat je merkt

Je opent je app in Claude Code zoals altijd. Is er een nieuwere versie van de template,
dan zegt de agent dat één keer per dag, met het commando om hem op te halen. Verder
verandert er niets aan hoe je werkt.

Vraag je de agent iets te wijzigen in een bestand dat van de template is (de checks,
de guards, de werkwijze), dan weigert hij dat en legt uit waarom. Dat is geen fout van
de agent: die bestanden zijn voor elke app hetzelfde, en Stage Two houdt ze bij. Wil
je daar toch iets anders, dan is dat een vraag aan Stage Two.

### Je app bijwerken

Typ `/stack:bijwerken`. De agent:

1. controleert of je bent ingelogd bij GitHub en of je mag pushen;
2. haalt de nieuwste template op en maakt in een tijdelijke kopie van je repo een
   branch `stack-bijwerken/v<versie>`;
3. werkt alleen de bestanden bij die van de template zijn; je eigen code raakt hij
   nooit;
4. vertelt je in drie regels wat er verandert, en vraagt alleen iets als een
   template-bestand bij jou anders is dan verwacht;
5. opent een pull request in je eigen repo, met een uitleg in gewone taal.

Daarna is het aan jou: bekijk de pull request, wacht tot de checks groen zijn en druk
op Merge. Zijn de checks rood, dan voldoet je app niet aan een nieuwe regel; neem dan
contact op met Stage Two in plaats van de check uit te zetten.

Je eigen werk in Claude Code wordt niet aangeraakt: de skill werkt in een tijdelijke
kopie, die daarna weer weg is.

### Wat je nodig hebt

- Claude Code (2.1.195 of nieuwer, dan ziet je app de plugin vanzelf);
- Node 22 of nieuwer op je computer (voor de bewaker en de skill);
- `pnpm` (voor het lockfile bij een update van `package.json`);
- `gh`, de GitHub-opdrachtregel, ingelogd met je eigen account (`gh auth login`).

Stage Two richt dit bij de start met je in.

## Installeren

In Claude Code, in de terminal:

```text
/plugin marketplace add Stage-Two-AI/stack-plugin
/plugin install stack@stagetwo
```

Een app uit de template (versie 9 of nieuwer) kondigt de plugin zelf aan: Claude Code
vraagt bij het openen of je hem wilt installeren. Dat is dezelfde installatie.

Bijwerken van de plugin: `/plugin` opent het overzicht; daar staat de plugin met de
versie en een knop om bij te werken. Automatisch bijwerken staat standaard uit voor
marketplaces van derden; zet het aan in datzelfde overzicht.

## Voor Stage Two

### Wat waar staat

```text
.claude-plugin/    plugin.json (naam stack, versie) en marketplace.json (naam stagetwo)
hooks/             de bewaker (PreToolUse) en de melding bij sessiestart (SessionStart)
skills/            de vijf skills; skills/bijwerken/scripts/ is het script van /stack:bijwerken
lib/               de kern: manifest lezen, toepassen, PR-tekst, git- en PR-stappen
beheer/            de beheerde run over het register van Stage Two; geen skill, alleen voor Stage Two
test/              de geheimenscan over boom en geschiedenis
```

`beheer/beheerd.mjs` staat bewust niet onder `bin/`: die map zet Claude Code op het
PATH van elke sessie waarin de plugin aanstaat, ook bij klanten. De beheerde run wordt
gestart vanuit `Stack/bin/stack-sync.mjs`, dat het register en de ruleset meegeeft.

### Een klant aansluiten (checklist)

Vooraf: de template is publiek, de tag `stack-v<n>` van de nieuwste versie staat, de
klantrepo staat op die versie (of krijgt hem via de eerste `/stack:bijwerken`).

1. Op de computer van de klant: Node 22, `pnpm`, `gh` (ingelogd als de klant) en
   Claude Code.
2. Terminal: de twee `/plugin`-commando's hierboven. Desktop-app: open de repo (die op
   versie 9 of nieuwer staat) zodat de aankondiging de marketplace registreert, en
   installeer daarna via de pluginbrowser.
3. Controleer dat de bewaker vuurt: vraag de agent één regel te wijzigen in
   `.github/workflows/ci.yml`; dat moet geweigerd worden met een uitleg.
4. Controleer dat de vijf skills verschijnen als `/stack:<naam>`.
5. Zet automatisch bijwerken van de plugin aan, of leg vast welk commando de klant
   draait om de plugin bij te werken.
6. Loop de melding en `/stack:bijwerken` één keer samen door.

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

Na het aanmaken van de repo, één keer:

```sh
gh api repos/Stage-Two-AI/stack-plugin/rulesets -X POST --input .github/ruleset.json
```

Daarna kan niemand rechtstreeks naar `main` pushen; elke wijziging gaat via een pull
request met de check `Tests` groen. Die check draait `npm test`: alle tests plus de
geheimenscan over de boom en de hele geschiedenis.

### Tests

```sh
npm test
claude plugin validate .
```
