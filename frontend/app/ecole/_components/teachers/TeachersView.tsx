"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Presentation, Search, Upload } from "lucide-react";
import { listTeachers, type TeacherRow } from "@/app/_scolaire/lib/ecoleApi";
import { formatRelative, fullName, normalizeText as normalize, plural, STATUS_LABELS, deName } from "@/app/_scolaire/lib/format";
import { className } from "@/app/_scolaire/lib/levels";
import type { AccountStatus, Credentials, Teacher } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { CredentialsModal } from "@/app/_scolaire/ui/CredentialsModal";
import { Pagination, usePagination } from "@/app/_scolaire/ui/Pagination";
import { Badge, DataTable, EmptyState, ErrorMessage, Notice, PageHeader, Skeleton, StatusBadge, type Column } from "@/app/_scolaire/ui/ui";
import { TeacherFormModal } from "./TeacherFormModal";

const COLUMNS: Column<TeacherRow>[] = [
  {
    key: "name",
    header: "Enseignant",
    render: ({ teacher }) => (
      <div>
        <b>{teacher.lastName.toUpperCase()} {teacher.firstName}</b>
        <div className="ec-login">{teacher.email}</div>
      </div>
    ),
  },
  { key: "phone", header: "Téléphone", render: ({ teacher }) => teacher.phone },
  {
    key: "classes",
    header: "Classes",
    render: ({ teacher, classrooms }) => classrooms.length > 0
      ? <div className="ec-badges">{classrooms.map(c => <Badge key={c.id} tone="info">{className(c)}</Badge>)}</div>
      : teacher.status === "desactive" ? "—" : <Badge tone="warn">Aucune classe</Badge>,
  },
  { key: "status", header: "Compte", render: ({ teacher }) => <StatusBadge status={teacher.status} /> },
  { key: "last", header: "Dernière connexion", render: ({ teacher }) => formatRelative(teacher.lastLoginAt) },
];

function matches(row: TeacherRow, query: string): boolean {
  const text = `${fullName(row.teacher)} ${row.teacher.email} ${row.teacher.phone}`;
  return normalize(text).includes(normalize(query.trim()));
}

export function TeachersView({ openNew }: { openNew: boolean }) {
  const router = useRouter();
  const { data, error, reload } = useApi(listTeachers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "">("");
  const [creating, setCreating] = useState(openNew);
  const [created, setCreated] = useState<{ teacher: Teacher; credentials: Credentials } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Une vingtaine d'enseignants au plus : filtrage directement dans le navigateur.
  const rows = (data ?? [])
    .filter(row => !statusFilter || row.teacher.status === statusFilter)
    .filter(row => !search.trim() || matches(row, search));
  const { visible, page, pageCount, setPage } = usePagination(rows, `${statusFilter}|${search}`);

  function closeForm() {
    setCreating(false);
    if (openNew) router.replace("/ecole/enseignants");
  }

  return (
    <>
      <PageHeader
        title="Enseignants"
        subtitle="Comptes des enseignants et classes qui leur sont confiées."
        actions={
          <>
            <Link className="ec-btn" href="/ecole/fiches?tab=import&type=enseignants"><Upload size={18} aria-hidden="true" /> Importer une liste</Link>
            <button type="button" className="ec-btn ec-btn--primary" onClick={() => setCreating(true)}>
              <Plus size={18} aria-hidden="true" /> Ajouter un enseignant
            </button>
          </>
        }
      />

      {notice && <Notice>{notice}</Notice>}

      <div className="ec-toolbar">
        <label className="ec-search">
          <span className="sr-only">Rechercher un enseignant</span>
          <Search size={18} aria-hidden="true" />
          <input className="ec-input" type="search" placeholder="Nom, e-mail ou téléphone…" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        <label>
          <span className="sr-only">Filtrer par statut du compte</span>
          <select className="ec-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as AccountStatus | "")}>
            <option value="">Tous les statuts</option>
            {(Object.keys(STATUS_LABELS) as AccountStatus[]).map(status => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </label>
        {data && <span className="ec-count" aria-live="polite">{plural(rows.length, "enseignant")}</span>}
      </div>

      {error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : !data ? (
        <div className="ec-card" style={{ display: "grid", gap: 12 }}>{[0, 1, 2, 3].map(i => <Skeleton key={i} height={40} />)}</div>
      ) : (
        <>
        <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        <DataTable
          caption="Liste des enseignants"
          columns={COLUMNS}
          rows={visible}
          rowKey={row => row.teacher.id}
          onRowClick={row => router.push(`/ecole/enseignants/${row.teacher.id}`)}
          rowLabel={row => `Ouvrir la fiche ${deName(fullName(row.teacher))}`}
          empty={
            <EmptyState
              icon={Presentation}
              title="Aucun enseignant trouvé"
              text={search || statusFilter ? "Modifiez la recherche ou le filtre." : "Ajoutez les enseignants de l'établissement et confiez-leur leurs classes."}
            />
          }
        />
        </>
      )}

      {creating && (
        <TeacherFormModal
          onClose={closeForm}
          onCreated={(teacher, credentials) => { closeForm(); setCreated({ teacher, credentials }); }}
        />
      )}

      {created && (
        <CredentialsModal
          title="Enseignant ajouté"
          personName={fullName(created.teacher)}
          subtitle="Enseignant·e"
          credentials={created.credentials}
          onClose={() => {
            setNotice(`${fullName(created.teacher)} a été ajouté·e.`);
            setCreated(null);
            reload();
          }}
        />
      )}
    </>
  );
}
