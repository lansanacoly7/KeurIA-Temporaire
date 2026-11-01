import type { Metadata } from "next";
import { LinkChildView } from "./LinkChildView";

export const metadata: Metadata = { title: "Relier mon enfant" };

export default function RelierPage() {
  return <LinkChildView />;
}
