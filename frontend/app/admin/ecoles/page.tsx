import type { Metadata } from "next";
import { SchoolsView } from "../_components/SchoolsView";

export const metadata: Metadata = { title: "Écoles" };

export default async function EcolesPage({ searchParams }: { searchParams: Promise<{ nouvelle?: string }> }) {
  const { nouvelle } = await searchParams;
  return <SchoolsView openNew={nouvelle === "1"} />;
}
