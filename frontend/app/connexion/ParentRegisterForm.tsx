"use client";

import { useState } from "react";
import Link from "next/link";
import { User, ShieldCheck, Check } from "lucide-react";
import { formFields, type Fields } from "./LoginForm";
import { PasswordInput } from "./PasswordInput";

type ParentRole = "pere" | "mere" | "tuteur" | "tutrice";

const PARENT_ROLES: { value: ParentRole; label: string; icon: typeof User }[] = [
  { value: "pere", label: "Père", icon: User },
  { value: "mere", label: "Mère", icon: User },
  { value: "tuteur", label: "Tuteur", icon: ShieldCheck },
  { value: "tutrice", label: "Tutrice", icon: ShieldCheck },
];

/** Inscription d'un parent : statut/sexe parental et coordonnées du foyer. */
export function ParentRegisterForm({ busy, onSubmit }: { busy: boolean; onSubmit: (fields: Fields) => void }) {
  const [parentRole, setParentRole] = useState<ParentRole>("pere");

  return (
    <form className="local-auth-form" onSubmit={e => { e.preventDefault(); onSubmit(formFields(e)); }}>
      {/* ── 1. STATUT DU PARENT (PÈRE, MÈRE, TUTEUR, TUTRICE) ── */}
      <div className="auth-selection-group">
        <div className="auth-selection-label" id="parent-role-label">
          <User size={16} color="#0F766E" aria-hidden="true" /> Vous êtes :
        </div>
        <input type="hidden" name="parentRole" value={parentRole} />
        <div className="auth-role-grid" role="radiogroup" aria-labelledby="parent-role-label">
          {PARENT_ROLES.map(role => {
            const Icon = role.icon;
            const isSelected = parentRole === role.value;
            return (
              <button
                key={role.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setParentRole(role.value)}
                className={`auth-pill-choice ${isSelected ? "selected" : ""}`}
              >
                <Icon size={16} />
                <span>{role.label}</span>
                {isSelected && (
                  <span className="auth-pill-check">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. IDENTITÉ DU PARENT ── */}
      <div className="auth-row">
        <label>
          Prénom
          <input name="firstName" required maxLength={100} autoComplete="given-name" placeholder="Ex : Fatou" />
        </label>
        <label>
          Nom
          <input name="lastName" required maxLength={100} autoComplete="family-name" placeholder="Ex : Diallo" />
        </label>
      </div>

      <label>
        Téléphone
        <input name="phone" type="tel" required maxLength={30} autoComplete="tel" inputMode="tel" placeholder="77 123 45 67" />
        <small>L&apos;école de votre enfant pourra vous joindre à ce numéro.</small>
      </label>

      <label>
        Adresse e-mail
        <input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.com" autoCapitalize="none" spellCheck={false} />
        <small>Un code de vérification vous y sera envoyé.</small>
      </label>

      <label>
        Mot de passe
        <PasswordInput name="password" autoComplete="new-password" minLength={8} />
        <small>8 caractères minimum, avec des lettres et des chiffres.</small>
      </label>

      <label>
        Confirmer le mot de passe
        <PasswordInput name="passwordConfirm" autoComplete="new-password" minLength={8} />
      </label>

      {/* ── 3. CONDITIONS & CONSENTEMENT ── */}
      <label className="auth-consent">
        <input name="acceptTerms" type="checkbox" required />
        <span>
          J&apos;ai lu et j&apos;accepte les{" "}
          <Link
            href="/conditions"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="auth-inline-link"
          >
            conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link
            href="/confidentialite"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="auth-inline-link"
          >
            politique de confidentialité
          </Link>
          , et je consens, en tant que parent ou tuteur, à l&apos;utilisation de kEur IA par mon enfant.
        </span>
      </label>

      <button className="login-primary" disabled={busy} type="submit">
        {busy ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}
