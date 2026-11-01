import type { Metadata } from "next";
import { LearnersView } from "../_components/LearnersView";

export const metadata: Metadata = { title: "Apprenants" };

export default function Page() {
  return <LearnersView />;
}
