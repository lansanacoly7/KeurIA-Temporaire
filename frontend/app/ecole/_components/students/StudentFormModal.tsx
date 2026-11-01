"use client";

import { useEffect, useState } from "react";
import { checkMatricule, createStudent, listClassrooms, suggestMatricule, updateStudent } from "@/app/_scolaire/lib/ecoleApi";
import { ageFrom, fullName, parentPhoneProblem } from "@/app/_scolaire/lib/format";
import { className, levelInfo } from "@/app/_scolaire/lib/levels";
import type { Credentials, Sexe, Student, StudentInput } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { ErrorMessage, Field, Modal } from "@/app/_scolaire/ui/ui";
import { BirthDateField } from "./BirthDateField";

/** Écart d'âge (en années) au-delà duquel on signale un possible mauvais niveau. */
const AGE_TOLERANCE = 2;

/** Le sexe n'est pas pré-coché : une inscription rapide ne doit pas enregistrer un garçon comme fille par défaut. */
type FormState = Omit<StudentInput, "sexe"> & { sexe: Sexe | "" };

const EMPTY: FormState = { matricule: "", firstName: "", lastName: "", sexe: "", birthDate: "", classId: null, parentPhone: "" };
const MATRICULE_MAX = 30;

/** Inscription (student absent) ou modification d'un élève. */
export function StudentFormModal({ student, defaultClassId, onClose, onCreated, onSaved }: {
  student?: Student;
  defaultClassId?: string | null;
  onClose: () => void;
  onCreated?: (student: Student, credentials: Credentials) => void;
  onSaved?: (student: Student) => void;
}) {
  const editing = Boolean(student);
  const [form, setForm] = useState<FormState>(() => student
    ? { matricule: student.matricule, firstName: student.firstName, lastName: student.lastName, sexe: student.sexe, birthDate: student.birthDate, classId: student.classId, parentPhone: student.parentPhone ?? "" }
    : { ...EMPTY, classId: defaultClassId ?? null });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Le formulaire a déjà été envoyé une fois : les champs manquants deviennent des erreurs visibles.
  const [attempted, setAttempted] = useState(false);
  const { data: classrooms } = useApi(listClassrooms);

  // Nouvel élève : on propose le prochain matricule libre (modifiable).
  useEffect(() => {
    if (editing) return;
    let cancelled = false;
    suggestMatricule().then(matricule => {
      if (!cancelled) setForm(f => (f.matricule ? f : { ...f, matricule }));
    });
    return () => { cancelled = true; };
  }, [editing]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(f => ({ ...f, [key]: value }));

  // Matricule : libre dans l'école ? Vérifié au fil de la saisie (le serveur recontrôle à l'enregistrement).
  const matricule = form.matricule.trim();
  const unchangedMatricule = editing && matricule === student?.matricule;
  const [matriculeCheck, setMatriculeCheck] = useState<{ value: string; problem: string | null; failed?: boolean } | null>(null);
  useEffect(() => {
    if (!matricule || matricule.length > MATRICULE_MAX || unchangedMatricule) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      checkMatricule(matricule, student?.id)
        .then(result => { if (!cancelled) setMatriculeCheck({ value: matricule, problem: result.problem }); })
        .catch(() => { if (!cancelled) setMatriculeCheck({ value: matricule, problem: null, failed: true }); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [matricule, unchangedMatricule, student?.id]);
  const matriculeState = matriculeCheck?.value === matricule ? matriculeCheck : null;
  const matriculeProblem =
    !matricule ? (attempted ? "Le matricule est obligatoire." : null)
    : matricule.length > MATRICULE_MAX ? `Le matricule ne peut pas dépasser ${MATRICULE_MAX} caractères.`
    : unchangedMatricule ? null
    : matriculeState?.problem ?? null;
  const matriculeHint = matriculeProblem ? undefined
    : !matricule || unchangedMatricule ? "Numéro attribué par l'école."
    : matriculeState?.failed ? "Vérification impossible pour le moment : le serveur contrôlera à l'enregistrement."
    : matriculeState ? "Matricule disponible." : "Vérification…";

  const phoneProblem = parentPhoneProblem(form.parentPhone ?? "");
  const sexeProblem = attempted && !form.sexe ? "Choisissez Fille ou Garçon." : null;
  const birthMissing = !form.birthDate;

  const selectedClass = classrooms?.find(row => row.classroom.id === form.classId)?.classroom;
  // La date est saisie en trois champs (BirthDateField) : form.birthDate n'est renseignée que si elle existe et reste plausible.
  const age = form.birthDate ? ageFrom(form.birthDate) : null;
  const expectedAge = selectedClass ? levelInfo(selectedClass.level).typicalAge : null;
  const ageWarning = age !== null && expectedAge !== null && Math.abs(age - expectedAge) > AGE_TOLERANCE
    ? `${age} ans : âge inhabituel en ${selectedClass!.level} (habituellement ${expectedAge} ans). Vérifiez la date ou la classe.`
    : undefined;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (!form.sexe || birthMissing || !matricule || matricule.length > MATRICULE_MAX || matriculeProblem || phoneProblem) return;
    setSaving(true);
    setError(null);
    try {
      const input: StudentInput = { ...form, sexe: form.sexe as Sexe, matricule };
      if (student) {
        onSaved?.(await updateStudent(student.id, input));
      } else {
        const created = await createStudent(input);
        onCreated?.(created.student, {
          ...created.credentials,
          parentPhone: form.parentPhone || created.credentials.parentPhone || created.student.parentPhone,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
      setSaving(false);
    }
  }

  return (
    <Modal
      title={student ? `Modifier ${fullName(student)}` : "Inscrire un élève"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ec-btn" onClick={onClose}>Annuler</button>
          <button type="submit" form="student-form" className="ec-btn ec-btn--primary" disabled={saving}>
            {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Inscrire l'élève"}
          </button>
        </>
      }
    >
      <form id="student-form" onSubmit={submit} className="ec-form-grid" noValidate>
        <Field label="Prénom">
          <input className="ec-input" value={form.firstName} onChange={e => update("firstName", e.target.value)} autoComplete="off" required />
        </Field>
        <Field label="Nom">
          <input className="ec-input" value={form.lastName} onChange={e => update("lastName", e.target.value)} autoComplete="off" required />
        </Field>

        {/* fieldset et non Field : Field est un <label>, qui ne peut pas contenir d'autres labels. */}
        <fieldset className="ec-field ec-fieldset">
          <legend>Sexe</legend>
          <div className="ec-radio-group">
            {(["F", "M"] as Sexe[]).map(value => (
              <label key={value}>
                <input type="radio" name="sexe" value={value} checked={form.sexe === value} onChange={() => update("sexe", value)} />
                {value === "F" ? "Fille" : "Garçon"}
              </label>
            ))}
          </div>
          {sexeProblem && <small data-error="true">{sexeProblem}</small>}
        </fieldset>
        <BirthDateField value={form.birthDate} onChange={iso => update("birthDate", iso)} showRequired={attempted} />

        <Field label="Matricule" hint={matriculeHint} error={matriculeProblem ?? undefined}>
          <input className="ec-input" value={form.matricule} onChange={e => update("matricule", e.target.value.toUpperCase())} autoComplete="off" aria-invalid={Boolean(matriculeProblem)} required />
        </Field>
        {editing ? (
          <div className="ec-field">
            <span>Classe</span>
            <b>{selectedClass ? className(selectedClass) : "Sans classe"}</b>
            <small>Pour la changer, fermez ce formulaire et utilisez « Changer de classe » (avec confirmation).</small>
          </div>
        ) : (
        <Field label="Classe">
          <select className="ec-select" value={form.classId ?? ""} onChange={e => update("classId", e.target.value || null)}>
            <option value="">Sans classe pour l&apos;instant</option>
            {(classrooms ?? []).map(({ classroom }) => (
              <option key={classroom.id} value={classroom.id}>{className(classroom)}</option>
            ))}
          </select>
        </Field>
        )}

        <Field label="Téléphone du parent (WhatsApp)" hint="Facultatif · pour lui envoyer le code parent par WhatsApp" error={phoneProblem ?? undefined}>
          <input
            className="ec-input"
            aria-invalid={Boolean(phoneProblem)}
            type="tel"
            placeholder="Ex. +221 77 123 45 67"
            value={form.parentPhone ?? ""}
            onChange={e => update("parentPhone", e.target.value)}
            autoComplete="off"
          />
        </Field>

        {ageWarning && <div className="ec-alert" style={{ gridColumn: "1 / -1" }}>{ageWarning}</div>}
        {!editing && (
          <p style={{ gridColumn: "1 / -1", margin: 0, color: "var(--ec-muted)", fontSize: 13 }}>
            L&apos;identifiant de connexion et un mot de passe provisoire seront générés automatiquement.
          </p>
        )}
        {error && <div style={{ gridColumn: "1 / -1" }}><ErrorMessage message={error} /></div>}
      </form>
    </Modal>
  );
}
