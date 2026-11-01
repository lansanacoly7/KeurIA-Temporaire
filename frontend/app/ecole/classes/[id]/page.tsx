import type { Metadata } from "next";
import { ClassroomDetailView } from "../../_components/classes/ClassroomDetailView";

export const metadata: Metadata = { title: "Fiche classe" };

export default async function ClassroomPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creee?: string }>;
}) {
  const [{ id }, { creee }] = await Promise.all([params, searchParams]);
  return <ClassroomDetailView id={id} justCreated={creee === "1"} />;
}
