import type { Metadata } from "next";
import { CertificatesPrintView } from "../_components/certificats/CertificatesPrintView";

export const metadata: Metadata = {
  title: "Certificats d'Initiation à l'IA et à la Programmation — kEur IA",
};

export default async function CertificatsPage({
  searchParams,
}: {
  searchParams: Promise<{ eleve?: string; classe?: string }>;
}) {
  const { eleve, classe } = await searchParams;
  return <CertificatesPrintView studentId={eleve ?? null} classId={classe ?? null} />;
}
