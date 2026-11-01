import type { Metadata } from "next";
import { StudentsView } from "../_components/students/StudentsView";

export const metadata: Metadata = { title: "Élèves" };

export default async function ElevesPage({ searchParams }: {
  searchParams: Promise<{ nouveau?: string; classe?: string }>;
}) {
  const { nouveau, classe } = await searchParams;
  const openNew = nouveau === "1";
  return (
    <StudentsView
      openNew={openNew}
      // Avec ?nouveau=1, ?classe= présélectionne la classe du formulaire ; seul, c'est un filtre.
      defaultClassId={openNew ? classe ?? null : null}
      initialClassFilter={openNew ? "" : classe ?? ""}
    />
  );
}
