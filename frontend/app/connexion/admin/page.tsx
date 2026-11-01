import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocalUser, safeReturnTo } from "../../local-auth";
import { homePathFor } from "../../space-home";
import ConnexionClient from "../ConnexionClient";
import "../connexion.css";
import "../auth-local.css";
import "../auth-roles.css";

// Porte d'entrée de l'équipe kEur IA, distincte de la connexion des utilisateurs : ni listée, ni référencée.
export const metadata: Metadata = {
  title: "Connexion administration — kEur IA",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminConnexionPage({ searchParams }: { searchParams?: Promise<{ returnTo?: string; expired?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params?.returnTo || "/admin");
  const user = await getLocalUser();
  if (user) redirect(returnTo === "/dashboard" ? homePathFor(user.role, user.schoolId) : returnTo);
  return <ConnexionClient adminMode returnTo={returnTo.startsWith("/admin") ? returnTo : "/admin"} expired={Boolean(params?.expired)} />;
}
