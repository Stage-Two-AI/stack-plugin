#!/usr/bin/env node
/**
 * Het script achter /stack:nieuwe-app: maakt een nieuwe app aan uit de openbare
 * Stage Two-template, onder het GitHub-account of de organisatie van de gebruiker, met
 * zijn eigen login. Dit is het deel van het opzetrecept dat een machine kan doen; het
 * gesprek ervoor (wat moet de app doen, welke databasestand) staat in SKILL.md.
 *
 *   node nieuwe-app.mjs --json --droogloop --naam <naam> --eigenaar <account-of-org> \
 *        --database geen|gedeeld|eigen [--omschrijving "..."] \
 *        [--gedeeld-eigenaar <org/repo> --gedeeld-ref <project_ref>] [--map <map>]
 *       voorcontrole: staat alles klaar, bestaat de repo nog niet, waar landt hij, wie
 *       wordt reviewer. Maakt niets aan.
 *
 *   node nieuwe-app.mjs --json --doe-het ...dezelfde vlaggen...
 *       repo aanmaken uit de template, klonen, invullen, databasestand zetten, pakketten
 *       installeren, committen met de identiteit van de gebruiker, pushen, main
 *       beschermen, en als de Vercel-opdrachtregel er is en ingelogd: het Vercel-project
 *       koppelen.
 *
 * Elke uitkomst is één JSON-object op stdout met een `status`:
 *   klaar     (na --droogloop) alles staat klaar; zie `plan`
 *   gemaakt   (na --doe-het) de app staat op GitHub en op deze computer; zie `nogTeDoen`
 *   mislukt   een voorwaarde ontbreekt of een stap faalde; `reden` is één zin met één
 *             handeling. Was de repo al aangemaakt, dan staat hij in `repo`.
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
  if (arg.droogloop === arg.doeHet) return "geef precies één van --droogloop en --doe-het mee";
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
export function nogTeDoen({ database, ruleset, vercel }) {
  const lijst = [];
  if (!ruleset.gelukt) {
    lijst.push(
      "main is nog niet beschermd (meestal: een privérepo op een gratis GitHub-plan). Regel het plan, of vraag Stage Two.",
    );
  }
  if (vercel.status !== "gekoppeld") {
    lijst.push("Vercel: het project koppelen aan deze repo (preview per pull request, productie op main).");
  }
  if (database === "eigen") {
    lijst.push(
      "Supabase: een project en een testproject aanmaken op naam van het bedrijf, back-ups aanzetten, en de secrets SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD en SUPABASE_TEST_DB_PASSWORD op de repo zetten. Stage Two doet dit met je bij de eerste app met een eigen database.",
    );
  }
  lijst.push("Foutbewaking (Sentry): een project aanmaken en de DSN als omgevingsvariabele zetten. Mag later.");
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

/**
 * Vercel, alleen als de opdrachtregel er is én ingelogd. Niets installeren, nergens
 * inloggen: dat is een bewuste stap van de gebruiker (zie SKILL.md). Lukt het niet,
 * dan komt het in `nogTeDoen` en is de app verder gewoon klaar.
 */
function koppelVercel(map, naam) {
  const vercel = (...args) => sh("vercel", args, { cwd: map, timeout: 180000, shell: process.platform === "win32" });
  try {
    vercel("whoami");
  } catch (fout) {
    return {
      status: fout.code === "ENOENT" ? "geen-cli" : "niet-ingelogd",
      reden:
        fout.code === "ENOENT"
          ? "de Vercel-opdrachtregel staat niet op deze computer"
          : "de Vercel-opdrachtregel is niet ingelogd (vercel login)",
    };
  }
  try {
    vercel("link", "--yes", "--project", naam);
    vercel("git", "connect", "--yes");
    return { status: "gekoppeld" };
  } catch (fout) {
    return { status: "mislukt", reden: eersteRegel(fout) };
  }
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
  const vercel = koppelVercel(map, arg.naam);
  return {
    status: "gemaakt",
    repo,
    url: controle.plan.url,
    map,
    database: arg.database,
    reviewer,
    ruleset,
    vercel,
    nogTeDoen: nogTeDoen({ database: arg.database, ruleset, vercel }),
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
    schrijf(arg.doeHet ? doeHet(arg) : voorcontrole(arg), arg.json);
  } catch (fout) {
    schrijf({ status: "mislukt", reden: eersteRegel(fout) }, arg.json);
  }
}
