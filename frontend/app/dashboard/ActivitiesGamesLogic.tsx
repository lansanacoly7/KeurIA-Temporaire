"use client";

import { sayUi } from "./parcours79/uiVoice";
import { useEffect, useState } from "react";
import { Volume2, Scale, FlaskConical, Eye } from "lucide-react";
import { playQuizSound } from "./dashboardShared";

export function SequenceGame({ onComplete }: { onComplete: (stars?: number, feedback?: React.ReactNode) => void }) {
  const colors = ["vert", "jaune", "bleu", "rose"] as const;
  const sequences = [[0, 2], [0, 2, 1], [0, 2, 1, 3]];
  const [level, setLevel] = useState(0);
  const [input, setInput] = useState<number[]>([]);
  const [show, setShow] = useState(true);
  const [message, setMessage] = useState("Observe…");
  const [mistakes, setMistakes] = useState(0);

  const getColorCode = (c: string) => c === "vert" ? "#10B981" : c === "jaune" ? "#FBBF24" : c === "bleu" ? "#3B82F6" : "#EC4899";

  useEffect(() => {
    const currentSeqLength = sequences[level].length;
    const progress = (level + (input.length / currentSeqLength)) / sequences.length;
    window.dispatchEvent(new CustomEvent("levelProgress", { detail: Math.min(1, progress) }));
  }, [level, input.length, sequences]);

  useEffect(() => {
    setShow(true);
    setInput([]);
    setMessage("Observe attentivement…");
    const timer = setTimeout(() => {
      setShow(false);
      setMessage("À toi de jouer !");
    }, 3000 + level * 1000);
    return () => clearTimeout(timer);
  }, [level]);

  const replaySequence = () => {
    setShow(true);
    setInput([]);
    setMessage("Observe attentivement…");
    setTimeout(() => {
      setShow(false);
      setMessage("À toi de jouer !");
    }, 3000 + level * 1000);
  };

  const tap = (color: number) => {
    if (show) return;
    const next = [...input, color];
    const target = sequences[level];
    if (target[next.length - 1] !== color) {
      playQuizSound(false);
      setMistakes(m => m + 1);
      setInput([]);
      setMessage("Presque ! Recommence la séquence.");
      return;
    }
    playQuizSound(true);
    setInput(next);
    if (next.length === target.length) {
      if (level === sequences.length - 1) {
        const totalMistakes = mistakes;
        const stars = totalMistakes === 0 ? 3 : totalMistakes < 3 ? 2 : 1;
        setTimeout(() => {
          onComplete(stars, totalMistakes > 0 ? "Pour avoir 3 étoiles, observe bien les couleurs et prends ton temps avant de cliquer !" : undefined);
        }, 800);
      } else {
        setMessage("Bien joué !");
        setTimeout(() => setLevel(x => x + 1), 800);
      }
    }
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url('/images/bg-level-9.jpg') center/cover" }}></div>
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
              void sayUi(show ? "jeu-couleurs-observe" : "jeu-couleurs-jouer", { force: true });
            }}
          >
            <Volume2 size={18} /> Ecouter Palou
          </button>
          {!show && input.length === 0 && (
            <button
              style={{
                padding: "10px 24px",
                background: "#FEE2E2",
                border: "3px solid #EF4444",
                borderRadius: 999,
                color: "#B91C1C",
                fontWeight: 800,
                fontSize: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 0 #DC2626",
                animation: "kiPop 0.3s ease-out"
              }}
              onClick={replaySequence}
            >
              <Eye size={18} /> Revoir la séquence
            </button>
          )}
        </div>

        {/* Content Side */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 1020, width: "100%", overflow: "visible" }}>
          {/* Speech Bubble */}
          <div style={{ position: "relative", background: "#FFF", borderRadius: 24, padding: "16px 32px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", width: "100%", maxWidth: 840, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", left: -20, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "18px solid transparent", borderBottom: "18px solid transparent", borderRight: "20px solid #FFF" }}></div>
            <h3 style={{ fontSize: 24, color: "#144C3A", margin: 0, lineHeight: 1.3, fontWeight: 900 }}>
              {show ? "Observe bien la séquence des couleurs !" : "À toi ! Reproduis la séquence dans le bon ordre."}
            </h3>
            <span style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 800, color: "#92400E", background: "#FEF3C7", padding: "4px 14px", borderRadius: 14 }}>
              Séquence {level + 1}/{sequences.length}
            </span>
          </div>

          {/* Activity Board Card */}
          <div style={{ background: "#FFF", borderRadius: 32, padding: "30px 40px", border: "4px solid #E4DEC6", boxShadow: "0 12px 30px rgba(0,0,0,0.08)", width: "100%", maxWidth: 840, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
            {/* Sequence Preview Box */}
            <div style={{ minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
              {show ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                  {sequences[level].map((c, i) => (
                    <span
                      key={i}
                      style={{
                        width: 80,
                        height: 80,
                        display: "inline-block",
                        margin: "0 12px",
                        borderRadius: "50%",
                        background: getColorCode(colors[c]),
                        boxShadow: "0 6px 14px rgba(0,0,0,0.2)",
                        animation: "kiPop 0.3s ease-out"
                      }}
                    />
                  ))}
                </div>
              ) : (
                <b style={{ fontSize: 26, color: "#0E3A2E" }}>{message}</b>
              )}
            </div>

            {/* Color buttons in the original style */}
            <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", width: "100%", maxWidth: 640 }}>
              {colors.map((color, i) => (
                <button
                  aria-label={`Couleur ${color}`}
                  disabled={show}
                  key={color}
                  onClick={() => tap(i)}
                  style={{
                    width: 130,
                    height: 130,
                    borderRadius: "50%",
                    border: "8px solid #FFF",
                    cursor: show ? "not-allowed" : "pointer",
                    opacity: show ? 0.5 : 1,
                    background: getColorCode(color),
                    boxShadow: show ? "none" : "0 10px 20px rgba(0,0,0,0.2)",
                    transition: "transform 0.1s, opacity 0.3s",
                  }}
                  onMouseDown={(e) => { if (!show) e.currentTarget.style.transform = "scale(0.9)"; }}
                  onMouseUp={(e) => { if (!show) e.currentTarget.style.transform = "scale(1)"; }}
                  onMouseLeave={(e) => { if (!show) e.currentTarget.style.transform = "scale(1)"; }}
                />
              ))}
            </div>

            {/* Score & Progression */}
            <div style={{ fontSize: 20, color: "#6C7A63", fontWeight: 700, minHeight: 30 }}>
              Progression : {input.length} / {sequences[level].length}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function BalanceGame({ onComplete }: { onComplete: (stars?: number) => void }) {
  const [groupA, setGroupA] = useState(8); const [groupB, setGroupB] = useState(2); const balanced = groupA === groupB;
  const transfer = () => { if (balanced) return; const a = groupA - 1, b = groupB + 1; setGroupA(a); setGroupB(b); if (a === b) { playQuizSound(true); setTimeout(() => onComplete(3), 1500) } };
  return <div className="real-stage balance-stage" style={{ textAlign: "center", padding: "10px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
    <h3 style={{ fontSize: 32, color: "#0E4B3C", margin: "0 0 10px 0" }}>
      <Scale size={32} style={{ marginRight: 15, verticalAlign: "middle", display: "inline-block" }} />
      Balance des données
    </h3>
    <div className="stage-help" style={{ fontSize: 18, color: "#6C7A63", marginBottom: 30, fontWeight: 600 }}>Rééquilibre les exemples pour que les deux groupes soient représentés équitablement.</div>
    <div className="balance-meter" style={{ display: "flex", gap: 40, alignItems: "flex-end", marginBottom: 40, background: "#FFF", padding: 40, borderRadius: 24, border: "4px solid #E4DEC6", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }}>
        <b style={{ fontSize: 24, color: "#0E3A2E" }}>Groupe A</b>
        <div style={{ position: "relative", width: 80, height: 200, background: "#F1F5F9", borderRadius: 40, overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
          <div style={{ width: "100%", height: `${(groupA / 10) * 100}%`, background: "#3B82F6", transition: "height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}></div>
        </div>
        <span style={{ fontSize: 28, fontWeight: 800, color: "#3B82F6" }}>{groupA}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "center", opacity: 0.2, marginBottom: 40 }}><Scale size={56} /></div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }}>
        <b style={{ fontSize: 24, color: "#0E3A2E" }}>Groupe B</b>
        <div style={{ position: "relative", width: 80, height: 200, background: "#F1F5F9", borderRadius: 40, overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
          <div style={{ width: "100%", height: `${(groupB / 10) * 100}%`, background: "#F59E0B", transition: "height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}></div>
        </div>
        <span style={{ fontSize: 28, fontWeight: 800, color: "#F59E0B" }}>{groupB}</span>
      </div>
    </div>
    <button
      disabled={balanced}
      onClick={transfer}
      style={{ padding: "18px 40px", fontSize: 22, fontWeight: 800, background: balanced ? "#D1FAE5" : "#0E4B3C", color: balanced ? "#065F46" : "#FFF", borderRadius: 20, border: "none", cursor: balanced ? "default" : "pointer", boxShadow: balanced ? "none" : "0 6px 0 #062B22", transition: "all 0.2s", opacity: balanced ? 0.8 : 1 }}
    >
      {balanced ? "Équilibre parfait !" : "Déplacer A → B"}
    </button>
    {balanced && <div className="stage-result" style={{ marginTop: 20, fontSize: 18, color: "#065F46", fontWeight: 700, animation: "kiPop 0.3s" }}>Palou pourra apprendre de façon plus équitable.</div>}
  </div>
}

export function ModelLabGame({ onComplete }: { onComplete: (stars?: number) => void }) {
  const rounds = [
    ["Reconnaître des mangues mûres", ["100 photos variées et bien étiquetées", "Une seule photo floue"], 0],
    ["Tester le modèle", ["Réutiliser exactement les images d'entraînement", "Utiliser de nouvelles images jamais vues"], 1],
    ["Le modèle se trompe souvent la nuit", ["Ajouter des exemples pris avec différents éclairages", "Cacher les erreurs"], 0]
  ] as const;
  const [round, setRound] = useState(0); const [score, setScore] = useState(0); const [locked, setLocked] = useState(false); const done = round === rounds.length;
  const select = (i: number) => { if (locked || done) return; setLocked(true); const ok = i === rounds[round][2]; playQuizSound(ok); const nextScore = score + (ok ? 1 : 0); setScore(nextScore); setTimeout(() => { if (round === rounds.length - 1) { setRound(rounds.length); if (nextScore >= 2) onComplete(nextScore === 3 ? 3 : 2); } else { setRound(r => r + 1); setLocked(false) } }, 650) };
  const replay = () => { setRound(0); setScore(0); setLocked(false) };

  return <div className="real-stage model-lab" style={{ textAlign: "center", padding: "10px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
    <h3 style={{ fontSize: 32, color: "#0E4B3C", margin: "0 0 10px 0" }}>
      <FlaskConical size={32} style={{ marginRight: 15, verticalAlign: "middle", display: "inline-block" }} />
      Model Lab
    </h3>
    <div className="stage-help" style={{ fontSize: 18, color: "#6C7A63", marginBottom: 30, fontWeight: 600 }}>Prends trois bonnes décisions pour faire progresser ton modèle.</div>

    {!done ? (
      <div style={{ width: "100%", maxWidth: 800, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <div className="model-accuracy" style={{ width: "100%", background: "#F1F5F9", borderRadius: 20, height: 30, position: "relative", marginBottom: 30, overflow: "hidden", border: "2px solid #CBD5E1" }}>
          <div style={{ width: `${20 + score * 26}%`, height: "100%", background: "linear-gradient(90deg, #10B981, #34D399)", transition: "width 0.5s ease-out" }} />
          <b style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: score > 1 ? "#FFF" : "#475569", fontSize: 14 }}>Qualité du modèle : {20 + score * 26}%</b>
        </div>

        <div style={{ background: "#FFF", borderRadius: 24, padding: "40px", border: "4px solid #E4DEC6", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", marginBottom: 40, width: "100%" }}>
          <div className="mission-counter" style={{ fontSize: 16, fontWeight: 800, color: "#92400E", background: "#FEF3C7", padding: "6px 16px", borderRadius: 20, marginBottom: 20, display: "inline-block" }}>
            Décision {round + 1}/3
          </div>
          <h3 style={{ fontSize: 28, color: "#0E3A2E", margin: "0 0 30px" }}>{rounds[round][0]}</h3>

          <div className="mission-choices" style={{ display: "flex", gap: 20, flexDirection: "column" }}>
            {rounds[round][1].map((option, i) => (
              <button
                disabled={locked}
                key={option}
                onClick={() => select(i)}
                style={{
                  padding: "20px 30px",
                  fontSize: 22,
                  fontWeight: 700,
                  borderRadius: 16,
                  background: locked && i === rounds[round][2] ? "#D1FAE5" : locked ? "#F1F5F9" : "#FBFAF3",
                  border: `4px solid ${locked && i === rounds[round][2] ? "#10B981" : locked ? "#E2E8F0" : "#C8F24D"}`,
                  color: "#0E3A2E",
                  cursor: locked ? "default" : "pointer",
                  transition: "all 0.2s"
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    ) : (
      <div className="stage-result" style={{ background: score >= 2 ? "#D1FAE5" : "#FEE2E2", padding: "50px", borderRadius: 32, border: `4px solid ${score >= 2 ? "#10B981" : "#EF4444"}`, maxWidth: 600, margin: "0 auto" }}>
        <b style={{ fontSize: 32, color: score >= 2 ? "#065F46" : "#991B1B", display: "block", marginBottom: 30 }}>
          {score === 3 ? "Modèle parfait ! Prêt à être testé !" : score === 2 ? "Modèle acceptable, mais perfectible." : "Le modèle a encore besoin de meilleures décisions."}
        </b>
        <span style={{ fontSize: 24, fontWeight: 700, color: "#475569", display: "block", marginBottom: 30 }}>Décisions correctes : {score}/3</span>
        {score < 2 && (
          <button
            onClick={replay}
            style={{ padding: "16px 32px", fontSize: 22, fontWeight: 700, background: "#FFF", border: "4px solid #EF4444", color: "#EF4444", borderRadius: 16, cursor: "pointer" }}
          >
            Rejouer
          </button>
        )}
      </div>
    )}
  </div>
}
