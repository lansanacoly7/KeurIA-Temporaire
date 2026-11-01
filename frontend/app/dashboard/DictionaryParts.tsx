"use client";

import { AudioLines, BadgeCheck, Blend, BookOpen, Bot, Boxes, Brain, Camera, CircleHelp, Code, Compass, Cpu, Database, Drama, Eye, FileSearch, FlaskConical, FolderTree, Focus, Grid3x3, KeyRound, Layers, Lightbulb, ListChecks, Lock, MessageCircle, MessagesSquare, Mic, Newspaper, Palette, Pencil, Puzzle, Quote, Rocket, Scale, ScanSearch, Search, Shapes, ShieldCheck, Smartphone, Sparkles, Sun, Tag, Target, UserCheck, WandSparkles, Workflow, Wrench, type LucideIcon } from "lucide-react";
import { shuffle } from "../utils/random";

/** Une vraie icône par mot (aucun emoji dans l'application). Un mot inconnu reçoit le livre par défaut. */
const WORD_ICONS: Record<string, LucideIcon> = {
  "ia (intelligence artificielle)": Brain, "donnée": Database, "algorithme": Workflow, "modèle": Puzzle, "application": Smartphone,
  "chatbot": Bot, "prompt": WandSparkles, "programme": Code, "technologie": Cpu, "pixel": Grid3x3, "biais": Scale, "deepfake": Drama,
  "exemple": Lightbulb, "indice": Search, "vie privée": Lock, "assistant vocal": Mic, "suggestion": Sparkles, "prédire": Compass,
  "outil": Wrench, "catégorie": FolderTree, "intrus": CircleHelp, "critère": ListChecks, "entraînement": Target, "étiquette": Tag,
  "flou": Blend, "caractéristique": Shapes, "contre-jour": Sun, "tester": FlaskConical, "reconnaissance vocale": AudioLines,
  "mot-clé": KeyRound, "question claire": MessageCircle, "dialogue": MessagesSquare, "ia générative": Palette, "consigne": Pencil,
  "auteur": Quote, "transparent": Eye, "donnée personnelle": Database, "droit à l’image": Camera, "droit à l'image": Camera,
  "adulte de confiance": UserCheck, "bouclier numérique": ShieldCheck, "fausse information": Newspaper, "source": FileSearch,
  "image truquée": ScanSearch, "preuve": BadgeCheck, "besoin": Focus, "faisable": Layers, "prototype": Boxes, "projet": Rocket,
};

export function WordIcon({ word, size = 48, color = "currentColor" }: { word: string; size?: number; color?: string }) {
  const Icon = WORD_ICONS[word.toLowerCase()] ?? BookOpen;
  return <Icon size={size} color={color} strokeWidth={1.8} aria-hidden="true" />;
}

export type DictionaryEntry = { word: string; definition: string; example: string; icon: string; bg: string; lesson: { id: string; title: string } | null; isNew: boolean };

export type GlossaryTermDto = { word: string; definition: string; example: string; icon: string; background: string; lesson: { id: string; title: string } | null; isNew: boolean };

/** Ce que le serveur dit de l'avancée de l'enfant : combien de mots il a trouvés, combien il en reste, et un indice sur le prochain. */
export type GlossaryMeta = { total: number; discovered: number; next: { lessonId: string; lessonTitle: string } | null; lockedForLearner: boolean };

export type Filter = "all" | "fav" | "new";

export const FAVORITES_KEY = "keuria_dictionary_favorites";

const QUIZ_LENGTH = 5;

export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((w): w is string => typeof w === "string") : [];
  } catch {
    return []; // stockage indisponible (navigation privée) : les favoris restent facultatifs
  }
}

/** Titre d'avancement selon la part du dictionnaire déjà découverte. */
export function explorerTitle(discovered: number, total: number): string {
  if (discovered === 0) return "Dictionnaire tout neuf";
  const ratio = total > 0 ? discovered / total : 0;
  if (ratio >= 1) return "Maître des mots";
  if (ratio >= 0.6) return "Savant des mots";
  if (ratio >= 0.3) return "Explorateur des mots";
  return "Petit curieux";
}

export type QuizQuestion = { entry: DictionaryEntry; choices: string[] };

/** Cinq questions « quel mot correspond à cette définition ? », tirées des mots que l'enfant a déjà découverts. */
export function buildQuiz(entries: DictionaryEntry[]): QuizQuestion[] {
  return shuffle(entries).slice(0, QUIZ_LENGTH).map((entry) => {
    const others = shuffle(entries.filter((e) => e.word !== entry.word)).slice(0, 2).map((e) => e.word);
    return { entry, choices: shuffle([entry.word, ...others]) };
  });
}

export function playPop() {
  try {
    const C = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
    setTimeout(() => void ctx.close(), 200);
  } catch { /* l'audio est facultatif (navigateur sans AudioContext ou son bloqué) : on continue sans son */ }
}
