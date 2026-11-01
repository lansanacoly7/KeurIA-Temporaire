"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { GraduationCap, Plus, Search, Upload } from "lucide-react";
import { listClassrooms, listStudents, type StudentRow } from "@/app/_scolaire/lib/ecoleApi";
import { ageFrom, formatRelative, fullName, plural, STATUS_LABELS, deName } from "@/app/_scolaire/lib/format";
import { className } from "@/app/_scolaire/lib/levels";
import type { AccountStatus, Credentials, Student } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { useDebounced } from "@/app/_scolaire/lib/useDebounced";
import { CredentialsModal } from "@/app/_scolaire/ui/CredentialsModal";
import { Pagination, usePagination } from "@/app/_scolaire/ui/Pagination";
import { Badge, DataTable, EmptyState, ErrorMessage, Notice, PageHeader, Skeleton, StatusBadge, type Column } from "@/app/_scolaire/ui/ui";
import { StudentFormModal } from "./StudentFormModal";

const SEARCH_DELAY_MS = 250;

const COLUMNS: Column<StudentRow>[] = [
  {
    key: "name",
    header: "Élève",
    render: ({ student }) => (
      <div>
        <b>{student.lastName.toUpperCase()} {student.firstName}</b>
        <div className="ec-login">{student.matricule}</div>
      </div>
    ),
  },
  {
    key: "class",
    header: "Classe",
    render: ({ classroom }) => classroom ? <b>{className(classroom)}</b> : <Badge tone="warn">Sans classe</Badge>,
  },
  { key: "age", header: "Âge", render: ({ student }) => `${ageFrom(student.birthDate)} ans` },
  { key: "login", header: "Identifiant", render: ({ student }) => <span className="ec-login">{student.login}</span> },
  { key: "status", header: "Compte", render: ({ student }) => <StatusBadge status={student.status} /> },
  { key: "last", header: "Dernière connexion", render: ({ student }) => formatRelative(student.lastLoginAt) },
];

export function StudentsView({ openNew, defaultClassId, initialClassFilter }: {
  /** ?nouveau=1 : ouvrir directement le formulaire d'inscription. */
  openNew: boolean;
  /** ?classe=… avec ?nouveau=1 : classe présélectionnée dans le formulaire. */
  defaultClassId: string | null;
  /** ?classe=… seul : filtre initial (« none » = élèves sans classe). */
  initialClassFilter: string;
}) {
  const router = useRouter();
  const [classFilter, setClassFilter] = useState(initialClassFilter);
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "">("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(openNew);
  const [created, setCreated] = useState<{ student: Student; credentials: Credentials } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const query = useDebounced(search, SEARCH_DELAY_MS);

  const load = useCallback(
    () => listStudents({ classId: classFilter || undefined, status: statusFilter || undefined, query }),
    [classFilter, statusFilter, query],
  );
  const { data, error, loading, reload } = useApi(load);
  const { data: classrooms } = useApi(listClassrooms);

  const rows = data ?? [];
  const { visible, page, pageCount, setPage } = usePagination(rows, `${classFilter}|${statusFilter}|${query}`);
  const createdClass = created && classrooms?.find(r => r.classroom.id === created.student.classId)?.classroom;


  function closeForm() {
    setCreating(false);
    // Retire ?nouveau=1 de l'adresse pour que le formulaire ne se rouvre pas au rechargement.
    if (openNew) router.replace("/ecole/eleves");
  }

  return (
    <>
      <PageHeader
        title="Élèves"
        subtitle="Comptes des élèves de l'établissement : classe, identifiant et activité."
        actions={
          <>
            <Link className="ec-btn" href="/ecole/fiches?tab=import"><Upload size={18} aria-hidden="true" /> Importer une liste</Link>
            <button type="button" className="ec-btn ec-btn--primary" onClick={() => setCreating(true)}>
              <Plus size={18} aria-hidden="true" /> Inscrire un élève
            </button>
          </>
        }
      />

      {notice && <Notice>{notice}</Notice>}

      <div className="ec-toolbar">
        <label className="ec-search">
          <span className="sr-only">Rechercher un élève</span>
          <Search size={18} aria-hidden="true" />
          <input
            className="ec-input"
            type="search"
            placeholder="Nom, matricule ou identifiant…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Filtrer par classe</span>
          <select className="ec-select" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="">Toutes les classes</option>
            <option value="none">Sans classe</option>
            {(classrooms ?? []).map(({ classroom }) => (
              <option key={classroom.id} value={classroom.id}>{className(classroom)}</option>
            ))}
          </select>
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
        {data && <span className="ec-count" aria-live="polite">{plural(rows.length, "élève")}</span>}
      </div>

      {error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : !data ? (
        <div className="ec-card" style={{ display: "grid", gap: 12 }}>{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} height={40} />)}</div>
      ) : (
        <>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          <div style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.15s" }}>
            <DataTable
              caption="Liste des élèves"
              columns={COLUMNS}
              rows={visible}
              rowKey={row => row.student.id}
              onRowClick={row => router.push(`/ecole/eleves/${row.student.id}`)}
              rowLabel={row => `Ouvrir la fiche ${deName(fullName(row.student))}`}
              empty={
                <EmptyState
                  icon={GraduationCap}
                  title="Aucun élève trouvé"
                  text={search || classFilter || statusFilter ? "Modifiez la recherche ou les filtres." : "Inscrivez un élève ou importez la liste d'une classe."}
                />
              }
            />
          </div>
        </>
      )}

      {creating && (
        <StudentFormModal
          defaultClassId={defaultClassId}
          onClose={closeForm}
          onCreated={(student, credentials) => { closeForm(); setCreated({ student, credentials }); }}
        />
      )}

      {created && (
        <CredentialsModal
          title="Élève inscrit"
          personName={fullName(created.student)}
          subtitle={createdClass ? className(createdClass) : "Sans classe"}
          credentials={created.credentials}
          onClose={() => {
            setNotice(`${fullName(created.student)} a été inscrit·e.`);
            setCreated(null);
            reload();
          }}
        />
      )}
    </>
  );
}
