import type { Metadata } from "next";
import { OverviewView } from "./_components/OverviewView";

// Le modèle de titre du layout ne s'applique qu'aux sous-pages : titre complet ici.
export const metadata: Metadata = { title: { absolute: "Vue d'ensemble · Espace enseignant — kEur IA" } };

export default function EnseignantPage() {
  return <OverviewView />;
}
