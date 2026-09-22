#!/usr/bin/env node
/**
 * Het script achter /stack:nieuwe-app: maakt een nieuwe app aan uit de openbare
 * Stage Two-template, onder het GitHub-account of de organisatie van de gebruiker, met
 * zijn eigen login. Dit is het deel van het opzetrecept dat een machine kan doen; het
 * gesprek ervoor (wat moet de app doen, welke databasestand) staat in SKILL.md.
 *
 *   node nieuwe-app.mjs --json --droogloop --naam <naam> --eigenaar <account-of-org> \
 *        --database geen|eigen [--omschrijving "..."] [--map <map>]
 *       (`--database gedeeld --gedeeld-eigenaar <org/repo> --gedeeld-ref <ref>` bestaat
 *       ook, maar is een keuze van Stage Two en wordt in het klantgesprek niet aangeboden)
 *       voorcontrole: staat alles klaar, bestaat de repo nog niet, waar landt hij, wie
 *       wordt reviewer. Maakt niets aan.
 *
 *   node nieuwe-app.mjs --json --doe-het ...dezelfde vlaggen...
 *       repo aanmaken uit de template, klonen, invullen, databasestand zetten, pakketten
 *       installeren, committen met de identiteit van de gebruiker, pushen, main
 *       beschermen. Hosting en database koppelt Stage Two: daar komt bewust geen
 *       toegang voor op de computer van de gebruiker (GitHub blijft de enige poort).
 *
 *   node nieuwe-app.mjs --json --inrichten --naam <naam> --eigenaar <org> --database geen|eigen
 *       start de workflow "App inrichten" in <org>/stack-beheer (Stage-Two-AI/stack-beheer),
 *       wacht tot hij klaar is en leest het resultaat uit het logboek. Zo komen Vercel en
 *       Supabase erbij zonder dat er een token op deze computer staat.
 *
 * Elke uitkomst is één JSON-object op stdout met een `status`:
 *   klaar        (na --droogloop) alles staat klaar; zie `plan`
 *   gemaakt      (na --doe-het) de app staat op GitHub en op deze computer; zie `nogTeDoen`
 *   ingericht    (na --inrichten) hosting en database staan; zie `resultaat` en `pr`
 *   geen-beheer  (na --inrichten) deze eigenaar heeft geen beheer-repo; Stage Two koppelt
 *   mislukt      een voorwaarde ontbreekt of een stap faalde; `reden` is één zin met één
 *                handeling. Was de repo al aangemaakt, dan staat hij in `repo`.
 *
 * Er komt geen token van Stage Two aan te pas (KTD5): alles loopt via `gh` met de login
 * van de gebruiker. De map van de gebruiker wordt alleen aangevuld met één nieuwe
 * submap; bestaat die al, dan stopt het script.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eersteRegel, ghAanwezig, ghIngelogd, git, sh } from "../../../lib/repo.mjs";

export const TEMPLATE = "Stage-Two-AI/stack-template";
export const STAGE_TWO_LOGIN = "StageTwoAI";
export const DATABASESTANDEN = ["geen", "gedeeld", "eigen"];
const HIER = dirname(fileURLToPath(import.meta.url));
const RULESET_PAD = join(HIER, "..", "ruleset.json");

// ---------------------------------------------------------------- argumenten

export function leesArgumenten(argv) {
  const uit = {
    json: false,
    droogloop: false,
    doeHet: false,
    inrichten: false,
    naam: null,
    eigenaar: null,
    omschrijving: null,
    database: null,
    gedeeldEigenaar: null,
    gedeeldRef: null,
    map: null,
  };
  const metWaarde = {
    "--naam": "naam",
    "--eigenaar": "eigenaar",
    "--omschrijving": "omschrijving",
    "--database": "database",
    "--gedeeld-eigenaar": "gedeeldEigenaar",
    "--gedeeld-ref": "gedeeldRef",
    "--map": "map",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") uit.json = true;
    else if (a === "--droogloop") uit.droogloop = true;
    else if (a === "--doe-het") uit.doeHet = true;
    else if (a === "--inrichten") uit.inrichten = true;
    else if (a in metWaarde) {
      const waarde = argv[i + 1];
      if (waarde === undefined || waarde.startsWith("--")) throw new Error(`${a} vraagt een waarde`);
      uit[metWaarde[a]] = waarde;
      i += 1;
    } else throw new Error(`onbekende optie: ${a}`);
  }
  return uit;
}

/** Een repo-naam die overal werkt: kleine letters, cijfers en streepjes, 2 tot 60 tekens. */
export function geldigeNaam(naam) {
  return /^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$/.test(naam ?? "");
}

