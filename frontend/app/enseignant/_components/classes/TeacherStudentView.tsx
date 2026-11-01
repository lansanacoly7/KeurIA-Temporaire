"use client";

import Link from "next/link";
import { useCallback } from "react";
import { ArrowLeft, Info } from "lucide-react";
import {
  generateParentLinkCodeAsTeacher, getParentLinkAsTeacher,
  getTeacherStudent, type AssignmentStatus, type StudentAssignmentRow,
} from "@/app/_scolaire/lib/enseignantApi";
import { ageFrom, dePrefix, dueLabel, formatDate, formatRelative, fullName } from "@/app/_scolaire/lib/format";
import { className, levelInfo } from "@/app/_scolaire/lib/levels";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { ParentLinkCard } from "@/app/_scolaire/ui/ParentLinkCard";
import { Badge, DataTable, ErrorMessage, PageHeader, Skeleton, StatusBadge, type BadgeTone, type Column } from "@/app/_scolaire/ui/ui";
import { TrackSection } from "./TrackSection";

const STATUS: Record<AssignmentStatus, { label: string; tone: BadgeTone }> = {
  termine: { label: "Terminé", tone: "ok" },
  en_retard: { label: "En retard", tone: "danger" },
  a_faire: { label: "À faire", tone: "warn" },
};

const ASSIGNMENT_COLUMNS: Column<StudentAssignmentRow>[] = [
  { key: "mission", header: "Devoir", render: ({ mission }) => <b>{mission.title}</b> },
  {
    key: "due",
    header: "Date limite",
    render: ({ assignment }) => {
      if (assignment.dueDate === null) return "Sans date limite";
      const relative = dueLabel(assignment.dueDate);
      // Échéance lointaine : dueLabel renvoie déjà la date complète (« le 5 octobre 2026 »).
      return relative.startsWith("le ") ? formatDate(assignment.dueDate) : `${formatDate(assignment.dueDate)} (${relative})`;
    },
  },
  { key: "status", header: "État", render: ({ status }) => <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge> },
  { key: "score", header: "Score", align: "right", render: ({ completion }) => completion ? `${completion.score} %` : "—" },
  { key: "done", header: "Rendu", render: ({ completion }) => completion ? formatRelative(completion.completedAt) : "—" },
];

export function TeacherStudentView({ studentId }: { studentId: string }) {
  const load = useCallback(() => getTeacherStudent(studentId), [studentId]);
  const loadLink = useCallback(() => getParentLinkAsTeacher(studentId), [studentId]);
  const generateLink = useCallback(() => generateParentLinkCodeAsTeacher(studentId), [studentId]);
  const { data, error } = useApi(load);

  const back = (href: string, label: string) => <Link href={href} className="ec-back"><ArrowLeft size={16} aria-hidden="true" /> {label}</Link>;

  if (error) return <>{back("/enseignant/classes", "Mes classes")}<ErrorMessage message={error} /></>;
  if (!data) return <>{back("/enseignant/classes", "Mes classes")}<Skeleton height={48} width={260} /><div style={{ height: 24 }} /><Skeleton height={200} /></>;

  const { student, classroom, assignments } = data;
  const name = fullName(student);

  return (
    <>
      {back(`/enseignant/classes/${classroom.id}`, className(classroom))}
      <PageHeader
        title={name}
        subtitle={`${className(classroom)} · ${student.matricule}`}
      />

      <div className="ec-cards-3" style={{ marginBottom: 24 }}>
        <section className="ec-card" aria-labelledby="identite-titre">
          <h2 id="identite-titre">Identité</h2>
          <dl className="ec-dl">
            <dt>Prénom et nom</dt><dd>{name}</dd>
            <dt>Sexe</dt><dd>{student.sexe === "F" ? "Fille" : "Garçon"}</dd>
            <dt>Âge</dt><dd>{ageFrom(student.birthDate)} ans</dd>
            <dt>Matricule</dt><dd>{student.matricule}</dd>
          </dl>
        </section>
        <section className="ec-card" aria-labelledby="compte-titre">
          <h2 id="compte-titre">Compte de connexion</h2>
          <dl className="ec-dl">
            <dt>Identifiant</dt><dd className="ec-login">{student.login}</dd>
            <dt>Statut</dt><dd><StatusBadge status={student.status} /></dd>
            <dt>Dernière connexion</dt><dd>{formatRelative(student.lastLoginAt)}</dd>
          </dl>
        </section>
        <section className="ec-card" aria-labelledby="progression-titre">
          <h2 id="progression-titre">Progression</h2>
          <div className="ec-mini-stats">
            <div><small>XP</small><b>{student.xp}</b></div>
            <div><small>Leçons terminées</small><b>{student.lessonsCompleted}</b></div>
            <div><small>Devoirs terminés</small><b>{assignments.filter(a => a.status === "termine").length}/{assignments.length}</b></div>
          </div>
        </section>
      </div>

      <TrackSection student={student} classTrack={levelInfo(classroom.level).track} firstName={student.firstName} />

      <div style={{ marginBottom: 24 }}>
        <ParentLinkCard load={loadLink} generate={generateLink} />
      </div>

      <PageHeader section title="Devoirs" />
      <DataTable
        caption={`Devoirs ${dePrefix(name)}${name}`}
        columns={ASSIGNMENT_COLUMNS}
        rows={assignments}
        rowKey={row => row.assignment.id}
        empty={<p style={{ margin: 0, color: "var(--ec-muted)" }}>Aucun devoir donné à cette classe pour l&apos;instant.</p>}
      />

      <p className="ec-readonly" style={{ marginTop: 16 }}>
        <Info size={14} aria-hidden="true" /> Les informations de l&apos;élève et la gestion de son mot de passe sont réservées à la direction de l&apos;école.
      </p>
    </>
  );
}
