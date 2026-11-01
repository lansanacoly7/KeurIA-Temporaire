"use client";

import { PasswordInput } from "./PasswordInput";
import type { RoleConfig } from "./roles";

export type Fields = Record<string, string>;

export function formFields(event: React.FormEvent<HTMLFormElement>): Fields {
  return Object.fromEntries([...new FormData(event.currentTarget)].map(([key, value]) => [key, String(value)]));
}

/** Connexion (identifiant ou e-mail + mot de passe), libellés adaptés au profil choisi. */
export function LoginForm({ config, busy, onSubmit, onForgot }: {
  config: RoleConfig;
  busy: boolean;
  onSubmit: (fields: Fields) => void;
  onForgot: () => void;
}) {
  const { identifier, forgot } = config;
  return (
    <form className="local-auth-form" onSubmit={e => { e.preventDefault(); onSubmit(formFields(e)); }}>
      <label>{identifier.label}
        {/* Le serveur attend la clé « email » : c'est aussi l'identifiant des élèves. */}
        <input name="email" type={identifier.type} required autoComplete="username" placeholder={identifier.placeholder}
          autoCapitalize="none" spellCheck={false} />
        {identifier.hint && <small>{identifier.hint}</small>}
      </label>
      <div className="auth-field">
        <label>Mot de passe
          <PasswordInput name="password" autoComplete="current-password" />
        </label>
        {forgot === "email" && <button type="button" className="auth-link auth-link--end" onClick={onForgot}>Mot de passe oublié ?</button>}
      </div>
      <button className="login-primary" disabled={busy} type="submit">
        {busy ? "Connexion…" : "Se connecter"}
      </button>
      {forgot !== "email" && <p className="auth-note">{forgot}</p>}
    </form>
  );
}
