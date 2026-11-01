"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, Clock, HelpCircle, Star } from "lucide-react";
import { assignMission, MAX_INSTRUCTIONS_LENGTH, type AssignmentSummary, type TeacherClassRow } from "@/app/_scolaire/lib/enseignantApi";
import { className, levelInfo, trackLabel } from "@/app/_scolaire/lib/levels";
import type { Mission } from "@/app/_scolaire/lib/types";
import { ErrorMessage } from "@/app/_scolaire/ui/ui";

const ALL_CLASSES = "__toutes__";

/** Fenêtre « Assigner un devoir » : même présentation que la page Missions d'origine. */
export function AssignModal({ mission, classes: allClasses, defaultClassId = null, onClose, onAssigned }: {
  mission: Mission;
  classes: TeacherClassRow[];
  /** Classe préselectionnée (celle choisie dans la bibliothèque). */
  defaultClassId?: string | null;
  onClose: () => void;
  onAssigned: (created: AssignmentSummary[]) => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Un devoir du programme est écrit pour un âge : seules les classes de ce parcours peuvent le recevoir.
  const classes = mission.track ? allClasses.filter(row => levelInfo(row.classroom.level).track === mission.track) : allClasses;
  const [target, setTarget] = useState(() => {
    if (classes.length === 1) return classes[0].classroom.id;
    return classes.some(row => row.classroom.id === defaultClassId) ? (defaultClassId as string) : ALL_CLASSES;
  });
  const [dueDate, setDueDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<AssignmentSummary[] | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const result = await assignMission({
        missionId: mission.id,
        classIds: target === ALL_CLASSES ? classes.map(c => c.classroom.id) : [target],
        dueDate: dueDate || null,
        instructions,
      });
      setCreated(result);
      onAssigned(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assignation impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ec-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="ec-assign-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef} tabIndex={-1}>
        {created ? (
          <div className="ec-assign-success" role="status">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, color: "var(--ec-ok, #0f755f)" }} aria-hidden="true"><CheckCircle2 size={56} /></div>
            <h2 id={titleId}>Devoir assigné !</h2>
            <p>« {mission.title} » apparaît maintenant dans le suivi de {created.map(c => className(c.classroom)).join(", ")}.</p>
            <div className="ec-assign-actions" style={{ justifyContent: "center" }}>
              <button type="button" className="ec-cancel" onClick={onClose}>Fermer</button>
              {created.length === 1 && (
                <Link className="ec-confirm" href={`/enseignant/devoirs/${created[0].assignment.id}`} style={{ textDecoration: "none" }}>Voir le suivi</Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <header><h2 id={titleId}>Assigner un devoir</h2></header>
            <div className="ec-assign-body">
              <div>
                <p>Mission choisie :</p>
                <div className="ec-assign-recap">
                  <b>{mission.title}</b>
                  <small style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><HelpCircle size={13} aria-hidden="true" /> {mission.questionCount} {mission.questionCount > 1 ? "questions" : "question"}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={13} aria-hidden="true" /> {mission.durationMinutes} min</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Star size={13} aria-hidden="true" style={{ color: "#f59e0b" }} /> {mission.xp} points</span>
                  </small>
                  {mission.track && <small>Écrit pour les {trackLabel(mission.track)}</small>}
                </div>
              </div>

              {classes.length === 0 ? (
                <ErrorMessage message={allClasses.length === 0
                  ? "Aucune classe ne vous est confiée : vous ne pouvez pas encore donner de devoir."
                  : `Ce devoir est écrit pour les ${trackLabel(mission.track || "")} : aucune de vos classes n'a cet âge. Choisissez un devoir adapté à votre classe.`} />
              ) : (
                <>
                  <label>
                    <span>Destinataires :</span>
                    <select className="ec-select" value={target} onChange={e => setTarget(e.target.value)}>
                      {classes.length > 1 && <option value={ALL_CLASSES}>{mission.track ? `Toutes mes classes de ${trackLabel(mission.track)}` : "Toutes mes classes"} ({classes.map(c => className(c.classroom)).join(", ")})</option>}
                      {classes.map(({ classroom, studentCount }) => (
                        <option key={classroom.id} value={classroom.id}>Classe {className(classroom)} ({studentCount} élèves)</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Date limite (optionnel) :</span>
                    <input className="ec-input" type="date" min={today} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </label>

                  <label>
                    <span>Consigne pour les élèves (optionnel) :</span>
                    <textarea
                      value={instructions}
                      maxLength={MAX_INSTRUCTIONS_LENGTH}
                      onChange={e => setInstructions(e.target.value)}
                      placeholder="Ex. Faites l'activité avant le cours de jeudi."
                    />
                  </label>
                </>
              )}

              {error && <ErrorMessage message={error} />}

              <div className="ec-assign-actions">
                <button type="button" className="ec-cancel" onClick={onClose}>Annuler</button>
                <button type="button" className="ec-confirm" onClick={confirm} disabled={saving || classes.length === 0}>
                  {saving ? "Assignation…" : "Confirmer l'assignation"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
