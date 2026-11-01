import type { Metadata } from "next";
import { StudioAdminView } from "../_components/StudioAdminView";

export const metadata: Metadata = {
  title: "Studio de Contenus pédagogiques",
  description: "Création et gestion No-Code des parcours, modules et leçons d'IA & Code.",
};

export default function StudioPage() {
  return <StudioAdminView />;
}
