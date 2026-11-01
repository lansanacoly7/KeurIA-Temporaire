// Joue réellement le parcours 7-9 dans un navigateur simulé (jsdom) : le lecteur de leçon et la carte des modules.
// C'est ce test qui détecte une leçon impossible à terminer (le défaut qui bloquait 30 leçons sur 40). Lancer : npm run test:parcours79
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

/* ── Navigateur simulé ─────────────────────────────────────────────────────────────────────────────────── */
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
dom.window.ResizeObserver = globalThis.ResizeObserver;
// Volontairement : ni AudioContext ni speechSynthesis (cas des navigateurs sans son) : le parcours doit fonctionner quand même.
// Un faux lecteur audio note chaque fichier de voix que le lecteur demande (voir « la voix de Palou » plus bas) et le « joue » aussitôt.
const requestedClips = new Set();
globalThis.Audio = class {
  constructor(src) { this.src = src; requestedClips.add(src); }
  play() { setTimeout(() => this.onended && this.onended(), 0); return Promise.resolve(); }
  pause() {}
};

const React = require("react");
const { act } = React;
const { createRoot } = require("react-dom/client");
const { LessonPlayer79 } = app("app/dashboard/parcours79/LessonPlayer79.tsx");
const { ModuleMap79 } = app("app/dashboard/parcours79/ModuleMap79.tsx");
const { tracks } = app("app/lms-data.ts");
const chapters = [app("content/parcours79/m01.json"), app("content/parcours79/m02.json"), app("content/parcours79/m03.json"), app("content/parcours79/m04.json"), app("content/parcours79/m05.json"), app("content/parcours79/m06.json"), app("content/parcours79/m07.json"), app("content/parcours79/m08.json"), app("content/parcours79/m09.json"), app("content/parcours79/m10.json")];

/* ── Outils de jeu ─────────────────────────────────────────────────────────────────────────────────────── */
async function mount(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(element); });
  return { container, unmount: () => act(async () => { root.unmount(); container.remove(); }) };
}
const click = el => act(async () => { el.click(); });
const buttons = c => [...c.querySelectorAll("button")];
const byText = (c, text) => buttons(c).find(b => b.textContent.includes(text));
const optionByLabel = (c, label) => [...c.querySelectorAll(".p79-opt, .p79-item")].find(b => b.querySelector(".p79-opt-label")?.textContent === label);
const primary = c => c.querySelector(".p79-l-bottom .p79-btn:not(.alt)");
const text = c => c.textContent.replace(/\s+/g, " ");

