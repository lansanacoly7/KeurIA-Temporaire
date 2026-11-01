import type { Metadata } from "next";
import { SettingsTab } from "../../../_components/school/SettingsTab";

export const metadata: Metadata = { title: "École · paramètres" };

export default function EcoleParametresPage() {
  return <SettingsTab />;
}
