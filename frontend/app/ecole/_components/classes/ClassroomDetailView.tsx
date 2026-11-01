"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowLeft, Award, GraduationCap, Pencil, Plus, Printer, Trash2, UserRoundPlus } from "lucide-react";
import { deleteClassroom, getClassroom } from "@/app/_scolaire/lib/ecoleApi";
import { ageFrom, formatDate, formatRelative, fullName, initials, deName } from "@/app/_scolaire/lib/format";
import { className, levelInfo } from "@/app/_scolaire/lib/levels";
import type { Student } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { ConfirmModal, DataTable, EmptyState, ErrorMessage, Notice, PageHeader, Skeleton, StatusBadge, type Column } from "@/app/_scolaire/ui/ui";
import { ClassroomFormModal } from "./ClassroomFormModal";
import { MovedMessage, MoveStudentModal } from "./MoveStudentModal";

const STUDENT_COLUMNS = (onMove: (student: Student) => void): Column<Student>[] => [
  {
    key: "name",
    header: "Élève",
    render: s => (
      <div>
        <b>{s.lastName.toUpperCase()} {s.firstName}</b>
        <div className="ec-login">{s.matricule}</div>
      </div>
    ),
  },
  { key: "sexe", header: "Sexe", render: s => (s.sexe === "F" ? "Fille" : "Garçon") },
  { key: "age", header: "Âge", render: s => <span title={`Né·e le ${formatDate(s.birthDate)}`}>{ageFrom(s.birthDate)} ans</span> },
  { key: "login", header: "Identifiant", render: s => <span className="ec-login">{s.login}</span> },
  { key: "status", header: "Compte", render: s => <StatusBadge status={s.status} /> },
  { key: "last", header: "Dernière connexion", render: s => formatRelative(s.lastLoginAt) },
  {
    key: "actions",
    header: "",
    align: "right",
    render: s => (
      <button type="button" className="ec-btn ec-btn--caution" onClick={() => onMove(s)}>Changer de classe</button>
    ),
  },
];

