// T9 : logique pure du cahier de classe de l'élève d'école — menu réduit,
// cartes « Libre » (ouvertes ou fermées avec la raison), phrases des devoirs,
// temps restant de la séance — plus les appels API (URL, méthode, corps) avec
// un fetch de test.
// Lancer : npm test
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

// cahierLogic.ts n'a aucune dépendance ; eleveApi.ts n'importe que cahierLogic.ts
// (fourni par `deps`) : transpilation TypeScript puis exécution.
function load(relPath, deps = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(relPath, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const mod = { exports: {} };
  new Function("module", "exports", "require", outputText)(mod, mod.exports, id => deps[id] ?? require(id));
  return mod.exports;
}

const cahierLogic = load("../app/dashboard/cahier/cahierLogic.ts");
const { SCHOOL_TABS, whoLabel, rulesMessages, accessClosed, remainingLabel, duePhrase, libreCards, classBoardResult, myStandingPhrase } = cahierLogic;
const { fetchToday, fetchRestrictions, answerAnnouncement, fetchClassBoard } = load("../app/dashboard/cahier/eleveApi.ts", {
  "./cahierLogic": cahierLogic,
});

const realFetch = globalThis.fetch;

/** Règles d'école tout ouvertes : la base pour fabriquer un cas plus tard. */
const openRules = () => ({
  context: "home",
  serverTime: "2026-10-16T10:00:00+00:00",
  palou: { allowed: true, by: null },
  games: { allowed: true, by: null },
  scratch: { allowed: true, by: null },
  free_path: { allowed: true, by: null },
  leaderboard: { allowed: true, by: null },
  dailyLimitMinutes: { value: null, by: null },
  access: { allowedNow: true, by: null },
  messages: [],
});

/* ───────────────────────── Menu réduit (§8.1) ───────────────────────── */

test("menu : six onglets, dans l'ordre du cahier", () => {
  assert.deepEqual(
    SCHOOL_TABS.map(tab => tab.id),
    ["aujourdhui", "devoirs", "parcours", "classe", "etoiles", "libre"],
  );
  assert.deepEqual(
    SCHOOL_TABS.map(tab => tab.label),
    ["Aujourd’hui", "Mes devoirs", "Mon parcours", "Ma classe", "Mes étoiles", "Libre"],
  );
});

test("menu : chaque onglet pointe sur sa page du dashboard", () => {
  for (const tab of SCHOOL_TABS) assert.ok(tab.href.startsWith("/dashboard/"), tab.href);
});

/* ───────────────────────── Restriction : qui l'a posée ───────────────────────── */

test("qui a coupé : les trois mots du serveur, jamais muet", () => {
  assert.equal(whoLabel("class"), "ton enseignant");
  assert.equal(whoLabel("school"), "la direction de l'école");
  assert.equal(whoLabel("parent"), "ton parent");
  assert.equal(whoLabel(null), "la direction de l'école");
});

test("phrases des règles : on affiche celles du serveur, rien d'inventé", () => {
  const rules = { ...openRules(), messages: ["Les jeux et défis : coupé par ton enseignant."] };
  assert.deepEqual(rulesMessages(rules), ["Les jeux et défis : coupé par ton enseignant."]);
  assert.deepEqual(rulesMessages(null), []);
  assert.deepEqual(rulesMessages(openRules()), []);
});

test("hors horaires : détecté depuis access.allowedNow", () => {
  assert.equal(accessClosed(openRules()), false);
  assert.equal(accessClosed({ ...openRules(), access: { allowedNow: false, by: "class" } }), true);
  assert.equal(accessClosed(null), false);
});

/* ───────────────────────── Temps restant de la séance ───────────────────────── */

test("temps restant : MM:SS sous une heure", () => {
  assert.equal(remainingLabel(275), "04:35");
  assert.equal(remainingLabel(600), "10:00");
});

test("temps restant : H:MM:SS à partir d'une heure", () => {
  assert.equal(remainingLabel(3725), "1:02:05");
  assert.equal(remainingLabel(7200), "2:00:00");
});

test("temps restant : jamais négatif ni NaN", () => {
  assert.equal(remainingLabel(-30), "00:00");
  assert.equal(remainingLabel(0), "00:00");
  assert.equal(remainingLabel(undefined), "00:00");
  assert.equal(remainingLabel(NaN), "00:00");
});

/* ───────────────────────── Devoirs : la phrase de l'échéance ───────────────────────── */

test("devoir terminé ou en retard : les mots simples", () => {
  assert.equal(duePhrase({ status: "termine", dueDate: "2026-10-10" }), "Terminé");
  assert.equal(duePhrase({ status: "en_retard", dueDate: "2026-10-10" }), "En retard");
});

test("devoir sans date : « Pas de date » (y compris date illisible)", () => {
  assert.equal(duePhrase({ status: "a_faire", dueDate: null }), "Pas de date");
  assert.equal(duePhrase({ status: "a_faire", dueDate: "pas-une-date" }), "Pas de date");
});

const isoLocal = date =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

test("devoir à faire : aujourd’hui, demain, ou avant une date", () => {
  const now = new Date();
  const tomorrow = new Date(Date.now() + 86_400_000);
  const nextWeek = new Date(Date.now() + 5 * 86_400_000);
  assert.equal(duePhrase({ status: "a_faire", dueDate: isoLocal(now) }), "À rendre aujourd’hui");
  assert.equal(duePhrase({ status: "a_faire", dueDate: isoLocal(tomorrow) }), "À rendre demain");
  assert.match(duePhrase({ status: "a_faire", dueDate: isoLocal(nextWeek) }), /^À rendre avant le \d+ .+$/);
});

/* ───────────────────────── Page « Libre » : trois cartes ───────────────────────── */

test("libre : tout ouvert quand l'école n'a rien coupé", () => {
  const cards = libreCards(openRules());
  assert.equal(cards.length, 3);
  assert.deepEqual(cards.map(card => card.key), ["jeux", "scratch", "defis"]);
  assert.ok(cards.every(card => !card.closed && card.reason === null));
});

test("libre : jeux et défis coupés par l'enseignant, scratch ouvert", () => {
  const rules = { ...openRules(), games: { allowed: false, by: "class" } };
  const cards = libreCards(rules);
  const byKey = Object.fromEntries(cards.map(card => [card.key, card]));
  assert.equal(byKey.jeux.closed, true);
  assert.equal(byKey.jeux.reason, "Fermé par ton enseignant.");
  assert.equal(byKey.defis.closed, true);
  assert.equal(byKey.scratch.closed, false);
});

test("libre : hors horaires, tout est fermé (la raison prime)", () => {
  const rules = {
    ...openRules(),
    access: { allowedNow: false, by: "school" },
    games: { allowed: false, by: "class" },
  };
  const cards = libreCards(rules);
  assert.ok(cards.every(card => card.closed));
  assert.ok(cards.every(card => card.reason === "Ce n’est pas l’heure."));
});

test("libre : règles absentes (pas encore chargées) = carte ouverte, sans raison", () => {
  assert.ok(libreCards(null).every(card => !card.closed));
});

/* ───────────────────────── Appels API du cahier ───────────────────────── */

function stubFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init);
  };
  return calls;
}

