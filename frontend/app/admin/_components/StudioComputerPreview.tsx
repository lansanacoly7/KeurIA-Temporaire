"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Lightbulb, Monitor, Pencil, RotateCcw, Search, Sparkles, Star, Target, Trophy, X, Zap } from "lucide-react";
import { plural } from "@/app/_scolaire/lib/format";
import { getStudioLessonDetail, type StudioLesson } from "@/app/_scolaire/lib/curriculumStudioApi";
import { ErrorMessage, Skeleton } from "@/app/_scolaire/ui/ui";

/* ─── Modal Aperçu Apprenant en Ordinateur / Dashboard Desktop 16:9 ─────── */
export function ComputerPreviewModal({
  lessonId,
  onClose,
  onEdit,
}: {
  lessonId: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [lesson, setLesson] = useState<StudioLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Étapes de l'ordinateur : 0 = Mission d'accroche, 1 = Découverte & Savoir, 2 = Quiz interactif, 3 = Victoire
  const [step, setStep] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    let cancelled = false;
    getStudioLessonDetail(lessonId)
      .then(res => {
        if (!cancelled) setLesson(res);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur de chargement.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [lessonId]);

  const questions = lesson?.content?.questions || [];
  const allAnswered = questions.length > 0 && questions.every((_, idx) => selectedAnswers[idx] !== undefined);
  const correctCount = questions.filter((q, idx) => selectedAnswers[idx] === q.correct).length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1100, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Barre de contrôle supérieure */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, color: "white" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Monitor size={20} style={{ color: "#d9ef59" }} />
            <b style={{ fontSize: 15, letterSpacing: "0.02em" }}>Aperçu Ordinateur Apprenant · kEur IA Dashboard</b>
            <span style={{ fontSize: 12, padding: "2px 8px", background: "rgba(255,255,255,0.15)", borderRadius: 999 }}>
              Format Écran Desktop 16:9
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="ec-btn"
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: 0 }}
              onClick={() => {
                onClose();
                onEdit();
              }}
            >
              <Pencil size={15} /> Modifier dans l&apos;éditeur
            </button>
            <button
              type="button"
              className="ec-btn"
              style={{ background: "#ef4444", color: "white", border: 0, display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={onClose}
            >
              <X size={15} /> Fermer l&apos;aperçu
            </button>
          </div>
        </div>

        {/* ─── Cadre Moniteur d'Ordinateur Moderne ─── */}
        <div
          style={{
            width: "100%",
            borderRadius: 24,
            background: "#1e293b",
            border: "8px solid #334155",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Caméra et bord supérieur du moniteur */}
          <div
            style={{
              height: 28,
              background: "#0f172a",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 14px",
              borderBottom: "1px solid #1e293b",
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            </div>

            {/* Webcam stylisée */}
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#334155", boxShadow: "inset 0 0 2px #000" }} />

            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
              {lesson ? `${lesson.module_title || "Monde"} · Leçon ${lesson.order}` : "kEur IA"}
            </span>
          </div>

          {/* Écran Desktop Réel de l'Apprenant */}
          <div
            style={{
              background: "#f4f7f6",
              minHeight: 520,
              maxHeight: "75vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {loading ? (
              <div style={{ padding: 40 }}><Skeleton height={380} /></div>
            ) : error || !lesson ? (
              <div style={{ padding: 40 }}><ErrorMessage message={error || "Leçon introuvable."} /></div>
            ) : (
              <>
                {/* Barre de jeu Dashboard Desktop */}
                <div
                  style={{
                    padding: "12px 24px",
                    background: "#ffffff",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ fontWeight: 900, fontSize: 18, color: "var(--ec-brand)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Sparkles size={16} /> kEur IA
                    </div>
                    <div style={{ height: 20, width: 1, background: "#cbd5e1" }} />
                    <b style={{ fontSize: 15, color: "#0f172a" }}>{lesson.title}</b>
                  </div>

                  {/* Étapes interactives */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {[
                      { idx: 0, label: "1. Mission" },
                      { idx: 1, label: "2. Découverte" },
                      { idx: 2, label: `3. Quiz (${questions.length})` },
                      { idx: 3, label: "4. Victoire" },
                    ].map(st => (
                      <button
                        key={st.idx}
                        type="button"
                        onClick={() => setStep(st.idx)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 999,
                          border: step === st.idx ? "2px solid var(--ec-brand)" : "1px solid #cbd5e1",
                          background: step === st.idx ? "var(--ec-brand-soft)" : "transparent",
                          color: step === st.idx ? "var(--ec-brand)" : "#64748b",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Récompenses en direct */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff4dc", color: "#b45309", padding: "4px 10px", borderRadius: 999, fontSize: 13, fontWeight: 900 }}>
                      <Star size={14} style={{ fill: "#f59e0b", color: "#f59e0b" }} /> {lesson.stars} étoiles
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#e8f6f1", color: "var(--ec-brand)", padding: "4px 10px", borderRadius: 999, fontSize: 13, fontWeight: 900 }}>
                      <Zap size={14} style={{ fill: "#10b981", color: "#10b981" }} /> +{lesson.xp} XP
                    </span>
                  </div>
                </div>

                {/* Corps de l'écran Dashboard (Disposition 2 colonnes PC) */}
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, padding: "24px" }}>
                  {/* Volet gauche : Palou la mascotte IA */}
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: 20,
                      border: "1px solid #e2e8f0",
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div style={{ position: "relative", marginBottom: 12 }}>
                      <img
                        src={step === 3 ? "/palou/Bravo !.png" : (step === 2 ? "/palou/Réflexion.png" : "/palou/Curiosite.png")}
                        alt="Palou"
                        style={{
                          width: 170,
                          height: 170,
                          objectFit: "contain",
                          filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.12))",
                        }}
                      />
                    </div>

                    {/* Bulle de dialogue interactive */}
                    <div
                      style={{
                        width: "100%",
                        background: "#fff9df",
                        border: "2px solid #eadfae",
                        borderRadius: 16,
                        padding: 14,
                        position: "relative",
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: "#543b04",
                        textAlign: "left",
                      }}
                    >
                      <b>Palou :</b>
                      <div style={{ marginTop: 4 }}>
                        {step === 0 && (lesson.content?.mission || "Bienvenue dans cette aventure ! Regarde ta mission.")}
                        {step === 1 && (lesson.content?.discover || "Voici ce qu'il faut comprendre pour devenir un expert.")}
                        {step === 2 && "Prends ton temps et sélectionne la bonne réponse pour chaque question !"}
                        {step === 3 && `Génial ! Tu as obtenu ${correctCount}/${questions.length} bonnes réponses et gagné +${lesson.xp} XP !`}
                      </div>
                    </div>

                    {lesson.content?.skill && (
                      <div style={{ marginTop: 14, width: "100%", textAlign: "left", fontSize: 12, color: "#64748b" }}>
                        <b style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Target size={14} /> Compétence visée :</b> {lesson.content.skill}
                      </div>
                    )}
                  </div>

                  {/* Volet droit : Espace de jeu / Défi interactif */}
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: 20,
                      border: "1px solid #e2e8f0",
                      padding: 24,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                    }}
                  >
                    {/* Étape 0 : Mission */}
                    {step === 0 && (
                      <div>
                        <div style={{ display: "inline-block", background: "var(--ec-brand-soft)", color: "var(--ec-brand)", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 900, marginBottom: 12 }}>
                          ÉTAPE 1 / 4 · LA MISSION
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 16px", color: "#0f172a" }}>
                          {lesson.title}
                        </h2>

                        <div style={{ padding: 18, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: 20 }}>
                          <h4 style={{ margin: "0 0 8px", fontSize: 15, color: "var(--ec-brand)" }}>Mission d&apos;accroche :</h4>
                          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: "#334155" }}>
                            {lesson.content?.mission || "Cette leçon n'a pas encore de texte de mission spécifique."}
                          </p>
                        </div>

                        {lesson.content?.challenge && (
                          <div style={{ padding: 14, borderRadius: 12, background: "#fff4dc", border: "1px solid #fde68a", color: "#92400e", fontSize: 14 }}>
                            <b>Défi d&apos;action :</b> {lesson.content.challenge}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Étape 1 : Découverte */}
                    {step === 1 && (
                      <div>
                        <div style={{ display: "inline-block", background: "var(--ec-brand-soft)", color: "var(--ec-brand)", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 900, marginBottom: 12 }}>
                          ÉTAPE 2 / 4 · DÉCOUVERTE DU SAVOIR
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 14px", color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                          <Lightbulb size={20} /> Ce que l&apos;on apprend
                        </h2>

                        <div style={{ fontSize: 15, lineHeight: 1.6, color: "#1e293b", background: "#f8fafc", padding: 18, borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 18 }}>
                          {lesson.content?.discover || "Texte de découverte en cours de rédaction."}
                        </div>

                        {lesson.content?.example && (
                          <div style={{ padding: 14, borderRadius: 14, background: "#e8f6f1", border: "1px solid #a7f3d0", marginBottom: 18 }}>
                            <b style={{ color: "#065f46", fontSize: 14, display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><Search size={14} /> Exemple du quotidien :</b>
                            <span style={{ color: "#047857", fontSize: 14 }}>{lesson.content.example}</span>
                          </div>
                        )}

                        {lesson.content?.vocabulary && lesson.content.vocabulary.length > 0 && (
                          <div>
                            <b style={{ fontSize: 13, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                              Mots clés à retenir :
                            </b>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {lesson.content.vocabulary.map(([w, d], idx) => (
                                <span key={idx} style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", padding: "6px 12px", borderRadius: 10, fontSize: 13 }}>
                                  <b>{w}</b> : {d}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Étape 2 : Quiz Défi interactif */}
                    {step === 2 && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <span style={{ background: "var(--ec-brand-soft)", color: "var(--ec-brand)", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 900 }}>
                            ÉTAPE 3 / 4 · DÉFI DE COMPRÉHENSION
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#64748b" }}>
                            {plural(questions.length, "question", "questions")}
                          </span>
                        </div>

                        {questions.length === 0 ? (
                          <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                            Aucune question de quiz n&apos;est encore enregistrée pour cette leçon.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxHeight: 320, overflowY: "auto", paddingRight: 6 }}>
                            {questions.map((q, qIdx) => {
                              const answered = selectedAnswers[qIdx] !== undefined;
                              const userChoice = selectedAnswers[qIdx];
                              const isCorrect = userChoice === q.correct;
                              return (
                                <div key={qIdx} style={{ padding: 14, borderRadius: 16, border: "1px solid #cbd5e1", background: "#f8fafc" }}>
                                  <b style={{ fontSize: 14, display: "block", marginBottom: 8, color: "#0f172a" }}>
                                    Question {qIdx + 1} : {q.question}
                                  </b>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {q.options.map((opt, optIdx) => {
                                      const isPicked = userChoice === optIdx;
                                      const isThisCorrect = optIdx === q.correct;
                                      let btnBg = "white";
                                      let btnBorder = "#e2e8f0";
                                      let btnColor = "#1e293b";
                                      if (answered) {
                                        if (isThisCorrect) {
                                          btnBg = "#dcfce7";
                                          btnBorder = "#10b981";
                                          btnColor = "#065f46";
                                        } else if (isPicked) {
                                          btnBg = "#fee2e2";
                                          btnBorder = "#ef4444";
                                          btnColor = "#991b1b";
                                        }
                                      }
                                      return (
                                        <button
                                          key={optIdx}
                                          type="button"
                                          onClick={() => setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                                          style={{
                                            textAlign: "left",
                                            padding: "10px 14px",
                                            borderRadius: 10,
                                            background: btnBg,
                                            border: `2px solid ${btnBorder}`,
                                            color: btnColor,
                                            fontSize: 13,
                                            fontWeight: isPicked ? 800 : 600,
                                            cursor: "pointer",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            transition: "all 0.15s ease",
                                          }}
                                        >
                                          <span>{opt}</span>
                                          {answered && isThisCorrect && <Check size={16} style={{ color: "#10b981" }} />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {answered && q.explain && (
                                    <div style={{ marginTop: 8, fontSize: 12, color: isCorrect ? "#047857" : "#b91c1c", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                                      {isCorrect ? <Check size={14} style={{ color: "#10b981", flexShrink: 0 }} /> : <Lightbulb size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />}
                                      <span>{q.explain}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Étape 3 : Victoire */}
                    {step === 3 && (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Trophy size={48} style={{ color: "#f59e0b" }} /></div>
                        <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--ec-brand)", margin: "0 0 8px" }}>
                          Mission accomplie !
                        </h2>
                        <p style={{ fontSize: 15, color: "#64748b", margin: "0 0 20px" }}>
                          L&apos;apprenant a brillamment validé cette leçon.
                        </p>

                        <div style={{ display: "inline-flex", gap: 14, background: "#f8fafc", padding: "14px 28px", borderRadius: 18, border: "1px solid #e2e8f0", marginBottom: 20 }}>
                          <div>
                            <small style={{ color: "#64748b", fontWeight: 700 }}>SCORE DU QUIZ</small>
                            <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
                              {correctCount} / {questions.length}
                            </div>
                          </div>
                          <div style={{ width: 1, background: "#cbd5e1" }} />
                          <div>
                            <small style={{ color: "#64748b", fontWeight: 700 }}>XP GAGNÉS</small>
                            <div style={{ fontSize: 24, fontWeight: 900, color: "#10b981" }}>
                              +{lesson.xp} XP
                            </div>
                          </div>
                        </div>

                        <div>
                          <button
                            type="button"
                            className="ec-btn"
                            onClick={() => {
                              setSelectedAnswers({});
                              setStep(0);
                            }}
                          >
                            <RotateCcw size={15} /> Recommencer la simulation
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Barre de navigation inférieure de l'ordinateur */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 16, marginTop: 16 }}>
                      <button
                        type="button"
                        className="ec-btn"
                        disabled={step === 0}
                        onClick={() => setStep(s => Math.max(0, s - 1))}
                      >
                        <ArrowLeft size={16} /> Précédent
                      </button>

                      {step < 3 ? (
                        <button
                          type="button"
                          className="ec-btn ec-btn--primary"
                          onClick={() => setStep(s => Math.min(3, s + 1))}
                        >
                          {step === 2 ? "Voir le résultat final" : "Étape suivante"} <ArrowRight size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ec-btn ec-btn--primary"
                          onClick={() => {
                            onClose();
                            onEdit();
                          }}
                        >
                          <Pencil size={15} /> Modifier cette leçon
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pied métallique du moniteur d'ordinateur stylisé */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 60, height: 26, background: "linear-gradient(to bottom, #334155, #1e293b)", borderTop: 0 }} />
          <div style={{ width: 220, height: 10, background: "linear-gradient(to bottom, #475569, #334155)", borderRadius: "6px 6px 0 0", boxShadow: "0 6px 12px rgba(0,0,0,0.3)" }} />
        </div>
      </div>
    </div>
  );
}
