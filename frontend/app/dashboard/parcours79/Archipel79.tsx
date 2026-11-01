"use client";

/**
 * L'archipel (parcours 7-9) : une grande carte avec les 10 îles du parcours, posées sur la mer du rivage (module 1) vers le large (module 10).
 *
 * - L'enfant touche une île : une grande fenêtre s'ouvre avec les 4 cours de ce module, en quatre quarts séparés par des lignes
 *   (image du cours, titre, étoiles, bouton « Jouer »).
 * - Un chemin en pointillés relie les îles dans l'ordre ; Palou se tient sur l'île où l'enfant en est.
 * - Les îles pas encore atteintes sont en noir et blanc (la couleur revient quand elles se débloquent) ; les toucher les fait seulement secouer.
 * - Quand l'enfant finit le module, il revient sur la carte : Palou voyage jusqu'à l'île suivante, qui se colore, et sa fenêtre s'ouvre.
 *
 * L'illustration : `archipel-paysage.webp` (ordinateur) et `archipel-portrait.webp` (téléphone, qu'on fait défiler), voir
 * docs/carte-iles/PROMPTS_CARTE_ARCHIPEL.md. Tant qu'elles manquent, les 10 îles dessinées sont posées sur une mer en dégradé.
 * Les rectangles des îles (BOXES) sont mesurés sur l'illustration livrée : à refaire si elle est remplacée.
 * « Réduire les animations » : Palou saute d'une île à l'autre au lieu de voyager.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { World } from "../../lms-data";
import { getChapter, getLessonContent, isPlayable } from "./content";
import { burstAt } from "./fx";
import { Icon79 } from "./Icons79";
import { Img79, PalouImg, lessonImageUrl } from "./Img79";
import { Island79 } from "./Scene79";
import { ambient, musicEnabled, setMusicEnabled } from "./ambient";
import { sfx } from "./sound";
import { SoundControl79 } from "./SoundControl79";
import { sayUi } from "./uiVoice";
import type { MapModel, ModuleState, Pose } from "./types";
import { isDevMode } from "../../utils/devMode";

interface Props {
  worlds: World[];
  model: MapModel;
  completed: string[];
  lessonStars: Record<string, number>;
  onStartLesson: (lessonId: string, worldId: string) => void;
  scope?: string;
  forceMode?: "landscape" | "portrait";
}

const ASSETS = "/images/parcours79/voyage";
const two = (n: number) => String(n).padStart(2, "0");
const islandImageUrl = (index: number) => `${ASSETS}/ile-${two(index + 1)}.webp`;
const ART = { landscape: `${ASSETS}/archipel-paysage.webp`, portrait: `${ASSETS}/archipel-portrait.webp` };
/** La pose de Palou sur la carte : clin d'œil et pouces levés ; la fête quand tout le voyage est fini. */
const PALOU_POSE: Pose = "Parfait";

