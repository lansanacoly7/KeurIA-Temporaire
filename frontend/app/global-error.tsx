"use client";

import { useEffect } from "react";
import { reportClientError } from "./utils/reportClientError";

// Dernier filet : plante dans le layout racine lui-même (il faut donc redéclarer <html> et <body>).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClientError("boundary", error, error.digest); }, [error]);
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "calc(100vh / var(--app-zoom, 1))", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <div style={{ maxWidth: 420, padding: 24 }}>
          <h1>Oups, quelque chose s&apos;est mal passé</h1>
          <p>Recharge la page pour continuer.</p>
          <button type="button" onClick={reset} style={{ padding: "10px 18px", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}