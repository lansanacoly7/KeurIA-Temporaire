"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { redeemParentLinkCode, type RedeemResult } from "@/app/_scolaire/lib/parentLinks";
import { ErrorMessage, Field } from "@/app/_scolaire/ui/ui";

const EMPTY = { code: "" };

/** Le parent connecté saisit le code parent remis par l'école (même formulaire que la fenêtre du tableau de bord). */
export function LinkChildView() {
  const [form, setForm] = useState(() => {
    if (typeof window === "undefined") return EMPTY;
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");
    return codeParam ? { ...EMPTY, code: codeParam.trim() } : EMPTY;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const update = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await redeemParentLinkCode(form));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liaison impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="ec-demo-parent">
      <Image src="/images/keur-ia-logo.png" alt="kEur IA — Apprendre, jouer, créer" width={1800} height={600} sizes="200px" className="ec-demo-logo" priority />
      <section className="ec-card">
        {result ? (
          <div style={{ display: "grid", gap: 12 }}>
            <p className="ec-check-ok"><CircleCheck size={20} aria-hidden="true" /> Liaison réussie</p>
            <p style={{ margin: 0 }}>
              {result.parentName}, vous suivez maintenant <b>{result.studentName}</b>
              {result.classroom ? <> ({result.classroom})</> : null}. Sa progression apparaît dans votre espace parent.
            </p>
            <div className="ec-actions">
              <Link className="ec-btn ec-btn--primary" href="/dashboard">Aller à mon espace parent</Link>
              <button type="button" className="ec-btn" onClick={() => { setResult(null); setForm(EMPTY); }}>Relier un autre enfant</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate style={{ display: "grid", gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24 }}>Relier mon enfant</h1>
              <p style={{ margin: "6px 0 0", color: "var(--ec-muted)" }}>
                Saisissez le code parent remis par l&apos;école (sur la fiche de connexion de votre enfant).
              </p>
            </div>
            <Field label="Code parent" hint="6 caractères, par exemple K7P-4Q2.">
              <input className="ec-input ec-code-input" value={form.code} onChange={e => update("code", e.target.value)} maxLength={9} autoComplete="off" spellCheck={false} required />
            </Field>
            {error && <ErrorMessage message={error} />}
            <div className="ec-actions" style={{ justifyContent: "space-between" }}>
              <Link className="ec-btn" href="/dashboard">Retour</Link>
              <button type="submit" className="ec-btn ec-btn--primary" disabled={busy}>{busy ? "Vérification…" : "Relier mon enfant"}</button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
