/**
 * Espace d'arrivée de chaque compte (il n'y a plus de page d'accueil) :
 * utilisé par la racine « / », par la page de connexion et par le skeleton
 * affiché pendant le chargement. Aucun import serveur : sert aussi côté navigateur.
 */

/** Forme du skeleton : espaces de gestion (école, enseignant, admin), parent ou élève. */
export type SpaceKind = "gestion" | "parent" | "eleve";

/** schoolId inconnu (réponse de connexion) : l'espace enseignant renvoie lui-même un enseignant sans école vers /dashboard. */
export function homePathFor(role: string | undefined, schoolId?: number | null) {
  if (role === "admin") return "/admin";
  if (role === "admin_ecole") return "/ecole";
  if (role === "enseignant" && schoolId !== null) return "/enseignant";
  return "/dashboard";
}

/** « / » et « /dashboard » veulent dire « mon espace » ; toute autre page demandée est conservée. */
export function destinationFor(role: string | undefined, returnTo: string) {
  return returnTo === "/" || returnTo === "/dashboard" ? homePathFor(role) : returnTo;
}

export function spaceKindFor(path: string, role: string | undefined): SpaceKind {
  if (/^\/(ecole|enseignant|admin)(\/|$)/.test(path)) return "gestion";
  return role === "parent" ? "parent" : "eleve";
}

// Rôle du compte connecté, mémorisé pour la durée de l'onglet : permet au
// chargement de /dashboard de montrer le bon skeleton (parent ou élève).
const ROLE_KEY = "keuria-space-role";

export function rememberSpaceRole(role: string | undefined) {
  try {
    if (role) sessionStorage.setItem(ROLE_KEY, role);
  } catch {
    // Stockage indisponible : le skeleton élève sera affiché par défaut.
  }
}

export function readSpaceRole(): string | null {
  try {
    return sessionStorage.getItem(ROLE_KEY);
  } catch {
    return null;
  }
}
