"use client";

import { getTeacherLeaderboard } from "@/app/_scolaire/lib/enseignantApi";
import { SchoolLeaderboardView } from "@/app/_scolaire/ui/SchoolLeaderboardView";

export function TeacherClassementView() {
  return (
    <SchoolLeaderboardView
      load={getTeacherLeaderboard}
      subtitle="Classement des élèves de vos classes selon l'XP gagné."
    />
  );
}