/** Rectangle d'une île sur la carte, en % de la largeur (x) et de la hauteur (y) de la carte. */
interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  badge?: { x: number; y: number };
}
/** Mesuré sur archipel-paysage.webp (16:9) : du rivage en bas à gauche vers le large en haut à droite ; tout reste dans les 70 % du haut. */
const BOXES_LANDSCAPE: Box[] = [
  { x0: 3, y0: 36.4, x1: 19.8, y1: 68.9 }, { x0: 15.3, y0: 30.7, x1: 30.3, y1: 52.4 }, { x0: 26.8, y0: 21.8, x1: 43.3, y1: 40.4 }, { x0: 34.5, y0: 36.9, x1: 49.5, y1: 53.8 },
  { x0: 45, y0: 12, x1: 59.5, y1: 36 }, { x0: 49.3, y0: 40.4, x1: 64.8, y1: 64 }, { x0: 58.3, y0: 27.6, x1: 73, y1: 48.4 }, { x0: 69.8, y0: 33.3, x1: 80.5, y1: 59.1 },
  { x0: 75.3, y0: 13.8, x1: 88, y1: 36 }, { x0: 82.8, y0: 32.4, x1: 98.8, y1: 62.2 },
];
/** Mesuré sur archipel-portrait.webp (1:2) : 10 îles englobées à 100%, numéros au pied en zigzag harmonieux. */
const BOXES_PORTRAIT: Box[] = [
  { x0: 25.5, y0: 4.5, x1: 69.0, y1: 23.2, badge: { x: 47.5, y: 23.2 } }, // Île 1 : Bonjour, l'IA !
  { x0: 51.0, y0: 20.8, x1: 89.5, y1: 33.8, badge: { x: 69.5, y: 33.8 } }, // Île 2 : L'IA autour de moi
  { x0: 14.0, y0: 26.0, x1: 50.0, y1: 40.5, badge: { x: 31.5, y: 38.0 } }, // Île 3 : La grande famille des données
  { x0: 43.5, y0: 35.5, x1: 90.5, y1: 49.5, badge: { x: 68.0, y: 46.8 } }, // Île 4 : Apprendre avec des exemples
  { x0: 14.0, y0: 41.5, x1: 47.5, y1: 57.0, badge: { x: 31.0, y: 54.2 } }, // Île 5 : L'IA qui regarde
  { x0: 49.5, y0: 48.5, x1: 86.5, y1: 65.5, badge: { x: 68.5, y: 61.2 } }, // Île 6 : L'IA qui parle
  { x0: 15.0, y0: 57.5, x1: 48.5, y1: 72.0, badge: { x: 31.5, y: 68.2 } }, // Île 7 : Créer avec l'IA
  { x0: 54.5, y0: 63.5, x1: 85.5, y1: 80.5, badge: { x: 69.5, y: 76.2 } }, // Île 8 : Mon bouclier numérique
  { x0: 13.5, y0: 71.0, x1: 43.5, y1: 86.2, badge: { x: 28.5, y: 81.2 } }, // Île 9 : Vrai, faux… vérifions !
  { x0: 23.0, y0: 79.0, x1: 77.5, y1: 98.0, badge: { x: 50.0, y: 93.8 } }, // Île 10 : Une IA pour mon quartier
];
/** La carte est 16:9 en paysage ; en portrait elle est deux fois plus haute que large. */
const RATIO = { landscape: 16 / 9, portrait: 1 / 2 };

const reachable = (state: ModuleState | undefined) => isDevMode() || state === "done" || state === "now";
const reduced = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const TRAVEL_MS = 2400;

/** Où est une île : son centre, sa largeur et le point d'appui du chemin (le sol, un peu au-dessus du bas du rectangle). */
function geom(b: Box) {
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  return { cx: (b.x0 + b.x1) / 2, w, h, ground: b.y1 - h * 0.2 };
}

/* ───────── Mémoire de l'appareil ───────── */
const atKey = (scope?: string) => `p79-archipel-at-${scope ?? "local"}`;
const openKey = (scope?: string) => `p79-archipel-open-${scope ?? "local"}`;

function readNumber(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isInteger(n) ? n : null;
  } catch { return null; }
}
function writeNumber(key: string, value: number | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(value));
  } catch { /* stockage indisponible : la carte retrouvera simplement l'état du serveur */ }
}

/** Après le dernier cours d'un module : plus de fenêtre ouverte, Palou voyage vers l'île suivante. */
export function archipelFinish(scope: string | undefined) {
  writeNumber(openKey(scope), null);
}

/** L'image d'un cours : celle de sa première page d'histoire ; sinon Palou. */
function pictureOf(lessonId: string): string | undefined {
  const screen = getLessonContent(lessonId)?.screens.find(s => "image" in s && Boolean((s as { image?: string }).image));
  return screen ? (screen as { image?: string }).image : undefined;
}

/** Vrai si l'illustration existe (livrée par Antigravity). */
function useAsset(url: string) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const img = document.createElement("img");
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = url;
  }, [url]);
  return ok;
}

