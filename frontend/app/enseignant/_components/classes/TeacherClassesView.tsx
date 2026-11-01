"use client";

import Link from "next/link";

import { School } from "lucide-react";
import { listTeacherClasses } from "@/app/_scolaire/lib/enseignantApi";
import { plural } from "@/app/_scolaire/lib/format";
import { className, levelInfo } from "@/app/_scolaire/lib/levels";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Badge, EmptyState, ErrorMessage, PageHeader, Skeleton } from "@/app/_scolaire/ui/ui";

export function TeacherClassesView() {
  const load = listTeacherClasses;
  const { data, error, reload } = useApi(load);

  return (
    <>
      <PageHeader title="Mes classes" subtitle="Vos classes, vos élèves et leur progression." />

      {error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : !data ? (
        <div className="ec-grid-cards">{[0, 1].map(i => <div key={i} className="ec-card"><Skeleton height={150} /></div>)}</div>
      ) : data.length === 0 ? (
        <div className="ec-card">
          <EmptyState icon={School} title="Aucune classe ne vous est confiée pour l'instant" text="La direction de l'école vous attribuera vos classes. Elles apparaîtront ici automatiquement." />
        </div>
      ) : (
        <div className="ec-grid-cards">
          {data.map(({ classroom, studentCount, activeThisWeek, openAssignments, lateStudents }) => {
            const level = levelInfo(classroom.level);
            const rate = studentCount ? Math.round((activeThisWeek / studentCount) * 100) : 0;
            return (
              <Link key={classroom.id} href={`/enseignant/classes/${classroom.id}`} className="ec-class-card" data-track={level.track}>
                <div className="ec-class-card-head">
                  <div>
                    <b>{className(classroom)}</b>
                    <span>{level.label}</span>
                  </div>
                  <Badge tone="info">{level.track} ans</Badge>
                </div>
                <div className="ec-progress-row">
                  <header><span>Actifs cette semaine</span><b>{activeThisWeek}/{studentCount}</b></header>
                  <div className="ec-progress" role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} aria-label={`Élèves actifs en ${className(classroom)}`}>
                    <span style={{ width: `${rate}%` }} />
                  </div>
                </div>
                <div className="ec-class-card-foot">
                  <span className="ec-meta"><b>{plural(openAssignments, "devoir en cours", "devoirs en cours")}</b></span>
                  {lateStudents > 0 && <Badge tone="danger">{plural(lateStudents, "élève en retard", "élèves en retard")}</Badge>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
