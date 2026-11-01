"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Calendar, CheckCircle2, Clock, MessageSquare, Sparkles, Target, Trophy, User, X, Play } from "lucide-react";

export type StudentAssignment = {
  id: number;
  mission: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    durationMinutes: number;
    xp: number;
  };
  teacherName: string;
  dueDate: string | null;
  instructions: string;
  createdAt: string;
  status: "a_faire" | "en_retard" | "termine";
  completion: {
    score: number;
    completedAt: string;
  } | null;
};

type AssignmentApiResponse = {
  isSchoolStudent: boolean;
  classroom: { id: number; level: string; section: string } | null;
  assignments: StudentAssignment[];
};

// Les questions, leur correction et la note vivent sur le serveur : le navigateur ne reçoit que les libellés, et la bonne
// réponse d'une question n'arrive qu'après la réponse de l'élève (voir backend/apps/scolaire/services/eleve.py).
type QuizStep = { question: string; options: string[] };
type AnswerInfo = { option: number; correct: boolean; correctOption: number; explanation: string };
type QuizState = { steps: QuizStep[]; answers: Record<string, AnswerInfo>; completed: boolean };

async function sendJson<T>(url: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Une erreur est survenue. Réessaie dans un instant.");
  return data as T;
}

export function StudentAssignmentsView({ onReward }: { onReward?: (xp: number) => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AssignmentApiResponse | null>(null);
  const [activeMission, setActiveMission] = useState<StudentAssignment | null>(null);

  // État du lecteur de mission
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [missionComplete, setMissionComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/assignments", { credentials: "include" });
      if (!res.ok) throw new Error("Impossible de charger les devoirs.");
      const json: AssignmentApiResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  async function startMission(assignment: StudentAssignment) {
    setActiveMission(assignment);
    setQuiz(null);
    setSubmitError(null);
    setMissionComplete(false);
    setCurrentStep(0);
    setQuizLoading(true);
    try {
      // Un devoir déjà rendu se refait pour s'entraîner (sa note officielle ne change plus) ; sinon on reprend où l'on s'était arrêté.
      const state = assignment.status === "termine"
        ? await sendJson<QuizState>(`/api/student/assignments/${assignment.id}/restart`)
        : await fetch(`/api/student/assignments/${assignment.id}/quiz`, { credentials: "include" }).then(async r => {
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.error || "Impossible de charger les questions.");
            return d as QuizState;
          });
      setQuiz(state);
      const firstOpen = state.steps.findIndex((_, i) => !state.answers[String(i)]);
      if (firstOpen === -1) {
        setCurrentStep(state.steps.length - 1);
        setMissionComplete(true);
      } else {
        setCurrentStep(firstOpen);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Impossible de charger les questions.");
    } finally {
      setQuizLoading(false);
    }
  }

  async function handleAnswer(index: number) {
    if (!activeMission || !quiz || quiz.answers[String(currentStep)]) return;
    setSubmitError(null);
    try {
      const info = await sendJson<AnswerInfo>(`/api/student/assignments/${activeMission.id}/answer`, { step: currentStep, option: index });
      setQuiz(q => (q ? { ...q, answers: { ...q.answers, [String(currentStep)]: info } } : q));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Réponse non enregistrée.");
    }
  }

  function nextStep() {
    if (!quiz) return;
    if (currentStep + 1 < quiz.steps.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      setMissionComplete(true);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  }

  async function submitMission() {
    if (!activeMission) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Aucun score n'est envoyé : le serveur calcule la note à partir des réponses qu'il a enregistrées.
      const result = await sendJson<{ xpGained: number }>(`/api/student/assignments/${activeMission.id}/complete`);
      if (onReward && result.xpGained) {
        onReward(result.xpGained);
      }
      // Recharger la liste locale
      await loadAssignments();
      setActiveMission(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erreur lors de l'envoi du devoir.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="dash-content" style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ color: "#065f46", fontSize: 18, fontWeight: 700 }}>Chargement de tes devoirs de classe…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-content" style={{ padding: "40px 20px" }}>
        <div style={{ background: "#fee2e2", border: "1px solid #f87171", borderRadius: 16, padding: 20, color: "#991b1b" }}>
          <p style={{ margin: 0, fontWeight: 700 }}>{error}</p>
          <button
            onClick={loadAssignments}
            style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data?.isSchoolStudent) {
    return (
      <div className="dash-content" style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 540, margin: "0 auto", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20, padding: 32 }}>
          <Target size={48} style={{ color: "#64748b", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 22, color: "#1e293b", margin: "0 0 10px" }}>Espace Devoirs Scolaires</h2>
          <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.5, margin: 0 }}>
            Cet onglet est réservé aux élèves inscrits dans une école partenaire de kEur IA. Continue ton aventure d&apos;apprentissage sur tes modules et jeux !
          </p>
        </div>
      </div>
    );
  }

  const { classroom, assignments } = data;
  const pendingCount = assignments.filter(a => a.status === "a_faire" || a.status === "en_retard").length;
  const completedCount = assignments.filter(a => a.status === "termine").length;

  return (
    <div className="dash-content" style={{ padding: "24px 20px 60px", maxWidth: 1050, margin: "0 auto" }}>
      {/* En-tête */}
      <div
        style={{
          background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
          borderRadius: 24,
          padding: "28px 32px",
          color: "#fff",
          marginBottom: 32,
          boxShadow: "0 10px 25px -5px rgba(6, 95, 70, 0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
            <Target size={15} /> Devoirs scolaires · Classe {classroom?.level} {classroom?.section}
          </div>
          <h1 style={{ fontSize: 28, margin: "0 0 8px", fontWeight: 900, letterSpacing: "-0.5px" }}>Mes Devoirs & Missions</h1>
          <p style={{ margin: 0, fontSize: 15, color: "#d1fae5" }}>
            Réalise les missions assignées par ton enseignant pour t&apos;entraîner et gagner des XP !
          </p>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px 20px", borderRadius: 16, textAlign: "center", minWidth: 100 }}>
            <span style={{ fontSize: 26, fontWeight: 900, display: "block" }}>{pendingCount}</span>
            <span style={{ fontSize: 12, color: "#a7f3d0", fontWeight: 700, textTransform: "uppercase" }}>À faire</span>
          </div>
          <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px 20px", borderRadius: 16, textAlign: "center", minWidth: 100 }}>
            <span style={{ fontSize: 26, fontWeight: 900, display: "block" }}>{completedCount}</span>
            <span style={{ fontSize: 12, color: "#a7f3d0", fontWeight: 700, textTransform: "uppercase" }}>Rendus</span>
          </div>
        </div>
      </div>

      {/* Liste des devoirs */}
      {assignments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 20, border: "2px dashed #cbd5e1" }}>
          <CheckCircle2 size={54} style={{ color: "#10b981", margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 20, color: "#1e293b", margin: "0 0 8px" }}>Aucun devoir en attente !</h3>
          <p style={{ color: "#64748b", margin: 0 }}>Ton enseignant n&apos;a pas encore donné de devoir pour le moment. Bravo pour ton travail ! <Sparkles size={20} color="#10b981" style={{ display: "inline", verticalAlign: "middle" }} /></p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: 20 }}>
          {assignments.map(a => {
            const isDone = a.status === "termine";
            const isLate = a.status === "en_retard";

            return (
              <div
                key={a.id}
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  border: isDone ? "2px solid #bbf7d0" : isLate ? "2px solid #fecaca" : "2px solid #e2e8f0",
                  padding: 22,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <div>
                  {/* Badge statut & catégorie */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        padding: "4px 10px",
                        borderRadius: 20,
                        background: isDone ? "#dcfce7" : isLate ? "#fee2e2" : "#fef3c7",
                        color: isDone ? "#166534" : isLate ? "#991b1b" : "#92400e",
                      }}
                    >
                      {isDone ? `Terminé · ${a.completion?.score}%` : isLate ? "En retard !" : "À faire"}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", background: "#f1f5f9", padding: "3px 8px", borderRadius: 8 }}>
                      {a.mission.category}
                    </span>
                  </div>

                  {/* Titre & Description */}
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
                    {a.mission.title}
                  </h3>
                  <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.4, margin: "0 0 16px" }}>
                    {a.mission.description}
                  </p>

                  {/* Consigne enseignant si présente */}
                  {a.instructions && (
                    <div style={{ background: "#f8fafc", borderLeft: "3px solid #047857", padding: "8px 12px", borderRadius: "0 10px 10px 0", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#047857", marginBottom: 3 }}>
                        <MessageSquare size={13} /> Consigne de l&apos;enseignant :
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "#334155", fontStyle: "italic" }}>
                        &laquo; {a.instructions} &raquo;
                      </p>
                    </div>
                  )}

                  {/* Métadonnées (Enseignant, Date limite, XP) */}
                  <div style={{ fontSize: 13, color: "#64748b", display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <User size={14} style={{ color: "#047857" }} /> Par : {a.teacherName}
                    </div>
                    {a.dueDate && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: isLate && !isDone ? "#dc2626" : "#64748b" }}>
                        <Calendar size={14} /> À rendre avant le : {new Date(a.dueDate).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={14} /> {a.mission.durationMinutes} min
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#d97706", fontWeight: 700 }}>
                        <Sparkles size={14} /> +{a.mission.xp} XP
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bouton d'action */}
                <div>
                  <button
                    onClick={() => startMission(a)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: 14,
                      border: "none",
                      background: isDone ? "#f1f5f9" : "linear-gradient(135deg, #059669 0%, #047857 100%)",
                      color: isDone ? "#0f172a" : "#fff",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: isDone ? "none" : "0 4px 12px rgba(4, 120, 87, 0.25)",
                    }}
                  >
                    {isDone ? (
                      <>
                        <CheckCircle2 size={16} style={{ color: "#10b981" }} /> Recommencer la mission
                      </>
                    ) : (
                      <>
                        <Play size={16} /> Commencer la mission
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DU LECTEUR DE MISSION INTERACTIF */}
      {activeMission && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              maxWidth: 600,
              width: "100%",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            {/* Barre de titre */}
            <div style={{ background: "#065f46", color: "#fff", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Target size={20} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{activeMission.mission.title}</h3>
              </div>
              <button
                onClick={() => setActiveMission(null)}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Corps du lecteur */}
            <div style={{ padding: "28px 24px" }}>
              {(() => {
                if (quizLoading || !quiz) {
                  return (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "#065f46", fontWeight: 700 }}>
                      {submitError ? (
                        <p role="alert" style={{ margin: 0, color: "#991b1b" }}>{submitError}</p>
                      ) : "Chargement des questions…"}
                    </div>
                  );
                }
                const steps = quiz.steps;
                const step = steps[currentStep];
                const answer = quiz.answers[String(currentStep)];
                const selectedOption = answer ? answer.option : null;
                const correctAnswers = Object.values(quiz.answers).filter(a => a.correct).length;

                if (missionComplete) {
                  const score = Math.round((correctAnswers / steps.length) * 100);
                  return (
                    <div style={{ textAlign: "center", padding: "10px 0" }}>
                      <div style={{ display: "inline-flex", padding: 20, background: "#ecfdf5", borderRadius: "50%", marginBottom: 16 }}>
                        <Trophy size={48} style={{ color: "#059669" }} />
                      </div>
                      <h2 style={{ fontSize: 24, fontWeight: 900, color: "#065f46", margin: "0 0 8px" }}>
                        Félicitations ! Mission accomplie !
                      </h2>
                      <p style={{ fontSize: 16, color: "#475569", margin: "0 0 20px" }}>
                        Tu as réussi {correctAnswers} question{correctAnswers > 1 ? "s" : ""} sur {steps.length}.
                      </p>
                      <div style={{ fontSize: 36, fontWeight: 900, color: "#047857", marginBottom: 24 }}>
                        Score : {score} %
                      </div>
                      <p style={{ fontSize: 14, color: "#047857", fontWeight: 700, margin: "0 0 28px" }}>
                        {activeMission.status === "termine"
                          ? "Entraînement : ta note officielle reste celle de ta première remise, et les XP de ce devoir sont déjà gagnés."
                          : `+${activeMission.mission.xp} XP seront ajoutés à ton profil !`}
                      </p>
                      {submitError && (
                        <p role="alert" style={{ margin: "0 0 16px", color: "#991b1b", fontWeight: 700, fontSize: 14 }}>{submitError}</p>
                      )}
                      <button
                        disabled={submitting}
                        onClick={() => submitMission()}
                        style={{
                          width: "100%",
                          padding: "16px",
                          borderRadius: 16,
                          border: "none",
                          background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                          color: "#fff",
                          fontSize: 16,
                          fontWeight: 800,
                          cursor: submitting ? "not-allowed" : "pointer",
                          boxShadow: "0 10px 20px -5px rgba(4, 120, 87, 0.4)",
                        }}
                      >
                        {submitting ? (
                          "Envoi du devoir en cours…"
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <span>Envoyer à mon enseignant</span>
                            <CheckCircle2 size={18} />
                          </span>
                        )}
                      </button>
                    </div>
                  );
                }

                return (
                  <div>
                    {/* Étape */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#047857", textTransform: "uppercase" }}>
                        Étape {currentStep + 1} sur {steps.length}
                      </span>
                      <span style={{ fontSize: 13, color: "#64748b" }}>
                        Difficulté : {activeMission.mission.difficulty}
                      </span>
                    </div>

                    {/* Question */}
                    <h4 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 20px", lineHeight: 1.4 }}>
                      {step.question}
                    </h4>

                    {/* Options */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                      {step.options.map((label, idx) => {
                        const isSelected = selectedOption === idx;
                        let bg = "#f8fafc";
                        let border = "1px solid #cbd5e1";
                        let color = "#1e293b";

                        if (answer) {
                          if (answer.correctOption === idx) {
                            bg = "#dcfce7";
                            border = "2px solid #16a34a";
                            color = "#166534";
                          } else if (isSelected) {
                            bg = "#fee2e2";
                            border = "2px solid #dc2626";
                            color = "#991b1b";
                          }
                        }

                        return (
                          <button
                            key={idx}
                            disabled={selectedOption !== null}
                            onClick={() => handleAnswer(idx)}
                            style={{
                              padding: "14px 18px",
                              borderRadius: 14,
                              background: bg,
                              border,
                              color,
                              fontSize: 15,
                              fontWeight: 600,
                              textAlign: "left",
                              cursor: selectedOption === null ? "pointer" : "default",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {submitError && (
                      <p role="alert" style={{ margin: "0 0 16px", color: "#991b1b", fontWeight: 700, fontSize: 14 }}>{submitError}</p>
                    )}

                    {/* Feedback */}
                    {answer && (
                      <div
                        style={{
                          background: answer.correct ? "#f0fdf4" : "#fef2f2",
                          border: `1px solid ${answer.correct ? "#86efac" : "#fca5a5"}`,
                          borderRadius: 12,
                          padding: 14,
                          fontSize: 14,
                          color: answer.correct ? "#166534" : "#991b1b",
                          marginBottom: 20,
                          lineHeight: 1.4,
                        }}
                      >
                        {answer.explanation}
                      </div>
                    )}

                    {/* Bouton Suivant */}
                    {selectedOption !== null && (
                      <button
                        onClick={() => nextStep()}
                        style={{
                          width: "100%",
                          padding: "14px",
                          borderRadius: 14,
                          border: "none",
                          background: "#065f46",
                          color: "#fff",
                          fontSize: 15,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {currentStep + 1 < steps.length ? "Question suivante →" : "Voir mon résultat →"}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
