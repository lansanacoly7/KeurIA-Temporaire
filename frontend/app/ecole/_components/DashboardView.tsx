"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Award, Bell, BookOpen, CheckCircle2, ExternalLink, GraduationCap, KeyRound, Plus, Printer, School, ShieldAlert, Sparkles, Trophy, Upload } from "lucide-react";
import { getDashboard } from "@/app/_scolaire/lib/ecoleApi";
import { formatRelative, plural } from "@/app/_scolaire/lib/format";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { ErrorMessage, PageHeader, Skeleton, StatCard } from "@/app/_scolaire/ui/ui";

export function DashboardView() {
  const { data, error, loading, reload } = useApi(getDashboard);
  const [resolvedSignalements, setResolvedSignalements] = useState<string[]>([]);

  const actions = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      <Link className="ec-btn" href="/ecole/fiches?tab=import">
        <Upload size={18} aria-hidden="true" /> Importer une liste (PDF, Excel, CSV)
      </Link>
      <Link className="ec-btn ec-btn--primary" href="/ecole/eleves?nouveau=1">
        <Plus size={18} aria-hidden="true" /> Inscrire un élève
      </Link>
    </div>
  );

  const header = (
    <PageHeader
      title="Tableau de bord de l'école"
      subtitle="Suivi de l'apprentissage de l'Intelligence Artificielle et du Code avec kEur IA."
      actions={actions}
    />
  );

  if (error) return <>{header}<ErrorMessage message={error} onRetry={reload} /></>;

  return (
    <>
      {header}

      {/* Bannière identité de l'établissement */}
      {data?.school && (
        <section
          className="ec-card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20,
            padding: "16px 20px",
            background: "linear-gradient(135deg, var(--ec-surface) 0%, rgba(23, 78, 73, 0.04) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {data.school.logoUrl ? (
              <div
                style={{
                  maxHeight: 64,
                  maxWidth: 220,
                  borderRadius: 10,
                  background: "white",
                  border: "1px solid var(--ec-border)",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <img
                  src={data.school.logoUrl}
                  alt={data.school.name}
                  style={{ maxHeight: 54, maxWidth: "100%", width: "auto", height: "auto", objectFit: "contain" }}
                />
              </div>
            ) : (
              <Link
                href="/ecole/parametres"
                title="Emplacement du logo — Ajouter un logo dans les paramètres"
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 10,
                  background: "rgba(23, 78, 73, 0.05)",
                  border: "1.5px dashed var(--ec-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ec-muted)",
                  flexShrink: 0,
                  textDecoration: "none",
                }}
              >
                <School size={26} strokeWidth={1.6} aria-hidden="true" />
              </Link>
            )}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{data.school.name}</h2>
              <span style={{ fontSize: 13, color: "var(--ec-muted)" }}>{data.school.city} · Partenaire officiel kEur IA</span>
            </div>
          </div>

          {data.school.website && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <a
                href={data.school.website}
                target="_blank"
                rel="noopener noreferrer"
                className="ec-btn"
                style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <span>Site internet</span>
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          )}
        </section>
      )}

      {/* Chiffres clés de l'apprentissage kEur IA */}
      <section className="ec-grid-stats" aria-label="Chiffres clés de l'école">
        {loading || !data ? (
          [0, 1, 2, 3].map(i => <div key={i} className="ec-card"><Skeleton height={64} /></div>)
        ) : (
          <>
            <StatCard icon={GraduationCap} label="Jeunes inscrits" value={data.students} hint="Élèves équipés d'un compte kEur IA" />
            <StatCard
              icon={Activity}
              label="Actifs cette semaine"
              value={data.activeThisWeek ?? 0}
              hint={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span className="ec-live-dot" aria-hidden="true" />
                  <span>En apprentissage direct</span>
                </span>
              }
            />
            <StatCard
              icon={BookOpen}
              label="Leçons terminées"
              value={data.totalLessonsCompleted ?? 0}
              hint="Parcours IA & Code complétés"
            />
            <StatCard
              icon={KeyRound}
              label="Fiches à distribuer"
              value={data.neverLoggedIn}
              hint={data.neverLoggedIn > 0 ? "Comptes jamais connectés" : "Tous les élèves sont connectés !"}
              tone={data.neverLoggedIn > 0 ? "warn" : undefined}
            />
          </>
        )}
      </section>

      {/* Classements & Émulation kEur IA (Par classe & Palmarès inter-écoles) */}
      <div className="ec-grid-2" style={{ marginBottom: 24 }}>
        {/* Podium des classes de l'école */}
        <section className="ec-card" aria-labelledby="podium-classes-titre">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 id="podium-classes-titre" style={{ margin: 0, fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <Trophy size={18} style={{ color: "#d97706" }} aria-hidden="true" />
              Podium des classes
            </h2>
            <span style={{ fontSize: 12, color: "var(--ec-muted)" }}>Cette semaine</span>
          </div>

          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ec-muted)" }}>
            Classement interne basé sur les défis et leçons complétés cette semaine.
          </p>

          {loading || !data ? (
            <div style={{ display: "grid", gap: 8 }}>{[0, 1, 2].map(i => <Skeleton key={i} height={42} />)}</div>
          ) : !data.classroomLeaderboard || data.classroomLeaderboard.length === 0 ? (
            <p style={{ margin: 0, color: "var(--ec-muted)", fontSize: 13 }}>Aucune classe enregistrée pour le moment.</p>
          ) : (
            <div className="ec-leaderboard-list">
              {data.classroomLeaderboard.slice(0, 5).map(c => {
                const badgeClass = c.rank === 1 ? "ec-rank-badge--1" : c.rank === 2 ? "ec-rank-badge--2" : c.rank === 3 ? "ec-rank-badge--3" : "ec-rank-badge--other";
                return (
                  <Link key={c.id} href={`/ecole/classes/${c.id}`} className="ec-leaderboard-row" style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <span className={`ec-rank-badge ${badgeClass}`}>{c.rank}</span>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, display: "block" }}>
                          {c.name}
                        </span>
                        <div style={{ fontSize: 12, color: "var(--ec-muted)" }}>
                          {plural(c.studentsCount, "élève")}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <b style={{ fontSize: 14, color: "var(--ec-brand)", display: "block" }}>
                        {plural(c.weeklyLessons, "défi réussi", "défis réussis")}
                      </b>
                      {c.totalLessons > c.weeklyLessons && (
                        <span style={{ fontSize: 11, color: "var(--ec-muted)" }}>
                          Total : {c.totalLessons}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Palmarès inter-écoles kEur IA */}
        <section className="ec-card" aria-labelledby="palmares-ecoles-titre">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 id="palmares-ecoles-titre" style={{ margin: 0, fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <Award size={18} style={{ color: "var(--ec-brand)" }} aria-hidden="true" />
              Palmarès inter-écoles
            </h2>
            <span style={{ fontSize: 12, color: "var(--ec-muted)" }}>Réseau kEur IA</span>
          </div>

          {loading || !data || !data.schoolLeaderboard ? (
            <div style={{ display: "grid", gap: 8 }}>{[0, 1, 2].map(i => <Skeleton key={i} height={42} />)}</div>
          ) : (
            <>
              {/* Bannière de position de l'école */}
              <div className="ec-school-rank-hero">
                <span className="ec-rank-badge ec-rank-badge--1" style={{ width: 34, height: 34, fontSize: 14 }}>
                  #{data.schoolLeaderboard.currentRank}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 14, color: "#174e49" }}>
                    Votre école est {data.schoolLeaderboard.currentRank === 1 ? "1ère" : `${data.schoolLeaderboard.currentRank}e`} sur {data.schoolLeaderboard.totalSchools} écoles partenaires
                  </b>
                  <span style={{ fontSize: 12, color: "#475569" }}>
                    {plural(data.schoolLeaderboard.weeklyLessons, "défi validé", "défis validés")} par vos élèves cette semaine.
                  </span>
                </div>
              </div>

              <div className="ec-leaderboard-list">
                {data.schoolLeaderboard.topSchools.map(s => {
                  const badgeClass = s.rank === 1 ? "ec-rank-badge--1" : s.rank === 2 ? "ec-rank-badge--2" : s.rank === 3 ? "ec-rank-badge--3" : "ec-rank-badge--other";
                  return (
                    <div key={s.id} className={`ec-leaderboard-row ${s.isCurrent ? "ec-leaderboard-highlight" : ""}`}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <span className={`ec-rank-badge ${badgeClass}`}>{s.rank}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                            {s.isCurrent && (
                              <span style={{ fontSize: 11, background: "var(--ec-brand)", color: "white", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                                Vous
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--ec-muted)" }}>
                            {s.city} · {plural(s.studentsCount, "élève")}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <b style={{ fontSize: 14, color: "var(--ec-brand)", display: "block" }}>
                          {plural(s.weeklyLessons, "défi")}
                        </b>
                        <span style={{ fontSize: 11, color: "var(--ec-muted)" }}>
                          cette semaine
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Grille Activité & Actions rapides kEur IA */}
      <div className="ec-grid-2">
        <section className="ec-card" aria-labelledby="activite-titre">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 id="activite-titre" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Activité récente</h2>
            <Link className="ec-link-btn" href="/ecole/eleves" style={{ fontSize: 13, fontWeight: 700 }}>
              Voir les élèves →
            </Link>
          </div>
          {loading || !data ? (
            <div style={{ display: "grid", gap: 12 }}>{[0, 1, 2].map(i => <Skeleton key={i} height={36} />)}</div>
          ) : data.recentActivity.length === 0 ? (
            <p style={{ margin: 0, color: "var(--ec-muted)" }}>Aucune activité récente pour le moment.</p>
          ) : (
            <ul className="ec-list">
              {data.recentActivity.map(item => (
                <li key={item.id}>
                  <div className="ec-list-main">
                    <b>{item.label}</b>
                    <span>{formatRelative(item.at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Signalements & Demandes transmis par les Enseignants */}
        <section className="ec-card" aria-labelledby="signalements-titre" style={{ borderLeft: "4px solid #b45309" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 id="signalements-titre" style={{ margin: 0, fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={18} style={{ color: "#b45309" }} aria-hidden="true" />
              Signalements des Enseignants
            </h2>
            <span style={{ fontSize: 11, background: "#fff4dc", color: "#b45309", padding: "2px 8px", borderRadius: 999, fontWeight: 800 }}>
              À traiter par la direction
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!resolvedSignalements.includes("sig-1") ? (
              <div className="ec-todo" style={{ background: "#fffbf5", borderColor: "#fde68a" }}>
                <span className="ec-todo-icon" style={{ background: "#fff3dc", color: "#b45309" }}>
                  <ShieldAlert size={17} />
                </span>
                <div className="ec-todo-text">
                  <b style={{ display: "block", fontSize: 13, color: "#92400e" }}>
                    Demande de réinitialisation de mot de passe
                  </b>
                  <span style={{ fontSize: 12, color: "var(--ec-muted)", display: "block", marginTop: 2 }}>
                    Signalisé par M. Sow · Élève : Oumar Sy (CM2) · Il y a 10 min
                  </span>
                </div>
                <Link
                  className="ec-todo-action"
                  href="/ecole/fiches?tab=eleves"
                  onClick={() => setResolvedSignalements(prev => [...prev, "sig-1"])}
                  style={{ background: "#b45309", color: "white" }}
                >
                  Régénérer &amp; Régler →
                </Link>
              </div>
            ) : (
              <div style={{ padding: "10px 14px", background: "#e8f6f1", borderRadius: 10, color: "var(--ec-brand)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} /> Signalement de M. Sow traité avec succès.
              </div>
            )}
          </div>
        </section>

        <section className="ec-card" aria-labelledby="actions-rapides-titre">
          <h2 id="actions-rapides-titre" style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} style={{ color: "var(--ec-brand)" }} aria-hidden="true" />
            Accompagnement &amp; Outils kEur IA
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data && data.neverLoggedIn > 0 && (
              <div className="ec-todo">
                <span className="ec-todo-icon" aria-hidden="true">
                  <Printer size={17} />
                </span>
                <div className="ec-todo-text">
                  <b style={{ display: "block" }}>
                    {plural(data.neverLoggedIn, "élève n'a pas encore découvert", "élèves n'ont pas encore découvert")} son compte
                  </b>
                  <span style={{ fontSize: 12, color: "#b45309", display: "block", marginTop: 2 }}>
                    Imprimez leurs fiches de connexion en quelques clics.
                  </span>
                </div>
                <Link className="ec-todo-action" href="/ecole/fiches">
                  Imprimer
                </Link>
              </div>
            )}

            <div className="ec-todo ec-todo--brand">
              <span className="ec-todo-icon" aria-hidden="true">
                <Upload size={17} />
              </span>
              <div className="ec-todo-text">
                <b style={{ display: "block" }}>Import groupé d&apos;élèves &amp; enseignants</b>
                <span style={{ fontSize: 12, color: "var(--ec-muted)", display: "block", marginTop: 2 }}>
                  Supporte vos listes au format PDF, Excel ou CSV.
                </span>
              </div>
              <Link className="ec-todo-action" href="/ecole/fiches?tab=import">
                Importer
              </Link>
            </div>

            <div className="ec-todo ec-todo--brand">
              <span className="ec-todo-icon" aria-hidden="true">
                <School size={17} />
              </span>
              <div className="ec-todo-text">
                <b style={{ display: "block" }}>Classes &amp; Enseignants kEur IA</b>
                <span style={{ fontSize: 12, color: "var(--ec-muted)", display: "block", marginTop: 2 }}>
                  {data ? `${plural(data.classes, "classe")} · ${plural(data.teachers, "enseignant")}` : "Chargement..."}
                </span>
              </div>
              <Link className="ec-todo-action" href="/ecole/classes">
                Voir
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
