"use client";

import PHRASES from "../../../content/voix-ui.json";
import { speakLesson } from "./voice";

/**
 * Les phrases de Palou en dehors des leçons (tutoriel, accueil, défi du jour, jeux, messages « Finis d'abord… »).
 * Chaque phrase de `content/voix-ui.json` a son fichier de voix officielle : public/audio/palou/ui/<clé>.mp3.
 * Si le fichier n'existe pas encore, la voix du navigateur prend le relais (rien ne casse) ; un test vérifie que chaque phrase a son fichier.
 */
export type UiKey = keyof typeof PHRASES;

export const UI_PHRASES = PHRASES as Record<UiKey, string>;
export const uiClipSrc = (key: string) => `/audio/palou/ui/${key}.mp3`;

/** Fait dire une phrase à Palou ; renvoie une promesse qui se termine quand il a fini de parler. */
export function sayUi(key: UiKey, options: { force?: boolean } = {}): Promise<void> {
  return speakLesson([{ src: uiClipSrc(key), text: UI_PHRASES[key] }], options);
}

/** Pour une phrase dont la clé vient des données (niveau, mission) : ne fait rien si la clé n'existe pas. */
export function sayUiIfKnown(key: string, options: { force?: boolean } = {}): Promise<void> {
  return key in UI_PHRASES ? sayUi(key as UiKey, options) : Promise.resolve();
}
