import type { CSSProperties } from "react";

/**
 * Thème d'une école → variables CSS de l'espace élève.
 *
 * Les feuilles de style et les écrans de l'espace élève écrivent leurs couleurs de marque sous la forme
 * `var(--brand, #0e4b3c)` : sans thème, la valeur de repli (les couleurs kEur IA) s'applique et rien ne change ;
 * avec le thème choisi par la direction, ces variables sont définies une fois sur la racine du tableau de bord et
 * tout l'espace prend les couleurs de l'école, de façon cohérente.
 *
 * Les huit thèmes (backend/apps/scolaire/themes.py) suivent la même règle que kEur IA : une couleur principale
 * SOMBRE et un accent CLAIR. Les nuances intermédiaires sont donc calculées à partir de ces deux couleurs, ce qui
 * conserve les contrastes (texte blanc sur fond sombre, texte sombre sur fond clair).
 */

type Rgb = [number, number, number];

function parse(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Mélange `amount` (0 à 1) de `other` dans `base`. */
function mix(base: Rgb, other: Rgb, amount: number): string {
  const channel = (i: number) => Math.round(base[i] * (1 - amount) + other[i] * amount);
  return `#${[0, 1, 2].map(i => channel(i).toString(16).padStart(2, "0")).join("")}`;
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

/** Variables CSS du thème, ou undefined si les couleurs de l'école sont absentes ou illisibles (kEur IA par défaut). */
export function schoolThemeVars(primary: string, accent: string): CSSProperties | undefined {
  const dark = parse(primary);
  const light = parse(accent);
  if (!dark || !light) return undefined;
  return {
    // Couleurs de l'école, lues par l'habillage déjà en place (menu latéral, bandeau).
    "--school-primary": primary,
    "--school-secondary": accent,
    "--school-accent": accent,
    // Jeu de couleurs de l'espace élève.
    "--brand": primary,
    "--brand-2": mix(dark, light, 0.12),
    "--brand-mid": mix(dark, light, 0.3),
    "--brand-soft": mix(dark, WHITE, 0.9),
    "--brand-accent": accent,
    "--brand-accent-deep": mix(light, BLACK, 0.28),
    "--brand-tint": mix(light, WHITE, 0.75),
  } as CSSProperties;
}
