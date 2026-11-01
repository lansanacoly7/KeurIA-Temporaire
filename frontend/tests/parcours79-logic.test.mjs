// Tests de la logique pure du parcours 7-9 (carte, étoiles, textes lus). Lancer : npm run test:logic
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

// Seul import de valeur : utils/random (lui aussi sans dépendance), compilé de la même façon.
function load(url, requireFn) {
  const { outputText } = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const m = { exports: {} };
  new Function("module", "exports", "require", outputText)(m, m.exports, requireFn);
  return m;
}
const randomModule = load(new URL("../app/utils/random.ts", import.meta.url));
const mod = load(new URL("../app/dashboard/parcours79/logic.ts", import.meta.url), (id) => {
  if (id === "../../utils/random") return randomModule.exports;
  throw new Error(`import inattendu dans logic.ts : ${id}`);
});
const { computeMap, starsFor, scoreForStars, shuffle, fillTokens, speakable, sentenceLengths, normalizeSpeech, checkSpeech, planFit, MIN_SCALE, parseVideoEmbedUrl, resolveMediaSource } = mod.exports;

/* ── Mise en page des écrans de leçon : le contenu ne rapetisse jamais trop, il se réorganise ou la zone défile ── */
// Un contenu « liquide » : même surface quelle que soit la largeur, donc hauteur = surface / largeur (comme des cartes qui se rangent en colonnes).
const liquid = area => width => Math.ceil(area / width);

test("mise en page : un contenu qui tient n'est pas réduit", () => {
  const plan = planFit(500, 800, liquid(800 * 400));
  assert.equal(plan.scale, 1);
  assert.equal(plan.overflow, false);
});

test("mise en page : un contenu trop haut gagne en largeur avant de rapetisser (la place sur les côtés sert)", () => {
  // 800 de large × 600 de haut dans 500 de haut : réduire à 0,83 serait possible, mais élargir à ~960 le fait tenir à 0,85 sans perdre de lisibilité
  const plan = planFit(500, 800, liquid(800 * 600));
  assert.ok(plan.scale >= 0.85, `échelle ${plan.scale}`);
  assert.ok(plan.width > 800, "le contenu a été élargi");
});

test("mise en page : jamais sous l'échelle minimale, la zone défile à la place", () => {
  // Contenu rigide (la hauteur ne change pas avec la largeur) : 1000 de haut dans 400.
  const plan = planFit(400, 360, () => 1000);
  assert.equal(plan.scale, MIN_SCALE);
  assert.equal(plan.overflow, true);
});

test("mise en page : l'échelle minimale reste lisible pour un enfant de 7 à 9 ans", () => {
  assert.ok(MIN_SCALE >= 0.8, "au moins 80 % de la taille prévue");
  // 22 px de texte réduits à l'échelle minimale restent à 18 px ou plus.
  assert.ok(22 * MIN_SCALE >= 18);
});

test("« Parle à Palou » : accents, casse et ponctuation ne comptent pas", () => {
  assert.equal(normalizeSpeech("À quelle HEURE commence la fête ?"), "a quelle heure commence la fete");
  assert.equal(normalizeSpeech("l’heure"), "l heure");
});

test("« Parle à Palou » : il faut au moins un mot de chaque groupe, en mots entiers", () => {
  const need = [["heure"], ["fête"]];
  assert.equal(checkSpeech("Quelle est l’heure de la fête ?", need).ok, true);
  assert.deepEqual(checkSpeech("à quelle heure la fete", need).heard, ["heure", "fête"]);
  assert.equal(checkSpeech("Quelle heure est-il ?", need).ok, false);
  assert.equal(checkSpeech("heures et fêtes", need).ok, false);   // « heures » n'est pas « heure »
  assert.equal(checkSpeech("repete s'il te plait", [["répéter", "répète"], ["plaît"]]).ok, true);
});

test("« Parle à Palou » : un mot à éviter rend la phrase vague", () => {
  const out = checkSpeech("C'est quand le truc de la fête ?", [["fête"]], ["truc"]);
  assert.equal(out.ok, false);
  assert.deepEqual(out.avoided, ["truc"]);
});

const worlds = ["p1", "p2", "p3", "p4"].map(id => ({ id, lessons: [1, 2, 3, 4].map(n => ({ id: `${id}-${n}` })) }));
const playableUpTo = (last) => (id) => {
  const order = worlds.flatMap(w => w.lessons.map(l => l.id));
  return order.indexOf(id) <= order.indexOf(last);
};

test("début de parcours : premier module ouvert, les autres verrouillés", () => {
  const m = computeMap(worlds, [], playableUpTo("p1-4"));
  assert.equal(m.modules[0].state, "now");
  assert.deepEqual(m.modules[0].lessons.map(l => l.state), ["now", "next", "next", "next"]);
  assert.equal(m.modules[1].state, "lock");
  assert.deepEqual(m.current, { moduleId: "p1", lessonId: "p1-1" });
  assert.equal(m.palouAt, 0);
  assert.equal(m.waitingForContent, false);
});

