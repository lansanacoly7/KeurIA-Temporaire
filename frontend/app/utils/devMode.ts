"use client";

import { useEffect, useState } from "react";

/**
 * Utilitaire pour le mode test & développement de kEur IA.
 * Permet de lever instantanément tous les verrous de progression, limites de temps,
 * paliers de programmation et conditions d'accès aux mondes.
 *
 * SÉCURITÉ : ce mode n'existe QUE dans `next dev` (NODE_ENV === "development"). En production (et dans les tests), il est toujours
 * éteint, quoi qu'il y ait dans le stockage du navigateur ou dans l'adresse : un enfant ne doit jamais pouvoir lever ses verrous
 * ni ses limites de temps. En développement il est éteint par défaut ; on l'active exprès (`?dev=1` ou `keuriaDev.enable()` dans la console).
 */
const DEV_BUILD = process.env.NODE_ENV === "development";

export function isDevMode(): boolean {
  if (!DEV_BUILD) return false;
  if (typeof window === "undefined") return false;
  try {
    const val = localStorage.getItem("keria_dev_mode");
    if (val === "false") return false;
    if (val === "true") return true;
    if (localStorage.getItem("keuria_dev_unlock_all") === "true") return true;

    // Détection URL (?dev=1 ou ?mode=dev)
    if (window.location.search.includes("dev=1") || window.location.search.includes("mode=dev")) {
      localStorage.setItem("keria_dev_mode", "true");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function setDevMode(active: boolean) {
  if (!DEV_BUILD || typeof window === "undefined") return;
  try {
    localStorage.setItem("keria_dev_mode", active ? "true" : "false");
    localStorage.setItem("keuria_dev_unlock_all", active ? "true" : "false");
    window.dispatchEvent(new CustomEvent("keria_dev_mode_change", { detail: { active } }));
  } catch {}
}

export function useDevMode(): [boolean, (active: boolean) => void] {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isDevMode());

    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ active: boolean }>;
      if (custom.detail && typeof custom.detail.active === "boolean") {
        setActive(custom.detail.active);
      } else {
        setActive(isDevMode());
      }
    };

    window.addEventListener("keria_dev_mode_change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("keria_dev_mode_change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return [active, setDevMode];
}

// Outil en console pour contrôle rapide
if (DEV_BUILD && typeof window !== "undefined") {
  (window as unknown as { keuriaDev: Record<string, unknown> }).keuriaDev = {
    enable: () => {
      setDevMode(true);
      console.log("%c[kEur IA] Mode Dev & Test ACTIVÉ : tous les verrous sont débloqués.", "color: #10b981; font-weight: 800; font-size: 13px;");
    },
    disable: () => {
      setDevMode(false);
      console.log("%c[kEur IA] Mode Dev DÉSACTIVÉ : verrous standards rétablis.", "color: #f59e0b; font-weight: 800; font-size: 13px;");
    },
    status: () => isDevMode(),
  };
}
