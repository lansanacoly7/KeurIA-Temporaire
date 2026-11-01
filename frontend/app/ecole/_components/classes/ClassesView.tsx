"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { GraduationCap, Plus, School, UserRoundX } from "lucide-react";
import { listClassrooms, type ClassroomRow } from "@/app/_scolaire/lib/ecoleApi";
import { fullName, plural } from "@/app/_scolaire/lib/format";
import { className, levelInfo } from "@/app/_scolaire/lib/levels";
import type { Cycle } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Badge, EmptyState, ErrorMessage, PageHeader, Skeleton } from "@/app/_scolaire/ui/ui";
import { ClassroomFormModal } from "./ClassroomFormModal";

type CycleFilter = "Tous" | Cycle;
const CYCLE_FILTERS: CycleFilter[] = ["Tous", "Élémentaire", "Moyen"];

function ClassCard({ row }: { row: ClassroomRow }) {
  const { classroom, teacher, studentCount } = row;
  const level = levelInfo(classroom.level);
  return (
    <Link href={`/ecole/classes/${classroom.id}`} className="ec-class-card" data-track={level.track}>
      <div className="ec-class-card-head">
        <div>
          <b>{className(classroom)}</b>
          <span>{level.label}</span>
        </div>
        <Badge tone="info">{level.track} ans</Badge>
      </div>
      <div className="ec-meta">
        {teacher ? (
          <>Enseignant·e : <b>{fullName(teacher)}</b></>
        ) : (
          <Badge tone="warn"><UserRoundX size={14} aria-hidden="true" /> Sans enseignant</Badge>
        )}
      </div>
      <div className="ec-class-card-foot">
        <span className="ec-meta"><GraduationCap size={16} aria-hidden="true" /> <b>{plural(studentCount, "élève")}</b></span>
        <span className="ec-meta">{classroom.academicYear}</span>
      </div>
    </Link>
  );
}

export function ClassesView() {
  const router = useRouter();
  const [cycle, setCycle] = useState<CycleFilter>("Tous");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => listClassrooms(), []);
  const { data, error, loading, reload } = useApi(load);

  const rows = (data ?? []).filter(row => cycle === "Tous" || levelInfo(row.classroom.level).cycle === cycle);
  const cyclesToShow = cycle === "Tous" ? (["Élémentaire", "Moyen"] as const) : [cycle];

  return (
    <>
      <PageHeader
        title="Classes"
        subtitle="Créez les classes de l'école et confiez chacune à un enseignant."
        actions={
          <button type="button" className="ec-btn ec-btn--primary" onClick={() => setCreating(true)}>
            <Plus size={18} aria-hidden="true" /> Nouvelle classe
          </button>
        }
      />

      <div className="ec-toolbar">
        <div className="ec-segmented" role="group" aria-label="Filtrer par cycle">
          {CYCLE_FILTERS.map(value => (
            <button key={value} type="button" aria-pressed={cycle === value} onClick={() => setCycle(value)}>{value}</button>
          ))}
        </div>
      </div>

      {/* Légende : la couleur d'une carte indique le parcours kEur IA de la classe. */}
      <p className="ec-track-legend">
        Couleur du parcours :
        <span data-track="7-9">7-9 ans</span>
        <span data-track="10-12">10-12 ans</span>
        <span data-track="13-15">13-15 ans</span>
      </p>

      {error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : loading || !data ? (
        <div className="ec-grid-cards">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="ec-card"><Skeleton height={130} /></div>)}</div>
      ) : rows.length === 0 ? (
        <div className="ec-card">
          <EmptyState
            icon={School}
            title="Aucune classe"
            text="Commencez par créer les classes de l'année, par exemple CI A ou 6e B."
            action={<button type="button" className="ec-btn ec-btn--primary" onClick={() => setCreating(true)}><Plus size={18} aria-hidden="true" /> Nouvelle classe</button>}
          />
        </div>
      ) : (
        cyclesToShow.map(cycleName => {
          const inCycle = rows.filter(row => levelInfo(row.classroom.level).cycle === cycleName);
          if (inCycle.length === 0) return null;
          return (
            <section key={cycleName} aria-label={cycleName}>
              <h2 className="ec-section-title">{cycleName} · {plural(inCycle.length, "classe")}</h2>
              <div className="ec-grid-cards">
                {inCycle.map(row => <ClassCard key={row.classroom.id} row={row} />)}
              </div>
            </section>
          );
        })
      )}

      {creating && (
        <ClassroomFormModal
          onClose={() => setCreating(false)}
          onSaved={saved => router.push(`/ecole/classes/${saved.id}?creee=1`)}
        />
      )}
    </>
  );
}
