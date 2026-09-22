---
name: nieuwe-app
description: Een nieuwe app starten op de manier van Stage Two - eerst meedenken over wat de app moet doen en of hij een eigen database nodig heeft of geen, dan de app aanmaken uit de nieuwste Stage Two-template onder het eigen GitHub-account of de organisatie van de gebruiker. Gebruik dit als de gebruiker /stack:nieuwe-app typt of een nieuwe, losstaande app wil beginnen (niet een uitbreiding van een bestaande app).
---

Je helpt iemand die niet technisch is om een nieuwe app goed te beginnen. Het gesprek
is het belangrijkste deel: de keuzes hieronder zijn achteraf duur om te veranderen. Praat
in gewone taal, stel één vraag tegelijk, en geef bij elke keuze een advies met de reden.
De gebruiker beslist. Voer niets uit wat hier niet staat.

## Stap 1: is het wel een nieuwe app?

Vraag wat de gebruiker wil maken, in één of twee zinnen. Toets het aan dit lijstje:

| Wat je hoort | Waarschijnlijk |
|---|---|
| Gaat over gegevens die al in een app van het bedrijf zitten (dezelfde planten, orders, voorraad, klanten) | uitbreiding van die app |
| Een scherm, een overzicht of een werktuig erbij voor dezelfde mensen | uitbreiding van die app |
| Andere gebruikers, of gegevens die niets met elkaar te maken hebben | nieuwe app |
| "Kan dit er ook nog bij?" | vaak een uitbreiding |

De regel erachter is simpel en de gebruiker mag hem horen: **één app per verzameling
gegevens.** Gegevens die op twee plekken staan gaan uit elkaar lopen, en een app die de
gegevens van een andere app gebruikt is voor iedereen moeilijker te overzien. Is het een
uitbreiding? Zeg dat, en verwijs naar `/stack:verder-werken` in de map van die app. Stop
dan hier.

Wil de gebruiker toch een aparte app op de gegevens van een bestaande app, bijvoorbeeld
een portaal voor mensen van buiten? Dat kan, maar dat is een keuze met een eigen
beveiligingsopzet, en die maakt Stage Two samen met de gebruiker. Verwijs naar Stage Two
en stop hier.

Moet de app **vindbaar zijn in Google** (een website, een webshop, een pagina die mensen
delen)? Dan past deze template niet: die is voor werk-apps achter een login. Zeg dat en
verwijs naar Stage Two. Stop dan hier.

## Stap 2: het idee scherp

Vraag door tot je op elk punt een concreet antwoord hebt. "Dat zien we later wel" is
het duurste antwoord.

1. **Wat kan iemand straks dat nu niet kan?** Eén zin, vanuit de gebruiker geschreven.
   Dit wordt de omschrijving van de app.
2. **Wie gaat het gebruiken?** Hoeveel mensen, en alleen eigen personeel of ook mensen
   van buiten.
3. **Welke gegevens gaan erin?** En of daar persoonsgegevens bij zitten.
4. **Wat is de eerste versie waar iemand echt iets aan heeft?** Het kleinste ding dat
   maandag al gebruikt zou worden.

## Stap 3: de database, met advies

Dit is de keuze die het meest uitmaakt. Er zijn twee standen. Leg ze uit in deze woorden
en geef daarna je advies met de reden; vraag om bevestiging.

- **Geen database.** De app draait alleen op de hosting. Inhoud staat in de app zelf,
  bestanden in de bestandsopslag van de hosting, terugkerende taken ook daar. Dit is het
  startpunt en kost niets extra. Past bij: een rekenhulp, een formulier dat een mail
  stuurt, een overzicht uit een vaste bron, een app voor één persoon zonder inloggen.
