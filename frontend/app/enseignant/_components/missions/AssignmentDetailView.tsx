"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, Lightbulb, Star, Trash2 } from "lucide-react";
import { deleteAssignment, getAssignmentDetail, isPastDue, type AssignmentDetail } from "@/app/_scolaire/lib/enseignantApi";
import { getLessonSheet, type QuestionStat, type LessonSheet } from "@/app/_scolaire/lib/programmeApi";
import { dueLabel, formatDate, formatRelative, plural } from "@/app/_scolaire/lib/format";
import { className } from "@/app/_scolaire/lib/levels";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Badge, ConfirmModal, DataTable, ErrorMessage, PageHeader, Skeleton, StatusBadge, type Column } from "@/app/_scolaire/ui/ui";

type DoneRow = AssignmentDetail["done"][number];
type PendingRow = AssignmentDetail["pending"][number];

const DONE_COLUMNS: Column<DoneRow>[] = [
  { key: "name", header: "Élève", render: ({ student }) => <Link href={`/enseignant/eleves/${student.id}`}>{student.lastName.toUpperCase()} {student.firstName}</Link> },
  { key: "score", header: "Score", align: "right", render: ({ completion }) => <b>{completion.score} %</b> },
  { key: "when", header: "Rendu", render: ({ completion }) => formatRelative(completion.completedAt) },
];

const PENDING_COLUMNS: Column<PendingRow>[] = [
  { key: "name", header: "Élève", render: ({ student }) => <Link href={`/enseignant/eleves/${student.id}`}>{student.lastName.toUpperCase()} {student.firstName}</Link> },
  { key: "state", header: "État", render: ({ late }) => late ? <Badge tone="danger">En retard</Badge> : <Badge tone="warn">À faire</Badge> },
  { key: "account", header: "Compte", render: ({ student }) => <StatusBadge status={student.status} /> },
  { key: "last", header: "Dernière connexion", render: ({ student }) => formatRelative(student.lastLoginAt) },
];

