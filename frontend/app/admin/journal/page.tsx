import type { Metadata } from "next";
import { AuditView } from "../_components/AuditView";

export const metadata: Metadata = { title: "Journal" };

export default function Page() {
  return <AuditView />;
}
