import type { Metadata } from "next";
import { TeachersView } from "../_components/teachers/TeachersView";

export const metadata: Metadata = { title: "Enseignants" };

export default async function EnseignantsPage({ searchParams }: { searchParams: Promise<{ nouveau?: string }> }) {
  const { nouveau } = await searchParams;
  return <TeachersView openNew={nouveau === "1"} />;
}
