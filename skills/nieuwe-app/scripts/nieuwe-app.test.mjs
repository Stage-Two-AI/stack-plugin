import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { schrijfBestanden, tijdelijkeMap } from "../../../lib/test-hulp.mjs";
import {
  STAGE_TWO_LOGIN,
  controleerArgumenten,
  geldigeNaam,
  kiesReviewer,
  leesArgumenten,
  nogTeDoen,
  vulIn,
  zetDatabaseStand,
} from "./nieuwe-app.mjs";

function verseTemplate() {
  const map = tijdelijkeMap("nieuwe-app-");
  schrijfBestanden(map, {
    "README.md": "# <projectnaam>\n\n<!-- Vervang <projectnaam> en schrijf hieronder in één zin wat deze app doet,\nvanuit de gebruiker. -->\n\n<!-- Wat deze app doet, in één zin, vanuit de gebruiker geschreven. -->\n\nVerder.\n",
    "AGENTS.md": "# <projectnaam>\n\n<!-- Vervang <projectnaam> en de regel hieronder bij het opzetten van een project. -->\n<!-- Wat deze app doet, in één zin, vanuit de gebruiker geschreven. -->\n\n<!-- stack:begin -->\nkern\n<!-- stack:end -->\n",
    ".github/CODEOWNERS": `/supabase/ @${STAGE_TWO_LOGIN}\n/.github/ @${STAGE_TWO_LOGIN}\n`,
    "stack.config.json": `${JSON.stringify({ $beschrijving: ["uitleg"], database: true }, null, 2)}\n`,
    "supabase/migrations/0001_items.sql": "create table items ();\n",
  });
  return map;
}

test("argumenten: alle vlaggen, en een vlag zonder waarde is een fout", () => {
  const a = leesArgumenten(["--json", "--droogloop", "--naam", "voorraad", "--eigenaar", "Org", "--database", "geen", "--omschrijving", "Voorraad bijhouden", "--map", "/x"]);
  assert.equal(a.json, true);
  assert.equal(a.droogloop, true);
  assert.equal(a.naam, "voorraad");
  assert.equal(a.eigenaar, "Org");
  assert.equal(a.database, "geen");
  assert.equal(a.omschrijving, "Voorraad bijhouden");
  assert.equal(a.map, "/x");
  assert.throws(() => leesArgumenten(["--naam"]), /vraagt een waarde/);
  assert.throws(() => leesArgumenten(["--naam", "--json"]), /vraagt een waarde/);
  assert.throws(() => leesArgumenten(["--foo"]), /onbekende optie/);
});

test("naam: kleine letters, cijfers en streepjes; geen hoofdletters, spaties of randstreepjes", () => {
  for (const goed of ["voorraad", "voorraad-app", "app2", "a1"]) assert.equal(geldigeNaam(goed), true, goed);
  for (const fout of ["Voorraad", "voorraad app", "-voorraad", "voorraad-", "", "a", "ä"]) assert.equal(geldigeNaam(fout), false, fout);
});

test("controle: precies één modus, geldige stand, en bij gedeeld de eigenaar en de ref", () => {
  const basis = { droogloop: true, doeHet: false, naam: "voorraad", eigenaar: "Org", database: "geen" };
  assert.equal(controleerArgumenten(basis), null);
  assert.match(controleerArgumenten({ ...basis, doeHet: true }), /precies één/);
  assert.match(controleerArgumenten({ ...basis, droogloop: false }), /precies één/);
  assert.match(controleerArgumenten({ ...basis, naam: "Voorraad" }), /kleine letters/);
  assert.match(controleerArgumenten({ ...basis, eigenaar: null }), /--eigenaar/);
  assert.match(controleerArgumenten({ ...basis, database: "ja" }), /geen, gedeeld of eigen/);
  assert.match(controleerArgumenten({ ...basis, database: "gedeeld" }), /--gedeeld-eigenaar/);
  assert.match(controleerArgumenten({ ...basis, database: "gedeeld", gedeeldEigenaar: "Org/erp" }), /--gedeeld-ref/);
  assert.equal(controleerArgumenten({ ...basis, database: "gedeeld", gedeeldEigenaar: "Org/erp", gedeeldRef: "abcdefghijklmnopqrst" }), null);
});

