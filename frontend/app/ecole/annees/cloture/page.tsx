import type { Metadata } from "next";
import { ClosureWizard } from "../../_components/years/ClosureWizard";

export const metadata: Metadata = { title: "Clôturer l'année" };

export default function CloturePage() {
  return <ClosureWizard />;
}
