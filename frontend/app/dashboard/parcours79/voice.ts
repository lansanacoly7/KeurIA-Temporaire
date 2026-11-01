"use client";

import { getSettings } from "./settings";

/**
 * Voix de Palou (mascotte garçon de 7-9 ans) : uniquement ses fichiers audio enregistrés (leçons : public/audio/palou/lecons,
 * reste de l'interface : public/audio/palou/ui). Il n'y a volontairement aucune voix du navigateur : si un fichier manque, Palou se tait.
 */
export function voiceSupported(): boolean {
  return typeof Audio !== "undefined";
}

/**
 * iPhone / iPad : Safari n'autorise un son que si `play()` est lancé par un geste de l'enfant, et seulement pour l'élément audio
 * « débloqué » par ce geste. Un nouvel élément `new Audio()` créé plus tard (quand Palou enchaîne ses phrases tout seul) reste donc muet.
 * Sur ces appareils, un seul élément audio est débloqué au premier geste (un silence de 0,1 s) puis réutilisé pour toutes les phrases.
 * Ailleurs (ordinateur, Android), rien ne change.
 */
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
const IS_IOS = typeof navigator !== "undefined" && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
let shared: HTMLAudioElement | null = null;

function unlockAudio() {
  if (shared || typeof Audio === "undefined") return;
  try {
    const element = new Audio(SILENCE);
    shared = element;
    void element.play().catch(() => { if (shared === element) shared = null; });   // refusé : on réessaiera au geste suivant
  } catch {
    shared = null;
  }
}

if (IS_IOS && typeof window !== "undefined") {
  for (const type of ["touchend", "pointerup", "click"]) window.addEventListener(type, unlockAudio, { passive: true });
}

/** Clip de leçon en cours de lecture, et jeton qui annule une suite de clips devenue inutile (écran changé, leçon quittée). */
let cancelLessonClip: (() => void) | null = null;
let lessonToken = 0;

export function stopSpeaking() {
  lessonToken++;
  cancelLessonClip?.();
}

/** Un morceau de ce que Palou dit : son fichier audio (voix officielle) et son texte (affiché à l'écran, jamais lu par le navigateur). */
export type LessonPart = { src: string; text: string };

/** Fichier audio d'un morceau de leçon : /audio/palou/lecons/m01/p1-1/p1-1_e03.mp3 ; les phrases communes sont dans lecons/commun/. */
export function lessonClipSrc(lessonId: string, key: string): string {
  if (key.startsWith("commun_")) return `/audio/palou/lecons/commun/${key}.mp3`;
  const chapter = /^p(\d+)-/.exec(lessonId)?.[1] ?? "0";
  return `/audio/palou/lecons/m${chapter.padStart(2, "0")}/${lessonId}/${lessonId}_${key}.mp3`;
}

function playOneClip(src: string, token: number): Promise<"done" | "missing" | "stopped"> {
  return new Promise((resolve) => {
    // Pas de lecteur audio (ou fichier illisible) : on le traite comme « fichier absent » : Palou se tait.
    if (typeof Audio === "undefined") { resolve("missing"); return; }
    let audio: HTMLAudioElement;
    try {
      if (shared) { audio = shared; audio.src = src; } else audio = new Audio(src);
    } catch { resolve("missing"); return; }
    const finish = (result: "done" | "missing" | "stopped") => {
      audio.onended = null;
      audio.onerror = null;
      if (cancelLessonClip === cancel) cancelLessonClip = null;
      resolve(token !== lessonToken ? "stopped" : result);
    };
    const cancel = () => { audio.pause(); finish("stopped"); };
    cancelLessonClip = cancel;
    audio.onended = () => finish("done");
    audio.onerror = () => finish("missing");
    audio.play().catch(() => finish("missing"));
  });
}

/** Joue les morceaux d'une leçon l'un après l'autre avec la voix officielle de Palou ; un fichier absent est simplement sauté. */
export async function speakLesson(parts: LessonPart[], options: { force?: boolean } = {}) {
  if (!getSettings().voice && !options.force) return;
  stopSpeaking();
  const token = lessonToken;
  for (const part of parts) {
    if (!part.src) continue;   // passage modifié depuis l'enregistrement : muet plutôt que de lire l'ancien texte
    if ((await playOneClip(part.src, token)) === "stopped") return;
  }
}
