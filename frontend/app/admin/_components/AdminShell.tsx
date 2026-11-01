"use client";

import { useEffect } from "react";
import { BookOpen, GraduationCap, LayoutDashboard, ScrollText, School, Sparkles, UserCheck, Users, Wand2 } from "lucide-react";
import { initials } from "@/app/_scolaire/lib/format";
import { pendingRegistrationCount, REGISTRATIONS_CHANGED } from "@/app/_scolaire/lib/registrationsApi";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { SpaceShell, type NavItem } from "@/app/_scolaire/ui/SpaceShell";

const NAV: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/inscriptions", label: "Inscriptions", icon: UserCheck },
  { href: "/admin/studio", label: "Studio de contenus", icon: Sparkles },
  { href: "/admin/studio79", label: "Studio 7-9 ans", icon: Wand2 },
  { href: "/admin/ecoles", label: "Écoles", icon: School },
  { href: "/admin/comptes", label: "Comptes", icon: Users },
  { href: "/admin/apprenants", label: "Apprenants", icon: GraduationCap },
  { href: "/admin/missions", label: "Missions", icon: BookOpen },
  { href: "/admin/journal", label: "Journal", icon: ScrollText },
];

export function AdminShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const [first = "", ...rest] = userName.split(" ");
  const user = { initials: initials({ firstName: first, lastName: rest.join(" ") || first }), name: userName, role: "Équipe kEur IA" };

  // Compteur des demandes d'inscription de parents à traiter, remis à jour après chaque décision.
  const { data: waiting, reload } = useApi(pendingRegistrationCount);
  useEffect(() => {
    window.addEventListener(REGISTRATIONS_CHANGED, reload);
    return () => window.removeEventListener(REGISTRATIONS_CHANGED, reload);
  }, [reload]);
  const nav = NAV.map(item => (item.href === "/admin/inscriptions" ? { ...item, badge: waiting ?? 0 } : item));

  return <SpaceShell spaceLabel="Super admin" rootHref="/admin" nav={nav} user={user} signOutInSidebar>{children}</SpaceShell>;
}
