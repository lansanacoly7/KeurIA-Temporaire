import type { Metadata } from "next";
import { FichesView } from "../_components/fiches/FichesView";

export const metadata: Metadata = { title: "Fiches & Connexions" };

export default async function FichesPage({
  searchParams,
}: {
  searchParams: Promise<{ classe?: string; tab?: string; type?: string }>;
}) {
  const { classe, tab, type } = await searchParams;
  return (
    <FichesView
      initialClassId={classe ?? null}
      initialTab={tab === "import" ? "import" : "fiches"}
      initialKind={type === "enseignants" ? "enseignants" : "eleves"}
    />
  );
}
