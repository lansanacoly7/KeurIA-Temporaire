import type { Metadata } from "next";
import { StudentDetail } from "../../../../_components/school/ClassesTabs";

export const metadata: Metadata = { title: "École · fiche élève" };

export default async function EcoleElevePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  return <StudentDetail studentId={studentId} />;
}
