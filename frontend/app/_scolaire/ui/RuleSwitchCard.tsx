"use client";

/**
 * Carte-interrupteur d'une règle booléenne (écrans de règles : direction et
 * enseignant) : titre, précision, et un vrai interrupteur (role="switch") à la
 * place d'une case à cocher nue. Quand l'école interdit la règle (côté classe),
 * la carte se verrouille : interrupteur éteint + badge « Interdit par l'école ».
 */

/** Précision sous chaque règle (mêmes clés que BOOL_KEYS de lib/rules.ts). */
export const RULE_HINTS: Record<string, string> = {
  palou: "Compagnon IA qui guide l’élève dans ses leçons",
  games: "Jeux et défis éducatifs ouverts",
  scratch: "Studio Scratch pour créer ses animations",
  free_path: "Parcours libre, hors du chemin imposé",
  leaderboard: "Tableau d’honneur de la classe (prénoms seuls)",
};

export function RuleSwitchCard({
  title,
  hint,
  checked,
  locked = false,
  onChange,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  locked?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="ec-rule-switch" data-locked={locked || undefined}>
      <div className="ec-rule-switch__info">
        <h3>{title}</h3>
        {hint && <p>{hint}</p>}
        {locked && <span className="ec-rule-switch__lock">Interdit par l’école</span>}
      </div>
      <label className="ec-switch">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={locked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={title}
        />
        <span className="ec-switch__track" aria-hidden="true">
          <span className="ec-switch__thumb" />
        </span>
      </label>
    </div>
  );
}
