import type { Metadata } from "next";
import { TeacherClassementView } from "../_components/TeacherClassementView";

export const metadata: Metadata = { title: "Classement" };

export default function ClassementPage() {
  return <TeacherClassementView />;
}
