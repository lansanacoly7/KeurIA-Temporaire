"use client";

/*
 * Séance de classe (T10) : ouvrir une séance (leçon du programme ou activité +
 * durée), voir le temps restant, la terminer.
 *
 * Le compte à rebours est décrémenté localement à la seconde ; la séance s'arrête
 * d'elle-même côté serveur, l'écran recharge donc à zéro.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Play, Square } from "lucide-react";
import {
  endClassSession, getClassSession, openClassSession, type ClassSession,
} from "@/app/_scolaire/lib/enseignantApi";
import {
  fieldError, formatRemaining, SESSION_MAX_MINUTES, SESSION_MIN_MINUTES, validateSessionDraft,
} from "@/app/_scolaire/lib/classeVivante";
import { getProgramme } from "@/app/_scolaire/lib/programmeApi";
import type { AgeTrack } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Badge, ErrorMessage, Field, Notice, Skeleton } from "@/app/_scolaire/ui/ui";

/** Durées proposées en un clic (modifiables au clavier dans le champ). */
const MINUTE_PRESETS = [15, 30, 45, 60];

export function SeanceSection({ classId, levelTrack }: { classId: string; levelTrack: AgeTrack }) {
  const load = useCallback(() => getClassSession(classId), [classId]);
  const { data, error, reload } = useApi(load);
  const session = data?.session ?? null;

  // Leçons du parcours de la classe, pour lier la séance à une leçon.
  const loadProgramme = useCallback(() => getProgramme(), []);
  const { data: programme } = useApi(loadProgramme);
  const lessons = useMemo(
    () => (programme?.tracks.find(track => track.key === levelTrack)?.modules ?? []).flatMap(
      module => module.lessons.map(lesson => ({ id: lesson.id, label: `${module.title} — ${lesson.title}` })),
    ),
    [programme, levelTrack],
  );

  const [title, setTitle] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Compte à rebours : initialisé par le serveur puis décrémenté à la seconde ;
  // quand la séance change, le compteur repart de son temps serveur (motif React
  // « ajuster l'état au rendu »). À zéro, la séance est finie : rechargement.
  const [remaining, setRemaining] = useState<number | null>(null);
  const [sessionForCountdown, setSessionForCountdown] = useState<ClassSession | null>(null);
  if (session !== sessionForCountdown) {
    setSessionForCountdown(session);
    setRemaining(session?.remainingSeconds ?? null);
  }
  const running = session !== null;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setRemaining(value => (value === null ? null : Math.max(0, value - 1))), 1000);
    return () => clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (running && remaining === 0) reload();
  }, [running, remaining, reload]);

  const errors = useMemo(() => validateSessionDraft({ title, lessonId, minutes }), [title, lessonId, minutes]);

  async function submitSession(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (errors.length > 0) return;
    setBusy(true);
    setFormError(null);
    setSaved(false);
    try {
      await openClassSession(classId, { title: title.trim(), ...(lessonId ? { lessonId } : {}), minutes });
      setTitle("");
      setLessonId("");
      setSubmitted(false);
      setSaved(true);
      reload();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  async function terminate() {
    setBusy(true);
    setFormError(null);
    try {
      await endClassSession(classId);
      reload();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  const lessonLabel = session ? lessons.find(lesson => lesson.id === session.lessonId)?.label ?? session.lessonId : "";

  return (
    <section className="ec-card" aria-labelledby="seance-titre" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <h2 id="seance-titre" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Séance de classe</h2>
        <Badge tone={session ? "ok" : "neutral"}>{session ? "En cours" : "Aucune séance"}</Badge>
      </div>

      {error && <ErrorMessage message={error} onRetry={reload} />}
      {!data && !error && <Skeleton height={88} />}

      {session && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <b style={{ fontSize: 15 }}>{session.title}</b>
            {lessonLabel && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ec-muted)" }}>Leçon : {lessonLabel}</p>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span role="timer" style={{ fontVariantNumeric: "tabular-nums", fontSize: 26, fontWeight: 800, color: "var(--ec-brand)" }}>
              {formatRemaining(remaining ?? session.remainingSeconds)}
            </span>
            <span style={{ fontSize: 12, color: "var(--ec-muted)" }}>restantes</span>
            <button type="button" className="ec-btn" onClick={terminate} disabled={busy}>
              <Square size={16} aria-hidden="true" /> Terminer
            </button>
          </div>
        </div>
      )}

      {!session && data && (
        <form onSubmit={submitSession} noValidate>
          <div className="ec-detail-grid" style={{ marginBottom: 12 }}>
            <Field
              label="Titre de la séance"
              error={submitted ? fieldError(errors, "title") : undefined}
              hint="Ce que la classe fait maintenant (« Lecture suivie », « Maths — les fractions »)."
            >
              <input
                className="ec-input"
                value={title}
                maxLength={80}
                onChange={event => setTitle(event.target.value)}
                placeholder="Lecture suivie"
              />
            </Field>
            <Field label="Durée (minutes)" error={submitted ? fieldError(errors, "minutes") : undefined} hint={`${SESSION_MIN_MINUTES} à ${SESSION_MAX_MINUTES} minutes`}>
              <input
                className="ec-input"
                type="number"
                inputMode="numeric"
                min={SESSION_MIN_MINUTES}
                max={SESSION_MAX_MINUTES}
                value={minutes}
                onChange={event => setMinutes(Number(event.target.value))}
              />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {MINUTE_PRESETS.map(preset => (
              <button
                key={preset}
                type="button"
                className={`ec-btn ${minutes === preset ? "ec-btn--primary" : ""}`}
                style={{ padding: "6px 12px", fontSize: 13 }}
                onClick={() => setMinutes(preset)}
              >
                {preset} min
              </button>
            ))}
          </div>

          <Field label="Leçon ou activité (facultatif)" hint="Les élèves ouvrent la même leçon dans leur parcours.">
            <select className="ec-select" value={lessonId} onChange={event => setLessonId(event.target.value)}>
              <option value="">— Aucune leçon liée —</option>
              {lessons.map(lesson => (
                <option key={lesson.id} value={lesson.id}>{lesson.label}</option>
              ))}
            </select>
          </Field>

          {formError && <ErrorMessage message={formError} />}
          <div style={{ marginTop: 12 }}>
            <button type="submit" className="ec-btn ec-btn--primary" disabled={busy}>
              <Play size={16} aria-hidden="true" /> Ouvrir la séance
            </button>
          </div>
        </form>
      )}

      {saved && !session && (
        <Notice>Séance ouverte : les élèves la voient sur leur écran « Aujourd&apos;hui ».</Notice>
      )}
    </section>
  );
}
