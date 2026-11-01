import type { Metadata } from "next";
import { ParentsView } from "../_components/parents/ParentsView";

export const metadata: Metadata = { title: "Parents" };

export default function ParentsPage() {
  return <ParentsView />;
}
