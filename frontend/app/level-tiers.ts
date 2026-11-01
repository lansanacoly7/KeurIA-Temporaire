export type LevelTier = { level: number; name: string; image: string; min: number; max: number };

/**
 * Paliers de l'apprenant. Les seuils sont ceux du serveur (backend/apps/progress/levels.py) :
 * un test du backend compare les deux et échoue s'ils divergent. Un palier commence à `min`
 * et se termine à `max`, qui est le `min` du palier suivant. Le dernier n'a pas de suivant.
 */
export const LEVEL_TIERS: LevelTier[] = [
  { level: 1, name: "Petit curieux", image: "/images/levels/petit-curieux.jpg", min: 0, max: 50 },
  { level: 2, name: "Explorateur débutant", image: "/images/levels/explorateur.jpg", min: 50, max: 150 },
  { level: 3, name: "Jeune aventurier", image: "/images/levels/aventurier.jpg", min: 150, max: 300 },
  { level: 4, name: "Maître de l'IA", image: "/images/levels/maitre-ia.jpg", min: 300, max: 500 },
];

/** Palier de l'apprenant en fonction de son XP total (source unique pour toute l'application). */
export function getLevelTier(xp: number): LevelTier {
  const safeXp = Math.max(0, xp);
  return [...LEVEL_TIERS].reverse().find((tier) => safeXp >= tier.min) ?? LEVEL_TIERS[0];
}

/** Palier suivant, ou null au palier maximum. */
export function getNextTier(tier: LevelTier): LevelTier | null {
  return LEVEL_TIERS.find((t) => t.level === tier.level + 1) ?? null;
}

/** XP restant à gagner pour ATTEINDRE le palier suivant (son seuil de départ), 0 au maximum. */
export function xpToNextTier(xp: number): number {
  const next = getNextTier(getLevelTier(xp));
  return next ? Math.max(0, next.min - xp) : 0;
}
