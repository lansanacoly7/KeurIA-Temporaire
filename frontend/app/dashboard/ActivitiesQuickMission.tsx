"use client";

import { sayUiIfKnown } from "./parcours79/uiVoice";
import { useEffect, useState } from "react";
import { Volume2, Check, X } from "lucide-react";
import { playQuizSound } from "./dashboardShared";

export function QuickMissionGame({ kind, onComplete }: { kind: "shield" | "source" | "ethics"; onComplete: (stars?: number, feedback?: React.ReactNode) => void }) {
  const missions = {
    shield: [
      [
        "Un inconnu te demande ton mot de passe.",
        [
          { text: "Je lui donne mon mot de passe", image: "/images/shield_q1_give.jpg" },
          { text: "Je demande conseil à un adulte", image: "/images/shield_q1_refuse.jpg" }
        ],
        1
      ],
      [
        "Une application te demande ton adresse de maison.",
        [
          { text: "Je refuse de donner mon adresse", image: "/images/shield_q2_refuse.jpg" },
          { text: "J'écris mon adresse dans l'application", image: "/images/shield_q2_give.jpg" }
        ],
        0
      ],
      [
        "Un lien bizarre arrive dans un message suspect.",
        [
          { text: "Je clique sur le lien suspect", image: "/images/shield_q3_click.jpg" },
          { text: "Je demande conseil à un adulte", image: "/images/shield_q3_ask.jpg" }
        ],
        1
      ]
    ],
    source: [
      ["Une vidéo annonce la fermeture des écoles.", ["Un message transféré sans auteur", "Le communiqué officiel daté"], 1],
      ["Un chiffre étonnant circule sur le Sénégal.", ["Deux sources reconnues qui citent leurs données", "Une capture sans lien"], 0],
      ["Une image spectaculaire devient virale.", ["La publication originale et son contexte", "Le nombre de partages"], 0]
    ],
    ethics: [
      ["Une IA scolaire veut collecter toutes les conversations.", ["Limiter les données au strict nécessaire", "Tout enregistrer sans prévenir"], 0],
      ["Un modèle réussit moins bien pour un groupe.", ["Ignorer l'écart", "Tester, corriger les données et documenter"], 1],
      ["Un résultat automatisé affecte un élève.", ["Prévoir une vérification humaine et un recours", "Cacher le fonctionnement"], 0]
    ]
  } as const;

  const items = missions[kind];
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [answer, setAnswer] = useState<number | null>(null);

  useEffect(() => {
    const progress = (pos + (answer !== null ? 1 : 0)) / items.length;
    window.dispatchEvent(new CustomEvent("levelProgress", { detail: Math.min(1, progress) }));
  }, [pos, answer, items.length]);

  const choose = (choice: number) => {
    if (answer !== null) return;
    const correct = choice === items[pos][2];
    setAnswer(choice);
    playQuizSound(correct);
    setTimeout(() => next(choice), 1500);
  };

  const next = (selectedAnswer: number = answer!) => {
    if (selectedAnswer === null) return;
    const correct = selectedAnswer === items[pos][2];
    const nextResults = [...results, correct];
    if (pos === items.length - 1) {
      const score = nextResults.filter(Boolean).length;
      const stars = score === 3 ? 3 : score === 2 ? 2 : 1;
      onComplete(stars);
    } else {
      setResults(nextResults);
      setPos(p => p + 1);
      setAnswer(null);
    }
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url('/images/bg-level-8.jpg') center/cover" }}></div>
      </div>

      <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 36, width: "100%", height: "100%", padding: "4px 10px 25px" }}>
        {/* Mascot Side */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, minWidth: 200, marginTop: 8 }}>
          <img src="/images/palou/game-palou-reflexion.png" alt="Palou" style={{ width: 175, animation: "kiFloatSlow 2.5s infinite alternate" }} />
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
              boxShadow: "0 4px 0 #059669"
            }}
            onClick={() => {
              const name = { shield: "bouclier", source: "source", ethics: "ethique" }[kind];
              void sayUiIfKnown(items[pos] ? `mission-${name}-${pos + 1}` : "mission-protege", { force: true });
            }}
          >
            <Volume2 size={18} /> Ecouter Palou
          </button>
        </div>

        {/* Content Side */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 1020, width: "100%", overflow: "visible" }}>
          {items[pos] && (
            <>
              {/* Speech Bubble */}
              <div style={{ position: "relative", background: "#FFF", borderRadius: 24, padding: "16px 32px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", width: "100%", maxWidth: 840, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", left: -20, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "18px solid transparent", borderBottom: "18px solid transparent", borderRight: "20px solid #FFF" }}></div>
                <h3 style={{ fontSize: 25, color: "#144C3A", margin: 0, lineHeight: 1.3, fontWeight: 900 }}>
                  {items[pos][0]}
                </h3>
                <span style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 800, color: "#92400E", background: "#FEF3C7", padding: "4px 14px", borderRadius: 14 }}>
                  {pos + 1}/{items.length}
                </span>
              </div>

              {/* Cards Grid */}
              <div style={{ display: "flex", justifyContent: "center", gap: 28, width: "100%", maxWidth: 1000 }}>
                {(items[pos][1] as readonly any[]).map((optionDef: any, i: number) => {
                  const isSelected = answer === i;
                  const isCorrect = i === items[pos][2];
                  const showResult = answer !== null;

                  const hasImage = typeof optionDef === "object" && optionDef !== null && optionDef.image;
                  const optionText = hasImage ? optionDef.text : typeof optionDef === "string" ? optionDef : optionDef.text;
                  const optionImage = hasImage ? optionDef.image : null;

                  let borderColor = "#E4DEC6";
                  let bgColor = "#FFF";

                  if (showResult) {
                    if (isSelected) {
                      borderColor = isCorrect ? "#10B981" : "#EF4444";
                      bgColor = isCorrect ? "#D1FAE5" : "#FEE2E2";
                    } else if (isCorrect) {
                      borderColor = "#10B981";
                      bgColor = "#D1FAE5";
                    }
                  }

                  return (
                    <button
                      key={i}
                      disabled={showResult}
                      onClick={() => choose(i)}
                      style={{
                        flex: 1,
                        padding: 14,
                        position: "relative",
                        background: bgColor,
                        borderRadius: 28,
                        border: `6px solid ${borderColor}`,
                        boxShadow: isSelected ? "0 12px 28px rgba(0,0,0,0.2)" : "0 8px 24px rgba(0,0,0,0.08)",
                        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        transform: isSelected ? "scale(0.97)" : "scale(1)",
                        cursor: showResult ? "default" : "pointer",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 14
                      }}
                    >
                      {optionImage && (
                        <img
                          src={optionImage}
                          alt={optionText}
                          style={{
                            width: "100%",
                            height: 290,
                            objectFit: "cover",
                            borderRadius: 20,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                          }}
                        />
                      )}
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#0E3A2E", textAlign: "center", lineHeight: 1.35, padding: "4px 8px" }}>
                        {optionText}
                      </span>
                      {showResult && (isSelected || isCorrect) && (
                        <div
                          style={{
                            position: "absolute",
                            top: 20,
                            right: 20,
                            background: isCorrect ? "#10B981" : "#EF4444",
                            color: "#FFF",
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 28,
                            fontWeight: "bold",
                            boxShadow: "0 6px 16px rgba(0,0,0,0.3)",
                            zIndex: 3
                          }}
                        >
                          {isCorrect ? <Check size={28} strokeWidth={3} /> : <X size={28} strokeWidth={3} />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
