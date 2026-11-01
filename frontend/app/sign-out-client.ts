"use client";

// La déconnexion doit modifier l'état serveur (détruire la session Django),
// donc c'est un POST, pas une navigation GET.
// Données locales propres à un compte : effacées à la déconnexion pour que le
// compte suivant sur le même appareil (ex. tablette partagée en classe) ne
// récupère ni la progression, ni les séries/erreurs par enfant, ni les préférences du précédent.
// On efface par préfixe (les clés par enfant, comme keria_errors_<id>, ne sont pas listables d'avance) :
// tout nouveau réglage nommé keria_* est ainsi purgé sans qu'il faille penser à l'ajouter ici.
const ACCOUNT_LOCAL_PREFIXES = ["keria_", "kEur_"];
const ACCOUNT_LOCAL_KEYS = ["jeux_defis_tutorial_completed", "lastAvatarId"];

function purgeLocalAccountData() {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (ACCOUNT_LOCAL_KEYS.includes(key) || ACCOUNT_LOCAL_PREFIXES.some((p) => key.startsWith(p)))) doomed.push(key);
    }
    doomed.forEach((key) => localStorage.removeItem(key));
    sessionStorage.clear();
  } catch {
    // Stockage indisponible (navigation privée, blocage) : rien à purger.
  }
}

/** Demande au service worker d'oublier tout ce qu'il a gardé (appareil partagé : rien ne doit rester pour le compte suivant). */
function clearServiceWorkerCaches() {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_CACHES" });
  } catch {
    // Pas de service worker : rien à vider.
  }
}

export async function signOut(returnTo = "/connexion") {
  purgeLocalAccountData();
  clearServiceWorkerCaches();
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    // Même si le serveur est injoignable, on quitte l'espace connecté.
    window.location.href = returnTo;
  }
}
