"use client";

import { useRef, useState } from "react";
import { parseBirthParts } from "@/app/_scolaire/lib/format";

/** AAAA-MM-JJ → [jj, mm, aaaa] (vide si la valeur n'est pas une date complète). */
function splitIso(iso: string): [string, string, string] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? [match[3], match[2], match[1]] : ["", "", ""];
}

/**
 * Date de naissance en trois champs (jour, mois, année) : pas de calendrier du navigateur, donc pas de confusion de
 * format ni d'année à 6 chiffres. `onChange` reçoit la date AAAA-MM-JJ quand elle existe et reste plausible pour un élève,
 * sinon "". L'erreur s'affiche dès que la saisie est complète ; une saisie encore en cours n'est signalée qu'à la sortie
 * du champ ou à l'envoi du formulaire (`showRequired`).
 */
export function BirthDateField({ value, onChange, showRequired = false }: {
  value: string;
  onChange: (iso: string) => void;
  /** Le formulaire a été envoyé : une date manquante ou incomplète devient une erreur. */
  showRequired?: boolean;
}) {
  const [[day, month, year], setParts] = useState<[string, string, string]>(() => splitIso(value));
  const [left, setLeft] = useState(false); // la personne est sortie d'un champ : on peut parler d'une saisie incomplète
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const parsed = parseBirthParts(day, month, year);
  let message: string | null = null;
  if (parsed.problem && (!parsed.partial || left || showRequired)) message = parsed.problem;
  else if (!parsed.problem && !parsed.iso && !parsed.empty && (left || showRequired)) message = "Complétez la date : jour, mois et année.";
  else if (parsed.empty && showRequired) message = "La date de naissance est obligatoire.";

  function update(index: 0 | 1 | 2, raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, index === 2 ? 4 : 2);
    const next: [string, string, string] = [day, month, year];
    next[index] = digits;
    setParts(next);
    onChange(parseBirthParts(...next).iso);
    // Passage automatique au champ suivant quand celui-ci est plein.
    if (index === 0 && digits.length === 2) monthRef.current?.focus();
    if (index === 1 && digits.length === 2) yearRef.current?.focus();
  }

  const common = { className: "ec-input", inputMode: "numeric" as const, autoComplete: "off", "aria-invalid": Boolean(message), onBlur: () => setLeft(true) };

  return (
    <fieldset className="ec-field ec-fieldset" aria-describedby={message ? "birth-date-error" : undefined}>
      <legend>Date de naissance</legend>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.7fr", gap: 8 }}>
        <input {...common} value={day} onChange={e => update(0, e.target.value)} placeholder="JJ" aria-label="Jour de naissance" maxLength={2} />
        <input {...common} ref={monthRef} value={month} onChange={e => update(1, e.target.value)} placeholder="MM" aria-label="Mois de naissance" maxLength={2} />
        <input {...common} ref={yearRef} value={year} onChange={e => update(2, e.target.value)} placeholder="AAAA" aria-label="Année de naissance" maxLength={4} />
      </div>
      {message ? <small id="birth-date-error" data-error="true">{message}</small> : <small>Jour, mois, année. Exemple : 14 03 2018</small>}
    </fieldset>
  );
}
