"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportClientError } from "./utils/reportClientError";

// Affichée quand une page plante : l'enfant ne voit jamais une page blanche ni une trace technique.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    reportClientError("boundary", error, error.digest);
  }, [error]);

  return (
    <main style={{ minHeight: "calc(100vh / var(--app-zoom, 1))", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Oups, quelque chose s&apos;est mal passé</h1>
        <p style={{ marginBottom: 20 }}>Ce n&apos;est pas de ta faute. Réessaie, ou reviens à l&apos;accueil.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={reset} style={{ padding: "10px 18px", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>
            Réessayer
          </button>
          <Link href="/" style={{ padding: "10px 18px", borderRadius: 12, fontWeight: 700 }}>Accueil</Link>
        </div>
      </div>
    </main>
  );
}