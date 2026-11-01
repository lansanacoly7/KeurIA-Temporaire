/*
 * Années scolaires : calendrier, clôture de fin d'année et annulation (/api/ecole/years/…).
 *
 * La clôture est volontairement encadrée, et chaque garde-fou est vérifié par le serveur :
 *   1. impossible avant la date de fin d'année du calendrier ;
 *   2. bilan de l'année téléchargé au préalable ;
 *   3. décision explicite pour chaque élève (passe, redouble, quitte l'école) ;
 *   4. confirmation en tapant le nom de l'année ;
 *   5. annulable pendant CLOSURE_UNDO_DAYS jours.
 * Les matricules, identifiants et mots de passe des élèves ne changent jamais.
 *
 * Les calculs purs ci-dessous (décision par défaut, décomptes) servent à
 * l'affichage immédiat de l'assistant ; le serveur refait les siens.
 */
import { api, query } from "./http";
import { LEVELS } from "./levels";
import type { AcademicYear, Classroom, LevelCode, Student, StudentDecision, YearClosingSummary } from "./types";

/** Délai pendant lequel une clôture peut être annulée (YearClosure.UNDO_DAYS côté serveur). */
export const CLOSURE_UNDO_DAYS = 7;

function nextLevel(level: LevelCode): LevelCode | null {
  const index = LEVELS.findIndex(l => l.code === level);
  return LEVELS[index + 1]?.code ?? null;
}

// ─── Calendrier ───────────────────────────────────────────────────────────────

export type PendingClosureInfo = {
  fromYear: string;
  toYear: string;
  closedAt: string;
  undoUntil: string;
  /** Modifications faites depuis la clôture. */
  changesSince: number;
};

export type YearsOverview = {
  current: AcademicYear;
  past: AcademicYear[];
  pendingClosure: PendingClosureInfo | null;
};

export function getYearsOverview(): Promise<YearsOverview> {
  return api.get("ecole/years");
}

/** Dates de rentrée et de fin de l'année en cours (la rentrée dans la 1re année civile, la fin dans la 2e). */
export function updateCurrentYearDates(input: { startDate: string; endDate: string }): Promise<AcademicYear> {
  return api.patch("ecole/years/current", input);
}

// ─── Clôture : vérifications ──────────────────────────────────────────────────

export type ClosureWarning = { key: string; text: string; href: string };

export type ClosureCheck = {
  year: AcademicYear;
  nextYear: string;
  endReached: boolean;
  /** Serveur en développement : le bouton « Simuler la fin de l'année » est proposé. */
  demoAvailable: boolean;
  /** Une clôture précédente encore annulable empêche d'en lancer une autre. */
  pendingClosure: PendingClosureInfo | null;
  warnings: ClosureWarning[];
};

/** @param demoIgnoreDate accepté par le serveur uniquement en développement (DEBUG). */
export function getClosureCheck({ demoIgnoreDate = false } = {}): Promise<ClosureCheck> {
  return api.get(`ecole/years/closure-check${query({ demo: demoIgnoreDate ? 1 : null })}`);
}

// ─── Clôture : bilan (archive) ────────────────────────────────────────────────

/** Bilan de l'année (CSV « ; » avec BOM) ; le serveur enregistre qu'il a été téléchargé. */
export function getYearArchive(): Promise<{ filename: string; csv: string }> {
  return api.post("ecole/years/archive");
}

// ─── Clôture : passage des élèves ─────────────────────────────────────────────

export type PromotionClass = {
  classroom: Classroom;
  /** « CE2 A », ou null en fin de cycle (3e) : les élèves quittent alors l'école. */
  nextClassName: string | null;
  students: Student[];
};

export function getPromotionPlan(): Promise<PromotionClass[]> {
  return api.get("ecole/years/promotion-plan");
}

/** Décision proposée par défaut : on passe au niveau suivant, ou on quitte l'école après la 3e. */
export function defaultDecision(level: LevelCode): StudentDecision {
  return nextLevel(level) ? "passe" : "sortant";
}

export function summarizeDecisions(plan: PromotionClass[], decisions: Record<string, StudentDecision>) {
  const counts = { passe: 0, redouble: 0, sortant: 0 };
  for (const { classroom, students } of plan) {
    for (const s of students) counts[decisions[s.id] ?? defaultDecision(classroom.level)] += 1;
  }
  return counts;
}

/** Nombre de classes que la clôture créera (même calcul que le serveur). */
export function countNewClasses(plan: PromotionClass[], decisions: Record<string, StudentDecision>): number {
  const keys = new Set(plan.map(({ classroom }) => `${classroom.level}|${classroom.section}`));
  for (const { classroom, students } of plan) {
    const next = nextLevel(classroom.level);
    if (next && students.some(s => (decisions[s.id] ?? defaultDecision(classroom.level)) === "passe")) keys.add(`${next}|${classroom.section}`);
  }
  return keys.size;
}

// ─── Clôture : exécution et annulation ────────────────────────────────────────

export type CloseYearInput = {
  decisions: Record<string, StudentDecision>;
  /** Doit être exactement le nom de l'année (« 2026-2027 »). */
  confirmation: string;
  /** Accepté par le serveur uniquement en développement (DEBUG). */
  demoIgnoreDate?: boolean;
};

export function closeAcademicYear(input: CloseYearInput): Promise<YearClosingSummary> {
  return api.post("ecole/years/close", input);
}

/**
 * Inverse la clôture. Les élèves inscrits depuis dans les nouvelles classes se
 * retrouvent sans classe ; les devoirs donnés depuis à ces classes sont retirés.
 */
export async function undoYearClosure(): Promise<void> {
  await api.post("ecole/years/undo");
}

// ─── Années passées ───────────────────────────────────────────────────────────

export type PastYearDetail = {
  year: AcademicYear;
  classes: { classroom: Classroom; studentCount: number }[];
};

export function getPastYear(label: string): Promise<PastYearDetail> {
  return api.get(`ecole/years/${encodeURIComponent(label)}`);
}
