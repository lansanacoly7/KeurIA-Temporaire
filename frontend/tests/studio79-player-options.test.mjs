// Le lecteur de leçon 7-9 vu du studio (T17 A) : `startAt` (ouvrir sur un écran), `preview` (aperçu sans voix ni
// enregistrement) et `voiceOff` (un passage modifié reste muet, un passage intact garde la voix de Palou).
// Lancer : npm test (node --test tests/*.test.mjs). Même montage jsdom que parcours79-player.test.mjs.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

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

/* ── Navigateur simulé : ni AudioContext ni voix du navigateur, un lecteur audio qui note les fichiers demandés ─ */
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
dom.window.ResizeObserver = globalThis.ResizeObserver;

const requestedClips = [];
globalThis.Audio = class {
  constructor(src) { requestedClips.push(src); }
  play() { setTimeout(() => this.onended && this.onended(), 0); return Promise.resolve(); }
  pause() {}
};
const serverCalls = [];
globalThis.fetch = (...args) => { serverCalls.push(String(args[0])); return Promise.reject(new Error("hors ligne pendant le test")); };

const React = require("react");
const { act } = React;
const { createRoot } = require("react-dom/client");
const { LessonPlayer79 } = app("app/dashboard/parcours79/LessonPlayer79.tsx");
const lesson = app("content/parcours79/m01.json").lessons[0];

const tick = (ms = 30) => act(() => new Promise(resolve => setTimeout(resolve, ms)));
async function mount(content, extra = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let completed = null;
  await act(async () => {
    root.render(React.createElement(LessonPlayer79, {
      content, firstName: "Awa", scope: "test", onClose: () => {},
      onComplete: (score, stars) => { completed = { score, stars }; },
      ...extra,
    }));
  });
  await tick();
  return {
    container,
    completed: () => completed,
    unmount: () => act(async () => { root.unmount(); container.remove(); }),
  };
}
const text = container => container.textContent.replace(/\s+/g, " ");
const primary = container => container.querySelector(".p79-l-bottom .p79-btn:not(.alt)");
const clipsOf = lessonId => requestedClips.filter(src => src.includes(`/${lessonId}/`));

/* ── A.6 — startAt : l'aperçu du studio ouvre sur l'écran demandé ─────────────────────────────────────────── */

test("startAt : le lecteur s'ouvre sur l'écran demandé (l'aperçu affiche l'écran en cours d'édition)", async () => {
  const target = lesson.screens[2];
  const { container, unmount } = await mount(lesson, { startAt: 2 });

  assert.ok(text(container).includes(target.text), `écran attendu : « ${target.text} »`);
  assert.ok(!text(container).includes(lesson.screens[0].text), "le premier écran ne s'affiche pas");
  await unmount();
});

test("startAt au-delà des écrans existants se cale sur le dernier (jamais d'écran vide)", async () => {
  const last = lesson.screens[lesson.screens.length - 1];
  const { container, unmount } = await mount(lesson, { startAt: 99 });

  // « {prenom} » est remplacé par le prénom de l'enfant : on compare le texte une fois rempli.
  assert.ok(text(container).includes(last.text.replace("{prenom}", "Awa")), `dernier écran attendu : « ${last.text} »`);
  await unmount();
});

/* ── A.6 — preview : aperçu du studio, sans voix et sans rien enregistrer ─────────────────────────────────── */

test("preview : aucun fichier de voix n'est demandé, et rien n'est envoyé au serveur", async () => {
  requestedClips.length = 0;
  serverCalls.length = 0;
  const { container, unmount } = await mount(lesson, { preview: true });
  await tick();

  assert.deepEqual(clipsOf(lesson.id), [], "l'aperçu ne parle pas (pas de voix automatique)");
  assert.deepEqual(serverCalls, [], "l'aperçu n'enregistre rien");

  await act(async () => { primary(container).click(); });   // l'écran suivant ne parle pas non plus
  await tick();
  assert.deepEqual(clipsOf(lesson.id), []);
  await unmount();
});

test("sans preview, le lecteur lit bien la voix de Palou (le contrôle ci-dessus a du sens)", async () => {
  requestedClips.length = 0;
  const { unmount } = await mount(lesson);
  await tick();

  assert.ok(clipsOf(lesson.id).length >= 1, "l'écran d'ouverture a son fichier audio");
  assert.ok(clipsOf(lesson.id).some(src => src.endsWith(`/${lesson.id}_e01.mp3`)), "le premier fichier de la leçon");
  await unmount();
});

/* ── A.4 et A.6 — voiceOff : un passage modifié reste muet, les autres gardent leur voix ───────────────────── */

test("voiceOff : le passage coupé n'est jamais lu, le passage intact garde la voix de Palou", async () => {
  const muted = structuredClone(lesson);
  muted.voiceOff = ["e01"];
  requestedClips.length = 0;

  const { container, unmount } = await mount(muted);
  await tick();

  assert.deepEqual(clipsOf(lesson.id), [], `passage coupé lu : ${clipsOf(lesson.id).join(", ")}`);

  await act(async () => { primary(container).click(); });   // écran suivant, texte intact
  await tick();

  const played = clipsOf(lesson.id);
  assert.ok(played.some(src => src.endsWith(`/${lesson.id}_e02.mp3`)),
    `la voix d'origine reste jouée pour les passages intacts (demandé : ${played.join(", ")})`);
  assert.ok(!played.some(src => src.endsWith(`/${lesson.id}_e01.mp3`)), "jamais le passage coupé");
  await unmount();
});

test("voiceOff : sans passage coupé, le premier écran parle (l'inverse du cas ci-dessus)", async () => {
  const untouched = structuredClone(lesson);
  delete untouched.voiceOff;
  requestedClips.length = 0;

  const { unmount } = await mount(untouched);
  await tick();

  assert.ok(clipsOf(lesson.id).some(src => src.endsWith(`/${lesson.id}_e01.mp3`)), "le premier clip est demandé");
  await unmount();
});
