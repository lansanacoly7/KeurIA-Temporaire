"use client";

import { getSettings } from "./settings";
import { randomFloat } from "../../utils/random";

/**
 * Musique de fond des îles : joyeuse et dansante, comme dans un jeu vidéo. Générée par le navigateur (aucun fichier à télécharger),
 * la même ambiance pour toutes les îles. Jamais de bruitage : pas de mer, pas de cris.
 *
 * Ce qu'on entend (en do majeur, 124 battements par minute) : une suite d'accords lumineux (do, sol, la mineur, fa), une basse qui rebondit,
 * un arpège pétillant en notes « pizzicato », une petite mélodie de refrain qui revient et se laisse chantonner, et une percussion légère
 * (grosse caisse douce sur les temps, petit charleston sur les contretemps). Le volume reste raisonnable, jamais agressif.
 * Coupée par le réglage « Sons » et par le bouton de la scène. Le son ne démarre qu'après un geste de l'enfant (règle des navigateurs).
 */

const KEY = "keria_p79_music";
const LEVEL = 0.65;                 // niveau général (0 à 1)
const BPM = 124;
const BEAT = 60 / BPM;              // un temps, en secondes
const STEP = BEAT / 2;              // une croche
const BAR = 8;                      // 8 croches par mesure

/** Quatre accords (do, sol, la mineur, fa) : notes en demi-tons au-dessus du do central, et fondamentale de basse. */
const CHORDS: { notes: number[]; bass: number }[] = [
  { notes: [0, 4, 7], bass: -24 },
  { notes: [-5, -1, 2], bass: -29 },
  { notes: [-3, 0, 4], bass: -27 },
  { notes: [-7, -3, 0], bass: -31 },
];
/** Refrain : une petite phrase qui revient (une note en demi-tons au-dessus du do central, ou null pour un silence), une valeur par croche, sur 4 mesures. */
const HOOK: (number | null)[] = [
  12, null, 16, null, 19, null, 16, 12,      // do : do mi sol mi do
  14, null, 19, null, 23, 19, null, 14,      // sol
  16, null, 21, 19, 16, null, 12, null,      // la m
  17, null, 21, null, 24, 21, 17, null,      // fa
];

const hz = (semi: number) => 261.63 * Math.pow(2, semi / 12);

export function musicEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}
export function setMusicEnabled(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch { /* stockage indisponible : le choix vaut pour cette visite seulement */ }
}

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  bus: GainNode;
  echo: DelayNode;
  timer: number;
  nextTime: number;
  step: number;
  stopped: boolean;
  unlock: () => void;
  noise: AudioBuffer;
}

let engine: Engine | null = null;

function makeNoise(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (randomFloat() * 2 - 1) * (1 - i / data.length);
  return buffer;
}

