import type { Metadata } from "next";
import { SchoolClassementView } from "../_components/SchoolClassementView";

export const metadata: Metadata = { title: "Classement" };

export default function ClassementPage() {
  return <SchoolClassementView />;
}
