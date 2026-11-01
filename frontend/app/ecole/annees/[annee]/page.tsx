import type { Metadata } from "next";
import { PastYearView } from "../../_components/years/PastYearView";

export const metadata: Metadata = { title: "Année archivée" };

export default async function AnneePage({ params }: { params: Promise<{ annee: string }> }) {
  const { annee } = await params;
  return <PastYearView label={decodeURIComponent(annee)} />;
}
