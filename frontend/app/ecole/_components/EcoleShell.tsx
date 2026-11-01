"use client";

import { GraduationCap, LayoutDashboard, Presentation, Printer, School, Settings, Users } from "lucide-react";
import { getSchool } from "@/app/_scolaire/lib/ecoleApi";
import { fullName, initials } from "@/app/_scolaire/lib/format";
import { SchoolProvider, useSchool } from "@/app/_scolaire/ui/SchoolContext";
import { SpaceShell, type NavItem } from "@/app/_scolaire/ui/SpaceShell";

const NAV: NavItem[] = [
  { href: "/ecole", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/ecole/classes", label: "Classes", icon: School },
  { href: "/ecole/enseignants", label: "Enseignants", icon: Presentation },
  { href: "/ecole/eleves", label: "Élèves", icon: GraduationCap },
  { href: "/ecole/fiches", label: "Fiches & Connexions", icon: Printer, activeFor: ["/ecole/import"] },
  { href: "/ecole/parents", label: "Parents", icon: Users },
  { href: "/ecole/parametres", label: "Paramètres", icon: Settings },
];

export function EcoleShell({ children }: { children: React.ReactNode }) {
  return <SchoolProvider load={getSchool}><Shell>{children}</Shell></SchoolProvider>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { school } = useSchool();
  const user = school ? { initials: initials(school.admin), name: fullName(school.admin), role: school.admin.title } : null;
  return <SpaceShell spaceLabel="Programme kEur IA" rootHref="/ecole" nav={NAV} user={user} signOutInSidebar>{children}</SpaceShell>;
}
