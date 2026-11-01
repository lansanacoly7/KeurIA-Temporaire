// Bande vide sous les pages courtes (T12) : responsive.css met `body { zoom: var(--app-zoom) }`
// (0.85 entre 1025 et 1599 px, 0.95 au-delà, réglé aussi par html[data-display-zoom]).
// Dans un corps zoomé, une hauteur 100vh ne couvre que 100vh × --app-zoom : un conteneur de page
// déclaré `min-height: 100vh` s'arrête à 85 % de l'écran et laisse une bande beige en bas.
// Le correctif est de diviser par le zoom : calc(100vh / var(--app-zoom, 1)).
// Ce test échoue dès qu'un 100vh nu réapparaît dans un conteneur de page (.css ou .tsx).
// Lancer : npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(FRONTEND, "app");

function walk(dir, extension, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, extension, out);
    else if (entry.name.endsWith(extension)) out.push(full);
  }
  return out;
}

// Commentaires retirés pour ne pas signaler une mention dans une documentation.
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// La valeur doit COMMENCER par 100vh/100dvh : `min-height: calc(100vh / …)` est compensé, donc autorisé.
const CSS_PATTERN = /min-height\s*:\s*100(?:d)?vh\b/gi;
const TSX_PATTERNS = [
  /minHeight\s*:\s*["'`]100(?:d)?vh["'`]/g, // style={{ minHeight: "100vh" }}
  /min-height\s*:\s*100(?:d)?vh\b/gi, // feuille de style enchaînée dans un .tsx
];

function offenders(file, source, patterns) {
  const hits = [];
  for (const pattern of patterns) {
    for (const match of source.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))) {
      const line = source.slice(0, match.index).split("\n").length;
      hits.push(`${path.relative(FRONTEND, file)}:${line} → ${match[0]}`);
    }
  }
  return hits;
}

test("aucun conteneur de page avec un 100vh non compensé par --app-zoom", () => {
  const cssFiles = walk(APP, ".css");
  const tsxFiles = walk(APP, ".tsx");
  const bad = [];
  for (const file of cssFiles) bad.push(...offenders(file, stripComments(fs.readFileSync(file, "utf8")), [CSS_PATTERN]));
  for (const file of tsxFiles) bad.push(...offenders(file, stripComments(fs.readFileSync(file, "utf8")), TSX_PATTERNS));
  assert.deepEqual(
    bad,
    [],
    `Remplacer par calc(100vh / var(--app-zoom, 1)) :\n  ${bad.join("\n  ")}`
  );
});

test("responsive.css définit --app-zoom : le diviseur du correctif existe", () => {
  const source = fs.readFileSync(path.join(APP, "responsive.css"), "utf8");
  assert.match(source, /--app-zoom:\s*[\d.]+/, "--app-zoom doit être défini (media queries et réglage Compact/Standard/Confort)");
  assert.match(source, /zoom:\s*var\(--app-zoom/, "le zoom du corps doit rester piloté par --app-zoom");
});

test("studio79.css : aucun 100vh ou 100vw nu non compensé par --app-zoom", () => {
  const file = path.join(APP, "admin", "_components", "studio79", "studio79.css");
  const source = stripComments(fs.readFileSync(file, "utf8"));
  const pattern = /(?:min-|max-)?(?:height|width)\s*:\s*100(?:d)?v[hw]\b/gi;
  const hits = offenders(file, source, [pattern]);
  assert.deepEqual(
    hits,
    [],
    `Remplacer par calc(100vh / var(--app-zoom, 1)) ou calc(100vw / var(--app-zoom, 1)), ou retirer au profit de inset: 0 :\n  ${hits.join("\n  ")}`
  );
});

