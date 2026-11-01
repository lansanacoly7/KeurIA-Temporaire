// Les 17 types d'activités du parcours 7-9 doivent tous être décrits par le formulaire du studio : c'est ce qui garantit
// qu'un administrateur peut éditer n'importe quelle manche d'une leçon, et que le champ « de référence » existe vraiment.
// Le fichier est du TypeScript (frontend/app/admin/_components/studio79/roundSchemas.ts) : on le compile comme les autres tests.
// Lire ce dossier est permis ; l'y modifier ne l'est pas (Antigravity, tâche T18).
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ── Chargeur minimal : compile .ts/.tsx à la volée, ignore le CSS ─────────────────────────────────────────── */
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
const { ROUND_TYPES, ROUND_TYPE_ORDER } = load(resolveFile(FRONTEND, "app/admin/_components/studio79/roundSchemas.ts"));

/* ── Les types de Round du lecteur de l'enfant ───────────────────────────────────────────────────────────── */
const TYPES_SOURCE = fs.readFileSync(resolveFile(FRONTEND, "app/dashboard/parcours79/types.ts"), "utf8");
const UNION = /export type Round = ([^;]+);/.exec(TYPES_SOURCE);
assert.ok(UNION, "le type Round existe bien dans parcours79/types.ts");
const ROUND_UNION = UNION[1].split("|").map(name => {
  const bare = name.trim().replace(/Round$/, "");              // « RuleSortRound » → « rulesort »
  return bare.charAt(0).toLowerCase() + bare.slice(1);
});
// Le lecteur écrit « RuleSortRound », le studio « rulesort » : la comparaison ignore la casse des majuscules.
const normalize = name => name.toLowerCase();

/** Les champs d'une activité (un niveau, sans compter ceux des sous-objets). */
const keysOf = fields => fields.filter(field => field.key).map(field => field.key);

/** Tous les champs d'un schéma, de profondeur quelconque, avec le chemin pour les messages. */
function allFields(fields, where = "") {
  const flat = [];
  for (const field of fields) {
    flat.push({ ...field, where });
    if (field.kind === "object" || field.kind === "list") flat.push(...allFields(field.fields || [], `${where}${field.key}.`));
  }
  return flat;
}

test("les 17 types d'activités du lecteur ont chacun un schéma dans le studio", () => {
  assert.equal(ROUND_UNION.length, 17, "le lecteur connaît bien 17 types de Round");
  const keys = Object.keys(ROUND_TYPES);
  for (const type of ROUND_UNION) {
    const key = keys.find(candidate => normalize(candidate) === normalize(type));
    assert.ok(key, `ROUND_TYPES a un schéma pour « ${type} »`);
    assert.equal(ROUND_TYPE_ORDER.includes(key), true, `${key} figure dans ROUND_TYPE_ORDER (l'ordre des onglets du studio)`);
  }
  assert.deepEqual(keys.map(normalize).sort(), ROUND_UNION.map(normalize).sort(),
    "le studio ne décrit aucun type qui n'existe pas côté enfant");
});

test("chaque schéma décrit son activité : type, titre et description", () => {
  for (const [type, schema] of Object.entries(ROUND_TYPES)) {
    assert.equal(typeof schema.label, "string", `${type} a un titre`);
    assert.ok(schema.label.trim(), `${type} a un titre non vide`);
    assert.ok(schema.description.trim(), `${type} a une description`);
    assert.ok(schema.fields.length > 0, `${type} a au moins un champ`);
  }
});

test("blank() produit bien le type annoncé, avec un objet neuf à chaque appel", () => {
  for (const [type, schema] of Object.entries(ROUND_TYPES)) {
    const first = schema.blank();
    const second = schema.blank();
    assert.equal(first.type, type, `blank().type vaut « ${type} »`);
    assert.notEqual(first, second, `${type} : chaque appel renvoie un objet neuf`);
    if (Array.isArray(first.options)) assert.notEqual(first.options[0], second.options[0], `${type} : les listes ne sont pas partagées`);
  }
});

test("les noms de champs sont uniques à chaque niveau", () => {
  for (const [type, schema] of Object.entries(ROUND_TYPES)) {
    const levels = [schema.fields, ...schema.fields.filter(f => f.kind === "object" || f.kind === "list").map(f => f.fields)];
    for (const fields of levels) {
      const keys = keysOf(fields);
      assert.deepEqual([...new Set(keys)], keys, `${type} : deux champs portent le même nom (${keys.join(", ")})`);
    }
  }
});

test("chaque champ de référence (ref / multiref) pointe vers une liste qui existe dans le même schéma", () => {
  for (const [type, schema] of Object.entries(ROUND_TYPES)) {
    const lists = keysOf(schema.fields.filter(field => field.kind === "list"));
    for (const field of allFields(schema.fields, `${type}.`)) {
      if (field.kind !== "ref" && field.kind !== "multiref") continue;
      assert.ok(field.from, `${field.where}${field.key} : la référence dit d'où viennent ses choix`);
      assert.ok(lists.includes(field.from),
        `${field.where}${field.key} : « ${field.from} » doit être une liste du schéma (${lists.join(", ") || "aucune"})`);
    }
  }
});

test("un champ de liste sait fabriquer un élément, et un champ de référence n'est jamais une liste", () => {
  for (const [type, schema] of Object.entries(ROUND_TYPES)) {
    for (const field of allFields(schema.fields, `${type}.`)) {
      if (field.kind === "list") {
        assert.equal(typeof field.blank, "function", `${field.where}${field.key} : une liste fabrique ses propres éléments`);
        assert.ok(field.itemLabel, `${field.where}${field.key} : une liste a un nom d'élément (« ajouter une … »)`);
        assert.ok(keysOf(field.fields).length > 0, `${field.where}${field.key} : une liste décrit son élément`);
      } else if (field.kind === "object") {
        assert.ok(keysOf(field.fields).length > 0, `${field.where}${field.key} : un objet décrit ses champs`);
      } else if (field.kind === "select") {
        assert.ok(field.options.length > 0, `${field.where}${field.key} : un menu déroulant propose des choix`);
        for (const option of field.options) assert.ok(option.value && option.label, `${field.where}${field.key} : un choix sans valeur ou sans libellé`);
      }
    }
  }
});

test("chaque champ a un libellé lisible par l'administrateur", () => {
  for (const [type, schema] of Object.entries(ROUND_TYPES)) {
    for (const field of allFields(schema.fields, `${type}.`)) {
      assert.ok(field.label && field.label.trim(), `${field.where}${field.key || "(champ sans nom)"} : le champ a un libellé`);
    }
  }
});
