// Le lecteur de l'enfant lit le contenu publié depuis le studio (T17 A) : manifeste, version mémorisée, 404, pannes.
// Lancer : npm test (node --test tests/*.test.mjs). Même chargeur de TypeScript que parcours79-player.test.mjs.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test, { beforeEach } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const { JSDOM } = require("jsdom");
const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ── Chargeur minimal : compile .ts/.tsx à la volée, ignore le CSS, lit le JSON ─────────────────────────── */
const cache = new Map();
const EXTENSIONS = ["", ".ts", ".tsx", ".json", ".css", "/index.ts", "/index.tsx"];
function resolveFile(dir, spec) {
  const base = path.resolve(dir, spec);
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Module introuvable : ${spec} (depuis ${dir})`);
}
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const ext = path.extname(file);
  if (ext === ".css") return mod.exports;
  if (ext === ".json") { mod.exports = JSON.parse(fs.readFileSync(file, "utf8")); return mod.exports; }
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const localRequire = spec => (spec.startsWith(".") ? load(resolveFile(path.dirname(file), spec)) : require(spec));
  new Function("module", "exports", "require", outputText)(mod, mod.exports, localRequire);
  return mod.exports;
}
const app = rel => load(resolveFile(FRONTEND, rel));

/* ── Navigateur simulé (le rafraîchissement s'accroche à visibilitychange) ──────────────────────────────── */
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage });

const { refreshStudioContent, ensureLesson, getStudioLesson, resetStudioContent, startStudioRefresh, STUDIO_REFRESH_MS, ENSURE_TIMEOUT_MS } =
  app("app/dashboard/parcours79/studioContent.ts");
const { getLessonContent, getChapter, isPlayable } = app("app/dashboard/parcours79/content.ts");
const { lessonImageUrl } = app("app/dashboard/parcours79/Img79.tsx");
const embedded = app("content/parcours79/m01.json").lessons[0];

/* ── Faux réseau : une route par type d'appel, enregistré pour les preuves ───────────────────────────────── */
const ok = data => ({ status: 200, ok: true, json: async () => data });
const notFound = { status: 404, ok: false, json: async () => ({ error: "Contenu d'origine." }) };
let calls = [];
let manifest = () => ok({});        // GET /api/curriculum/content79/
let lesson = () => ok(null);        // GET /api/curriculum/content79/<id>/
globalThis.fetch = url => {
  const target = String(url);
  calls.push(target);
  const handler = target.replace(/\?.*$/, "").endsWith("content79/") ? manifest : lesson;
  return Promise.resolve().then(() => handler(target));
};
const lessonCalls = () => calls.filter(url => /content79\/[^/]+\/$/.test(url));
const tick = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms));

/** Contenu d'origine avec un texte modifié (ce qu'un administrateur vient de publier). */
function published(text) {
  const content = structuredClone(embedded);
  content.screens[0].text = text;
  return content;
}
const studioVersion = { version: 2, source: "studio" };

beforeEach(() => {
  resetStudioContent();
  calls = [];
  manifest = () => ok({});
  lesson = () => ok(null);
});

/* ── A.1 — le mécanisme de rafraîchissement ─────────────────────────────────────────────────────────────── */

test("manifeste vide : rien n'est en mémoire, le lecteur lit le JSON embarqué", async () => {
  await refreshStudioContent();

  assert.equal(getStudioLesson(embedded.id), undefined);
  assert.deepEqual(getLessonContent(embedded.id), embedded);
  assert.equal(calls.length, 1, "seul le manifeste est demandé");
});

test("une leçon modifiée dans le studio remplace le JSON embarqué", async () => {
  const texte = "Palou ouvre grand les yeux : une étoile tombe du ciel !";
  manifest = () => ok({ [embedded.id]: studioVersion });
  lesson = () => ok({ version: 2, content: published(texte) });

  await refreshStudioContent();

  assert.equal(getStudioLesson(embedded.id).screens[0].text, texte);
  assert.equal(getLessonContent(embedded.id).screens[0].text, texte, "getLessonContent donne la version du studio");
  assert.equal(getStudioLesson("p1-2"), undefined, "les autres leçons ne sont pas touchées");
  assert.ok(getLessonContent("p1-2"), "leur contenu d'origine reste lisible");
});

test("un 404 (contenu d'origine) est ignoré : rien n'est gardé", async () => {
  manifest = () => ok({ [embedded.id]: studioVersion });
  lesson = () => notFound;

  await refreshStudioContent();

  assert.equal(getStudioLesson(embedded.id), undefined);
  assert.deepEqual(getLessonContent(embedded.id), embedded, "le JSON embarqué reste affiché");
});

test("une panne réseau ne lève jamais d'exception et garde ce qu'on a", async () => {
  manifest = () => ok({ [embedded.id]: studioVersion });
  lesson = () => ok({ version: 2, content: published("Version du studio déjà en mémoire.") });
  await refreshStudioContent();
  assert.equal(getStudioLesson(embedded.id).screens[0].text, "Version du studio déjà en mémoire.");

  manifest = () => { throw new Error("réseau coupé"); };
  await refreshStudioContent();                       // ne doit pas rejeter
  assert.equal(getStudioLesson(embedded.id).screens[0].text, "Version du studio déjà en mémoire.",
    "la version déjà en mémoire survit à la panne");

  resetStudioContent();
  calls = [];
  manifest = () => ok({ [embedded.id]: studioVersion });
  lesson = () => { throw new Error("réseau coupé"); };
  await refreshStudioContent();
  assert.equal(getStudioLesson(embedded.id), undefined, "sans réponse, rien n'est inventé");
});

test("pas de rechargement quand la version est déjà en mémoire", async () => {
  manifest = () => ok({ [embedded.id]: studioVersion });
  lesson = () => ok({ version: 2, content: published("Version du studio.") });

  await refreshStudioContent();
  await refreshStudioContent();
  await refreshStudioContent();

  assert.equal(lessonCalls().length, 1, "la même version n'est demandée qu'une fois");
  assert.equal(calls.length, 1 + 3, "le manifeste, lui, est relu à chaque rafraîchissement");
});

test("une leçon retirée du manifeste revient au contenu d'origine", async () => {
  manifest = () => ok({ [embedded.id]: studioVersion });
  lesson = () => ok({ version: 2, content: published("Version du studio.") });
  await refreshStudioContent();
  assert.equal(getStudioLesson(embedded.id).screens[0].text, "Version du studio.");

  manifest = () => ok({});   // la publication a été annulée / retournée au contenu d'origine
  await refreshStudioContent();

  assert.equal(getStudioLesson(embedded.id), undefined);
  assert.deepEqual(getLessonContent(embedded.id), embedded);
});

/* ── A.1 — ensureLesson : une leçon, avant d'ouvrir le lecteur ───────────────────────────────────────────── */

test("ensureLesson charge la leçon publiée sans attendre de rafraîchissement", async () => {
  lesson = () => ok({ version: 5, content: published("Publié il y a 5 minutes.") });

  await ensureLesson(embedded.id);

  assert.equal(getStudioLesson(embedded.id).screens[0].text, "Publié il y a 5 minutes.");
  assert.equal(calls.length, 1, "une seule leçon est demandée, pas le manifeste");
});

test("ensureLesson est bornée dans le temps : une requête qui ne répond pas ne bloque pas l'ouverture", async () => {
  lesson = () => new Promise(() => {});        // le serveur ne répond jamais, et tient même l'AbortSignal

  const started = Date.now();
  await ensureLesson(embedded.id);
  const elapsed = Date.now() - started;

  assert.ok(elapsed >= ENSURE_TIMEOUT_MS - 100, `trop vite pour être passé par le délai (${elapsed} ms)`);
  assert.ok(elapsed < 4000, `délai dépassé : ${elapsed} ms`);
  assert.equal(getStudioLesson(embedded.id), undefined, "sans réponse, le contenu embarqué reste affiché");
});

test("ensureLesson retire la leçon quand le serveur renvoie le contenu d'origine (404)", async () => {
  lesson = () => ok({ version: 2, content: published("Version du studio.") });
  await ensureLesson(embedded.id);
  assert.ok(getStudioLesson(embedded.id));

  lesson = () => notFound;
  await ensureLesson(embedded.id);

  assert.equal(getStudioLesson(embedded.id), undefined);
});

test("ensureLesson ne remplace pas une leçon quand la version est la même", async () => {
  lesson = () => ok({ version: 2, content: published("Version du studio.") });
  await ensureLesson(embedded.id);
  const held = getStudioLesson(embedded.id);

  await ensureLesson(embedded.id);

  assert.equal(getStudioLesson(embedded.id), held, "le même objet reste affiché (aucun changement pendant la leçon)");
});

/* ── A.1 — le rythme du rafraîchissement ────────────────────────────────────────────────────────────────── */

test("rafraîchir : au premier affichage, au retour sur l'onglet, et toutes les 5 minutes", async () => {
  const intervals = [];
  const realSetInterval = window.setInterval;
  window.setInterval = (fn, ms) => { intervals.push(ms); return 1; };
  // jsdom expose `visibilityState` en lecture seule : on la rend commutable pour jouer un onglet quitté puis relu.
  let visibility = "hidden";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });

  try {
    const stop = startStudioRefresh();
    await tick();
    assert.equal(calls.length, 1, "le premier affichage du parcours déclenche un rafraîchissement");
    assert.deepEqual(intervals, [STUDIO_REFRESH_MS]);
    assert.equal(STUDIO_REFRESH_MS, 5 * 60 * 1000, "toutes les 5 minutes");

    document.dispatchEvent(new dom.window.Event("visibilitychange"));   // on reste sur l'onglet : rien de plus
    await tick();
    assert.equal(calls.length, 1);

    visibility = "visible";
    document.dispatchEvent(new dom.window.Event("visibilitychange"));   // l'enfant revient : on reprend le manifeste
    await tick();
    assert.equal(calls.length, 2);

    stop();
    document.dispatchEvent(new dom.window.Event("visibilitychange"));
    await tick();
    assert.equal(calls.length, 2, "après l'arrêt, plus rien ne rafraîchit");
  } finally {
    window.setInterval = realSetInterval;
  }
});

test("deux rafraîchissements lancés en même temps ne font qu'une requête (idempotent)", async () => {
  let release;
  manifest = () => new Promise(resolve => { release = resolve; });

  const both = Promise.all([refreshStudioContent(), refreshStudioContent()]);
  for (let attempt = 0; attempt < 100 && !release; attempt++) await tick(5);
  release(ok({}));
  await both;

  assert.equal(calls.length, 1);
});

/* ── A.2 et A.5 — le catalogue et les images ────────────────────────────────────────────────────────────── */

test("la version du studio ne change pas le catalogue : chapitre, jouabilité et titre restent ceux du site", async () => {
  manifest = () => ok({ [embedded.id]: studioVersion });
  lesson = () => ok({ version: 2, content: published("Version du studio.") });
  await refreshStudioContent();

  assert.equal(getChapter("p1").module.id, "p1");
  assert.equal(isPlayable(embedded.id), true);
  assert.equal(getLessonContent(embedded.id).title, embedded.title, "le titre vient du catalogue, pas du studio");
});

test("une image du studio (media:<id>.<empreinte>) devient une URL de l'API, un fichier du site garde son chemin", () => {
  assert.equal(lessonImageUrl("media:12.ab12cd34"), "/api/media/12/ab12cd34");
  assert.equal(lessonImageUrl("m01-l1-bonjour.webp"), "/images/parcours79/lecons/m01-l1-bonjour.webp");
  assert.equal(lessonImageUrl("media:12.trop-court"), "/images/parcours79/lecons/media:12.trop-court",
    "une référence mal formée retombe sur le chemin du site (le repli de Palou s'occupe du reste)");
});
