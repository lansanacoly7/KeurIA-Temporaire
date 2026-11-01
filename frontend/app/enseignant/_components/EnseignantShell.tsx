"use client";

import { BarChart3, BookOpen, LayoutDashboard, School, Settings, Target, Trophy } from "lucide-react";
import { getCurrentTeacher, getTeacherSchool } from "@/app/_scolaire/lib/enseignantApi";
import { fullName, initials } from "@/app/_scolaire/lib/format";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { SchoolProvider } from "@/app/_scolaire/ui/SchoolContext";
import { SpaceShell, type NavItem } from "@/app/_scolaire/ui/SpaceShell";

const NAV: NavItem[] = [
  { href: "/enseignant", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/enseignant/classes", label: "Mes classes", icon: School },
  { href: "/enseignant/programme", label: "Programme", icon: BookOpen },
  { href: "/enseignant/missions", label: "Missions & devoirs", icon: Target },
  { href: "/enseignant/classement", label: "Classement", icon: Trophy },
  { href: "/enseignant/analytiques", label: "Analytiques", icon: BarChart3 },
  { href: "/enseignant/parametres", label: "Paramètres", icon: Settings },
];

export function EnseignantShell({ children }: { children: React.ReactNode }) {
  return <SchoolProvider load={getTeacherSchool}><Shell>{children}</Shell></SchoolProvider>;
}

function Shell({ children }: { children: React.ReactNode }) {
  // L'enseignant est celui de la session Django (vérifiée par le layout côté serveur).
  const { data: teacher } = useApi(getCurrentTeacher);
  const user = teacher ? { initials: initials(teacher), name: fullName(teacher), role: "Enseignant·e" } : null;
  return <SpaceShell spaceLabel="Espace enseignant" rootHref="/enseignant" nav={NAV} user={user} signOutInSidebar>{children}</SpaceShell>;
}
