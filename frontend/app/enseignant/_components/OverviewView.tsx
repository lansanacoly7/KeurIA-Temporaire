"use client";

import Link from "next/link";
import { Activity, BookOpen, GraduationCap, Plus, School, Sparkles, Target, UserRoundCheck, Lightbulb } from "lucide-react";
import { getTeacherOverview, INACTIVE_AFTER_DAYS } from "@/app/_scolaire/lib/enseignantApi";
import { fullName, plural } from "@/app/_scolaire/lib/format";
import { className } from "@/app/_scolaire/lib/levels";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Badge, EmptyState, ErrorMessage, PageHeader, Skeleton, StatCard } from "@/app/_scolaire/ui/ui";
import { AssignmentProgress } from "./AssignmentProgress";

const MAX_STUDENTS_TO_FOLLOW = 6;

export function OverviewView() {
  const load = getTeacherOverview;
  const { data, error, reload } = useApi(load);

  const actions = (
    <Link className="ec-btn ec-btn--primary" href="/enseignant/missions">
      <Plus size={18} aria-hidden="true" /> Donner un devoir
    </Link>
  );

  const header = (
    <PageHeader
      title="Vue d'ensemble"
      subtitle="Accompagnement pédagogique de vos élèves sur les parcours d'apprentissage IA & Code avec kEur IA."
      actions={actions}
    />
  );

  if (error) return <>{header}<ErrorMessage message={error} onRetry={reload} /></>;
  if (!data) {
    return (
      <>
        {header}
        <div className="ec-grid-stats" style={{ marginTop: 24 }}>{[0, 1, 2, 3].map(i => <div key={i} className="ec-card"><Skeleton height={64} /></div>)}</div>
      </>
    );
  }

  const { teacher, classes, studentsToFollow, openAssignments } = data;

  if (classes.length === 0) {
    return (
      <>
        <p className="ec-greeting">Bonjour {teacher.firstName}</p>
        {header}
        <div className="ec-card">
          <EmptyState icon={School} title="Aucune classe ne vous est confiée pour l'instant" text="La direction de l'école vous attribuera vos classes. Elles apparaîtront ici automatiquement dès leur affectation." />
        </div>
      </>
    );
  }

  // Calcul du nombre total d'élèves et actifs
  const totalStudents = data.students;
  const activeStudents = data.activeThisWeek;
  const activeRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  return (
    <>
      <p className="ec-greeting">Bonjour {teacher.firstName}</p>
      {header}

      {/* Bannière pédagogique kEur IA */}
      <section
        className="ec-card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
          padding: "18px 22px",
          background: "linear-gradient(135deg, var(--ec-surface) 0%, rgba(13, 132, 110, 0.05) 100%)",
          borderLeft: "4px solid var(--ec-brand)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "var(--ec-brand-soft)",
              color: "var(--ec-brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={24} aria-hidden="true" />
          </div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Suivez la progression de vos élèves</h2>
            <span style={{ fontSize: 13, color: "var(--ec-muted)" }}>
              Voyez qui a besoin d&apos;aide, quelles notions posent problème et comment avance chaque classe.
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/enseignant/analytiques" className="ec-btn" style={{ fontSize: 13 }}>
            Voir les analytiques →
          </Link>
        </div>
      </section>

      {/* Chiffres clés de l'apprentissage */}
      <section className="ec-grid-stats" aria-label="Chiffres clés pédagogiques">
        <StatCard icon={School} label="Mes classes" value={classes.length} hint={classes.map(c => className(c.classroom)).join(", ")} />
        <StatCard icon={GraduationCap} label="Mes élèves" value={totalStudents} hint="Inscrits sur kEur IA" />
        <StatCard
          icon={Activity}
          label="Actifs cette semaine"
          value={activeStudents}
          hint={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="ec-live-dot" aria-hidden="true" />
              <span>{activeRate}% d&apos;engagement en direct</span>
            </span>
          }
        />
        <StatCard icon={Target} label="Devoirs IA en cours" value={openAssignments.length} hint="Missions distribuées" />
      </section>

      {/* Grille principale : Élèves à accompagner & Devoirs IA */}
      <div className="ec-grid-2" style={{ marginBottom: 24 }}>
        {/* Devoirs & Missions IA en cours */}
        <section className="ec-card" aria-labelledby="devoirs-titre">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 id="devoirs-titre" style={{ margin: 0, fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <Target size={18} style={{ color: "var(--ec-brand)" }} aria-hidden="true" />
              Devoirs &amp; Missions IA en cours
            </h2>
            <Link className="ec-link-btn" href="/enseignant/missions" style={{ fontSize: 13, fontWeight: 700 }}>
              Toutes les missions →
            </Link>
          </div>

          {openAssignments.length === 0 ? (
            <div style={{ padding: "16px 0", textAlign: "center" }}>
              <p style={{ margin: "0 0 12px", color: "var(--ec-muted)", fontSize: 14 }}>
                Aucun devoir en cours pour le moment. Donnez un devoir à vos élèves depuis la bibliothèque.
              </p>
              <Link className="ec-btn ec-btn--primary" href="/enseignant/missions" style={{ fontSize: 13, display: "inline-flex" }}>
                <Plus size={16} aria-hidden="true" /> Attribuer une mission IA
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {openAssignments.map(summary => <AssignmentProgress key={summary.assignment.id} summary={summary} />)}
            </div>
          )}
        </section>

        {/* Élèves à accompagner sur kEur IA */}
        <section className="ec-card" aria-labelledby="suivre-titre">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 id="suivre-titre" style={{ margin: 0, fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <UserRoundCheck size={18} style={{ color: "#b45309" }} aria-hidden="true" />
              Élèves à accompagner
            </h2>
            <span style={{ fontSize: 12, color: "var(--ec-muted)" }}>Suivi d&apos;apprentissage</span>
          </div>

          {studentsToFollow.length === 0 ? (
            <div style={{ padding: "12px 0" }}>
              <p style={{ margin: 0, color: "var(--ec-brand)", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={16} /> Bravo ! Tous vos élèves sont actifs et avancent à rythme régulier sur kEur IA.
              </p>
            </div>
          ) : (
            <>
              <ul className="ec-list">
                {studentsToFollow.slice(0, MAX_STUDENTS_TO_FOLLOW).map(({ student, classroom, reasons }) => (
                  <li key={student.id}>
                    <div className="ec-list-main">
                      <b>{fullName(student)}</b>
                      <span style={{ fontSize: 12, color: "var(--ec-muted)" }}>{className(classroom)}</span>
                    </div>
                    <div className="ec-badges" style={{ justifyContent: "flex-end" }}>
                      {reasons.map(reason => <Badge key={reason} tone={reason.includes("retard") ? "danger" : "warn"}>{reason}</Badge>)}
                    </div>
                  </li>
                ))}
              </ul>
              <p style={{ margin: "14px 0 0", color: "var(--ec-muted)", fontSize: 12 }}>
                {studentsToFollow.length > MAX_STUDENTS_TO_FOLLOW && `${plural(studentsToFollow.length, "élève")} au total. `}
                Un élève est signalé inactif après {INACTIVE_AFTER_DAYS} jours sans connexion aux leçons IA.
              </p>
            </>
          )}
        </section>
      </div>

      {/* Raccourcis pédagogiques & Outils kEur IA */}
      <section className="ec-card" aria-labelledby="outils-pedago-titre">
        <h2 id="outils-pedago-titre" style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
          <Lightbulb size={18} style={{ color: "var(--ec-brand)" }} aria-hidden="true" />
          Ressources &amp; Actions Pédagogiques kEur IA
        </h2>

        <div className="ec-grid-2">
          <div className="ec-todo ec-todo--brand">
            <span className="ec-todo-icon" aria-hidden="true">
              <BookOpen size={18} />
            </span>
            <div className="ec-todo-text">
              <b style={{ display: "block" }}>Catalogue de Missions &amp; Ateliers IA</b>
              <span style={{ fontSize: 12, color: "var(--ec-muted)", display: "block", marginTop: 2 }}>
                Explorez les modules de sensibilisation aux algorithmes, au prompt engineering et à l&apos;éthique de l&apos;IA.
              </span>
            </div>
            <Link className="ec-todo-action" href="/enseignant/missions">
              Découvrir
            </Link>
          </div>

          <div className="ec-todo ec-todo--brand">
            <span className="ec-todo-icon" aria-hidden="true">
              <Activity size={18} />
            </span>
            <div className="ec-todo-text">
              <b style={{ display: "block" }}>Analytiques &amp; Maîtrise des Compétences</b>
              <span style={{ fontSize: 12, color: "var(--ec-muted)", display: "block", marginTop: 2 }}>
                Consultez le taux de réussite par catégorie de mission et identifiez les notions à approfondir avec la classe.
              </span>
            </div>
            <Link className="ec-todo-action" href="/enseignant/analytiques">
              Analyser
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

