"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Download, FileUp, Info, Lightbulb, Printer, Trash2 } from "lucide-react";
import {
  createStudents, createTeachers, getSchool, listClassrooms, previewStudentImport, previewTeacherImport,
  readExcelFile, type PreviewRow,
} from "@/app/_scolaire/lib/ecoleApi";
import { fullName, plural } from "@/app/_scolaire/lib/format";
import {
  ACCEPTED_EXTENSIONS, ImportFormatError, MAX_FILE_BYTES, parseCsv, STUDENT_COLUMNS, tableToRecords,
  TEACHER_COLUMNS, templateCsv, type ImportKind, type RawRecord, type StudentField, type TeacherField,
} from "@/app/_scolaire/lib/importing";
import { className } from "@/app/_scolaire/lib/levels";
import type { StudentInput, TeacherInput } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { CredentialSheet, type SheetItem } from "@/app/_scolaire/ui/CredentialSheet";
import { ConfirmModal, ErrorMessage, Field, Notice, PageHeader } from "@/app/_scolaire/ui/ui";

type Step = 1 | 2 | 3 | 4;
type AnyField = StudentField | TeacherField;
type AnyRecord = RawRecord<AnyField>;
type AnyPreview = PreviewRow<AnyField, StudentInput | TeacherInput>;

const STEP_LABELS = ["Choisir", "Déposer le fichier", "Vérifier", "Terminé"];
const PREVIEW_DELAY_MS = 250;

function columnsFor(kind: ImportKind) {
  return (kind === "eleves" ? STUDENT_COLUMNS : TEACHER_COLUMNS) as { field: AnyField; header: string }[];
}

