"use client";

import Link from "next/link";
import { useState } from "react";
import { Info, Search, Users } from "lucide-react";
import { getDashboard, listClassrooms, listParents, type ParentRow } from "@/app/_scolaire/lib/ecoleApi";
import { fullName, normalizeText as normalize, plural } from "@/app/_scolaire/lib/format";
import { className } from "@/app/_scolaire/lib/levels";
import type { Classroom } from "@/app/_scolaire/lib/types";
import { LINK_CODE_VALID_DAYS } from "@/app/_scolaire/lib/parentLinks";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Pagination, usePagination } from "@/app/_scolaire/ui/Pagination";
import { DataTable, EmptyState, ErrorMessage, PageHeader, Skeleton, type Column } from "@/app/_scolaire/ui/ui";

export function ParentsView() {
  const { data, error, reload } = useApi(listParents);
  const { data: classrooms } = useApi(listClassrooms);
  const { data: dashboard } = useApi(getDashboard);
  const [search, setSearch] = useState("");

  const classById = new Map<string, Classroom>((classrooms ?? []).map(row => [row.classroom.id, row.classroom]));
  const linkedStudents = new Set((data ?? []).flatMap(row => row.children.map(child => child.id))).size;

  const columns: Column<ParentRow>[] = [
    {
      key: "parent",
      header: "Parent",
      render: ({ parent }) => (
        <div>
          <b>{fullName(parent)}</b>
          <div className="ec-login">{parent.email}</div>
        </div>
      ),
    },
    { key: "phone", header: "Téléphone", render: ({ parent }) => parent.phone },
    {
      key: "children",
      header: "Enfant(s)",
      render: ({ children }) => (
        <div style={{ display: "grid", gap: 4 }}>
          {children.map(child => {
            const classroom = child.classId ? classById.get(child.classId) : undefined;
            return (
              <Link key={child.id} href={`/ecole/eleves/${child.id}`}>
                {fullName(child)}{classroom ? ` · ${className(classroom)}` : ""}
              </Link>
            );
          })}
        </div>
      ),
    },
  ];

  const query = normalize(search.trim());
  const rows = (data ?? []).filter(({ parent, children }) =>
    !query || normalize(`${fullName(parent)} ${parent.email} ${parent.phone} ${children.map(fullName).join(" ")}`).includes(query));
  const { visible, page, pageCount, setPage } = usePagination(rows, query);

  return (
    <>
      <PageHeader title="Parents" subtitle="Parents reliés à un élève avec un code parent." />

      <div className="ec-info">
        <Info size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          Le lien parent est <b>facultatif</b>{" "}: un élève utilise kEur IA avec les identifiants remis par l&apos;école.
          Pour se relier, un parent saisit le <b>code parent</b>{" "}de son enfant, imprimé sur la fiche de connexion ou affiché sur la fiche de l&apos;élève
          (valable {LINK_CODE_VALID_DAYS} jours, une seule utilisation), depuis « Relier mon enfant » dans son espace parent.
          Un lien se retire depuis la fiche de l&apos;élève.
          {data && dashboard && <> Aujourd&apos;hui, <b>{linkedStudents} élève{linkedStudents > 1 ? "s" : ""} sur {dashboard.students}</b> {linkedStudents > 1 ? "ont" : "a"} un parent relié.</>}
        </div>
      </div>

      <div className="ec-toolbar">
        <label className="ec-search">
          <span className="sr-only">Rechercher un parent ou un enfant</span>
          <Search size={18} aria-hidden="true" />
          <input className="ec-input" type="search" placeholder="Parent, enfant, e-mail ou téléphone…" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        {data && <span className="ec-count" aria-live="polite">{plural(rows.length, "parent")}</span>}
      </div>

      {error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : !data ? (
        <div className="ec-card" style={{ display: "grid", gap: 12 }}>{[0, 1, 2].map(i => <Skeleton key={i} height={40} />)}</div>
      ) : (
        <>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          <DataTable
            caption="Parents reliés à un élève"
            columns={columns}
            rows={visible}
            rowKey={row => row.parent.id}
            empty={<EmptyState icon={Users} title={search ? "Aucun parent trouvé" : "Aucun parent relié pour le moment"} text={search ? "Modifiez la recherche." : undefined} />}
          />
        </>
      )}
    </>
  );
}
