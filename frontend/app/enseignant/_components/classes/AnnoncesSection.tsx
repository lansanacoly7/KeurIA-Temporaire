"use client";

/*
 * Annonces et sondages (T10) : publier un mot ou un sondage pour la classe,
 * voir les résultats (compteurs et qui n'a pas encore répondu), clore une
 * annonce. Le serveur refuse au-delà de trois annonces actives : l'écran le
 * prévient avant l'envoi et affiche son message tel quel s'il tranche.
 */

import { useCallback, useMemo, useState } from "react";
import { BarChart3, Plus, Trash2, X } from "lucide-react";
import {
  closeClassAnnouncement, createClassAnnouncement, getAnnouncementResults,
  listClassAnnouncements, type AnnouncementKind, type AnnouncementResults, type AnnouncementRow,
} from "@/app/_scolaire/lib/enseignantApi";
import {
  announcementState, endsAtLabel, fieldError, MAX_ACTIVE_ANNOUNCEMENTS,
  POLL_MAX_OPTIONS, POLL_MIN_OPTIONS, pollPercentages, validateAnnouncementDraft,
} from "@/app/_scolaire/lib/classeVivante";
import { formatDate, plural } from "@/app/_scolaire/lib/format";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Badge, ErrorMessage, Field, Modal, Notice, Skeleton, type BadgeTone } from "@/app/_scolaire/ui/ui";

/** Durées d'affichage proposées (1 à 30 jours côté serveur). */
const DAY_CHOICES = [1, 3, 7, 14, 30];

const STATE_TONES: Record<"active" | "clos" | "expirée", BadgeTone> = { active: "ok", clos: "neutral", expirée: "warn" };

