import type { Metadata } from "next";
import { ClassDetail } from "../../../../_components/school/ClassesTabs";

export const metadata: Metadata = { title: "École · classe" };

export default async function EcoleClassePage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  return <ClassDetail classId={classId} />;
}
