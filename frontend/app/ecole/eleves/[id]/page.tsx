import type { Metadata } from "next";
import { StudentDetailView } from "../../_components/students/StudentDetailView";

export const metadata: Metadata = { title: "Fiche élève" };

export default async function ElevePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentDetailView id={id} />;
}
