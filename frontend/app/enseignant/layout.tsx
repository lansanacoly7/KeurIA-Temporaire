import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireLocalUser } from "@/app/local-auth";
import { EnseignantShell } from "./_components/EnseignantShell";
import "@/app/_scolaire/scolaire.css";

export const metadata: Metadata = {
  title: { template: "%s · Espace enseignant — kEur IA", default: "Espace enseignant — kEur IA" },
};

export const dynamic = "force-dynamic";

// Réservé aux enseignants rattachés à une école. L'API vérifie aussi ce rôle et
// ne renvoie que les classes de l'enseignant connecté.
export default async function EnseignantLayout({ children }: { children: React.ReactNode }) {
  const user = await requireLocalUser("/enseignant");
  if (user.role !== "enseignant" || !user.schoolId) redirect("/dashboard");
  return <EnseignantShell>{children}</EnseignantShell>;
}
