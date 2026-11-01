/**
 * Contenu publié par le studio : les leçons 7-9 modifiées par l'administration, gardées en mémoire côté enfant.
 *
 * Le site embarque les 40 leçons (frontend/content/parcours79/mXX.json). Quand un administrateur publie une modification
 * depuis le studio, le serveur la sert sur `GET /api/curriculum/content79/…` : c'est ce module qui va la chercher, sans
 * tâche planifiée côté serveur — le lecteur reprend ce qu'il a en mémoire et rafraîchit périodiquement.
 *
 * Règles :
 *  - `refreshStudioContent` : manifeste des leçons modifiées, puis, pour chaque version pas encore en mémoire, le contenu.
 *    Idempotent et jamais d'exception : en cas d'erreur réseau on garde simplement ce qu'on a ;
 *  - `ensureLesson` : une seule leçon, bornée à 1,5 s, avant d'ouvrir le lecteur (un enfant qui ouvre une leçon publiée
 *    il y a peu a la bonne version même si la page est ouverte depuis longtemps) ;
 *  - `getStudioLesson` : la version du studio si elle est en mémoire, sinon `undefined` (on lit le JSON embarqué) ;
 *  - un `404` = contenu d'origine : rien à garder.
 */
import type { LessonContent } from "./types";

/** Délai maximum d'une requête du rafraîchissement périodique (au-delà : on garde ce qu'on a). */
const REFRESH_TIMEOUT_MS = 4000;
/** Délai maximum de `ensureLesson` : au-delà, on ouvre la leçon avec ce qu'on a déjà. */
export const ENSURE_TIMEOUT_MS = 1500;
/** Une publication devient visible sans aucune tâche serveur : on rafraîchit le manifeste régulièrement. */
export const STUDIO_REFRESH_MS = 5 * 60 * 1000;

/** `GET /api/curriculum/content79/` : leçons modifiées (les autres restent celles du site). */
type Manifest = Record<string, { version: number; source: string }>;

/** Une leçon du studio en mémoire : le numéro de version en ligne et son contenu. */
interface Held {
  version: number;
  content: LessonContent;
}

const lessons = new Map<string, Held>();
/** Rafraîchissement en cours : une seule requête à la fois (rafraîchir est idempotent). */
let refreshing: Promise<void> | null = null;

/** Réponse utile : `404` = contenu d'origine, tout le reste vaut « erreur » (on garde ce qu'on a). */
type Reply = { status: number; data: unknown } | null;

/**
 * Lecture d'une route publique du contenu, bornée dans le temps. Ne lève jamais : réseau coupé, délai dépassé, 500 ou
 * corps illisible rendent simplement `null`, et le lecteur continue avec ce qu'il a déjà.
 */
async function getJson(path: string, timeoutMs: number): Promise<Reply> {
  if (typeof fetch !== "function") return null;
  const controller = typeof AbortController === "function" ? new AbortController() : undefined;
  const request = (async (): Promise<Reply> => {
    try {
      const response = await fetch(`/api/curriculum/${path}`, { credentials: "same-origin", signal: controller?.signal });
      if (response.status === 404) return { status: 404, data: null };
      if (!response.ok) return null;
      return { status: response.status, data: await response.json() };
    } catch {
      return null;
    }
  })();
  // Le délai est tenu même si `fetch` ne tient pas l'AbortSignal : la course ci-dessous rend `null` à l'heure.
  const bounded = new Promise<Reply>(resolve => {
    setTimeout(() => { controller?.abort(); resolve(null); }, timeoutMs);
  });
  return Promise.race([request, bounded]);
}

/** Valide la réponse `…/content79/<id>/` : `{ version, content }` avec un vrai contenu de leçon. */
function heldFrom(data: unknown): Held | null {
  if (!data || typeof data !== "object") return null;
  const { version, content } = data as { version?: unknown; content?: unknown };
  if (typeof version !== "number" || !content || typeof content !== "object") return null;
  if (!Array.isArray((content as LessonContent).screens)) return null;
  return { version, content: content as LessonContent };
}

/**
 * Met à jour la mémoire avec le contenu en ligne : manifeste, puis les seules leçons dont la version n'est pas déjà
 * connue. Idempotent (une version déjà en mémoire n'est pas rechargée) et sans exception.
 */
export async function refreshStudioContent(): Promise<void> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const manifest = await getJson("content79/", REFRESH_TIMEOUT_MS);
    if (!manifest || manifest.status !== 200 || !manifest.data || typeof manifest.data !== "object") return;
    const entries = manifest.data as Manifest;
    // Une leçon disparue du manifeste est revenue au contenu d'origine : elle quitte la mémoire.
    for (const id of [...lessons.keys()]) if (!(id in entries)) lessons.delete(id);
    await Promise.all(
      Object.entries(entries).map(async ([id, entry]) => {
        const held = lessons.get(id);
        if (held && held.version === entry.version) return;          // déjà en mémoire : rien à recharger
        const got = await getJson(`content79/${encodeURIComponent(id)}/`, REFRESH_TIMEOUT_MS);
        if (!got) return;                                            // panne ou délai : on garde ce qu'on a
        if (got.status === 404) { lessons.delete(id); return; }      // contenu d'origine : ne rien garder
        const fresh = heldFrom(got.data);
        if (!fresh || fresh.version !== entry.version) return;       // la version a bougé : le prochain tour s'en occupe
        lessons.set(id, fresh);
      }),
    );
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Charge une seule leçon, au plus `ENSURE_TIMEOUT_MS`, puis on continue avec ce qu'on a. Jamais d'exception. */
export async function ensureLesson(id: string): Promise<void> {
  const got = await getJson(`content79/${encodeURIComponent(id)}/`, ENSURE_TIMEOUT_MS);
  if (!got) return;                                                 // délai dépassé ou réseau coupé : inchangé
  if (got.status === 404) { lessons.delete(id); return; }           // contenu d'origine : ne rien garder
  const fresh = heldFrom(got.data);
  if (!fresh) return;
  const held = lessons.get(id);
  if (held && held.version === fresh.version) return;               // même version : on garde l'objet déjà affiché
  lessons.set(id, fresh);
}

/** La version publiée depuis le studio, si elle est en mémoire ; sinon le lecteur lit le JSON embarqué. */
export function getStudioLesson(id: string): LessonContent | undefined {
  return lessons.get(id)?.content;
}

/**
 * Rafraîchit au premier affichage du parcours 7-9, au retour sur l'onglet, puis toutes les `STUDIO_REFRESH_MS` :
 * une leçon publiée devient visible sans aucune tâche planifiée côté serveur. Renvoie l'arrêt (démonter le composant).
 */
export function startStudioRefresh(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  void refreshStudioContent();
  const onVisible = () => {
    if (document.visibilityState === "visible") void refreshStudioContent();
  };
  document.addEventListener("visibilitychange", onVisible);
  const timer = window.setInterval(() => void refreshStudioContent(), STUDIO_REFRESH_MS);
  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.clearInterval(timer);
  };
}

/** Remise à zéro de la mémoire : pour les tests seulement (le lecteur n'en a pas besoin). */
export function resetStudioContent(): void {
  lessons.clear();
  refreshing = null;
}
