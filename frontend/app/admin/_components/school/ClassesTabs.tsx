"use client";

/* Classes et élèves d'une école, en consultation seulement. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowLeft, ChevronRight, GraduationCap, HeartHandshake, LayoutGrid, Search, TriangleAlert } from "lucide-react";
import { formatDate, formatRelative, plural } from "@/app/_scolaire/lib/format";
import { className } from "@/app/_scolaire/lib/levels";
import type { StudentRow } from "@/app/_scolaire/lib/ecoleApi";
import { getSchoolClass, getSchoolStudent, listSchoolClasses, listSchoolStudents } from "@/app/_scolaire/lib/superadminApi";
import type { AccountStatus, Student } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { useDebounced } from "@/app/_scolaire/lib/useDebounced";
import { Pagination, usePagination } from "@/app/_scolaire/ui/Pagination";
import { DataTable, EmptyState, ErrorMessage, Skeleton, StatusBadge, type Column } from "@/app/_scolaire/ui/ui";
import { ReadOnlyNote, useSchoolSpace } from "./SchoolSpace";

const TONES = ["mint", "sky", "lavender", "amber"] as const;

// ─── Classes ─────────────────────────────────────────────────────────────────

export function ClassesTab() {
  const { id, base } = useSchoolSpace();
  const router = useRouter();
  const load = useCallback(() => listSchoolClasses(id), [id]);
  const { data, error, reload } = useApi(load);
  const [archived, setArchived] = useState(false);
  const rows = (data ?? []).filter(r => r.classroom.archived === archived);
  const archivedCount = (data ?? []).filter(r => r.classroom.archived).length;

  return (
    <>
      <ReadOnlyNote>Les classes sont créées et gérées par la direction de l&apos;école.</ReadOnlyNote>
      <div className="sa-toolbar">
        <div className="sa-chips" role="group" aria-label="Classes affichées">
          <button type="button" className="sa-chip" aria-pressed={!archived} onClick={() => setArchived(false)}>Cette année<span className="sa-chip-count">{(data ?? []).length - archivedCount}</span></button>
          <button type="button" className="sa-chip" aria-pressed={archived} onClick={() => setArchived(true)}>Archivées<span className="sa-chip-count">{archivedCount}</span></button>
        </div>
      </div>
      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={260} /> : rows.length === 0 ? (
        <div className="sa-empty"><LayoutGrid size={30} aria-hidden="true" /><b>{archived ? "Aucune classe archivée" : "Aucune classe cette année"}</b></div>
      ) : (
        <ul className="sa-grid sa-grid--classes" aria-label="Classes de l'école">
          {rows.map((r, i) => (
            <li key={r.classroom.id} style={{ "--i": i } as React.CSSProperties}>
              <button type="button" className="sa-school sa-class" data-tone={TONES[i % TONES.length]} data-suspended={r.classroom.archived}
                onClick={() => router.push(`${base}/classes/${r.classroom.id}`)} aria-label={`Ouvrir la classe ${className(r.classroom)}`}>
                <span className="sa-school-head">
                  <span className="sa-avatar" aria-hidden="true">{r.classroom.level}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="sa-school-name">{className(r.classroom)}</span>
                    <span className="sa-school-city">
                      {r.teacher ? `${r.teacher.firstName} ${r.teacher.lastName}` : <span className="sa-flag sa-flag--warn"><TriangleAlert size={12} aria-hidden="true" /> Sans enseignant</span>}
                    </span>
                  </span>
                </span>
                <span className="sa-school-foot">
                  <span><b style={{ color: "var(--tone)", fontSize: 18 }}>{r.studentCount}</b> {r.studentCount > 1 ? "élèves" : "élève"}</span>
                  <span className="sa-open">Voir la classe <ChevronRight size={15} aria-hidden="true" /></span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const STUDENT_COLUMNS: Column<Student>[] = [
  { key: "name", header: "Élève", render: s => <div><b>{s.firstName} {s.lastName}</b><div className="ec-login">{s.matricule}</div></div> },
  { key: "status", header: "Compte", render: s => <StatusBadge status={s.status} /> },
  { key: "last", header: "Dernière connexion", render: s => formatRelative(s.lastLoginAt) },
  { key: "xp", header: "XP", align: "right", render: s => s.xp },
];

export function ClassDetail({ classId }: { classId: string }) {
  const { id, base } = useSchoolSpace();
  const router = useRouter();
  const load = useCallback(() => getSchoolClass(id, classId), [id, classId]);
  const { data, error, reload } = useApi(load);

  return (
    <>
      <Link href={`${base}/classes`} className="sa-back"><ArrowLeft size={16} aria-hidden="true" /> Toutes les classes</Link>
      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={300} /> : (
        <>
          <div className="sa-section-head">
            <div>
              <h2 className="sa-section-title sa-serif">{className(data.classroom)}{data.classroom.archived && " (archivée)"}</h2>
              <p className="sa-section-sub">
                {data.teacher ? `Enseignant : ${data.teacher.firstName} ${data.teacher.lastName}` : "Sans enseignant"} · année {data.classroom.academicYear} · {plural(data.students.length, "élève")}
              </p>
            </div>
          </div>
          <DataTable caption={`Élèves de ${className(data.classroom)}`} columns={STUDENT_COLUMNS} rows={data.students} rowKey={s => s.id}
            onRowClick={s => router.push(`${base}/eleves/${s.id}`)} rowLabel={s => `Voir la fiche de ${s.firstName} ${s.lastName}`}
            empty={<EmptyState icon={GraduationCap} title="Aucun élève dans cette classe" />} />
        </>
      )}
    </>
  );
}

// ─── Élèves ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: "" | AccountStatus; label: string }[] = [
  { value: "", label: "Tous les comptes" },
  { value: "actif", label: "Actifs" },
  { value: "jamais_connecte", label: "Jamais connectés" },
  { value: "desactive", label: "Désactivés" },
];

export function StudentsTab({ initialClass = "", initialStatus = "" }: { initialClass?: string; initialStatus?: string }) {
  const { id, base } = useSchoolSpace();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState(initialClass);
  const [status, setStatus] = useState<"" | AccountStatus>(STATUS_FILTERS.some(f => f.value === initialStatus) ? (initialStatus as AccountStatus) : "");
  const query = useDebounced(search);
  const loadClasses = useCallback(() => listSchoolClasses(id), [id]);
  const classes = useApi(loadClasses);
  const load = useCallback(() => listSchoolStudents(id, { classId: classId || undefined, status: status || undefined, query }), [id, classId, status, query]);
  const { data, error, reload } = useApi(load);
  const { visible, page, pageCount, setPage } = usePagination(data ?? [], `${query}|${classId}|${status}`);

  const columns: Column<StudentRow>[] = [
    { key: "name", header: "Élève", render: r => <div><b>{r.student.firstName} {r.student.lastName}</b><div className="ec-login">{r.student.matricule}</div></div> },
    { key: "class", header: "Classe", render: r => (r.classroom ? className(r.classroom) : <span style={{ color: "var(--ec-muted)" }}>Sans classe</span>) },
    { key: "status", header: "Compte", render: r => <StatusBadge status={r.student.status} /> },
    { key: "last", header: "Dernière connexion", render: r => formatRelative(r.student.lastLoginAt) },
    { key: "parent", header: "Parent", render: r => (r.student.parentId ? <span className="sa-flag sa-flag--ok"><HeartHandshake size={12} aria-hidden="true" /> Relié</span> : "—") },
  ];

  return (
    <>
      <ReadOnlyNote>Les élèves sont inscrits et gérés par la direction de l&apos;école.</ReadOnlyNote>
      <div className="sa-toolbar">
        <label className="sa-search">
          <span className="sr-only">Rechercher un élève de cette école</span>
          <Search size={18} aria-hidden="true" />
          <input type="search" placeholder="Nom, matricule ou identifiant…" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        <select className="sa-select" aria-label="Classe" value={classId} onChange={e => setClassId(e.target.value)}>
          <option value="">Toutes les classes</option>
          <option value="none">Sans classe</option>
          {(classes.data ?? []).filter(r => !r.classroom.archived).map(r => <option key={r.classroom.id} value={r.classroom.id}>{className(r.classroom)}</option>)}
        </select>
        <select className="sa-select" aria-label="Compte" value={status} onChange={e => setStatus(e.target.value as "" | AccountStatus)}>
          {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        {data && <span className="sa-count">{plural(data.length, "élève")}</span>}
      </div>
      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={300} /> : (
        <>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          <DataTable caption="Élèves de l'école" columns={columns} rows={visible} rowKey={r => r.student.id}
            onRowClick={r => router.push(`${base}/eleves/${r.student.id}`)} rowLabel={r => `Voir la fiche de ${r.student.firstName} ${r.student.lastName}`}
            empty={<EmptyState icon={GraduationCap} title="Aucun élève trouvé" text="Modifiez la recherche ou les filtres." />} />
        </>
      )}
    </>
  );
}

export function StudentDetail({ studentId }: { studentId: string }) {
  const { id, base } = useSchoolSpace();
  const load = useCallback(() => getSchoolStudent(id, studentId), [id, studentId]);
  const { data, error, reload } = useApi(load);

  return (
    <>
      <Link href={`${base}/eleves`} className="sa-back"><ArrowLeft size={16} aria-hidden="true" /> Tous les élèves</Link>
      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={300} /> : (
        <>
          <div className="sa-section-head">
            <div>
              <h2 className="sa-section-title sa-serif">{data.student.firstName} {data.student.lastName}</h2>
              <p className="sa-section-sub">Élève · {data.classroom ? className(data.classroom) : "sans classe"} · matricule {data.student.matricule}</p>
            </div>
            <StatusBadge status={data.student.status} />
          </div>
          <div className="sa-columns">
            <section className="sa-panel" aria-labelledby="eleve-infos">
              <h3 id="eleve-infos" className="sa-panel-title">Informations</h3>
              <dl className="sa-facts">
                <div><dt>Identifiant</dt><dd><span className="ec-login">{data.student.login}</span></dd></div>
                <div><dt>Date de naissance</dt><dd>{formatDate(data.student.birthDate)}</dd></div>
                <div><dt>Classe</dt><dd>{data.classroom ? className(data.classroom) : "Sans classe"}</dd></div>
                <div><dt>Dernière connexion</dt><dd>{formatRelative(data.student.lastLoginAt)}</dd></div>
                <div><dt>Progression</dt><dd>{data.student.xp} XP · {plural(data.student.lessonsCompleted, "leçon terminée", "leçons terminées")}</dd></div>
              </dl>
            </section>
            <section className="sa-panel" aria-labelledby="eleve-parent">
              <h3 id="eleve-parent" className="sa-panel-title"><HeartHandshake size={18} aria-hidden="true" style={{ color: "#534ab7" }} /> Parent</h3>
              {data.parent ? (
                <dl className="sa-facts">
                  <div><dt>Nom</dt><dd>{data.parent.firstName} {data.parent.lastName}</dd></div>
                  <div><dt>E-mail</dt><dd>{data.parent.email}</dd></div>
                  <div><dt>Téléphone</dt><dd>{data.parent.phone || "—"}</dd></div>
                </dl>
              ) : <p className="sa-calm">Aucun parent relié pour le moment.</p>}
              <Link className="sa-more" href={`${base}/parents`}>Tous les parents de l&apos;école</Link>
            </section>
          </div>
        </>
      )}
    </>
  );
}
