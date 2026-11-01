"use client";

import "./parcours79.css";
import { PalouImg } from "./Img79";

/** Durée d'affichage de l'écran de chargement entre deux leçons : 4 secondes (voulu : entre 3 et 4 s, jamais plus de 5 s). */
export const TRANSITION_MS = 4000;

/**
 * Petit écran de chargement entre deux leçons (« Cours suivant », « Refaire ») : sans lui, la leçon suivante apparaît d'un coup,
 * trop vite pour que l'enfant comprenne ce qui se passe. Palou saute, une barre se remplit, le titre du prochain cours s'affiche.
 */
export function LessonTransition79({ kind, title }: { kind: "next" | "replay"; title: string }) {
  return (
    <div className="p79 p79-transition" role="status" aria-live="polite" aria-label={kind === "next" ? "Ouverture du cours suivant" : "On refait la leçon"}>
      <div className="p79-transition-card">
        <PalouImg pose={kind === "next" ? "Determine" : "Encouragement"} className="p79-transition-palou" />
        <span className="p79-transition-kicker">{kind === "next" ? "Cours suivant" : "On refait la leçon"}</span>
        <h3>{title}</h3>
        <div className="p79-transition-bar" aria-hidden="true"><i style={{ animationDuration: `${TRANSITION_MS}ms` }} /></div>
        <p>{kind === "next" ? "Palou prépare la suite…" : "Palou prépare la leçon…"}</p>
      </div>
    </div>
  );
}
