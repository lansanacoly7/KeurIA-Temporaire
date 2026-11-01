import type { Metadata } from "next";
import { TeacherClassesView } from "../_components/classes/TeacherClassesView";

export const metadata: Metadata = { title: "Mes classes" };

export default function MesClassesPage() {
  return <TeacherClassesView />;
}
