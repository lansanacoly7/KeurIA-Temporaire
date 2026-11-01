/*
 * Couleurs de l'espace élèves : l'école choisit parmi ces thèmes uniquement.
 * Chaque paire (principale, accent) a été vérifiée : texte blanc sur la
 * couleur principale et texte principal sur l'accent ≥ 4,5 (WCAG AA).
 */

export type ColorPair = { primary: string; accent: string };

export type SchoolTheme = ColorPair & { id: string; name: string };

/** Thèmes prêts à l'emploi (le premier est celui de kEur IA). */
export const THEMES: SchoolTheme[] = [
  { id: "baobab", name: "Baobab", primary: "#173e3c", accent: "#d9ef59" },
  { id: "ocean", name: "Océan", primary: "#0b3a5b", accent: "#7fd3f0" },
  { id: "savane", name: "Savane", primary: "#4a3b12", accent: "#f2c94c" },
  { id: "sienne", name: "Terre de Sienne", primary: "#7a2e14", accent: "#f6c9a8" },
  { id: "bissap", name: "Bissap", primary: "#5c1537", accent: "#f4a7c3" },
  { id: "nuit", name: "Nuit étoilée", primary: "#1f2150", accent: "#b9b4f5" },
  { id: "mangue", name: "Mangue", primary: "#0f4d3a", accent: "#ffb347" },
  { id: "lagune", name: "Lagune", primary: "#0d5c63", accent: "#c8f0e0" },
];

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function findTheme({ primary, accent }: ColorPair): SchoolTheme | undefined {
  return THEMES.find(t => same(t.primary, primary) && same(t.accent, accent));
}
