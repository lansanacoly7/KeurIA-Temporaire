import type { Metadata } from "next";
import { TeacherFichesView } from "../../../_components/classes/TeacherFichesView";

export const metadata: Metadata = { title: "Fiches de connexion" };

export default async function FichesClassePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeacherFichesView classId={id} />;
}
