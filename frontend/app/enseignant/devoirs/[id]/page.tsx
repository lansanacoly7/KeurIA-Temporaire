import type { Metadata } from "next";
import { AssignmentDetailView } from "../../_components/missions/AssignmentDetailView";

export const metadata: Metadata = { title: "Suivi du devoir" };

export default async function DevoirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentDetailView assignmentId={id} />;
}
