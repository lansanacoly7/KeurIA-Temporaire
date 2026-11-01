import type { Metadata } from "next";
import { TeacherStudentView } from "../../_components/classes/TeacherStudentView";

export const metadata: Metadata = { title: "Fiche élève" };

export default async function EleveEnseignantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeacherStudentView studentId={id} />;
}
