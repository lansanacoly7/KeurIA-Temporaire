import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireLocalUser } from "@/app/local-auth";
import { AdminShell } from "./_components/AdminShell";
import "@/app/_scolaire/scolaire.css";

export const metadata: Metadata = {
  title: { template: "%s · Super admin — kEur IA", default: "Super admin — kEur IA" },
};

export const dynamic = "force-dynamic";

// Réservé à l'équipe kEur IA (rôle admin). L'API vérifie aussi ce rôle à chaque requête.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireLocalUser("/admin");
  if (user.role !== "admin") redirect("/dashboard");
  return <AdminShell userName={user.displayName}>{children}</AdminShell>;
}
