"use client";

import { useCallback, useState } from "react";
import { ArrowRight, CircleCheck, TriangleAlert } from "lucide-react";
import { listClassrooms, MOVE_REASONS, moveStudent, previewStudentMove } from "@/app/_scolaire/lib/ecoleApi";
import { fullName, plural } from "@/app/_scolaire/lib/format";
import { className } from "@/app/_scolaire/lib/levels";
import type { Student } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { ErrorMessage, Field, Modal, Skeleton } from "@/app/_scolaire/ui/ui";

export type MoveResult = { label: string; previousClassId: string | null };

/** Remet l'élève dans sa classe d'avant (bouton « Annuler » du message de réussite). */
export async function undoMove(student: Student, previousClassId: string | null) {
  await moveStudent(student.id, previousClassId, "Annulation du déplacement précédent");
}

/** Récapitulatif de ce que le déplacement va changer, avant confirmation. */
function MoveSummary({ studentId, classId }: { studentId: string; classId: string | null }) {
  const load = useCallback(() => previewStudentMove(studentId, classId), [studentId, classId]);
  const { data, error } = useApi(load);
  if (error) return <ErrorMessage message={error} />;
  if (!data) return <Skeleton height={160} />;

  const { from, to, fromTeacher, toTeacher, levelChanged, trackChange, pendingLeft, openReceived } = data;
  const teacherName = (t: typeof fromTeacher) => (t ? fullName(t) : "aucun enseignant");

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="ec-move-route">
        <span>{from ? className(from) : "Sans classe"}</span>
        <ArrowRight size={18} aria-label="vers" />
        <span data-to="true">{to ? className(to) : "Sans classe"}</span>
      </div>

      <dl className="ec-dl">
        <dt>Enseignant·e</dt>
        <dd>{fromTeacher?.id === toTeacher?.id ? `${teacherName(toTeacher)} (inchangé)` : `${teacherName(fromTeacher)} → ${teacherName(toTeacher)}`}</dd>
        <dt>Devoirs</dt>
        <dd>
          {to ? `Recevra ${plural(openReceived, "devoir en cours", "devoirs en cours")} de ${className(to)}.` : "N'aura plus de devoirs."}
          {pendingLeft > 0 && ` ${plural(pendingLeft, "devoir non rendu", "devoirs non rendus")} de ${from ? className(from) : "l'ancienne classe"} ne lui ${pendingLeft > 1 ? "seront" : "sera"} plus demandé${pendingLeft > 1 ? "s" : ""}.`}
        </dd>
      </dl>

      {!to && (
        <div className="ec-alert">
          <TriangleAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>Sans classe, l&apos;élève n&apos;aura plus d&apos;enseignant ni de devoirs, et n&apos;apparaîtra dans aucune classe.</div>
        </div>
      )}
      {levelChanged && from && to && (
        <div className="ec-alert">
          <TriangleAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <b>Changement de niveau</b>{" "}({from.level} → {to.level}) : ce n&apos;est pas un simple changement de section.
            {trackChange && <> Le parcours passe de {trackChange.from} ans à {trackChange.to} ans : l&apos;élève verra d&apos;autres leçons et activités.</>}
          </div>
        </div>
      )}

      <p className="ec-check-ok">
        <CircleCheck size={18} aria-hidden="true" /> Compte, identifiant, mot de passe, matricule et progression ne changent pas.
      </p>
    </div>
  );
}

/**
 * Change un élève de classe en deux temps : choix de la classe (et du motif,
 * facultatif), puis récapitulatif des conséquences et confirmation.
 */