function downloadTemplate(kind: ImportKind) {
  const blob = new Blob([templateCsv(kind)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = kind === "eleves" ? "modele-import-eleves.csv" : "modele-import-enseignants.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export function ImportWizard({ initialKind, embedded = false }: { initialKind: ImportKind; embedded?: boolean }) {
  const [step, setStep] = useState<Step>(1);
  const [kind, setKind] = useState<ImportKind>(initialKind);
  const [defaultClassId, setDefaultClassId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [records, setRecords] = useState<AnyRecord[]>([]);
  const [preview, setPreview] = useState<AnyPreview[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sheet, setSheet] = useState<SheetItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: classrooms } = useApi(listClassrooms);
  const { data: school } = useApi(getSchool);

  // Chaque modification (fichier, cellule corrigée, classe par défaut) relance la vérification.
  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const rows = kind === "eleves"
          ? await previewStudentImport(records as RawRecord<StudentField>[], defaultClassId)
          : await previewTeacherImport(records as RawRecord<TeacherField>[]);
        if (!cancelled) { setPreview(rows as AnyPreview[]); setSubmitError(null); }
      } catch (error) {
        if (!cancelled) setSubmitError(error instanceof Error ? error.message : "Vérification impossible.");
      }
    }, PREVIEW_DELAY_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [step, kind, records, defaultClassId]);

  async function readFile(file: File) {
    setFileError(null);
    const extension = extensionOf(file.name);
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setFileError(`Format non pris en charge (${extension || "sans extension"}). Formats acceptés : Excel (.xlsx), CSV (.csv) ou PDF (.pdf).`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("Fichier trop volumineux (5 Mo maximum).");
      return;
    }
    try {
      // CSV lu dans le navigateur ; Excel (.xlsx) et PDF (.pdf) lus par le serveur (même tableau ensuite).
      const table = extension === ".csv" ? parseCsv(await file.text()) : await readExcelFile(file);
      const parsed = (kind === "eleves" ? tableToRecords(table, STUDENT_COLUMNS) : tableToRecords(table, TEACHER_COLUMNS)) as AnyRecord[];
      if (parsed.length === 0) throw new ImportFormatError("Le fichier ne contient aucune ligne de données.");
      setFileName(file.name);
      setRecords(parsed);
      setPreview(null);
      setStep(3);
    } catch (error) {
      setFileError(error instanceof Error && error.message ? error.message : "Impossible de lire ce fichier.");
    }
  }

  function updateCell(line: number, field: AnyField, value: string) {
    setRecords(rows => rows.map(r => (r.line === line ? { ...r, values: { ...r.values, [field]: value } } : r)));
  }

  function removeRow(line: number) {
    setRecords(rows => rows.filter(r => r.line !== line));
  }

  function autoFillMatricules() {
    const slug = (school?.slug ?? "KEUR").toUpperCase().slice(0, 4);
    const year = school?.academicYear ? school.academicYear.slice(0, 4) : new Date().getFullYear();
    setRecords(rows =>
      rows.map((r, idx) => {
        if (r.values.matricule && r.values.matricule.trim() !== "") return r;
        const autoNum = String(idx + 1).padStart(3, "0");
        return {
          ...r,
          values: { ...r.values, matricule: `${slug}-${year}-${autoNum}` },
        };
      })
    );
  }

  async function confirmImport() {
    if (!preview) return;
    setConfirmingImport(false);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const inputs = preview.map(row => row.input!);
      const classLabel = (id: string | null) => {
        const row = classrooms?.find(r => r.classroom.id === id);
        return row ? className(row.classroom) : "Sans classe";
      };
      const items: SheetItem[] = kind === "eleves"
        ? (await createStudents(inputs as StudentInput[])).map(({ student, credentials }) => ({
          key: student.id, name: fullName(student), subtitle: `${classLabel(student.classId)} · ${student.matricule}`, credentials,
        }))
        : (await createTeachers(inputs as TeacherInput[])).map(({ teacher, credentials }) => ({
          key: teacher.id, name: fullName(teacher), subtitle: "Enseignant·e", credentials,
        }));
      setSheet(items);
      setStep(4);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "L'import a échoué.");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setStep(1);
    setRecords([]);
    setPreview(null);
    setFileName(null);
    setSheet([]);
    setSubmitError(null);
  }

  const columns = columnsFor(kind);
  const errorCount = preview?.filter(row => !row.input).length ?? 0;
  const readyCount = (preview?.length ?? 0) - errorCount;
  const label = kind === "eleves" ? "élève" : "enseignant";

  return (
    <>
      {!embedded && (
        <PageHeader title="Importer une liste" subtitle="Inscrivez en une fois tous les élèves d'une classe ou tous les enseignants." />
      )}

      <ol className="ec-steps" aria-label="Étapes de l'import">
        {STEP_LABELS.map((stepLabel, index) => (
          <li key={stepLabel} aria-current={step === index + 1 ? "step" : undefined} data-done={step > index + 1}>{stepLabel}</li>
        ))}
      </ol>

      {step === 1 && (
        <section className="ec-card" style={{ display: "grid", gap: 20 }}>
          <fieldset className="ec-field ec-fieldset">
            <legend>Que voulez-vous importer ?</legend>
            <div className="ec-choice-grid">
              {([["eleves", "Des élèves", "Matricule, prénom, nom, sexe, date de naissance, classe."], ["enseignants", "Des enseignants", "Prénom, nom, e-mail, téléphone, classes confiées."]] as const).map(([value, title, text]) => (
                <label key={value} className="ec-choice">
                  <input type="radio" name="kind" checked={kind === value} onChange={() => setKind(value)} />
                  <span><b>{title}</b><small>{text}</small></span>
                </label>
              ))}
            </div>
          </fieldset>

          {kind === "eleves" && (
            <Field label="Classe de destination" hint="Utilisée pour les lignes dont la colonne « Classe » est vide.">
              <select className="ec-select" value={defaultClassId ?? ""} onChange={e => setDefaultClassId(e.target.value || null)}>
                <option value="">Aucune (utiliser la colonne « Classe » du fichier)</option>
                {(classrooms ?? []).map(({ classroom }) => <option key={classroom.id} value={classroom.id}>{className(classroom)}</option>)}
              </select>
            </Field>
          )}

          <div className="ec-info">
            <Info size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              Le plus sûr est de partir du <b>modèle</b>{" "}: il s&apos;ouvre dans Excel, et il suffit de le remplir puis de l&apos;enregistrer.
              Les colonnes sont reconnues même si leur ordre ou leurs accents diffèrent.
            </div>
          </div>

          <div className="ec-wizard-footer">
            <button type="button" className="ec-btn" onClick={() => downloadTemplate(kind)}>
              <Download size={17} aria-hidden="true" /> Télécharger le modèle
            </button>
            <button type="button" className="ec-btn ec-btn--primary" onClick={() => setStep(2)}>Continuer</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="ec-card" style={{ display: "grid", gap: 18 }}>
          {/* Guide visuel des colonnes attendues */}
          <div style={{ background: "var(--ec-bg)", border: "1px solid var(--ec-border)", borderRadius: 12, padding: "16px 20px" }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
              <Info size={16} color="var(--ec-brand)" />
              Format attendu des colonnes dans votre fichier
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ec-muted)" }}>
              Votre fichier ({kind === "eleves" ? "élèves" : "enseignants"}) doit comporter les colonnes suivantes (en-têtes souples, ordre libre) :
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--ec-border)", color: "var(--ec-muted)" }}>
                    <th style={{ padding: "6px 8px" }}>Colonne</th>
                    <th style={{ padding: "6px 8px" }}>Obligatoire ?</th>
                    <th style={{ padding: "6px 8px" }}>Format attendu</th>
                    <th style={{ padding: "6px 8px" }}>Exemple</th>
                  </tr>
                </thead>
                <tbody>
                  {kind === "eleves" ? (
                    <>
                      <tr style={{ borderBottom: "1px solid var(--ec-border)" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 800 }}>Matricule</td>
                        <td style={{ padding: "6px 8px", color: "var(--ec-muted)" }}>Optionnel (auto-généré si vide)</td>
                        <td style={{ padding: "6px 8px" }}>Identifiant unique</td>
                        <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>LB-2026-001</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--ec-border)" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 800 }}>Prénom</td>
                        <td style={{ padding: "6px 8px", color: "#0d846e", fontWeight: 700 }}>Oui</td>
                        <td style={{ padding: "6px 8px" }}>Texte</td>
                        <td style={{ padding: "6px 8px" }}>Awa</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--ec-border)" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 800 }}>Nom</td>
                        <td style={{ padding: "6px 8px", color: "#0d846e", fontWeight: 700 }}>Oui</td>
                        <td style={{ padding: "6px 8px" }}>Texte</td>
                        <td style={{ padding: "6px 8px" }}>Diop</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--ec-border)" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 800 }}>Sexe</td>
                        <td style={{ padding: "6px 8px", color: "#0d846e", fontWeight: 700 }}>Oui</td>
                        <td style={{ padding: "6px 8px" }}>F ou M</td>
                        <td style={{ padding: "6px 8px" }}>F</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--ec-border)" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 800 }}>Date de naissance</td>
                        <td style={{ padding: "6px 8px", color: "#0d846e", fontWeight: 700 }}>Oui</td>
                        <td style={{ padding: "6px 8px" }}>JJ/MM/AAAA ou AAAA-MM-JJ</td>
                        <td style={{ padding: "6px 8px" }}>14/03/2016</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 8px", fontWeight: 800 }}>Classe</td>
                        <td style={{ padding: "6px 8px", color: "var(--ec-muted)" }}>Optionnel (classe par défaut)</td>
                        <td style={{ padding: "6px 8px" }}>Nom de la classe</td>
                        <td style={{ padding: "6px 8px" }}>CM1 A</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr style={{ borderBottom: "1px solid var(--ec-border)" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 800 }}>Prénom</td>
                        <td style={{ padding: "6px 8px", color: "#0d846e", fontWeight: 700 }}>Oui</td>
                        <td style={{ padding: "6px 8px" }}>Texte</td>
                        <td style={{ padding: "6px 8px" }}>Fatou</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--ec-border)" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 800 }}>Nom</td>
                        <td style={{ padding: "6px 8px", color: "#0d846e", fontWeight: 700 }}>Oui</td>
                        <td style={{ padding: "6px 8px" }}>Texte</td>
                        <td style={{ padding: "6px 8px" }}>Ndiaye</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--ec-border)" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 800 }}>E-mail</td>
                        <td style={{ padding: "6px 8px", color: "#0d846e", fontWeight: 700 }}>Oui</td>
                        <td style={{ padding: "6px 8px" }}>Adresse e-mail valide</td>
                        <td style={{ padding: "6px 8px" }}>f.ndiaye@ecole.sn</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--ec-border)" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 800 }}>Téléphone</td>
                        <td style={{ padding: "6px 8px", color: "var(--ec-muted)" }}>Optionnel</td>
                        <td style={{ padding: "6px 8px" }}>Numéro</td>
                        <td style={{ padding: "6px 8px" }}>77 123 45 67</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 8px", fontWeight: 800 }}>Classes</td>
                        <td style={{ padding: "6px 8px", color: "var(--ec-muted)" }}>Optionnel</td>
                        <td style={{ padding: "6px 8px" }}>Séparées par virgule</td>
                        <td style={{ padding: "6px 8px" }}>CM1 A, CM2 B</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ec-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <Lightbulb size={14} style={{ flexShrink: 0 }} /> <span><b>Données manquantes ?</b> Pas d&apos;inquiétude : si certains champs manquent dans votre fichier, vous pourrez les compléter ou les corriger directement dans le tableau à l&apos;étape suivante.</span>
            </p>
          </div>

          <div
            className="ec-dropzone"
            data-dragging={dragging}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) void readFile(file);
            }}
          >
            <FileUp size={32} aria-hidden="true" />
            <b>Déposez le fichier ici ou cliquez pour le choisir</b>
            <span>Excel (.xlsx), CSV (.csv) ou PDF (.pdf) · 5 Mo maximum</span>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              hidden
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) void readFile(file);
                e.target.value = "";
              }}
            />
          </div>
          {fileError && <ErrorMessage message={fileError} />}
          <p style={{ margin: 0, color: "var(--ec-muted)", fontSize: 13 }}>
            Formats pris en charge : <b>Excel (.xlsx)</b>, <b>CSV (.csv)</b> ou <b>PDF (.pdf contenant du texte sélectionnable)</b>.
          </p>
          <div className="ec-wizard-footer">
            <button type="button" className="ec-btn" onClick={() => setStep(1)}>Retour</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section style={{ display: "grid", gap: 16 }}>
          <div className="ec-toolbar" style={{ marginBottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <b>{fileName}</b>
              {preview && (
                <span className="ec-count">
                  {plural(readyCount, "ligne prête", "lignes prêtes")}
                  {errorCount > 0 && <> · <span style={{ color: "var(--ec-danger)" }}>{plural(errorCount, "ligne à corriger", "lignes à corriger")}</span></>}
                </span>
              )}
            </div>
            {kind === "eleves" && (
              <button type="button" className="ec-btn" style={{ fontSize: 12, padding: "0 10px", minHeight: 32 }} onClick={autoFillMatricules}>
                Générer les matricules manquants
              </button>
            )}
          </div>

          <div className="ec-table-wrap">
            <table className="ec-table">
              <caption className="sr-only">Aperçu des lignes à importer</caption>
              <thead>
                <tr>
                  <th scope="col">Ligne</th>
                  {columns.map(c => <th key={c.field} scope="col">{c.header}</th>)}
                  <th scope="col"><span className="sr-only">Supprimer</span></th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => {
                  const row = preview?.find(p => p.line === record.line);
                  return (
                    <tr key={record.line}>
                      <td>{record.line}</td>
                      {columns.map(c => {
                        const error = row?.errors[c.field];
                        const warning = row?.warnings[c.field];
                        return (
                          <td key={c.field} data-invalid={Boolean(error)}>
                            <input
                              className="ec-input ec-cell-input"
                              value={record.values[c.field] ?? ""}
                              aria-label={`${c.header}, ligne ${record.line}`}
                              aria-invalid={Boolean(error)}
                              onChange={e => updateCell(record.line, c.field, e.target.value)}
                            />
                            {error && <small className="ec-cell-message" data-kind="error">{error}</small>}
                            {!error && warning && <small className="ec-cell-message" data-kind="warning">{warning}</small>}
                          </td>
                        );
                      })}
                      <td>
                        <button type="button" className="ec-icon-btn" onClick={() => removeRow(record.line)} aria-label={`Retirer la ligne ${record.line}`}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {submitError && <ErrorMessage message={submitError} />}
          <div className="ec-wizard-footer">
            <button type="button" className="ec-btn" onClick={() => setStep(2)}>Choisir un autre fichier</button>
            <button
              type="button"
              className="ec-btn ec-btn--primary"
              disabled={!preview || errorCount > 0 || readyCount === 0 || submitting}
              onClick={() => setConfirmingImport(true)}
              title={errorCount > 0 ? "Corrigez ou retirez les lignes en erreur" : undefined}
            >
              {submitting ? "Création des comptes…" : `Créer ${plural(readyCount, `compte ${label}`, `comptes ${label}s`)}`}
            </button>
          </div>
        </section>
      )}

      {confirmingImport && preview && (() => {
        // Répartition par classe (élèves) et lignes signalées, pour vérifier avant de créer.
        const byClass = new Map<string, number>();
        for (const row of preview) {
          const classId = (row.input as Partial<StudentInput> | null)?.classId ?? null;
          const name = classrooms?.find(r => r.classroom.id === classId)?.classroom;
          const key = name ? className(name) : "Sans classe";
          byClass.set(key, (byClass.get(key) ?? 0) + 1);
        }
        const flagged = preview.filter(row => Object.keys(row.warnings ?? {}).length > 0).length;
        return (
          <ConfirmModal
            title={`Créer ${plural(readyCount, `compte ${label}`, `comptes ${label}s`)} ?`}
            consequences={[
              <>{plural(readyCount, `compte ${label}`, `comptes ${label}s`)} {readyCount > 1 ? "sont créés" : "est créé"}, chacun avec un identifiant et un mot de passe provisoire.</>,
              ...(kind === "eleves" ? [<>Répartition : {[...byClass].map(([name, n]) => `${name} (${n})`).join(", ")}.</>] : []),
              "Les fiches de connexion s'afficheront une seule fois à l'étape suivante : imprimez-les ou enregistrez-les.",
              ...(flagged > 0 ? [<b key="avert">{plural(flagged, "ligne signalée", "lignes signalées")} (âge ou téléphone inhabituel) : vérifiez-les avant de continuer.</b>] : []),
            ]}
            reversibility="Les comptes créés pourront être désactivés un par un, mais pas supprimés."
            confirmLabel={`Créer ${plural(readyCount, "compte", "comptes")}`}
            busy={submitting}
            onConfirm={confirmImport}
            onClose={() => setConfirmingImport(false)}
          />
        );
      })()}

      {step === 4 && (
        <section style={{ display: "grid", gap: 16 }}>
          <Notice>{plural(sheet.length, `compte ${label} créé`, `comptes ${label}s créés`)}.</Notice>
          <div className="ec-alert">
            <div>Les mots de passe provisoires ne seront <b>plus jamais affichés</b>{" "}: imprimez les fiches maintenant.</div>
          </div>
          <div className="ec-wizard-footer" style={{ marginTop: 0 }}>
            <div className="ec-actions">
              <button type="button" className="ec-btn ec-btn--primary" onClick={() => window.print()}>
                <Printer size={17} aria-hidden="true" /> Imprimer les fiches
              </button>
              <Link className="ec-btn" href={kind === "eleves" ? "/ecole/eleves" : "/ecole/enseignants"}>
                Voir les {kind === "eleves" ? "élèves" : "enseignants"}
              </Link>
            </div>
            <button type="button" className="ec-btn" onClick={restart}>Nouvel import</button>
          </div>
          <CredentialSheet schoolName={school?.name ?? ""} items={sheet} />
        </section>
      )}
    </>
  );
}
