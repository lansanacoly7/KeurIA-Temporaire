import type { Metadata } from "next";
import { TeacherClassView } from "../../_components/classes/TeacherClassView";

export const metadata: Metadata = { title: "Ma classe" };

export default async function MaClassePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeacherClassView classId={id} />;
}
