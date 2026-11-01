// Tests de composants (jsdom) : dictionnaire (mots verrouillés, filtres, quiz), icônes de palier, avertissement de temps d'écran.
// Même chargeur que parcours79-player.test.mjs : compile .ts/.tsx à la volée, ignore le CSS.
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

const STUBS = { "canvas-confetti": () => () => {} };
const cache = new Map();
const EXTENSIONS = ["", ".ts", ".tsx", ".json", ".css", "/index.ts", "/index.tsx"];
function resolveFile(dir, spec) {
  const base = spec.startsWith("@/") ? path.resolve(FRONTEND, spec.slice(2)) : path.resolve(dir, spec);
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
  const localRequire = spec => {
    if (spec in STUBS) return { __esModule: true, default: STUBS[spec]() };
    return spec.startsWith(".") || spec.startsWith("@/") ? load(resolveFile(path.dirname(file), spec)) : require(spec);
  };
  new Function("module", "exports", "require", outputText)(mod, mod.exports, localRequire);
  return mod.exports;
}
const app = rel => load(resolveFile(FRONTEND, rel));

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = require("react");
const { act } = React;
const { createRoot } = require("react-dom/client");

async function mount(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(element); });
  return { container, unmount: () => act(async () => { root.unmount(); container.remove(); }) };
}
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 10)); });
const EMOJI = /\p{Extended_Pictographic}/u;

function term(word, i, extra = {}) {
  return { word, definition: `Définition de ${word}`, example: `Exemple de ${word}`, icon: "star", background: "#fff", lesson: { id: `l${i}`, title: `Leçon ${i}` }, isNew: false, ...extra };
}

test("TierIcon : une icône SVG par palier, jamais d'emoji", async () => {
  const { TierIcon } = app("app/components/TierIcon.tsx");
  for (const tier of ["gold", "silver", "bronze", "emerald", "blue", "purple", "teal", "inconnu"]) {
    const m = await mount(React.createElement(TierIcon, { tier }));
    assert.ok(m.container.querySelector("svg"), `palier ${tier} : pas d'icône`);
    assert.ok(!EMOJI.test(m.container.textContent), `palier ${tier} : emoji dans le texte`);
    await m.unmount();
  }
});

test("TimeWarningBanner : affiche le temps restant sans emoji, et se ferme", async () => {
  const { TimeWarningBanner } = app("app/components/ScreenTimeScreens.tsx");
  let dismissed = false;
  const s = { isLocked: false, dismissBanner: false, remaining: 3, childDisplayName: "Awa", setDismissBanner: v => { dismissed = v; } };
  const m = await mount(React.createElement(TimeWarningBanner, { s }));
  assert.match(m.container.textContent, /3 min/);
  assert.match(m.container.textContent, /Awa/);
  assert.ok(!EMOJI.test(m.container.textContent));
  await act(async () => { m.container.querySelector("button").click(); });
  assert.equal(dismissed, true);
  await m.unmount();
  const hidden = await mount(React.createElement(TimeWarningBanner, { s: { ...s, remaining: 12 } }));
  assert.equal(hidden.container.textContent, "", "pas d'avertissement au-dessus de 5 minutes");
  await hidden.unmount();
});

test("DictionaryView : mots découverts, mots secrets, filtre et quiz", async () => {
  const payload = {
    total: 6, discovered: 3, next: { lessonId: "l4", lessonTitle: "Leçon 4" }, lockedForLearner: true,
    terms: [term("Pixel", 1, { isNew: true }), term("Souris", 2), term("Clavier", 3)],
  };
  globalThis.fetch = async url => {
    assert.match(String(url), /\/api\/curriculum\/glossary\//);
    return { ok: true, json: async () => payload };
  };
  const { DictionaryView } = app("app/dashboard/DictionaryView.tsx");
  const m = await mount(React.createElement(DictionaryView));
  await flush();
  const text = m.container.textContent;
  for (const w of ["Pixel", "Souris", "Clavier"]) assert.ok(text.includes(w), `mot manquant : ${w}`);
  assert.ok(m.container.querySelectorAll(".dict-card-mystery").length >= 1, "les mots non découverts apparaissent en mystère");
  assert.ok(!EMOJI.test(text), "aucun emoji dans le dictionnaire");
  assert.ok(!text.includes("Définition de Inconnu"));
  await m.unmount();
});

test("DictionaryView : erreur réseau -> message, pas de plantage", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const { DictionaryView } = app("app/dashboard/DictionaryView.tsx");
  const m = await mount(React.createElement(DictionaryView));
  await flush();
  assert.ok(m.container.textContent.length > 0);
  assert.equal(m.container.querySelectorAll(".dict-card-mystery").length, 0);
  await m.unmount();
});
