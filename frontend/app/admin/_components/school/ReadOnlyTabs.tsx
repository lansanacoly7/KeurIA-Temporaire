"use client";

/* Onglets en consultation seulement : enseignants, parents, activité. */

import { useCallback, useState } from "react";
import { Activity, HeartHandshake, Presentation, Search } from "lucide-react";
import { formatRelative, normalizeText, plural } from "@/app/_scolaire/lib/format";
import { className } from "@/app/_scolaire/lib/levels";
import type { ParentRow, TeacherRow } from "@/app/_scolaire/lib/ecoleApi";
import { listSchoolActivity, listSchoolParents, listSchoolTeachers } from "@/app/_scolaire/lib/superadminApi";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Pagination, usePagination } from "@/app/_scolaire/ui/Pagination";
import { DataTable, EmptyState, ErrorMessage, Skeleton, StatusBadge, type Column } from "@/app/_scolaire/ui/ui";
import { ReadOnlyNote, useSchoolSpace } from "./SchoolSpace";

function SearchBox({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="sa-search">
      <span className="sr-only">{label}</span>
      <Search size={18} aria-hidden="true" />
      <input type="search" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

// ─── Enseignants ─────────────────────────────────────────────────────────────

const TEACHER_COLUMNS: Column<TeacherRow>[] = [
  { key: "name", header: "Enseignant", render: r => <div><b>{r.teacher.firstName} {r.teacher.lastName}</b><div className="ec-login">{r.teacher.email}</div></div> },
  { key: "phone", header: "Téléphone", render: r => r.teacher.phone || "—" },
  { key: "classes", header: "Classes", render: r => (r.classrooms.length ? r.classrooms.map(className).join(", ") : <span style={{ color: "var(--ec-muted)" }}>Aucune</span>) },
  { key: "status", header: "Compte", render: r => <StatusBadge status={r.teacher.status} /> },
  { key: "last", header: "Dernière connexion", render: r => formatRelative(r.teacher.lastLoginAt) },
];

export function TeachersTab() {
  const { id } = useSchoolSpace();
  const load = useCallback(() => listSchoolTeachers(id), [id]);
  const { data, error, reload } = useApi(load);
  const [search, setSearch] = useState("");
  const query = normalizeText(search.trim());
  const rows = (data ?? []).filter(r => !query || normalizeText(`${r.teacher.firstName} ${r.teacher.lastName} ${r.teacher.email}`).includes(query));
  const { visible, page, pageCount, setPage } = usePagination(rows, query);

  return (
    <>
      <ReadOnlyNote>Les enseignants sont gérés par la direction de l&apos;école.</ReadOnlyNote>
      <div className="sa-toolbar">
        <SearchBox label="Rechercher un enseignant de cette école" placeholder="Nom ou e-mail de l'enseignant…" value={search} onChange={setSearch} />
        {data && <span className="sa-count">{plural(rows.length, "enseignant")}</span>}
      </div>
      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={260} /> : (
        <>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          <DataTable caption="Enseignants de l'école" columns={TEACHER_COLUMNS} rows={visible} rowKey={r => r.teacher.id}
            empty={<EmptyState icon={Presentation} title={search ? "Aucun enseignant trouvé" : "Aucun enseignant dans cette école"} />} />
        </>
      )}
    </>
  );
}

// ─── Parents ─────────────────────────────────────────────────────────────────

const PARENT_COLUMNS: Column<ParentRow>[] = [
  { key: "name", header: "Parent", render: r => <div><b>{r.parent.firstName} {r.parent.lastName}</b><div className="ec-login">{r.parent.email}</div></div> },
  { key: "phone", header: "Téléphone", render: r => r.parent.phone || "—" },
  { key: "children", header: "Enfant(s) dans l'école", render: r => r.children.map(c => `${c.firstName} ${c.lastName}`).join(", ") },
];

export function ParentsTab() {
  const { id } = useSchoolSpace();
  const load = useCallback(() => listSchoolParents(id), [id]);
  const { data, error, reload } = useApi(load);
  const [search, setSearch] = useState("");
  const query = normalizeText(search.trim());
  const rows = (data ?? []).filter(r => !query || normalizeText(`${r.parent.firstName} ${r.parent.lastName} ${r.parent.email} ${r.children.map(c => `${c.firstName} ${c.lastName}`).join(" ")}`).includes(query));
  const { visible, page, pageCount, setPage } = usePagination(rows, query);

  return (
    <>
      <ReadOnlyNote>Les parents se relient eux-mêmes à leur enfant avec le code remis par l&apos;école.</ReadOnlyNote>
      <div className="sa-toolbar">
        <SearchBox label="Rechercher un parent de cette école" placeholder="Nom du parent ou de l'enfant…" value={search} onChange={setSearch} />
        {data && <span className="sa-count">{plural(rows.length, "parent")}</span>}
      </div>
      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={260} /> : (
        <>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          <DataTable caption="Parents reliés aux élèves de l'école" columns={PARENT_COLUMNS} rows={visible} rowKey={r => r.parent.id}
            empty={<EmptyState icon={HeartHandshake} title={search ? "Aucun parent trouvé" : "Aucun parent relié pour le moment"} />} />
        </>
      )}
    </>
  );
}

// ─── Activité ────────────────────────────────────────────────────────────────

export function ActivityTab() {
  const { id } = useSchoolSpace();
  const [page, setPage] = useState(1);
  const load = useCallback(() => listSchoolActivity(id, page), [id, page]);
  const { data, error, reload } = useApi(load);
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section className="sa-panel" aria-labelledby="journal-titre">
      <h2 id="journal-titre" className="sa-panel-title"><Activity size={18} aria-hidden="true" style={{ color: "#0d846e" }} /> Journal de l&apos;école</h2>
      <p className="sa-section-sub" style={{ marginTop: -6 }}>Ce que fait l&apos;école, et ce que l&apos;équipe kEur IA a fait qui la concerne.</p>
      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={260} /> : data.results.length === 0 ? (
        <p className="sa-calm">Aucune activité pour le moment.</p>
      ) : (
        <>
          <Pagination page={page - 1} pageCount={pageCount} onChange={p => setPage(p + 1)} />
          <ul className="sa-timeline">
            {data.results.map(e => (
              <li key={e.id}>
                <span className="sa-source" data-source={e.source}>{e.source === "ecole" ? "École" : "Équipe kEur IA"}</span>
                <b>{e.label}</b>
                <span>{e.actor ? `${e.actor} · ` : ""}{formatRelative(e.at)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
