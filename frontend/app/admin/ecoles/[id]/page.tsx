import type { Metadata } from "next";
import { OverviewTab } from "../../_components/school/OverviewTab";

export const metadata: Metadata = { title: "École · vue d'ensemble" };

export default function EcoleVueEnsemblePage() {
  return <OverviewTab />;
}