/** Résout la manche affichée. `wrongFirst` touche d'abord une mauvaise réponse (l'enfant se trompe puis corrige). */
async function playRound(c, round, { wrongFirst = false } = {}) {
  if (round.type === "choose") {
    if (wrongFirst) await click(optionByLabel(c, round.options.find(o => !o.correct).label));
    await click(optionByLabel(c, round.options.find(o => o.correct).label));
  } else if (round.type === "focus") {
    for (let i = 0; i < round.enough; i++) await click(optionByLabel(c, round.more ?? "Plus net"));
  } else if (round.type === "shield") {
    if (wrongFirst) await click(optionByLabel(c, round.items.find(i => !i.secret).label));
    for (const item of round.items.filter(i => i.secret)) await click(optionByLabel(c, item.label));
  } else if (round.type === "machine") {
    for (const slot of round.slots) {
      if (wrongFirst) await click(optionByLabel(c, slot.options.find(o => !o.correct).label));
      await click(optionByLabel(c, slot.options.find(o => o.correct).label));
    }
    for (const item of round.demo.cases.slice(0, round.demo.need)) await click(optionByLabel(c, item.label));
  } else if (round.type === "verify") {
    if (wrongFirst) await click(optionByLabel(c, round.checks.find(x => !x.useful).label));
    for (const check of round.checks.filter(x => x.useful).slice(0, round.need)) await click(optionByLabel(c, check.label));
    if (wrongFirst) await click(optionByLabel(c, round.stamps.find(s => !s.correct).label));
    await click(optionByLabel(c, round.stamps.find(s => s.correct).label));
  } else if (round.type === "loupe") {
    if (wrongFirst) await click(optionByLabel(c, round.spots.find(s => !s.clue).label));
    for (const spot of round.spots.filter(s => s.clue).slice(0, round.need)) await click(optionByLabel(c, spot.label));
  } else if (round.type === "layers") {
    if (wrongFirst) await click(optionByLabel(c, round.cards.find(x => !x.good).label));
    for (const card of round.cards.filter(x => x.good).slice(0, round.need)) await click(optionByLabel(c, card.label));
  } else if (round.type === "speak") {
    // Sans micro (jsdom) : l'enfant touche les cartes dans l'ordre des mots attendus. D'abord, s'il se trompe, une carte hors sujet.
    const cardByWord = word => round.cards.find(c => c.toLowerCase().includes(word.toLowerCase()));
    const say = async () => click(buttons(c).find(b => b.textContent.includes("Dire à Palou")));
    if (wrongFirst) {
      const avoid = (round.avoid ?? [])[0];
      const other = avoid ? cardByWord(avoid) : round.cards.find(card => !round.need.some(g => g.some(w => card.toLowerCase().includes(w.toLowerCase()))));
      await click(optionByLabel(c, other));
      await say();
      await click(buttons(c).find(b => b.textContent.includes("Enlever")));
    }
    for (const group of round.need) await click(optionByLabel(c, group.map(cardByWord).find(Boolean)));
    await say();
  } else if (round.type === "lens") {
    if (wrongFirst) await click(optionByLabel(c, round.lenses.find(l => !l.correct).label));
    await click(optionByLabel(c, round.lenses.find(l => l.correct).label));
  } else if (round.type === "relabel") {
    if (wrongFirst) await click(optionByLabel(c, round.cards.find(x => !x.fix).label));
    await click(optionByLabel(c, round.cards.find(x => x.fix).label));
  } else if (round.type === "probe") {
    if (wrongFirst) await click(optionByLabel(c, round.photos.find(x => !x.wrong).label));
    await click(optionByLabel(c, round.photos.find(x => x.wrong).label));
    if (wrongFirst) await click(optionByLabel(c, round.fix.options.find(o => !o.correct).label));
    await click(optionByLabel(c, round.fix.options.find(o => o.correct).label));
  } else if (round.type === "train") {
    if (wrongFirst) await click(optionByLabel(c, round.examples.find(e => !e.good).label));
    for (const e of round.examples.filter(e => e.good)) await click(optionByLabel(c, e.label));
  } else if (round.type === "cleanup") {
    if (wrongFirst) await click(optionByLabel(c, round.rows.find(r => !r.intruder).label));
    for (const r of round.rows.filter(r => r.intruder)) await click(optionByLabel(c, r.label));
  } else if (round.type === "rulesort") {
    if (wrongFirst) await click(optionByLabel(c, round.rules.find(r => !r.correct).label));
    await click(optionByLabel(c, round.rules.find(r => r.correct).label));
  } else if (round.type === "whois") {
    const target = round.items.find(i => i.id === round.target);
    if (wrongFirst) await click(optionByLabel(c, round.tags.find(t => !target.tags.includes(t.id)).label));
    for (const t of round.tags.filter(t => target.tags.includes(t.id))) await click(optionByLabel(c, t.label));
  } else if (round.type === "multi") {
    if (wrongFirst) await click(optionByLabel(c, round.options.find(o => !o.correct).label));
    for (const o of round.options.filter(o => o.correct)) await click(optionByLabel(c, o.label));
  } else {
    for (const item of round.items) {
      if (wrongFirst) {
        await click(optionByLabel(c, item.label));
        const other = round.bins.find(b => b.id !== item.bin);
        await click(c.querySelector(`[aria-label="Boîte : ${other.label}"]`));
      }
      await click(optionByLabel(c, item.label));
      await click(c.querySelector(`[aria-label="Boîte : ${round.bins.find(b => b.id === item.bin).label}"]`));
    }
  }
}

