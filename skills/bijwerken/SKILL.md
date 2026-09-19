---
name: bijwerken
description: Brengt deze app naar de nieuwste versie van de Stage Two-template, als pull request van de gebruiker zelf. Gebruik dit als de gebruiker vraagt om de app, de template, de checks of de werkwijze bij te werken, of als de melding bij sessiestart zei dat er een nieuwere template is en de gebruiker daarop ingaat.
---

Je werkt deze app bij naar de nieuwste versie van de Stage Two-template. Het script doet
het werk in een tijdelijke kopie van de repo; jij wijzigt zelf niets in deze checkout.

## Stap 1: de droogloop

Draai dit commando precies zo, met Bash, vanuit de map van de app:

```sh
node "${CLAUDE_SKILL_DIR}/scripts/bijwerken.mjs" --json --droogloop
```

Het antwoord is één JSON-object met een `status`. Vertel de gebruiker in gewone taal wat
het betekent, in hooguit drie regels; gebruik daarvoor `samenvatting` als die er is.

- `bij`: de app staat al op de nieuwste versie. Zeg dat en stop.
- `geen-template`: deze repo is niet uit de template gebouwd. Zeg dat en stop.
- `mislukt` of `gestopt`: `reden` is één zin met wat de gebruiker moet doen. Geef die
  door en stop. Probeer het niet te omzeilen en verzin geen andere weg.
- `klaar`: de werkkopie staat klaar. Ga door naar stap 2.

## Stap 2: alleen bij overgeslagen bestanden een vraag

Is `overgeslagen` leeg, dan is er niets te kiezen: ga meteen naar stap 3. Het typen van
`/stack:bijwerken` was de toestemming voor de pull request; vraag die niet nog een keer.

Staat er wel iets in `overgeslagen`, dan is dat bestand van de template, maar wijkt het
hier lokaal af: iemand heeft er iets aan veranderd. Leg dat per bestand in gewone taal
uit, laat `verschil` zien (dat is het verschil tussen de versie hier en de versie in de
template), en vraag per bestand één keuze:

- **template**: de versie van de template overnemen; de lokale aanpassing verdwijnt;
- **eigen**: het bestand laten zoals het is; het blijft dan afwijken van de template en
  komt zo in de pull request te staan.

Weet de gebruiker het niet, dan is **eigen** de veilige keuze: dat verandert niets aan
wat er nu werkt, en Stage Two kan er later naar kijken.

## Stap 3: uitvoeren

Draai het script opnieuw met de `werkmap` uit stap 1 en per gekozen bestand een
`--los-op`:

```sh
node "${CLAUDE_SKILL_DIR}/scripts/bijwerken.mjs" --json --werkmap "<werkmap uit stap 1>" --los-op "<pad>" template --los-op "<ander pad>" eigen
```

Zonder keuzes laat je `--los-op` weg. Het script commit met de git-naam en het
e-mailadres van de gebruiker, pusht de branch `stack-bijwerken/v<versie>` naar zijn
eigen GitHub en opent de pull request, of werkt een bestaande bij.

## Stap 4: afronden

Vertel de gebruiker, in gewone taal:

1. wat er is bijgewerkt en waarom (een nieuwere versie van de gedeelde werkwijze), en
   wat er niet is bijgewerkt (de bestanden waarvoor hij **eigen** koos);
2. waar de pull request staat (`pr.url`, of anders `vergelijkUrl` om hem zelf te openen);
3. wat hij nu doet: de pull request bekijken, wachten tot de checks groen zijn en op
   Merge drukken. Zijn de checks rood, dan voldoet de app niet aan een nieuwe regel;
   dan neemt hij contact op met Stage Two en zet hij de check niet uit.

## Wat je niet doet

- Je wijzigt geen bestanden in deze checkout, ook niet als de gebruiker dat vraagt om
  "het even snel op te lossen": de update loopt altijd via de pull request.
- Je voegt niets toe aan de commando's hierboven: geen `cd`, geen omgevingsvariabelen,
  geen token, geen `pass` of `gpg`. Het script vindt alles zelf.
- Je merget de pull request niet; dat doet de gebruiker zelf.
