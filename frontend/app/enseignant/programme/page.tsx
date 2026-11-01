"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { getProgramme, type ProgrammeLesson, type ProgrammeModule } from "@/app/_scolaire/lib/programmeApi";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { plural } from "@/app/_scolaire/lib/format";
import { Badge, EmptyState, ErrorMessage, PageHeader, Skeleton } from "@/app/_scolaire/ui/ui";
import { useState } from "react";

export default function ProgrammePage() {
  const { data, error } = useApi(getProgramme);
  const [selectedClass, setSelectedClass] = useState<string>("all");

  if (error) return <ErrorMessage message={error} />;
  if (!data) return <Skeleton height={400} />;

  const allClasses = data.tracks.flatMap(t => t.classes);
  const tracksToShow = selectedClass === "all" ? data.tracks : data.tracks.filter(t => t.classes.includes(selectedClass));

  if (data.tracks.length === 0) {
    return (
      <>
        <PageHeader title="Programme" subtitle="Ce que vos élèves apprennent, leçon par leçon." />
        <div className="ec-card">
          <EmptyState icon={BookOpen} title="Aucune classe ne vous est confiée" text="Le programme de vos élèves apparaîtra ici." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Programme" subtitle="Ce que vos élèves apprennent, leçon par leçon." />
      
      {allClasses.length > 1 && (
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <label htmlFor="class-filter" style={{ fontWeight: 500 }}>Afficher le programme pour :</label>
          <select 
            id="class-filter" 
            className="ec-select" 
            style={{ maxWidth: 300 }}
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)}
          >
            <option value="all">Toutes mes classes</option>
            {allClasses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {tracksToShow.map((track) => {
        const displayedClasses = selectedClass === "all" ? track.classes.join(", ") : selectedClass;
        return (
          <div key={track.key} className="ec-prog-track" style={{ marginBottom: 32 }}>
            <div className="ec-prog-track-header" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--ec-ink)" }}>
                {track.label} · {displayedClasses}
              </h2>
            </div>
            {track.modules.map((mod, index) => (
              <ModuleCard key={mod.id} module={mod} defaultOpen={index === 0} />
            ))}
          </div>
        );
      })}
    </>
  );
}

function ModuleCard({ module, defaultOpen = false }: { module: ProgrammeModule; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ec-prog-module ec-card" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
      <div
        className="ec-prog-module-header"
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setOpen(!open)}
        style={{ padding: "16px 20px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "var(--ec-brand-soft)",
              color: "var(--ec-brand)",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            M{module.order}
          </div>
          <div>
            <h3 className="ec-prog-module-title" style={{ fontSize: 16, fontWeight: 700, color: "var(--ec-ink)" }}>
              Module {module.order} : {module.title}
            </h3>
            <p style={{ margin: "3px 0 0", color: "var(--ec-muted)", fontSize: 13 }}>
              {plural(module.lessons.length, "leçon")} · {module.description}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ec-muted)" }}>
            {open ? "Masquer les leçons" : "Voir les leçons"}
          </span>
          {open ? <ChevronDown size={20} aria-hidden="true" /> : <ChevronRight size={20} aria-hidden="true" />}
        </div>
      </div>
      {open && (
        <div style={{ padding: 20, background: "var(--ec-bg)" }}>
          <div className="ec-mission-grid">
            {module.lessons.map((lesson: ProgrammeLesson) => (
              <article
                key={lesson.id}
                className="ec-card ec-mission-card"
                style={{
                  background: "var(--ec-surface)",
                  borderTop: "4px solid var(--ec-brand)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="ec-mission-top">
                  <Badge tone="ok">Leçon {lesson.order}</Badge>
                  <div className="ec-mission-meta">
                    <span><Clock size={14} aria-hidden="true" /> {lesson.minutes} min</span>
                  </div>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ec-ink)", lineHeight: 1.4, margin: "10px 0 8px" }}>
                  {lesson.title}
                </h3>
                <p style={{ fontSize: 13.5, color: "var(--ec-muted)", lineHeight: 1.5, margin: "0 0 16px", flexGrow: 1 }}>
                  {lesson.skill ? `Compétence : ${lesson.skill}` : "Découvrez les notions et activités de cette leçon."}
                </p>
                <div className="ec-mission-bottom" style={{ marginTop: "auto", paddingTop: 12 }}>
                  <Badge tone={lesson.type === "atelier" ? "info" : lesson.type === "projet" ? "warn" : "neutral"}>
                    {lesson.type ? lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1) : "Cours"}
                  </Badge>
                  <Link
                    href={`/enseignant/programme/${lesson.id}`}
                    className="ec-btn ec-btn--primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <span>Consulter la fiche</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