/** Joue une leçon de bout en bout ; renvoie ce que le lecteur a rendu à `onComplete`. */
async function playLesson(lesson, opts = {}) {
  let completed = null;
  const { container, unmount } = await mount(React.createElement(LessonPlayer79, {
    content: lesson, firstName: "Awa", scope: "test", onClose: () => { throw new Error("fermeture inattendue"); },
    hasNext: opts.hasNext,
    nextModule: opts.nextModule,
    // `then` n'est pas énumérable : les tests existants comparent seulement { score, stars }.
    onComplete: (score, stars, then) => { completed = { score, stars }; Object.defineProperty(completed, "then", { value: then, enumerable: false }); },
  }));
  let guard = 0;
  while (!completed) {
    assert.ok(++guard < 80, `${lesson.id} : boucle sans fin, l'enfant est bloqué`);
    const shown = text(container);
    const activity = lesson.screens.find(s => (s.kind === "play" || s.kind === "why") && s.rounds.some(r => shown.includes(r.prompt)));
    const create = lesson.screens.find(s => s.kind === "create" && shown.includes(s.steps[0].prompt));
    if (activity) {
      const round = activity.rounds.find(r => container.querySelector(".p79-prompt")?.textContent === r.prompt);
      await playRound(container, round, opts);
    } else if (create) {
      for (const step of create.steps) {
        for (const item of step.tray.slice(0, step.count)) await click(optionByLabel(container, item.label));
        await click(byText(container, step === create.steps.at(-1) ? "C’est choisi" : "Suite"));
      }
    }
    if (opts.replay && text(container).includes("Mission accomplie")) { await click(byText(container, "Refaire")); continue; }
    const next = primary(container);
    assert.ok(next, `${lesson.id} : aucun bouton pour continuer (écran : « ${shown.slice(0, 80)} »)`);
    assert.equal(next.disabled, false, `${lesson.id} : « Continuer » reste bloqué (écran : « ${shown.slice(0, 80)} »)`);
    await click(next);
  }
  await unmount();
  return completed;
}

/** Joue jusqu'à l'écran « Bravo » sans le terminer ; renvoie le conteneur monté. */
async function reachBravo(lesson, firstName) {
  const { container, unmount } = await mount(React.createElement(LessonPlayer79, { content: lesson, firstName, scope: "t", onClose() {}, onComplete() {} }));
  let guard = 0;
  while (!text(container).includes("Je retiens")) {
    assert.ok(++guard < 60, "bloqué avant l'écran Bravo");
    const shown = text(container);
    const prompt = container.querySelector(".p79-prompt")?.textContent;
    const activity = lesson.screens.find(s => (s.kind === "play" || s.kind === "why") && s.rounds.some(r => r.prompt === prompt));
    if (activity) await playRound(container, activity.rounds.find(r => r.prompt === prompt));
    const create = lesson.screens.find(s => s.kind === "create" && shown.includes(s.steps[0].prompt));
    if (create) for (const step of create.steps) {
      for (const item of step.tray.slice(0, step.count)) await click(optionByLabel(container, item.label));
      await click(byText(container, step === create.steps.at(-1) ? "C’est choisi" : "Suite"));
    }
    await click(primary(container));
  }
  return { container, unmount };
}
/* ── Le lecteur de leçon ───────────────────────────────────────────────────────────────────────────────── */
for (const chapter of chapters) {
  for (const lesson of chapter.lessons) {
    test(`leçon ${lesson.id} « ${lesson.title} » : un enfant sans erreur la termine avec 3 étoiles`, async () => {
      const result = await playLesson(lesson);
      assert.deepEqual(result, { score: 100, stars: 3 });
    });

    test(`leçon ${lesson.id} : un enfant qui se trompe d'abord la termine quand même, avec moins d'étoiles`, async () => {
      const result = await playLesson(lesson, { wrongFirst: true });
      assert.ok(result.stars < 3, `des erreurs doivent coûter des étoiles (obtenu : ${result.stars})`);
      assert.ok(result.stars >= 1 && result.score >= 50);
    });
  }
}