export function AnnoncesSection({ classId }: { classId: string }) {
  const load = useCallback(() => listClassAnnouncements(classId), [classId]);
  const { data, error, reload } = useApi(load);
  const announcements = data?.announcements ?? [];
  const maxActive = data?.maxActive ?? MAX_ACTIVE_ANNOUNCEMENTS;
  const activeCount = announcements.filter(announcement => announcement.active).length;

  const [kind, setKind] = useState<AnnouncementKind>("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [endsInDays, setEndsInDays] = useState(7);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const [resultsFor, setResultsFor] = useState<AnnouncementRow | null>(null);
  const [results, setResults] = useState<AnnouncementResults | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [closeTarget, setCloseTarget] = useState<AnnouncementRow | null>(null);
  // Instant d'ouverture de la section : base du calcul « se termine le ... » (impur en plein rendu).
  const [openedAt] = useState(() => Date.now());

  const errors = useMemo(
    () => validateAnnouncementDraft({ kind, title, text, options, endsInDays, activeCount }),
    [kind, title, text, options, endsInDays, activeCount],
  );

  const setOption = (index: number, value: string) => setOptions(previous => previous.map((option, i) => (i === index ? value : option)));

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (errors.length > 0) return;
    setBusy(true);
    setFormError(null);
    setSaved(false);
    try {
      await createClassAnnouncement(classId, {
        kind,
        title: title.trim(),
        text: text.trim(),
        ...(kind === "poll" ? { options: options.map(option => option.trim()) } : {}),
        endsInDays,
      });
      setTitle("");
      setText("");
      setOptions(["", ""]);
      setSubmitted(false);
      setSaved(true);
      reload();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  async function showResults(row: AnnouncementRow) {
    setResultsFor(row);
    setResults(null);
    setResultsError(null);
    setResultsLoading(true);
    try {
      setResults(await getAnnouncementResults(row.id));
    } catch (caught) {
      setResultsError(caught instanceof Error ? caught.message : "Erreur inattendue.");
    } finally {
      setResultsLoading(false);
    }
  }

  async function confirmClose() {
    if (!closeTarget) return;
    setBusy(true);
    setFormError(null);
    try {
      await closeClassAnnouncement(closeTarget.id);
      setCloseTarget(null);
      reload();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Erreur inattendue.");
      setCloseTarget(null);
    } finally {
      setBusy(false);
    }
  }

  const endDate = endsAtLabel(new Date(openedAt + endsInDays * 86_400_000).toISOString());

  return (
    <section className="ec-card" aria-labelledby="annonces-titre" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <h2 id="annonces-titre" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Annonces et sondages</h2>
        <Badge tone={activeCount >= maxActive ? "warn" : "neutral"}>{activeCount} active{activeCount > 1 ? "s" : ""} / {maxActive}</Badge>
      </div>

      {error && <ErrorMessage message={error} onRetry={reload} />}

      <form onSubmit={publish} noValidate style={{ borderTop: "1px solid var(--ec-border, #e5e7eb)", paddingTop: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {(["text", "poll"] as const).map(choice => (
            <button
              key={choice}
              type="button"
              className={`ec-btn ${kind === choice ? "ec-btn--primary" : ""}`}
              onClick={() => { setKind(choice); setSubmitted(false); }}
            >
              {choice === "text" ? "Un mot" : "Un sondage"}
            </button>
          ))}
        </div>

        <div className="ec-detail-grid" style={{ marginBottom: 12 }}>
          <Field label="Titre (facultatif)" error={submitted ? fieldError(errors, "title") : undefined}>
            <input className="ec-input" value={title} maxLength={80} onChange={event => setTitle(event.target.value)} placeholder="Voyage scolaire" />
          </Field>
          <Field
            label={kind === "poll" ? "La question" : "Le mot"}
            error={submitted ? fieldError(errors, "text") : undefined}
            hint={kind === "poll" ? "Ex. : « On se retrouve vendredi pour la lecture ? »" : "Un mot d'encouragement, une information…"}
          >
            <input
              className="ec-input"
              value={text}
              maxLength={300}
              onChange={event => setText(event.target.value)}
              placeholder={kind === "poll" ? "On se retrouve vendredi pour la lecture ?" : "Bravo à toute la classe !"}
            />
          </Field>
        </div>

        {kind === "poll" && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Réponses ({POLL_MIN_OPTIONS} à {POLL_MAX_OPTIONS})
            </span>
            {options.map((option, index) => (
              <div key={index} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <input
                  className="ec-input"
                  value={option}
                  maxLength={60}
                  placeholder={`Réponse ${index + 1}`}
                  onChange={event => setOption(index, event.target.value)}
                />
                <button
                  type="button"
                  className="ec-btn ec-btn--ghost"
                  aria-label={`Retirer la réponse ${index + 1}`}
                  disabled={options.length <= POLL_MIN_OPTIONS}
                  onClick={() => setOptions(previous => previous.filter((_, i) => i !== index))}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
            {submitted && fieldError(errors, "options") && <small data-error="true">{fieldError(errors, "options")}</small>}
            <button
              type="button"
              className="ec-btn"
              style={{ marginTop: 6 }}
              disabled={options.length >= POLL_MAX_OPTIONS}
              onClick={() => setOptions(previous => [...previous, ""])}
            >
              <Plus size={15} aria-hidden="true" /> Ajouter une réponse
            </button>
          </div>
        )}

        <div className="ec-detail-grid" style={{ marginBottom: 12 }}>
          <Field
            label="Affichage"
            hint={`Se termine le ${endDate}`}
            error={submitted ? fieldError(errors, "days") : undefined}
          >
            <select className="ec-select" value={endsInDays} onChange={event => setEndsInDays(Number(event.target.value))}>
              {DAY_CHOICES.map(days => (
                <option key={days} value={days}>{days} jour{days > 1 ? "s" : ""}</option>
              ))}
            </select>
          </Field>
        </div>

        {activeCount >= maxActive && (
          <div className="ec-alert" style={{ marginBottom: 12 }}>
            Au plus {maxActive} annonces actives par classe : fermez-en une d&apos;abord pour en publier une nouvelle.
          </div>
        )}
        {formError && <ErrorMessage message={formError} />}
        <button type="submit" className="ec-btn ec-btn--primary" disabled={busy}>
          Publier {kind === "poll" ? "le sondage" : "l'annonce"}
        </button>
        {saved && <Notice>Annonce publiée : les élèves la voient sur leur écran « Aujourd&apos;hui ».</Notice>}
      </form>

      <div style={{ marginTop: 18 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 800 }}>Dernières annonces ({announcements.length})</h3>
        {!data && !error && <Skeleton height={120} />}
        {announcements.length === 0 && data && (
          <p style={{ margin: 0, fontSize: 13, color: "var(--ec-muted)" }}>Aucune annonce pour l&apos;instant.</p>
        )}
        {announcements.map(row => {
          const state = announcementState(row);
          return (
            <div key={row.id} style={{ borderTop: "1px solid var(--ec-border, #e5e7eb)", padding: "12px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Badge tone={row.kind === "poll" ? "info" : "neutral"}>{row.kind === "poll" ? "Sondage" : "Mot"}</Badge>
                  <b style={{ fontSize: 14, minWidth: 0 }}>{row.title || row.text}</b>
                </div>
                <Badge tone={STATE_TONES[state]}>{state}</Badge>
              </div>
              {row.title && <p style={{ margin: "6px 0 0", fontSize: 13 }}>{row.text}</p>}
              {row.kind === "poll" && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--ec-muted)" }}>
                  {row.options.map(option => <li key={option}>{option}</li>)}
                </ul>
              )}
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ec-muted)" }}>
                Publiée le {formatDate(row.createdAt)} · affichée jusqu&apos;au {endsAtLabel(row.endsAt)}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {row.kind === "poll" && (
                  <button type="button" className="ec-btn" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => showResults(row)}>
                    <BarChart3 size={15} aria-hidden="true" /> Résultats
                  </button>
                )}
                {row.active && (
                  <button type="button" className="ec-btn" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setCloseTarget(row)}>
                    <X size={15} aria-hidden="true" /> Clore
                  </button>
                )}
              </div>

              {resultsFor?.id === row.id && (
                <div style={{ marginTop: 10, background: "#f8fafc", borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <b style={{ fontSize: 14 }}>
                      Résultats ({plural(results?.answered.length ?? 0, "réponse")})
                    </b>
                    <button type="button" className="ec-btn ec-btn--ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setResultsFor(null)}>
                      Fermer
                    </button>
                  </div>
                  {resultsLoading && <Skeleton height={60} />}
                  {resultsError && <ErrorMessage message={resultsError} />}
                  {results && (
                    <>
                      {results.announcement.options.map((option, index) => {
                        const percent = pollPercentages(results.counts)[index] ?? 0;
                        const names = results.answered.filter(answer => answer.choice === index).map(answer => answer.name);
                        return (
                          <div key={option} style={{ marginTop: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 10 }}>
                              <span><b>{option}</b></span>
                              <span style={{ color: "var(--ec-muted)", whiteSpace: "nowrap" }}>
                                {plural(results.counts[index], "vote")} · {percent} %
                              </span>
                            </div>
                            <div className="ec-track-bar-bg" style={{ marginTop: 4 }}>
                              <div className="ec-track-bar-fill" style={{ width: `${percent}%`, background: "var(--ec-brand, #16a34a)" }} />
                            </div>
                            {names.length > 0 && (
                              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ec-muted)" }}>{names.join(", ")}</p>
                            )}
                          </div>
                        );
                      })}
                      <p style={{ margin: "12px 0 0", fontSize: 12 }}>
                        <b>{plural(results.answered.length, "élève a répondu", "élèves ont répondu")}</b>
                        {results.notAnswered.length > 0 && (
                          <> · pas encore : {results.notAnswered.map(student => student.name).join(", ")}</>
                        )}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {closeTarget && (
        <Modal
          title="Clore l'annonce ?"
          onClose={() => setCloseTarget(null)}
          footer={
            <>
              <button type="button" className="ec-btn" onClick={() => setCloseTarget(null)}>Annuler</button>
              <button type="button" className="ec-btn ec-btn--danger" onClick={confirmClose} disabled={busy}>Clore l&apos;annonce</button>
            </>
          }
        >
          <p>
            « {closeTarget.title || closeTarget.text} » disparaît tout de suite des écrans des élèves. Elle restera
            dans la liste, marquée « clos ».
          </p>
        </Modal>
      )}
    </section>
  );
}
