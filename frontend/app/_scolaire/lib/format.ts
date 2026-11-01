import type { AccountStatus } from "./types";

/** Pour comparer ou rechercher sans tenir compte des accents ni des majuscules : « Aïssatou » → « aissatou ». */
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`;
}

export function initials(person: { firstName: string; lastName: string }): string {
  return `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase();
}

/** « 12 mars 2019 » à partir d'une date ISO (AAAA-MM-JJ ou horodatage). */
export function formatDate(iso: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return DATE_FORMAT.format(date);
}

/** « il y a 3 h », « il y a 2 j », « jamais ». */
export function formatRelative(iso: string | null, now = new Date()): string {
  if (!iso) return "Jamais";
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return days < 30 ? `Il y a ${days} j` : formatDate(iso);
}

export const STATUS_LABELS: Record<AccountStatus, string> = {
  actif: "Actif",
  jamais_connecte: "Jamais connecté",
  desactive: "Désactivé",
};

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/** Âges acceptés pour un élève : mêmes bornes que le serveur (STUDENT_MIN_AGE / STUDENT_MAX_AGE, services/ecole.py). */
export const STUDENT_MIN_AGE = 4;
export const STUDENT_MAX_AGE = 20;

/**
 * Raison pour laquelle une date de naissance AAAA-MM-JJ est refusée (année absurde comme « 0210 », date future, âge hors de
 * 4 à 20 ans), ou null si elle est acceptable. Évite de découvrir l'erreur seulement après l'envoi du formulaire.
 */
export function birthDateProblem(birthDate: string, now = new Date()): string | null {
  if (!/^\d{4,6}-\d{2}-\d{2}$/.test(birthDate)) return null; // vide ou en cours de saisie : rien à dire
  const [year, month, day] = birthDate.split("-").map(Number);
  const shown = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(year).padStart(4, "0")}`;
  if (year < 1900 || year > now.getFullYear()) {
    return `L'année « ${String(year).padStart(4, "0")} » n'est pas valide : saisissez une année à 4 chiffres, par exemple ${now.getFullYear() - 8}.`;
  }
  if (new Date(year, month - 1, day) > now) return `La date de naissance (${shown}) est dans le futur.`;
  const age = ageFrom(birthDate, now);
  if (age < STUDENT_MIN_AGE || age > STUDENT_MAX_AGE) {
    return `${shown} donne ${age} ans : l'âge attendu est de ${STUDENT_MIN_AGE} à ${STUDENT_MAX_AGE} ans. Vérifiez l'année.`;
  }
  return null;
}

/**
 * Date saisie en trois champs (jour, mois, année) → date AAAA-MM-JJ.
 * - `iso` : la date, seulement si elle existe ET reste plausible pour un élève ; sinon "".
 * - `problem` : ce qui ne va pas (jour ou mois hors limites, 31/02, année pas à 4 chiffres, âge impossible…), ou null.
 * - `empty` / `partial` : rien saisi / saisie en cours (pas encore une erreur : on attend la fin de la saisie).
 */
export function parseBirthParts(day: string, month: string, year: string, now = new Date()): { iso: string; problem: string | null; empty: boolean; partial: boolean } {
  const [d, m, y] = [day.trim(), month.trim(), year.trim()];
  if (!d && !m && !y) return { iso: "", problem: null, empty: true, partial: false };
  if (!d || !m || !y) return { iso: "", problem: null, empty: false, partial: true };
  if (!/^\d{1,2}$/.test(d) || +d < 1 || +d > 31) return { iso: "", problem: "Le jour doit être compris entre 1 et 31.", empty: false, partial: false };
  if (!/^\d{1,2}$/.test(m) || +m < 1 || +m > 12) return { iso: "", problem: "Le mois doit être compris entre 1 et 12.", empty: false, partial: false };
  if (!/^\d{4}$/.test(y)) return { iso: "", problem: `L'année doit avoir 4 chiffres, par exemple ${now.getFullYear() - 8}.`, empty: false, partial: y.length < 4 };
  const probe = new Date(Date.UTC(+y, +m - 1, +d));
  if (probe.getUTCFullYear() !== +y || probe.getUTCMonth() !== +m - 1 || probe.getUTCDate() !== +d) {
    return { iso: "", problem: `Cette date n'existe pas (${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}).`, empty: false, partial: false };
  }
  const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const problem = birthDateProblem(iso, now);
  return { iso: problem ? "" : iso, problem, empty: false, partial: false };
}

/** Téléphone du parent : facultatif, mais s'il est renseigné il doit ressembler à un numéro (même règle que le serveur). */
export function parentPhoneProblem(phone: string): string | null {
  const value = phone.trim();
  if (!value) return null;
  const digits = value.replace(/\D/g, "").length;
  if (!/^\+?[\d\s.-]+$/.test(value) || digits < 9 || digits > 15) return "Le numéro n'est pas valide (ex. 77 123 45 67 ou +221 77 123 45 67).";
  return null;
}

/** Âge en années révolues à partir d'une date de naissance AAAA-MM-JJ. */
export function ageFrom(birthDate: string, now = new Date()): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age--;
  return age;
}

/** « de » ou « d' » selon la première lettre (élision devant une voyelle ou un h muet). */
export function dePrefix(name: string): string {
  const first = name.normalize("NFD").charAt(0).toLowerCase();
  return "aeiouyh".includes(first) ? "d'" : "de ";
}

/** « de Moussa » / « d'Aïssatou » */
export function deName(name: string): string {
  return `${dePrefix(name)}${name}`;
}

/** Échéance AAAA-MM-JJ : « aujourd'hui », « demain », « dans 3 j », « hier », « il y a 5 j » ou la date complète. */
export function dueLabel(dueDate: string, now = new Date()): string {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((new Date(`${dueDate}T00:00:00Z`).getTime() - today) / 86_400_000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  if (days === -1) return "hier";
  if (days > 1 && days < 8) return `dans ${days} j`;
  if (days < -1 && days > -8) return `il y a ${-days} j`;
  return `le ${formatDate(dueDate)}`;
}
