import type { Metadata } from "next";
import { FichesView } from "../_components/fiches/FichesView";

export const metadata: Metadata = { title: "Fiches & Connexions — Importer une liste" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  return <FichesView initialTab="import" initialKind={type === "enseignants" ? "enseignants" : "eleves"} />;
}
