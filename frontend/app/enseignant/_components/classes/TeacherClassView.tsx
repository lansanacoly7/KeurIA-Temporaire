"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowLeft, CheckCircle2, Info, Search, Send, Target, Trophy } from "lucide-react";
import { getTeacherClass, type StudentProgressRow } from "@/app/_scolaire/lib/enseignantApi";
import { AnnoncesSection } from "./AnnoncesSection";
import { SeanceSection } from "./SeanceSection";
import { TeacherRulesSection } from "./TeacherRulesSection";
import { getTeacherClassBlockings, type ClassBlockingLesson } from "@/app/_scolaire/lib/enseignantApi";
import { formatRelative, fullName, normalizeText, plural, deName } from "@/app/_scolaire/lib/format";
import { className, levelInfo } from "@/app/_scolaire/lib/levels";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Badge, DataTable, EmptyState, ErrorMessage, Field, Modal, PageHeader, Skeleton, StatusBadge, type Column } from "@/app/_scolaire/ui/ui";
import { AssignmentProgress } from "../AssignmentProgress";

const COLUMNS: Column<StudentProgressRow>[] = [
  {
    key: "name",
    header: "Élève",
    render: ({ student }) => (
      <div>
        <b>{student.lastName.toUpperCase()} {student.firstName}</b>
        <div className="ec-login">{student.matricule}</div>
      </div>
    ),
  },
  { key: "status", header: "Compte", render: ({ student }) => <StatusBadge status={student.status} /> },
  { key: "last", header: "Dernière connexion", render: ({ student }) => formatRelative(student.lastLoginAt) },
  { key: "xp", header: "XP", align: "right", render: ({ student }) => student.xp },
  { key: "lessons", header: "Leçons", align: "right", render: ({ student }) => student.lessonsCompleted },
  {
    key: "homework",
    header: "Devoirs rendus à temps",
    render: ({ due, doneOnTime, late }) => due === 0 ? "—" : (
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
        {doneOnTime}/{due}
        {late > 0 && <Badge tone="danger">{plural(late, "en retard", "en retard")}</Badge>}
      </span>
    ),
  },
];

