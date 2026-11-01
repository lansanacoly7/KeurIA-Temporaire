/*
 * Logique pure des règles de restriction école / classe (T6) :
 * - conversion entre l'éditeur de créneaux (cases de jours + heures) et le
 *   format `windows` de l'API : [{days: [0..6] (0 = lundi), start: "HH:MM", end: "HH:MM"}] ;
 * - contrôles de validité AVANT envoi (début < fin, au moins un jour, minutes 5 à 600) ;
 * - contrôle « la classe n'assouplit pas l'école » (miroir de loosening_errors du backend) ;
 * - phrases de l'aperçu « Ce que voit l'élève ».
 *
 * Aucune dépendance : testable tel quel par tests/rules-logic.test.mjs.
 */

export type RuleSet = Record<string, unknown>;

/** Créneau au format API. */
export type SchoolWindow = { days: number[]; start: string; end: string };

/** Créneau dans l'éditeur : sept cases de jours (Lun à Dim) + heures « HH:MM ». */
export type SlotDraft = { days: boolean[]; start: string; end: string };

export const BOOL_KEYS = ["palou", "games", "scratch", "free_path", "leaderboard"] as const;

export const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export const RULE_LABELS: Record<string, string> = {
  palou: "Palou",
  games: "Les jeux et défis",
  scratch: "Le Studio Scratch",
  free_path: "Le parcours libre",
  leaderboard: "Le classement",
  daily_limit_minutes: "Le temps quotidien",
  windows: "Les horaires",
};

export const DAILY_MIN_MINUTES = 5;
export const DAILY_MAX_MINUTES = 600;

/** Un créneau neuf : semaine ouvrée, matin. */
export function emptySlot(): SlotDraft {
  return { days: [true, true, true, true, true, false, false], start: "08:00", end: "12:00" };
}

/** `windows` API → créneaux de l'éditeur (une case cochée par jour présent). */
export function windowsToSlots(windows: unknown): SlotDraft[] {
  if (!Array.isArray(windows)) return [];
  return windows.map((item) => {
    const window = (item && typeof item === "object" ? item : {}) as Partial<SchoolWindow>;
    return {
      days: DAY_LABELS.map((_, index) => Array.isArray(window.days) && window.days.includes(index)),
      start: typeof window.start === "string" ? window.start : "08:00",
      end: typeof window.end === "string" ? window.end : "12:00",
    };
  });
}

/** Créneaux de l'éditeur → `windows` API (les créneaux sans jour sont écartés). */
export function slotsToWindows(slots: SlotDraft[]): SchoolWindow[] {
  return slots
    .map((slot) => ({
      days: slot.days.flatMap((checked, index) => (checked ? [index] : [])),
      start: slot.start,
      end: slot.end,
    }))
    .filter((window) => window.days.length > 0);
}

/** "08:00" → 480 ; format invalide → null. */
export function minutesOf(value: unknown): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? ""));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes !== 0)) return null;
  return hours * 60 + minutes;
}

/** Messages clairs pour chaque créneau invalide (liste vide = bon). */
export function validateSlots(slots: SlotDraft[]): string[] {
  const errors: string[] = [];
  slots.forEach((slot, index) => {
    const number = index + 1;
    if (!slot.days.some(Boolean)) errors.push(`Créneau ${number} : coche au moins un jour.`);
    const start = minutesOf(slot.start);
    const end = minutesOf(slot.end);
    if (start === null || end === null) {
      errors.push(`Créneau ${number} : heure attendue au format HH:MM (ex. 08:00).`);
    } else if (start >= end) {
      errors.push(`Créneau ${number} : l'heure de début doit être avant l'heure de fin.`);
    }
  });
  return errors;
}

/** Minutes par jour : entier entre 5 et 600, ou absent (aucune restriction). */
export function validateDailyMinutes(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value !== "number" || !Number.isInteger(value)
      || value < DAILY_MIN_MINUTES || value > DAILY_MAX_MINUTES) {
    return [`Le temps par jour : un nombre de minutes entre ${DAILY_MIN_MINUTES} et ${DAILY_MAX_MINUTES}.`];
  }
  return [];
}

/** Une règle booléenne est-elle verrouillée par l'école ? */
export function isRuleLocked(key: string, schoolRules: RuleSet): boolean {
  return schoolRules[key] === false;
}

/** Plafond posé par l'école (minutes), ou null. */
export function schoolDailyCap(schoolRules: RuleSet): number | null {
  return typeof schoolRules.daily_limit_minutes === "number" ? schoolRules.daily_limit_minutes : null;
}

