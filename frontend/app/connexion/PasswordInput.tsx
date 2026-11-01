"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Champ mot de passe avec bouton Afficher / Masquer. */
export function PasswordInput({ name, autoComplete, minLength }: { name: string; autoComplete: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-password">
      <input name={name} type={visible ? "text" : "password"} required minLength={minLength} autoComplete={autoComplete} />
      <button type="button" className="auth-password-toggle" onClick={() => setVisible(v => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={visible}>
        {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
      </button>
    </div>
  );
}
