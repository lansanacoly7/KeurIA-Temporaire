import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "calc(100vh / var(--app-zoom, 1))", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Page introuvable</h1>
        <p style={{ marginBottom: 20 }}>Cette page n&apos;existe pas ou a été déplacée.</p>
        <Link href="/" style={{ padding: "10px 18px", borderRadius: 12, fontWeight: 700 }}>Retour à l&apos;accueil</Link>
      </div>
    </main>
  );
}