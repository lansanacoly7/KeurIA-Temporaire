import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

/** schoolId : école de rattachement (direction, enseignants et élèves d'une école), sinon null. */
export type LocalUser = { id: number; displayName: string; email: string; role: string; schoolId: number | null; isSchoolStudent?: boolean; ageGroup?: string | null; schoolSlug?: string | null };
// Cookie de session Django (HttpOnly, voir SESSION_COOKIE_NAME côté backend).
// Next.js ne l'interprète pas : il le relaie à Django pour identifier l'utilisateur.
export const SESSION_COOKIE = "keur_ia_session";
// URL de Django vue depuis le serveur Next.js (SSR). Même cible que le proxy de next.config.ts.
// En production, l'adresse doit être donnée : sans elle, chaque appel échouerait en silence vers localhost.
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build" ||
  process.argv.some((a) => a.includes("build"));
if (process.env.NODE_ENV === "production" && !process.env.DJANGO_API_URL && !isBuildPhase) {
  throw new Error("DJANGO_API_URL doit être défini en production (adresse de Django vue depuis Next.js).");
}
export const DJANGO_API_URL = process.env.DJANGO_API_URL ?? "http://127.0.0.1:8000";

// Derrière un proxy, Django redirige en 301 vers HTTPS toute requête qu'il croit en clair
// (SECURE_SSL_REDIRECT). Les appels du rendu serveur joignent Django par la boucle locale, en HTTP :
// sans cet en-tête, Django répond une redirection vers https://127.0.0.1:<port>, où gunicorn ne parle
// pas TLS. Le fetch échoue alors, et l'utilisateur paraît déconnecté sur TOUTE page rendue côté serveur.
// C'est le même en-tête que celui posé par nginx pour les requêtes venant du navigateur.
export const SSR_HEADERS: Record<string, string> = { "X-Forwarded-Proto": "https" };

export const getLocalUser = cache(async function getLocalUser(): Promise<LocalUser | null> {
  const jar = await cookies();
  const sessionCookie = jar.get(SESSION_COOKIE)?.value;
  
  if (!sessionCookie) return null;

  try {
    // Interroger le backend Django pour obtenir le profil utilisateur
    // On passe le cookie de session pour que Django puisse l'identifier
    const res = await fetch(`${DJANGO_API_URL}/api/profile`, {
      headers: {
        Cookie: `${SESSION_COOKIE}=${encodeURIComponent(sessionCookie)}`,
        ...SSR_HEADERS,
      },
      // Pas de cache pour l'authentification
      cache: 'no-store'
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data && data.profile && data.profile.email) {
      return {
        id: Number(data.profile.id),
        displayName: data.profile.displayName,
        email: data.profile.email,
        role: data.profile.role,
        schoolId: data.profile.schoolId ?? null,
        isSchoolStudent: Boolean(data.profile.isSchoolStudent),
        ageGroup: data.profile.ageGroup ?? null,
        schoolSlug: data.profile.schoolSlug ?? null,
      };
    }
    return null;
  } catch {
    console.error("Erreur de connexion SSR avec Django (backend injoignable ?)");
    return null;
  }
});

export async function requireLocalUser(returnTo: string) {
  const user = await getLocalUser();
  if (user) return user;
  redirect(appLoginPath(returnTo));
}

export function appLoginPath(returnTo: string) {
  const target = safeReturnTo(returnTo);
  // L'administration de la plateforme a sa propre page de connexion, distincte de celle des utilisateurs.
  const page = target === "/admin" || target.startsWith("/admin/") ? "/connexion/admin" : "/connexion";
  return `${page}?returnTo=${encodeURIComponent(target)}`;
}

export function localSignOutPath(returnTo = "/") {
  // Conservé pour la compatibilité des props : la déconnexion réelle est un
  // POST fait par signOut() (app/sign-out-client.ts), pas une navigation.
  return `/api/auth/logout?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
}

export function safeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || value.startsWith("/connexion") || value.startsWith("/api/auth")) {
    return "/dashboard";
  }
  return value;
}
