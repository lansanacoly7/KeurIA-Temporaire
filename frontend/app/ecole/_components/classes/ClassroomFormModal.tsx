"use client";

import { useState } from "react";
import { createClassroom, listTeachers, updateClassroom } from "@/app/_scolaire/lib/ecoleApi";
import { fullName, plural } from "@/app/_scolaire/lib/format";
import { className, LEVELS, levelInfo } from "@/app/_scolaire/lib/levels";
import type { Classroom, ClassroomInput, LevelCode } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { ConfirmModal, ErrorMessage, Field, Modal } from "@/app/_scolaire/ui/ui";

const CYCLES = ["Élémentaire", "Moyen"] as const;

/** Création (classroom absent) ou modification d'une classe. */
export function ClassroomFormModal({ classroom, studentCount = 0, onClose, onSaved }: {
  classroom?: Classroom;
  /** Élèves de la classe (modification) : pour prévenir d'un changement de niveau. */
  studentCount?: number;
  onClose: () => void;
  onSaved: (saved: Classroom) => void;
}) {
  const [form, setForm] = useState<ClassroomInput>({
    level: classroom?.level ?? "CI",
    // Vide par défaut : beaucoup d'écoles n'ont qu'une classe par niveau (« CI », « CP »). La lettre ne sert qu'à les distinguer.
    section: classroom?.section ?? "",
    teacherId: classroom?.teacherId ?? null,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { data: teachers } = useApi(listTeachers);

  const editing = Boolean(classroom);
  const activeTeachers = (teachers ?? []).filter(row => row.teacher.status !== "desactive");

  // Changements qui touchent d'autres personnes : on les fait confirmer.
  const oldTeacher = classroom?.teacherId ? teachers?.find(row => row.teacher.id === classroom.teacherId)?.teacher ?? null : null;
  const newTeacher = form.teacherId ? teachers?.find(row => row.teacher.id === form.teacherId)?.teacher ?? null : null;
  const teacherChanged = Boolean(oldTeacher) && form.teacherId !== classroom?.teacherId;
  const levelChanged = Boolean(classroom) && form.level !== classroom?.level && studentCount > 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (teacherChanged || levelChanged) setConfirming(true);
    else save();
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const saved = classroom ? await updateClassroom(classroom.id, form) : await createClassroom(form);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
      setSaving(false);
      setConfirming(false);
    }
  }

  if (confirming && classroom) {
    const label = className(classroom);
    return (
      <ConfirmModal
        title={`Modifier la classe ${label} ?`}
        consequences={[
          ...(teacherChanged && oldTeacher ? [<>{fullName(oldTeacher)} n&apos;a plus accès à {label} ni au suivi de ses devoirs.</>] : []),
          ...(teacherChanged ? [newTeacher ? <>{fullName(newTeacher)} devient l&apos;enseignant·e de {label}.</> : <>{label} se retrouve <b>sans enseignant</b>.</>] : []),
          ...(levelChanged ? [<>La classe passe de {classroom.level} à {form.level} : {plural(studentCount, "élève")} {studentCount > 1 ? "changent" : "change"} de niveau (parcours {levelInfo(classroom.level).track} → {levelInfo(form.level).track} ans).</>] : []),
        ]}
        unchanged="les élèves de la classe, leurs comptes et leur progression."
        reversibility="Vous pourrez modifier la classe de nouveau."
        confirmLabel="Enregistrer les modifications"
        danger
        busy={saving}
        onConfirm={save}
        onClose={() => setConfirming(false)}
      />
    );
  }

  return (
    <Modal
      title={editing ? `Modifier la classe ${className(classroom!)}` : "Nouvelle classe"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ec-btn" onClick={onClose}>Annuler</button>
          <button type="submit" form="classroom-form" className="ec-btn ec-btn--primary" disabled={saving}>
            {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer la classe"}
          </button>
        </>
      }
    >
      <form id="classroom-form" onSubmit={submit} className="ec-form-grid" noValidate>
        <Field label="Niveau" hint={`Parcours kEur IA ${levelInfo(form.level).track} ans`}>
          <select
            className="ec-select"
            value={form.level}
            onChange={e => setForm(f => ({ ...f, level: e.target.value as LevelCode }))}
          >
            {CYCLES.map(cycle => (
              <optgroup key={cycle} label={cycle}>
                {LEVELS.filter(l => l.cycle === cycle).map(l => (
                  <option key={l.code} value={l.code}>{l.code} — {l.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field
          label="Lettre de la classe (facultative)"
          hint={form.section
            ? `La classe s'appellera « ${className(form)} ».`
            : `Laissez vide s'il n'y a qu'une classe ${form.level} dans l'école : elle s'appellera « ${form.level} ». Sinon, ajoutez une lettre (A, B…).`}
        >
          <input
            className="ec-input"
            value={form.section}
            maxLength={2}
            placeholder="Aucune"
            onChange={e => setForm(f => ({ ...f, section: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
          />
        </Field>

        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Enseignant" hint="Vous pourrez le changer à tout moment.">
            <select
              className="ec-select"
              value={form.teacherId ?? ""}
              onChange={e => setForm(f => ({ ...f, teacherId: e.target.value || null }))}
            >
              <option value="">Pas encore d&apos;enseignant</option>
              {activeTeachers.map(({ teacher, classrooms }) => {
                const others = classrooms.filter(c => c.id !== classroom?.id).map(className);
                return (
                  <option key={teacher.id} value={teacher.id}>
                    {fullName(teacher)}{others.length ? ` (déjà : ${others.join(", ")})` : ""}
                  </option>
                );
              })}
            </select>
          </Field>
        </div>

        {error && <div style={{ gridColumn: "1 / -1" }}><ErrorMessage message={error} /></div>}
      </form>
    </Modal>
  );
}
