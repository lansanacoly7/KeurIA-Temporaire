"use client";

import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { plural } from "@/app/_scolaire/lib/format";
import { trackLabel } from "@/app/_scolaire/lib/levels";
import {
  createMission, listLibraryMissions, MISSION_CATEGORIES, MISSION_DIFFICULTIES, setMissionActive, updateMission,
  type LibraryMission, type MissionInput,
} from "@/app/_scolaire/lib/superadminApi";
import type { MissionCategory } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Badge, ConfirmModal, DataTable, EmptyState, ErrorMessage, Field, Modal, Notice, PageHeader, Skeleton, type Column } from "@/app/_scolaire/ui/ui";

const EMPTY: MissionInput = { title: "", description: "", category: "Sécurité", difficulty: "Débutant", durationMinutes: 15, xp: 50 };

function MissionFormModal({ mission, onClose, onSaved }: { mission?: LibraryMission; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState<MissionInput>(mission
    ? { title: mission.title, description: mission.description, category: mission.category as MissionCategory, difficulty: mission.difficulty, durationMinutes: mission.durationMinutes, xp: mission.xp }
    : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = <K extends keyof MissionInput>(key: K, value: MissionInput[K]) => setForm(f => ({ ...f, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (mission) await updateMission(mission.id, form);
      else await createMission(form);
      onSaved(mission ? "La mission a été modifiée." : "La mission a été ajoutée à la bibliothèque.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
      setSaving(false);
    }
  }

  return (
    <Modal title={mission ? `Modifier « ${mission.title} »` : "Nouvelle mission"} onClose={onClose} footer={
      <>
        <button type="button" className="ec-btn" onClick={onClose}>Annuler</button>
        <button type="submit" form="mission-form" className="ec-btn ec-btn--primary" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
      </>
    }>
      <form id="mission-form" onSubmit={submit} noValidate className="ec-form-grid">
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Titre"><input className="ec-input" value={form.title} onChange={e => update("title", e.target.value)} /></Field>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Description" hint="600 caractères maximum."><textarea className="ec-input" rows={3} maxLength={600} value={form.description} onChange={e => update("description", e.target.value)} /></Field>
        </div>
        <Field label="Catégorie">
          <select className="ec-select" value={form.category} onChange={e => update("category", e.target.value as MissionInput["category"])}>
            {MISSION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Difficulté">
          <select className="ec-select" value={form.difficulty} onChange={e => update("difficulty", e.target.value as MissionInput["difficulty"])}>
            {MISSION_DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Durée (minutes)"><input className="ec-input" type="number" min={1} max={240} value={form.durationMinutes} onChange={e => update("durationMinutes", Number(e.target.value))} /></Field>
        <Field label="XP gagnés"><input className="ec-input" type="number" min={0} max={1000} value={form.xp} onChange={e => update("xp", Number(e.target.value))} /></Field>
        {error && <div style={{ gridColumn: "1 / -1" }}><ErrorMessage message={error} /></div>}
      </form>
    </Modal>
  );
}

export function MissionsAdminView() {
  const { data, error, reload } = useApi(listLibraryMissions);
  const [editing, setEditing] = useState<LibraryMission | "new" | null>(null);
  const [toggling, setToggling] = useState<LibraryMission | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggle(mission: LibraryMission) {
    setBusy(true);
    setActionError(null);
    try {
      await setMissionActive(mission.id, !mission.active);
      setNotice(mission.active ? `« ${mission.title} » a été retirée de la bibliothèque.` : `« ${mission.title} » est de nouveau proposée aux enseignants.`);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
      setToggling(null);
    }
  }

  const columns: Column<LibraryMission>[] = [
    { key: "title", header: "Mission", render: m => <div><b>{m.title}</b><div style={{ color: "var(--ec-muted)", fontSize: 13 }}>{m.description}</div></div> },
    { key: "cat", header: "Catégorie", render: m => (m.kind === "libre" ? m.category : `Programme · ${trackLabel(m.track)} · ${m.category}`) },
    { key: "diff", header: "Niveau", render: m => `${m.difficulty} · ${m.durationMinutes} min · ${m.xp} XP` },
    { key: "used", header: "Donnée en devoir", align: "right", render: m => plural(m.assignments, "fois", "fois") },
    { key: "state", header: "Bibliothèque", render: m => (m.active ? <Badge tone="ok">Proposée</Badge> : <Badge>Retirée</Badge>) },
    {
      key: "actions", header: "", align: "right",
      render: m => (
        <div className="ec-actions" style={{ justifyContent: "flex-end" }}>
          {m.kind === "libre"
            ? <button type="button" className="ec-btn" onClick={() => setEditing(m)}>Modifier</button>
            : <span style={{ alignSelf: "center", color: "var(--ec-muted)", fontSize: 13 }}>Suit la leçon</span>}
          <button type="button" className={`ec-btn ${m.active ? "ec-btn--caution" : ""}`} onClick={() => setToggling(m)}>{m.active ? "Retirer" : "Remettre"}</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Missions"
        subtitle="Bibliothèque commune où les enseignants de toutes les écoles choisissent leurs devoirs."
        actions={<button type="button" className="ec-btn ec-btn--primary" onClick={() => setEditing("new")}><Plus size={18} aria-hidden="true" /> Nouvelle mission</button>}
      />
      {notice && <Notice>{notice}</Notice>}
      {actionError && <ErrorMessage message={actionError} />}
      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={300} /> : (
        <DataTable caption="Bibliothèque de missions" columns={columns} rows={data} rowKey={m => m.id}
          empty={<EmptyState icon={BookOpen} title="Aucune mission" text="Ajoutez la première mission de la bibliothèque." />} />
      )}
      {editing && (
        <MissionFormModal
          mission={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={message => { setEditing(null); setNotice(message); reload(); }}
        />
      )}
      {toggling && (toggling.active ? (
        <ConfirmModal
          title={`Retirer « ${toggling.title} » ?`}
          consequences={["Les enseignants ne pourront plus la donner en devoir."]}
          unchanged={`les ${plural(toggling.assignments, "devoir déjà donné", "devoirs déjà donnés")} et les résultats des élèves.`}
          reversibility="Vous pourrez la remettre dans la bibliothèque à tout moment."
          confirmLabel="Retirer la mission"
          danger
          busy={busy}
          onConfirm={() => toggle(toggling)}
          onClose={() => setToggling(null)}
        />
      ) : (
        <ConfirmModal
          title={`Remettre « ${toggling.title} » ?`}
          message="Les enseignants pourront de nouveau la donner en devoir."
          confirmLabel="Remettre la mission"
          busy={busy}
          onConfirm={() => toggle(toggling)}
          onClose={() => setToggling(null)}
        />
      ))}
    </>
  );
}
