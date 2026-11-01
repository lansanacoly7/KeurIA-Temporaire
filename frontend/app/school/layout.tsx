import { requireLocalUser } from "../local-auth";

export const dynamic = "force-dynamic";

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  await requireLocalUser("/dashboard");
  return children;
}
