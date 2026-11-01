import type { Metadata } from "next";
import { ParentsTab } from "../../../_components/school/ReadOnlyTabs";

export const metadata: Metadata = { title: "École · parents" };

export default function EcoleParentsPage() {
  return <ParentsTab />;
}
