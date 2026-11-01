"use client";

import { useState } from "react";
import { GraduationCap, Search } from "lucide-react";
import { formatRelative, normalizeText, plural } from "@/app/_scolaire/lib/format";
import { listLearners, type LearnerRow } from "@/app/_scolaire/lib/superadminApi";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Pagination, usePagination } from "@/app/_scolaire/ui/Pagination";
import { Badge, DataTable, EmptyState, ErrorMessage, PageHeader, Skeleton, type BadgeTone, type Column } from "@/app/_scolaire/ui/ui";

const STATUS: Record<LearnerRow["status"], { label: string; tone: BadgeTone }> = {
  actif: { label: "En progression", tone: "ok" },
  alerte: { label: "À relancer", tone: "warn" },
  "à démarrer": { label: "À démarrer", tone: "neutral" },
};

const COLUMNS: Column<LearnerRow>[] = [
  { key: "name", header: "Apprenant", render: l => <div><b>{l.displayName}</b><div className="ec-login">{l.email}</div></div> },
  { key: "school", header: "École", render: l => l.school ?? <span style={{ color: "var(--ec-muted)" }}>Hors école</span> },
  { key: "track", header: "Parcours", render: l => `${l.ageTrack} ans` },
  {
    key: "progress", header: "Avancement",
    render: l => (
      <div style={{ display: "grid", gap: 4, minWidth: 120 }}>
        <div className="ec-progress" aria-hidden="true"><span style={{ width: `${l.percent}%` }} /></div>
        <small>{l.completed}/{l.total} leçons ({l.percent} %)</small>
      </div>
    ),
  },
  { key: "xp", header: "XP", align: "right", render: l => l.xp },
  { key: "last", header: "Dernière activité", render: l => formatRelative(l.lastActivity) },
  { key: "status", header: "État", render: l => <Badge tone={STATUS[l.status].tone}>{STATUS[l.status].label}</Badge> },
];

export function LearnersView() {
  const { data, error, reload } = useApi(listLearners);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const query = normalizeText(search.trim());
  const rows = (data ?? [])
    .filter(l => !status || l.status === status)
    .filter(l => !query || normalizeText(`${l.displayName} ${l.email} ${l.school ?? ""}`).includes(query));
  const { visible, page, pageCount, setPage } = usePagination(rows, `${query}|${status}`);

  return (
    <>
      <PageHeader title="Apprenants" subtitle="Progression de tous les élèves de la plateforme, écoles comprises." />
      <div className="ec-toolbar">
        <label className="ec-search">
          <span className="sr-only">Rechercher un apprenant</span>
          <Search size={18} aria-hidden="true" />
          <input className="ec-input" type="search" placeholder="Nom, e-mail ou école…" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        <select className="ec-select" aria-label="État" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Tous les états</option>
          <option value="actif">En progression</option>
          <option value="alerte">À relancer</option>
          <option value="à démarrer">À démarrer</option>
        </select>
        {data && <span className="ec-count">{plural(rows.length, "apprenant")}</span>}
      </div>
      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={300} /> : (
        <>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          <DataTable caption="Progression des apprenants" columns={COLUMNS} rows={visible} rowKey={l => String(l.id)}
            empty={<EmptyState icon={GraduationCap} title="Aucun apprenant trouvé" text="Modifiez la recherche ou le filtre." />} />
        </>
      )}
    </>
  );
}
