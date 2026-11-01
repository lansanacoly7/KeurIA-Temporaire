// Les grosses feuilles de style sont découpées en morceaux (home, scolaire, kids-shared, parcours79) : le sommaire ne contient que des @import,
// chaque morceau existe, reste de taille raisonnable et a des accolades équilibrées (une coupe au milieu d'un bloc casserait tout le style).
// Lancer : npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SUMMARIES = ["app/home.css", "app/_scolaire/scolaire.css", "app/dashboard/kids-shared.css", "app/dashboard/parcours79/parcours79.css"];
const MAX_LINES = 1000;

for (const summary of SUMMARIES) {
  test(`${summary} : sommaire d'@import, morceaux existants, de taille raisonnable et équilibrés`, () => {
    const file = path.join(FRONTEND, summary);
    const source = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const imports = [...source.matchAll(/@import\s+"([^"]+)";/g)].map(m => m[1]);
    assert.ok(imports.length >= 3, "le sommaire doit importer plusieurs morceaux");
    assert.equal(source.replace(/@import\s+"[^"]+";/g, "").trim(), "", "le sommaire ne contient que des @import (les règles vont dans les morceaux)");
    const order = imports.map(i => path.basename(i));
    assert.deepEqual(order, [...order].sort(), "les morceaux sont importés dans l'ordre de leur numéro (cascade d'origine)");
    for (const rel of imports) {
      const part = path.join(path.dirname(file), rel);
      assert.ok(fs.existsSync(part), `${rel} est introuvable`);
      const css = fs.readFileSync(part, "utf8");
      assert.ok(css.split("\n").length <= MAX_LINES, `${rel} dépasse ${MAX_LINES} lignes : le découper`);
      const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
      assert.equal((code.match(/\{/g) ?? []).length, (code.match(/\}/g) ?? []).length, `${rel} : accolades non équilibrées`);
    }
  });
}