/** Les créneaux `inner` (classe) tiennent-ils dans `outer` (école), jour par jour ? */
export function windowsWithin(inner: SchoolWindow[], outer: SchoolWindow[]): boolean {
  const intervals = (windows: SchoolWindow[], day: number): [number, number][] => {
    const merged: [number, number][] = [];
    const starts = windows
      .filter((window) => window.days.includes(day))
      .map((window) => [minutesOf(window.start), minutesOf(window.end)] as [number | null, number | null])
      .filter((pair): pair is [number, number] => pair[0] !== null && pair[1] !== null)
      .sort((a, b) => a[0] - b[0]);
    for (const [start, end] of starts) {
      const last = merged[merged.length - 1];
      if (last && start <= last[1]) last[1] = Math.max(last[1], end);
      else merged.push([start, end]);
    }
    return merged;
  };
  for (let day = 0; day < 7; day++) {
    const container = intervals(outer, day);
    for (const [start, end] of intervals(inner, day)) {
      if (!container.some(([x, y]) => x <= start && end <= y)) return false;
    }
  }
  return true;
}

/**
 * Raisons pour lesquelles des règles de classe assoupliraient celles de l'école
 * (miroir de `loosening_errors` backend). Liste vide = envoi acceptable.
 */
export function looseningErrors(schoolRules: RuleSet, rules: RuleSet): string[] {
  const errors: string[] = [];
  for (const key of BOOL_KEYS) {
    if (schoolRules[key] === false && rules[key] === true) {
      errors.push(`${RULE_LABELS[key]} : l'école l'a interdit, la classe ne peut pas l'autoriser.`);
    }
  }
  const cap = schoolDailyCap(schoolRules);
  if (cap !== null && typeof rules.daily_limit_minutes === "number" && rules.daily_limit_minutes > cap) {
    errors.push(`${RULE_LABELS.daily_limit_minutes} : l'école limite à ${cap} minutes, la classe ne peut pas dépasser.`);
  }
  const outer = schoolRules.windows;
  const inner = rules.windows;
  if (Array.isArray(outer) && outer.length > 0 && Array.isArray(inner) && inner.length > 0
      && !windowsWithin(inner as SchoolWindow[], outer as SchoolWindow[])) {
    errors.push(`${RULE_LABELS.windows} : les créneaux de la classe doivent rester dans ceux de l'école.`);
  }
  return errors;
}

/** Prépare le corps à envoyer : les valeurs undefined (absentes) sont retirées. */
export function apiRules(rules: RuleSet): RuleSet {
  const out: RuleSet = {};
  for (const [key, value] of Object.entries(rules)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/* ————————————————————————— Aperçu « Ce que voit l'élève » ————————————————————————— */

/** 480 → "8 h" ; 990 → "16 h 30". */
export function formatHour(value: string): string {
  const total = minutesOf(value);
  if (total === null) return value;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours} h ${String(minutes).padStart(2, "0")}` : `${hours} h`;
}

/** [0,1,2,3,4] → "lundi à vendredi" ; [5,6] → "samedi et dimanche" ; [0..6] → "tous les jours". */
export function formatDays(days: number[]): string {
  const sorted = [...new Set(days)].filter((day) => day >= 0 && day <= 6).sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 7) return "tous les jours";
  const groups: number[][] = [];
  for (const day of sorted) {
    const last = groups[groups.length - 1];
    if (last && last[last.length - 1] + 1 === day) last.push(day);
    else groups.push([day]);
  }
  const parts = groups.map((group) => {
    if (group.length === 2) return `${DAY_NAMES[group[0]]} et ${DAY_NAMES[group[1]]}`;
    if (group.length > 2) return `${DAY_NAMES[group[0]]} à ${DAY_NAMES[group[group.length - 1]]}`;
    return DAY_NAMES[group[0]];
  });
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;
}

/** {days:[0..4], start:"08:00", end:"16:00"} → "lundi à vendredi, de 8 h à 16 h". */
export function formatWindow(window: SchoolWindow): string {
  return `${formatDays(window.days)}, de ${formatHour(window.start)} à ${formatHour(window.end)}`;
}

/**
 * Ce que l'élève voit, en phrases : une ligne par réglage qui restreint, avec
 * qui l'a coupé (école / ton enseignant). `classRules` vaut {} côté direction.
 * Si rien n'est restreint : ["Tout est ouvert."].
 */
export function studentPreview(schoolRules: RuleSet, classRules: RuleSet = {}): string[] {
  const lines: string[] = [];
  for (const key of BOOL_KEYS) {
    if (schoolRules[key] === false) lines.push(`${RULE_LABELS[key]} : coupé par l'école.`);
    else if (classRules[key] === false) lines.push(`${RULE_LABELS[key]} : coupé par ton enseignant.`);
  }
  const caps = [schoolRules.daily_limit_minutes, classRules.daily_limit_minutes]
    .filter((value): value is number => typeof value === "number");
  if (caps.length > 0) lines.push(`Temps par jour : ${Math.min(...caps)} minutes.`);
  // Les horaires de la classe (plus stricts) remplacent ceux de l'école dans l'aperçu.
  const classWindows = Array.isArray(classRules.windows) ? (classRules.windows as SchoolWindow[]) : [];
  const schoolWindows = Array.isArray(schoolRules.windows) ? (schoolRules.windows as SchoolWindow[]) : [];
  const windows = classWindows.length > 0 ? classWindows : schoolWindows;
  if (windows.length > 0) lines.push(`Horaires : ${windows.map(formatWindow).join(" ; ")}.`);
  return lines.length > 0 ? lines : ["Tout est ouvert."];
}
