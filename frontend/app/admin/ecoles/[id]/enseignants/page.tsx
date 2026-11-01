import type { Metadata } from "next";
import { TeachersTab } from "../../../_components/school/ReadOnlyTabs";

export const metadata: Metadata = { title: "École · enseignants" };

export default function EcoleEnseignantsPage() {
  return <TeachersTab />;
}
