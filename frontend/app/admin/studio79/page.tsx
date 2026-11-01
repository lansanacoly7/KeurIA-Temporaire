import type { Metadata } from "next";
import { StudioHome } from "../_components/studio79/StudioHome";

export const metadata: Metadata = {
  title: "Studio des leçons 7-9 ans",
  description: "Conception visuelle et modification No-Code des leçons du parcours 7-9 ans.",
};

export default function Page() {
  return <StudioHome />;
}
