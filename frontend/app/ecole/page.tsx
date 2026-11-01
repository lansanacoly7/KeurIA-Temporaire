import type { Metadata } from "next";
import { DashboardView } from "./_components/DashboardView";

// Le modèle de titre du layout ne s'applique qu'aux sous-pages : titre complet ici.
export const metadata: Metadata = { title: { absolute: "Tableau de bord · Programme kEur IA" } };

export default function EcoleDashboardPage() {
  return <DashboardView />;
}
