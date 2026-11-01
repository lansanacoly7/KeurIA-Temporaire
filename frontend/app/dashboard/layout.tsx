import React from "react";
import { getLocalUser, appLoginPath } from "../local-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getLocalUser();
  if (!user) redirect(appLoginPath("/dashboard"));

  return <>{children}</>;
}
