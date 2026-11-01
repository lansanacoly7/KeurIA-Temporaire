import type { AgeTrack, Classroom, Cycle, LevelCode } from "./types";

type LevelInfo = { code: LevelCode; label: string; cycle: Cycle; typicalAge: number; track: AgeTrack };

/**
 * Niveaux du système scolaire sénégalais et parcours kEur IA correspondant.
 * Le CI (6 ans) est rattaché au parcours 7-9 ans, le plus proche.
 */
export const LEVELS: readonly LevelInfo[] = [
  { code: "CI", label: "Cours d'initiation", cycle: "Élémentaire", typicalAge: 6, track: "7-9" },
  { code: "CP", label: "Cours préparatoire", cycle: "Élémentaire", typicalAge: 7, track: "7-9" },
  { code: "CE1", label: "Cours élémentaire 1", cycle: "Élémentaire", typicalAge: 8, track: "7-9" },
  { code: "CE2", label: "Cours élémentaire 2", cycle: "Élémentaire", typicalAge: 9, track: "7-9" },
  { code: "CM1", label: "Cours moyen 1", cycle: "Élémentaire", typicalAge: 10, track: "10-12" },
  { code: "CM2", label: "Cours moyen 2", cycle: "Élémentaire", typicalAge: 11, track: "10-12" },
  { code: "6e", label: "Sixième", cycle: "Moyen", typicalAge: 12, track: "10-12" },
  { code: "5e", label: "Cinquième", cycle: "Moyen", typicalAge: 13, track: "13-15" },
  { code: "4e", label: "Quatrième", cycle: "Moyen", typicalAge: 14, track: "13-15" },
  { code: "3e", label: "Troisième", cycle: "Moyen", typicalAge: 15, track: "13-15" },
];

export function levelInfo(code: LevelCode): LevelInfo {
  const info = LEVELS.find(level => level.code === code);
  if (!info) throw new Error(`Niveau inconnu : ${code}`);
  return info;
}

/** « 7–9 ans » : le parcours d'âge d'un niveau (et des devoirs écrits pour lui). */
export function trackLabel(track: string): string {
  return `${track.replace("-", "–")} ans`;
}

/** « CE1 A » ; « CI » quand l'école n'a qu'une classe de ce niveau (la lettre est facultative). */
export function className(classroom: Pick<Classroom, "level" | "section">): string {
  return `${classroom.level} ${classroom.section}`.trim();
}

/** Tri naturel des classes : par ordre des niveaux, puis par lettre. */
export function compareClassrooms(a: Classroom, b: Classroom): number {
  const byLevel = LEVELS.findIndex(l => l.code === a.level) - LEVELS.findIndex(l => l.code === b.level);
  return byLevel !== 0 ? byLevel : a.section.localeCompare(b.section);
}
