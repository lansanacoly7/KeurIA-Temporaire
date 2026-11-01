"use client";

import { getLeaderboard } from "@/app/_scolaire/lib/ecoleApi";
import { SchoolLeaderboardView } from "@/app/_scolaire/ui/SchoolLeaderboardView";

export function SchoolClassementView() {
  return (
    <SchoolLeaderboardView
      load={getLeaderboard}
      subtitle="Classement de vos élèves selon l'XP gagné. Seuls les élèves de votre établissement sont classés."
    />
  );
}
