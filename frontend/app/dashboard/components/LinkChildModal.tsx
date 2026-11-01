"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, GraduationCap, X } from "lucide-react";
import { redeemParentLinkCode, type RedeemResult } from "@/app/_scolaire/lib/parentLinks";
import "./link-child.css";

/**
 * Fenêtre « Relier mon enfant » de l'espace parent : le parent saisit le code
 * remis par l'école (format K7P-4Q2). Le serveur renvoie le même message pour
 * un code inconnu, expiré ou déjà utilisé, et limite le nombre d'essais.
 */
export function LinkChildModal({ onClose, onLinked }: { onClose: () => void; onLinked: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Après une liaison réussie, fermer la fenêtre recharge la liste des enfants.
  const close = result ? onLinked : onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, close]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const compact = code.replace(/[^a-z0-9]/gi, "");
    if (compact.length !== 6) {
      setError("Le code compte 6 caractères, par exemple K7P-4Q2.");
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setResult(await redeemParentLinkCode({ code: compact }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liaison impossible.");
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lc-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) close(); }}>
      <div className="lc-dialog" role="dialog" aria-modal="true" aria-labelledby="lc-title">
        <button type="button" className="lc-close" onClick={close} disabled={busy} aria-label="Fermer"><X size={20} aria-hidden="true" /></button>

        {result ? (
          <div className="lc-body">
            <span className="lc-icon lc-icon--ok" aria-hidden="true"><CircleCheck size={28} /></span>
            <h2 id="lc-title">Enfant relié</h2>
            <p>
              Vous suivez maintenant <b>{result.studentName}</b>{result.classroom ? <> ({result.classroom})</> : null}.
              Sa progression apparaît dans votre espace.
            </p>
            <div className="lc-actions">
              <button type="button" className="lc-btn lc-btn--primary" onClick={onLinked} autoFocus>Voir sa progression</button>
            </div>
          </div>
        ) : (
          <form className="lc-body" onSubmit={submit} noValidate>
            <span className="lc-icon" aria-hidden="true"><GraduationCap size={28} /></span>
            <h2 id="lc-title">Relier mon enfant</h2>
            <p>Saisissez le code parent remis par l&apos;école. Il figure sur la fiche de connexion de votre enfant.</p>
            <label className="lc-field">
              <span>Code parent</span>
              <input ref={inputRef} className="lc-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={9} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="K7P-4Q2"
                aria-invalid={error ? true : undefined} aria-describedby={error ? "lc-error" : "lc-hint"} />
              <small id="lc-hint">6 caractères (lettres et chiffres), valable 30 jours.</small>
            </label>
            {error && <p id="lc-error" className="lc-error" role="alert">{error}</p>}
            <div className="lc-actions">
              <button type="button" className="lc-btn" onClick={onClose} disabled={busy}>Annuler</button>
              <button type="submit" className="lc-btn lc-btn--primary" disabled={busy}>{busy ? "Vérification…" : "Relier mon enfant"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