test("reviewer: Stage Two zolang die lid is, anders de gebruiker zelf", () => {
  assert.equal(kiesReviewer({ login: "bart", stageTwoLid: true }), STAGE_TWO_LOGIN);
  assert.equal(kiesReviewer({ login: "bart", stageTwoLid: false }), "bart");
});

test("invullen: projectnaam, omschrijving en reviewer erin, aanwijzingen eruit", () => {
  const map = verseTemplate();
  vulIn(map, { naam: "voorraad", omschrijving: "Zien wat er op voorraad is.", reviewer: "bart" });
  const readme = readFileSync(join(map, "README.md"), "utf8");
  const agents = readFileSync(join(map, "AGENTS.md"), "utf8");
  assert.match(readme, /^# voorraad\n/);
  assert.doesNotMatch(readme, /Vervang/);
  assert.match(readme, /Zien wat er op voorraad is\./);
  assert.match(agents, /^# voorraad\n/);
  assert.match(agents, /Zien wat er op voorraad is\./);
  assert.match(agents, /stack:begin/, "de markeringen blijven staan");
  assert.equal(readFileSync(join(map, ".github/CODEOWNERS"), "utf8"), "/supabase/ @bart\n/.github/ @bart\n");
});

test("invullen: zonder omschrijving blijft de plek staan, en een ontbrekend bestand is een fout", () => {
  const map = verseTemplate();
  vulIn(map, { naam: "voorraad", omschrijving: null, reviewer: STAGE_TWO_LOGIN });
  assert.match(readFileSync(join(map, "AGENTS.md"), "utf8"), /Wat deze app doet/);
  const leeg = tijdelijkeMap("nieuwe-app-leeg-");
  assert.throws(() => vulIn(leeg, { naam: "x", omschrijving: null, reviewer: "x" }), /README.md ontbreekt/);
});

test("databasestand geen: false, migraties weg, uitleg blijft", () => {
  const map = verseTemplate();
  zetDatabaseStand(map, { database: "geen" });
  const config = JSON.parse(readFileSync(join(map, "stack.config.json"), "utf8"));
  assert.equal(config.database, false);
  assert.equal(config.gedeelde_database, undefined);
  assert.deepEqual(config.$beschrijving, ["uitleg"]);
  assert.equal(existsSync(join(map, "supabase/migrations")), false);
});

test("databasestand gedeeld: blok met eigenaar en ref, migraties weg", () => {
  const map = verseTemplate();
  zetDatabaseStand(map, { database: "gedeeld", gedeeldEigenaar: "Org/erp", gedeeldRef: "abcdefghijklmnopqrst" });
  const config = JSON.parse(readFileSync(join(map, "stack.config.json"), "utf8"));
  assert.equal(config.database, "gedeeld");
  assert.deepEqual(config.gedeelde_database, { eigenaar: "Org/erp", project_ref: "abcdefghijklmnopqrst" });
  assert.equal(existsSync(join(map, "supabase/migrations")), false);
});

test("databasestand eigen: true, migraties blijven", () => {
  const map = verseTemplate();
  zetDatabaseStand(map, { database: "eigen" });
  const config = JSON.parse(readFileSync(join(map, "stack.config.json"), "utf8"));
  assert.equal(config.database, true);
  assert.equal(existsSync(join(map, "supabase/migrations/0001_items.sql")), true);
});

test("nog te doen: alleen wat echt open staat", () => {
  const alles = nogTeDoen({ database: "geen", ruleset: { gelukt: true }, vercel: { status: "gekoppeld" } });
  assert.equal(alles.length, 1);
  assert.match(alles[0], /Sentry/);
  const open = nogTeDoen({ database: "eigen", ruleset: { gelukt: false }, vercel: { status: "geen-cli" } });
  assert.equal(open.length, 4);
  assert.match(open[0], /niet beschermd/);
  assert.match(open[1], /Vercel/);
  assert.match(open[2], /Supabase/);
});
