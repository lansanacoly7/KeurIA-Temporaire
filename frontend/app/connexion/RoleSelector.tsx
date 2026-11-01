"use client";

import { ChevronRight } from "lucide-react";
import { ROLE_ORDER, ROLES, type PublicLoginRole } from "./roles";

/** Étape 1 : « Qui se connecte ? » (adapte seulement le formulaire affiché ensuite). */
export function RoleSelector({ onSelect }: { onSelect: (role: PublicLoginRole) => void }) {
  return (
    <ul className="auth-roles">
      {ROLE_ORDER.map(role => {
        const { label, description, icon: Icon } = ROLES[role];
        return (
          <li key={role}>
            <button type="button" className="auth-role" onClick={() => onSelect(role)}>
              <span className="auth-role-icon" aria-hidden="true"><Icon size={24} /></span>
              <span className="auth-role-text">
                <span className="auth-role-label">{label}</span>
                <span className="auth-role-desc">{description}</span>
              </span>
              <ChevronRight className="auth-role-arrow" size={22} aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