export function ClassroomDetailView({ id, justCreated }: { id: string; justCreated: boolean }) {
  const router = useRouter();
  const load = useCallback(() => getClassroom(id), [id]);
  const { data, error, loading, reload } = useApi(load);
  const [notice, setNotice] = useState<React.ReactNode>(justCreated ? "La classe a été créée. Vous pouvez maintenant y ajouter des élèves." : null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [moving, setMoving] = useState<Student | null>(null);

  const back = <Link href="/ecole/classes" className="ec-back"><ArrowLeft size={16} aria-hidden="true" /> Toutes les classes</Link>;

  if (error) return <>{back}<ErrorMessage message={error} /></>;
  if (loading && !data) return <>{back}<Skeleton height={48} width={220} /><div style={{ height: 24 }} /><Skeleton height={180} /></>;
  if (!data) return null;

  const { classroom, teacher, students } = data;
  const level = levelInfo(classroom.level);
  const label = className(classroom);
  const active = students.filter(s => s.status === "actif").length;
  const neverLoggedIn = students.filter(s => s.status === "jamais_connecte").length;
  const girls = students.filter(s => s.sexe === "F").length;

  async function confirmDelete() {
    setDeleteBusy(true);
    await deleteClassroom(id);
    router.push("/ecole/classes");
  }

  return (
    <>
      {back}
      <PageHeader
        title={label}
        subtitle={`${level.label} · ${level.cycle} · Parcours ${level.track} ans · ${classroom.academicYear}`}
        actions={
          <>
            <button type="button" className="ec-btn" onClick={() => setEditing(true)}>
              <Pencil size={17} aria-hidden="true" /> Modifier
            </button>
            {students.length === 0 && (
              <button
                type="button"
                className="ec-btn ec-btn--ghost"
                onClick={() => setDeleting(true)}
                style={{ color: "var(--ec-danger)" }}
              >
                <Trash2 size={17} aria-hidden="true" /> Supprimer la classe
              </button>
            )}
          </>
        }
      />

      {notice && <Notice>{notice}</Notice>}

      <div className="ec-detail-grid">
        <section className="ec-card" aria-labelledby="enseignant-titre">
          <h2 id="enseignant-titre">Enseignant·e</h2>
          {teacher ? (
            <div className="ec-person">
              <div className="ec-avatar" aria-hidden="true">{initials(teacher)}</div>
              <div>
                <b>{fullName(teacher)}</b>
                <span>{teacher.email}</span>
                <span>{teacher.phone}</span>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
              <p style={{ margin: 0, color: "var(--ec-muted)" }}>Aucun enseignant n&apos;est encore responsable de cette classe.</p>
              {!classroom.archived && (
                <button type="button" className="ec-btn ec-btn--primary" onClick={() => setEditing(true)}>
                  <UserRoundPlus size={17} aria-hidden="true" /> Attribuer un enseignant
                </button>
              )}
            </div>
          )}
        </section>

        <section className="ec-card" aria-labelledby="chiffres-titre">
          <h2 id="chiffres-titre">En chiffres</h2>
          <div className="ec-mini-stats" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div><small>Élèves</small><b>{students.length}</b></div>
            <div><small>Actifs</small><b>{active}</b></div>
            <div><small>Jamais connectés</small><b>{neverLoggedIn}</b></div>
            <div><small>Filles / Garçons</small><b>{girls} / {students.length - girls}</b></div>
          </div>
        </section>
      </div>

      <PageHeader
        section
        title="Élèves de la classe"
        actions={classroom.archived ? undefined : (
          <>
            <Link className="ec-btn" href={`/ecole/certificats?classe=${id}`} target="_blank" rel="noopener noreferrer">
              <Award size={17} aria-hidden="true" /> Certificats de la classe
            </Link>
            <Link className="ec-btn" href={`/ecole/fiches?classe=${id}`}>
              <Printer size={17} aria-hidden="true" /> Imprimer les fiches
            </Link>
            <Link className="ec-btn ec-btn--primary" href={`/ecole/eleves?nouveau=1&classe=${id}`}>
              <Plus size={17} aria-hidden="true" /> Ajouter un élève
            </Link>
          </>
        )}
      />

      <DataTable
        caption={`Élèves de la classe ${label}`}
        columns={STUDENT_COLUMNS(setMoving)}
        rows={students}
        rowKey={s => s.id}
        onRowClick={s => router.push(`/ecole/eleves/${s.id}`)}
        rowLabel={s => `Ouvrir la fiche ${deName(fullName(s))}`}
        empty={
          <EmptyState
            icon={GraduationCap}
            title="Aucun élève dans cette classe"
            text="Ajoutez les élèves un par un, ou importez la liste de la classe depuis un fichier Excel ou CSV."
            action={<Link className="ec-btn ec-btn--primary" href="/ecole/import">Importer une liste</Link>}
          />
        }
      />

      {editing && (
        <ClassroomFormModal
          classroom={classroom}
          studentCount={students.length}
          onClose={() => setEditing(false)}
          onSaved={saved => { setEditing(false); setNotice(`La classe ${className(saved)} a été mise à jour.`); reload(); }}
        />
      )}

      {deleting && (
        <ConfirmModal
          title={`Supprimer la classe ${label} ?`}
          consequences={[
            "Cette classe vide sera définitivement supprimée de votre établissement.",
            "Aucun élève n'étant inscrit, aucun compte ne sera impacté.",
          ]}
          confirmLabel="Supprimer la classe"
          danger
          busy={deleteBusy}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(false)}
        />
      )}

      {moving && (
        <MoveStudentModal
          student={moving}
          onClose={() => setMoving(null)}
          onMoved={result => {
            const student = moving;
            setMoving(null);
            setNotice(<MovedMessage student={student} result={result} onUndone={message => { setNotice(message); reload(); }} />);
            reload();
          }}
        />
      )}
    </>
  );
}
