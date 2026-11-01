import type { Metadata } from "next";
import { DirectionTab } from "../../../_components/school/DirectionTab";

export const metadata: Metadata = { title: "École · direction" };

export default function EcoleDirectionPage() {
  return <DirectionTab />;
}
