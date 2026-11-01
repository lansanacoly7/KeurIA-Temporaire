"use client";

import { getSettings } from "./settings";
import { randomFloat } from "../../utils/random";

/**
 * Petits sons du parcours 7-9, générés par le navigateur (aucun fichier). Doux par conception :
 * jamais de buzzer ni d'onde agressive, même pour une erreur. Coupés par le réglage « Sons ».
 */
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined" || !getSettings().sound) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(frequency: number, delay: number, duration: number, type: OscillatorType = "sine", volume = 0.14) {
  const c = context();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const start = c.currentTime + delay;
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function whoosh(duration = 0.16, volume = 0.05) {
  const c = context();
  if (!c) return;
  const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * duration)), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (randomFloat() * 2 - 1) * (1 - i / data.length);
  const source = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = 1400;
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  source.start();
}

const sfxAudioCache = new Map<string, HTMLAudioElement>();

function playSfxFile(filename: string, fallback: () => void) {
  if (typeof window === "undefined" || !getSettings().sound) return;
  try {
    const src = `/audio/palou/sfx/${filename}.wav`;
    let audio = sfxAudioCache.get(src);
    if (!audio) {
      audio = new Audio(src);
      audio.preload = "auto";
      sfxAudioCache.set(src, audio);
    }
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => fallback());
    }
  } catch {
    fallback();
  }
}

export const sfx = {
  /** Toucher un bouton. */
  tap: () => playSfxFile("tap", () => tone(620, 0, 0.09, "sine", 0.13)),
  /** Bonne réponse : marimba montant do-mi-sol. */
  ok: () => playSfxFile("ok", () => [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.09, 0.32, "triangle", 0.15))),
  /** « Presque ! » : deux notes douces qui descendent. */
  almost: () => playSfxFile("almost", () => { tone(392, 0, 0.22, "sine", 0.1); tone(329.6, 0.16, 0.32, "sine", 0.09); }),
  /** Étoile gagnée. */
  star: () => playSfxFile("star", () => [1318, 1568, 1975].forEach((f, i) => tone(f, i * 0.07, 0.28, "sine", 0.08))),
  /** Changement d'écran. */
  page: () => whoosh(),
  /** Fin de leçon. */
  win: () => playSfxFile("win", () => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.13, 0.5, "triangle", 0.14)); tone(261.6, 0.5, 0.9, "sine", 0.1); }),
};

