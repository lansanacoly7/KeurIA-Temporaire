"use client";

import { formFields, type Fields } from "./LoginForm";
import { PasswordInput } from "./PasswordInput";

/** Mot de passe oublié : demande d'un code par e-mail. */
export function ForgotForm({ busy, onSubmit }: { busy: boolean; onSubmit: (fields: Fields) => void }) {
  return (
    <form className="local-auth-form" onSubmit={e => { e.preventDefault(); onSubmit(formFields(e)); }}>
      <label>Adresse e-mail
        <input name="email" type="email" required autoComplete="email" autoCapitalize="none" spellCheck={false} />
      </label>
      <button className="login-primary" disabled={busy} type="submit">
        {busy ? "Envoi…" : "Recevoir un code"}
      </button>
    </form>
  );
}

/** Saisie du code reçu : activation du compte (verify) ou nouveau mot de passe (reset). */
export function CodeForm({ kind, email, busy, onSubmit, onResend, submitLabel }: {
  kind: "verify" | "reset";
  email: string;
  busy: boolean;
  /** Libellé du bouton quand le code sert à autre chose que l'activation (connexion 2FA, réactivation). */
  submitLabel?: string;
  onSubmit: (fields: Fields) => void;
  onResend?: () => void;
}) {
  return (
    <form className="local-auth-form" onSubmit={e => { e.preventDefault(); onSubmit({ ...formFields(e), email }); }}>
      <label>Code reçu par e-mail (6 chiffres)
        <input name="code" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" className="auth-code" />
      </label>
      {kind === "reset" && (
        <label>Nouveau mot de passe
          <PasswordInput name="password" autoComplete="new-password" minLength={8} />
          <small>8 caractères minimum, avec des lettres et des chiffres.</small>
        </label>
      )}
      <button className="login-primary" disabled={busy} type="submit">
        {busy ? "Vérification…" : submitLabel ?? (kind === "verify" ? "Activer mon compte" : "Changer le mot de passe")}
      </button>
      {onResend && <button type="button" className="auth-link" onClick={onResend}>Je n&apos;ai pas reçu le code : le renvoyer</button>}
    </form>
  );
}
