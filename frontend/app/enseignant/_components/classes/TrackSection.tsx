"use client";

/*
 * Parcours d'un élève (T10) : exception au parcours par défaut du niveau de la
 * classe. L'élève suit alors ce parcours partout dans kEur IA (le profil
 * d'apprentissage suit, voir sync_learner_track côté serveur).
 */

import { useState } from "react";
import { Compass } from "lucide-react";
import { setStudentTrack } from "@/app/_scolaire/lib/enseignantApi";
import { currentTrackChoice, trackChoices, type TrackChoice } from "@/app/_scolaire/lib/classeVivante";
import type { AgeTrack, Student } from "@/app/_scolaire/lib/types";
import { ErrorMessage, Field, Notice } from "@/app/_scolaire/ui/ui";

export function TrackSection({ student, classTrack, firstName }: { student: Student; classTrack: AgeTrack; firstName: string }) {
  // `applied` suit le serveur, `choice` la sélection de l'enseignant (non enregistrée tant qu'elle diffère).
  const [applied, setApplied] = useState<TrackChoice>(currentTrackChoice(student.trackOverride));
  const [choice, setChoice] = useState<TrackChoice>(applied);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const choices = trackChoices(classTrack);
  const dirty = choice !== applied;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const result = await setStudentTrack(student.id, choice);
      setApplied(currentTrackChoice(result.trackOverride));
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ec-card" aria-labelledby="parcours-titre" style={{ marginTop: 20 }}>
      <h2 id="parcours-titre" style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>Parcours</h2>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ec-muted)" }}>
        Par défaut, {firstName} suit le parcours {classTrack} ans, celui de son niveau. Une exception change son
        parcours dans tout kEur IA : utile pour un élève plus jeune ou plus avancé que sa classe.
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Field label="Parcours de l'élève">
          <select
            className="ec-select"
            value={choice}
            onChange={event => { setChoice(event.target.value as TrackChoice); setSaved(false); }}
          >
            {choices.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </Field>
        <button type="button" className="ec-btn ec-btn--primary" onClick={save} disabled={busy || !dirty}>
          <Compass size={16} aria-hidden="true" /> Enregistrer
        </button>
      </div>
      {error && <ErrorMessage message={error} />}
      {saved && <Notice>Parcours enregistré : {choices.find(item => item.value === applied)?.label}.</Notice>}
    </section>
  );
}
