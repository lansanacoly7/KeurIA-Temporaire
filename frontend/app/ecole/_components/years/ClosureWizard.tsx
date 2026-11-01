"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { CircleCheck, Download, FlaskConical, Lock, TriangleAlert } from "lucide-react";
import {
  closeAcademicYear, countNewClasses, defaultDecision, getClosureCheck, getPromotionPlan, getYearArchive,
  summarizeDecisions, CLOSURE_UNDO_DAYS, type ClosureCheck, type PromotionClass,
} from "@/app/_scolaire/lib/anneeApi";
import { formatDate, fullName, plural } from "@/app/_scolaire/lib/format";
import { className } from "@/app/_scolaire/lib/levels";
import type { StudentDecision } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { useSchool } from "@/app/_scolaire/ui/SchoolContext";
import { ErrorMessage, Field, PageHeader, Skeleton } from "@/app/_scolaire/ui/ui";

const STEP_LABELS = ["Vérifications", "Bilan de l'année", "Passage des élèves", "Confirmation"];

type Decisions = Record<string, StudentDecision>;

// ─── Étape 1 ──────────────────────────────────────────────────────────────────

function ChecksStep({ check, demo, onDemo, acknowledged, onAcknowledge }: {
  check: ClosureCheck;
  demo: boolean;
  onDemo: () => void;
  acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
}) {
  if (check.pendingClosure) {
    return (
      <div className="ec-alert">
        <Lock size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          La clôture de {check.pendingClosure.fromYear} est encore annulable jusqu&apos;au {formatDate(check.pendingClosure.undoUntil)} :
          une nouvelle clôture n&apos;est pas possible avant la fin de ce délai.
        </div>
      </div>
    );
  }

  if (!check.endReached) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div className="ec-alert">
          <Lock size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            L&apos;année {check.year.label} se termine le <b>{formatDate(check.year.endDate)}</b>{" "}: la clôture sera possible à partir de cette date.
            Si la date est fausse, <Link href="/ecole/annees">corrigez le calendrier</Link>.
          </div>
        </div>
        {/* Proposé uniquement quand le serveur tourne en développement (DEBUG) : refusé en production. */}
        {check.demoAvailable && (
        <div className="ec-demo-note">
          <FlaskConical size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <b>Développement</b>{" "}: pour tester la clôture sans attendre la fin de l&apos;année, vous pouvez simuler cette date.
            Ce bouton n&apos;apparaît pas en production.
            <div style={{ marginTop: 10 }}>
              <button type="button" className="ec-btn" onClick={onDemo}>Simuler la fin de l&apos;année</button>
            </div>
          </div>
        </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p className="ec-check-ok">
        <CircleCheck size={18} aria-hidden="true" />
        {demo ? "Fin d'année simulée (mode développement)." : `L'année ${check.year.label} est terminée depuis le ${formatDate(check.year.endDate)}.`}
      </p>
      {check.warnings.length === 0 ? (
        <p className="ec-check-ok"><CircleCheck size={18} aria-hidden="true" /> Aucun point à vérifier : tout est en ordre.</p>
      ) : (
        <>
          <p style={{ margin: "4px 0 0" }}>Avant de continuer, vérifiez ces points :</p>
          {check.warnings.map(warning => (
            <div key={warning.key} className="ec-alert">
              <TriangleAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{warning.text}{" "}<Link href={warning.href}>Voir</Link></div>
            </div>
          ))}
          <label className="ec-check">
            <input type="checkbox" checked={acknowledged} onChange={e => onAcknowledge(e.target.checked)} />
            J&apos;ai pris connaissance de ces points et je souhaite continuer.
          </label>
        </>
      )}
    </div>
  );
}

// ─── Étape 2 ──────────────────────────────────────────────────────────────────

function ArchiveStep({ downloaded, onDownloaded }: { downloaded: string | null; onDownloaded: (filename: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const { filename, csv } = await getYearArchive();
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      onDownloaded(filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Téléchargement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ margin: 0 }}>
        Avant de clôturer, gardez une copie de l&apos;année : un fichier avec chaque élève, sa classe, sa progression et ses résultats aux devoirs.
        Il s&apos;ouvre dans Excel. Conservez-le en lieu sûr.
      </p>
      <div>
        <button type="button" className="ec-btn ec-btn--primary" onClick={download} disabled={busy}>
          <Download size={17} aria-hidden="true" /> {busy ? "Préparation…" : downloaded ? "Télécharger à nouveau" : "Télécharger le bilan de l'année"}
        </button>
      </div>
      {downloaded && <p className="ec-check-ok"><CircleCheck size={18} aria-hidden="true" /> Bilan téléchargé : {downloaded}</p>}
      {error && <ErrorMessage message={error} />}
    </div>
  );
}

// ─── Étape 3 ──────────────────────────────────────────────────────────────────

function decisionLabel(decision: StudentDecision, row: PromotionClass): string {
  if (decision === "passe") return `Passe en ${row.nextClassName}`;
  if (decision === "redouble") return `Redouble (${row.classroom.level})`;
  return row.nextClassName ? "Quitte l'école" : "Quitte l'école (fin de 3e)";
}

function PromotionStep({ plan, decisions, onChange }: {
  plan: PromotionClass[];
  decisions: Decisions;
  onChange: (updates: Decisions) => void;
}) {
  const counts = summarizeDecisions(plan, decisions);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ margin: 0 }}>
        Par défaut, chaque élève passe au niveau supérieur et les élèves de 3e quittent l&apos;école.
        Ouvrez une classe pour indiquer les redoublants ou les départs.
      </p>
      <div className="ec-decision-counts" role="status">
        <span><b>{counts.passe}</b>{" "}{counts.passe > 1 ? "passent" : "passe"}</span>
        <span><b>{counts.redouble}</b>{" "}{counts.redouble > 1 ? "redoublent" : "redouble"}</span>
        <span><b>{counts.sortant}</b>{" "}{counts.sortant > 1 ? "quittent" : "quitte"}{" "}l&apos;école</span>
      </div>
      {plan.map(row => {
        const options: StudentDecision[] = row.nextClassName ? ["passe", "redouble", "sortant"] : ["sortant", "redouble"];
        const changedHere = row.students.filter(s => decisions[s.id] && decisions[s.id] !== defaultDecision(row.classroom.level)).length;
        return (
          <details key={row.classroom.id} className="ec-promo">
            <summary>
              <b>{className(row.classroom)} → {row.nextClassName ?? "fin du cycle"}</b>
              <span>{plural(row.students.length, "élève")}{changedHere ? ` · ${plural(changedHere, "cas particulier", "cas particuliers")}` : ""}</span>
            </summary>
            {row.students.length === 0 ? (
              <p style={{ margin: "8px 0 0", color: "var(--ec-muted)" }}>Aucun élève dans cette classe.</p>
            ) : (
              <>
                <div className="ec-table-wrap">
                  <table className="ec-table">
                    <caption className="sr-only">Décisions de fin d&apos;année pour {className(row.classroom)}</caption>
                    <thead><tr><th scope="col">Élève</th><th scope="col">Matricule</th><th scope="col">Décision</th></tr></thead>
                    <tbody>
                      {row.students.map(student => {
                        const value = decisions[student.id] ?? defaultDecision(row.classroom.level);
                        return (
                          <tr key={student.id} data-changed={value !== defaultDecision(row.classroom.level)}>
                            <td>{fullName(student)}</td>
                            <td>{student.matricule}</td>
                            <td>
                              <select
                                className="ec-select"
                                aria-label={`Décision pour ${fullName(student)}`}
                                value={value}
                                onChange={e => onChange({ [student.id]: e.target.value as StudentDecision })}
                              >
                                {options.map(option => <option key={option} value={option}>{decisionLabel(option, row)}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {changedHere > 0 && (
                  <button
                    type="button"
                    className="ec-link-btn"
                    style={{ marginTop: 8 }}
                    onClick={() => onChange(Object.fromEntries(row.students.map(s => [s.id, defaultDecision(row.classroom.level)])))}
                  >
                    Revenir aux décisions par défaut pour {className(row.classroom)}
                  </button>
                )}
              </>
            )}
          </details>
        );
      })}
    </div>
  );
}

// ─── Étape 4 ──────────────────────────────────────────────────────────────────

function ConfirmStep({ check, plan, decisions, confirmation, onConfirmation }: {
  check: ClosureCheck;
  plan: PromotionClass[];
  decisions: Decisions;
  confirmation: string;
  onConfirmation: (value: string) => void;
}) {
  const counts = summarizeDecisions(plan, decisions);
  const newClasses = countNewClasses(plan, decisions);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <dl className="ec-dl">
        <dt>Année clôturée</dt><dd>{check.year.label}</dd>
        <dt>Nouvelle année</dt><dd>{check.nextYear}</dd>
        <dt>Classes archivées</dt><dd>{plan.length}</dd>
        <dt>Nouvelles classes</dt><dd>{newClasses}, sans enseignant (à attribuer ensuite)</dd>
        <dt>Élèves qui passent</dt><dd>{counts.passe}</dd>
        <dt>Redoublants</dt><dd>{counts.redouble}</dd>
        <dt>Quittent l&apos;école</dt><dd>{counts.sortant} (comptes désactivés)</dd>
      </dl>
      <div className="ec-info">
        <CircleCheck size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          Les matricules, identifiants et mots de passe des élèves ne changent pas. Les classes de {check.year.label} restent consultables
          dans les années précédentes. Vous pourrez annuler la clôture pendant {CLOSURE_UNDO_DAYS} jours.
        </div>
      </div>
      <Field label={`Pour confirmer, tapez « ${check.year.label} »`}>
        <input className="ec-input" value={confirmation} onChange={e => onConfirmation(e.target.value)} autoComplete="off" spellCheck={false} style={{ maxWidth: 220 }} />
      </Field>
    </div>
  );
}

// ─── Assistant ────────────────────────────────────────────────────────────────

export function ClosureWizard() {
  const router = useRouter();
  const { reload: reloadSchool } = useSchool();
  const [step, setStep] = useState(1);
  const [demo, setDemo] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [downloaded, setDownloaded] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Decisions>({});
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCheck = useCallback(() => getClosureCheck({ demoIgnoreDate: demo }), [demo]);
  const { data: check, error: checkError } = useApi(loadCheck);
  const { data: plan, error: planError } = useApi(getPromotionPlan);

  const header = <PageHeader title="Clôturer l'année" subtitle="Un assistant en quatre étapes, avec des vérifications à chaque étape." />;
  const loadError = checkError ?? planError;
  if (loadError) return <>{header}<ErrorMessage message={loadError} /></>;
  if (!check || !plan) return <>{header}<Skeleton height={320} /></>;

  const canContinue =
    step === 1 ? !check.pendingClosure && check.endReached && (check.warnings.length === 0 || acknowledged)
    : step === 2 ? downloaded !== null
    : true;
  const confirmed = confirmation.trim() === check.year.label;

  async function close() {
    if (!plan || !check) return;
    setBusy(true);
    setError(null);
    // Décision explicite pour chaque élève (valeur par défaut comprise).
    const all: Decisions = {};
    for (const row of plan) for (const s of row.students) all[s.id] = decisions[s.id] ?? defaultDecision(row.classroom.level);
    try {
      await closeAcademicYear({ decisions: all, confirmation, demoIgnoreDate: demo });
      reloadSchool();
      router.push("/ecole/annees?cloture=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clôture impossible.");
      setBusy(false);
    }
  }

  return (
    <>
      {header}
      <ol className="ec-steps" aria-label="Étapes de la clôture">
        {STEP_LABELS.map((label, index) => (
          <li key={label} aria-current={step === index + 1 ? "step" : undefined} data-done={step > index + 1}>{label}</li>
        ))}
      </ol>

      <section className="ec-card" aria-labelledby="etape-titre">
        <h2 id="etape-titre">{STEP_LABELS[step - 1]} — année {check.year.label}</h2>
        {step === 1 && <ChecksStep check={check} demo={demo} onDemo={() => setDemo(true)} acknowledged={acknowledged} onAcknowledge={setAcknowledged} />}
        {step === 2 && <ArchiveStep downloaded={downloaded} onDownloaded={setDownloaded} />}
        {step === 3 && <PromotionStep plan={plan} decisions={decisions} onChange={updates => setDecisions(d => ({ ...d, ...updates }))} />}
        {step === 4 && <ConfirmStep check={check} plan={plan} decisions={decisions} confirmation={confirmation} onConfirmation={setConfirmation} />}

        {error && <div style={{ marginTop: 16 }}><ErrorMessage message={error} /></div>}

        <div className="ec-wizard-footer">
          {step === 1
            ? <Link className="ec-btn" href="/ecole/annees">Annuler</Link>
            : <button type="button" className="ec-btn" onClick={() => { setStep(step - 1); setError(null); }}>Retour</button>}
          {step < 4 ? (
            <button type="button" className="ec-btn ec-btn--primary" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continuer</button>
          ) : (
            <button type="button" className="ec-btn ec-btn--danger" disabled={!confirmed || busy} onClick={close}>
              {busy ? "Clôture en cours…" : `Clôturer l'année ${check.year.label}`}
            </button>
          )}
        </div>
      </section>
    </>
  );
}