export function controleerArgumenten(arg) {
  if ([arg.droogloop, arg.doeHet, arg.inrichten].filter(Boolean).length !== 1) {
    return "geef precies één van --droogloop, --doe-het en --inrichten mee";
  }
  if (arg.inrichten && !["geen", "eigen"].includes(arg.database)) return "inrichten kan alleen met --database geen of eigen";
  if (!geldigeNaam(arg.naam)) {
    return "de naam mag alleen kleine letters, cijfers en streepjes bevatten (bijvoorbeeld voorraad-app)";
  }
  if (!arg.eigenaar) return "geef met --eigenaar het GitHub-account of de organisatie mee waar de app komt";
  if (!DATABASESTANDEN.includes(arg.database)) return "geef met --database geen, gedeeld of eigen mee";
  if (arg.database === "gedeeld") {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(arg.gedeeldEigenaar ?? "")) {
      return "bij een gedeelde database hoort --gedeeld-eigenaar <organisatie/repo> van de app die de database bezit";
    }
    if (!/^[a-z]{20}$/.test(arg.gedeeldRef ?? "")) {
      return "bij een gedeelde database hoort --gedeeld-ref: de project-ref van twintig kleine letters uit stack.config.json van die app";
    }
  }
  return null;
}

// ---------------------------------------------------------------- zuivere stappen

/**
 * Wie wordt de reviewer in CODEOWNERS? Stage Two zolang die bij de organisatie hoort;
 * anders de gebruiker zelf, want een CODEOWNERS die naar iemand zonder toegang wijst
 * blokkeert het mergen op de gevoelige paden.
 */
export function kiesReviewer({ login, stageTwoLid }) {
  return stageTwoLid ? STAGE_TWO_LOGIN : login;
}

/** De "Vervang dit"-aanwijzingen weg, de projectnaam en omschrijving erin. */
export function vulIn(map, { naam, omschrijving, reviewer }) {
  for (const bestand of ["README.md", "AGENTS.md"]) {
    const pad = join(map, bestand);
    if (!existsSync(pad)) throw new Error(`${bestand} ontbreekt na het klonen; de template is niet goed overgenomen`);
    let tekst = readFileSync(pad, "utf8");
    tekst = tekst.replace(/<!--\s*Vervang[\s\S]*?-->\n*/g, "");
    tekst = tekst.replaceAll("<projectnaam>", naam);
    if (omschrijving) {
      tekst = tekst.replace("<!-- Wat deze app doet, in één zin, vanuit de gebruiker geschreven. -->", omschrijving);
    }
    writeFileSync(pad, tekst);
  }
  const codeowners = join(map, ".github", "CODEOWNERS");
  if (existsSync(codeowners)) {
    writeFileSync(codeowners, readFileSync(codeowners, "utf8").replaceAll(`@${STAGE_TWO_LOGIN}`, `@${reviewer}`));
  }
  for (const bestand of ["README.md", "AGENTS.md"]) {
    if (readFileSync(join(map, bestand), "utf8").includes("<projectnaam>")) {
      throw new Error(`de projectnaam is niet overal ingevuld in ${bestand}`);
    }
  }
}

/**
 * De databasestand in stack.config.json. `geen` en `gedeeld` bezitten geen database;
 * dan gaan de voorbeeldmigraties weg, anders laat guard:migrations de poort falen.
 */
export function zetDatabaseStand(map, { database, gedeeldEigenaar, gedeeldRef }) {
  const pad = join(map, "stack.config.json");
  const config = JSON.parse(readFileSync(pad, "utf8"));
  if (database === "eigen") {
    config.database = true;
    delete config.gedeelde_database;
  } else if (database === "gedeeld") {
    config.database = "gedeeld";
    config.gedeelde_database = { eigenaar: gedeeldEigenaar, project_ref: gedeeldRef };
  } else {
    config.database = false;
    delete config.gedeelde_database;
  }
  writeFileSync(pad, `${JSON.stringify(config, null, 2)}\n`);
  const migraties = join(map, "supabase", "migrations");
  if (database !== "eigen" && existsSync(migraties)) rmSync(migraties, { recursive: true, force: true });
}

