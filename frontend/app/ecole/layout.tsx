import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireLocalUser } from "@/app/local-auth";
import { EcoleShell } from "./_components/EcoleShell";
import "@/app/_scolaire/scolaire.css";

export const metadata: Metadata = {
  title: { template: "%s · Programme kEur IA", default: "Programme kEur IA" },
};

export const dynamic = "force-dynamic";

// Réservé à la direction d'une école (rôle admin_ecole). L'API vérifie aussi ce
// rôle à chaque requête : ce contrôle évite seulement d'afficher un espace vide.
export default async function EcoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireLocalUser("/ecole");
  if (user.role !== "admin_ecole" || !user.schoolId) redirect("/dashboard");
  return <EcoleShell>{children}</EcoleShell>;
}
