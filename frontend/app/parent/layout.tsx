import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireLocalUser } from "@/app/local-auth";
import "@/app/_scolaire/scolaire.css";

export const metadata: Metadata = {
  title: { template: "%s · Espace parent — kEur IA", default: "Espace parent — kEur IA" },
};

export const dynamic = "force-dynamic";

// Réservé aux comptes parents (l'API vérifie aussi le rôle).
export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireLocalUser("/parent/relier");
  if (user.role !== "parent") redirect("/dashboard");
  return <div className="ec-app ec-demo-page">{children}</div>;
}
