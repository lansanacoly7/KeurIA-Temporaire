"use client";

import Link from "next/link";
import { Activity, CircleCheck, HeartHandshake, TriangleAlert, UserCheck, UserX, Zap } from "lucide-react";
import { formatRelative, plural } from "@/app/_scolaire/lib/format";
import { className } from "@/app/_scolaire/lib/levels";
import { StatCard } from "@/app/_scolaire/ui/ui";
import { useSchoolSpace } from "./SchoolSpace";

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

/**
 * Vue d'ensemble : ce qu'il faut surveiller dans l'école (la taille de
 * l'école est déjà sur sa carte et dans les onglets).
 */
export function OverviewTab() {
  const { overview, base } = useSchoolSpace();
  const { school, dashboard, linkedStudents } = overview;
  const direction = school.admins.filter(a => a.status !== "desactive");

  const watch: { key: string; text: React.ReactNode; href: string; cta: string }[] = [];
  if (direction.length === 0) watch.push({ key: "direction", text: "Aucune direction active : l'école ne peut pas gérer son espace.", href: `${base}/direction`, cta: "Voir la direction" });
  for (const c of dashboard.classesWithoutTeacher) {
    watch.push({ key: `c${c.id}`, text: <>La classe <b>{className(c)}</b> n&apos;a pas d&apos;enseignant.</>, href: `${base}/classes/${c.id}`, cta: "Voir la classe" });
  }
  if (dashboard.studentsWithoutClass > 0) watch.push({ key: "sans-classe", text: `${plural(dashboard.studentsWithoutClass, "élève n'a", "élèves n'ont")} pas de classe.`, href: `${base}/eleves?classe=none`, cta: "Voir les élèves" });
  if (dashboard.neverLoggedIn > 0) watch.push({ key: "jamais", text: `${plural(dashboard.neverLoggedIn, "élève ne s'est", "élèves ne se sont")} jamais connecté${dashboard.neverLoggedIn > 1 ? "s" : ""}.`, href: `${base}/eleves?statut=jamais_connecte`, cta: "Voir les élèves" });

  return (
    <>
      <section className="ec-grid-stats" aria-label="Santé de l'école">
        <StatCard 
          icon={Zap} 
          label="Actifs cette semaine" 
          value={`${percent(school.activeStudentsWeek, dashboard.students)} %`} 
          hint={`${plural(school.activeStudentsWeek, "élève connecté", "élèves connectés")} en 7 jours`} 
        />
        <StatCard 
          icon={UserX} 
          label="Jamais connectés" 
          value={dashboard.neverLoggedIn} 
          hint={dashboard.neverLoggedIn ? "élèves à accompagner" : "tous les élèves se sont connectés"} 
        />
        <StatCard 
          icon={HeartHandshake} 
          label="Parents reliés" 
          value={`${percent(linkedStudents, dashboard.students)} %`} 
          hint={`${plural(linkedStudents, "élève suivi", "élèves suivis")} par un parent`} 
        />
        <StatCard 
          icon={UserCheck} 
          label="Direction" 
          value={direction.length} 
          hint={school.directionLastSeen ? `vue ${formatRelative(school.directionLastSeen).toLowerCase()}` : "jamais connectée"} 
        />
      </section>

      <div className="sa-columns">
        <section className="sa-panel" aria-labelledby="surveiller-titre">
          <h2 id="surveiller-titre" className="sa-panel-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <TriangleAlert size={18} aria-hidden="true" style={{ color: "#b45309" }} /> À surveiller
            </span>
            {watch.length > 0 && (
              <span className="ec-todo-count" aria-label={plural(watch.length, "point", "points")}>
                {watch.length}
              </span>
            )}
          </h2>
          {watch.length === 0 ? (
            <p className="sa-calm"><CircleCheck size={18} aria-hidden="true" /> Rien à signaler pour cette école.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {watch.map(item => (
                <div key={item.key} className="ec-todo">
                  <span className="ec-todo-icon" aria-hidden="true"><TriangleAlert size={17} /></span>
                  <div className="ec-todo-text">{item.text}</div>
                  <Link className="ec-todo-action" href={item.href}>{item.cta}</Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="sa-panel" aria-labelledby="activite-titre">
          <h2 id="activite-titre" className="sa-panel-title"><Activity size={18} aria-hidden="true" style={{ color: "#0d846e" }} /> Activité récente</h2>
          {dashboard.recentActivity.length === 0 ? <p className="sa-calm">Aucune activité pour le moment.</p> : (
            <ul className="sa-timeline">
              {dashboard.recentActivity.map(a => (
                <li key={a.id}><b>{a.label}</b><span>{formatRelative(a.at)}</span></li>
              ))}
            </ul>
          )}
          <Link className="sa-more" href={`${base}/activite`}>Toute l&apos;activité</Link>
        </section>
      </div>
    </>
  );
}
