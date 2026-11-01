"use client";

import { sayUiIfKnown } from "../parcours79/uiVoice";
import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Rocket,
  Star,
  Palette,
  Gamepad2,
  Volume2,
  Lightbulb,
  Check,
  X,
} from "lucide-react";
import { playFeedbackSound } from "./sound";

export function VoiceAssistantGame({ onComplete }: { onComplete: (stars?: number) => void }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<"playing" | "intermission" | "builder" | "success">("playing");
  const [failedSteps, setFailedSteps] = useState<number[]>([]);
  const [promptData, setPromptData] = useState({ lieu: "", sujet: "" });

  useEffect(() => {
    let progress = 0;
    if (mode === "playing") {
      progress = (step + (selected !== null ? 1 : 0)) / 4;
    } else if (mode === "intermission" || mode === "builder") {
      progress = 3 / 4;
    } else if (mode === "success") {
      progress = 1;
    }
    window.dispatchEvent(new CustomEvent("levelProgress", { detail: Math.min(1, progress) }));
  }, [step, selected, mode]);

  const questions = [
    {
      title: "Tu veux savoir la météo. Que dois-tu faire ?",
      correctionTitle: "Pour demander la météo, il faut parler à l'assistant, pas dessiner !",
      type: "image",
      options: [
        { id: 0, src: "/images/games/voice_assistant_1.jpg", isCorrect: true, label: "Parler à l'assistant" },
        { id: 1, src: "/images/games/voice_assistant_2.jpg", isCorrect: false, label: "Dessiner sur une feuille" },
      ],
    },
    {
      title: "Tu veux demander une histoire à Palou. Que dis-tu ?",
      correctionTitle: "Il faut donner des détails pour que l'IA comprenne, comme \"Raconte-moi une histoire...\"",
      type: "image",
      options: [
        { id: 0, src: "/images/games/voice_assistant_3.jpg", isCorrect: true, label: "\"Raconte-moi une histoire avec un lion\"" },
        { id: 1, src: "/images/games/voice_assistant_4.jpg", isCorrect: false, label: "\"Histoire !\"" },
      ],
    },
    {
      title: "L'IA a besoin de détails pour comprendre ! Laquelle est la meilleure question ?",
      correctionTitle: "Précise ta question avec des détails (ex: \"un gâteau au chocolat\") pour une bonne réponse.",
      type: "image",
      options: [
        { id: 0, src: "/images/games/voice_assistant_5.jpg", isCorrect: false, label: "\"Comment faire ?\"" },
        { id: 1, src: "/images/games/voice_assistant_6.jpg", isCorrect: true, label: "\"Comment faire un gâteau au chocolat ?\"" },
      ],
    },
  ];

  const currentQ = questions[step];

  const handleSelect = (index: number) => {
    if (selected !== null) return;

    setSelected(index);
    const isCorrect = currentQ.options[index].isCorrect;
    playFeedbackSound(isCorrect);

    setTimeout(() => {
      const isFailed = !isCorrect;
      if (isFailed) {
        setFailedSteps((prev) => [...prev, step]);
      }

      if (step === questions.length - 1) {
        setMode("intermission");
        setSelected(null);
      } else {
        setStep(step + 1);
        setSelected(null);
      }
    }, 1500);
  };

  const handleFinishBuilder = () => {
    playFeedbackSound(true);
    setMode("success");
  };

  if (mode === "success") {
    let resultImage: string | null = null;
    let promptSentence: React.ReactNode = null;

    if (promptData.lieu === "Parc" && promptData.sujet === "Météo") {
      resultImage = "/images/games/result_parc_meteo.jpg";
      promptSentence = <>Prompt : "Dessine Palou au <b>Parc</b> en train de parler de la <b>Météo</b>"</>;
    } else if (promptData.lieu === "Parc" && promptData.sujet === "Nourriture") {
      resultImage = "/images/games/result_parc_nourriture.jpg";
      promptSentence = <>Prompt : "Dessine Palou au <b>Parc</b> en train de parler de la <b>Nourriture</b>"</>;
    } else if (promptData.lieu === "Parc" && promptData.sujet === "Jeux") {
      resultImage = "/images/games/result_parc_jeux.jpg";
      promptSentence = <>Prompt : "Dessine Palou au <b>Parc</b> en train de parler de <b>Jeux</b>"</>;
    } else if (promptData.lieu === "École" && promptData.sujet === "Météo") {
      resultImage = "/images/games/result_ecole_meteo.jpg";
      promptSentence = <>Prompt : "Dessine Palou à <b>l'École</b> en train de parler de la <b>Météo</b>"</>;
    } else if (promptData.lieu === "École" && promptData.sujet === "Nourriture") {
      resultImage = "/images/games/result_ecole_nourriture.jpg";
      promptSentence = <>Prompt : "Dessine Palou à <b>l'École</b> en train de parler de la <b>Nourriture</b>"</>;
    } else if (promptData.lieu === "École" && promptData.sujet === "Jeux") {
      resultImage = "/images/games/result_ecole_jeux.jpg";
      promptSentence = <>Prompt : "Dessine Palou à <b>l'École</b> en train de parler de <b>Jeux</b>"</>;
    } else if (promptData.lieu === "Maison" && promptData.sujet === "Météo") {
      resultImage = "/images/games/result_maison_meteo.jpg";
      promptSentence = <>Prompt : "Dessine Palou à la <b>Maison</b> en train de parler de la <b>Météo</b>"</>;
    } else if (promptData.lieu === "Maison" && promptData.sujet === "Nourriture") {
      resultImage = "/images/games/result_maison_nourriture.jpg";
      promptSentence = <>Prompt : "Dessine Palou à la <b>Maison</b> en train de parler de la <b>Nourriture</b>"</>;
    } else if (promptData.lieu === "Maison" && promptData.sujet === "Jeux") {
      resultImage = "/images/games/result_maison_jeux.jpg";
      promptSentence = <>Prompt : "Dessine Palou à la <b>Maison</b> en train de parler de <b>Jeux</b>"</>;
    }

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "rgba(251, 250, 243, 0.95)",
          animation: "kiFadeIn 0.5s",
        }}
      >
        {resultImage ? (
          <div
            style={{
              background: "#FFF",
              borderRadius: 32,
              padding: "30px",
              border: "4px solid #10B981",
              animation: "kiPop 0.5s",
              textAlign: "center",
              maxWidth: 600,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}
          >
            <h3 style={{ fontSize: 32, color: "#065F46", fontWeight: 900, margin: 0 }}>
              Voici ton image !
            </h3>
            <img
              src={resultImage}
              alt="Résultat"
              style={{
                width: "100%",
                maxWidth: 400,
                borderRadius: 20,
                objectFit: "cover",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              }}
            />
            <p style={{ fontSize: 20, color: "#047857", fontWeight: 600, margin: 0 }}>
              {promptSentence}
            </p>
            <button
              onClick={() => onComplete(failedSteps.length === 0 ? 3 : failedSteps.length <= 1 ? 2 : 1)}
              style={{
                marginTop: 10,
                padding: "12px 30px",
                fontSize: 20,
                fontWeight: 800,
                background: "#10B981",
                color: "#FFF",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 6px 0 #059669",
                transition: "all 0.2s",
              }}
            >
              Terminer
            </button>
          </div>
        ) : (
          <div
            style={{
              background: "#D1FAE5",
              borderRadius: 32,
              padding: "40px 60px",
              border: "4px solid #10B981",
              animation: "kiPop 0.5s",
              textAlign: "center",
              maxWidth: 600,
            }}
          >
            <div style={{ marginBottom: 20, color: "#10B981", display: "flex", justifyContent: "center" }}>
              <Sparkles size={80} />
            </div>
            <h3 style={{ fontSize: 36, color: "#065F46", marginBottom: 20, fontWeight: 900 }}>
              Bravo !
            </h3>
            <p style={{ fontSize: 24, color: "#047857", fontWeight: 600, marginBottom: 30 }}>
              Tu sais maintenant comment bien parler à une Intelligence Artificielle !
            </p>
            <button
              onClick={() => onComplete(failedSteps.length === 0 ? 3 : failedSteps.length <= 1 ? 2 : 1)}
              style={{
                padding: "12px 30px",
                fontSize: 20,
                fontWeight: 800,
                background: "#10B981",
                color: "#FFF",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 6px 0 #059669",
                transition: "all 0.2s",
              }}
            >
              Terminer
            </button>
          </div>
        )}
      </div>
    );
  }

  if (mode === "intermission") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          animation: "kiFadeIn 0.5s",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(rgba(251, 250, 243, 0.8), rgba(251, 250, 243, 0.8)), url('/images/games/niveau6_bg.jpg') center/cover",
            zIndex: -1,
          }}
        />

        <div style={{ position: "absolute", top: "10%", left: "15%", color: "#3B82F6", animation: "kiFloatSlow 3s infinite" }}>
          <Sparkles size={60} />
        </div>
        <div style={{ position: "absolute", bottom: "15%", right: "15%", color: "#10B981", animation: "kiFloatSlow 2.5s infinite alternate" }}>
          <Rocket size={70} />
        </div>
        <div style={{ position: "absolute", top: "15%", right: "20%", color: "#F59E0B", animation: "kiFloatSlow 4s infinite" }}>
          <Star size={60} />
        </div>
        <div style={{ position: "absolute", bottom: "15%", left: "20%", color: "#8B5CF6", animation: "kiFloatSlow 3.5s infinite alternate" }}>
          <Palette size={60} />
        </div>

        <div style={{ zIndex: 10, textAlign: "center", maxWidth: 800, padding: "20px" }}>
          <div style={{ marginBottom: 10, color: "#10B981", display: "flex", justifyContent: "center", animation: "kiPop 0.5s" }}>
            <Gamepad2 size={90} />
          </div>
          <h3 style={{ fontSize: 48, color: "#144C3A", marginBottom: 20, fontWeight: 900 }}>
            À toi de jouer !
          </h3>
          <p
            style={{
              fontSize: 26,
              color: "#065F46",
              lineHeight: 1.4,
              fontWeight: 700,
              margin: "0 auto 30px auto",
              background: "#D1FAE5",
              padding: "20px 30px",
              borderRadius: 24,
              border: "4px solid #10B981",
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            }}
          >
            Maintenant que tu as compris comment parler à une Intelligence Artificielle, tu vas pouvoir créer ton propre prompt !
          </p>
          <button
            onClick={() => setMode("builder")}
            style={{
              padding: "18px 50px",
              fontSize: 28,
              fontWeight: 900,
              background: "#10B981",
              color: "#FFF",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 10px 0 #059669",
              transition: "all 0.2s",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            C'est parti !
          </button>
        </div>
      </div>
    );
  }

  const speechText =
    (mode as string) === "intermission"
      ? "Maintenant que tu as compris comment parler à l'IA, crée ton propre prompt !"
      : currentQ
      ? currentQ.title
      : "";

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(rgba(251, 250, 243, 0.7), rgba(251, 250, 243, 0.7)), url('/images/games/niveau6_bg.jpg') center/cover",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          width: "100%",
          padding: "10px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <img
            src="/images/palou/game-palou-reflexion.png"
            alt="Palou"
            style={{ width: 180, animation: "kiFloatSlow 2.5s infinite alternate" }}
          />
          <button
            style={{
              padding: "8px 20px",
              background: "#FFF",
              border: "3px solid #10B981",
              borderRadius: 999,
              color: "#0E4B3C",
              fontWeight: 800,
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 0 #059669",
            }}
            onClick={() => {
              void sayUiIfKnown(mode === "builder" ? "jeu-assistant-prompt" : (mode as string) === "intermission" ? "jeu-assistant-pause" : `jeu-assistant-q${step + 1}`, { force: true });
            }}
          >
            <Volume2 size={18} /> Ecouter Palou
          </button>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            maxWidth: 1000,
          }}
        >
          <div
            style={{
              position: "relative",
              background: "#FFF",
              borderRadius: 24,
              padding: "16px 24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
              width: "100%",
              textAlign: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: -20,
                top: "50%",
                transform: "translateY(-50%)",
                width: 0,
                height: 0,
                borderTop: "20px solid transparent",
                borderBottom: "20px solid transparent",
                borderRight: "20px solid #FFF",
              }}
            />
            <h3 style={{ fontSize: 24, color: "#144C3A", margin: 0, lineHeight: 1.3, fontWeight: 900 }}>
              {mode === "builder" ? "Créons ensemble un prompt parfait !" : speechText}
            </h3>
          </div>

          {mode === "builder" ? (
            <div style={{ width: "100%", animation: "kiFadeIn 0.3s" }}>
              <p
                style={{
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#4B5563",
                  marginBottom: 20,
                  background: "#F3F4F6",
                  padding: "10px 20px",
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                }}
              >
                <Lightbulb size={18} /> Choisis une seule image pour le lieu, et une seule image pour le sujet !
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 20 }}>
                <div
                  style={{
                    background: "#FFF",
                    padding: 25,
                    borderRadius: 24,
                    border: "2px solid #E5E7EB",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                  }}
                >
                  <b style={{ display: "block", marginBottom: 15, color: "#374151", fontSize: 18 }}>
                    Où es-tu ?
                  </b>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[
                      { label: "Parc", src: "/images/games/builder_parc.jpg" },
                      { label: "École", src: "/images/games/builder_ecole.jpg" },
                      { label: "Maison", src: "/images/games/builder_maison.jpg" },
                    ].map((l) => (
                      <button
                        key={l.label}
                        onClick={() => {
                          setPromptData((p) => ({ ...p, lieu: l.label }));
                          playFeedbackSound(true);
                        }}
                        style={{
                          flex: 1,
                          padding: 8,
                          borderRadius: 12,
                          border: promptData.lieu === l.label ? "3px solid #10B981" : "2px solid #D1D5DB",
                          background: promptData.lieu === l.label ? "#D1FAE5" : "#FFF",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <img
                          src={l.src}
                          alt={l.label}
                          style={{
                            width: "100%",
                            aspectRatio: "1/1",
                            objectFit: "cover",
                            borderRadius: 8,
                          }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#144C3A" }}>{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    background: "#FFF",
                    padding: 25,
                    borderRadius: 24,
                    border: "2px solid #E5E7EB",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                  }}
                >
                  <b style={{ display: "block", marginBottom: 15, color: "#374151", fontSize: 18 }}>
                    Sur quoi veux-tu parler ?
                  </b>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[
                      { label: "Météo", src: "/images/games/builder_meteo.jpg" },
                      { label: "Nourriture", src: "/images/games/builder_nourriture.jpg" },
                      { label: "Jeux", src: "/images/games/builder_jeux.jpg" },
                    ].map((s) => (
                      <button
                        key={s.label}
                        onClick={() => {
                          setPromptData((p) => ({ ...p, sujet: s.label }));
                          playFeedbackSound(true);
                        }}
                        style={{
                          flex: 1,
                          padding: 8,
                          borderRadius: 12,
                          border: promptData.sujet === s.label ? "3px solid #10B981" : "2px solid #D1D5DB",
                          background: promptData.sujet === s.label ? "#D1FAE5" : "#FFF",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <img
                          src={s.src}
                          alt={s.label}
                          style={{
                            width: "100%",
                            aspectRatio: "1/1",
                            objectFit: "cover",
                            borderRadius: 8,
                          }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#144C3A" }}>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                disabled={!promptData.lieu || !promptData.sujet}
                onClick={handleFinishBuilder}
                style={{
                  width: "100%",
                  padding: "18px 40px",
                  fontSize: 22,
                  fontWeight: 800,
                  background: !promptData.lieu || !promptData.sujet ? "#E5E7EB" : "#10B981",
                  color: !promptData.lieu || !promptData.sujet ? "#6B7280" : "#FFFFFF",
                  borderRadius: 24,
                  border: "none",
                  cursor: !promptData.lieu || !promptData.sujet ? "not-allowed" : "pointer",
                  boxShadow: !promptData.lieu || !promptData.sujet ? "none" : "0 8px 0 #059669",
                  transition: "all 0.2s",
                }}
              >
                Lancer le dialogue !
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                gap: 20,
                justifyContent: "center",
                width: "100%",
                flexDirection: currentQ.type === "image" ? "row" : "column",
              }}
            >
              {currentQ.options.map((opt, idx) => {
                const isSelected = selected === idx;
                let borderColor = "#E4DEC6";

                if (isSelected) {
                  borderColor = opt.isCorrect ? "#10B981" : "#EF4444";
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(idx)}
                    style={{
                      flex: currentQ.type === "image" ? 1 : "unset",
                      width: currentQ.type === "text" ? "100%" : "auto",
                      padding: currentQ.type === "image" ? 10 : 25,
                      background: "#FFF",
                      border: `4px solid ${borderColor}`,
                      borderRadius: 24,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                      transform: isSelected ? "scale(0.95)" : "scale(1)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {currentQ.type === "image" ? (
                      <>
                        <img
                          src={opt.src}
                          alt="Option"
                          style={{
                            width: "100%",
                            aspectRatio: "1/1",
                            objectFit: "cover",
                            borderRadius: 14,
                          }}
                        />
                        <div
                          style={{
                            padding: "15px 5px",
                            fontSize: 18,
                            fontWeight: 800,
                            color: "#144C3A",
                          }}
                        >
                          {opt.label}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#374151" }}>
                        {(opt as { text?: string; label: string }).text || opt.label}
                      </div>
                    )}

                    {isSelected && (
                      <div
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          background: opt.isCorrect ? "#10B981" : "#EF4444",
                          color: "#FFF",
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 24,
                          fontWeight: "bold",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                        }}
                      >
                        {opt.isCorrect ? <Check size={24} /> : <X size={24} />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
