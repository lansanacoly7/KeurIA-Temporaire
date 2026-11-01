// Isolation de studio79.css (T18-bis) : aucune règle globale (reset, body, *, button, :focus-visible nu...)
// ne doit polluer les autres pages du back-office (Comptes, Inscriptions).
// Chaque sélecteur (au niveau racine ou sous @media/@supports) doit commencer par .sx- (ou :root pour les variables).
// Lancer : node --test tests/studio79-css-scope.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS_PATH = path.join(FRONTEND, "app/admin/_components/studio79/studio79.css");

function extractSelectors(text) {
  const result = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      if (depth === 0) {
        const header = current.trim();
        let body = '';
        let innerDepth = 1;
        i++;
        while (i < text.length && innerDepth > 0) {
          if (text[i] === '{') innerDepth++;
          else if (text[i] === '}') innerDepth--;
          if (innerDepth > 0) body += text[i];
          i++;
        }
        i--;
        if (header.startsWith('@media') || header.startsWith('@supports')) {
          result.push(...extractSelectors(body));
        } else if (!header.startsWith('@keyframes') && !header.startsWith('@font-face')) {
          result.push(header);
        }
        current = '';
      }
    } else if (depth === 0) {
      current += ch;
    }
  }
  return result;
}

test("studio79.css : tous les sélecteurs commencent par .sx- ou :root (isolation stricte du studio)", () => {
  assert.ok(fs.existsSync(CSS_PATH), "studio79.css doit exister");
  const raw = fs.readFileSync(CSS_PATH, "utf8");
  const clean = raw.replace(/\/\*[\s\S]*?\*\//g, "");

  const rules = extractSelectors(clean);
  assert.ok(rules.length > 50, "studio79.css doit contenir des règles CSS");

  const violations = [];
  for (const rule of rules) {
    const selectors = rule.split(",").map(s => s.trim().replace(/\s+/g, " "));
    for (const sel of selectors) {
      if (!sel) continue;
      // Les sélecteurs autorisés commencent par .sx- ou :root
      if (!sel.startsWith(".sx-") && !sel.startsWith(":root")) {
        violations.push(sel);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Règles sans préfixe .sx- trouvées dans studio79.css : ${violations.join(", ")}`
  );
});

test("studio79.css : :focus-visible est strictement scopé sous les conteneurs studio", () => {
  const raw = fs.readFileSync(CSS_PATH, "utf8");
  const clean = raw.replace(/\/\*[\s\S]*?\*\//g, "");

  // Vérifier qu'il n'y a aucun :focus-visible au niveau racine ou non précédé de .sx-
  const bareFocus = clean.match(/(?:^|\})\s*:focus-visible\b/g);
  assert.equal(bareFocus, null, "aucun :focus-visible nu autorisé dans studio79.css");
});
