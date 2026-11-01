/*
 * Appels à l'API Django des espaces école, enseignant et parent.
 *
 * - Même origine (/api/…), relayée par Next.js vers Django ; le jeton CSRF est
 *   ajouté automatiquement aux requêtes mutantes (voir app/csrf-fetch.tsx).
 * - Une erreur métier ({ error: "…" }) devient une EcoleApiError dont le message
 *   s'affiche tel quel dans les écrans.
 * - Session expirée (401) : retour à la page de connexion, puis à la page courante.
 */

/** Erreur « métier » affichable telle quelle (réponse 4xx de l'API). */
export class EcoleApiError extends Error {
  /** `data` : corps complet de la réponse d'erreur (ex. la liste des problèmes d'une leçon refusée à la publication). */
  constructor(message: string, readonly status = 400, readonly data: Record<string, unknown> | null = null) {
    super(message);
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      credentials: "same-origin",
      headers: body === undefined || isForm ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new EcoleApiError("Serveur injoignable. Vérifiez votre connexion puis réessayez.", 0);
  }

  if (response.status === 401 && typeof window !== "undefined") {
    const returnTo = window.location.pathname + window.location.search;
    window.location.assign(`/connexion?returnTo=${encodeURIComponent(returnTo)}`);
    throw new EcoleApiError("Votre session a expiré. Reconnectez-vous.", 401);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data.error === "string" ? data.error : "Une erreur est survenue. Réessayez.";
    throw new EcoleApiError(message, response.status, data && typeof data === "object" ? data : null);
  }
  return data as T;
}

/** « ?a=1&b=2 » en ignorant les valeurs vides. */
export function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== false) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
put: <T>(path: string, body: unknown) => request<T>("PUT" as Method, path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
