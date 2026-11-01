"use client";

import { useState } from "react";
import { createTeacher, listClassrooms, updateTeacher } from "@/app/_scolaire/lib/ecoleApi";
import { fullName } from "@/app/_scolaire/lib/format";
import { className, levelInfo } from "@/app/_scolaire/lib/levels";
import type { Classroom, Credentials, Teacher, TeacherInput } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { ConfirmModal, ErrorMessage, Field, Modal } from "@/app/_scolaire/ui/ui";

const CYCLES = ["Élémentaire", "Moyen"] as const;

/** Création (teacher absent) ou modification d'un enseignant et de ses classes. */
export function TeacherFormModal({ teacher, currentClassIds = [], onClose, onCreated, onSaved }: {
  teacher?: Teacher;
  currentClassIds?: string[];
  onClose: () => void;
  onCreated?: (teacher: Teacher, credentials: Credentials) => void;
  onSaved?: (teacher: Teacher) => void;
}) {
  const [form, setForm] = useState<TeacherInput>(() => ({
    firstName: teacher?.firstName ?? "",
    lastName: teacher?.lastName ?? "",
    email: teacher?.email ?? "",
    phone: teacher?.phone ?? "",
    classIds: currentClassIds,
  }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { data: classrooms } = useApi(listClassrooms);

  const update = <K extends keyof TeacherInput>(key: K, value: TeacherInput[K]) => setForm(f => ({ ...f, [key]: value }));
  const toggleClass = (id: string) => update("classIds", form.classIds.includes(id) ? form.classIds.filter(c => c !== id) : [...form.classIds, id]);

  // Classes cochées qui ont aujourd'hui un autre enseignant : elles lui seront retirées.
  const reassigned = (classrooms ?? []).filter(row =>
    form.classIds.includes(row.classroom.id) && row.teacher && row.teacher.id !== teacher?.id);

  // Classes décochées : l'enseignant n'y aura plus accès.
  const removed = (classrooms ?? []).filter(row => currentClassIds.includes(row.classroom.id) && !form.classIds.includes(row.classroom.id));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (removed.length || reassigned.length) setConfirming(true);
    else save();
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (teacher) {
        onSaved?.(await updateTeacher(teacher.id, form));
      } else {
        const created = await createTeacher(form);
        onCreated?.(created.teacher, created.credentials);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
      setSaving(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    const who = teacher ? fullName(teacher) : `${form.firstName} ${form.lastName}`.trim() || "Le nouvel enseignant";
    return (
      <ConfirmModal
        title="Changer les classes confiées ?"
        consequences={[
          ...(removed.length ? [<>{who} n&apos;a plus accès à <b>{removed.map(row => className(row.classroom)).join(", ")}</b>{" "}ni au suivi de {removed.length > 1 ? "leurs" : "ses"} devoirs.</>] : []),
          ...reassigned.map(row => <>{className(row.classroom)} est retirée à {fullName(row.teacher!)} et confiée à {who}.</>),
        ]}
        unchanged="les élèves des classes, leurs comptes et leur progression ; les devoirs déjà donnés."
        reversibility="Vous pourrez modifier les classes confiées de nouveau."
        confirmLabel="Enregistrer les modifications"
        danger
        busy={saving}
        onConfirm={save}
        onClose={() => setConfirming(false)}
      />
    );
  }

  const classOption = (classroom: Classroom, currentTeacher: Teacher | null) => (
    <label key={classroom.id}>
      <input type="checkbox" checked={form.classIds.includes(classroom.id)} onChange={() => toggleClass(classroom.id)} />
      <span>
        <b>{className(classroom)}</b>
        <small>{currentTeacher && currentTeacher.id !== teacher?.id ? fullName(currentTeacher) : currentTeacher ? "Sa classe" : "Sans enseignant"}</small>
      </span>
    </label>
  );

  return (
    <Modal
      title={teacher ? `Modifier ${fullName(teacher)}` : "Ajouter un enseignant"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ec-btn" onClick={onClose}>Annuler</button>
          <button type="submit" form="teacher-form" className="ec-btn ec-btn--primary" disabled={saving}>
            {saving ? "Enregistrement…" : teacher ? "Enregistrer" : "Ajouter l'enseignant"}
          </button>
        </>
      }
    >
      <form id="teacher-form" onSubmit={submit} className="ec-form-grid" noValidate>
        <Field label="Prénom">
          <input className="ec-input" value={form.firstName} onChange={e => update("firstName", e.target.value)} autoComplete="off" required />
        </Field>
        <Field label="Nom">
          <input className="ec-input" value={form.lastName} onChange={e => update("lastName", e.target.value)} autoComplete="off" required />
        </Field>
        <Field label="E-mail" hint="Adresse personnelle : elle sert aussi d'identifiant de connexion.">
          <input className="ec-input" type="email" value={form.email} onChange={e => update("email", e.target.value)} autoComplete="off" required />
        </Field>
        <Field label="Téléphone">
          <input className="ec-input" type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="77 123 45 67" autoComplete="off" required />
        </Field>

        <fieldset className="ec-field ec-fieldset" style={{ gridColumn: "1 / -1" }}>
          <legend>Classes confiées</legend>
          {CYCLES.map(cycle => {
            const rows = (classrooms ?? []).filter(row => levelInfo(row.classroom.level).cycle === cycle);
            if (rows.length === 0) return null;
            return (
              <div key={cycle} style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                <small>{cycle}</small>
                <div className="ec-checklist">{rows.map(row => classOption(row.classroom, row.teacher))}</div>
              </div>
            );
          })}
        </fieldset>

        {reassigned.length > 0 && (
          <div className="ec-alert" style={{ gridColumn: "1 / -1" }}>
            <div>
              {reassigned.map(row => (
                <div key={row.classroom.id}><b>{className(row.classroom)}</b>{" "}sera retirée à {fullName(row.teacher!)}.</div>
              ))}
            </div>
          </div>
        )}
        {!teacher && (
          <p style={{ gridColumn: "1 / -1", margin: 0, color: "var(--ec-muted)", fontSize: 13 }}>
            Un mot de passe provisoire sera généré : il s&apos;affichera une seule fois pour être transmis à l&apos;enseignant.
          </p>
        )}
        {error && <div style={{ gridColumn: "1 / -1" }}><ErrorMessage message={error} /></div>}
      </form>
    </Modal>
  );
}