export function AssignmentDetailView({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const load = useCallback(() => getAssignmentDetail(assignmentId), [assignmentId]);
  const { data, error } = useApi(load);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lessonSheet, setLessonSheet] = useState<LessonSheet | null>(null);

  const questionStats = (data as (AssignmentDetail & { questionStats?: QuestionStat[] }) | null)?.questionStats;
  const lessonId = (data as (AssignmentDetail & { lessonId?: string | null }) | null)?.lessonId;
  const weakQuestions = questionStats?.filter(stat => stat.successRate !== null && stat.successRate < 60) || [];

  useEffect(() => {
    if (lessonId && weakQuestions.length > 0) {
      getLessonSheet(lessonId).then(setLessonSheet).catch(() => {});
    }
  }, [lessonId, weakQuestions.length]);

  const back = <Link href="/enseignant/missions?onglet=suivi" className="ec-back"><ArrowLeft size={16} aria-hidden="true" /> Devoirs donnés</Link>;

  if (error) return <>{back}<ErrorMessage message={error} /></>;
  if (!data) return <>{back}<Skeleton height={48} width={300} /><div style={{ height: 24 }} /><Skeleton height={200} /></>;

  const { summary, done, pending, averageScore } = data;
  const { assignment, mission, classroom, completed, total } = summary;
  const due = assignment.dueDate === null
    ? "Sans date limite"
    : `${isPastDue(assignment) ? "Date limite passée" : "À rendre"} ${dueLabel(assignment.dueDate)}${dueLabel(assignment.dueDate).startsWith("le ") ? "" : ` (${formatDate(assignment.dueDate)})`}`;

  async function confirmDelete() {
    setBusy(true);
    setDeleteError(null);
    try {
      await deleteAssignment(assignmentId);
      router.push("/enseignant/missions?onglet=suivi");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Suppression impossible.");
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <>
      {back}
      <PageHeader
        title={mission.title}
        subtitle={`${className(classroom)} · ${mission.category} · ${due}`}
        actions={done.length === 0 ? (
          <button type="button" className="ec-btn ec-btn--danger" onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={17} aria-hidden="true" /> Supprimer le devoir
          </button>
        ) : undefined}
      />

      {deleteError && <ErrorMessage message={deleteError} />}
      {done.length > 0 && (
        <p className="ec-readonly" style={{ marginTop: 0 }}>
          {plural(done.length, "élève l'a", "élèves l'ont")} déjà rendu : ce devoir ne peut plus être supprimé, pour conserver leurs résultats.
        </p>
      )}

      <div className="ec-detail-grid">
        <section className="ec-card" aria-labelledby="bilan-titre">
          <h2 id="bilan-titre">Bilan</h2>
          <div className="ec-mini-stats">
            <div><small>Terminé</small><b>{completed}/{total}</b></div>
            <div><small>Score moyen</small><b>{averageScore === null ? "—" : `${averageScore} %`}</b></div>
            <div><small>{isPastDue(assignment) ? "En retard" : "À faire"}</small><b>{pending.length}</b></div>
          </div>
        </section>
        <section className="ec-card" aria-labelledby="mission-titre">
          <h2 id="mission-titre">La mission</h2>
          <p style={{ margin: "0 0 10px", color: "var(--ec-muted)" }}>{mission.description}</p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ec-muted)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={13} /> {mission.durationMinutes} min</span>
            ·
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Star size={13} style={{ color: "#f59e0b" }} /> {mission.xp} XP</span>
            · {mission.difficulty} · donné {formatRelative(assignment.createdAt).toLowerCase()}
          </p>
          {assignment.instructions && <p style={{ margin: "12px 0 0" }}><b>Consigne :</b> {assignment.instructions}</p>}
        </section>
      </div>

      <PageHeader section title={`Pas encore rendu (${pending.length})`} />
      <div style={{ marginBottom: 24 }}>
        <DataTable
          caption={`Élèves n'ayant pas encore rendu ${mission.title}`}
          columns={PENDING_COLUMNS}
          rows={pending}
          rowKey={row => row.student.id}
          empty={<p style={{ margin: 0, color: "var(--ec-muted)", display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={15} style={{ color: "#10b981" }} /> Tous les élèves ont rendu ce devoir.</p>}
        />
      </div>

      <PageHeader section title={`Terminé (${done.length})`} />
      <DataTable
        caption={`Élèves ayant terminé ${mission.title}`}
        columns={DONE_COLUMNS}
        rows={done}
        rowKey={row => row.student.id}
        empty={<p style={{ margin: 0, color: "var(--ec-muted)" }}>Aucun élève n&apos;a encore terminé ce devoir.</p>}
      />

      {questionStats && questionStats.length > 0 && (
        <>
          <PageHeader section title="Questions" actions={
            lessonId ? <Link href={`/enseignant/programme/${lessonId}`} className="ec-btn">Revoir la leçon</Link> : undefined
          } />

          {weakQuestions.length > 0 && lessonSheet && (
            <div className="ec-alert" style={{ marginBottom: 16 }}>
              <Lightbulb size={20} style={{ flexShrink: 0, marginTop: 2, color: "var(--ec-brand)" }} />
              <div>
                <b>Aide au bon moment</b>
                <ul style={{ margin: "8px 0 12px", paddingLeft: 20 }}>
                  {weakQuestions.map((q, i) => (
                    <li key={i}>{q.answered - q.correct} élèves sur {q.answered} ont raté la question {q.index + 1}.</li>
                  ))}
                </ul>
                <div style={{ background: "rgba(255,255,255,0.6)", padding: 12, borderRadius: 8 }}>
                  <b style={{ display: "block", marginBottom: 6 }}>Conduite à tenir (tirée du guide) :</b>
                  {lessonSheet.guide.commonMistakes.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>Erreurs fréquentes :</strong>
                      <ul style={{ margin: "4px 0", paddingLeft: 20 }}>
                        {lessonSheet.guide.commonMistakes.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                  {lessonSheet.guide.source !== "auto" && lessonSheet.guide.explain && (
                    <div>
                      <strong>Pour réexpliquer :</strong> {lessonSheet.guide.explain}
                    </div>
                  )}
                  {lessonSheet.guide.commonMistakes.length === 0 && (lessonSheet.guide.source === "auto" || !lessonSheet.guide.explain) && (
                    <p style={{ margin: 0, color: "var(--ec-muted)" }}>Consultez la fiche de leçon pour plus de détails.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="ec-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {questionStats.map((stat, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, borderBottom: i < questionStats.length - 1 ? "1px solid var(--ec-line)" : "none", paddingBottom: i < questionStats.length - 1 ? 16 : 0 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 8px", fontWeight: 500 }}>{stat.question}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--ec-muted)" }}>
                    <div style={{ flex: 1, height: 6, background: "var(--ec-bg)", borderRadius: 3, overflow: "hidden", border: "1px solid var(--ec-line)" }}>
                      {stat.successRate !== null && (
                        <div style={{ width: `${stat.successRate}%`, height: "100%", background: stat.successRate < 60 ? "var(--ec-danger)" : "var(--ec-brand)" }} />
                      )}
                    </div>
                    <span>
                      {stat.successRate === null ? "Pas encore de réponse" : `${stat.correct} réussites sur ${stat.answered}`}
                    </span>
                  </div>
                </div>
                {stat.successRate !== null && stat.successRate < 60 && (
                  <Badge tone="danger">À revoir</Badge>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {confirmingDelete && (
        <ConfirmModal
          title="Supprimer ce devoir ?"
          consequences={[
            <>« {mission.title} » est retiré du suivi de {className(classroom)}.</>,
            "Les élèves ne le verront plus dans leurs devoirs.",
          ]}
          unchanged="les résultats des élèves (personne ne l'a encore rendu)."
          reversibility="Action définitive : pour le redonner, il faudra l'assigner de nouveau."
          confirmLabel="Supprimer le devoir"
          danger
          busy={busy}
          onConfirm={confirmDelete}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}
