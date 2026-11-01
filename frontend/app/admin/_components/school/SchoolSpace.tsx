"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext } from "react";
import { ArrowLeft, Ban, ChevronRight, Eye, MapPin, Settings } from "lucide-react";
import { formatDate } from "@/app/_scolaire/lib/format";
import { getSchoolOverview, type SchoolOverview } from "@/app/_scolaire/lib/superadminApi";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { ErrorMessage, Skeleton } from "@/app/_scolaire/ui/ui";
import "../../admin-space.css";
import "../../admin-school.css";

type SchoolSpaceValue = { id: string; overview: SchoolOverview; reload: () => void; base: string };

const SchoolSpaceContext = createContext<SchoolSpaceValue | null>(null);

/** Données de l'école ouverte (vue d'ensemble) et rechargement, pour les onglets. */
export function useSchoolSpace() {
  const value = useContext(SchoolSpaceContext);
  if (!value) throw new Error("useSchoolSpace doit être utilisé dans <SchoolSpace>.");
  return value;
}

/** Bandeau « consultation seulement » des onglets gérés par l'école. */
export function ReadOnlyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="sa-readonly">
      <Eye size={16} aria-hidden="true" />
      <span><b>Consultation seulement.</b> {children}</span>
    </p>
  );
}

/**
 * Espace d'une école dans le super admin : en-tête + onglets. Chaque onglet a
 * sa propre adresse (/admin/ecoles/<id>/eleves…) ; une recherche dans un
 * onglet ne porte que sur cette école.
 */
export function SchoolSpace({ id, children }: { id: string; children: React.ReactNode }) {
  const load = useCallback(() => getSchoolOverview(id), [id]);
  const { data, error, reload } = useApi(load);
  const pathname = usePathname();
  const base = `/admin/ecoles/${id}`;

  if (error) return <div className="sa-page"><Link href="/admin/ecoles" className="sa-crumb">Écoles</Link><ErrorMessage message={error} onRetry={reload} /></div>;
  if (!data) return <div className="sa-page"><Skeleton height={120} /><div style={{ height: 16 }} /><Skeleton height={320} /></div>;

  const { school, dashboard } = data;
  const tabs = [
    { href: base, label: "Vue d'ensemble" },
    { href: `${base}/direction`, label: "Direction", count: school.admins.length },
    { href: `${base}/enseignants`, label: "Enseignants", count: dashboard.teachers },
    { href: `${base}/classes`, label: "Classes", count: dashboard.classes },
    { href: `${base}/eleves`, label: "Élèves", count: dashboard.students },
    { href: `${base}/parents`, label: "Parents" },
    { href: `${base}/activite`, label: "Activité" },
  ];
  const isActive = (href: string) => (href === base ? pathname === base : pathname === href || pathname.startsWith(`${href}/`));
  // Page Paramètres (roue crantée) : pas de rangée d'onglets, un lien de retour à la place.
  const inSettings = isActive(`${base}/parametres`);

  return (
    <SchoolSpaceContext.Provider value={{ id, overview: data, reload, base }}>
      <div className="sa-page">
        <nav className="sa-crumb" aria-label="Fil d'Ariane">
          <Link href="/admin/ecoles">Écoles</Link>
          <ChevronRight size={14} aria-hidden="true" />
          {inSettings ? <Link href={base}>{school.name}</Link> : <span aria-current="page">{school.name}</span>}
          {inSettings && <><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Paramètres</span></>}
        </nav>
        <header className="sa-space-head">
          <div className="sa-space-title-row">
            <h1 className="sa-title">{school.name}</h1>
            {/* Paramètres de l'école : roue crantée en haut à droite (plus d'onglet). */}
            <Link href={`${base}/parametres`} className="sa-gear" aria-label="Paramètres de l'école" title="Paramètres de l'école"
              aria-current={inSettings ? "page" : undefined}>
              <Settings size={22} aria-hidden="true" />
            </Link>
          </div>
          <p className="sa-space-meta">
            <span><MapPin size={14} aria-hidden="true" /> {school.city}</span>
            <span>Année {school.academicYear}</span>
            <span>Créée le {formatDate(school.createdAt)}</span>
            <span className="sa-status" data-state={school.suspended ? "suspendue" : "active"}>{school.suspended ? "Suspendue" : "Active"}</span>
          </p>
        </header>
        {school.suspended && (
          <div className="ec-alert" style={{ marginBottom: 20 }}>
            <Ban size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>École suspendue depuis le {formatDate(school.suspendedAt!)} : ses comptes ne peuvent plus se connecter. Aucune donnée n&apos;a été effacée.</div>
          </div>
        )}
        {inSettings ? (
          <Link href={base} className="sa-back"><ArrowLeft size={16} aria-hidden="true" /> Retour à l&apos;espace de l&apos;école</Link>
        ) : (
          <nav className="sa-tabs" aria-label={`Espace de ${school.name}`}>
            {tabs.map(tab => (
              <Link key={tab.href} href={tab.href} className="sa-tab" aria-current={isActive(tab.href) ? "page" : undefined}>
                {tab.label}
                {tab.count !== undefined && <span className="sa-tab-count">{tab.count}</span>}
              </Link>
            ))}
          </nav>
        )}
        {children}
      </div>
    </SchoolSpaceContext.Provider>
  );
}
