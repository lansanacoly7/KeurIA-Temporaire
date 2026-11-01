import type { Metadata } from "next";
import { AnalyticsView } from "../_components/AnalyticsView";

export const metadata: Metadata = { title: "Analytiques" };

export default function AnalytiquesPage() {
  return <AnalyticsView />;
}
