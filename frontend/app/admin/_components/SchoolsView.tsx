"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Lightbulb, MapPin, Plus, School, Search, TriangleAlert } from "lucide-react";
import { formatDate, formatRelative, normalizeText, plural } from "@/app/_scolaire/lib/format";
import { slugifyName } from "@/app/_scolaire/lib/identifiers";
import { createPlatformSchool, listPlatformSchools, type PlatformSchool } from "@/app/_scolaire/lib/superadminApi";
import { THEMES } from "@/app/_scolaire/lib/themes";
import type { Credentials } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { CredentialsModal } from "@/app/_scolaire/ui/CredentialsModal";
import { Pagination, usePagination } from "@/app/_scolaire/ui/Pagination";
import { ErrorMessage, Field, Modal, Notice, Skeleton } from "@/app/_scolaire/ui/ui";
import "../admin-space.css";

type Filter = "toutes" | "actives" | "surveiller" | "suspendues";

const TONES = ["mint", "sky", "lavender", "amber"] as const;

/** Élèves actifs sur 7 jours, en %. */
function activeRate(s: PlatformSchool) {
  return s.students ? Math.round((s.activeStudentsWeek / s.students) * 100) : 0;
}

/** École à surveiller : classe sans enseignant, aucune direction active, ou moins d'un élève sur trois actif. */
function needsAttention(s: PlatformSchool) {
  return !s.suspended && (s.classesWithoutTeacher > 0 || !s.admins.some(a => a.status !== "desactive") || (s.students > 0 && activeRate(s) < 34));
}

/** Initiales du nom, sans « École », « Groupe scolaire »… (« Les Baobabs » → « LB »). */
function initials(name: string) {
  const words = name.replace(/^(école|ecole|groupe scolaire|lycée|collège)\s+/i, "").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase();
}

function SchoolCard({ school, index, onOpen }: { school: PlatformSchool; index: number; onOpen: () => void }) {
  const rate = activeRate(school);
  const direction = school.admins.filter(a => a.status !== "desactive");
  return (
    <li style={{ "--i": index } as React.CSSProperties}>
      <button type="button" className="sa-school" data-tone={TONES[index % TONES.length]} data-suspended={school.suspended}
        onClick={onOpen} aria-label={`Ouvrir l'espace de ${school.name}`}>
        <span className="sa-school-head">
          <span className="sa-avatar" aria-hidden="true">{initials(school.name)}</span>
          <span style={{ minWidth: 0 }}>
            <span className="sa-school-name">{school.name}</span>
            <span className="sa-school-city"><MapPin size={13} aria-hidden="true" /> {school.city} · {school.academicYear}</span>
          </span>
          <span className="sa-status" data-state={school.suspended ? "suspendue" : "active"}>{school.suspended ? "Suspendue" : "Active"}</span>
        </span>

        <span className="sa-tiles">
          <span className="sa-tile" style={{ "--tile": "#0d846e" } as React.CSSProperties}><b>{school.students}</b><small>Élèves</small></span>
          <span className="sa-tile" style={{ "--tile": "#185fa5" } as React.CSSProperties}><b>{school.teachers}</b><small>Enseignants</small></span>
          <span className="sa-tile" style={{ "--tile": "#b45309" } as React.CSSProperties}><b>{school.classes}</b><small>Classes</small></span>
        </span>

        <span>
          <span className="sa-health-label"><span>Élèves actifs cette semaine</span><b>{rate} %</b></span>
          <span className="sa-gauge" role="img" aria-label={`${rate} % des élèves actifs cette semaine`}><span style={{ width: `${rate}%` }} /></span>
        </span>

        <span className="sa-school-foot">
          {school.classesWithoutTeacher > 0 && (
            <span className="sa-flag sa-flag--warn"><TriangleAlert size={13} aria-hidden="true" /> {plural(school.classesWithoutTeacher, "classe sans enseignant", "classes sans enseignant")}</span>
          )}
          {direction.length === 0 ? (
            <span className="sa-flag sa-flag--warn"><TriangleAlert size={13} aria-hidden="true" /> Aucune direction active</span>
          ) : (
            <span>Direction vue {school.directionLastSeen ? formatRelative(school.directionLastSeen).toLowerCase() : "jamais"}</span>
          )}
          <span className="sa-open">Ouvrir <ChevronRight size={15} aria-hidden="true" /></span>
        </span>
      </button>
    </li>
  );
}

const EMPTY_DIRECTION = { firstName: "", lastName: "", email: "", title: "Directeur·rice" };

