import type { Metadata } from "next";
import { SettingsView } from "../_components/settings/SettingsView";

export const metadata: Metadata = { title: "Paramètres" };

export default function ParametresPage() {
  return <SettingsView />;
}