/** Wat er na het script nog te doen is, per databasestand en per uitkomst. */
export function nogTeDoen({ database, ruleset }) {
  const lijst = [];
  if (!ruleset.gelukt) {
    lijst.push(
      "main is nog niet beschermd (meestal: een privérepo op een gratis GitHub-plan). Regel het plan, of vraag Stage Two.",
    );
  }
  lijst.push(
    "Hosting (Vercel): Stage Two koppelt het project aan deze repo (preview per pull request, productie op main). Daar komt bewust geen toegang voor op deze computer.",
  );
  if (database === "eigen") {
    lijst.push(
      "Database (Supabase): Stage Two maakt het project en het testproject aan op naam van het bedrijf, zet back-ups aan en zet de secrets op de repo. Tot die tijd kun je gewoon bouwen; de kwaliteitspoort draait tegen een eigen testdatabase.",
    );
  }
  lijst.push("Foutbewaking (Sentry): Stage Two maakt een project aan en zet de DSN als omgevingsvariabele. Mag later.");
  return lijst;
}

// ---------------------------------------------------------------- gh-stappen

function ghJson(args) {
  return JSON.parse(sh("gh", ["api", ...args]));
}

function repoBestaat(repo) {
  try {
    sh("gh", ["repo", "view", repo, "--json", "name"]);
    return true;
  } catch {
    return false;
  }
}

function login() {
  return sh("gh", ["api", "user", "-q", ".login"]);
}

function isOrganisatie(eigenaar) {
  try {
    return ghJson([`users/${eigenaar}`]).type === "Organization";
  } catch {
    return false;
  }
}

function magInOrganisatie(eigenaar, gebruiker) {
  try {
    sh("gh", ["api", `orgs/${eigenaar}/memberships/${gebruiker}`]);
    return true;
  } catch {
    return false;
  }
}

function stageTwoIsLid(eigenaar) {
  try {
    sh("gh", ["api", `orgs/${eigenaar}/members/${STAGE_TWO_LOGIN}`]);
    return true;
  } catch {
    return false;
  }
}

function plan(eigenaar) {
  try {
    const p = sh("gh", ["api", `orgs/${eigenaar}`, "-q", ".plan.name // empty"]);
    return p || "onbekend";
  } catch {
    try {
      return sh("gh", ["api", `users/${eigenaar}`, "-q", ".plan.name // empty"]) || "onbekend";
    } catch {
      return "onbekend";
    }
  }
}

function pnpm(map, ...args) {
  // Op Windows is pnpm een .cmd-omhulsel; dat start alleen via de shell.
  return sh("pnpm", args, { cwd: map, timeout: 600000, shell: process.platform === "win32" });
}

function wachtTotGevuld(repo, { pogingen = 30, wachtMs = 2000 } = {}) {
  for (let i = 0; i < pogingen; i += 1) {
    try {
      sh("gh", ["api", `repos/${repo}/contents/package.json`]);
      return true;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wachtMs);
    }
  }
  return false;
}

function zetRuleset(repo) {
  try {
    sh("gh", ["api", `repos/${repo}/rulesets`, "-X", "POST", "--input", RULESET_PAD]);
    return { gelukt: true };
  } catch (fout) {
    return { gelukt: false, reden: eersteRegel(fout) };
  }
}

// ---------------------------------------------------------------- inrichten

export const BEHEER_REPO = "stack-beheer";
export const BEHEER_WORKFLOW = "app-inrichten.yml";

/** De regel `INRICHTING {...}` uit het logboek van de workflow, of null. */
export function leesInrichting(logtekst) {
  const regels = String(logtekst ?? "").split("\n");
  for (let i = regels.length - 1; i >= 0; i -= 1) {
    const m = /INRICHTING (\{.*\})\s*$/.exec(regels[i]);
    if (!m) continue;
    try {
      return JSON.parse(m[1]);
    } catch {
      return null;
    }
  }
  return null;
}

/** Wat er na een geslaagde inrichting nog open staat. */
export function nogTeDoenNaInrichting({ database, pr }) {
  const lijst = [];
  if (database === "eigen") {
    lijst.push(
      pr
        ? `De pull request "Inrichting: testdatabase koppelen" mergen: ${pr}. Daarna gaan migraties eerst naar de testdatabase en dan naar productie.`
        : "De pull request van de inrichting (testdatabase koppelen) opzoeken op de repo en mergen.",
    );
    lijst.push("Back-ups van de productiedatabase: die hangen aan het plan van de Supabase-organisatie; Stage Two controleert dat bij de eerste app met een eigen database.");
  }
  lijst.push("Foutbewaking (Sentry): Stage Two maakt een project aan en zet de DSN als omgevingsvariabele. Mag later.");
  return lijst;
}

