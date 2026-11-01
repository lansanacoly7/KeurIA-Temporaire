"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Signale au serveur que la personne utilise réellement l'application.
 *
 * Le serveur déconnecte après un long moment SANS action (2 h ; 30 min pour les administrateurs). Les requêtes
 * d'arrière-plan (notifications, chronomètre de l'enfant…) ne comptent pas : sinon un onglet oublié ouvert ne
 * expirerait jamais. Ce signal est donc envoyé :
 *   - à chaque ouverture ou changement de page (rafraîchir ou naviguer ne déconnecte jamais),
 *   - au retour sur l'onglet,
 *   - quand la personne clique, tape, touche l'écran, fait défiler ou bouge le pointeur (au plus une fois par minute).
 * Si le serveur répond que la session a expiré, retour à la page de connexion puis à la page courante.
 */

// Espaces réservés aux comptes connectés : ailleurs (accueil, pages légales), aucun signal n'est envoyé.
const SIGNED_IN_AREAS = ["/dashboard", "/admin", "/ecole", "/enseignant", "/parent", "/profile"];
const MIN_GAP_MS = 60_000;
const INPUT_EVENTS = ["pointerdown", "pointermove", "keydown", "touchstart", "scroll"] as const;

export default function ActivityPing() {
  const pathname = usePathname();
  const inSignedInArea = SIGNED_IN_AREAS.some((area) => pathname === area || pathname.startsWith(`${area}/`));

  useEffect(() => {
    if (!inSignedInArea) return;
    let lastSent = 0;
    let wasSignedIn = false;
    let expired = false;

    const goToLogin = () => {
      if (expired) return;
      expired = true;
      const returnTo = window.location.pathname + window.location.search;
      window.location.assign(`/connexion?expired=1&returnTo=${encodeURIComponent(returnTo)}`);
    };

    const ping = async (force: boolean) => {
      const now = Date.now();
      if (expired || (!force && now - lastSent < MIN_GAP_MS)) return;
      lastSent = now;
      try {
        const response = await fetch("/api/auth/activity", { method: "POST", credentials: "same-origin" });
        if (response.status === 401) return goToLogin();
        const data = await response.json().catch(() => null);
        if (data?.active) wasSignedIn = true;
        else if (wasSignedIn) goToLogin(); // connecté il y a un instant, plus maintenant : la session a expiré
      } catch {
        // Réseau indisponible : le prochain geste renverra le signal.
      }
    };

    const onInput = () => void ping(false);
    const onVisible = () => { if (document.visibilityState === "visible") void ping(true); };

    void ping(true); // ouvrir ou changer de page est une action
    INPUT_EVENTS.forEach((name) => document.addEventListener(name, onInput, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      INPUT_EVENTS.forEach((name) => document.removeEventListener(name, onInput, { capture: true }));
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [inSignedInArea, pathname]);

  return null;
}