/** Une note : « pluck » (attaque instantanée, chute rapide) ou tenue. */
function note(e: Engine, when: number, freq: number, seconds: number, volume: number, type: OscillatorType, attack = 0.006, echoSend = 0, detune = 0) {
  const { ctx } = e;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(volume, when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
  osc.connect(gain);
  gain.connect(e.bus);
  if (echoSend > 0) {
    const send = ctx.createGain();
    send.gain.value = echoSend;
    gain.connect(send);
    send.connect(e.echo);
  }
  osc.start(when);
  osc.stop(when + seconds + 0.05);
}

/** Grosse caisse douce : une sinusoïde dont la hauteur tombe très vite. */
function kick(e: Engine, when: number) {
  const { ctx } = e;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(130, when);
  osc.frequency.exponentialRampToValueAtTime(48, when + 0.12);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(0.22, when + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
  osc.connect(gain);
  gain.connect(e.bus);
  osc.start(when);
  osc.stop(when + 0.25);
}

function hat(e: Engine, when: number, volume: number) {
  const { ctx } = e;
  const src = ctx.createBufferSource();
  src.buffer = e.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7500;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(e.bus);
  src.start(when);
}

function schedule(e: Engine) {
  const { ctx } = e;
  while (e.nextTime < ctx.currentTime + 0.8) {
    const t = e.nextTime;
    const inBar = e.step % BAR;
    const bar = Math.floor(e.step / BAR);
    const chord = CHORDS[bar % CHORDS.length];

    // percussion légère : grosse caisse sur les temps 1 et 3, charleston sur les contretemps
    if (inBar === 0 || inBar === 4) kick(e, t);
    if (inBar % 2 === 1) hat(e, t, 0.045);
    // basse qui rebondit : fondamentale puis octave, sur les temps et leurs contretemps
    if (inBar === 0 || inBar === 3 || inBar === 4 || inBar === 7) note(e, t, hz(chord.bass + (inBar === 3 || inBar === 7 ? 12 : 0)), STEP * 1.6, 0.13, "triangle", 0.008);
    // arpège pétillant, en croches
    const arp = chord.notes[inBar % chord.notes.length] + (inBar >= 4 ? 12 : 0);
    note(e, t, hz(arp), STEP * 1.5, 0.05, "square", 0.004, 0.18);
    // refrain : revient toutes les quatre mesures, chantonnable
    const hook = HOOK[e.step % HOOK.length];
    if (hook !== null) note(e, t, hz(hook), STEP * 2.2, 0.10, "triangle", 0.008, 0.32);
    // accord de fond, tenu, pour remplir
    if (inBar === 0) for (const semi of chord.notes) note(e, t, hz(semi), BAR * STEP * 0.95, 0.022, "sine", 0.05);

    e.nextTime += STEP;
    e.step += 1;
  }
}

/** Lance la musique (ou la relance en douceur). Sans effet si les sons sont coupés. */
export function startAmbient() {
  if (typeof window === "undefined" || engine || !musicEnabled()) return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  let ctx: AudioContext;
  try {
    ctx = new Ctor();
  } catch {
    return;
  }
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.ratio.value = 4;
  const bus = ctx.createGain();
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 5200;
  bus.connect(lowpass);
  lowpass.connect(master);
  // petit écho : le refrain et l'arpège brillent sans devenir fouillis
  const echo = ctx.createDelay(1);
  echo.delayTime.value = STEP * 1.5;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = "lowpass";
  echoTone.frequency.value = 3200;
  echo.connect(echoTone);
  echoTone.connect(feedback);
  feedback.connect(echo);
  echoTone.connect(master);
  master.connect(compressor);
  compressor.connect(ctx.destination);

  const e: Engine = { ctx, master, bus, echo, timer: 0, nextTime: ctx.currentTime + 0.15, step: 0, stopped: false, unlock: () => {}, noise: makeNoise(ctx) };
  e.unlock = () => {
    if (ctx.state === "suspended") void ctx.resume();
    window.removeEventListener("pointerdown", e.unlock);
    window.removeEventListener("keydown", e.unlock);
  };
  // Les navigateurs exigent un geste avant de jouer du son : on reprend dès le premier appui.
  if (ctx.state === "suspended") {
    window.addEventListener("pointerdown", e.unlock);
    window.addEventListener("keydown", e.unlock);
    void ctx.resume().catch(() => {});
  }
  engine = e;
  schedule(e);
  e.timer = window.setInterval(() => {
    if (e.stopped) return;
    if (ctx.state === "running") schedule(e);
    else e.nextTime = Math.max(e.nextTime, ctx.currentTime + 0.15);
  }, 200);
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(LEVEL, ctx.currentTime + 1.5);   // la musique monte vite, mais sans à-coup
}

/** Arrête la musique en la faisant disparaître doucement, puis libère tout. */
export function stopAmbient() {
  const e = engine;
  if (!e) return;
  engine = null;
  e.stopped = true;
  window.clearInterval(e.timer);
  window.removeEventListener("pointerdown", e.unlock);
  window.removeEventListener("keydown", e.unlock);
  try {
    const t = e.ctx.currentTime;
    e.master.gain.cancelScheduledValues(t);
    e.master.gain.setValueAtTime(Math.max(0.0001, e.master.gain.value), t);
    e.master.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  } catch { /* contexte déjà fermé */ }
  window.setTimeout(() => { void e.ctx.close().catch(() => {}); }, 1000);
}

export const ambient = { start: startAmbient, stop: stopAmbient };
