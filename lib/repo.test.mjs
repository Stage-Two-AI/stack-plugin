import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  alGelijkOpGitHub,
  branchHerbouwbaar,
  checkoutTag,
  commit,
  gewijzigdePaden,
  gitIdentiteit,
  gitVoorKern,
  hoogsteTagVersie,
  kloonRepo,
  kloonTemplate,
  kloonUrl,
  maakBranch,
  openOfWerkPRBij,
  openPRVoorVersie,
  push,
  pushDroog,
  repoUitUrl,
  sluitOuderePRs,
  versieOpAfstand,
} from "./repo.mjs";
import { git, maakKlantRepo, maakTemplateRepo, nepGh, opruimen, tijdelijkeMap } from "./test-hulp.mjs";

test("kloonUrl en repoUitUrl", () => {
  assert.equal(kloonUrl("Stage-Two-AI/stack-template"), "https://github.com/Stage-Two-AI/stack-template");
  assert.equal(kloonUrl("/tmp/x"), "/tmp/x");
  assert.equal(kloonUrl("https://github.com/a/b"), "https://github.com/a/b");
  assert.equal(repoUitUrl("https://github.com/Winco-Holland-B-V/plantas.git"), "Winco-Holland-B-V/plantas");
  assert.equal(repoUitUrl("git@github.com:Winco-Holland-B-V/plantas.git"), "Winco-Holland-B-V/plantas");
  assert.equal(repoUitUrl("https://github.com/a/b/"), "a/b");
  assert.equal(repoUitUrl("/tmp/klant-origin.git"), null);
});

test("template klonen: tags mee, hoogste tag is 9, checkout op de tag en niet op main", () => {
  const wortel = tijdelijkeMap();
  try {
    const bron = maakTemplateRepo(wortel);
    const doel = kloonTemplate({ repo: bron, doel: join(wortel, "kloon") });
    assert.equal(hoogsteTagVersie(doel), 9);
    assert.equal(versieOpAfstand(bron), 9);
    checkoutTag(doel, 9);
    assert.ok(readFileSync(join(doel, "CLAUDE.md"), "utf8").includes("versie 9"));
    assert.ok(!readFileSync(join(doel, "CLAUDE.md"), "utf8").includes("alleen op main"));
    const kern = gitVoorKern(doel, doel);
    assert.ok(kern.tonenOpTag("stack-v8", "CLAUDE.md").includes("versie 8"));
    assert.equal(kern.tonenOpTag("stack-v7", "CLAUDE.md"), null);
  } finally {
    opruimen(wortel);
  }
});

test("zonder tag stack-v9 is de hoogste tag 8; op afstand onbereikbaar geeft null", () => {
  const wortel = tijdelijkeMap();
  try {
    const bron = maakTemplateRepo(wortel, { tagV9: false });
    assert.equal(hoogsteTagVersie(kloonTemplate({ repo: bron, doel: join(wortel, "kloon") })), 8);
    assert.equal(versieOpAfstand(join(wortel, "bestaat-niet")), null);
  } finally {
    opruimen(wortel);
  }
});

