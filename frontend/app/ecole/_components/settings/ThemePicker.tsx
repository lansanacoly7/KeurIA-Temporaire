"use client";

import { Check } from "lucide-react";
import { findTheme, THEMES, type ColorPair } from "@/app/_scolaire/lib/themes";

/**
 * Choix des couleurs de l'espace élèves : uniquement des thèmes prêts à
 * l'emploi, tous vérifiés pour rester lisibles par les enfants.
 */
export function ThemePicker({ value, schoolName, onChange }: {
  value: ColorPair;
  schoolName: string;
  onChange: (value: ColorPair) => void;
}) {
  const theme = findTheme(value);
  const preview = theme ?? THEMES[0];

  return (
    <div className="ec-theme-layout">
      <fieldset className="ec-theme-grid">
        <legend>Choisissez un thème</legend>
        {THEMES.map(t => (
          <label key={t.id} className="ec-theme-card" style={{ "--p": t.primary, "--a": t.accent } as React.CSSProperties}>
            <input type="radio" name="theme" className="sr-only" checked={theme?.id === t.id} onChange={() => onChange({ primary: t.primary, accent: t.accent })} />
            <span className="ec-theme-mini" aria-hidden="true">
              <i>Bienvenue</i>
              <b>Commencer</b>
            </span>
            <span className="ec-theme-name">
              {t.name}
              {theme?.id === t.id && <Check size={15} aria-hidden="true" />}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="ec-school-preview" style={{ background: preview.primary }} aria-label="Aperçu de l'accueil élève">
        <small>BIENVENUE DANS TON ÉCOLE</small>
        <b>{schoolName || "Nom de l'établissement"}</b>
        <span style={{ background: preview.accent, color: preview.primary }}>Commencer mon aventure →</span>
        <em>Thème « {preview.name} »</em>
      </div>
    </div>
  );
}
