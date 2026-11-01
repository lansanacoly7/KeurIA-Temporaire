import type { Metadata } from "next";
import { AccountsView } from "../_components/AccountsView";

export const metadata: Metadata = { title: "Comptes" };

export default async function ComptesPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return <AccountsView initialRole={role ?? ""} />;
}
