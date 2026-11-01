import type { Metadata } from "next";
import { ClassesView } from "../_components/classes/ClassesView";

export const metadata: Metadata = { title: "Classes" };

export default function ClassesPage() {
  return <ClassesView />;
}