test("accueil du jour : GET /api/eleve/aujourdhui, mêmes origines", async () => {
  const calls = stubFetch(() => ({ ok: true, json: async () => ({ session: null, announcements: [], track: "7-9", restrictions: openRules() }) }));
  const today = await fetchToday();
  try {
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/eleve/aujourdhui");
    assert.equal(calls[0].init.credentials, "same-origin");
    assert.equal(today.track, "7-9");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("règles : GET /api/eleve/restrictions ; échec réseau = null, jamais une exception", async () => {
  stubFetch(() => Promise.reject(new Error("hors ligne")));
  const rules = await fetchRestrictions();
  globalThis.fetch = realFetch;
  assert.equal(rules, null);
});

test("réponse au sondage : POST /api/eleve/annonces/7/reponse avec le choix, en JSON", async () => {
  const calls = stubFetch(() => ({ ok: true, json: async () => ({ myChoice: 2, counts: [1, 0, 3] }) }));
  const answer = await answerAnnouncement(7, 2);
  try {
    assert.equal(calls[0].url, "/api/eleve/annonces/7/reponse");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers["content-type"], "application/json");
    assert.deepEqual(JSON.parse(calls[0].init.body), { choice: 2 });
    assert.deepEqual(answer, { myChoice: 2, counts: [1, 0, 3] });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("réponse au sondage refusée par le serveur : null (l'interface réessaie)", async () => {
  stubFetch(() => ({ ok: false, json: async () => ({ error: "Ce sondage est terminé." }) }));
  const answer = await answerAnnouncement(7, 1);
  globalThis.fetch = realFetch;
  assert.equal(answer, null);
});

/* ───────────────────────── Classement de la classe (T14) ───────────────────────── */

const board = (overrides = {}) => ({
  scopeLabel: "Classement de la classe",
  classroom: "CE1 A",
  period: { label: "7 derniers jours", range: "du 10 au 16 octobre", timezone: "Africa/Dakar", start: "", end: "" },
  classSize: 3,
  participants: 2,
  entries: [
    { rank: 1, displayName: "Modou S.", xp: 50, lessons: 2, isMe: false },
    { rank: 2, displayName: "Awa D.", xp: 30, lessons: 1, isMe: true },
  ],
  me: { rank: 2, xp: 30, lessons: 1 },
  ...overrides,
});

test("classement : 200 → le tableau", () => {
  const result = classBoardResult(200, board());
  assert.equal(result.kind, "ok");
  assert.equal(result.board.entries.length, 2);
});

test("classement fermé : la phrase du serveur (« coupé par … ») et qui l'a coupé", () => {
  const closed = classBoardResult(403, { error: "Le classement : coupé par ton enseignant.", reason: "closed", by: "class" });
  assert.deepEqual(closed, { kind: "closed", message: "Le classement : coupé par ton enseignant.", by: "class" });
  // Sans phrase (ancien serveur) : on la reconstruit avec les mêmes mots, jamais un blocage muet.
  assert.equal(classBoardResult(403, { reason: "closed", by: "school" }).message, "Le classement : coupé par la direction de l'école.");
});

test("classement : élève sans classe, erreur serveur, réponse illisible", () => {
  assert.equal(classBoardResult(403, { error: "Réservé aux élèves d'une classe.", reason: "no_class" }).kind, "no_class");
  assert.equal(classBoardResult(500, null).kind, "error");
  assert.equal(classBoardResult(403, { detail: "CSRF" }).kind, "error");
  assert.equal(classBoardResult(200, { nope: true }).kind, "error");
});

test("classement : la phrase de ma place, y compris absent du classement", () => {
  assert.equal(myStandingPhrase(board()), "Tu es 2e cette semaine avec 30 points.");
  assert.equal(myStandingPhrase(board({ me: { rank: 1, xp: 1, lessons: 1 } })), "Tu es premier de la classe cette semaine avec 1 point !");
  assert.match(myStandingPhrase(board({ me: null })), /pas encore de points cette semaine/);
});

test("classement : GET /api/eleve/classement sans cache ; réseau coupé = erreur, jamais une exception", async () => {
  const calls = stubFetch(() => ({ status: 403, json: async () => ({ error: "Le classement : coupé par ton enseignant.", reason: "closed", by: "class" }) }));
  const closed = await fetchClassBoard();
  try {
    assert.equal(calls[0].url, "/api/eleve/classement");
    assert.equal(calls[0].init.credentials, "same-origin");
    assert.equal(calls[0].init.cache, "no-store");
    assert.equal(closed.kind, "closed");
    stubFetch(() => Promise.reject(new Error("hors ligne")));
    assert.deepEqual(await fetchClassBoard(), { kind: "error" });
    stubFetch(() => ({ status: 502, json: async () => { throw new Error("pas du JSON"); } }));
    assert.deepEqual(await fetchClassBoard(), { kind: "error" });
  } finally {
    globalThis.fetch = realFetch;
  }
});
