"use client";

import { useState } from "react";
import { Info, Printer } from "lucide-react";
import { formatRelative, fullName, plural } from "../lib/format";
import type { Credentials, Student } from "../lib/types";
import { CredentialSheet, type SheetItem } from "./CredentialSheet";
import { ConfirmModal, EmptyState, Notice, StatusBadge } from "./ui";

/** Par défaut, on propose les élèves qui n'ont encore jamais utilisé leurs identifiants. */
function defaultSelection(students: Student[]): Set<string> {
  return new Set(students.filter(s => s.status === "jamais_connecte").map(s => s.id));
}

/** Rappel affiché avant la sélection : pourquoi imprimer = nouveau mot de passe. */
export function CredentialsExplanation() {
  return (
    <div className="ec-info">
      <Info size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        Pour protéger les comptes, les mots de passe ne sont jamais conservés en clair : imprimer une fiche
        génère donc un <b>nouveau mot de passe</b>{" "}pour l&apos;élève.
      </div>
    </div>
  );
}

/**
 * Sélection des élèves d'une classe puis génération des fiches (après confirmation).
 * Utilisé par l'admin école et par l'enseignant, chacun avec son propre service.
 */
export function CredentialsPicker({ students, classLabel, generate, onIssued }: {
  students: Student[];
  classLabel: string;
  /** Appel au service : génère un nouveau mot de passe pour chaque élève choisi. */
  generate: (studentIds: string[]) => Promise<{ student: Student; credentials: Credentials }[]>;
  onIssued: (items: SheetItem[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const eligible = students.filter(s => s.status !== "desactive");
  const chosen = selected ?? defaultSelection(eligible);

  const toggle = (id: string) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  async function confirm() {
    setBusy(true);
    const issued = await generate([...chosen]);
    onIssued(issued.map(({ student, credentials }) => ({
      key: student.id,
      name: fullName(student),
      subtitle: `${classLabel} · ${student.matricule}`,
      credentials,
    })));
  }

  if (eligible.length === 0) {
    return <div className="ec-card"><EmptyState title="Aucun élève actif dans cette classe" /></div>;
  }

  return (
    <section className="ec-card" style={{ display: "grid", gap: 16 }}>
      <div className="ec-toolbar" style={{ marginBottom: 0 }}>
        <button type="button" className="ec-btn" onClick={() => setSelected(new Set(eligible.map(s => s.id)))}>Tout sélectionner</button>
        <button type="button" className="ec-btn" onClick={() => setSelected(defaultSelection(eligible))}>Jamais connectés</button>
        <button type="button" className="ec-btn ec-btn--ghost" onClick={() => setSelected(new Set())}>Aucun</button>
        <span className="ec-count">{plural(chosen.size, "élève sélectionné", "élèves sélectionnés")}</span>
      </div>

      <div className="ec-checklist" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
        {eligible.map(student => (
          <label key={student.id}>
            <input type="checkbox" checked={chosen.has(student.id)} onChange={() => toggle(student.id)} />
            <span>
              <b>{student.lastName.toUpperCase()} {student.firstName}</b>
              <small>Connexion : {formatRelative(student.lastLoginAt).toLowerCase()}</small>
              <small><StatusBadge status={student.status} /></small>
            </span>
          </label>
        ))}
      </div>

      <div className="ec-wizard-footer" style={{ marginTop: 0 }}>
        <span />
        <button type="button" className="ec-btn ec-btn--primary" disabled={chosen.size === 0} onClick={() => setConfirming(true)}>
          <Printer size={17} aria-hidden="true" /> Générer {plural(chosen.size, "fiche")}
        </button>
      </div>

      {confirming && (
        <ConfirmModal
          title={`Générer ${plural(chosen.size, "fiche")} de connexion ?`}
          consequences={[
            <>Un <b>nouveau mot de passe</b>{" "}est créé pour {plural(chosen.size, "élève sélectionné", "élèves sélectionnés")} de {classLabel}.</>,
            "Leur mot de passe actuel ne fonctionnera plus, immédiatement : distribuez les nouvelles fiches.",
    "Pour les élèves sans parent relié, un nouveau code parent est imprimé : l'ancien code ne fonctionnera plus.",
          ]}
          unchanged="les identifiants de connexion, les comptes et la progression."
          reversibility="Action définitive : les anciens mots de passe ne peuvent pas être rétablis."
          confirmLabel="Générer les fiches"
          danger
          busy={busy}
          onConfirm={confirm}
          onClose={() => setConfirming(false)}
        />
      )}
    </section>
  );
}

/** Planche générée, avec le rappel « plus jamais affiché » et le bouton d'impression. */
export function IssuedSheet({ items, schoolName, backLabel, onBack }: {
  items: SheetItem[];
  schoolName: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <Notice>{plural(items.length, "fiche générée", "fiches générées")}.</Notice>
      <div className="ec-alert"><div>Ces mots de passe ne seront <b>plus jamais affichés</b>{" "}: imprimez les fiches maintenant.</div></div>
      <div className="ec-wizard-footer" style={{ marginTop: 0 }}>
        <button type="button" className="ec-btn ec-btn--primary" onClick={() => window.print()}><Printer size={17} aria-hidden="true" /> Imprimer</button>
        <button type="button" className="ec-btn" onClick={onBack}>{backLabel}</button>
      </div>
      <CredentialSheet schoolName={schoolName} items={items} />
    </section>
  );
}
