import type { Metadata } from "next";
import { ClassesTab } from "../../../_components/school/ClassesTabs";

export const metadata: Metadata = { title: "École · classes" };

export default function EcoleClassesPage() {
  return <ClassesTab />;
}
