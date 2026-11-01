import type { Metadata } from "next";
import { MissionsView } from "../_components/missions/MissionsView";

export const metadata: Metadata = { title: "Missions & devoirs" };

export default async function MissionsPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const { onglet } = await searchParams;
  return <MissionsView initialTab={onglet === "suivi" ? "suivi" : "bibliotheque"} />;
}