export function TeacherClassView({ classId }: { classId: string }) {
  const router = useRouter();
  const load = useCallback(() => getTeacherClass(classId), [classId]);
  const { data, error } = useApi(load);
  const loadBlockings = useCallback(() => getTeacherClassBlockings(classId), [classId]);
  const { data: blockings } = useApi(loadBlockings);
  const [search, setSearch] = useState("");
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("mdp_oublie");
  const [targetStudentId, setTargetStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  const back = <Link href="/enseignant/classes" className="ec-back"><ArrowLeft size={16} aria-hidden="true" /> Mes classes</Link>;

  if (error) return <>{back}<ErrorMessage message={error} /></>;
  if (!data) return <>{back}<Skeleton height={48} width={220} /><div style={{ height: 24 }} /><Skeleton height={200} /></>;

  const { classroom, students, assignments, activeThisWeek } = data;
  const level = levelInfo(classroom.level);
  const neverLoggedIn = students.filter(row => row.student.status === "jamais_connecte").length;
  const late = students.filter(row => row.late > 0).length;
  const query = normalizeText(search.trim());
  const visible = students.filter(({ student }) => !query || normalizeText(`${student.firstName} ${student.lastName} ${student.matricule}`).includes(query));

  return (
    <>
      {back}
      <PageHeader
        title={className(classroom)}
        subtitle={`${level.label} · Parcours ${level.track} ans · ${classroom.academicYear}`}
        actions={
          <>
            <button type="button" className="ec-btn" onClick={() => setReportModal(true)}>
              <Send size={17} aria-hidden="true" /> Signaler à l&apos;école
            </button>
            <Link className="ec-btn ec-btn--primary" href="/enseignant/missions">
              <Target size={17} aria-hidden="true" /> Donner un devoir
            </Link>
          </>
        }
      />

      <div className="ec-detail-grid" style={{ marginBottom: 20 }}>
        <section className="ec-card" aria-labelledby="chiffres-titre">
          <h2 id="chiffres-titre">En chiffres</h2>
          <div className="ec-mini-stats" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div><small>Élèves</small><b>{students.length}</b></div>
            <div><small>Actifs (7 j)</small><b>{activeThisWeek}</b></div>
            <div><small>En retard</small><b>{late}</b></div>
            <div><small>Jamais connectés</small><b>{neverLoggedIn}</b></div>
          </div>
        </section>
        <section className="ec-card" aria-labelledby="podium-titre">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 id="podium-titre" style={{ margin: 0, fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <Trophy size={18} style={{ color: "#d97706" }} aria-hidden="true" />
              Podium des Éléves (XP &amp; Défis)
            </h2>
            <span style={{ fontSize: 12, color: "var(--ec-muted)" }}>Classement classe</span>
          </div>

          {students.length === 0 ? (
            <p style={{ margin: 0, color: "var(--ec-muted)", fontSize: 13 }}>Aucun élève enregistré.</p>
          ) : (
            <div className="ec-leaderboard-list">
              {[...students]
                .sort((a, b) => b.student.xp - a.student.xp || b.student.lessonsCompleted - a.student.lessonsCompleted)
                .slice(0, 3)
                .map(({ student }, index) => {
                  const rank = index + 1;
                  const badgeClass = rank === 1 ? "ec-rank-badge--1" : rank === 2 ? "ec-rank-badge--2" : "ec-rank-badge--3";
                  return (
                    <div key={student.id} className="ec-leaderboard-row" style={{ padding: "6px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span className={`ec-rank-badge ${badgeClass}`}>{rank}</span>
                        <div style={{ minWidth: 0 }}>
                          <Link href={`/enseignant/eleves/${student.id}`} style={{ fontWeight: 800, fontSize: 13, color: "inherit", textDecoration: "none", display: "block" }}>
                            {fullName(student)}
                          </Link>
                          <span style={{ fontSize: 11, color: "var(--ec-muted)" }}>{student.lessonsCompleted} leçons terminées</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <b style={{ fontSize: 13, color: "var(--ec-brand)" }}>{student.xp} XP</b>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </div>

      <SeanceSection classId={classId} levelTrack={level.track} />
      <AnnoncesSection classId={classId} />

      <section className="ec-card" aria-labelledby="devoirs-classe-titre" style={{ marginBottom: 20 }}>
        <h2 id="devoirs-classe-titre" style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>Devoirs de la classe</h2>
        {assignments.length === 0 ? (
          <p style={{ margin: 0, color: "var(--ec-muted)", fontSize: 13 }}>Aucun devoir donné pour l&apos;instant.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {assignments.map(summary => <AssignmentProgress key={summary.assignment.id} summary={summary} showClass={false} />)}
          </div>
        )}
      </section>

      <div className="ec-toolbar">
        <label className="ec-search">
          <span className="sr-only">Rechercher un élève</span>
          <Search size={18} aria-hidden="true" />
          <input className="ec-input" type="search" placeholder="Nom ou matricule…" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        <span className="ec-count" aria-live="polite">{plural(visible.length, "élève")}</span>
      </div>

      <DataTable
        caption={`Élèves de ${className(classroom)}`}
        columns={COLUMNS}
        rows={visible}
        rowKey={row => row.student.id}
        onRowClick={row => router.push(`/enseignant/eleves/${row.student.id}`)}
        rowLabel={row => `Ouvrir la fiche ${deName(fullName(row.student))}`}
        empty={<EmptyState title={search ? "Aucun élève trouvé" : "Aucun élève dans cette classe"} />}
      />

      <p className="ec-readonly" style={{ marginTop: 16 }}>
        <Info size={14} aria-hidden="true" /> Pour inscrire, retirer ou changer un élève de classe, contactez la direction de l&apos;école.
      </p>

      <section className="ec-card" aria-labelledby="blocages-titre" style={{ marginTop: 20 }}>
        <h2 id="blocages-titre" style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>
          Élèves bloqués
        </h2>
        {blockings && blockings.lessons.every((lesson: ClassBlockingLesson) => lesson.difficult.length === 0 && lesson.stopped.length === 0) ? (
          <p style={{ margin: 0, color: "var(--ec-muted)", fontSize: 13 }}>Aucun élève n&apos;est bloqué.</p>
        ) : (
          blockings?.lessons.map((lesson: ClassBlockingLesson) => (
            (lesson.difficult.length > 0 || lesson.stopped.length > 0) && (
              <div key={lesson.lessonId} style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
                  {lesson.lessonTitle}{" "}
                  <small style={{ color: "var(--ec-muted)", fontWeight: 500 }}>
                    — {lesson.completed}/{lesson.total} terminés
                    {lesson.averageStars != null ? ` · moyenne ${lesson.averageStars} étoile(s)` : ""}
                  </small>
                </h3>
                {lesson.difficult.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: 13 }}>En difficulté :</strong>
                    <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0", display: "grid", gap: 4 }}>
                      {lesson.difficult.map((student) => (
                        <li key={student.id}>
                          <Link href={`/enseignant/eleves/${student.id}`} className="ec-link">
                            {student.lastName.toUpperCase()} {student.firstName}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {lesson.stopped.length > 0 && (
                  <div>
                    <strong style={{ fontSize: 13 }}>À l&apos;arrêt :</strong>
                    <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0", display: "grid", gap: 4 }}>
                      {lesson.stopped.map((student) => (
                        <li key={student.id}>
                          <Link href={`/enseignant/eleves/${student.id}`} className="ec-link">
                            {student.lastName.toUpperCase()} {student.firstName}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          ))
        )}
      </section>


      <section className="ec-card" aria-labelledby="regles-classe-titre" style={{ marginTop: 20 }}>
        <h2 id="regles-classe-titre" style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>Règles de la classe</h2>
        <TeacherRulesSection classId={classId} />
      </section>

      {reportModal && (
        <Modal
          title="Signaler à l'école"
          onClose={() => { setReportModal(false); setReportSuccess(false); }}
          footer={
            reportSuccess ? (
              <button type="button" className="ec-btn ec-btn--primary" onClick={() => { setReportModal(false); setReportSuccess(false); }}>
                Fermer
              </button>
            ) : (
              <>
                <button type="button" className="ec-btn" onClick={() => setReportModal(false)}>Annuler</button>
                <button
                  type="button"
                  className="ec-btn ec-btn--primary"
                  onClick={() => setReportSuccess(true)}
                >
                  <Send size={15} aria-hidden="true" /> Transmettre à l&apos;admin
                </button>
              </>
            )
          }
        >
          {reportSuccess ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#e8f6f1", color: "var(--ec-brand)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <CheckCircle2 size={28} />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800 }}>Signalement transmis avec succès</h3>
              <p style={{ margin: 0, color: "var(--ec-muted)", fontSize: 13 }}>
                La direction de l&apos;école a été notifiée de votre demande concernant la classe {className(classroom)}.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <Field label="Motif du signalement">
                <select className="ec-select" value={reportReason} onChange={e => setReportReason(e.target.value)}>
                  <option value="mdp_oublie">Mot de passe oublié par un élève</option>
                  <option value="blocage_compte">Compte bloqué ou problème de connexion</option>
                  <option value="changement_liste">Demande d&apos;inscription / retrait d&apos;élève</option>
                  <option value="autre">Autre demande pédagogique</option>
                </select>
              </Field>

              <Field label="Élève concerné (optionnel)">
                <div style={{ display: "grid", gap: 8 }}>
                  <input
                    type="search"
                    className="ec-input"
                    placeholder="Rechercher par nom, prénom ou matricule..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    style={{ fontSize: 13 }}
                  />

                  {targetStudentId ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--ec-brand-soft)", borderRadius: 8, border: "1px solid var(--ec-brand)" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ec-brand)" }}>
                        Élève sélectionné : {(() => {
                          const s = students.find(item => item.student.id === targetStudentId)?.student;
                          return s ? `${fullName(s)} (${s.matricule})` : "Élève";
                        })()}
                      </span>
                      <button
                        type="button"
                        className="ec-btn ec-btn--ghost"
                        style={{ padding: "2px 6px", fontSize: 12 }}
                        onClick={() => { setTargetStudentId(""); setStudentSearch(""); }}
                      >
                        Réinitialiser
                      </button>
                    </div>
                  ) : null}

                  <div
                    style={{
                      maxHeight: 150,
                      overflowY: "auto",
                      border: "1px solid var(--ec-line)",
                      borderRadius: 8,
                      background: "var(--ec-surface)",
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 12px",
                        border: "none",
                        background: targetStudentId === "" ? "rgba(13, 132, 110, 0.08)" : "transparent",
                        fontWeight: targetStudentId === "" ? 800 : 500,
                        fontSize: 13,
                        cursor: "pointer",
                        borderBottom: "1px solid var(--ec-line)",
                        color: "inherit",
                      }}
                      onClick={() => setTargetStudentId("")}
                    >
                      -- Toute la classe --
                    </button>
                    {(() => {
                      const q = normalizeText(studentSearch.trim());
                      const matches = students.filter(({ student }) =>
                        !q || normalizeText(`${student.firstName} ${student.lastName} ${student.matricule}`).includes(q)
                      );
                      if (matches.length === 0) {
                        return (
                          <div style={{ padding: 12, fontSize: 13, color: "var(--ec-muted)", textAlign: "center" }}>
                            Aucun élève trouvé pour « {studentSearch} »
                          </div>
                        );
                      }
                      return matches.map(({ student }) => {
                        const isSelected = targetStudentId === student.id;
                        return (
                          <button
                            key={student.id}
                            type="button"
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "8px 12px",
                              border: "none",
                              background: isSelected ? "rgba(13, 132, 110, 0.12)" : "transparent",
                              fontWeight: isSelected ? 800 : 500,
                              fontSize: 13,
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
                              color: "inherit",
                            }}
                            onClick={() => setTargetStudentId(student.id)}
                          >
                            <span>{fullName(student)}</span>
                            <small style={{ color: "var(--ec-muted)" }}>{student.matricule}</small>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              </Field>

              <Field label="Précisions pour la direction (optionnel)">
                <textarea
                  className="ec-input"
                  rows={3}
                  placeholder="Ex : L'élève a oublié son mot de passe lors du dernier atelier..."
                  value={reportMessage}
                  onChange={e => setReportMessage(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </Field>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
