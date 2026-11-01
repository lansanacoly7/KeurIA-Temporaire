"use client";

import Link from "next/link";
import { useCallback } from "react";
import { Archive } from "lucide-react";
import { getPastYear } from "@/app/_scolaire/lib/anneeApi";
import { formatDate, plural } from "@/app/_scolaire/lib/format";
import { className, levelInfo } from "@/app/_scolaire/lib/levels";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { DataTable, ErrorMessage, PageHeader, Skeleton } from "@/app/_scolaire/ui/ui";

/** Année clôturée, en lecture seule : ses classes archivées et leurs élèves de l'époque. */
export function PastYearView({ label }: { label: string }) {
  const load = useCallback(() => getPastYear(label), [label]);
  const { data, error } = useApi(load);

  if (error) return <><PageHeader title={`Année ${label}`} /><ErrorMessage message={error} /></>;
  if (!data) return <><PageHeader title={`Année ${label}`} /><Skeleton height={300} /></>;

  const { year, classes } = data;
  const s = year.summary;
  return (
    <>
      <PageHeader
        title={`Année ${year.label}`}
        subtitle={`Du ${formatDate(year.startDate)} au ${formatDate(year.endDate)} · clôturée le ${year.closedAt ? formatDate(year.closedAt) : "—"}`}
        actions={<Link className="ec-btn" href="/ecole/annees">Toutes les années</Link>}
      />
      <div className="ec-banner"><Archive size={18} aria-hidden="true" /> Année archivée : consultation seulement.</div>
      {s && (
        <p style={{ margin: "0 0 16px" }}>
          À la clôture : <b>{s.promoted}</b>{" "}{s.promoted > 1 ? "élèves sont passés" : "élève est passé"} au niveau supérieur,{" "}
          <b>{s.repeating}</b>{" "}{s.repeating > 1 ? "ont redoublé" : "a redoublé"} et <b>{s.leaving}</b>{" "}{s.leaving > 1 ? "ont quitté" : "a quitté"}{" "}l&apos;école.
        </p>
      )}
      <DataTable
        caption={`Classes de l'année ${year.label}`}
        columns={[
          { key: "c", header: "Classe", render: row => <Link href={`/ecole/classes/${row.classroom.id}`}>{className(row.classroom)}</Link> },
          { key: "n", header: "Niveau", render: row => levelInfo(row.classroom.level).label },
          { key: "e", header: "Élèves", align: "right", render: row => plural(row.studentCount, "élève") },
        ]}
        rows={classes}
        rowKey={row => row.classroom.id}
      />
    </>
  );
}
