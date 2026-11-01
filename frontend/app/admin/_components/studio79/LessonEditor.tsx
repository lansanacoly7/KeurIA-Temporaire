"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  History,
  Maximize2,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Undo2,
  X,
  XCircle,
} from "lucide-react";
import type { LessonContent } from "@/app/dashboard/parcours79/types";
import { formatDate, formatRelative } from "@/app/_scolaire/lib/format";
import {
  cancelPublication,
  discardDraft,
  getStudioLesson,
  rollbackLesson,
  saveDraft,
  type Issue,
  type StudioLesson,
  type VersionInfo,
} from "@/app/_scolaire/lib/studio79Api";
import { ConfirmModal, ErrorMessage, Modal, Skeleton } from "@/app/_scolaire/ui/ui";
import { LessonInfoInspector, ScreenInspector } from "./ScreenInspector";
import { ScreenRail } from "./ScreenRail";
import { PreviewFrame } from "./PreviewFrame";
import { PublishPanel } from "./PublishPanel";
import "./studio79.css";

const MAX_HISTORY = 50;

function formatClock(d: Date) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function LessonEditor({ lessonId }: { lessonId: string }) {
  const [lesson, setLesson] = useState<StudioLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Contenu de travail et sélection
  // Contenu de travail et pile Annuler / Rétablir unifiés
  const [history, setHistory] = useState<{ stack: LessonContent[]; index: number }>({ stack: [], index: -1 });
  const content = history.stack[history.index] ?? null;
  const canUndo = history.index > 0;
  const canRedo = history.index >= 0 && history.index < history.stack.length - 1;
  const [selected, setSelected] = useState<number>(0);
  const [issues, setIssues] = useState<Issue[]>([]);

  // État de sauvegarde
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Modals & Tiroirs
  const [showPublish, setShowPublish] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [rollingBack, setRollingBack] = useState<VersionInfo | null>(null);
  const [cancellingPending, setCancellingPending] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

  // Horloge compte à rebours
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Chargement initial
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getStudioLesson(lessonId);
      setLesson(data);
      const working = JSON.parse(JSON.stringify(data.working.content)) as LessonContent;
      setHistory({ stack: [working], index: 0 });
      setIssues(data.issues);
      setIsDirty(false);
      setSaveState("saved");
      setLastSavedAt(new Date());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Impossible de charger la leçon.");
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Enregistrement manuel ou auto
  const executeSave = useCallback(
    async (nextContent: LessonContent) => {
      if (!lesson) return;
      setSaveState("saving");
      try {
        const res = await saveDraft(lesson.id, nextContent);
        setSaveState("saved");
        setLastSavedAt(new Date());
        setIssues(res.issues);
        setIsDirty(false);
        setLesson(prev => (prev ? { ...prev, draft: res.draft } : null));
      } catch {
        setSaveState("error");
      }
    },
    [lesson]
  );

  // Modification du contenu (avec push dans la pile d'historique)
  const mutateContent = useCallback(
    (updater: (prev: LessonContent) => LessonContent) => {
      setHistory(h => {
        const cur = h.stack[h.index];
        if (!cur) return h;
        const next = updater(cur);
        if (JSON.stringify(cur) === JSON.stringify(next)) return h;

        const newStack = h.stack.slice(0, h.index + 1);
        newStack.push(JSON.parse(JSON.stringify(next)));
        if (newStack.length > MAX_HISTORY) newStack.shift();
        return { stack: newStack, index: newStack.length - 1 };
      });
      setIsDirty(true);
    },
    []
  );

  // Annuler / Rétablir
  const undo = useCallback(() => {
    setHistory(h => {
      if (h.index <= 0) return h;
      return { ...h, index: h.index - 1 };
    });
    setIsDirty(true);
  }, []);

  const redo = useCallback(() => {
    setHistory(h => {
      if (h.index >= h.stack.length - 1) return h;
      return { ...h, index: h.index + 1 };
    });
    setIsDirty(true);
  }, []);

  // Débroussaillage autosave 1.2s après frappe
  useEffect(() => {
    if (!isDirty || !content) return;
    setSaveState("saving");
    const timer = setTimeout(() => {
      void executeSave(content);
    }, 1200);
    return () => clearTimeout(timer);
  }, [content, isDirty, executeSave]);

  // Alerte beforeunload si modifications en vol
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Raccourcis clavier (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, Ctrl+S)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (content) void executeSave(content);
        return;
      }

      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, content, executeSave]);

  // Sévérité par écran pour ScreenRail (1-based)
  const severityMap = useMemo(() => {
    const map = new Map<number, "error" | "warning">();
    for (const issue of issues) {
      if (issue.screen != null) {
        const cur = map.get(issue.screen);
        if (!cur || issue.severity === "error") {
          map.set(issue.screen, issue.severity);
        }
      }
    }
    return map;
  }, [issues]);

  const errorCount = issues.filter(i => i.severity === "error").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;

  // Calcul changements par rapport à la version live
  const hasChangesComparedToLive = useMemo(() => {
    if (!lesson?.live?.content || !content) return true;
    return JSON.stringify(content) !== JSON.stringify(lesson.live.content);
  }, [content, lesson]);

  // Bandeau publication en attente
  const pendingCountdown = useMemo(() => {
    if (!lesson?.pending?.publishAt) return null;
    const target = new Date(lesson.pending.publishAt).getTime();
    const diffMs = target - now;
    if (diffMs <= 0) return { ready: true, text: "en cours de passage en ligne" };
    const mins = Math.ceil(diffMs / 60000);
    const targetClock = formatClock(new Date(lesson.pending.publishAt));
    return {
      ready: false,
      text: `La version ${lesson.pending.number} sera en ligne à ${targetClock} (dans ${mins} min)`,
    };
  }, [lesson, now]);

  if (loading) {
    return (
      <div className="sx-editor" style={{ alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Skeleton width={320} height={24} />
        <Skeleton width={560} height={180} />
      </div>
    );
  }

  if (loadError || !lesson || !content) {
    return (
      <div className="sx-editor" style={{ alignItems: "center", justifyContent: "center", padding: 24 }}>
        <ErrorMessage message={loadError || "Leçon introuvable."} onRetry={load} />
        <Link href="/admin/studio79" className="sx-btn-back" style={{ marginTop: 16 }}>
          <ArrowLeft size={16} /> Retour au studio
        </Link>
      </div>
    );
  }

  return (
    <div className="sx-editor">
      {/* ── Message pour les petits écrans (< 900px) ───────────────────────── */}
      <div className="sx-too-small">
        <Sparkles size={40} color="var(--sx-brand)" />
        <h2>Espace de travail non adapté</h2>
        <p>Le studio des leçons se travaille sur ordinateur ou sur une tablette large pour permettre un aperçu fidèle et complet.</p>
        <Link href="/admin/studio79" className="sx-btn-back">
          <ArrowLeft size={16} /> Retour à l&apos;accueil du studio
        </Link>
      </div>

      {/* ── Barre du haut (56px) ─────────────────────────────────────────── */}
      <header className="sx-topbar" aria-label="Barre d'outils de l'éditeur">
        <div className="sx-topbar-left">
          <Link href="/admin/studio79" className="sx-btn-back" title="Quitter vers l'accueil du studio" aria-label="Quitter vers l'accueil du studio">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Quitter</span>
          </Link>
          <div className="sx-topbar-title">
            <h1>{content.title || lesson.title}</h1>
            <span>{lesson.moduleTitle} · {lesson.id}</span>
          </div>
        </div>

        <div className="sx-topbar-center">
          {/* Annuler / Rétablir */}
          <div className="sx-seg" role="group" aria-label="Historique d'édition">
            <button
              type="button"
              disabled={!canUndo}
              onClick={undo}
              title="Annuler (Ctrl+Z)"
              aria-label="Annuler la dernière modification"
            >
              <Undo2 size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={redo}
              title="Rétablir (Ctrl+Maj+Z)"
              aria-label="Rétablir la modification annulée"
            >
              <Redo2 size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Indicateur d'enregistrement */}
          <div className="sx-save-status" data-state={saveState} aria-live="polite">
            {saveState === "saving" && (
              <>
                <RefreshCw size={12} className="spin" aria-hidden="true" />
                <span>Enregistrement…</span>
              </>
            )}
            {saveState === "saved" && (
              <>
                <Check size={12} aria-hidden="true" />
                <span>Brouillon enregistré à {lastSavedAt ? formatClock(lastSavedAt) : ""}</span>
              </>
            )}
            {saveState === "error" && (
              <>
                <AlertTriangle size={12} aria-hidden="true" />
                <span>Non enregistré</span>
                <button
                  type="button"
                  onClick={() => executeSave(content)}
                  style={{ textDecoration: "underline", background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0 }}
                >
                  réessayer
                </button>
              </>
            )}
            {saveState === "idle" && <span>Prêt</span>}
          </div>
        </div>

        <div className="sx-topbar-right">
          {/* Problèmes */}
          <button
            type="button"
            className="sx-ghost"
            onClick={() => setShowIssues(true)}
            title={`Problèmes détectés : ${errorCount} erreurs, ${warningCount} avertissements`}
            aria-label={`Problèmes détectés : ${errorCount} erreurs, ${warningCount} avertissements`}
          >
            {errorCount > 0 ? (
              <XCircle size={15} color="var(--sx-danger)" aria-hidden="true" />
            ) : warningCount > 0 ? (
              <AlertTriangle size={15} color="var(--sx-warn)" aria-hidden="true" />
            ) : (
              <CheckCircle size={15} color="var(--sx-brand)" aria-hidden="true" />
            )}
            <span>Problèmes</span>
            {(errorCount > 0 || warningCount > 0) && (
              <span className="sx-flag" data-severity={errorCount > 0 ? "error" : "warning"} />
            )}
          </button>

          {/* Historique */}
          <button
            type="button"
            className="sx-ghost"
            onClick={() => setShowHistory(true)}
            title="Historique des versions"
            aria-label="Historique des versions"
          >
            <History size={15} aria-hidden="true" />
            <span>Historique</span>
          </button>

          {/* Écarter le brouillon */}
          {Boolean(lesson.draft) && (
            <button
              type="button"
              className="sx-ghost"
              onClick={() => setDiscarding(true)}
              style={{ color: "var(--sx-danger)" }}
              title="Supprimer ce brouillon et revenir à la version en ligne"
              aria-label="Supprimer ce brouillon et revenir à la version en ligne"
            >
              <Trash2 size={15} aria-hidden="true" />
              <span>Écarter</span>
            </button>
          )}

          {/* Bouton inspecteur mobile/tablette (900-1199px) */}
          <button
            type="button"
            className="sx-ghost sx-inspector-toggle-btn"
            onClick={() => setMobileInspectorOpen(open => !open)}
            title="Ouvrir l'inspecteur"
            aria-label="Ouvrir l'inspecteur"
          >
            {mobileInspectorOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            <span>Inspecteur</span>
          </button>

          {/* Publier */}
          <button
            type="button"
            className="sx-btn-publish"
            disabled={!hasChangesComparedToLive}
            onClick={async () => {
              if (content) {
                await executeSave(content);
                setShowPublish(true);
              }
            }}
            title={
              !hasChangesComparedToLive
                ? "Aucune modification par rapport à la version en ligne"
                : "Programmer la publication de cette leçon"
            }
            aria-label="Programmer la publication de cette leçon"
          >
            <Sparkles size={16} aria-hidden="true" />
            <span>Publier</span>
          </button>
        </div>
      </header>

      {/* ── Bandeau de publication en attente ───────────────────────────────── */}
      {lesson.pending && pendingCountdown && (
        <div className="sx-pending-banner" role="status" aria-live="polite">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={18} aria-hidden="true" />
            <span>
              <b>Publication programmée : </b>
              {pendingCountdown.text}
            </span>
          </div>
          <button
            type="button"
            className="sx-btn-cancel-pending"
            disabled={cancellingPending}
            onClick={async () => {
              setCancellingPending(true);
              try {
                await cancelPublication(lesson.id);
                await load();
              } catch (err) {
                alert(err instanceof Error ? err.message : "Impossible d'annuler la publication.");
              } finally {
                setCancellingPending(false);
              }
            }}
          >
            {cancellingPending ? "Annulation…" : "Annuler la publication"}
          </button>
        </div>
      )}

      {/* ── Espace de travail à 3 colonnes ──────────────────────────────────── */}
      <main className="sx-workspace">
        {/* Colonne gauche : Rail des écrans */}
        <ScreenRail
          screens={content.screens}
          selected={selected}
          severity={severityMap}
          onSelect={setSelected}
          onChange={(newScreens, newSelected) => {
            mutateContent(c => ({ ...c, screens: newScreens }));
            setSelected(newSelected);
          }}
        />

        {/* Colonne centrale : Aperçu */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
          <PreviewFrame content={content} screenIndex={selected} />
          <button
            type="button"
            className="sx-ghost"
            style={{ position: "absolute", bottom: 16, right: 16, zIndex: 15, background: "rgba(18, 33, 32, 0.85)", color: "#fff", backdropFilter: "blur(4px)" }}
            onClick={() => setShowFullPreview(true)}
            title="Aperçu plein écran"
          >
            <Maximize2 size={14} aria-hidden="true" /> Aperçu grand format
          </button>
        </div>

        {/* Colonne droite : Inspecteur (desktop >= 1200px) */}
        <aside className="sx-inspector" aria-label="Propriétés de l'élément sélectionné">
          {selected === -1 ? (
            <LessonInfoInspector
              content={content}
              onChange={next => mutateContent(() => next)}
            />
          ) : content.screens[selected] ? (
            <ScreenInspector
              screen={content.screens[selected]}
              onChange={nextScreen =>
                mutateContent(c => ({
                  ...c,
                  screens: c.screens.map((s, i) => (i === selected ? nextScreen : s)),
                }))
              }
            />
          ) : (
            <div style={{ padding: 24, color: "var(--sx-muted)" }}>Écran non trouvé.</div>
          )}
        </aside>
      </main>

      {/* ── Tiroir Inspecteur pour tablettes (900px - 1199px) ───────────────── */}
      {mobileInspectorOpen && (
        <>
          <div className="sx-drawer-backdrop" onClick={() => setMobileInspectorOpen(false)} aria-hidden="true" />
          <aside className="sx-drawer" aria-label="Inspecteur de propriétés">
            <div className="sx-drawer-head">
              <h2>{selected === -1 ? "Fiche de la leçon" : `Écran ${selected + 1}`}</h2>
              <button type="button" className="sx-icon-btn" onClick={() => setMobileInspectorOpen(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <div className="sx-drawer-content">
              {selected === -1 ? (
                <LessonInfoInspector content={content} onChange={next => mutateContent(() => next)} />
              ) : content.screens[selected] ? (
                <ScreenInspector
                  screen={content.screens[selected]}
                  onChange={nextScreen =>
                    mutateContent(c => ({
                      ...c,
                      screens: c.screens.map((s, i) => (i === selected ? nextScreen : s)),
                    }))
                  }
                />
              ) : null}
            </div>
          </aside>
        </>
      )}

      {/* ── Tiroir des Problèmes ────────────────────────────────────────────── */}
      {showIssues && (
        <>
          <div className="sx-drawer-backdrop" onClick={() => setShowIssues(false)} aria-hidden="true" />
          <aside className="sx-drawer" aria-label="Liste des problèmes détectés">
            <div className="sx-drawer-head">
              <h2>Problèmes détectés ({issues.length})</h2>
              <button type="button" className="sx-icon-btn" onClick={() => setShowIssues(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <div className="sx-drawer-content">
              {issues.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 32, textAlign: "center", color: "var(--sx-brand)" }}>
                  <CheckCircle size={32} />
                  <b>Aucun problème</b>
                  <span style={{ fontSize: 13, color: "var(--sx-muted)" }}>Cette leçon respecte toutes les règles de structure et la bible narrative.</span>
                </div>
              ) : (
                issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="sx-issue-item"
                    data-severity={issue.severity}
                    onClick={() => {
                      if (issue.screen != null) setSelected(issue.screen - 1);
                      else setSelected(-1);
                      setShowIssues(false);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {issue.severity === "error" ? (
                      <XCircle size={18} color="var(--sx-danger)" aria-hidden="true" style={{ marginTop: 2, flexShrink: 0 }} />
                    ) : (
                      <AlertTriangle size={18} color="var(--sx-warn)" aria-hidden="true" style={{ marginTop: 2, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, fontSize: 13 }}>
                      <b>{issue.screen != null ? `Écran ${issue.screen}` : "Fiche leçon"}</b>
                      <p style={{ margin: "2px 0 0 0", color: "var(--sx-ink)" }}>{issue.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </>
      )}

      {/* ── Tiroir d'Historique ─────────────────────────────────────────────── */}
      {showHistory && (
        <>
          <div className="sx-drawer-backdrop" onClick={() => setShowHistory(false)} aria-hidden="true" />
          <aside className="sx-drawer" aria-label="Historique des versions">
            <div className="sx-drawer-head">
              <h2>Historique ({lesson.history.length})</h2>
              <button type="button" className="sx-icon-btn" onClick={() => setShowHistory(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <div className="sx-drawer-content">
              {lesson.history.map(ver => {
                const isLive = ver.state === "live";
                const isPending = ver.state === "pending";
                const sourceLabel =
                  ver.source === "import"
                    ? "Contenu d'origine"
                    : ver.source === "rollback"
                    ? "Retour arrière"
                    : "Modification";

                return (
                  <div key={ver.id} className="sx-history-item" data-state={ver.state}>
                    <div className="sx-history-head">
                      <b>Version {ver.number}</b>
                      {isLive && <span className="sx-flag" style={{ background: "var(--sx-brand)" }} title="En ligne" />}
                      {isPending && <span className="sx-flag" style={{ background: "var(--sx-warn)" }} title="En attente" />}
                    </div>
                    <div className="sx-history-meta">
                      <span>{sourceLabel}</span>
                      {ver.author && <span> · par {ver.author}</span>}
                    </div>
                    <div className="sx-history-meta" title={formatDate(ver.createdAt)}>
                      <span>Enregistrée {formatRelative(ver.createdAt)}</span>
                    </div>
                    {ver.note && <p style={{ fontSize: 12, margin: "4px 0", fontStyle: "italic" }}>« {ver.note} »</p>}
                    {!isLive && !isPending && (
                      <div className="sx-history-actions">
                        <button
                          type="button"
                          className="ec-btn ec-btn--small"
                          onClick={() => setRollingBack(ver)}
                        >
                          <RotateCcw size={13} aria-hidden="true" /> Restaurer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        </>
      )}

      {/* ── Modal Écarter le brouillon ───────────────────────────────────────── */}
      {discarding && (
        <ConfirmModal
          title="Écarter ce brouillon ?"
          message="Toutes les modifications en cours sur cette leçon seront abandonnées."
          consequences={[
            "Le brouillon est supprimé de la base de données.",
            "La leçon revient à l'état de la version en ligne.",
          ]}
          reversibility="Cette action est irréversible : les changements non publiés ne pourront plus être récupérés."
          confirmLabel="Écarter le brouillon"
          danger
          onConfirm={async () => {
            try {
              await discardDraft(lesson.id);
              setDiscarding(false);
              await load();
            } catch (err) {
              alert(err instanceof Error ? err.message : "Erreur lors de la suppression du brouillon.");
            }
          }}
          onClose={() => setDiscarding(false)}
        />
      )}

      {/* ── Modal Retour arrière (Rollback) ─────────────────────────────────── */}
      {rollingBack && (
        <ConfirmModal
          title={`Restaurer la version ${rollingBack.number} ?`}
          message={
            <span>
              Le retour est <b>immédiat</b> : les enfants verront cette version tout de suite.
            </span>
          }
          consequences={[
            `La version ${rollingBack.number} redevient la version en ligne sans délai de 15 minutes.`,
            "Toute publication en attente éventuelle est annulée.",
          ]}
          confirmLabel="Restaurer immédiatement"
          danger
          onConfirm={async () => {
            try {
              await rollbackLesson(lesson.id, rollingBack.number);
              setRollingBack(null);
              setShowHistory(false);
              await load();
            } catch (err) {
              alert(err instanceof Error ? err.message : "Impossible de restaurer cette version.");
            }
          }}
          onClose={() => setRollingBack(null)}
        />
      )}

      {/* ── Modal de publication ────────────────────────────────────────────── */}
      {showPublish && (
        <PublishPanel
          lesson={lesson}
          workingScreens={content.screens}
          issues={issues}
          onClose={() => setShowPublish(false)}
          onSelectScreen={idx => setSelected(idx)}
          onPublished={load}
        />
      )}

      {/* ── Modal grand format d'aperçu ─────────────────────────────────────── */}
      {showFullPreview && (
        <Modal title="Aperçu grand format" onClose={() => setShowFullPreview(false)}>
          <div style={{ height: "70vh", minHeight: 480 }}>
            <PreviewFrame content={content} screenIndex={selected} />
          </div>
        </Modal>
      )}
    </div>
  );
}
