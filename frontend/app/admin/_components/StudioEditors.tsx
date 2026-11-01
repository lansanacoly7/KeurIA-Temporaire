"use client";

import { useEffect, useState } from "react";
import { BookOpen, HelpCircle, Lightbulb, Plus, Save, Trash2 } from "lucide-react";
import { getStudioLessonDetail, saveStudioLesson, saveStudioModule, type LessonPayload, type ModulePayload, type StudioModule, type StudioQuestion } from "@/app/_scolaire/lib/curriculumStudioApi";
import { EmptyState, ErrorMessage, Field, Modal, Skeleton } from "@/app/_scolaire/ui/ui";
import { LESSON_TYPES, MODULE_COLORS } from "./StudioShared";

/* ─── Modal d'édition/création d'un Monde / Module ──────────────────────── */
export function ModuleModal({
  trackKey,
  module,
  onClose,
  onSaved,
}: {
  trackKey: string;
  module?: StudioModule;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [form, setForm] = useState<ModulePayload>({
    id: module?.id,
    track_key: trackKey,
    title: module?.title || "",
    icon: module?.icon || "bot",
    description: module?.description || "",
    color: module?.color || "sun",
    order: module?.order || 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Le titre du module est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveStudioModule(form);
      onSaved(module ? `Le monde « ${form.title} » a été mis à jour.` : `Le monde « ${form.title} » a été créé avec succès.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  }

  return (
    <Modal
      title={module ? `Modifier le monde « ${module.title} »` : "Créer un nouveau monde d'apprentissage"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ec-btn" onClick={onClose}>Annuler</button>
          <button type="submit" form="module-form" className="ec-btn ec-btn--primary" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer le monde"}
          </button>
        </>
      }
    >
      <form id="module-form" onSubmit={handleSubmit} className="ec-form-grid" noValidate>
        <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "80px 1fr", gap: 12 }}>
          <Field label="Icône">
            <input 
              className="ec-input" 
              style={{ fontSize: 22, textAlign: "center" }} 
              value={form.icon} 
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} 
              maxLength={4}
            />
          </Field>
          <Field label="Titre du monde / module">
            <input 
              className="ec-input" 
              value={form.title} 
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} 
              placeholder="Ex : Les bases de l'IA" 
            />
          </Field>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Description pédagogique">
            <textarea 
              className="ec-input" 
              rows={3} 
              value={form.description} 
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
              placeholder="Explique ce que les enfants vont découvrir dans ce monde..."
            />
          </Field>
        </div>

        <Field label="Thème de couleur">
          <select className="ec-select" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}>
            {MODULE_COLORS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Ordre d'affichage">
          <input 
            className="ec-input" 
            type="number" 
            min={1} 
            value={form.order} 
            onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))} 
          />
        </Field>

        {error && <div style={{ gridColumn: "1 / -1" }}><ErrorMessage message={error} /></div>}
      </form>
    </Modal>
  );
}

/* ─── Modal d'édition/création d'une Leçon No-Code ───────────────────────── */
export function LessonEditorModal({
  moduleId,
  moduleTitle,
  lessonId,
  onClose,
  onSaved,
}: {
  moduleId: string;
  moduleTitle: string;
  lessonId?: string;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"general" | "pedagogie" | "quiz">("general");
  const [loading, setLoading] = useState(Boolean(lessonId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<LessonPayload>({
    id: lessonId,
    module_id: moduleId,
    title: "",
    type: "histoire",
    minutes: 5,
    xp: 20,
    stars: 3,
    order: 1,
    content: {
      mission: "",
      discover: "",
      example: "",
      challenge: "",
      skill: "",
      questions: [],
      vocabulary: [],
    },
  });

  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    getStudioLessonDetail(lessonId)
      .then(res => {
        if (cancelled) return;
        setForm({
          id: res.id,
          module_id: moduleId,
          title: res.title,
          type: res.type,
          minutes: res.minutes,
          xp: res.xp,
          stars: res.stars,
          order: res.order,
          content: {
            mission: res.content?.mission || "",
            discover: res.content?.discover || "",
            example: res.content?.example || "",
            challenge: res.content?.challenge || "",
            skill: res.content?.skill || "",
            questions: res.content?.questions || [],
            vocabulary: res.content?.vocabulary || [],
          },
        });
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Chargement impossible.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId, moduleId]);

  function addQuestion() {
    setForm(prev => ({
      ...prev,
      content: {
        ...prev.content,
        questions: [
          ...(prev.content?.questions || []),
          {
            question: "Nouvelle question ?",
            options: ["Option A", "Option B", "Option C"],
            correct: 0,
            explain: "Explication pédagogique pour aider l'enfant.",
          },
        ],
      },
    }));
  }

  function updateQuestion(index: number, patch: Partial<StudioQuestion>) {
    setForm(prev => {
      const qList = [...(prev.content?.questions || [])];
      qList[index] = { ...qList[index], ...patch };
      return { ...prev, content: { ...prev.content, questions: qList } };
    });
  }

  function removeQuestion(index: number) {
    setForm(prev => {
      const qList = (prev.content?.questions || []).filter((_, i) => i !== index);
      return { ...prev, content: { ...prev.content, questions: qList } };
    });
  }

  function addVocab() {
    setForm(prev => ({
      ...prev,
      content: {
        ...prev.content,
        vocabulary: [...(prev.content?.vocabulary || []), ["Nouveau mot", "Définition simple"]],
      },
    }));
  }

  function updateVocab(index: number, word: string, def: string) {
    setForm(prev => {
      const list = [...(prev.content?.vocabulary || [])];
      list[index] = [word, def];
      return { ...prev, content: { ...prev.content, vocabulary: list } };
    });
  }

  function removeVocab(index: number) {
    setForm(prev => {
      const list = (prev.content?.vocabulary || []).filter((_, i) => i !== index);
      return { ...prev, content: { ...prev.content, vocabulary: list } };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Le titre de la leçon est obligatoire.");
      setActiveTab("general");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveStudioLesson(form);
      onSaved(lessonId ? `La leçon « ${form.title} » a été modifiée.` : `La leçon « ${form.title} » a été créée.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement.");
      setSaving(false);
    }
  }

  return (
    <Modal
      title={lessonId ? `Édition Leçon · ${form.title || lessonId}` : `Nouvelle Leçon · ${moduleTitle}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ec-btn" onClick={onClose}>Annuler</button>
          <button type="submit" form="lesson-form" className="ec-btn ec-btn--primary" disabled={saving || loading}>
            <Save size={16} /> {saving ? "Enregistrement…" : "Enregistrer la leçon"}
          </button>
        </>
      }
    >
      {loading ? (
        <Skeleton height={240} />
      ) : (
        <form id="lesson-form" onSubmit={handleSave} noValidate>
          <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--ec-border)", paddingBottom: 12, marginBottom: 18 }}>
            <button
              type="button"
              className={`ec-btn ${activeTab === "general" ? "ec-btn--primary" : ""}`}
              onClick={() => setActiveTab("general")}
            >
              <Lightbulb size={16} /> Paramètres
            </button>
            <button
              type="button"
              className={`ec-btn ${activeTab === "pedagogie" ? "ec-btn--primary" : ""}`}
              onClick={() => setActiveTab("pedagogie")}
            >
              <BookOpen size={16} /> Pédagogie & Découverte
            </button>
            <button
              type="button"
              className={`ec-btn ${activeTab === "quiz" ? "ec-btn--primary" : ""}`}
              onClick={() => setActiveTab("quiz")}
            >
              <HelpCircle size={16} /> Quiz QCM ({form.content?.questions?.length || 0})
            </button>
          </div>

          {activeTab === "general" && (
            <div className="ec-form-grid">
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Titre de la leçon">
                  <input
                    className="ec-input"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ex : Découvrir comment l'IA apprend"
                  />
                </Field>
              </div>

              <Field label="Format pédagogique">
                <select className="ec-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {LESSON_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Durée estimée (minutes)">
                <input
                  className="ec-input"
                  type="number"
                  min={1}
                  max={120}
                  value={form.minutes}
                  onChange={e => setForm(f => ({ ...f, minutes: Number(e.target.value) }))}
                />
              </Field>

              <Field label="Points d'expérience (XP)">
                <input
                  className="ec-input"
                  type="number"
                  min={5}
                  max={500}
                  step={5}
                  value={form.xp}
                  onChange={e => setForm(f => ({ ...f, xp: Number(e.target.value) }))}
                />
              </Field>

              <Field label="Ordre dans le module">
                <input
                  className="ec-input"
                  type="number"
                  min={1}
                  value={form.order}
                  onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
                />
              </Field>
            </div>
          )}

          {activeTab === "pedagogie" && (
            <div className="ec-form-grid">
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Mission d'introduction" hint="Court énoncé pour plonger l'enfant dans l'aventure.">
                  <textarea
                    className="ec-input"
                    rows={2}
                    value={form.content?.mission || ""}
                    onChange={e => setForm(f => ({ ...f, content: { ...f.content, mission: e.target.value } }))}
                    placeholder="Ex : Un assistant vocal ne comprend pas ton accent. Aide-le à s'améliorer !"
                  />
                </Field>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Texte de découverte" hint="Explication claire, imagée et adaptée à l'âge.">
                  <textarea
                    className="ec-input"
                    rows={4}
                    value={form.content?.discover || ""}
                    onChange={e => setForm(f => ({ ...f, content: { ...f.content, discover: e.target.value } }))}
                    placeholder="Explique le concept pas à pas..."
                  />
                </Field>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Exemple concret du quotidien">
                  <input
                    className="ec-input"
                    value={form.content?.example || ""}
                    onChange={e => setForm(f => ({ ...f, content: { ...f.content, example: e.target.value } }))}
                    placeholder="Ex : La caméra d'un smartphone qui reconnaît les visages pour faire la mise au point."
                  />
                </Field>
              </div>

              <Field label="Compétence validée">
                <input
                  className="ec-input"
                  value={form.content?.skill || ""}
                  onChange={e => setForm(f => ({ ...f, content: { ...f.content, skill: e.target.value } }))}
                  placeholder="Ex : Je comprends la différence entre règle et apprentissage."
                />
              </Field>

              <Field label="Défi d'action">
                <input
                  className="ec-input"
                  value={form.content?.challenge || ""}
                  onChange={e => setForm(f => ({ ...f, content: { ...f.content, challenge: e.target.value } }))}
                  placeholder="Ex : Repère 3 objets connectés chez toi."
                />
              </Field>

              <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <b style={{ fontSize: 13 }}>Vocabulaire clé (terme & définition)</b>
                  <button type="button" className="ec-btn" onClick={addVocab} style={{ padding: "4px 10px", fontSize: 12 }}>
                    <Plus size={14} /> Ajouter un mot
                  </button>
                </div>
                {(form.content?.vocabulary || []).map(([word, def], idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8, marginBottom: 8 }}>
                    <input
                      className="ec-input"
                      value={word}
                      placeholder="Mot clé"
                      onChange={e => updateVocab(idx, e.target.value, def)}
                    />
                    <input
                      className="ec-input"
                      value={def}
                      placeholder="Définition simple"
                      onChange={e => updateVocab(idx, word, e.target.value)}
                    />
                    <button type="button" className="ec-btn ec-btn--caution" onClick={() => removeVocab(idx)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "quiz" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: "var(--ec-muted)" }}>
                  Créez des questions QCM pour valider la compréhension de l'enfant.
                </span>
                <button type="button" className="ec-btn ec-btn--primary" onClick={addQuestion} style={{ fontSize: 12 }}>
                  <Plus size={15} /> Ajouter une question
                </button>
              </div>

              {(form.content?.questions || []).length === 0 ? (
                <EmptyState
                  icon={HelpCircle}
                  title="Aucune question de quiz"
                  text="Cliquez sur « Ajouter une question » pour créer le premier défi de cette leçon."
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {(form.content?.questions || []).map((q, qIndex) => (
                    <div
                      key={qIndex}
                      style={{
                        padding: 16,
                        borderRadius: 14,
                        border: "1px solid var(--ec-border)",
                        background: "var(--ec-bg)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <b style={{ fontSize: 14, color: "var(--ec-brand)" }}>Question {qIndex + 1}</b>
                        <button
                          type="button"
                          className="ec-btn ec-btn--caution"
                          onClick={() => removeQuestion(qIndex)}
                          style={{ padding: "4px 8px", fontSize: 11 }}
                        >
                          <Trash2 size={14} /> Retirer
                        </button>
                      </div>

                      <Field label="Intitulé de la question">
                        <input
                          className="ec-input"
                          value={q.question}
                          onChange={e => updateQuestion(qIndex, { question: e.target.value })}
                        />
                      </Field>

                      <div style={{ marginTop: 10 }}>
                        <small style={{ fontWeight: 700, color: "var(--ec-muted)", textTransform: "uppercase", fontSize: 11 }}>
                          Options de réponse (cochez la bonne réponse)
                        </small>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                          {q.options.map((opt, optIndex) => (
                            <div key={optIndex} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <input
                                type="radio"
                                name={`correct-${qIndex}`}
                                checked={q.correct === optIndex}
                                onChange={() => updateQuestion(qIndex, { correct: optIndex })}
                                title="Définir comme réponse correcte"
                                style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--ec-brand)" }}
                              />
                              <input
                                className="ec-input"
                                value={opt}
                                onChange={e => {
                                  const nextOptions = [...q.options];
                                  nextOptions[optIndex] = e.target.value;
                                  updateQuestion(qIndex, { options: nextOptions });
                                }}
                                placeholder={`Option ${optIndex + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <Field label="Explication pédagogique affichée après la réponse">
                          <input
                            className="ec-input"
                            value={q.explain || ""}
                            onChange={e => updateQuestion(qIndex, { explain: e.target.value })}
                            placeholder="Pourquoi c'est la bonne réponse..."
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <div style={{ marginTop: 14 }}><ErrorMessage message={error} /></div>}
        </form>
      )}
    </Modal>
  );
}
