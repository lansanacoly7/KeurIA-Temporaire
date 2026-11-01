import DashboardPage from "../[[...slug]]/page";

export const metadata = {
  title: "Classement - kEur IA",
};

export const dynamic = "force-dynamic";

/**
 * Même page que le tableau de bord (connexion, redirection du personnel scolaire,
 * école, droits) sur l'onglet « classement ».
 */
export default async function ClassementPage({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  return DashboardPage({ params: Promise.resolve({ slug: ["classement"] }), searchParams });
}
