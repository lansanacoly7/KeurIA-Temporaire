import type { Metadata } from "next";
import { TeacherDetailView } from "../../_components/teachers/TeacherDetailView";

export const metadata: Metadata = { title: "Fiche enseignant" };

export default async function EnseignantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeacherDetailView id={id} />;
}