- **Eigen database.** De app krijgt een eigen plek voor gegevens, met inloggen,
  meerdere mensen die tegelijk werken, relaties tussen gegevens, zoeken over veel
  records, geschiedenis. Dit **kost maandelijks geld** (een eigen databaseproject bij
  Supabase, plus een testproject; meestal enkele tientallen euro's per maand, Stage Two
  weet het precieze bedrag) en wordt eenmalig door Stage Two ingericht: de app kan
  meteen gebouwd worden, de database komt erbij zodra Stage Two hem heeft aangemaakt.
  Past bij: minstens een van accounts, meerdere schrijvers, relaties, veel records.

Beslisregel voor je advies:

1. De app heeft accounts, meerdere schrijvers, relaties of veel records nodig: adviseer
   **eigen**. Noem de kosten erbij.
2. Anders: adviseer **geen**. Vraag wel vooruit: verwacht de gebruiker binnen een jaar
   inloggen, meerdere gebruikers die gegevens invoeren, of veel records? Dan nu al
   **eigen** kiezen scheelt een verhuizing. Zo niet, dan is **geen** goed; omzetten kan
   later, met hulp van Stage Two.

## Stap 4: naam en plek

- **Naam.** Stel er een voor uit de omschrijving: kort, kleine letters, streepjes,
  bijvoorbeeld `voorraad-app`. Laat de gebruiker kiezen.
- **Eigenaar.** Toon de organisaties van de gebruiker met `gh api user/orgs -q '.[].login'`.
  Is er een organisatie van het bedrijf, adviseer die: dan is de app van het bedrijf en
  niet van één persoon. Geen organisatie, dan het eigen account (`gh api user -q .login`).
- **Map.** De app komt als nieuwe submap met de naam van de app onder de map die nu open
  staat. Zeg dat.

## Stap 5: droogloop, dan aanmaken

Draai eerst de droogloop, met Bash, precies zo:

```sh
node "${CLAUDE_SKILL_DIR}/scripts/nieuwe-app.mjs" --json --droogloop --naam "<naam>" --eigenaar "<eigenaar>" --database geen|eigen --omschrijving "<omschrijving>"
```

Het antwoord is één JSON-object met een `status`.

- `mislukt`: `reden` is één zin met wat de gebruiker moet doen. Geef die door en stop.
  Probeer het niet te omzeilen.
- `klaar`: vat `plan` samen in hooguit vier regels: welke repo, waar op deze computer,
  welke databasestand, wie de reviewer is. Staat `githubPlan` op `free` en is de
  eigenaar een organisatie, zeg dan dat main straks niet beschermd kan worden op het
  gratis plan en dat Stage Two dat bij de start van het project regelt; doorgaan mag.

Zeg dan: "Ik maak hem nu aan; dat duurt een paar minuten." Draai hetzelfde commando met
`--doe-het` in plaats van `--droogloop`. Vraag geen toestemming meer; het typen van
`/stack:nieuwe-app` en de bevestiging van het plan waren de opdracht.

- `mislukt`: geef `reden` door. Staat er een `repo` in het antwoord, zeg dan dat de repo
  op GitHub al bestaat en dat Stage Two of een tweede poging met een andere naam nodig
  is. Verwijder zelf niets.
- `gemaakt`: zeg waar de app staat (`url` en `map`), en loop `nogTeDoen` langs, elk punt
  in één zin. De hosting (Vercel) en een eigen database (Supabase) koppelt Stage Two;
  daar komt bewust geen toegang voor op deze computer. Probeer dat niet zelf te doen,
  ook niet als er een opdrachtregel voor blijkt te staan.

## Stap 6: en nu verder

Zeg tot slot, in deze volgorde:

1. Open de nieuwe map in Claude Code (Bestand, map openen). De afspraken en de bewaker
   van de werkwijze werken alleen in de map van de app zelf.
2. Typ daar `/stack:verder-werken` en beschrijf de eerste versie uit stap 2. Bij een
   eigen database begint dat werk met de eerste tabellen, via `/stack:databasewijziging`.
3. Laat Stage Two weten dat deze app bestaat (naam en link), zodat hij in het overzicht
   komt en meedoet met updates van de werkwijze.
