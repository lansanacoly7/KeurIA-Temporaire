"use client";

import Link from "next/link";
import { Activity, AlertCircle, BookOpen, GraduationCap, Plus, Presentation, School, Sparkles, Trophy, Users } from "lucide-react";
import { formatRelative, plural } from "@/app/_scolaire/lib/format";
import { getPlatformDashboard, ROLE_LABELS } from "@/app/_scolaire/lib/superadminApi";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { ErrorMessage, PageHeader, Skeleton, StatCard } from "@/app/_scolaire/ui/ui";

export function PlatformDashboardView() {
  const { data, error, reload } = useApi(getPlatformDashboard);
  const actions = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      <Link className="ec-btn ec-btn--primary" href="/admin/ecoles?nouvelle=1">
        <Plus size={18} aria-hidden="true" /> Nouvelle école partenaire
      </Link>
      <Link className="ec-btn ec-btn--secondary" href="/admin/missions">
        <BookOpen size={18} aria-hidden="true" /> Missions &amp; Ateliers
      </Link>
    </div>
  );
  const header = (
    <PageHeader 
      title="Tableau de bord" 
      subtitle="Tour de contrôle de la plateforme d'apprentissage IA &amp; Code avec nos écoles partenaires." 
      actions={actions} 
    />
  );
  if (error) return <>{header}<ErrorMessage message={error} onRetry={reload} /></>;
  if (!data) return <>{header}<Skeleton height={320} /></>;

  const { kpis } = data;
  return (
    <>
      {header}
      {data.toHandle && data.toHandle.length > 0 && (
        <section className="ec-card" aria-label="À traiter" style={{ marginBottom: 20, borderColor: "#fed7aa", background: "#fffbeb" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.toHandle.map(item => (
              <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <AlertCircle size={18} style={{ color: "#d97706", flexShrink: 0 }} aria-hidden="true" />
                  <span style={{ fontWeight: 700, color: "#9a3412", fontSize: 14 }}>
                    {item.text}
                  </span>
                </div>
                <Link className="ec-btn ec-btn--primary" href={item.href} style={{ fontSize: 13, padding: "6px 14px", textDecoration: "none", background: "#d97706", borderColor: "#b45309" }}>
                  {item.cta} →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="ec-grid-stats" aria-label="Chiffres clés">
        <StatCard icon={School} label="Écoles partenaires" value={kpis.schools} hint={kpis.suspendedSchools ? `${kpis.suspendedSchools} suspendue${kpis.suspendedSchools > 1 ? "s" : ""}` : "Établissements associés"} />
        <StatCard icon={GraduationCap} label="Jeunes apprenants" value={kpis.students} hint="Enfants initiés à l'IA" />
        <StatCard icon={Presentation} label="Enseignants & Mentors" value={kpis.teachers} hint="Accompagnateurs actifs" />
        <StatCard 
          icon={Activity} 
          label="Actifs aujourd'hui" 
          value={kpis.connectedToday} 
          hint={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="ec-live-dot" aria-hidden="true" />
              <span>En direct · {kpis.activeWeek} cette semaine</span>
            </span>
          } 
        />
      </section>

      <div className="ec-grid-2">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section className="ec-card" aria-labelledby="parcours-titre">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 id="parcours-titre" style={{ margin: 0 }}>Parcours d&apos;apprentissage IA &amp; Code</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {data.kpis.totalLessonsCompleted !== undefined && (
                  <span style={{ fontSize: 13, color: "var(--ec-muted)", fontWeight: 700 }}>
                    <b>{data.kpis.totalLessonsCompleted.toLocaleString()}</b> leçons terminées
                  </span>
                )}
                <Link className="ec-link-btn" href="/admin/studio" style={{ fontSize: 13, fontWeight: 800 }}>
                  Studio No-Code →
                </Link>
              </div>
            </div>

            <div className="ec-tracks-list">
              {(data.tracksProgress ?? []).map(track => (
                <div key={track.key} className="ec-track-item">
                  <div className="ec-track-head">
                    <div className="ec-track-title-wrap">
                      <span className="ec-track-badge" style={{ background: track.fill, color: track.tone }}>
                        {track.label}
                      </span>
                      <h3 className="ec-track-title">{track.name}</h3>
                      <p className="ec-track-sub">{track.tagline}</p>
                    </div>
                    <b style={{ fontSize: 18, color: track.tone, fontWeight: 900, whiteSpace: "nowrap" }}>
                      {track.completed} <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ec-muted)" }}>leçons</span>
                    </b>
                  </div>

                  <div className="ec-track-bar-bg" aria-hidden="true">
                    <div 
                      className="ec-track-bar-fill" 
                      style={{ width: `${Math.max(track.share, 5)}%`, background: track.tone }} 
                    />
                  </div>

                  <div className="ec-track-foot">
                    <span>Part de l&apos;apprentissage global</span>
                    <b>{track.share} %</b>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {data.recentAchievements && data.recentAchievements.length > 0 && (
            <section className="ec-card" aria-labelledby="achieve-titre">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 id="achieve-titre" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 800 }}>
                  <Sparkles size={18} style={{ color: "#b45309" }} aria-hidden="true" /> 
                  Dernières victoires des apprenants
                </h2>
                <Link className="ec-link-btn" href="/admin/apprenants" style={{ fontSize: 13, fontWeight: 800 }}>
                  Voir tous les apprenants →
                </Link>
              </div>

              <div className="ec-achieve-list">
                {data.recentAchievements.map(item => (
                  <div key={item.id} className="ec-achieve-item">
                    <div className="ec-achieve-main">
                      <div className="ec-achieve-avatar" aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#b45309" }}>
                        <Sparkles size={16} />
                      </div>
                      <div className="ec-achieve-info">
                        <span className="ec-achieve-name">{item.studentName}</span>
                        <span className="ec-achieve-sub">
                          {item.school ? `${item.school} · ` : ""}Leçon {item.lessonId} · {formatRelative(item.completedAt)}
                        </span>
                      </div>
                    </div>
                    <span className="ec-xp-pill">+{item.xp} XP</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Podium des écoles partenaires */}
          {data.schoolsLeaderboard && data.schoolsLeaderboard.length > 0 && (
            <section className="ec-card" aria-labelledby="palmares-ecoles-titre">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 id="palmares-ecoles-titre" style={{ margin: 0, fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                  <Trophy size={18} style={{ color: "#d97706" }} aria-hidden="true" />
                  Podium des écoles partenaires
                </h2>
                <span style={{ fontSize: 12, color: "var(--ec-muted)" }}>Cette semaine</span>
              </div>

              <div className="ec-leaderboard-list">
                {data.schoolsLeaderboard.map(s => {
                  const badgeClass = s.rank === 1 ? "ec-rank-badge--1" : s.rank === 2 ? "ec-rank-badge--2" : s.rank === 3 ? "ec-rank-badge--3" : "ec-rank-badge--other";
                  return (
                    <Link key={s.id} href={`/admin/ecoles/${s.id}`} className="ec-leaderboard-row" style={{ textDecoration: "none", color: "inherit" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <span className={`ec-rank-badge ${badgeClass}`}>{s.rank}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
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
                          Total : {s.totalLessons}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <section className="ec-card" aria-labelledby="roles-titre">
            <h2 id="roles-titre" style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800 }}>Communauté kEur IA</h2>
            <ul className="ec-list">
              {Object.entries(data.roles).map(([role, count]) => {
                const roleColors: Record<string, { bg: string; color: string }> = {
                  student: { bg: "#e8f6f1", color: "#0d846e" },
                  teacher: { bg: "#e6f1fb", color: "#185fa5" },
                  parent: { bg: "#fff4dc", color: "#b45309" },
                  school_admin: { bg: "#eeedfe", color: "#534ab7" },
                  admin: { bg: "#f1f5f9", color: "#475569" },
                };
                const style = roleColors[role] ?? { bg: "#f1f5f9", color: "#475569" };
                return (
                  <li key={role} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="ec-list-main" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: style.bg, color: style.color }}>
                        {ROLE_LABELS[role] ?? role}
                      </span>
                    </div>
                    <Link className="ec-link-btn" href={`/admin/comptes?role=${role}`} style={{ fontWeight: 800 }}>
                      {plural(count, "compte")}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="ec-card" aria-labelledby="connexions-titre">
            <h2 id="connexions-titre" style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800 }}>Dernières présences en ligne</h2>
            <ul className="ec-list">
              {data.recentConnections.map(user => {
                const roleBadge: Record<string, { bg: string; color: string }> = {
                  student: { bg: "#e8f6f1", color: "#0d846e" },
                  teacher: { bg: "#e6f1fb", color: "#185fa5" },
                  parent: { bg: "#fff4dc", color: "#b45309" },
                  school_admin: { bg: "#eeedfe", color: "#534ab7" },
                  admin: { bg: "#f1f5f9", color: "#475569" },
                };
                const style = roleBadge[user.role] ?? { bg: "#f1f5f9", color: "#475569" };
                return (
                  <li key={user.id}>
                    <div className="ec-list-main">
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <b>{user.displayName}</b>
                        <span style={{ padding: "1px 6px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: style.bg, color: style.color }}>
                          {ROLE_LABELS[user.role] ?? user.role}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--ec-muted)" }}>
                        {user.school ? `${user.school} · ` : ""}{formatRelative(user.lastSeenAt)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link className="ec-link-btn" href="/admin/journal" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14 }}>
              <Users size={15} aria-hidden="true" /> Journal des actions de l&apos;équipe
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