function computeBoxes(count: number, isPortrait: boolean): Box[] {
  const base = isPortrait ? BOXES_PORTRAIT : BOXES_LANDSCAPE;
  if (count <= base.length) return base.slice(0, Math.max(1, count));

  const result = [...base];
  if (isPortrait) {
    for (let i = base.length; i < count; i++) {
      const isLeft = i % 2 === 0;
      const prev = result[i - 1];
      const y0 = Math.min(94, prev.y0 + 7);
      const y1 = Math.min(99, y0 + 10);
      const x0 = isLeft ? 16.0 : 48.0;
      const x1 = isLeft ? 52.0 : 84.0;
      result.push({
        x0,
        y0,
        x1,
        y1,
        badge: { x: (x0 + x1) / 2, y: y1 },
      });
    }
  } else {
    for (let i = base.length; i < count; i++) {
      const offset = i - base.length;
      const x0 = Math.min(92, 84 + offset * 3);
      const y0 = Math.max(8, 24 + (offset % 2 === 0 ? -10 : 10));
      result.push({
        x0,
        y0,
        x1: Math.min(99, x0 + 10),
        y1: Math.min(55, y0 + 18),
      });
    }
  }
  return result;
}

export function Archipel79({ worlds, model, completed, lessonStars, onStartLesson, scope, forceMode }: Props) {
  const target = Math.min(model.palouAt, Math.max(0, worlds.length - 1));   // l'île où l'enfant en est
  const finishedAll = !model.current && !model.waitingForContent;
  const [portrait, setPortrait] = useState(() => {
    if (forceMode) return forceMode === "portrait";
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia("(max-width: 1024px) and (orientation: portrait), (max-width: 760px)").matches;
    }
    return false;
  });
  const [shown, setShown] = useState(target);         // l'île où Palou se tient en ce moment
  const [openIsland, setOpenIsland] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [shaking, setShaking] = useState<number | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const [onScreen, setOnScreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const palouRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const modelRef = useRef(model);
  modelRef.current = model;
  const targetRef = useRef(target);
  targetRef.current = target;
  const movingRef = useRef(false);
  const pending = useRef<number | null>(null);        // voyage à jouer dès que la carte est visible
  const visible = useRef(false);
  const timers = useRef<number[]>([]);
  const hasLandscape = useAsset(ART.landscape);
  const hasPortrait = useAsset(ART.portrait);
  const hasArt = portrait ? hasPortrait : hasLandscape;

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const boxes = useMemo(() => computeBoxes(worlds.length, portrait), [worlds.length, portrait]);
  const mode = portrait ? "portrait" : "landscape";

  useEffect(() => {
    if (forceMode) {
      setPortrait(forceMode === "portrait");
      return;
    }
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 1024px) and (orientation: portrait), (max-width: 760px)");
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [forceMode]);

  // Centrage doux de la vue sur l'île active en mode portrait (défilement vertical)
  useEffect(() => {
    if (!portrait || !stageRef.current) return;
    const b = boxes[shown] || boxes[0];
    if (!b) return;
    const stage = stageRef.current;
    const totalH = stage.scrollHeight;
    const targetY = (b.y0 / 100) * totalH - stage.clientHeight * 0.35;
    stage.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    const islandEl = stage.querySelector(`.p79-ar-isle.here`);
    if (islandEl) {
      islandEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [portrait, shown, boxes]);

  const remember = useCallback((index: number) => {
    const saved = readNumber(atKey(scope)) ?? -1;
    if (index > saved) writeNumber(atKey(scope), index);
  }, [scope]);

  /** Palou voyage jusqu'à l'île suivante ; à l'arrivée, elle se colore et sa fenêtre s'ouvre. */
  const travel = useCallback((to: number) => {
    if (movingRef.current || to === shownRef.current) return;
    movingRef.current = true;
    setMoving(true);
    setOpenIsland(null);
    sfx.page();
    setShown(to);
    later(() => {
      movingRef.current = false;
      setMoving(false);
      // la progression a pu changer pendant le trajet (ancienne valeur affichée un instant) : on ne s'arrête que sur une île vraiment atteinte
      if (!reachable(modelRef.current.modules[to]?.state)) {
        setShown(targetRef.current);
        return;
      }
      remember(to);
      sfx.star();
      if (palouRef.current) burstAt(palouRef.current);
      setOpenIsland(to);
    }, reduced() ? 300 : TRAVEL_MS);
  }, [remember]); // eslint-disable-line react-hooks/exhaustive-deps

  const playPending = useCallback(() => {
    if (pending.current === null || !visible.current || movingRef.current) return;
    const to = pending.current;
    pending.current = null;
    later(() => travel(to), 700);   // un instant pour voir l'île terminée avant de partir
  }, [travel]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Remet l'écran d'accord avec la progression : Palou revient si elle recule, voyage si elle avance, la fenêtre se rouvre après un cours. */
  const sync = useCallback(() => {
    if (movingRef.current) return;
    if (targetRef.current < shownRef.current) {
      // progression remise à zéro ou plus courte que ce qui s'affichait : Palou revient tout de suite sur la bonne île
      setShown(targetRef.current);
      shownRef.current = targetRef.current;
      writeNumber(atKey(scope), targetRef.current);
      pending.current = null;
    }
    const open = readNumber(openKey(scope));
    if (open !== null && reachable(modelRef.current.modules[open]?.state)) setOpenIsland(open);
    if (targetRef.current > shownRef.current) { pending.current = targetRef.current; playPending(); }
  }, [scope, playPending]);

  // Premier affichage : si l'enfant a avancé depuis la dernière fois, Palou part de l'ancienne île.
  useEffect(() => {
    const saved = readNumber(atKey(scope));
    if (saved !== null && saved >= 0 && saved < target) {
      setShown(saved);
      shownRef.current = saved;
      pending.current = target;
    } else {
      setShown(target);
      shownRef.current = target;
      writeNumber(atKey(scope), target);
    }
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { sync(); }, [model]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { visible.current = true; setOnScreen(true); sync(); return; }
    const observer = new IntersectionObserver(entries => {
      const was = visible.current;
      visible.current = entries.some(e => e.isIntersecting);
      setOnScreen(visible.current);
      if (visible.current && !was) sync();
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync]);

  useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); }, []);

  // Sur téléphone, la carte défile : on amène l'île de Palou au milieu de l'écran.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !portrait) return;
    const b = boxes[shown] || boxes[0];
    const mapHeight = el.clientWidth * 2;   // la carte est deux fois plus haute que large
    const top = (((b.y0 + b.y1) / 2) / 100) * mapHeight - el.clientHeight * 0.5;
    if (typeof el.scrollTo === "function") el.scrollTo({ top: Math.max(0, top), behavior: reduced() ? "auto" : "smooth" });
  }, [portrait, shown, hasArt]);

  // Échap ferme la fenêtre.
  useEffect(() => {
    if (openIsland === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { writeNumber(openKey(scope), null); setOpenIsland(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIsland, scope]);

  // Musique de fond : seulement quand la carte est à l'écran, l'onglet visible et la musique permise.
  useEffect(() => { setMusicOn(musicEnabled()); }, []);
  useEffect(() => {
    const apply = () => { if (musicOn && onScreen && !document.hidden) ambient.start(); else ambient.stop(); };
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => document.removeEventListener("visibilitychange", apply);
  }, [musicOn, onScreen]);
  useEffect(() => () => ambient.stop(), []);

  const starsOf = (lessonId: string) => (completed.includes(lessonId) ? Math.max(1, lessonStars[lessonId] ?? 0) : 0);

  const tapIsland = (i: number) => {
    if (movingRef.current) return;
    if (!reachable(model.modules[i]?.state)) {
      setShaking(i);
      later(() => setShaking(null), 450);
      sfx.almost();
      void sayUi("bloque-ile");
      return;
    }
    sfx.page();
    writeNumber(openKey(scope), i);
    setOpenIsland(i);
  };

  const closeWindow = () => { sfx.tap(); writeNumber(openKey(scope), null); setOpenIsland(null); };

  const world = openIsland !== null ? worlds[openIsland] : null;
  const stage = openIsland !== null ? model.modules[openIsland] : null;
  const lessons = useMemo(() => (world ? world.lessons.map((lesson, k) => ({ lesson, state: stage?.lessons[k]?.state ?? ("lock" as const) })) : []), [world, stage]);
  const chapter = world ? getChapter(world.id) : undefined;

  const openLesson = (k: number) => {
    if (!world) return;
    const { lesson, state } = lessons[k];
    if (!(state === "now" || state === "done") || !isPlayable(lesson.id)) {
      setShaking(1000 + k);
      later(() => setShaking(null), 450);
      sfx.almost();
      void sayUi("bloque-cours");
      return;
    }
    sfx.tap();
    writeNumber(openKey(scope), openIsland);
    onStartLesson(lesson.id, world.id);
  };

  const here = worlds[shown];
  const hereChapter = here ? getChapter(here.id) : undefined;
  const hereStage = model.modules[shown];
  const activeLessonIndex = useMemo(() => {
    if (!hereStage) return 0;
    const idx = hereStage.lessons.findIndex(l => l.state === "now");
    return idx >= 0 ? idx : 0;
  }, [hereStage]);
  const activeLesson = here?.lessons[activeLessonIndex];
  const canStartActiveLesson = Boolean(activeLesson && isPlayable(activeLesson.id) && reachable(hereStage?.state));
  const activeLessonState = hereStage?.lessons[activeLessonIndex]?.state;
  const startVerb = activeLessonState === "done" ? "Refaire le cours" : activeLessonIndex > 0 ? "Continuer" : "Commencer le cours";

  const handleStartCurrentLesson = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (movingRef.current) return;
    if (!reachable(hereStage?.state)) {
      tapIsland(shown);
      return;
    }
    if (activeLesson && canStartActiveLesson) {
      sfx.tap();
      writeNumber(openKey(scope), shown);
      onStartLesson(activeLesson.id, here.id);
    } else {
      tapIsland(shown);
    }
  };

  const ratio = RATIO[mode];
  const hb = boxes[Math.min(shown, boxes.length - 1)];
  const hg = geom(hb);
  // Palou : debout devant son île, à droite ; sa taille suit celle de l'île (les largeurs sont en % de la carte, les hauteurs converties).
  const palouW = Math.max(6, Math.min(hg.w, hg.h / ratio) * 0.5);

  return (
    <section className="p79-ar" aria-label="L'archipel des Petits Explorateurs">
      <div
        ref={stageRef}
        className={`p79-ar-stage ${mode} ${hasArt ? "has-art" : "draft"}`}
        style={{ "--ar-art": hasArt ? `url(${portrait ? ART.portrait : ART.landscape})` : "none", "--ar-ratio": String(ratio) } as React.CSSProperties}
      >
        <div className="p79-ar-map">

          {boxes.map((b, i) => {
            if (!worlds[i]) return null;
            const st = model.modules[i]?.state;
            const open = reachable(st);
            const isHere = i === shown;
            const title = getChapter(worlds[i]?.id)?.module.title ?? worlds[i]?.title ?? `Île ${i + 1}`;
            const bw = b.x1 - b.x0;
            const bh = b.y1 - b.y0;
            // la copie en noir et blanc de l'illustration, découpée autour de l'île (bords adoucis) : posée sur les îles verrouillées
            const pad = 0.12;
            const rx = Math.max(0, b.x0 - bw * pad);
            const ry = Math.max(0, b.y0 - bh * pad);
            const rw = Math.min(100 - rx, bw * (1 + 2 * pad));
            const rh = Math.min(100 - ry, bh * (1 + 2 * pad));
            return (
              <div key={i} className="p79-ar-slot">
                {hasArt && !open && (
                  <i
                    className="p79-ar-grey"
                    aria-hidden="true"
                    style={{
                      left: `${rx}%`, top: `${ry}%`, width: `${rw}%`, height: `${rh}%`,
                      backgroundSize: `${10000 / rw}% ${10000 / rh}%`,
                      backgroundPosition: `${rw >= 100 ? 0 : (rx / (100 - rw)) * 100}% ${rh >= 100 ? 0 : (ry / (100 - rh)) * 100}%`,
                    }}
                  />
                )}
                {(() => {
                  const badgeStyle: React.CSSProperties | undefined = b.badge
                    ? {
                        left: `${((b.badge.x - b.x0) / bw) * 100}%`,
                        top: `${((b.badge.y - b.y0) / bh) * 100}%`,
                        translate: "-50% -50%",
                      }
                    : undefined;
                  return (
                    <button
                      type="button"
                      className={`p79-ar-isle ${open ? "open" : "fog"} ${st ?? ""} ${isHere ? "here" : ""} ${openIsland === i ? "selected" : ""} ${shaking === i ? "shake" : ""}`}
                      style={{ left: `${b.x0}%`, top: `${b.y0}%`, width: `${bw}%`, height: `${bh}%` }}
                      onClick={() => tapIsland(i)}
                      disabled={moving}
                      aria-label={`Île ${i + 1} : ${title}. ${open ? (st === "done" ? "Terminée" : "À jouer") : "Verrouillée"}`}
                    >
                      {!hasArt && <Img79 eager src={islandImageUrl(i)} fallback={<Island79 variant={i} state={st ?? "now"} />} />}
                      <b className="p79-ar-badge" style={badgeStyle} aria-hidden="true">{st === "done" ? <Icon79 name="check" size={18} /> : open ? i + 1 : <Icon79 name="lock" size={16} />}</b>
                    </button>
                  );
                })()}
              </div>
            );
          })}

          <div
            ref={palouRef}
            className={`p79-ar-palou ${moving ? "moving" : ""}`}
            style={{ left: `${hg.cx + hg.w * 0.2}%`, top: `${hb.y1 - hg.h * 0.1}%`, width: `${palouW}%` }}
            aria-hidden="true"
          >
            <PalouImg pose={finishedAll && shown === worlds.length - 1 ? "Celebration" : PALOU_POSE} />
          </div>
        </div>

        <header
          className="p79-ar-title"
          role="region"
          aria-label={`Île ${shown + 1} sur ${worlds.length} : ${hereChapter?.module.title ?? here?.title}`}
        >
          <button
            type="button"
            className="p79-ar-title-badge"
            onClick={() => tapIsland(shown)}
            aria-label={`Île ${shown + 1} sur ${worlds.length} : Voir la carte de l'île`}
          >
            <span className="p79-ar-count">
              <span className="p79-ar-count-full">Île {shown + 1} sur {worlds.length}</span>
              <span className="p79-ar-count-short">{shown + 1}/{worlds.length}</span>
            </span>
          </button>

          <div
            className="p79-ar-title-main"
            onClick={() => tapIsland(shown)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tapIsland(shown); } }}
            aria-label={`${hereChapter?.module.title ?? here?.title} : Voir les détails de l'île`}
          >
            <h3>{hereChapter?.module.title ?? here?.title}</h3>
            <div className="p79-ar-title-sub">
              {!portrait && hereChapter?.module.place && (
                <span className="p79-ar-title-place">
                  <Icon79 name="map" size={15} />
                  <span>{hereChapter.module.place}</span>
                </span>
              )}
              {activeLesson && (
                <span className="p79-ar-title-lesson-name">
                  <span className="p79-ar-title-dot" aria-hidden="true">•</span>
                  <span>Cours {activeLessonIndex + 1} : {activeLesson.title}</span>
                </span>
              )}
            </div>
          </div>

          <div className="p79-ar-title-actions">
            <button
              type="button"
              className="p79-ar-btn-overview"
              onClick={() => tapIsland(shown)}
              disabled={moving}
              aria-label="Voir les 4 cours de cette île"
            >
              <Icon79 name="book" size={20} />
              <span>Les 4 cours</span>
            </button>
            <button
              type="button"
              className="p79-ar-btn-start"
              onClick={handleStartCurrentLesson}
              disabled={moving}
              aria-label={`${startVerb} : ${activeLesson?.title ?? here?.title}`}
            >
              <Icon79 name="play" size={22} />
              <span>{startVerb}</span>
            </button>
          </div>
        </header>

        <div className="p79-ar-music">
          <SoundControl79 music={{ on: musicOn, onChange: next => { setMusicOn(next); setMusicEnabled(next); } }} buttonClassName="p79-ar-music-btn" size={26} />
        </div>

        {finishedAll && openIsland === null && !moving && (
          <div className="p79-ar-finale" role="status"><b>Bravo, tu as fini tout le voyage !</b> Touche une île pour revoir ses cours.</div>
        )}
      </div>

      {world && stage && (
        <div className="p79-ar-back" onClick={e => { if (e.target === e.currentTarget) closeWindow(); }}>
          <div className="p79-ar-modal" role="dialog" aria-modal="true" aria-label={`Les cours de l'île ${openIsland! + 1}`}>
            <header className="p79-ar-modal-head">
              <div>
                <span className="p79-ar-count">Île {openIsland! + 1} sur {worlds.length}</span>
                <h3>{chapter?.module.title ?? world.title}</h3>
                {chapter?.module.place && <p>{chapter.module.place}</p>}
              </div>
              <button type="button" className="p79-ar-close" onClick={closeWindow} aria-label="Fermer"><Icon79 name="close" size={24} /></button>
            </header>
            <div className="p79-ar-quads" role="group" aria-label="Les quatre cours">
              {lessons.map(({ lesson, state }, k) => {
                const stars = starsOf(lesson.id);
                const locked = state === "lock" || state === "soon" || state === "next";
                const picture = pictureOf(lesson.id);
                const verb = state === "done" ? "Refaire" : "Commencer";
                return (
                  <section key={lesson.id} className={`p79-ar-quad ${state} ${shaking === 1000 + k ? "shake" : ""}`}>
                    <div className="p79-ar-quad-pic">
                      <Img79 eager src={picture ? lessonImageUrl(picture) : undefined} pose="Content" fallback={<PalouImg pose="Content" />} />
                      <b className="p79-ar-quad-n">{state === "done" ? <Icon79 name="check" size={24} /> : locked ? <Icon79 name="lock" size={20} /> : k + 1}</b>
                    </div>
                    <div className="p79-ar-quad-info">
                      <span className="p79-ar-quad-kicker">Cours {k + 1}</span>
                      <h4 className="p79-ar-quad-title">{lesson.title}</h4>
                      {locked ? (
                        <p className="p79-ar-quad-lock">Finis le cours d’avant</p>
                      ) : (
                        <span className="p79-ar-quad-stars" aria-label={`${stars} étoile${stars > 1 ? "s" : ""} sur 3`}>
                          {[1, 2, 3].map(n => <Icon79 key={n} name="star" size={24} className={n <= stars ? "on" : "off"} />)}
                        </span>
                      )}
                    </div>
                    {locked ? (
                      <span className="p79-ar-quad-padlock" aria-hidden="true"><Icon79 name="lock" size={30} /></span>
                    ) : (
                      <button type="button" className="p79-ar-play" onClick={() => openLesson(k)} aria-label={`${verb} le cours ${k + 1} : ${lesson.title}`}>
                        <Icon79 name="play" size={22} /> {verb}
                      </button>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