function slaap(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Start de workflow in de beheer-repo en wacht op het resultaat. `gh` doet al het werk
 * met de login van de gebruiker: die heeft Write op stack-beheer (mag starten) en leest
 * het logboek. Er komt geen token van Vercel of Supabase aan te pas.
 */
export function richtIn(arg, { cwd = process.cwd(), wachtMs = 5000, maxWachtMinuten = 30 } = {}) {
  const fout = controleerArgumenten(arg);
  if (fout) return { status: "mislukt", reden: fout };
  if (!ghAanwezig()) return { status: "mislukt", reden: "de GitHub-opdrachtregel (gh) ontbreekt; draai eerst /stack:starten" };
  if (!ghIngelogd()) return { status: "mislukt", reden: "log eerst in bij GitHub met `gh auth login` (zie /stack:starten)" };

  const beheer = `${arg.eigenaar}/${BEHEER_REPO}`;
  if (!isOrganisatie(arg.eigenaar) || !repoBestaat(beheer)) {
    return {
      status: "geen-beheer",
      reden: `${arg.eigenaar} heeft geen beheer-repo (${beheer}); Stage Two koppelt de hosting en de database`,
    };
  }
  const repo = `${arg.eigenaar}/${arg.naam}`;
  if (!repoBestaat(repo)) return { status: "mislukt", reden: `de repo ${repo} bestaat niet; maak de app eerst aan (--doe-het)` };

  const start = new Date();
  try {
    sh("gh", ["workflow", "run", BEHEER_WORKFLOW, "--repo", beheer, "-f", `repo=${arg.naam}`, "-f", `database=${arg.database}`], { cwd });
  } catch (f) {
    return { status: "mislukt", reden: `de workflow starten mislukte: ${eersteRegel(f)} (heb je Write op ${beheer}?)` };
  }

  // GitHub registreert de run een paar seconden na het starten; zoek de eerste die van ná de start is.
  let run = null;
  for (let i = 0; i < 12 && !run; i += 1) {
    slaap(wachtMs);
    try {
      const lijst = JSON.parse(
        sh("gh", ["run", "list", "--repo", beheer, "--workflow", BEHEER_WORKFLOW, "--limit", "5", "--json", "databaseId,createdAt,url"], { cwd }),
      );
      run = lijst.find((r) => new Date(r.createdAt) >= new Date(start.getTime() - 60000)) ?? null;
    } catch {
      run = null;
    }
  }
  if (!run) return { status: "mislukt", reden: `de workflow is gestart maar de run is niet gevonden; kijk op https://github.com/${beheer}/actions` };

  try {
    sh("gh", ["run", "watch", String(run.databaseId), "--repo", beheer, "--interval", "10"], { cwd, timeout: maxWachtMinuten * 60000 });
  } catch (f) {
    if (f.killed || /ETIMEDOUT/.test(String(f.code))) {
      return { status: "mislukt", reden: `de workflow draait na ${maxWachtMinuten} minuten nog; kijk op ${run.url}`, url: run.url };
    }
  }
  let log = "";
  try {
    log = sh("gh", ["run", "view", String(run.databaseId), "--repo", beheer, "--log"], { cwd, ruw: true, maxBuffer: 64 * 1024 * 1024 });
  } catch {
    log = "";
  }
  const resultaat = leesInrichting(log);
  if (!resultaat) return { status: "mislukt", reden: `geen resultaat gevonden in het logboek van de workflow; kijk op ${run.url}`, url: run.url };
  if (resultaat.status !== "gelukt") {
    return { status: "mislukt", reden: resultaat.reden ?? "de inrichting is mislukt", url: run.url };
  }
  let pr = null;
  if (arg.database === "eigen") {
    try {
      const prs = JSON.parse(sh("gh", ["pr", "list", "--repo", repo, "--head", "inrichting/testdatabase", "--json", "url"], { cwd }));
      pr = prs[0]?.url ?? null;
    } catch {
      pr = null;
    }
  }
  return {
    status: "ingericht",
    repo,
    url: run.url,
    database: arg.database,
    resultaat,
    pr,
    nogTeDoen: nogTeDoenNaInrichting({ database: arg.database, pr }),
  };
}

// ---------------------------------------------------------------- de run

export function voorcontrole(arg, { cwd = process.cwd() } = {}) {
  const fout = controleerArgumenten(arg);
  if (fout) return { status: "mislukt", reden: fout };
  for (const cli of ["git", "pnpm"]) {
    try {
      sh(cli, ["--version"], { shell: cli === "pnpm" && process.platform === "win32" });
    } catch {
      return { status: "mislukt", reden: `${cli} staat niet op deze computer; draai eerst /stack:starten` };
    }
  }
  if (!ghAanwezig()) return { status: "mislukt", reden: "de GitHub-opdrachtregel (gh) ontbreekt; draai eerst /stack:starten" };
  if (!ghIngelogd()) return { status: "mislukt", reden: "log eerst in bij GitHub met `gh auth login` (zie /stack:starten)" };

  const gebruiker = login();
  const org = isOrganisatie(arg.eigenaar);
  if (!org && arg.eigenaar !== gebruiker) {
    return {
      status: "mislukt",
      reden: `${arg.eigenaar} is geen organisatie en niet je eigen account (${gebruiker}); kies een van beide`,
    };
  }
  if (org && !magInOrganisatie(arg.eigenaar, gebruiker)) {
    return { status: "mislukt", reden: `je account ${gebruiker} is geen lid van de organisatie ${arg.eigenaar}` };
  }
  const repo = `${arg.eigenaar}/${arg.naam}`;
  if (repoBestaat(repo)) return { status: "mislukt", reden: `de repo ${repo} bestaat al; kies een andere naam` };
  const doel = resolve(arg.map ?? cwd, arg.naam);
  if (existsSync(doel)) return { status: "mislukt", reden: `de map ${doel} bestaat al; kies een andere naam of map` };
  if (arg.database === "gedeeld" && !repoBestaat(arg.gedeeldEigenaar)) {
    return { status: "mislukt", reden: `de app ${arg.gedeeldEigenaar} die de database bezit is niet gevonden op GitHub` };
  }

  const stageTwoLid = org ? stageTwoIsLid(arg.eigenaar) : false;
  return {
    status: "klaar",
    plan: {
      repo,
      url: `https://github.com/${repo}`,
      map: doel,
      database: arg.database,
      reviewer: kiesReviewer({ login: gebruiker, stageTwoLid }),
      gebruiker,
      organisatie: org,
      githubPlan: plan(arg.eigenaar),
      template: TEMPLATE,
    },
  };
}

export function doeHet(arg, { cwd = process.cwd() } = {}) {
  const controle = voorcontrole(arg, { cwd });
  if (controle.status !== "klaar") return controle;
  const { repo, map, reviewer, gebruiker } = controle.plan;
  const uitkomst = { status: "mislukt", repo, url: controle.plan.url };

  try {
    sh("gh", [
      "repo",
      "create",
      repo,
      "--private",
      "--template",
      TEMPLATE,
      ...(arg.omschrijving ? ["--description", arg.omschrijving] : []),
    ]);
  } catch (fout) {
    return { status: "mislukt", reden: `de repo aanmaken mislukte: ${eersteRegel(fout)}` };
  }
  if (!wachtTotGevuld(repo)) {
    return { ...uitkomst, reden: `GitHub heeft de template na een minuut nog niet gekopieerd; kijk op ${controle.plan.url}` };
  }

  try {
    mkdirSync(dirname(map), { recursive: true });
    sh("gh", ["repo", "clone", repo, map, "--", "--quiet"], { timeout: 300000 });
    vulIn(map, { naam: arg.naam, omschrijving: arg.omschrijving, reviewer });
    zetDatabaseStand(map, arg);
    pnpm(map, "install", "--silent");

    const naam = git(map, "config", "--get", "user.name") || gebruiker;
    let email;
    try {
      email = git(map, "config", "--get", "user.email");
    } catch {
      email = "";
    }
    email ||= `${gebruiker}@users.noreply.github.com`;
    git(map, "add", "-A");
    git(map, "-c", `user.name=${naam}`, "-c", `user.email=${email}`, "commit", "-q", "-m", "chore: projectnaam, reviewer en databasestand invullen");
    git(map, "push", "-q", "origin", "HEAD");
  } catch (fout) {
    return { ...uitkomst, map, reden: `het klaarzetten van de app mislukte: ${eersteRegel(fout)}` };
  }

  const ruleset = zetRuleset(repo);
  return {
    status: "gemaakt",
    repo,
    url: controle.plan.url,
    map,
    database: arg.database,
    reviewer,
    ruleset,
    nogTeDoen: nogTeDoen({ database: arg.database, ruleset }),
  };
}

// ---------------------------------------------------------------- start

function schrijf(uit, json) {
  if (json) process.stdout.write(`${JSON.stringify(uit)}\n`);
  else process.stdout.write(`${JSON.stringify(uit, null, 2)}\n`);
  process.exitCode = uit.status === "mislukt" ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let arg;
  try {
    arg = leesArgumenten(process.argv.slice(2));
  } catch (fout) {
    schrijf({ status: "mislukt", reden: fout.message }, true);
    process.exit(1);
  }
  try {
    schrijf(arg.inrichten ? richtIn(arg) : arg.doeHet ? doeHet(arg) : voorcontrole(arg), arg.json);
  } catch (fout) {
    schrijf({ status: "mislukt", reden: eersteRegel(fout) }, arg.json);
  }
}