test("branch, commit met trailer, herbouwbaar, boom vergelijken, droge en echte push", () => {
  const wortel = tijdelijkeMap();
  try {
    const { origin, checkout } = maakKlantRepo(wortel);
    const kloon = kloonRepo({ url: origin, doel: join(wortel, "kloon") });
    assert.deepEqual(gitIdentiteit(checkout), { naam: "Bart Klant", email: "bart@example.com" });
    // De kloon zelf heeft geen lokale identiteit; wat git daar terugvalt op de globale
    // config is bijzaak, want we geven altijd de identiteit uit de checkout mee.

    maakBranch(kloon, "stack-bijwerken/v9");
    assert.equal(git(kloon, "branch", "--show-current"), "stack-bijwerken/v9");
    assert.ok(pushDroog(kloon, "stack-bijwerken/v9"), "schrijfrecht op de origin");
    assert.equal(git(origin, "branch", "--list", "stack-bijwerken/v9"), "", "droge push maakt niets aan");

    writeFileSync(join(kloon, "CLAUDE.md"), "nieuw\n");
    assert.deepEqual(gewijzigdePaden(kloon), ["CLAUDE.md"]);
    commit({ map: kloon, identiteit: gitIdentiteit(checkout), bericht: "chore: stack-template naar versie 9", versie: 9 });
    assert.equal(git(kloon, "log", "-1", "--format=%an <%ae>"), "Bart Klant <bart@example.com>");
    assert.match(git(kloon, "log", "-1", "--format=%B"), /Stack-bijwerken: v9/);

    assert.equal(alGelijkOpGitHub(kloon, "stack-bijwerken/v9"), false);
    push(kloon, "stack-bijwerken/v9");
    assert.equal(alGelijkOpGitHub(kloon, "stack-bijwerken/v9"), true);
    assert.equal(branchHerbouwbaar(kloon, "stack-bijwerken/v9"), true);
    assert.equal(branchHerbouwbaar(kloon, "bestaat-niet"), true);

    // Iemand commit zelf op de branch: dan blijven we ervan af.
    const ander = kloonRepo({ url: origin, doel: join(wortel, "ander") });
    git(ander, "checkout", "-q", "stack-bijwerken/v9");
    writeFileSync(join(ander, "eigen.txt"), "van de klant\n");
    git(ander, "add", "-A");
    git(ander, "-c", "user.name=K", "-c", "user.email=k@k", "commit", "-q", "-m", "eigen werk");
    git(ander, "push", "-q", "origin", "stack-bijwerken/v9");
    assert.equal(branchHerbouwbaar(kloon, "stack-bijwerken/v9"), false);
    assert.equal(git(origin, "rev-parse", "main"), git(checkout, "rev-parse", "main"), "main onaangeroerd");
  } finally {
    opruimen(wortel);
  }
});

test("droge push zonder schrijfrecht geeft false", () => {
  const wortel = tijdelijkeMap();
  try {
    const { origin, checkout } = maakKlantRepo(wortel);
    git(checkout, "remote", "set-url", "--push", "origin", join(wortel, "bestaat-niet.git"));
    assert.equal(pushDroog(checkout, "x"), false);
    assert.ok(origin);
  } finally {
    opruimen(wortel);
  }
});

test("gh-stappen met een nep-gh: open PR's voor een versie, PR openen of bijwerken, oudere sluiten", () => {
  const wortel = tijdelijkeMap();
  const gh = nepGh(wortel, {
    "pr list": { stdout: [{ number: 4, headRefName: "stack-sync/v9", url: "https://x/4" }, { number: 3, headRefName: "stack-sync/v8", url: "https://x/3" }] },
    "pr create": { stdout: "Creating pull request\nhttps://github.com/o/r/pull/5\n" },
    "pr edit": { stdout: "" },
    "pr close": { stdout: "" },
  });
  const oudPath = process.env.PATH;
  process.env.PATH = `${gh.pad}:${oudPath}`;
  try {
    assert.equal(openPRVoorVersie("o/r", 9).number, 4);
    assert.equal(openPRVoorVersie("o/r", 10), null);
    assert.deepEqual(openOfWerkPRBij({ repo: "o/r", branch: "stack-bijwerken/v9", titel: "t", tekst: "b" }), {
      url: "https://github.com/o/r/pull/5",
      nieuw: true,
    });
    assert.deepEqual(openOfWerkPRBij({ repo: "o/r", branch: "stack-sync/v9", titel: "t", tekst: "b2" }), {
      url: "https://x/4",
      number: 4,
      nieuw: false,
    });
    assert.deepEqual(sluitOuderePRs({ repo: "o/r", prefix: "stack-sync", doelVersie: 9, tekst: "dicht" }), ["stack-sync/v8"]);
    const aanroepen = gh.aanroepen();
    assert.ok(aanroepen.some((a) => a[0] === "pr" && a[1] === "edit" && a[2] === "4" && a.includes("b2")));
    assert.ok(aanroepen.some((a) => a[0] === "pr" && a[1] === "close" && a[2] === "3"));
    assert.ok(!aanroepen.some((a) => a[0] === "pr" && a[1] === "close" && a[2] === "4"));
  } finally {
    process.env.PATH = oudPath;
    opruimen(wortel);
  }
});
