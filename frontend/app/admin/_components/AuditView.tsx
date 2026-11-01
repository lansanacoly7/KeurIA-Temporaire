"use client";

import { useCallback, useState } from "react";
import { ScrollText } from "lucide-react";
import { formatRelative, plural } from "@/app/_scolaire/lib/format";
import { listAudit, type AuditEntry } from "@/app/_scolaire/lib/superadminApi";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Pagination } from "@/app/_scolaire/ui/Pagination";
import { DataTable, EmptyState, ErrorMessage, PageHeader, Skeleton, type Column } from "@/app/_scolaire/ui/ui";

const COLUMNS: Column<AuditEntry>[] = [
  { key: "label", header: "Action", render: e => <b>{e.label}</b> },
  { key: "actor", header: "Par", render: e => <span className="ec-login">{e.actor}</span> },
  { key: "at", header: "Quand", render: e => <span title={new Date(e.at).toLocaleString("fr-FR")}>{formatRelative(e.at)}</span> },
];

/** Journal des actions de l'équipe kEur IA (lecture seule, le plus récent en premier). */
export function AuditView() {
  const [page, setPage] = useState(1);
  const load = useCallback(() => listAudit(page), [page]);
  const { data, error, reload } = useApi(load);
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader title="Journal" subtitle="Toutes les actions de l'équipe kEur IA : écoles, directions, comptes, missions." />
      {data && <p style={{ margin: "0 0 12px", color: "var(--ec-muted)" }}>{plural(data.total, "action enregistrée", "actions enregistrées")}</p>}
      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={300} /> : (
        <>
          <Pagination page={page - 1} pageCount={pageCount} onChange={p => setPage(p + 1)} />
          <DataTable caption="Journal des actions" columns={COLUMNS} rows={data.results} rowKey={e => e.id}
            empty={<EmptyState icon={ScrollText} title="Aucune action enregistrée pour le moment" />} />
        </>
      )}
    </>
  );
}
