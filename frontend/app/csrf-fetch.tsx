"use client";

/*
 * Protection CSRF pour l'API Django.
 *
 * Django (SessionAuthentication) exige l'en-tête X-CSRFToken sur toute requête
 * POST/PUT/PATCH/DELETE d'un utilisateur connecté. Plutôt que de modifier
 * chaque appel fetch() de l'application, on enveloppe window.fetch une seule
 * fois : les requêtes mutantes vers /api/* de la même origine reçoivent
 * automatiquement le jeton lu dans le cookie `csrftoken`.
 *
 * L'installation se fait au chargement du module (avant l'hydratation), pour
 * couvrir aussi les requêtes lancées dans les useEffect des pages.
 */

const CSRF_COOKIE = "csrftoken";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function readCookie(name: string) {
  const match = document.cookie.split("; ").find(part => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function requestUrl(input: RequestInfo | URL) {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  return new URL(raw, window.location.href);
}

function installCsrfFetch() {
  const w = window as typeof window & { __keurCsrfFetch?: boolean };
  if (w.__keurCsrfFetch) return;
  w.__keurCsrfFetch = true;

  const nativeFetch = window.fetch.bind(window);
  let pendingToken: Promise<unknown> | null = null;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = requestUrl(input);
    if (!UNSAFE_METHODS.has(method) || url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) {
      return nativeFetch(input, init);
    }

    if (!readCookie(CSRF_COOKIE)) {
      // Premier appel mutant sans cookie : on demande à Django de le poser.
      pendingToken ??= nativeFetch("/api/auth/csrf", { credentials: "same-origin" }).finally(() => { pendingToken = null; });
      await pendingToken.catch(() => undefined);
    }

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const token = readCookie(CSRF_COOKIE);
    if (token && !headers.has("X-CSRFToken")) headers.set("X-CSRFToken", token);
    return nativeFetch(input, { ...init, headers, credentials: init?.credentials ?? "same-origin" });
  };
}

if (typeof window !== "undefined") installCsrfFetch();

export default function CsrfFetch() {
  return null;
}
