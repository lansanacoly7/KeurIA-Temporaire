// Envoie au serveur les erreurs JavaScript vues dans le navigateur d'un enfant (voir backend/keuria/monitoring.py).
// Aucune donnée personnelle : seulement le message, la pile et le chemin de la page (sans paramètres). Jamais d'exception ici :
// un rapport qui échoue ne doit pas faire planter l'application.

const ENDPOINT = "/api/monitoring/client-error";
const MAX_PER_PAGE_LOAD = 5;      // une page cassée qui boucle n'inonde pas le serveur
const SAME_ERROR_DELAY_MS = 30_000;

export type ClientErrorKind = "error" | "unhandledrejection" | "boundary";

const recent = new Map<string, number>();
let sent = 0;

export function resetClientErrorReports() {
  recent.clear();
  sent = 0;
}

export function reportClientError(kind: ClientErrorKind, error: unknown, digest?: string): boolean {
  try {
    if (typeof window === "undefined" || sent >= MAX_PER_PAGE_LOAD) return false;
    const err = error as { message?: unknown; stack?: unknown } | string | null | undefined;
    const message = String(typeof err === "string" ? err : err?.message ?? err ?? "erreur inconnue").slice(0, 1900);
    const stack = String((typeof err === "object" && err?.stack) || "").slice(0, 5900);
    const key = `${kind}|${message}`;
    const now = Date.now();
    if (now - (recent.get(key) ?? -Infinity) < SAME_ERROR_DELAY_MS) return false;
    recent.set(key, now);
    sent += 1;
    const body = JSON.stringify({ kind, message, stack, path: window.location.pathname.slice(0, 290), digest: digest ?? "" });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      if (navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }))) return true;
    }
    void fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true, credentials: "omit" }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}
