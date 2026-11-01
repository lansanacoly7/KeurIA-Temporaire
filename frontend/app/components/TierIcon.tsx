import { Award, Medal, Rocket, Sparkles, Star, Trophy, Zap, type LucideIcon } from "lucide-react";

/** Icône d'un badge de classement, d'après son palier (le serveur n'envoie plus rien qui ressemble à un emoji à l'écran). */
const TIER_ICONS: Record<string, LucideIcon> = {
  gold: Trophy,
  silver: Medal,
  bronze: Medal,
  emerald: Award,
  blue: Zap,
  purple: Rocket,
  teal: Star,
};

export function TierIcon({ tier, size = 16 }: { tier: string; size?: number }) {
  const Icon = TIER_ICONS[tier] ?? Sparkles;
  return <Icon size={size} aria-hidden="true" style={{ verticalAlign: "-0.15em", marginRight: 4 }} />;
}
