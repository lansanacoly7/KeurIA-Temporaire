"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, Sparkles, XCircle } from "lucide-react";
import type { Screen } from "@/app/dashboard/parcours79/types";
import { publishLesson, publishRefusal, type Issue, type StudioLesson } from "@/app/_scolaire/lib/studio79Api";
import { ErrorMessage, Modal } from "@/app/_scolaire/ui/ui";

function computeDiff(workingScreens: Screen[], liveScreens?: Screen[]) {
  if (!liveScreens) {
    return { added: workingScreens.length, removed: 0, modified: 0 };
  }
  let modified = 0;
  const common = Math.min(workingScreens.length, liveScreens.length);
  for (let i = 0; i < common; i++) {
    if (JSON.stringify(workingScreens[i]) !== JSON.stringify(liveScreens[i])) {
      modified++;
    }
  }
  const added = Math.max(0, workingScreens.length - liveScreens.length);
  const removed = Math.max(0, liveScreens.length - workingScreens.length);
  return { modified, added, removed };
}

export function PublishPanel({
  lesson,
  workingScreens,
  issues: initialIssues,
  onClose,
  onSelectScreen,
  onPublished,
}: {
  lesson: StudioLesson;
  workingScreens: Screen[];
  issues: Issue[];
  onClose: () => void;
  onSelectScreen: (screenIndex: number) => void;
  onPublished: () => void;
}) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  useEffect(() => {
    setIssues(initialIssues);
  }, [initialIssues]);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const diff = useMemo(() => computeDiff(workingScreens, lesson.live?.content.screens), [workingScreens, lesson.live]);

  const errors = issues.filter(i => i.severity === "error");
  const warnings = issues.filter(i => i.severity === "warning");
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  const delayMinutes = lesson.delayMinutes ?? 15;
  const targetTimeStr = useMemo(() => {
    const target = new Date(Date.now() + delayMinutes * 60 * 1000);
    return target.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }, [delayMinutes]);

  const canPublish = !hasErrors && (!hasWarnings || ack);

  async function handlePublish() {
    if (!canPublish || busy) return;
    setBusy(true);
    setApiError(null);
    try {
      await publishLesson(lesson.id, ack);
      onPublished();
      onClose();
    } catch (err) {
      const refusal = publishRefusal(err);
      if (refusal) {
        setIssues(refusal.issues);
        if (refusal.needsAcknowledge) {
          setApiError("Veuillez cocher la confirmation pour publier malgré les règles de style.");
        } else if (refusal.blocking) {
          setApiError("La publication est bloquée par des erreurs de structure.");
        } else {
          setApiError(refusal.message);
        }
      } else {
        setApiError(err instanceof Error ? err.message : "Erreur lors de la publication.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Publier la leçon"
      onClose={onClose}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <button type="button" className="ec-btn" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button
            type="button"
            className="sx-btn-publish"
            disabled={!canPublish || busy}
            onClick={handlePublish}
            aria-busy={busy}
          >
            <Sparkles size={16} aria-hidden="true" />
            {busy ? "Publication en cours…" : "Confirmer et programmer la mise en ligne"}
          </button>
        </div>
      }
    >
      <div className="sx-publish-modal">
        {/* Résumé des changements */}
        <div className="sx-publish-summary-card">
          <b>Résumé des changements</b>
          <div className="sx-publish-diffs">
            <span>
              <b>{diff.modified}</b> écran{diff.modified > 1 ? "s" : ""} modifié{diff.modified > 1 ? "s" : ""}
            </span>
            <span>
              <b>+{diff.added}</b> ajouté{diff.added > 1 ? "s" : ""}
            </span>
            <span>
              <b>-{diff.removed}</b> supprimé{diff.removed > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Délai de sécurité */}
        <div className="sx-publish-delay-notice">
          <Clock size={20} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>
            <b>Visible des enfants à {targetTimeStr}</b> (dans {delayMinutes} minutes). Vous pourrez annuler jusqu&apos;à cette heure.
          </span>
        </div>

        {apiError && <ErrorMessage message={apiError} />}

        {/* Erreurs bloquantes */}
        {hasErrors && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--sx-danger)", fontWeight: 700, fontSize: 13 }}>
              <ShieldAlert size={18} aria-hidden="true" />
              <span>{errors.length} erreur{errors.length > 1 ? "s" : ""} de structure à corriger (publication bloquée) :</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {errors.map((issue, idx) => (
                <div key={idx} className="sx-issue-item" data-severity="error">
                  <XCircle size={16} color="var(--sx-danger)" aria-hidden="true" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13 }}>
                    {issue.screen && <b>Écran {issue.screen} : </b>}
                    <span>{issue.message}</span>
                  </div>
                  {issue.screen && (
                    <button
                      type="button"
                      className="ec-btn ec-btn--small"
                      onClick={() => {
                        onSelectScreen(issue.screen! - 1);
                        onClose();
                      }}
                    >
                      Corriger
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avertissements de style */}
        {hasWarnings && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--sx-warn)", fontWeight: 700, fontSize: 13 }}>
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{warnings.length} avertissement{warnings.length > 1 ? "s" : ""} de style (bible narrative) :</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {warnings.map((issue, idx) => (
                <div key={idx} className="sx-issue-item" data-severity="warning">
                  <AlertTriangle size={16} color="var(--sx-warn)" aria-hidden="true" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13 }}>
                    {issue.screen && <b>Écran {issue.screen} : </b>}
                    <span>{issue.message}</span>
                  </div>
                  {issue.screen && (
                    <button
                      type="button"
                      className="ec-btn ec-btn--small"
                      onClick={() => {
                        onSelectScreen(issue.screen! - 1);
                        onClose();
                      }}
                    >
                      Voir
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Case de confirmation obligatoire pour les avertissements */}
            {!hasErrors && (
              <label className="sx-publish-ack-box">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={e => setAck(e.target.checked)}
                />
                <span>
                  <b>Je confirme publier malgré ces règles de style</b> (les enfants pourront jouer la leçon).
                </span>
              </label>
            )}
          </div>
        )}

        {!hasErrors && !hasWarnings && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--sx-brand)", fontSize: 13 }}>
            <CheckCircle size={18} aria-hidden="true" />
            <span>Aucun problème détecté. Le contenu est prêt pour la mise en ligne.</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
