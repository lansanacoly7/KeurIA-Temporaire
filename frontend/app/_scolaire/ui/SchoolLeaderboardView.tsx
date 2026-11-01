"use client";

import { useCallback, useState } from "react";
import { TierIcon } from "../../components/TierIcon";
import { Star, Trophy, Users, Zap } from "lucide-react";
import { className } from "../lib/levels";
import type { LeaderboardPeriod, SchoolLeaderboard, SchoolLeaderboardEntry } from "../lib/types";
import { useApi } from "../lib/useApi";
import { plural } from "../lib/format";
import { Pagination, usePagination } from "./Pagination";
import { DataTable, EmptyState, ErrorMessage, PageHeader, Skeleton, StatCard, type Column } from "./ui";

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "weekly", label: "7 derniers jours" },
  { value: "monthly", label: "30 derniers jours" },
  { value: "all_time", label: "Depuis le début" },
];

const COLUMNS: Column<SchoolLeaderboardEntry>[] = [
  { key: "rank", header: "Rang", render: e => <b>#{e.rank}</b> },
  {
    key: "student",
    header: "Élève",
    render: e => (
      <span>
        <b>{e.student.lastName.toUpperCase()} {e.student.firstName}</b>
      </span>
    ),
  },
  { key: "class", header: "Classe", render: e => (e.classroom ? className(e.classroom) : "—") },
  {
    key: "badge",
    header: "Titre",
    render: e => (
      <span
        style={{
          background: e.badge.bg, border: `1px solid ${e.badge.border}`, color: e.badge.color,
          borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
        }}
      >
        <TierIcon tier={e.badge.tier} /> {e.badge.label}
      </span>
    ),
  },
  { key: "lessons", header: "Leçons", align: "right", render: e => e.lessons },
  { key: "xp", header: "XP", align: "right", render: e => <b>{e.xp}</b> },
];

/**
 * Classement des élèves d'un établissement. `load` est fourni par l'espace (direction ou
 * enseignant) : le serveur ne renvoie que les élèves de l'école de la session.
 */
export function SchoolLeaderboardView({ load, subtitle }: {
  load: (period: LeaderboardPeriod, classId?: string) => Promise<SchoolLeaderboard>;
  subtitle: string;
}) {
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [classId, setClassId] = useState("");

  const fetcher = useCallback(() => load(period, classId || undefined), [load, period, classId]);
  const { data, error, loading, reload } = useApi(fetcher);

  const entries = data?.entries ?? [];
  const { visible, page, pageCount, setPage } = usePagination(entries, `${period}|${classId}`);

  if (error) return <><PageHeader title="Classement" subtitle={subtitle} /><ErrorMessage message={error} onRetry={reload} /></>;

  return (
    <>
      <PageHeader title="Classement" subtitle={subtitle} />

      <div className="ec-toolbar">
        <label>
          <span className="sr-only">Période</span>
          <select className="ec-select" value={period} onChange={e => setPeriod(e.target.value as LeaderboardPeriod)}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filtrer par classe</span>
          <select className="ec-select" value={classId} onChange={e => setClassId(e.target.value)}>
            <option value="">Toutes les classes</option>
            {(data?.classrooms ?? []).map(c => <option key={c.id} value={c.id}>{className(c)}</option>)}
          </select>
        </label>
      </div>

      <section className="ec-grid-stats" aria-label="Chiffres clés">
        {loading || !data ? (
          [0, 1, 2].map(i => <div key={i} className="ec-card"><Skeleton height={64} /></div>)
        ) : (
          <>
            <StatCard icon={Users} label="Élèves classés" value={data.participants} hint={`sur ${plural(data.totalStudents, "élève")}`} />
            <StatCard icon={Zap} label="XP gagnés" value={data.totalXp.toLocaleString("fr-FR")} hint={data.periodLabel} />
            <StatCard icon={Star} label="Premier" value={entries[0] ? `${entries[0].student.firstName}` : "—"} hint={entries[0] ? `${entries[0].xp} XP` : "personne pour l'instant"} />
          </>
        )}
      </section>

      {loading || !data ? (
        <div className="ec-card"><Skeleton height={220} /></div>
      ) : (
        <>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          <DataTable
            caption="Classement des élèves"
            columns={COLUMNS}
            rows={visible}
            rowKey={e => e.student.id}
            empty={
              <EmptyState
                icon={Trophy}
                title="Personne n'est encore classé"
                text="Les élèves apparaissent dès qu'ils gagnent de l'XP sur la période choisie."
              />
            }
          />
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        </>
      )}
    </>
  );
}
