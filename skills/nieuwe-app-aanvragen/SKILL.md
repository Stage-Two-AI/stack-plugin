---
name: nieuwe-app-aanvragen
description: Een nieuwe applicatie aanvragen bij Stage Two - het idee scherp krijgen en er een complete aanvraag van maken. Alleen voor het allereerste project, als de accounts (GitHub, hosting, database) nog niet op naam van het bedrijf staan. Staan die er al, gebruik dan nieuwe-app: daarmee begint de gebruiker de app zelf.
---

Deze route staat uitgeschreven in `docs/routes/nieuwe-app-aanvragen.md`. Lees dat bestand nu in
zijn geheel en loop de stappen in volgorde af.

Hier staat bewust geen kopie van de tekst. De route is voor elke agent dezelfde, en
`docs/routes/` is de enige plek waar hij staat, zodat er nooit twee versies zijn die
uit elkaar lopen. Deze skill is alleen de aansluiting voor Claude Code.

Goed om te weten voor de aanvraag: elke nieuwe app begint als kopie van de openbare
Stage Two-template (github.com/Stage-Two-AI/stack-template), met dezelfde werkwijze,
checks en routes als deze app. Stage Two richt de omgeving in (repo, database, hosting,
deze plugin); de aanvraag gaat over wat de app moet doen, niet over de techniek.

Let op: staan de accounts van het bedrijf al (er is al minstens één app die volgens deze
werkwijze draait), dan hoeft er niets aangevraagd te worden. Zeg dat, en verwijs naar
`/stack:nieuwe-app`: daarmee denkt de assistent mee over de app en maakt hij hem zelf
aan uit de nieuwste template.
