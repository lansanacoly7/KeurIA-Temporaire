import { tracks } from "../lms-data";

export function getChildAdventure(lastLessonId: string | null) {
  if (lastLessonId) {
    for (const ageKey in tracks) {
      for (const world of tracks[ageKey as keyof typeof tracks].worlds) {
        for (const lesson of world.lessons) {
          if (lesson.id === lastLessonId) {
            return {
              moduleId: world.id,
              worldTitle: world.title,
              lessonTitle: lesson.title,
              description: world.description,
              image: `/images/modules/${world.id}.png`,
              status: "Mission en cours"
            };
          }
        }
      }
    }
  }
  return {
    moduleId: "p1",
    worldTitle: "Bonjour, l'IA !",
    lessonTitle: "Premiers pas avec Palou",
    description: "Découverte des bases de l'intelligence artificielle et de la logique.",
    image: "/images/modules/p1.png",
    status: "Prêt à commencer"
  };
}

export function resolveLessonDetails(lessonId: string) {
  if (!lessonId) return null;
  for (const ageKey in tracks) {
    for (const world of tracks[ageKey as keyof typeof tracks].worlds) {
      for (const lesson of world.lessons) {
        if (lesson.id === lessonId) {
          return {
            id: lesson.id,
            title: lesson.title,
            worldTitle: world.title,
            worldId: world.id,
            type: lesson.type,
            minutes: lesson.minutes,
            xp: lesson.xp,
            image: `/images/modules/${world.id}.png`
          };
        }
      }
    }
  }
  return null;
}

export type WorldProgress = {
  id: string;
  title: string;
  description: string;
  image: string;
  total: number;
  done: number;
  pct: number;
  isStarted: boolean;
  isCompleted: boolean;
};

export function getChildWorldsProgress(completedLessonIds: string[] = []): WorldProgress[] {
  const ageTrack = tracks["7-9"];
  const set = new Set(completedLessonIds || []);

  return ageTrack.worlds.map((world) => {
    const total = world.lessons.length;
    const done = world.lessons.filter((l) => set.has(l.id)).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      id: world.id,
      title: world.title,
      description: world.description,
      image: `/images/modules/${world.id}.png`,
      total,
      done,
      pct,
      isStarted: done > 0,
      isCompleted: done === total && total > 0,
    };
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type LevelInfo = { level: number; xpInLevel: number; xpPerLevel: number };

export type BadgeInfo = {
  id: string; label: string; description: string; earned: boolean; emoji?: string;
};

export type ChildRankingBadge = {
  id: string;
  label: string;
  tier?: string;
  color?: string;
  bg?: string;
  border?: string;
  emoji?: string;
};

export type PodiumEntry = {
  position: number;
  rank: number;
  displayName: string;
  initials: string;
  xp: number;
  badge: ChildRankingBadge;
  isMe: boolean;
};

export type ChildRanking = {
  rank: number;
  totalParticipants: number;
  badge: ChildRankingBadge;
  xpEarned: number;
  xpToNextRank: number;
  scope: string;
  scopeLabel: string;
  period: string;
  periodLabel: string;
  podium: PodiumEntry[];
};

export type ModuleResult = {
  id: string; title: string; icon: string; avgScore: number; done: number; total: number;
};

export type Pedagogy = {
  windowDays: number;
  activeDays: number;
  sessionsPerWeek: number;
  avgMinutesPerActiveDay: number | null;
  lastActivityAt: string | null;
  quizAttempts: number;
  modules: ModuleResult[];
};

export type ChildTracking = {
  id: number;
  displayName: string;
  email: string;
  xp: number;
  level: LevelInfo;
  completedLessons: string[];
  lastLesson: string | null;
  badges?: BadgeInfo[];
  earnedBadges: BadgeInfo[];
  ranking?: ChildRanking;
  comprehensionRate: number | null;
  todayUsage: { minutes: number; lessons: number; quizzes: number; games: number };
  totalLessons: number;
  streak?: number;
  pedagogy?: Pedagogy;
};

// ─── Palette & design tokens ──────────────────────────────────────────────────

export const COLORS = [
  { bg: "linear-gradient(135deg, #134e4a 0%, #0f766e 100%)", accent: "#d9ef59", light: "#f0fdf4" },
  { bg: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)", accent: "#fbbf24", light: "#eff6ff" },
  { bg: "linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)", accent: "#34d399", light: "#f5f3ff" },
  { bg: "linear-gradient(135deg, #831843 0%, #be185d 100%)", accent: "#fb923c", light: "#fdf2f8" },
];

export function getColorForIndex(i: number) {
  return COLORS[i % COLORS.length];
}

// ─── Micro composant : Anneau de progression XP ──────────────────────────────

export function XpRing({ pct, color, accent, size = 96 }: {
  pct: number; color: string; accent: string; size?: number;
}) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100);

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={9} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={accent} strokeWidth={9}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

// ─── Vue Pédagogique Dédiée ───────────────────────────────────────────────────

export function formatLastActivity(iso: string | null): string {
  if (!iso) return "Aucune activité enregistrée";
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return `Il y a ${days} jours (${date.toLocaleDateString("fr-FR")})`;
}

export function scoreColor(score: number) {
  if (score >= 80) return { text: "#059669", bar: "linear-gradient(90deg, #059669, #34d399)" };
  if (score >= 60) return { text: "#d97706", bar: "linear-gradient(90deg, #d97706, #fbbf24)" };
  return { text: "#dc2626", bar: "linear-gradient(90deg, #dc2626, #f87171)" };
}

/** Résumé rédigé uniquement à partir des chiffres enregistrés. */
export function buildSummary(child: ChildTracking, p: Pedagogy): string {
  if (p.activeDays === 0 && child.totalLessons === 0) {
    return `${child.displayName} n'a pas encore d'activité enregistrée sur KerIA.`;
  }
  const parts: string[] = [];
  parts.push(
    `${child.displayName} a eu une activité ${p.activeDays} jour${p.activeDays > 1 ? "s" : ""} sur les ${p.windowDays} derniers jours (environ ${p.sessionsPerWeek} par semaine)`
    + (p.avgMinutesPerActiveDay !== null ? `, avec ${p.avgMinutesPerActiveDay} min d'étude en moyenne ces jours-là.` : "."),
  );
  parts.push(`${child.totalLessons} leçon${child.totalLessons > 1 ? "s" : ""} terminée${child.totalLessons > 1 ? "s" : ""}, ${child.xp} XP cumulés.`);
  if (child.comprehensionRate !== null) parts.push(`Score moyen aux quiz : ${child.comprehensionRate} %.`);
  if (p.modules.length > 1) {
    const best = p.modules[0];
    const weakest = p.modules[p.modules.length - 1];
    parts.push(`Meilleur module : « ${best.title} » (${best.avgScore} %). Module à retravailler : « ${weakest.title} » (${weakest.avgScore} %).`);
  }
  return parts.join(" ");
}
