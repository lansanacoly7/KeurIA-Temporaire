import type { Metadata } from "next";
import { SchoolRulesView } from "./_components/SchoolRulesView";

export const metadata: Metadata = { title: "Règles de l'école" };

export default function EcoleRulesPage() {
  return <SchoolRulesView />;
}