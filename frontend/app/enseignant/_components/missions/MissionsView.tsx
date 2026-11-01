"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, ClipboardList, Clock, Lightbulb, Search, Star } from "lucide-react";
import {
  isPastDue, listMissions, listTeacherAssignments, listTeacherClasses, type AssignmentSummary, type TeacherClassRow,
} from "@/app/_scolaire/lib/enseignantApi";
import { normalizeText, plural } from "@/app/_scolaire/lib/format";
import { className, levelInfo, trackLabel } from "@/app/_scolaire/lib/levels";
import type { Mission } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Badge, EmptyState, ErrorMessage, Notice, PageHeader, Skeleton } from "@/app/_scolaire/ui/ui";
import { AssignmentProgress } from "../AssignmentProgress";
import { AssignModal } from "./AssignModal";

export type MissionsTab = "bibliotheque" | "suivi";

type StateFilter = "en_cours" | "date_passee" | "tous";

const OTHERS = "Autres devoirs";

/**
 * Bibliothèque de devoirs : cartes (module, durée, points, titre, description, niveau, bouton « Assigner »).
 * L'enseignant choisit sa classe : il ne voit que les devoirs du programme de son âge (module par module, via les pastilles).
 */
function Library({ missions, classes, onAssign }: { missions: Mission[]; classes: TeacherClassRow[]; onAssign: (mission: Mission, classId: string | null) => void }) {
  const [classId, setClassId] = useState(classes[0]?.classroom.id ?? "");
  const [search, setSearch] = useState("");
  const selected = classes.find(row => row.classroom.id === classId)?.classroom ?? null;
  const track = selected ? levelInfo(selected.level).track : null;
  const query = normalizeText(search.trim());

  // Les devoirs du programme de l'âge de la classe, dans l'ordre du cours, puis les missions libres (tous âges).
  const forAge = missions.filter(m => !m.moduleId || m.track === track);

  // Recherche textuelle
  const visible = forAge.filter(m => !query || normalizeText(`${m.title} ${m.description} ${m.moduleTitle ?? ""}`).includes(query));

  // Regroupement par module
  const grouped: Record<string, Mission[]> = {};
  const orderedGroups: string[] = [];
  visible.forEach(m => {
    const key = m.moduleTitle || OTHERS;
    if (!grouped[key]) {
      grouped[key] = [];
      orderedGroups.push(key);
    }
    grouped[key].push(m);
  });

  return (
    <>
      <PageHeader
        title="Bibliothèque de devoirs"
        subtitle="Des devoirs prêts à l'emploi, liés aux leçons que vos élèves suivent. Ils sont corrigés automatiquement."
      />

      {classes.length === 0 ? (
        <div className="ec-card">
          <EmptyState icon={BookOpen} title="Aucune classe ne vous est confiée" text="Dès que la direction vous confie une classe, vous retrouvez ici les devoirs adaptés à son âge." />
        </div>
      ) : (
        <>
          <div className="ec-lib-bar">
            <label className="ec-lib-class">
              <span>Pour quelle classe ?</span>
              <select className="ec-select" value={classId} onChange={e => setClassId(e.target.value)}>
                {classes.map(({ classroom, studentCount }) => (
                  <option key={classroom.id} value={classroom.id}>
                    {className(classroom)} · {trackLabel(levelInfo(classroom.level).track)} ({plural(studentCount, "élève")})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="ec-lib-help">
            <Lightbulb size={20} aria-hidden="true" />
            <p>
              <b>Comment faire ?</b>{" "}Repérez le module que vous venez de traiter, puis cliquez sur « Assigner » : sur une leçon, pour vérifier
              ce qui vient d&apos;être appris, ou sur le <b>bilan du module</b>, pour clore le chapitre. Vous ne voyez que les devoirs
              écrits pour les {trackLabel(track as string)}.
            </p>
          </div>

          <div className="ec-missions-filters">
            <input
              className="ec-input ec-missions-search"
              type="search"
              placeholder="Rechercher un devoir..."
              aria-label="Rechercher un devoir"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {visible.length === 0 ? (
            <div className="ec-missions-empty">
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }} aria-hidden="true"><Search size={40} style={{ color: "var(--ec-muted)" }} /></div>
              <h3>Aucun devoir trouvé</h3>
              <p style={{ margin: 0 }}>Essayez de modifier votre recherche.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {orderedGroups.map((group, index) => (
                <LibraryModuleGroup
                  key={group}
                  title={group}
                  missions={grouped[group]}
                  classId={classId}
                  onAssign={onAssign}
                  defaultOpen={index === 0}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function LibraryModuleGroup({ title, missions, classId, onAssign, defaultOpen }: { title: string; missions: Mission[]; classId: string; onAssign: (mission: Mission, classId: string | null) => void; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ec-card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="ec-prog-module-header" onClick={() => setOpen(!open)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setOpen(!open)}>
        <div>
          <h3 className="ec-prog-module-title" style={{ fontSize: 16 }}>{title}</h3>
          <p style={{ margin: "4px 0 0", color: "var(--ec-muted)", fontSize: 13 }}>{plural(missions.length, "devoir")}</p>
        </div>
        {open ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </div>
      {open && (
        <div style={{ padding: 20, background: "var(--ec-bg)" }}>
          <div className="ec-mission-grid">
            {missions.map(mission => (
              <article key={mission.id} className="ec-card ec-mission-card" style={{ background: "var(--ec-surface)" }}>
                <div className="ec-mission-top">
                  <Badge tone="info">{mission.moduleTitle ?? mission.category}</Badge>
                  <div className="ec-mission-meta">
                    <span><Clock size={14} aria-hidden="true" /> {mission.durationMinutes} min</span>
                    <span><Star size={14} aria-hidden="true" /> {mission.xp} XP</span>
                  </div>
                </div>
                <h3>{mission.kind === "bilan" ? "Bilan du module" : mission.kind === "lecon" ? `Leçon ${mission.lessonOrder} · ${mission.lessonTitle}` : mission.title}</h3>
                <p>{mission.kind === "bilan" ? `À donner à la fin du module : ${plural(mission.questionCount, "question")} qui reprennent toutes les leçons.` : mission.description}</p>
                <div className="ec-mission-bottom">
                  <Badge tone={mission.difficulty === "Débutant" ? "ok" : mission.difficulty === "Intermédiaire" ? "warn" : "danger"}>
                    {mission.difficulty}
                  </Badge>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {mission.kind === "lecon" && (
                      <Link href={`/enseignant/programme/${mission.lessonId}`} className="ec-btn">Préparer la leçon</Link>
                    )}
                    <button type="button" className="ec-btn ec-btn--primary" onClick={() => onAssign(mission, classId || null)}>Assigner</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Given({ assignments, onGoToLibrary }: { assignments: AssignmentSummary[]; onGoToLibrary: () => void }) {
  const [state, setState] = useState<StateFilter>("en_cours");
  const [classId, setClassId] = useState("");
  const classOptions = [...new Map(assignments.map(a => [a.classroom.id, a.classroom])).values()];
  const visible = assignments.filter(a =>
    (!classId || a.classroom.id === classId)
    && (state === "tous" || (state === "date_passee") === isPastDue(a.assignment)));

  return (
    <>
      <PageHeader
        title="Devoirs donnés"
        subtitle="Suivez qui a terminé chaque devoir et qui a besoin d'un rappel."
      />

      <div className="ec-toolbar">
        <div className="ec-segmented" role="group" aria-label="Filtrer par état">
          {([["en_cours", "En cours"], ["date_passee", "Date limite passée"], ["tous", "Tous"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={state === value} onClick={() => setState(value)}>{label}</button>
          ))}
        </div>
        {classOptions.length > 1 && (
          <label>
            <span className="sr-only">Filtrer par classe</span>
            <select className="ec-select" value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">Toutes mes classes</option>
              {classOptions.map(c => <option key={c.id} value={c.id}>{className(c)}</option>)}
            </select>
          </label>
        )}
        <span className="ec-count">{plural(visible.length, "devoir")}</span>
      </div>

      {visible.length === 0 ? (
        <div className="ec-card">
          <EmptyState
            icon={ClipboardList}
            title="Aucun devoir"
            text={assignments.length === 0 ? "Choisissez une mission dans la bibliothèque et assignez-la à une classe." : "Modifiez les filtres."}
            action={assignments.length === 0 ? <button type="button" className="ec-btn ec-btn--primary" onClick={onGoToLibrary}>Ouvrir la bibliothèque</button> : undefined}
          />
        </div>
      ) : (
        <div className="ec-grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))" }}>
          {visible.map(summary => (
            <article key={summary.assignment.id} className="ec-card" style={{ display: "grid", gap: 14 }}>
              <AssignmentProgress summary={summary} />
              {summary.assignment.instructions && (
                <p style={{ margin: 0, color: "var(--ec-muted)", fontSize: 13 }}>« {summary.assignment.instructions} »</p>
              )}
              <Link className="ec-btn" href={`/enseignant/devoirs/${summary.assignment.id}`} style={{ justifySelf: "start" }}>Voir le suivi →</Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export function MissionsView({ initialTab }: { initialTab: MissionsTab }) {
  const [tab, setTab] = useState<MissionsTab>(initialTab);
  const [assigning, setAssigning] = useState<{ mission: Mission; classId: string | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: missions, error: missionsError } = useApi(listMissions);
  const loadClasses = listTeacherClasses;
  const { data: classes } = useApi(loadClasses);
  const loadAssignments = listTeacherAssignments;
  const { data: assignments, error: assignmentsError, reload } = useApi(loadAssignments);

  const openCount = assignments?.filter(a => !isPastDue(a.assignment)).length ?? 0;

  return (
    <>
      <div className="ec-segmented" role="tablist" aria-label="Missions et devoirs" style={{ marginBottom: 24 }}>
        <button type="button" role="tab" aria-selected={tab === "bibliotheque"} onClick={() => setTab("bibliotheque")}>Bibliothèque</button>
        <button type="button" role="tab" aria-selected={tab === "suivi"} onClick={() => setTab("suivi")}>
          Devoirs donnés{assignments ? ` (${openCount} en cours)` : ""}
        </button>
      </div>

      {notice && <Notice>{notice}</Notice>}

      {tab === "bibliotheque" ? (
        missionsError ? <ErrorMessage message={missionsError} />
          : !missions ? <Skeleton height={300} />
          : !classes ? <Skeleton height={300} />
          : <Library missions={missions} classes={classes} onAssign={(mission, classId) => { setNotice(null); setAssigning({ mission, classId }); }} />
      ) : (
        assignmentsError ? <ErrorMessage message={assignmentsError} />
          : !assignments ? <Skeleton height={300} />
          : <Given assignments={assignments} onGoToLibrary={() => setTab("bibliotheque")} />
      )}

      {assigning && classes && (
        <AssignModal
          mission={assigning.mission}
          classes={classes}
          defaultClassId={assigning.classId}
          onClose={() => setAssigning(null)}
          onAssigned={created => {
            setNotice(`« ${assigning.mission.title} » a été assigné à ${created.map(c => className(c.classroom)).join(", ")}.`);
            reload();
          }}
        />
      )}
    </>
  );
}
