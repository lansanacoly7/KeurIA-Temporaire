import type { Metadata } from "next";
import { PlatformDashboardView } from "./_components/PlatformDashboardView";

export const metadata: Metadata = { title: { absolute: "Tableau de bord · Super admin — kEur IA" } };

export default function AdminPage() {
  return <PlatformDashboardView />;
}
