import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Entier enregistré dans localStorage (0 s'il est absent ou illisible), lisible PENDANT l'affichage sans casser le rendu
 * côté serveur : le serveur n'a pas de localStorage et affiche 0, puis le navigateur affiche la vraie valeur sans
 * avertissement d'hydratation (useSyncExternalStore).
 */
export function useStoredNumber(key: string): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return parseInt(window.localStorage.getItem(key) || "0", 10) || 0;
      } catch {
        return 0; // stockage indisponible (navigation privée, blocage)
      }
    },
    () => 0,
  );
}

/**
 * Valeur qui dépend du navigateur (localStorage…), lisible PENDANT l'affichage : le serveur affiche `serverValue`, puis le
 * navigateur la vraie valeur, sans erreur d'hydratation. `read` doit renvoyer une valeur simple (booléen, nombre, texte).
 */
export function useClientValue<T extends string | number | boolean>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(subscribe, read, () => serverValue);
}
