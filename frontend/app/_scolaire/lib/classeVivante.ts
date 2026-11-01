/*
 * Vie de la classe au quotidien (T10) : séance en cours, annonces et sondages,
 * parcours d'un élève — logique pure affichable, miroir des contrôles de
 * backend/apps/scolaire/services/classe_vivante.py.
 *
 * Le serveur reste juge : il renvoie {error: "..."} affiché tel quel dans les
 * écrans. Ces fonctions servent à réagir avant l'envoi et à formater l'affichage.
 */
import type { AgeTrack } from "./types";

/** Durée d'une séance, en minutes (bornes serveur). */
export const SESSION_MIN_MINUTES = 5;
export const SESSION_MAX_MINUTES = 120;
export const SESSION_TITLE_MAX = 80;
export const SESSION_LESSON_MAX = 30;
/** Annonces : au plus trois actives par classe. */
export const MAX_ACTIVE_ANNOUNCEMENTS = 3;
export const ANNOUNCEMENT_TITLE_MAX = 80;
export const ANNOUNCEMENT_TEXT_MAX = 300;
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 5;
export const POLL_OPTION_MAX = 60;
export const ENDS_IN_DAYS_MIN = 1;
export const ENDS_IN_DAYS_MAX = 30;

/** Les trois parcours d'âge proposés au sélecteur de parcours. */
export const TRACKS: readonly AgeTrack[] = ["7-9", "10-12", "13-15"];

/** Contrôle avant envoi : champ fautive + phrase à afficher sous ce champ. */
export type DraftError = { field: "title" | "lessonId" | "minutes" | "text" | "options" | "days" | "active"; message: string };

/** Message du premier champ fautive (undefined = champ valide). */
export function fieldError<T extends DraftError>(errors: T[], field: T["field"]): string | undefined {
  return errors.find(error => error.field === field)?.message;
}

/* ── Séance ─────────────────────────────────────────────────────────────── */

/** Temps restant « MM:SS » (04:35) ; passé une heure « H:MM:SS » (1:04:35). */
export function formatRemaining(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const clock = `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${clock}` : clock;
}

export type SessionDraft = { title: string; lessonId?: string; minutes: number };

/** Miroir de open_session() : titre obligatoire ≤ 80, leçon ≤ 30, durée 5–120 entière. */
export function validateSessionDraft(draft: SessionDraft): DraftError[] {
  const errors: DraftError[] = [];
  const title = (draft.title ?? "").trim();
  if (!title) errors.push({ field: "title", message: "Le titre de la séance est obligatoire." });
  else if (title.length > SESSION_TITLE_MAX) errors.push({ field: "title", message: `Le titre de la séance : ${SESSION_TITLE_MAX} caractères au plus.` });
  if ((draft.lessonId ?? "").trim().length > SESSION_LESSON_MAX) {
    errors.push({ field: "lessonId", message: `La leçon : ${SESSION_LESSON_MAX} caractères au plus.` });
  }
  if (!Number.isInteger(draft.minutes) || draft.minutes < SESSION_MIN_MINUTES || draft.minutes > SESSION_MAX_MINUTES) {
    errors.push({ field: "minutes", message: `La durée doit être comprise entre ${SESSION_MIN_MINUTES} et ${SESSION_MAX_MINUTES} minutes.` });
  }
  return errors;
}

/* ── Annonces et sondages ───────────────────────────────────────────────── */

export type AnnouncementDraft = {
  kind: "text" | "poll";
  title: string;
  text: string;
  options: string[];
  endsInDays: number;
  /** Nombre d'annonces actuellement actives (le serveur en refuse au-delà de trois). */
  activeCount?: number;
};

/** Miroir de create_announcement() : texte/question, sondage 2–5 réponses, durée 1–30 j, 3 actives max. */
export function validateAnnouncementDraft(draft: AnnouncementDraft): DraftError[] {
  const errors: DraftError[] = [];
  const title = (draft.title ?? "").trim();
  if (title.length > ANNOUNCEMENT_TITLE_MAX) errors.push({ field: "title", message: `Le titre : ${ANNOUNCEMENT_TITLE_MAX} caractères au plus.` });

  const textLabel = draft.kind === "poll" ? "La question" : "Le texte";
  const text = (draft.text ?? "").trim();
  if (!text) errors.push({ field: "text", message: `${textLabel} est obligatoire.` });
  else if (text.length > ANNOUNCEMENT_TEXT_MAX) errors.push({ field: "text", message: `${textLabel} : ${ANNOUNCEMENT_TEXT_MAX} caractères au plus.` });

  if (draft.kind === "poll") {
    const options = (draft.options ?? []).map(option => (option ?? "").trim());
    if (options.length < POLL_MIN_OPTIONS || options.length > POLL_MAX_OPTIONS) {
      errors.push({ field: "options", message: `Un sondage propose de ${POLL_MIN_OPTIONS} à ${POLL_MAX_OPTIONS} réponses.` });
    } else if (options.some(option => !option || option.length > POLL_OPTION_MAX)
      || new Set(options.map(option => option.toLowerCase())).size !== options.length) {
      errors.push({ field: "options", message: "Chaque réponse est obligatoire (60 caractères au plus) et différente des autres." });
    }
  }

  const days = draft.endsInDays;
  if (!Number.isInteger(days) || days < ENDS_IN_DAYS_MIN || days > ENDS_IN_DAYS_MAX) {
    errors.push({ field: "days", message: `La durée de l'annonce doit être comprise entre ${ENDS_IN_DAYS_MIN} et ${ENDS_IN_DAYS_MAX} jours.` });
  }
  if ((draft.activeCount ?? 0) >= MAX_ACTIVE_ANNOUNCEMENTS) {
    errors.push({ field: "active", message: `Au plus ${MAX_ACTIVE_ANNOUNCEMENTS} annonces actives par classe : fermez-en une d'abord.` });
  }
  return errors;
}

/** Part entière (0–100) de chaque réponse, pour les barres de résultats d'un sondage. */
export function pollPercentages(counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + Math.max(0, count), 0);
  if (total <= 0) return counts.map(() => 0);
  return counts.map(count => Math.round((Math.max(0, count) * 100) / total));
}

/** État affiché d'une annonce : active pour les élèves, clos par l'enseignant, ou expirée. */
export function announcementState(announcement: { closed: boolean; endsAt: string }, now = Date.now()): "active" | "clos" | "expirée" {
  if (announcement.closed) return "clos";
  const endsAt = Date.parse(announcement.endsAt);
  return Number.isNaN(endsAt) || endsAt <= now ? "expirée" : "active";
}

/** Date de fin lisible (« 22 oct. 2026 ») dans le fuseau du navigateur. */
export function endsAtLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

/* ── Parcours d'un élève ────────────────────────────────────────────────── */

export type TrackChoice = AgeTrack | "";

/**
 * Options du sélecteur « Parcours » : valeur vide = parcours par défaut du
 * niveau de la classe, sinon une exception imposée par l'enseignant.
 */
export function trackChoices(classTrack: AgeTrack): { value: TrackChoice; label: string }[] {
  return [
    { value: "", label: `Par défaut — parcours du niveau (${classTrack} ans)` },
    ...TRACKS.map(track => ({ value: track as TrackChoice, label: `${track} ans` })),
  ];
}

/** L'état initial du sélecteur : exception de l'élève, sinon parcours par défaut. */
export function currentTrackChoice(override: AgeTrack | null | undefined): TrackChoice {
  return override ?? "";
}
