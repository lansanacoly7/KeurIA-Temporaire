"use client";

import { useCallback, useEffect, useState } from "react";

/** Réglages audio de l'enfant, gardés sur l'appareil (effacés à la déconnexion : clé « keria_… »). */
export interface P79Settings {
  /** Petits sons (toucher, réussite, étoile…). */
  sound: boolean;
  /** Palou parle tout seul à chaque écran ; éteinte, il se tait sauf au bouton « Écouter ». */
  voice: boolean;
}

const KEY = "keria_p79_settings";
export const DEFAULT_SETTINGS: P79Settings = { sound: true, voice: true };

let current: P79Settings = DEFAULT_SETTINGS;
let loaded = false;

/** Valeur courante, lisible hors de React (sons, voix). */
export function getSettings(): P79Settings {
  if (!loaded && typeof window !== "undefined") { loaded = true; current = read(); }
  return current;
}

function read(): P79Settings {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    if (!raw) return DEFAULT_SETTINGS;
    const data = JSON.parse(raw) as Partial<P79Settings>;
    return {
      sound: data.sound ?? DEFAULT_SETTINGS.sound,
      voice: data.voice ?? DEFAULT_SETTINGS.voice,
    };
  } catch {
    return DEFAULT_SETTINGS; // stockage indisponible : on garde les valeurs par défaut
  }
}

export function saveSettings(next: P79Settings) {
  current = next;
  loaded = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* navigation privée ou stockage bloqué : le réglage vaut pour cette visite seulement */
  }
}

/** Hook : réglages + mise à jour. La lecture du stockage se fait après l'affichage (pas de décalage serveur/navigateur). */
export function useP79Settings(): [P79Settings, (patch: Partial<P79Settings>) => void] {
  const [settings, setSettings] = useState<P79Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const stored = getSettings();
    setSettings(stored);
  }, []);

  const update = useCallback((patch: Partial<P79Settings>) => {
    const next = { ...current, ...patch };
    saveSettings(next);
    setSettings(next);
  }, []);

  return [settings, update];
}
