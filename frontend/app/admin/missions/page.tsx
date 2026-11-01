import type { Metadata } from "next";
import { MissionsAdminView } from "../_components/MissionsAdminView";

export const metadata: Metadata = { title: "Missions" };

export default function Page() {
  return <MissionsAdminView />;
}
