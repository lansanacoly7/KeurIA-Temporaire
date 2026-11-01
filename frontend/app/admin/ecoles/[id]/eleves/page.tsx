import type { Metadata } from "next";
import { StudentsTab } from "../../../_components/school/ClassesTabs";

export const metadata: Metadata = { title: "École · élèves" };

// ?classe=none et ?statut=jamais_connecte : liens « À surveiller » de la vue d'ensemble.
export default async function EcoleElevesPage({ searchParams }: { searchParams: Promise<{ classe?: string; statut?: string }> }) {
  const { classe = "", statut = "" } = await searchParams;
  return <StudentsTab initialClass={classe} initialStatus={statut} />;
}
