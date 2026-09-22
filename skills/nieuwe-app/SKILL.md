---
name: nieuwe-app
description: Een nieuwe app starten op de manier van Stage Two - eerst meedenken over wat de app moet doen en of hij een eigen database, een gedeelde database of geen database nodig heeft, dan de app aanmaken uit de nieuwste Stage Two-template onder het eigen GitHub-account of de organisatie van de gebruiker. Gebruik dit als de gebruiker /stack:nieuwe-app typt of een nieuwe, losstaande app wil beginnen (niet een uitbreiding van een bestaande app).
---

Je helpt iemand die niet technisch is om een nieuwe app goed te beginnen. Het gesprek
is het belangrijkste deel: de keuzes hieronder zijn achteraf duur om te veranderen. Praat
in gewone taal, stel één vraag tegelijk, en geef bij elke keuze een advies met de reden.
De gebruiker beslist. Voer niets uit wat hier niet staat.

## Stap 1: is het wel een nieuwe app?

Vraag wat de gebruiker wil maken, in één of twee zinnen. Toets het aan dit lijstje:

| Wat je hoort | Waarschijnlijk |
|---|---|
| Dezelfde mensen, dezelfde gegevens, een scherm erbij | uitbreiding van een bestaande app |
| Dezelfde mensen en gegevens, maar echt een eigen werktuig | nieuwe app op de bestaande gegevens |
| Andere gebruikers, of gegevens die niets met elkaar te maken hebben | nieuwe app met eigen gegevens |
| "Kan dit er ook nog bij?" | vaak een uitbreiding |

Is het een uitbreiding? Zeg dat, leg uit waarom (één app die over dezelfde gegevens gaat
is goedkoper en blijft kloppen), en verwijs naar `/stack:verder-werken` in de map van die
app. Stop dan hier.

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
4. **Gaat het over gegevens die er al zijn** in een andere app van het bedrijf? Dezelfde
   planten, orders, voorraad, klanten of projecten. Noem die app bij naam.
5. **Wat is de eerste versie waar iemand echt iets aan heeft?** Het kleinste ding dat
   maandag al gebruikt zou worden.

## Stap 3: de database, met advies

Dit is de keuze die het meest uitmaakt. Er zijn drie standen. Leg ze uit in deze
woorden en geef daarna je advies met de reden; vraag om bevestiging.

- **Geen database.** De app draait alleen op de hosting. Inhoud staat in de app zelf,
  bestanden in de bestandsopslag van de hosting, terugkerende taken ook daar. Dit is het
  startpunt en kost niets extra. Past bij: een rekenhulp, een formulier dat een mail
  stuurt, een overzicht uit een vaste bron, een app voor één persoon zonder inloggen.
- **Gedeelde database.** De app gebruikt de gegevens van een bestaande app van het
  bedrijf. Kost niets extra, en belangrijker: dezelfde voorraad of dezelfde klanten
  staan dan op één plek en lopen nooit uit elkaar. Nuance die de gebruiker moet horen:
  de bestaande app blijft de eigenaar van die gegevens. De nieuwe app kan ze lezen en
  erin schrijven via een vaste afspraak, maar wil je de indeling van de gegevens
  veranderen (een veld erbij, een nieuwe tabel), dan gebeurt dat in de bestaande app,
  met `/stack:databasewijziging` in die map. Past bij: antwoord ja op vraag 4.
- **Eigen database.** De app krijgt een eigen plek voor gegevens, met inloggen,
  meerdere mensen die tegelijk werken, relaties tussen gegevens, zoeken over veel
  records, geschiedenis. Dit **kost maandelijks geld** (een eigen databaseproject bij
  Supabase, plus een testproject; meestal enkele tientallen euro's per maand, Stage Two
  weet het precieze bedrag) en vraagt eenmalig inrichting door Stage Two. Past bij:
  eigen gegevens die nergens anders staan, én minstens een van: accounts, meerdere
  schrijvers, relaties, veel records.

Beslisregel voor je advies:

1. Vraag 4 is ja: adviseer **gedeeld**. Kan de gebruiker niet zeggen welke app, of
   twijfelt hij of het echt dezelfde gegevens zijn: vraag door, en bij blijvende twijfel
   adviseer je contact met Stage Two vóór het aanmaken.
2. Vraag 4 is nee en de app heeft accounts, meerdere schrijvers, relaties of veel
   records nodig: adviseer **eigen**. Noem de kosten erbij.
3. Anders: adviseer **geen**. Vraag wel vooruit: verwacht de gebruiker binnen een jaar
   inloggen, meerdere gebruikers die gegevens invoeren, of veel records? Dan nu al
   **eigen** kiezen scheelt een verhuizing. Zo niet, dan is **geen** goed; omzetten kan
   later, met hulp van Stage Two.

Bij **gedeeld** heb je twee gegevens nodig van de app die de database bezit: de repo
(`organisatie/naam`) en de project-ref van haar database (twintig kleine letters).
Probeer ze zelf te vinden: `gh api repos/<organisatie>/<naam>/contents/stack.config.json -q .content | base64 -d`
toont haar configuratie; de ref van productie staat daar meestal niet in. Vraag hem dan
aan de gebruiker: in het Supabase-dashboard onder Project Settings, General, "Reference
ID", of aan Stage Two. Zonder die ref kan de app niet aangemaakt worden als gedeeld;
bied dan aan om te wachten, niet om "voorlopig geen" te kiezen.

## Stap 4: naam en plek

- **Naam.** Stel er een voor uit de omschrijving: kort, kleine letters, streepjes,
  bijvoorbeeld `voorraad-app`. Laat de gebruiker kiezen.
- **Eigenaar.** Toon de organisaties van de gebruiker met `gh api user/orgs -q '.[].login'`.
  Is er een organisatie van het bedrijf, adviseer die: dan is de app van het bedrijf en
  niet van één persoon. Geen organisatie, dan het eigen account (`gh api user -q .login`).
- **Map.** De app komt als nieuwe submap met de naam van de app onder de map die nu open
  staat. Zeg dat.

## Stap 5: droogloop, dan aanmaken

Draai eerst de droogloop, met Bash, precies zo (laat weg wat niet van toepassing is):

```sh
node "${CLAUDE_SKILL_DIR}/scripts/nieuwe-app.mjs" --json --droogloop --naam "<naam>" --eigenaar "<eigenaar>" --database geen|gedeeld|eigen --omschrijving "<omschrijving>" --gedeeld-eigenaar "<organisatie/naam>" --gedeeld-ref "<ref>"
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
  in één zin. Bij Vercel: Stage Two koppelt de hosting bij de start van het project;
  heeft de gebruiker de Vercel-opdrachtregel al (`vercel whoami` werkt), dan mag je
  zelf in de map van de app `vercel link --yes --project <naam>` en `vercel git connect --yes`
  draaien en het resultaat melden.

## Stap 6: en nu verder

Zeg tot slot, in deze volgorde:

1. Open de nieuwe map in Claude Code (Bestand, map openen). De afspraken en de bewaker
   van de werkwijze werken alleen in de map van de app zelf.
2. Typ daar `/stack:verder-werken` en beschrijf de eerste versie uit stap 2. Bij een
   eigen database begint dat werk met de eerste tabellen, via `/stack:databasewijziging`.
3. Laat Stage Two weten dat deze app bestaat (naam en link), zodat hij in het overzicht
   komt en meedoet met updates van de werkwijze.
