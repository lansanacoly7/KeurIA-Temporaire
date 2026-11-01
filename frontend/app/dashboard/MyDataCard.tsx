"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";

/** Droits sur les données : export JSON du foyer et suppression définitive du compte parent + enfants. */
export function MyDataCard() {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Suppression impossible.");
        return;
      }
      window.location.href = "/connexion";
    } catch {
      setError("Serveur injoignable. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-card-item" style={{ padding: "35px", background: "#F8FAFC", borderRadius: 28, border: "1px solid #E2E8F0" }}>
      <h4 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: "#0F172A" }}>Mes données</h4>
      <p style={{ margin: "0 0 20px", color: "#64748B", fontSize: 15 }}>
        Téléchargez tout ce que kEur IA conserve sur votre foyer, ou supprimez définitivement votre compte.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a
          href="/api/account/export"
          download="keria-mes-donnees.json"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 14, background: "#0D846E", color: "white", fontWeight: 800, textDecoration: "none" }}
        >
          <Download size={18} /> Télécharger mes données
        </a>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 14, border: "2px solid #FCA5A5", background: "white", color: "#B91C1C", fontWeight: 800, cursor: "pointer" }}
          >
            <Trash2 size={18} /> Supprimer mon compte
          </button>
        )}
      </div>

      {confirming && (
        <form onSubmit={deleteAccount} style={{ marginTop: 20, padding: 20, borderRadius: 18, background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <p style={{ margin: "0 0 12px", color: "#991B1B", fontWeight: 700 }}>
            Cette action est définitive : votre compte, ceux de vos enfants et toute leur progression seront effacés.
            Saisissez votre mot de passe pour confirmer.
          </p>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Votre mot de passe"
            style={{ width: "100%", maxWidth: 320, padding: "12px 14px", borderRadius: 12, border: "1px solid #FCA5A5", marginBottom: 12, display: "block" }}
          />
          {error && <p role="alert" style={{ margin: "0 0 12px", color: "#B91C1C", fontWeight: 700 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={busy} style={{ padding: "12px 20px", borderRadius: 12, border: "none", background: "#DC2626", color: "white", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
              {busy ? "Suppression…" : "Supprimer définitivement"}
            </button>
            <button type="button" onClick={() => { setConfirming(false); setPassword(""); setError(null); }} style={{ padding: "12px 20px", borderRadius: 12, border: "1px solid #E2E8F0", background: "white", fontWeight: 700, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
