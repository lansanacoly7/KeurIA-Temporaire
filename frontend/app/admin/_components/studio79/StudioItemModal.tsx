"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
  RotateCcw,
  Send,
  Trash2,
  X,
  Sparkles,
  HelpCircle,
  Award,
  BookOpen,
} from "lucide-react";
import {
  cancelStudioItemPublication,
  discardStudioItemDraft,
  getStudioItem,
  publishStudioItem,
  rollbackStudioItem,
  saveStudioItemDraft,
  type Issue,
  type StudioItemDetail,
  type StudioItemKind,
} from "@/app/_scolaire/lib/studio79Api";
import { formatRelative } from "@/app/_scolaire/lib/format";
import { SchemaForm } from "./SchemaForm";
import {
  ACTIVITY_FIELDS,
  DAILY_CHALLENGE_FIELDS,
  MISSION_FIELDS,
  RIDDLE_FIELDS,
} from "./studioItemSchemas";
import "./studio79.css";

type Props = {
  kind: StudioItemKind;
  itemKey: string;
  onClose: () => void;
  onSaved: () => void;
};

export function StudioItemModal({ kind, itemKey, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<StudioItemDetail | null>(null);
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [immediate, setImmediate] = useState(false);
  const [acknowledge, setAcknowledge] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewAnswer, setPreviewAnswer] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await getStudioItem(kind, itemKey);
      setDetail(res);
      setContent(res.working.content || {});
      setPreviewAnswer(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [kind, itemKey]);

  const fields =
    kind === "riddle"
      ? RIDDLE_FIELDS
      : kind === "daily_challenge"
      ? DAILY_CHALLENGE_FIELDS
      : kind === "mission"
      ? MISSION_FIELDS
      : ACTIVITY_FIELDS;

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      await saveStudioItemDraft(kind, itemKey, content);
      await load();
      onSaved();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du brouillon");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!confirm("Voulez-vous vraiment écarter le brouillon en cours ?")) return;
    try {
      setSaving(true);
      await discardStudioItemDraft(kind, itemKey);
      await load();
      onSaved();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de l'annulation du brouillon");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      setErrorMsg(null);
      // Auto-save draft before publish
      await saveStudioItemDraft(kind, itemKey, content);
      await publishStudioItem(kind, itemKey, { immediate, acknowledge });
      await load();
      onSaved();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de la publication");
    } finally {
      setPublishing(false);
    }
  };

  const handleCancelPending = async () => {
    try {
      setPublishing(true);
      await cancelStudioItemPublication(kind, itemKey);
      await load();
      onSaved();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de l'annulation de la publication");
    } finally {
      setPublishing(false);
    }
  };

  const handleRollback = async (num: number) => {
    if (!confirm(`Rétablir la version ${num} ? Cette version sera immédiatement mise en ligne.`)) return;
    try {
      setPublishing(true);
      await rollbackStudioItem(kind, itemKey, num);
      await load();
      onSaved();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de la restauration");
    } finally {
      setPublishing(false);
    }
  };

  const kindLabel =
    kind === "riddle"
      ? "Énigme 7-9 ans"
      : kind === "daily_challenge"
      ? "Défi du jour"
      : kind === "mission"
      ? "Devoir / Mission"
      : "Jeu & Activité";

  const errors = detail?.issues.filter((i) => i.severity === "error") || [];
  const warnings = detail?.issues.filter((i) => i.severity === "warning") || [];

  return (
    <div className="sx-item-modal-overlay" role="dialog" aria-modal="true">
      <div className="sx-item-modal">
        {/* En-tête */}
        <div className="sx-item-modal-header">
          <div className="sx-item-modal-title-row">
            <span className="sx-item-kind-badge">{kindLabel}</span>
            <h2 className="sx-item-modal-title">
              Édition #{itemKey}
            </h2>
            {detail?.live && (
              <span className="sx-item-status-pill live">
                En ligne (v{detail.live.number})
              </span>
            )}
            {detail?.pending && (
              <span className="sx-item-status-pill pending">
                <Clock size={13} /> Publication différée
              </span>
            )}
            {detail?.draft && (
              <span className="sx-item-status-pill draft">
                Brouillon non publié
              </span>
            )}
          </div>
          <div className="sx-item-modal-header-actions">
            <button
              type="button"
              className="sx-btn sx-btn-secondary"
              onClick={() => setShowHistory(!showHistory)}
              title="Historique des versions"
            >
              <History size={16} /> Historique
            </button>
            <button
              type="button"
              className="sx-item-modal-close"
              onClick={onClose}
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Message d'erreur global */}
        {errorMsg && (
          <div className="sx-alert sx-alert-error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Problèmes de validation */}
        {errors.length > 0 && (
          <div className="sx-alert sx-alert-error">
            <AlertCircle size={16} />
            <div>
              <strong>Publication bloquée ({errors.length} problème(s)) :</strong>
              <ul>
                {errors.map((e, idx) => (
                  <li key={idx}>{e.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="sx-alert sx-alert-warning">
            <AlertCircle size={16} />
            <div>
              <strong>Règles de style ({warnings.length} avertissement(s)) :</strong>
              <ul>
                {warnings.map((w, idx) => (
                  <li key={idx}>{w.message}</li>
                ))}
              </ul>
              <label className="sx-check" style={{ marginTop: 6 }}>
                <input
                  type="checkbox"
                  checked={acknowledge}
                  onChange={(e) => setAcknowledge(e.target.checked)}
                />
                <span>Confirmer et publier malgré les avertissements</span>
              </label>
            </div>
          </div>
        )}

        {/* Tiroir Historique */}
        {showHistory && (
          <div className="sx-history-drawer">
            <h3>Historique des versions publiées</h3>
            {detail?.history.length === 0 ? (
              <p className="sx-hint">Aucune version antérieure enregistrée.</p>
            ) : (
              <ul className="sx-history-list">
                {detail?.history.map((v) => (
                  <li key={v.id} className="sx-history-item">
                    <div>
                      <strong>Version {v.number}</strong> ({v.source})
                      <div className="sx-hint">
                        {v.publishAt ? `Mise en ligne ${formatRelative(v.publishAt)}` : `Créée ${formatRelative(v.createdAt)}`}
                        {v.author && ` par ${v.author}`}
                      </div>
                      {v.note && <div className="sx-history-note">« {v.note} »</div>}
                    </div>
                    {detail.live?.number !== v.number && (
                      <button
                        type="button"
                        className="sx-btn sx-btn-secondary narrow"
                        onClick={() => handleRollback(v.number)}
                      >
                        <RotateCcw size={14} /> Restaurer
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Corps de l'éditeur */}
        {loading ? (
          <div className="sx-modal-loading">Chargement des données...</div>
        ) : (
          <div className="sx-item-modal-body">
            {/* Colonne gauche : Formulaire SchemaForm */}
            <div className="sx-item-form-panel">
              <SchemaForm
                fields={fields}
                value={content}
                onChange={(next) => setContent(next)}
              />
            </div>

            {/* Colonne droite : Prévisualisation interactive fidèle */}
            <div className="sx-item-preview-panel">
              <div className="sx-preview-header">
                <Sparkles size={16} /> Aperçu interactif (tel que l&apos;enfant le verra)
              </div>

              {(kind === "riddle" || kind === "daily_challenge") && (
                <div className="sx-quiz-preview-card">
                  <div className="sx-quiz-preview-badge">
                    {kind === "riddle" ? `Énigme • Leçon ${content.lessonId || "p1-1"}` : `Défi du jour • ${content.theme || "Général"}`}
                  </div>
                  <h3 className="sx-quiz-preview-question">
                    {String(content.question || "Votre question s'affichera ici...")}
                  </h3>
                  <div className="sx-quiz-preview-options">
                    {Array.isArray(content.options) &&
                      content.options.map((opt, idx) => {
                        const isCorrect = Number(content.correctIndex) === idx;
                        const isSelected = previewAnswer === idx;
                        let btnClass = "sx-quiz-preview-btn";
                        if (isSelected) {
                          btnClass += isCorrect ? " correct" : " wrong";
                        }
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={btnClass}
                            onClick={() => setPreviewAnswer(idx)}
                          >
                            <span className="sx-opt-index">{String.fromCharCode(65 + idx)}</span>
                            <span>{String(opt)}</span>
                            {isSelected && isCorrect && <CheckCircle2 size={16} />}
                            {isSelected && !isCorrect && <X size={16} />}
                          </button>
                        );
                      })}
                  </div>

                  {previewAnswer !== null && (
                    <div className="sx-quiz-preview-feedback">
                      {previewAnswer === Number(content.correctIndex) ? (
                        <div className="sx-feedback-success">
                          <strong>Bravo !</strong> {String(content.explanation || "")}
                        </div>
                      ) : (
                        <div className="sx-feedback-error">
                          <strong>Essaie encore !</strong> L&apos;explication s&apos;affichera une fois la bonne réponse trouvée.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {kind === "mission" && (
                <div className="sx-mission-preview-card">
                  <div className="sx-mission-preview-badge">
                    <BookOpen size={14} /> Devoir {String(content.category || "Général")} • {String(content.difficulty || "Facile")}
                  </div>
                  <h3>{String(content.title || "Titre du devoir")}</h3>
                  <p className="sx-mission-desc">{String(content.description || "Description des consignes.")}</p>
                  <div className="sx-mission-meta-row">
                    <span>⏱ {Number(content.durationMinutes || 10)} minutes</span>
                    <span>⭐ +{Number(content.xp || 20)} XP</span>
                    <span>🎯 Parcours {String(content.track || "7-9 ans")}</span>
                  </div>
                </div>
              )}

              {kind === "activity" && (
                <div className="sx-activity-preview-card">
                  <div className="sx-activity-icon">
                    <Award size={36} color="var(--ec-sun-600)" />
                  </div>
                  <h3>{String(content.title || "Titre de l'activité")}</h3>
                  <div className="sx-activity-type">Type : {String(content.kind || "arcade_game")}</div>
                  <div className="sx-activity-xp">+{Number(content.xp || 25)} XP attribuée</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pied de page et actions */}
        <div className="sx-item-modal-footer">
          <div className="sx-footer-left">
            {detail?.pending ? (
              <button
                type="button"
                className="sx-btn sx-btn-warning"
                disabled={publishing}
                onClick={handleCancelPending}
              >
                <X size={16} /> Annuler la publication en attente
              </button>
            ) : detail?.draft ? (
              <button
                type="button"
                className="sx-btn sx-btn-secondary"
                disabled={saving}
                onClick={handleDiscardDraft}
              >
                <Trash2 size={16} /> Écarter le brouillon
              </button>
            ) : null}
          </div>

          <div className="sx-footer-right">
            <label className="sx-check" style={{ marginRight: 12 }}>
              <input
                type="checkbox"
                checked={immediate}
                onChange={(e) => setImmediate(e.target.checked)}
              />
              <span>Mise en ligne immédiate (sans délai de 15 min)</span>
            </label>

            <button
              type="button"
              className="sx-btn sx-btn-secondary"
              disabled={saving || publishing}
              onClick={handleSaveDraft}
            >
              {saving ? "Enregistrement..." : "Enregistrer brouillon"}
            </button>

            <button
              type="button"
              className="sx-btn sx-btn-primary"
              disabled={publishing || errors.length > 0 || (warnings.length > 0 && !acknowledge)}
              onClick={handlePublish}
            >
              <Send size={16} />
              {publishing
                ? "Publication..."
                : immediate
                ? "Publier immédiatement"
                : "Publier (délai 15 min)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
