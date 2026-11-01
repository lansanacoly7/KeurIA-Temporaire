// T10 : logique pure de la vie de la classe - séance (temps restant, contrôles
// avant envoi), annonces et sondages (contrôles miroir du serveur, pourcentages,
// état), parcours d'un élève (choix du sélecteur).
// Lancer : npm test
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

// Aucune dépendance dans classeVivante.ts (seulement un import de type, effacé) :
// transpilation TypeScript puis exécution.
const { outputText } = ts.transpileModule(
  readFileSync(new URL("../app/_scolaire/lib/classeVivante.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
);
const mod = { exports: {} };
new Function("module", "exports", "require", outputText)(mod, mod.exports, require);
const {
  formatRemaining,
  validateSessionDraft,
  validateAnnouncementDraft,
  fieldError,
  pollPercentages,
  announcementState,
  endsAtLabel,
  trackChoices,
  currentTrackChoice,
} = mod.exports;

/* ───────────────────────── Temps restant d'une séance ───────────────────── */

test("temps restant : MM:SS sous une heure", () => {
  assert.equal(formatRemaining(0), "00:00");
  assert.equal(formatRemaining(59), "00:59");
  assert.equal(formatRemaining(65), "01:05");
  assert.equal(formatRemaining(599), "09:59");
  assert.equal(formatRemaining(600), "10:00");
});

test("temps restant : H:MM:SS à partir d'une heure", () => {
  assert.equal(formatRemaining(3600), "1:00:00");
  assert.equal(formatRemaining(3661), "1:01:01");
  assert.equal(formatRemaining(4530), "1:15:30");
});

test("temps restant : jamais négatif, NaN affiché 00:00", () => {
  assert.equal(formatRemaining(-30), "00:00");
  assert.equal(formatRemaining(Number.NaN), "00:00");
});

/* ───────────────────────── Contrôles d'une séance ───────────────────────── */

test("séance valide : aucun contrôle", () => {
  assert.deepEqual(validateSessionDraft({ title: "Lecture suivie", minutes: 30 }), []);
  assert.deepEqual(validateSessionDraft({ title: "Maths", lessonId: "nombres-99", minutes: 5 }), []);
  assert.deepEqual(validateSessionDraft({ title: "M", minutes: 120 }), []);   // bornes acceptées
});

test("séance : titre obligatoire, 80 caractères au plus", () => {
  const vide = validateSessionDraft({ title: "   ", minutes: 30 });
  assert.deepEqual(vide, [{ field: "title", message: "Le titre de la séance est obligatoire." }]);

  const tropLong = validateSessionDraft({ title: "x".repeat(81), minutes: 30 });
  assert.equal(tropLong.length, 1);
  assert.equal(tropLong[0].field, "title");
  assert.equal(tropLong[0].message, "Le titre de la séance : 80 caractères au plus.");

  assert.deepEqual(validateSessionDraft({ title: "x".repeat(80), minutes: 30 }), []);
});

test("séance : durée entière entre 5 et 120 minutes", () => {
  for (const minutes of [4, 121, 0, -10, 30.5, Number.NaN, "30"]) {
    const errors = validateSessionDraft({ title: "Maths", minutes });
    assert.equal(errors.length, 1, `durée ${minutes} doit être refusée`);
    assert.equal(errors[0].field, "minutes");
    assert.equal(errors[0].message, "La durée doit être comprise entre 5 et 120 minutes.");
  }
});

test("séance : plusieurs contrôles faits en même temps", () => {
  const errors = validateSessionDraft({ title: "", minutes: 0 });
  assert.deepEqual(errors.map(error => error.field), ["title", "minutes"]);
  assert.equal(fieldError(errors, "minutes"), "La durée doit être comprise entre 5 et 120 minutes.");
  assert.equal(fieldError(errors, "lessonId"), undefined);
});

/* ─────────────────── Contrôles d'une annonce ou d'un sondage ────────────── */

test("annonce valide : ni mot ni sondage n'ont de contrôle", () => {
  assert.deepEqual(validateAnnouncementDraft({ kind: "text", title: "", text: "Bravo à toute la classe !", options: [], endsInDays: 7 }), []);
  assert.deepEqual(
    validateAnnouncementDraft({ kind: "poll", title: "Sortie", text: "On vient vendredi ?", options: ["Oui", "Peut-être", "Non"], endsInDays: 3 }),
    [],
  );
});

test("annonce : le texte (ou la question) est obligatoire", () => {
  const mot = validateAnnouncementDraft({ kind: "text", title: "", text: "  ", options: [], endsInDays: 7 });
  assert.deepEqual(mot, [{ field: "text", message: "Le texte est obligatoire." }]);

  const sondage = validateAnnouncementDraft({ kind: "poll", title: "", text: "", options: ["Oui", "Non"], endsInDays: 7 });
  assert.deepEqual(sondage, [{ field: "text", message: "La question est obligatoire." }]);
});

test("annonce : 300 caractères au plus, titre 80 au plus", () => {
  const tropLong = validateAnnouncementDraft({ kind: "poll", title: "", text: "x".repeat(301), options: ["a", "b"], endsInDays: 7 });
  assert.deepEqual(tropLong, [{ field: "text", message: "La question : 300 caractères au plus." }]);

  const titre = validateAnnouncementDraft({ kind: "text", title: "x".repeat(81), text: "Salut", options: [], endsInDays: 7 });
  assert.deepEqual(titre, [{ field: "title", message: "Le titre : 80 caractères au plus." }]);
});

test("sondage : de 2 à 5 réponses", () => {
  const une = validateAnnouncementDraft({ kind: "poll", title: "", text: "?", options: ["Oui"], endsInDays: 7 });
  assert.deepEqual(une, [{ field: "options", message: "Un sondage propose de 2 à 5 réponses." }]);

  const six = validateAnnouncementDraft({ kind: "poll", title: "", text: "?", options: ["a", "b", "c", "d", "e", "f"], endsInDays: 7 });
  assert.equal(six[0].field, "options");
  assert.deepEqual(validateAnnouncementDraft({ kind: "poll", title: "", text: "?", options: ["a", "b", "c", "d", "e"], endsInDays: 7 }), []);
});

test("sondage : chaque réponse obligatoire, 60 caractères, différente des autres", () => {
  const attendu = "Chaque réponse est obligatoire (60 caractères au plus) et différente des autres.";
  const cas = [
    ["Oui", ""],                                        // vide
    ["Oui", "x".repeat(61)],                            // trop longue
    ["Oui", "oui"],                                     // doublon insensible à la casse
    ["Oui", " Oui "],                                   // doublon même après espaces
  ];
  for (const options of cas) {
    const errors = validateAnnouncementDraft({ kind: "poll", title: "", text: "?", options, endsInDays: 7 });
    assert.deepEqual(errors, [{ field: "options", message: attendu }], `options ${JSON.stringify(options)} refusées`);
  }
});

test("annonce : affichage de 1 à 30 jours", () => {
  for (const endsInDays of [0, 31, -1, 2.5]) {
    const errors = validateAnnouncementDraft({ kind: "text", title: "", text: "Salut", options: [], endsInDays });
    assert.equal(errors.length, 1, `durée ${endsInDays} doit être refusée`);
    assert.equal(errors[0].field, "days");
    assert.equal(errors[0].message, "La durée de l'annonce doit être comprise entre 1 et 30 jours.");
  }
  assert.deepEqual(validateAnnouncementDraft({ kind: "text", title: "", text: "Salut", options: [], endsInDays: 1 }), []);
  assert.deepEqual(validateAnnouncementDraft({ kind: "text", title: "", text: "Salut", options: [], endsInDays: 30 }), []);
});

test("annonce : au plus 3 annonces actives par classe", () => {
  const base = { kind: "text", title: "", text: "Salut", options: [], endsInDays: 7 };
  assert.deepEqual(validateAnnouncementDraft({ ...base, activeCount: 2 }), []);
  const plein = validateAnnouncementDraft({ ...base, activeCount: 3 });
  assert.deepEqual(plein, [{ field: "active", message: "Au plus 3 annonces actives par classe : fermez-en une d'abord." }]);
  // Sans information sur les actives (détails), le serveur tranche : aucun blocage local.
  assert.deepEqual(validateAnnouncementDraft(base), []);
});

/* ────────────────────────── Résultats d'un sondage ──────────────────────── */

test("pourcentages : parts entières par option", () => {
  assert.deepEqual(pollPercentages([3, 1]), [75, 25]);
  assert.deepEqual(pollPercentages([1, 1, 2]), [25, 25, 50]);
  assert.deepEqual(pollPercentages([1, 2]), [33, 67]);       // arrondi 33,3 + 66,7
  assert.deepEqual(pollPercentages([1, 1, 1]), [33, 33, 33]);
});

test("pourcentages : aucun vote → 0 %, tableau vide préservé", () => {
  assert.deepEqual(pollPercentages([0, 0]), [0, 0]);
  assert.deepEqual(pollPercentages([]), []);
});

/* ───────────────────────────── État d'une annonce ───────────────────────── */

test("état : active pour les élèves, clos par l'enseignant, expirée", () => {
  const now = Date.parse("2026-10-15T12:00:00Z");
  assert.equal(announcementState({ closed: false, endsAt: "2026-10-16T12:00:00Z" }, now), "active");
  assert.equal(announcementState({ closed: true, endsAt: "2026-10-16T12:00:00Z" }, now), "clos");
  assert.equal(announcementState({ closed: false, endsAt: "2026-10-15T11:59:59Z" }, now), "expirée");
  assert.equal(announcementState({ closed: true, endsAt: "2026-10-01T00:00:00Z" }, now), "clos");
  assert.equal(announcementState({ closed: false, endsAt: "pas une date" }, now), "expirée");
});

test("date de fin lisible ou vide si illisible", () => {
  const label = endsAtLabel("2026-10-22T18:00:00Z");
  assert.ok(label.includes("2026"), `label ${label} contient l'année`);
  assert.ok(label.includes("oct"), `label ${label} contient le mois`);
  assert.equal(endsAtLabel(""), "");
  assert.equal(endsAtLabel("n'importe quoi"), "");
});

/* ──────────────────────── Parcours d'un élève ───────────────────────────── */

test("parcours : 4 options, la première = défaut du niveau de la classe", () => {
  const choices = trackChoices("7-9");
  assert.deepEqual(choices.map(choice => choice.value), ["", "7-9", "10-12", "13-15"]);
  assert.ok(choices[0].label.includes("7-9 ans"), "le défaut nomme le parcours du niveau");
  assert.ok(choices[3].label.includes("13-15 ans"));
});

test("parcours : exception de l'élève ou parcours par défaut", () => {
  assert.equal(currentTrackChoice(null), "");
  assert.equal(currentTrackChoice(undefined), "");
  assert.equal(currentTrackChoice("10-12"), "10-12");
});