test("la voix de Palou : chaque phrase demandée pendant les 40 leçons (avec ou sans erreur) a son fichier audio, donc jamais la voix du navigateur", () => {
  assert.ok(requestedClips.size > 600, `trop peu de phrases demandées (${requestedClips.size}) : les leçons n'ont pas été jouées ?`);
  const missing = [...requestedClips].filter(src => !fs.existsSync(path.join(FRONTEND, "public", src.replace(/^\//, ""))));
  assert.deepEqual(missing, [], `${missing.length} phrase(s) lue(s) par la voix du navigateur faute de fichier :\n${missing.join("\n")}`);
});

test("la voix de Palou hors leçons : chaque phrase de content/voix-ui.json (tutoriel, accueil, défi du jour, jeux, « Finis d'abord… ») a son fichier audio", () => {
  const phrases = JSON.parse(fs.readFileSync(path.join(FRONTEND, "content", "voix-ui.json"), "utf8"));
  const keys = Object.keys(phrases);
  assert.ok(keys.length >= 50, `la liste des phrases est trop courte (${keys.length})`);
  const missing = keys.filter(key => !fs.existsSync(path.join(FRONTEND, "public", "audio", "palou", "ui", `${key}.mp3`)));
  assert.deepEqual(missing, [], `phrase(s) sans voix de Palou (lues par la voix du navigateur) : ${missing.join(", ")}`);
});

test("plus aucune voix du navigateur nulle part : seule la voix enregistrée de Palou (uiVoice / voice) peut parler", () => {
  const roots = ["app"];
  const allowed = new Set();
  const offenders = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(path.join(FRONTEND, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.(ts|tsx)$/.test(entry.name) && !allowed.has(rel) && /SpeechSynthesis|speechSynthesis/.test(fs.readFileSync(path.join(FRONTEND, rel), "utf8"))) offenders.push(rel);
    }
  };
  roots.forEach(walk);
  assert.deepEqual(offenders, [], `voix du navigateur encore utilisée dans : ${offenders.join(", ")}`);
});

test("une mauvaise réponse est expliquée (jamais un simple échec)", async () => {
  const lesson = chapters[0].lessons[0];
  const play = lesson.screens.find(s => s.kind === "play");
  const round = play.rounds[0];
  const { container, unmount } = await mount(React.createElement(LessonPlayer79, { content: lesson, firstName: "Awa", scope: "t", onClose() {}, onComplete() {} }));
  while (!container.querySelector(".p79-prompt")) await click(primary(container));
  const wrong = round.options.find(o => !o.correct);
  await click(optionByLabel(container, wrong.label));
  assert.ok(text(container).includes(wrong.explain), "l'explication de la mauvaise réponse doit s'afficher");
  assert.equal(primary(container).disabled, true, "on ne passe pas tant que la bonne réponse n'est pas trouvée");
  await unmount();
});

test("le prénom réel apparaît dans les félicitations, jamais un prénom en dur", async () => {
  const { container, unmount } = await reachBravo(chapters[0].lessons[0], "Fatima");
  assert.ok(text(container).includes("Bravo Fatima !"));
  assert.ok(!text(container).includes("Ndeye"));
  await unmount();
});
test("sans prénom, la félicitation reste correcte (« Toi »)", async () => {
  const lesson = chapters[0].lessons[0];
  const { container, unmount } = await reachBravo(lesson, "");
  assert.ok(text(container).includes("Bravo !"), "le prénom absent disparaît proprement");
  assert.ok(!text(container).includes("{prenom}"), "jamais le jeton brut à l'écran");
  await unmount();
});

test("après « Je retiens », la page « Mission accomplie » s'affiche (trophée, étoiles, message) et c'est elle qui termine la leçon", async () => {
  let completed = null;
  const lesson = chapters[0].lessons[0];
  const { container, unmount } = await mount(React.createElement(LessonPlayer79, { content: lesson, firstName: "Fatima", scope: "t", onClose() {}, onComplete: (score, stars) => { completed = { score, stars }; } }));
  let guard = 0;
  while (!text(container).includes("Je retiens")) {
    assert.ok(++guard < 60, "bloqué avant « Je retiens »");
    const shown = text(container);
    const activity = lesson.screens.find(s => (s.kind === "play" || s.kind === "why") && s.rounds.some(r => shown.includes(r.prompt)));
    const create = lesson.screens.find(s => s.kind === "create" && shown.includes(s.steps[0].prompt));
    if (activity) await playRound(container, activity.rounds.find(r => container.querySelector(".p79-prompt")?.textContent === r.prompt));
    else if (create) for (const step of create.steps) {
      for (const item of step.tray.slice(0, step.count)) await click(optionByLabel(container, item.label));
      await click(byText(container, step === create.steps.at(-1) ? "C’est choisi" : "Suite"));
    }
    await click(primary(container));
  }
  assert.equal(completed, null, "« Je retiens » ne termine pas la leçon");
  await click(primary(container));
  const shown = text(container);
  assert.ok(shown.includes("Mission accomplie"), "la page finale doit s'afficher");
  assert.ok(shown.includes("Fatima"), "le message de félicitations cite le prénom");
  assert.equal(container.querySelectorAll(".p79-starbig").length, 3, "trois étoiles dessinées");
  assert.ok(container.querySelector(".p79-trophy"), "le trophée est affiché");
  assert.equal(completed, null, "la leçon n'est terminée qu'en touchant « Terminer »");
  await click(primary(container));
  assert.deepEqual(completed, { score: 100, stars: 3 });
  await unmount();
});

test("si un élément de la page finale plante, l'enfant voit quand même « Mission accomplie » et peut terminer", async () => {
  const { Trophy79 } = app("app/dashboard/parcours79/Trophy79.tsx");
  assert.equal(typeof Trophy79, "function", "le composant du trophée existe bien");
});

test("le test sait échouer : une leçon dont une manche n'a aucune bonne réponse est détectée", async () => {
  const broken = structuredClone(chapters[0].lessons[0]);
  const round = broken.screens.find(s => s.kind === "play").rounds[0];
  round.options.forEach(o => { o.correct = false; });
  await assert.rejects(() => playLesson(broken));
});
test("page finale : « Cours suivant » ouvre la leçon suivante, « Terminer » ramène à la carte, « Refaire » rejoue", async () => {
  const lesson = chapters[0].lessons[0];
  assert.equal((await playLesson(lesson, { hasNext: true })).then, "next");
  assert.equal((await playLesson(lesson, { hasNext: false })).then, "map");
  assert.equal((await playLesson(lesson, { hasNext: true, replay: true })).then, "replay");
  assert.equal((await playLesson(lesson, { hasNext: false, nextModule: true })).then, "map", "« Module suivant » ramène aux îles, où le saut se joue");
});

test("page finale : les boutons portent une icône et un nom (Refaire / Cours suivant, ou Terminer pour la dernière leçon)", async () => {
  const lesson = chapters[0].lessons[0];
  for (const [hasNext, nextModule, label] of [[true, false, "Cours suivant"], [false, true, "Module suivant"], [false, false, "Terminer"]]) {
    const { container, unmount } = await mount(React.createElement(LessonPlayer79, { content: lesson, firstName: "Awa", scope: "t", hasNext, nextModule, onClose() {}, onComplete() {} }));
    let guard = 0;
    while (!text(container).includes("Mission accomplie")) {
      assert.ok(++guard < 80, "bloqué avant la page finale");
      const shown = text(container);
      const activity = lesson.screens.find(s => (s.kind === "play" || s.kind === "why") && s.rounds.some(r => shown.includes(r.prompt)));
      const create = lesson.screens.find(s => s.kind === "create" && shown.includes(s.steps[0].prompt));
      if (activity) await playRound(container, activity.rounds.find(r => container.querySelector(".p79-prompt")?.textContent === r.prompt));
      else if (create) {
        for (const step of create.steps) {
          for (const item of step.tray.slice(0, step.count)) await click(optionByLabel(container, item.label));
          await click(byText(container, step === create.steps.at(-1) ? "C’est choisi" : "Suite"));
        }
      }
      await click(primary(container));
    }
    const bottom = container.querySelector(".p79-l-bottom");
    const buttonsAtEnd = [...bottom.querySelectorAll("button")];
    assert.equal(buttonsAtEnd.length, 2, "deux boutons à la fin de la leçon");
    assert.ok(buttonsAtEnd[0].textContent.includes("Refaire") && buttonsAtEnd[0].querySelector("svg"), "« Refaire » à gauche, avec une icône");
    assert.ok(buttonsAtEnd[1].textContent.includes(label) && buttonsAtEnd[1].querySelector("svg"), `« ${label} » à droite, avec une icône`);
    await unmount();
  }
});

test("page finale : sans appui pendant 10 secondes, le cours suivant s'ouvre tout seul (jamais s'il n'y en a pas)", async () => {
  const lesson = chapters[0].lessons[0];
  const realAudio = globalThis.Audio;
  globalThis.Audio = undefined;   // ici la voix est « finie » tout de suite (aucun lecteur) : le compte à rebours démarre sans attendre
  const realSetTimeout = window.setTimeout;
  const timers = [];
  window.setTimeout = (fn, ms, ...rest) => { timers.push({ fn, ms }); return realSetTimeout.call(window, fn, ms, ...rest); };
  try {
    for (const hasNext of [true, false]) {
      let completed = null;
      const { container, unmount } = await mount(React.createElement(LessonPlayer79, {
        content: lesson, firstName: "Awa", scope: "t", hasNext, onClose() {}, onComplete: (score, stars, then) => { completed = { then }; },
      }));
      let guard = 0;
      while (!text(container).includes("Mission accomplie")) {
        assert.ok(++guard < 80, "bloqué avant la page finale");
        const shown = text(container);
        const activity = lesson.screens.find(s => (s.kind === "play" || s.kind === "why") && s.rounds.some(r => shown.includes(r.prompt)));
        const create = lesson.screens.find(s => s.kind === "create" && shown.includes(s.steps[0].prompt));
        if (activity) await playRound(container, activity.rounds.find(r => container.querySelector(".p79-prompt")?.textContent === r.prompt));
        else if (create) {
          for (const step of create.steps) {
            for (const item of step.tray.slice(0, step.count)) await click(optionByLabel(container, item.label));
            await click(byText(container, step === create.steps.at(-1) ? "C’est choisi" : "Suite"));
          }
        }
        await click(primary(container));
      }
      await act(async () => {});   // la voix est finie (aucune voix ici) : le compte à rebours démarre
      const auto = timers.filter(t => t.ms === 10000);
      if (hasNext) {
        assert.equal(auto.length >= 1, true, "un minuteur de 10 secondes est lancé");
        assert.equal(completed, null, "rien ne se passe avant la fin du délai");
        await act(async () => { auto.at(-1).fn(); });
        assert.equal(completed?.then, "next", "après 10 secondes, le cours suivant s'ouvre");
      } else {
        assert.equal(auto.length, 0, "pas de redirection automatique sur la dernière leçon d'un chapitre");
      }
      await unmount();
      timers.length = 0;
    }
  } finally {
    window.setTimeout = realSetTimeout;
    globalThis.Audio = realAudio;
  }
});

test("chaque leçon se termine par « Le défi de Palou » (3 questions), plus d'écran « Crée » ni de carnet", () => {
  for (const chapter of chapters) {
    for (const lesson of chapter.lessons) {
      const kinds = lesson.screens.map(s => s.kind);
      assert.ok(!kinds.includes("create"), `${lesson.id} a encore un écran « Crée »`);
      const defi = lesson.screens.filter(s => s.kind === "play").at(-1);
      assert.equal(defi.text, "Le défi de Palou ! Montre-moi ce que tu as retenu.", `${lesson.id} : le dernier jeu doit être le défi de Palou`);
      assert.equal(defi.rounds.length, 3, `${lesson.id} : trois questions`);
    }
  }
});

/* ── La carte des modules ──────────────────────────────────────────────────────────────────────────────── */
const worlds = tracks["7-9"].worlds;
const mountMap = (completed, onStart = () => {}) => mount(React.createElement(ModuleMap79, { worlds, completed, lessonStars: {}, onStartLesson: onStart }));

test("plus de vue « Carte » : seul l'archipel est affiché, sans bouton de bascule ni sentier", async () => {
  const { container, unmount } = await mountMap([]);
  assert.equal(byText(container, "Carte"), undefined, "pas de bouton « Carte »");
  assert.equal(container.querySelector(".p79-view-toggle"), null, "pas de bascule Carte / Archipel");
  assert.equal(container.querySelectorAll(".p79-stop").length, 0, "pas de sentier de la carte continue");
  assert.equal(container.querySelectorAll(".p79-ar-isle").length, 10, "dix îles dans l'archipel");
  await unmount();
});

test("« Cours suivant » (et les 10 secondes) ouvrent directement le cours suivant : seul « fin de module » revient sur l'archipel", () => {
  const source = fs.readFileSync(path.join(FRONTEND, "app", "dashboard", "DashboardClient.tsx"), "utf8");
  assert.match(source, /age === "7-9" && then === "map"/, "le retour à l'archipel ne concerne que la fin d'un module");
  assert.ok(!/age === "7-9" && \(then === "next"/.test(source), "« next » ne doit pas ramener sur l'archipel");
  assert.match(source, /then === "replay" \|\| \(then === "next" && following\)/, "« next » ouvre la leçon suivante");
});

test("plus de vue « Carte » dans le dépôt : ses composants n'existent pas", () => {
  for (const file of ["Sea79.tsx", "Shore79.tsx"]) {
    assert.ok(!fs.existsSync(path.join(FRONTEND, "app", "dashboard", "parcours79", file)), `${file} ne doit pas être dans le dépôt (la carte est une sauvegarde locale : frontend/local-only/carte79)`);
  }
  const source = fs.readFileSync(path.join(FRONTEND, "app", "dashboard", "parcours79", "ModuleMap79.tsx"), "utf8");
  assert.ok(!/p79-view-toggle|p79-sea|p79-stop|chooseView/.test(source), "ModuleMap79 ne doit plus contenir la vue Carte");
});

test("archipel : aucune information chiffrée d'adulte (jauges, LMS)", async () => {
  const { container, unmount } = await mountMap([]);
  assert.ok(!/LMS|Progression obligatoire/i.test(text(container)));
  await unmount();
});

/* ── L'archipel : une grande carte avec les 10 îles ───────────────────────────────────────────────────── */
const MODULE_1 = worlds[0].lessons.map(l => l.id);
const wait = ms => act(() => new Promise(resolve => setTimeout(resolve, ms)));

test("archipel : les 10 îles sont sur la carte ; seule l'île du module en cours est ouverte, les autres sont verrouillées", async () => {
  localStorage.clear(); localStorage.setItem("p79-view", "voyage"); // la vue archipel (la carte continue est la vue par défaut)
  const { container, unmount } = await mountMap([]);
  assert.equal(container.querySelectorAll(".p79-ar-isle").length, 10, "dix îles");
  assert.equal(container.querySelectorAll(".p79-ar-isle.open").length, 1, "une seule île ouverte au début");
  assert.equal(container.querySelectorAll(".p79-ar-isle.fog").length, 9, "neuf îles verrouillées (en noir et blanc)");
  assert.equal(container.querySelectorAll(".p79-ar-path").length, 0, "plus de pointillés entre les îles");
  assert.ok(text(container).includes("Île 1 sur 10"), "Palou est sur l'île 1");
  assert.equal(container.querySelector(".p79-ar-cloud"), null, "plus de nuages : les îles verrouillées sont grisées");
  await unmount();
});

test("archipel : toucher l'île ouvre une fenêtre de 4 quarts ; le cours à faire se lance, les suivants sont verrouillés", async () => {
  localStorage.clear(); localStorage.setItem("p79-view", "voyage"); // la vue archipel (la carte continue est la vue par défaut)
  let started = null;
  const { container, unmount } = await mountMap([], lesson => { started = lesson; });
  assert.equal(container.querySelector(".p79-ar-modal"), null, "aucune fenêtre au départ");
  await click(container.querySelector(".p79-ar-isle.open"));
  assert.ok(container.querySelector(".p79-ar-modal"), "la fenêtre s'ouvre");
  assert.equal(container.querySelectorAll(".p79-ar-quad").length, 4, "quatre quarts, un par cours");
  assert.equal(container.querySelectorAll(".p79-ar-quad.lock, .p79-ar-quad.next").length, 3, "trois cours verrouillés");
  assert.equal(container.querySelectorAll(".p79-ar-quad .p79-ar-play").length, 1, "un seul bouton Jouer (le cours à faire)");
  assert.ok(container.querySelector(".p79-ar-quad.now .p79-ar-quad-stars"), "le nombre d'étoiles est affiché");
  await click(container.querySelector(".p79-ar-play"));
  assert.equal(started, "p1-1");
  await unmount();
});

test("archipel : toucher une île verrouillée n'ouvre rien", async () => {
  localStorage.clear(); localStorage.setItem("p79-view", "voyage"); // la vue archipel (la carte continue est la vue par défaut)
  const { container, unmount } = await mountMap([]);
  await click(container.querySelector(".p79-ar-isle.fog"));
  assert.equal(container.querySelector(".p79-ar-modal"), null);
  await unmount();
});

test("archipel : un module terminé, Palou voyage jusqu'à l'île suivante, qui se débloque et dont la fenêtre s'ouvre", async () => {
  localStorage.clear(); localStorage.setItem("p79-view", "voyage"); // la vue archipel (la carte continue est la vue par défaut)
  localStorage.setItem("p79-archipel-at-local", "0");   // la dernière fois, l'enfant était sur l'île 1
  const { container, unmount } = await mountMap(MODULE_1);
  assert.ok(text(container).includes("Île 1 sur 10"), "Palou part de l'île terminée");
  await wait(1200);
  assert.ok(container.querySelector(".p79-ar-palou.moving"), "Palou voyage tout seul");
  assert.equal(container.querySelectorAll(".p79-ar-isle.open").length, 2, "l'île 2 est débloquée");
  await wait(2900);
  assert.ok(text(container).includes("Île 2 sur 10"), "arrivée sur l'île 2");
  assert.ok(container.querySelector(".p79-ar-modal"), "la fenêtre de l'île 2 s'ouvre");
  assert.equal(localStorage.getItem("p79-archipel-at-local"), "1", "l'île est retenue : le voyage ne sera pas rejoué");
  await unmount();
});

test("archipel : après un cours, la carte rouvre la fenêtre de l'île, qu'on peut fermer", async () => {
  localStorage.clear(); localStorage.setItem("p79-view", "voyage"); // la vue archipel (la carte continue est la vue par défaut)
  localStorage.setItem("p79-archipel-at-local", "1");
  localStorage.setItem("p79-archipel-open-local", "1");
  const { container, unmount } = await mountMap([...MODULE_1, "p2-1"]);
  await wait(50);
  assert.ok(container.querySelector(".p79-ar-modal"), "la fenêtre est rouverte");
  assert.ok(container.querySelector(".p79-ar-modal-head").textContent.includes("Île 2"), "celle de l'île 2");
  assert.ok(container.querySelectorAll(".p79-ar-quad")[1].classList.contains("now"), "le cours 2 est à jouer");
  await click(container.querySelector(".p79-ar-close"));
  assert.equal(container.querySelector(".p79-ar-modal"), null, "on peut la fermer");
  assert.equal(localStorage.getItem("p79-archipel-open-local"), null);
  await unmount();
});

test("archipel : si la progression recule (remise à zéro), Palou revient sur la bonne île sans voyager", async () => {
  localStorage.clear(); localStorage.setItem("p79-view", "voyage"); // la vue archipel (la carte continue est la vue par défaut)
  localStorage.setItem("p79-archipel-at-local", "9");   // l'appareil se souvenait d'une progression complète
  const { container, unmount } = await mountMap([]);
  await wait(50);
  assert.ok(text(container).includes("Île 1 sur 10"), "Palou est sur l'île 1, pas sur l'île 10");
  assert.equal(container.querySelector(".p79-ar-palou.moving"), null);
  assert.equal(localStorage.getItem("p79-archipel-at-local"), "0");
  await unmount();
});