test("module terminé : le suivant s'ouvre", () => {
  const m = computeMap(worlds, ["p1-1", "p1-2", "p1-3", "p1-4", "p2-1"], playableUpTo("p3-4"));
  assert.equal(m.modules[0].state, "done");
  assert.equal(m.modules[1].state, "now");
  assert.deepEqual(m.modules[1].lessons.map(l => l.state), ["done", "now", "next", "next"]);
  assert.equal(m.modules[2].state, "lock");
  assert.equal(m.palouAt, 1);
});

test("contenu pas encore écrit : jamais d'écran vide, un message « bientôt »", () => {
  const done = ["p1-1", "p1-2", "p1-3", "p1-4", "p2-1", "p2-2"];
  const m = computeMap(worlds, done, playableUpTo("p2-2"));
  assert.equal(m.modules[1].state, "soon");
  assert.deepEqual(m.modules[1].lessons.map(l => l.state), ["done", "done", "soon", "soon"]);
  assert.equal(m.current, null);
  assert.equal(m.waitingForContent, true);
  assert.equal(m.palouAt, 1);
  assert.equal(m.modules[2].state, "lock");
});

test("parcours entièrement terminé", () => {
  const all = worlds.flatMap(w => w.lessons.map(l => l.id));
  const m = computeMap(worlds, all, () => true);
  assert.ok(m.modules.every(x => x.state === "done"));
  assert.equal(m.current, null);
  assert.equal(m.waitingForContent, false);
  assert.equal(m.palouAt, 3);
});

test("étoiles : 3 sans erreur, jamais moins de 1", () => {
  assert.equal(starsFor(0), 3);
  assert.equal(starsFor(1), 2);
  assert.equal(starsFor(2), 2);
  assert.equal(starsFor(3), 1);
  assert.equal(starsFor(99), 1);
  assert.deepEqual([3, 2, 1].map(scoreForStars), [100, 75, 50]);
});

test("mélange : conserve les éléments et respecte le générateur", () => {
  const items = [1, 2, 3, 4, 5];
  let seed = 7;
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const out = shuffle(items, rng);
  assert.deepEqual([...out].sort(), items);
  assert.deepEqual(items, [1, 2, 3, 4, 5], "l'entrée n'est pas modifiée");
  seed = 7;
  assert.deepEqual(shuffle(items, rng), out, "même graine, même ordre");
});

test("prénom : remplacé, ou retiré proprement s'il est absent", () => {
  assert.equal(fillTokens("Bravo {prenom} !", "Awa"), "Bravo Awa !");
  assert.equal(fillTokens("Bravo {prenom} !", ""), "Bravo !");
  assert.equal(fillTokens("Bravo, {prenom} ! Tu as réussi.", null), "Bravo ! Tu as réussi.");
});

test("voix : emoji retirés, noms propres corrigés", () => {
  assert.equal(speakable("Salut 🦁 ! Une IA arrive."), "Salut ! Une I A arrive.");
  assert.equal(speakable("Baye écoute la radio avec Mame Awa."), "Baï écoute la radio avec Mamé Awa.");
  assert.equal(speakable("Mme Diop sourit."), "Madame Diop sourit.");
});

test("lisibilité : longueur des phrases", () => {
  assert.deepEqual(sentenceLengths("Oh non ! Un intrus s'est glissé dans le panier. Peux-tu m'aider ?"), [2, 7, 2]);
});

test("vidéo : extraction et intégration YouTube sécurisée nocookie", () => {
  const watch = parseVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.ok(watch);
  assert.equal(watch.provider, "youtube");
  assert.equal(watch.embedUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");

  const short = parseVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ");
  assert.ok(short);
  assert.equal(short.embedUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");

  const embed = parseVideoEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ");
  assert.ok(embed);
  assert.equal(embed.embedUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
});

test("vidéo : extraction et intégration Vimeo sécurisée", () => {
  const vimeo = parseVideoEmbedUrl("https://vimeo.com/76979871");
  assert.ok(vimeo);
  assert.equal(vimeo.provider, "vimeo");
  assert.equal(vimeo.embedUrl, "https://player.vimeo.com/video/76979871");

  const player = parseVideoEmbedUrl("https://player.vimeo.com/video/76979871");
  assert.ok(player);
  assert.equal(player.embedUrl, "https://player.vimeo.com/video/76979871");
});

test("vidéo : domaines non autorisés ou URL invalides refusés", () => {
  assert.equal(parseVideoEmbedUrl("http://youtube.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(parseVideoEmbedUrl("https://evil.com/video.mp4"), null);
  assert.equal(parseVideoEmbedUrl("javascript:alert(1)"), null);
  assert.equal(parseVideoEmbedUrl(""), null);
});

test("média : résolution des références de médiathèque", () => {
  assert.equal(resolveMediaSource("media:12.abcdef12"), "/api/media/12/abcdef12");
  assert.equal(resolveMediaSource("https://example.com/photo.png"), "https://example.com/photo.png");
  assert.equal(resolveMediaSource("/custom/path.webp"), "/custom/path.webp");
  assert.equal(resolveMediaSource("m01-l1-cour.webp"), "/images/parcours79/lecons/m01-l1-cour.webp");
});

