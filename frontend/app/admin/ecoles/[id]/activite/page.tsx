import type { Metadata } from "next";
import { ActivityTab } from "../../../_components/school/ReadOnlyTabs";

export const metadata: Metadata = { title: "École · activité" };

export default function EcoleActivitePage() {
  return <ActivityTab />;
}
