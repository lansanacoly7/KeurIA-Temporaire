import type { Metadata } from "next";
import { LessonEditor } from "../../_components/studio79/LessonEditor";

export const metadata: Metadata = {
  title: "Éditeur de leçon · Studio 7-9 ans",
};

export default async function Page({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  return <LessonEditor lessonId={lessonId} />;
}