function NewSchoolModal({ onClose, onCreated }: { onClose: () => void; onCreated: (school: PlatformSchool, credentials: Credentials) => void }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [direction, setDirection] = useState(EMPTY_DIRECTION);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateDirection = (key: keyof typeof direction, value: string) => setDirection(d => ({ ...d, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await createPlatformSchool({ 
        name, 
        city, 
        primaryColor: THEMES[0].primary, 
        accentColor: THEMES[0].accent, 
        admin: direction 
      });
      onCreated(created.school, created.credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Nouvelle école"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ec-btn" onClick={onClose}>Annuler</button>
          <button type="submit" form="school-form" className="ec-btn ec-btn--primary" disabled={saving}>{saving ? "Création…" : "Créer l'école"}</button>
        </>
      }
    >
      <form id="school-form" onSubmit={submit} noValidate style={{ display: "grid", gap: 18 }}>
        <fieldset className="ec-fieldset">
          <legend>Établissement</legend>
          <div className="ec-form-grid">
            <Field label="Nom de l'école"><input className="ec-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex : École Primaire Les Baobabs" required /></Field>
            <Field label="Ville"><input className="ec-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Ex : Dakar" required /></Field>
          </div>
          <p style={{ margin: "10px 0 0", color: "var(--ec-muted)", fontSize: 13 }}>
            Adresse de l&apos;école : <span className="ec-login">/school/{slugifyName(name) || "…"}</span>. Elle sert aux identifiants des élèves et ne pourra plus changer.
          </p>
        </fieldset>

        <fieldset className="ec-fieldset">
          <legend>Direction de l&apos;école</legend>
          <div className="ec-form-grid">
            <Field label="Prénom"><input className="ec-input" value={direction.firstName} onChange={e => updateDirection("firstName", e.target.value)} placeholder="Ex : Aminata" required /></Field>
            <Field label="Nom"><input className="ec-input" value={direction.lastName} onChange={e => updateDirection("lastName", e.target.value)} placeholder="Ex : Ndiaye" required /></Field>
            <Field label="E-mail professionnel (identifiant de connexion)"><input className="ec-input" type="email" value={direction.email} onChange={e => updateDirection("email", e.target.value)} placeholder="direction@ecole.sn" required /></Field>
            <Field label="Fonction"><input className="ec-input" value={direction.title} onChange={e => updateDirection("title", e.target.value)} placeholder="Directeur·rice" /></Field>
          </div>
        </fieldset>

        <div style={{ padding: "10px 14px", background: "var(--ec-bg)", borderRadius: 12, border: "1px solid var(--ec-border)", fontSize: 12, color: "var(--ec-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <Lightbulb size={16} aria-hidden="true" style={{ flexShrink: 0 }} /> <span><b>Thème par défaut :</b> Les couleurs officielles kEur IA sont appliquées automatiquement. L&apos;école pourra personnaliser ses couleurs et son logo à tout moment depuis ses paramètres.</span>
        </div>

        {error && <ErrorMessage message={error} />}
      </form>
    </Modal>
  );
}

export function SchoolsView({ openNew }: { openNew: boolean }) {
  const router = useRouter();
  const { data, error, reload } = useApi(listPlatformSchools);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(openNew);
  const [notice, setNotice] = useState<string | null>(null);
  const [created, setCreated] = useState<{ school: PlatformSchool; credentials: Credentials } | null>(null);

  const [filter, setFilter] = useState<Filter>("toutes");

  const all = data ?? [];
  const counts: Record<Filter, number> = {
    toutes: all.length,
    actives: all.filter(s => !s.suspended).length,
    surveiller: all.filter(needsAttention).length,
    suspendues: all.filter(s => s.suspended).length,
  };
  const query = normalizeText(search.trim());
  const rows = all
    .filter(s => filter === "toutes" || (filter === "actives" && !s.suspended) || (filter === "suspendues" && s.suspended) || (filter === "surveiller" && needsAttention(s)))
    .filter(s => !query || normalizeText(`${s.name} ${s.city} ${s.slug}`).includes(query));
  const { visible, page, pageCount, setPage } = usePagination(rows, `${query}|${filter}`);

  function closeForm() {
    setCreating(false);
    if (openNew) router.replace("/admin/ecoles");
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "toutes", label: "Toutes" },
    { key: "actives", label: "Actives" },
    { key: "surveiller", label: "À surveiller" },
    { key: "suspendues", label: "Suspendues" },
  ];

  return (
    <div className="sa-page">
      <header className="sa-hero">
        <div>
          <p className="sa-kicker">Plateforme kEur IA</p>
          <h1 className="sa-title">Écoles</h1>
          <p className="sa-subtitle">Chaque école a son espace : cliquez sur une carte pour voir tout ce qui la concerne.</p>
        </div>
        <div className="sa-actions">
          <button type="button" className="sa-pill sa-pill--primary" onClick={() => setCreating(true)}><Plus size={18} aria-hidden="true" /> Nouvelle école</button>
        </div>
      </header>
      {notice && <Notice>{notice}</Notice>}
      <div className="sa-toolbar">
        <label className="sa-search">
          <span className="sr-only">Rechercher une école</span>
          <Search size={18} aria-hidden="true" />
          <input type="search" placeholder="Nom, ville ou adresse de l'école…" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        <div className="sa-chips" role="group" aria-label="Filtrer les écoles">
          {filters.map(f => (
            <button key={f.key} type="button" className="sa-chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}<span className="sa-chip-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>
      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={320} /> : rows.length === 0 ? (
        <div className="sa-empty">
          <School size={34} aria-hidden="true" />
          <b>{all.length === 0 ? "Aucune école pour le moment" : "Aucune école ne correspond"}</b>
          <span>{all.length === 0 ? "Créez la première école avec sa direction." : "Modifiez la recherche ou le filtre."}</span>
        </div>
      ) : (
        <>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          <ul className="sa-grid" aria-label="Écoles">
            {visible.map(school => (
              <SchoolCard key={school.id} school={school} index={all.indexOf(school)} onOpen={() => router.push(`/admin/ecoles/${school.id}`)} />
            ))}
          </ul>
        </>
      )}
      {creating && <NewSchoolModal onClose={closeForm} onCreated={(school, credentials) => { closeForm(); setCreated({ school, credentials }); setNotice(`L'école « ${school.name} » a été créée, avec sa direction.`); reload(); }} />}
      {created && (
        <CredentialsModal
          title="École créée"
          personName={`${created.school.admins[0]?.firstName ?? ""} ${created.school.admins[0]?.lastName ?? ""}`.trim()}
          subtitle={`Direction · ${created.school.name} · créée le ${formatDate(created.school.createdAt)}`}
          credentials={created.credentials}
          onClose={() => setCreated(null)}
        />
      )}
    </div>
  );
}