export function MoveStudentModal({ student, onClose, onMoved }: {
  student: Student;
  onClose: () => void;
  onMoved: (result: MoveResult) => void;
}) {
  const { data: classrooms } = useApi(listClassrooms);
  const [step, setStep] = useState<"choose" | "confirm">("choose");
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const options = (classrooms ?? []).filter(row => row.classroom.id !== student.classId);
  const current = (classrooms ?? []).find(row => row.classroom.id === student.classId);
  const classId = target === "none" ? null : target;

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const motif = [reason, detail.trim()].filter(Boolean).join(" — ");
      const { previousClassId } = await moveStudent(student.id, classId, motif);
      const row = options.find(o => o.classroom.id === classId);
      onMoved({ label: row ? className(row.classroom) : "sans classe", previousClassId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Déplacement impossible.");
      setSaving(false);
    }
  }

  return (
    <Modal
      title={step === "choose" ? `Changer ${fullName(student)} de classe` : "Confirmer le changement de classe"}
      onClose={onClose}
      footer={step === "choose" ? (
        <>
          <button type="button" className="ec-btn" onClick={onClose}>Annuler</button>
          <button type="button" className="ec-btn ec-btn--primary" disabled={!target} onClick={() => setStep("confirm")}>Continuer</button>
        </>
      ) : (
        <>
          <button type="button" className="ec-btn" onClick={() => { setStep("choose"); setError(null); }} disabled={saving}>Retour</button>
          <button type="button" className="ec-btn ec-btn--primary" onClick={confirm} disabled={saving}>
            {saving ? "Déplacement…" : "Confirmer le déplacement"}
          </button>
        </>
      )}
    >
      {step === "choose" ? (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Point de départ, visible avant de choisir la nouvelle classe. */}
          <div className="ec-current-class">
            <span>Classe actuelle</span>
            {student.classId && !current ? (
              <Skeleton height={22} width={160} />
            ) : current ? (
              <>
                <b>{className(current.classroom)}</b>
                <small>
                  {current.teacher ? `Enseignant·e : ${fullName(current.teacher)}` : "Sans enseignant"} · {plural(current.studentCount, "élève")}
                </small>
              </>
            ) : (
              <b>Sans classe</b>
            )}
          </div>
          <Field label="Nouvelle classe">
            <select className="ec-select" value={target} onChange={e => setTarget(e.target.value)} required>
              <option value="" disabled>Choisir une classe…</option>
              {options.map(({ classroom, studentCount }) => (
                <option key={classroom.id} value={classroom.id}>{className(classroom)} ({studentCount} élèves)</option>
              ))}
              {student.classId && <option value="none">Retirer de la classe (sans classe)</option>}
            </select>
          </Field>
          <Field label="Motif (facultatif)" hint="Conservé dans l'activité de l'école.">
            <select className="ec-select" value={reason} onChange={e => setReason(e.target.value)}>
              <option value="">Aucun motif</option>
              {MOVE_REASONS.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </Field>
          {reason && (
            <Field label="Précision (facultatif)">
              <input className="ec-input" value={detail} maxLength={100} onChange={e => setDetail(e.target.value)} />
            </Field>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <p style={{ margin: 0 }}>
            Vous allez changer <b>{fullName(student)}</b>{" "}de classe{reason ? ` (motif : ${reason.toLowerCase()})` : ""}. Vérifiez avant de confirmer :
          </p>
          <MoveSummary studentId={student.id} classId={classId} />
          {error && <ErrorMessage message={error} />}
        </div>
      )}
    </Modal>
  );
}

/** Message de réussite avec « Annuler » : remet l'élève dans sa classe d'avant en un clic. */
export function MovedMessage({ student, result, onUndone }: {
  student: Student;
  result: MoveResult;
  onUndone: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  async function undo() {
    setBusy(true);
    setFailed(null);
    try {
      await undoMove(student, result.previousClassId);
      onUndone(`Déplacement annulé : ${fullName(student)} est revenu·e dans sa classe d'avant.`);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "Annulation impossible.");
      setBusy(false);
    }
  }

  return (
    <>
      {fullName(student)} a été déplacé·e : {result.label}.{" "}
      <button type="button" className="ec-notice-undo" onClick={undo} disabled={busy}>{busy ? "Annulation…" : "Annuler"}</button>
      {failed && <> {failed}</>}
    </>
  );
}
