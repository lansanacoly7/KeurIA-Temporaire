import { SchoolSpace } from "../../_components/school/SchoolSpace";

// Espace d'une école : en-tête + onglets communs à toutes ses pages.
export default async function EcoleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SchoolSpace id={id}>{children}</SchoolSpace>;
}
