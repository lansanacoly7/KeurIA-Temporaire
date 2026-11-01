/*
 * Appels du cahier de classe (élève d'école) : accueil du jour, règles et
 * devoirs. Le jeton CSRF des requêtes mutantes est ajouté automatiquement par
 * app/csrf-fetch.tsx (enveloppe globale de window.fetch).
 */
import { classBoardResult, type AssignmentsPayload, type ClassBoardResult, type Restrictions, type Today } from "./cahierLogic";

export type AnnouncementAnswer = { myChoice: number; counts: number[] };

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { credentials: "same-origin" });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** GET /api/eleve/aujourdhui : séance en cours, annonces actives, parcours et règles effectives. */
export function fetchToday(): Promise<Today | null> {
  return getJson<Today>("/api/eleve/aujourdhui");
}

/** GET /api/eleve/restrictions : les mêmes règles, avec les phrases prêtes pour l'enfant. */
export function fetchRestrictions(): Promise<Restrictions | null> {
  return getJson<Restrictions>("/api/eleve/restrictions");
}

/** GET /api/student/assignments : les devoirs de SA classe (et sa classe elle-même). */
export function fetchAssignments(): Promise<AssignmentsPayload | null> {
  return getJson<AssignmentsPayload>("/api/student/assignments");
}

/** GET /api/eleve/classement : le classement de SA classe, ou pourquoi il est fermé (403 « coupé par … »). */
export async function fetchClassBoard(): Promise<ClassBoardResult> {
  try {
    const res = await fetch("/api/eleve/classement", { credentials: "same-origin", cache: "no-store" });
    return classBoardResult(res.status, await res.json().catch(() => null));
  } catch {
    return { kind: "error" };
  }
}

/** GET ensemble de l'accueil : jour + devoirs + règles (les trois appels du cahier). */
export async function fetchCahierData(): Promise<{ day: Today | null; hw: AssignmentsPayload | null; rules: Restrictions | null }> {
  const [day, hw, rules] = await Promise.all([fetchToday(), fetchAssignments(), fetchRestrictions()]);
  return { day, hw, rules };
}

/** POST /api/eleve/annonces/<id>/reponse : répondre à un sondage, ou changer de réponse. */
export async function answerAnnouncement(id: number, choice: number): Promise<AnnouncementAnswer | null> {
  try {
    const res = await fetch(`/api/eleve/annonces/${id}/reponse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ choice }),
    });
    return res.ok ? ((await res.json()) as AnnouncementAnswer) : null;
  } catch {
    return null;
  }
}
