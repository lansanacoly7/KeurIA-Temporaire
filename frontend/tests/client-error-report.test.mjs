// Rapports d'erreurs du navigateur vers le serveur : un seul envoi par erreur identique, plafond par page, jamais de données personnelles.
// Lancer : npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function load(relative) {
  const file = path.join(FRONTEND, relative);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const mod = { exports: {} };
  new Function("module", "exports", "require", outputText)(mod, mod.exports, require);
  return mod.exports;
}

const { reportClientError, resetClientErrorReports } = load("app/utils/reportClientError.ts");

function fakeBrowser() {
  const sent = [];
  globalThis.window = { location: { pathname: "/dashboard/modules" } };
  globalThis.Blob = class { constructor(parts) { this.text = parts.join(""); } };
  Object.defineProperty(globalThis, "navigator", { value: { sendBeacon: (url, blob) => { sent.push({ url, body: JSON.parse(blob.text) }); return true; } }, configurable: true });
  resetClientErrorReports();
  return sent;
}

test("une erreur est envoyée avec son message, sa pile et le chemin de la page, rien d'autre", () => {
  const sent = fakeBrowser();
  const error = new Error("boom");
  assert.equal(reportClientError("error", error), true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, "/api/monitoring/client-error");
  assert.deepEqual(Object.keys(sent[0].body).sort(), ["digest", "kind", "message", "path", "stack"]);
  assert.equal(sent[0].body.message, "boom");
  assert.equal(sent[0].body.path, "/dashboard/modules");
});

test("la même erreur n'est envoyée qu'une fois, et pas plus de cinq erreurs par page", () => {
  const sent = fakeBrowser();
  assert.equal(reportClientError("error", new Error("a")), true);
  assert.equal(reportClientError("error", new Error("a")), false, "doublon");
  for (let i = 0; i < 10; i++) reportClientError("error", new Error(`autre ${i}`));
  assert.equal(sent.length, 5, "plafond de cinq rapports");
});

test("un rapport ne fait jamais planter l'application", () => {
  fakeBrowser();
  Object.defineProperty(globalThis, "navigator", { value: { sendBeacon: () => { throw new Error("réseau coupé"); } }, configurable: true });
  assert.doesNotThrow(() => reportClientError("unhandledrejection", undefined));
});

test("les pages d'erreur et le layout signalent bien les erreurs", () => {
  const read = file => fs.readFileSync(path.join(FRONTEND, file), "utf8");
  assert.match(read("app/error.tsx"), /reportClientError\("boundary"/);
  assert.match(read("app/global-error.tsx"), /reportClientError\("boundary"/);
  assert.match(read("app/layout.tsx"), /<ClientErrorReporter \/>/);
});
