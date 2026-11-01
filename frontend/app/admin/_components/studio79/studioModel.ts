import { Award, BookOpen, Gamepad2, HelpCircle, Lightbulb, Paintbrush, Sparkles, Video, type LucideIcon } from "lucide-react";
import { CAST_LABELS } from "@/app/dashboard/parcours79/content";
import type { CastId, Pose, Screen } from "@/app/dashboard/parcours79/types";
import { newRound, uid } from "./roundSchemas";

export type ScreenKind = Screen["kind"];

/** Les sortes d'écrans d'une leçon (celles que le lecteur de l'enfant sait afficher). */
export const SCREEN_KINDS: Record<ScreenKind, { label: string; icon: LucideIcon; description: string; tone: string }> = {
  story: { label: "Histoire", icon: BookOpen, description: "Palou raconte, avec une image.", tone: "mint" },
  discover: { label: "Découvre", icon: Lightbulb, description: "Le mot nouveau de la leçon.", tone: "lemon" },
  ai: { label: "Et l'IA ?", icon: Sparkles, description: "Le lien avec l'intelligence artificielle.", tone: "lavender" },
  media: { label: "Média & Actions", icon: Video, description: "Vidéo, lien ou bouton d'action.", tone: "coral" },
  play: { label: "À toi de jouer", icon: Gamepad2, description: "Une ou plusieurs activités à faire.", tone: "sky" },
  why: { label: "Pourquoi ?", icon: HelpCircle, description: "Des questions pour comprendre.", tone: "sky" },
  create: { label: "Crée", icon: Paintbrush, description: "L'enfant compose sa création.", tone: "rose" },
  bravo: { label: "Je retiens", icon: Award, description: "La phrase à retenir. Toujours en dernier.", tone: "mint" },
};

export const KIND_ORDER: ScreenKind[] = ["story", "discover", "ai", "media", "play", "why", "create", "bravo"];

export const POSES: Pose[] = ["Content", "Surpris", "Intelligent", "Question", "Reflexion", "Celebration", "Hero", "Encouragement", "Calme", "Rire", "Triste", "Determine", "Gentil", "Parfait", "trois_quart"];

export const POSE_LABELS: Record<Pose, string> = {
  Content: "Content", Surpris: "Surpris", Intelligent: "Intelligent", Question: "Se pose une question", Reflexion: "Réfléchit", Celebration: "Fête",
  Hero: "Héros", Encouragement: "Encourage", Calme: "Calme", Rire: "Rit", Triste: "Triste", Determine: "Déterminé", Gentil: "Gentil", Parfait: "Parfait", trois_quart: "De trois quarts",
};

export const CAST: { id: CastId; label: string }[] = Object.entries(CAST_LABELS).map(([id, label]) => ({ id: id as CastId, label }));

export function newScreen(kind: ScreenKind): Screen {
  switch (kind) {
    case "media":
      return {
        kind: "media",
        pose: "Content",
        text: "Regarde cette vidéo avec moi !",
        media: { type: "video-link", url: "" },
        actions: [],
      };
    case "play":
    case "why":
      return { kind, pose: "Content", text: "", rounds: [newRound("choose")] };
    case "discover":
      return { kind, pose: "Intelligent", text: "", word: { terme: "", sens: "" } };
    case "create":
      return { kind, pose: "Content", text: "", carnet: "", steps: [{ prompt: "", count: 1, tray: [{ id: uid("t"), label: "" }, { id: uid("t"), label: "" }] }] };
    case "bravo":
      return { kind, pose: "Parfait", text: "", learned: "" };
    default:
      return { kind, pose: "Content", text: "" };
  }
}

/** Début du texte d'un écran, pour la liste (jamais vide). */
export function screenExcerpt(screen: Screen): string {
  const text = (screen.text || "").trim() || ("learned" in screen && screen.learned) || "";
  return text ? text.slice(0, 70) : "Écran vide";
}

/** Mêmes règles de lecture que le serveur (phrases terminées par . ! ? …) : sert aux compteurs affichés pendant la frappe. */
export function sentenceStats(text: string): { sentences: number; longest: number } {
  const pieces = text.trim().split(/(?<=[.!?…])\s+/);
  const lengths = pieces.map(p => p.split(/\s+/).filter(w => /\w/.test(w)).length).filter(n => n > 0);
  return { sentences: lengths.length, longest: lengths.length ? Math.max(...lengths) : 0 };
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
