// T6 : logique pure des règles de la classe — conversion des créneaux
// (aller-retour éditeur ↔ `windows`), verrouillage selon `schoolRules`,
// contrôles avant envoi et phrases de l'aperçu « Ce que voit l'élève ».
// Lancer : npm test
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

// Aucune dépendance dans rules.ts : transpilation TypeScript puis exécution.
const { outputText } = ts.transpileModule(
  readFileSync(new URL("../app/_scolaire/lib/rules.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
);
const mod = { exports: {} };
new Function("module", "exports", "require", outputText)(mod, mod.exports, require);
const {
  windowsToSlots,
  slotsToWindows,
  validateSlots,
  validateDailyMinutes,
  looseningErrors,
  isRuleLocked,
  windowsWithin,
  studentPreview,
  formatDays,
  formatHour,
  emptySlot,
} = mod.exports;

/* ————————————————— Conversion des créneaux (aller-retour) ————————————————— */

test("windows → éditeur : une case cochée par jour, heures HH:MM", () => {
  const slots = windowsToSlots([{ days: [0, 3, 4], start: "08:00", end: "16:00" }]);
  assert.equal(slots.length, 1);
  assert.deepEqual(slots[0].days, [true, false, false, true, true, false, false]);
  assert.equal(slots[0].start, "08:00");
  assert.equal(slots[0].end, "16:00");
});

test("aller-retour : windows → slots → windows est stable (y compris plusieurs créneaux)", () => {
  const windows = [
    { days: [0, 1, 2, 3, 4], start: "08:00", end: "16:00" },
    { days: [5, 6], start: "09:00", end: "12:30" },
  ];
  assert.deepEqual(slotsToWindows(windowsToSlots(windows)), windows);
});

test("retour éditeur → API : jours numérotés 0 = lundi, créneau sans jour écarté", () => {
  const slots = [
    { days: [true, false, false, false, false, true, false], start: "10:00", end: "11:00" },
    { days: Array(7).fill(false), start: "13:00", end: "14:00" },
  ];
  assert.deepEqual(slotsToWindows(slots), [{ days: [0, 5], start: "10:00", end: "11:00" }]);
});

test("windows vide ou absente : aucun créneau édité", () => {
  assert.deepEqual(windowsToSlots(undefined), []);
  assert.deepEqual(windowsToSlots([]), []);
});

/* ————————————————— Contrôles avant envoi ————————————————— */

test("validateSlots : créneau valide sans erreur", () => {
  const slots = [emptySlot()]; // Lun→Ven, 08:00–12:00
  assert.deepEqual(validateSlots(slots), []);
});

test("validateSlots : début >= fin refuse avec message clair", () => {
  const bad = [{ days: [true, false, false, false, false, false, false], start: "16:00", end: "08:00" }];
  const errors = validateSlots(bad);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Créneau 1/);
  assert.match(errors[0], /début doit être avant l'heure de fin/);
  // égalité refusée aussi
  const equal = [{ days: [true, false, false, false, false, false, false], start: "08:00", end: "08:00" }];
  assert.equal(validateSlots(equal).length, 1);
});

test("validateSlots : au moins un jour", () => {
  const noDays = [{ days: Array(7).fill(false), start: "08:00", end: "12:00" }];
  const errors = validateSlots(noDays);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /au moins un jour/);
});

test("validateDailyMinutes : 5 à 600, sinon message ; absent = pas de restriction", () => {
  assert.deepEqual(validateDailyMinutes(undefined), []);
  assert.deepEqual(validateDailyMinutes(5), []);
  assert.deepEqual(validateDailyMinutes(600), []);
  assert.equal(validateDailyMinutes(4).length, 1);
  assert.equal(validateDailyMinutes(601).length, 1);
  assert.equal(validateDailyMinutes("30").length, 1);
});

/* ————————————————— Verrouillage selon schoolRules ————————————————— */

test("isRuleLocked : false côté école = verrouillé pour la classe", () => {
  assert.equal(isRuleLocked("palou", { palou: false }), true);
  assert.equal(isRuleLocked("palou", { palou: true }), false);
  assert.equal(isRuleLocked("games", {}), false);
});

test("looseningErrors : la classe n'assouplit pas l'école (booléen, minutes, fenêtres)", () => {
  const school = {
    palou: false,
    daily_limit_minutes: 30,
    windows: [{ days: [0, 1, 2, 3, 4], start: "08:00", end: "16:00" }],
  };
  // Règles conformes : aucune erreur
  assert.deepEqual(
    looseningErrors(school, { palou: false, games: true, daily_limit_minutes: 20, windows: [{ days: [0], start: "09:00", end: "12:00" }] }),
    [],
  );
  // Palou réactivé
  const palou = looseningErrors(school, { palou: true });
  assert.equal(palou.length, 1);
  assert.match(palou[0], /Palou/);
  // Minutes au-dessus du plafond
  const minutes = looseningErrors(school, { daily_limit_minutes: 45 });
  assert.equal(minutes.length, 1);
  // Créneau hors des fenêtres de l'école
  const windows = looseningErrors(school, { windows: [{ days: [6], start: "09:00", end: "12:00" }] });
  assert.equal(windows.length, 1);
  assert.match(windows[0], /fenêtres|créneaux/i);
});

test("windowsWithin : jour par jour, union des intervalles", () => {
  const school = [{ days: [0, 1, 2, 3, 4], start: "08:00", end: "16:00" }];
  assert.equal(windowsWithin([{ days: [0], start: "08:00", end: "16:00" }], school), true);
  assert.equal(windowsWithin([{ days: [0], start: "07:00", end: "16:00" }], school), false);
  assert.equal(windowsWithin([{ days: [5], start: "09:00", end: "10:00" }], school), false);
  // Deux petits créneaux de la classe dans le grand de l'école
  assert.equal(
    windowsWithin(
      [{ days: [0], start: "08:00", end: "10:00" }, { days: [0], start: "14:00", end: "16:00" }],
      school,
    ),
    true,
  );
});

/* ————————————————— Phrases de l'aperçu ————————————————— */

test("aperçu : rien n'est restreint → « Tout est ouvert »", () => {
  assert.deepEqual(studentPreview({}, {}), ["Tout est ouvert."]);
});

test("aperçu : un booléen coupé donne « coupé par l'école » / « coupé par ton enseignant »", () => {
  const ecole = studentPreview({ palou: false }, {});
  assert.deepEqual(ecole, ["Palou : coupé par l'école."]);
  const classe = studentPreview({}, { games: false });
  assert.deepEqual(classe, ["Les jeux et défis : coupé par ton enseignant."]);
  // Le plus strict gagne : coupé par l'école avant la classe
  const both = studentPreview({ scratch: false }, { scratch: false });
  assert.deepEqual(both, ["Le Studio Scratch : coupé par l'école."]);
});

test("aperçu : horaires lisibles et temps par jour", () => {
  const lines = studentPreview(
    { windows: [{ days: [0, 1, 2, 3, 4], start: "08:00", end: "16:00" }], daily_limit_minutes: 25 },
    {},
  );
  assert.deepEqual(lines, ["Temps par jour : 25 minutes.", "Horaires : lundi à vendredi, de 8 h à 16 h."]);
});

test("aperçu : le plus strict des deux niveaux est retenu", () => {
  const lines = studentPreview({ daily_limit_minutes: 40, windows: [{ days: [0, 6], start: "08:00", end: "18:00" }] },
    { daily_limit_minutes: 25, windows: [{ days: [0], start: "09:00", end: "12:00" }] });
  assert.deepEqual(lines, ["Temps par jour : 25 minutes.", "Horaires : lundi, de 9 h à 12 h."]);
});

test("aperçu : plusieurs créneaux séparés par « ; »", () => {
  const lines = studentPreview(
    { windows: [
      { days: [0, 1, 2, 3, 4], start: "08:00", end: "12:00" },
      { days: [5], start: "09:00", end: "11:00" },
    ] },
    {},
  );
  assert.deepEqual(lines, ["Horaires : lundi à vendredi, de 8 h à 12 h ; samedi, de 9 h à 11 h."]);
});

/* ————————————————— Mise en forme ————————————————— */

test("formatDays : plages consécutives, listes et tous les jours", () => {
  assert.equal(formatDays([0, 1, 2, 3, 4]), "lundi à vendredi");
  assert.equal(formatDays([5, 6]), "samedi et dimanche");
  assert.equal(formatDays([0, 2, 4]), "lundi, mercredi et vendredi");
  assert.equal(formatDays([0, 1, 2, 3, 4, 5, 6]), "tous les jours");
  assert.equal(formatDays([3]), "jeudi");
  assert.equal(formatDays([]), "");
});

test("formatHour : sans zéro inutile, minutes conservées", () => {
  assert.equal(formatHour("08:00"), "8 h");
  assert.equal(formatHour("16:00"), "16 h");
  assert.equal(formatHour("16:30"), "16 h 30");
  assert.equal(formatHour("00:00"), "0 h");
});
