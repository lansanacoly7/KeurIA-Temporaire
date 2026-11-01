import type { Metadata } from "next";
import { YearsView } from "../_components/years/YearsView";

export const metadata: Metadata = { title: "Années scolaires" };

export default async function AnneesPage({ searchParams }: { searchParams: Promise<{ cloture?: string }> }) {
  const { cloture } = await searchParams;
  return <YearsView justClosed={cloture === "1"} />;
}
