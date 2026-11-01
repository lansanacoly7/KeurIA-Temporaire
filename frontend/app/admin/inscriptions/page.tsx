import type { Metadata } from "next";
import { RegistrationsView } from "../_components/RegistrationsView";

export const metadata: Metadata = { title: "Inscriptions des parents" };

export default function Page() {
  return <RegistrationsView />;
}
