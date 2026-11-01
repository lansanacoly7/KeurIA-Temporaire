"use client";

import { sayUi } from "./parcours79/uiVoice";
import { useEffect, useState } from "react";
import { Volume2, RotateCcw, Bot, Flag } from "lucide-react";
import { playQuizSound } from "./dashboardShared";

export function ClassifGame({ onComplete }: { onComplete: (stars?: number) => void }) {
  const rounds = [
    {
      title: "Où est le chat ?",
      correct: "chat",
      options: [
        { img: "/images/games/niv4_img1.jpg", type: "chat" },
        { img: "/images/games/niv4_img2.jpg", type: "chien" }
      ]
    },
    {
      title: "Où est le chien ?",
      correct: "chien",
      options: [
        { img: "/images/games/niv4_img3.jpg", type: "chien" },
        { img: "/images/games/niv4_img4.jpg", type: "chat" }
      ]
    },
    {
      title: "Où est le chat ?",
      correct: "chat",
      options: [
        { img: "/images/games/niv4_img5.jpg", type: "chat" },
        { img: "/images/games/niv4_img6.jpg", type: "chien" }
      ]
    },
    {
      title: "Où est le chien ?",
      correct: "chien",
      options: [
        { img: "/images/games/niv4_img7.jpg", type: "chien" },
        { img: "/images/games/niv4_img8.jpg", type: "chat" }
      ]
    }
  ];

  const [pos, setPos] = useState(0);
  const [mode, setMode] = useState<"playing" | "correction">("playing");
  const [failedSteps, setFailedSteps] = useState<number[]>([]);
  const [correctionIndex, setCorrectionIndex] = useState(0);
  
  const [feedback, setFeedback] = useState<"right" | "wrong" | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) {
      window.dispatchEvent(new CustomEvent("levelProgress", { detail: 1 }));
    } else {
      const progress = (pos + (selectedOption !== null && feedback === "right" ? 1 : 0)) / rounds.length;
      window.dispatchEvent(new CustomEvent("levelProgress", { detail: Math.min(1, progress) }));
    }
  }, [pos, selectedOption, feedback, done, rounds.length]);

  const currentRoundIndex = mode === "playing" ? pos : failedSteps[correctionIndex];
  const currentRound = rounds[currentRoundIndex];

  const choose = (index: number) => {
    if (mode === "correction") return;
    if (feedback) return;
    setSelectedOption(index);
    const isCorrect = rounds[pos].options[index].type === rounds[pos].correct;
    playQuizSound(isCorrect);
    setFeedback(isCorrect ? "right" : "wrong");
    
    setTimeout(() => {
      const isFailed = !isCorrect;
      let newFailedSteps = failedSteps;
      if (isFailed) {
        newFailedSteps = [...failedSteps, pos];
        setFailedSteps(newFailedSteps);
      }
      
      setFeedback(null);
      setSelectedOption(null);
      
      if (pos === rounds.length - 1) {
        if (newFailedSteps.length > 0) {
          setMode("correction");
          setCorrectionIndex(0);
        } else {
          setDone(true);
          onComplete(3);
        }
      } else {
        setPos(pos + 1);
      }
    }, 1500);
  };
  
  const handleNextCorrection = () => {
    if (correctionIndex === failedSteps.length - 1) {
      const mistakes = failedSteps.length;
      setDone(true);
      onComplete(mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
    } else {
      setCorrectionIndex(correctionIndex + 1);
    }
  };

  return <>
    <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url('/images/games/niveau3_bg.jpg') center/cover" }}></div>
    </div>

    <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 40, width: "100%", padding: "10px" }}>
      {/* Mascot Side */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 320 }}>

        <img src="/images/palou/game-palou-reflexion.png" alt="Palou" style={{ width: 160, animation: "kiFloatSlow 2.5s infinite alternate" }} />
        <button style={{ padding: "8px 20px", background: "#FFF", border: "3px solid #10B981", borderRadius: 999, color: "#0E4B3C", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 0 #059669" }} onClick={() => {
          if (!currentRound) return;
          void sayUi(mode === "playing" ? (currentRound.correct === "chat" ? "jeu-ou-chat" : "jeu-ou-chien") : "jeu-correction", { force: true });
        }}>
          <Volume2 size={18} /> Ecouter Palou
        </button>
      </div>

      {/* Content Side */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, maxWidth: 1000, overflow: "visible" }}>
        {!done && currentRound && (
          <>
            {/* Speech Bubble */}
            <div style={{ position: "relative", background: "#FFF", borderRadius: 24, padding: "16px 24px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", width: "100%", maxWidth: 600, textAlign: "center", marginBottom: 10 }}>
              <div style={{ position: "absolute", left: -20, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "20px solid transparent", borderBottom: "20px solid transparent", borderRight: "20px solid #FFF" }}></div>
              <h3 style={{ fontSize: 24, color: "#144C3A", margin: 0, lineHeight: 1.3, fontWeight: 900 }}>
                {mode === "playing" ? (
                  currentRound.title
                ) : (
                  <>Regarde bien !<br/>La bonne réponse était l'image encadrée en vert.</>
                )}
              </h3>
            </div>

            {mode === "playing" && (
               <div style={{ width: "100%", maxWidth: 800, textAlign: "right", fontSize: 22, color: "#6C7A63", fontWeight: 700, marginBottom: 0 }}>
                 Tour {pos + 1}/{rounds.length}
               </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: 40, width: "100%", maxWidth: 800 }}>
              {currentRound.options.map((opt, i) => {
                 let isSelected = false;
                 let borderColor = "transparent";
                 let bgColor = "#FFF";
                 
                 if (mode === "playing") {
                   isSelected = selectedOption === i;
                   if (feedback) {
                     if (isSelected) {
                       borderColor = feedback === "right" ? "#10B981" : "#EF4444";
                       bgColor = feedback === "right" ? "#D1FAE5" : "#FEE2E2";
                     } else if (opt.type === currentRound.correct) {
                       borderColor = "#10B981";
                       bgColor = "#D1FAE5";
                     }
                   }
                 } else if (mode === "correction") {
                   if (opt.type === currentRound.correct) {
                     borderColor = "#10B981";
                     bgColor = "#D1FAE5";
                     isSelected = true;
                   } else {
                     borderColor = "transparent";
                   }
                 }

                 return (
                   <button
                     key={i}
                     onClick={() => choose(i)}
                     disabled={mode === "correction" || !!feedback}
                     style={{
                       flex: 1,
                       background: bgColor,
                       padding: 10,
                       borderRadius: 32,
                       border: `8px solid ${borderColor === "transparent" ? "#E4DEC6" : borderColor}`,
                       boxShadow: (isSelected && feedback) || (mode === "correction" && isSelected) ? "0 20px 40px rgba(0,0,0,0.2)" : "0 10px 30px rgba(0,0,0,0.1)",
                       transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                       transform: (isSelected && feedback) || (mode === "correction" && isSelected) ? "scale(1.05)" : "scale(1)",
                       cursor: mode === "correction" || feedback ? "default" : "pointer",
                       display: "flex",
                       flexDirection: "column",
                       alignItems: "center",
                       justifyContent: "center",
                       height: 300,
                       maxWidth: 350,
                       opacity: mode === "correction" && opt.type !== currentRound.correct ? 0.6 : 1
                     }}>
                     <img
                       src={opt.img}
                       alt={`Option ${i+1}`}
                       style={{
                         width: "100%",
                         height: "100%",
                         objectFit: "cover",
                         borderRadius: 20
                       }}
                     />
                   </button>
                 )
              })}
            </div>
          </>
        )}
      </div>
    </div>
    
    {mode === "correction" && (
      <div style={{ position: "fixed", right: 60, bottom: 60, zIndex: 50 }}>
        <button onClick={handleNextCorrection} style={{ padding: "12px 32px", background: "#10B981", border: "none", borderRadius: 999, color: "#FFF", fontWeight: 800, fontSize: 20, cursor: "pointer", boxShadow: "0 6px 0 #059669", transition: "transform 0.1s" }} onMouseDown={e => e.currentTarget.style.transform = "translateY(6px)"} onMouseUp={e => e.currentTarget.style.transform = "translateY(0)"}>
          J'ai compris !
        </button>
      </div>
    )}
  </>
}

export function PromptGame({ onComplete }: { onComplete: () => void }) {
  const pieces = ["Format", "Contexte", "Rôle", "Objectif"] as const;
  const target = ["Rôle", "Objectif", "Contexte", "Format"];
  const [built, setBuilt] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const add = (p: string) => {
    if (built.includes(p)) return;
    playQuizSound(true);
    const next = [...built, p];
    setBuilt(next);
    if (next.length === 4) {
      if (next.every((x, i) => x === target[i])) {
        playQuizSound(true);
        setMessage("Prompt complet !");
        setTimeout(onComplete, 1500);
      } else {
        playQuizSound(false);
        setMessage("Pas dans le bon ordre.");
      }
    }
  };

  return <>
    <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url('/images/games/niveau3_bg.jpg') center/cover" }}></div>
    </div>

    <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 40, width: "100%", padding: "10px", marginTop: "-30px" }}>
      {/* Mascot Side */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 320 }}>
        {/* Speech Bubble */}
        <div style={{ position: "relative", background: "#FFF", borderRadius: 24, padding: "16px 24px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", width: "100%", textAlign: "center", marginBottom: 10 }}>
          <div style={{ position: "absolute", bottom: -20, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "20px solid transparent", borderRight: "20px solid transparent", borderTop: "20px solid #FFF" }}></div>
          <h3 style={{ fontSize: 24, color: "#144C3A", margin: 0, lineHeight: 1.3, fontWeight: 900 }}>
            La recette ROCF<br/>
            <span style={{ fontSize: 18, color: "#6C7A63", fontWeight: 700 }}>Construis la recette dans le bon ordre pour parler à l'IA !</span>
          </h3>
        </div>
        <img src="/images/palou/game-palou-reflexion.png" alt="Palou" style={{ width: 160, animation: "kiFloatSlow 2.5s infinite alternate" }} />
        <button style={{ padding: "8px 20px", background: "#FFF", border: "3px solid #10B981", borderRadius: 999, color: "#0E4B3C", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 0 #059669" }} onClick={() => {
          void sayUi("jeu-recette", { force: true });
        }}>
          <Volume2 size={18} /> Ecouter Palou
        </button>
      </div>

      {/* Content Side */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, maxWidth: 1000, overflow: "visible" }}>

        <div className="real-stage" style={{ textAlign: "center", padding: "10px", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "transparent" }}>
          <div style={{ display: "flex", gap: 15, marginBottom: 40, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 800 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                flex: "1 1 120px",
                height: 100,
                background: built[i] ? "#10B981" : "#E4DEC6",
                color: built[i] ? "#FFF" : "#A39E8A",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 20, fontSize: 24, fontWeight: 800,
                border: built[i] ? "6px solid #047857" : "6px dashed #A39E8A",
                transition: "all 0.3s",
                transform: built[i] ? "scale(1.05)" : "scale(1)",
                boxShadow: built[i] ? "0 10px 20px rgba(16,185,129,0.3)" : "none"
              }}>
                {built[i] || (i + 1)}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 600, marginBottom: 30 }}>
            {pieces.map(p => (
              <button
                key={p}
                disabled={built.includes(p)}
                onClick={() => add(p)}
                style={{
                  padding: "16px 24px",
                  fontSize: 22,
                  fontWeight: 700,
                  borderRadius: 16,
                  background: "#FFF",
                  border: "4px solid #C8F24D",
                  color: "#0E3A2E",
                  cursor: built.includes(p) ? "default" : "pointer",
                  opacity: built.includes(p) ? 0 : 1,
                  transform: built.includes(p) ? "scale(0.8)" : "scale(1)",
                  transition: "all 0.2s",
                  boxShadow: built.includes(p) ? "none" : "0 6px 0 #9DC237",
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <div style={{ minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {message && (
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div className={message === "Prompt complet !" ? "game-feedback good gm-pop-in" : "game-feedback try gm-pop-in"} style={{ margin: 0, padding: "12px 24px", borderRadius: 20, fontSize: 20 }}>
                  {message}
                </div>
                {message !== "Prompt complet !" && (
                  <button
                    onClick={() => { setBuilt([]); setMessage("") }}
                    style={{ background: "#EF4444", color: "#FFF", border: "none", padding: "12px 24px", borderRadius: 16, fontSize: 20, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 0 #B91C1C", display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    <RotateCcw size={18} /> Recommencer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </>;
}

export function RobotGame({ onComplete }: { onComplete: () => void }) {
  const [pos, setPos] = useState(0);
  const obstacles = [5, 10];

  const move = (dx: number, dy: number) => {
    const x = pos % 4, y = Math.floor(pos / 4), nx = x + dx, ny = y + dy;
    if (nx < 0 || nx > 3 || ny < 0 || ny > 3) return;
    const next = ny * 4 + nx;
    if (obstacles.includes(next)) {
      playQuizSound(false);
      return;
    }
    playQuizSound(true);
    setPos(next);
    if (next === 15) setTimeout(onComplete, 1000);
  };

  return <div className="real-stage" style={{ textAlign: "center", padding: "10px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
    <h3 style={{ fontSize: 32, color: "#0E4B3C", margin: "0 0 10px 0" }}>Le chemin de l'IA</h3>
    <div style={{ fontSize: 18, color: "#6C7A63", marginBottom: 30, fontWeight: 600 }}>Guide le robot jusqu'au drapeau sans toucher les rochers.</div>

    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40, width: "100%", maxWidth: 500 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        background: "#E4DEC6",
        padding: 16,
        borderRadius: 24,
        boxShadow: "inset 0 4px 8px rgba(0,0,0,0.1)",
        width: "100%"
      }}>
        {Array.from({ length: 16 }, (_, i) => {
          const isRob = i === pos;
          const isFlag = i === 15;
          const isObs = obstacles.includes(i);
          return <div key={i} style={{
            aspectRatio: "1",
            background: isRob ? "#C8F24D" : isFlag ? "#D1FAE5" : isObs ? "#F3F4F6" : "#FFF",
            borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 40,
            boxShadow: isRob ? "0 4px 12px rgba(157,194,55,0.5)" : "0 4px 0 rgba(0,0,0,0.05)",
            transform: isRob ? "scale(1.1)" : "scale(1)",
            transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            zIndex: isRob ? 2 : 1
          }}>
            {isRob ? <Bot size={28} color="#0E4B3C" /> : isFlag ? <Flag size={28} color="#059669" /> : isObs ? <div style={{ width: 24, height: 24, borderRadius: 6, background: "#6B7280" }} /> : ""}
          </div>
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 15, width: 240 }}>
        <div />
        <button onClick={() => move(0, -1)} style={{ padding: 20, fontSize: 30, borderRadius: 20, border: "none", background: "#4ADE80", color: "#FFF", boxShadow: "0 6px 0 #166534", cursor: "pointer", transition: "transform 0.1s" }} onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"} onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}>↑</button>
        <div />
        <button onClick={() => move(-1, 0)} style={{ padding: 20, fontSize: 30, borderRadius: 20, border: "none", background: "#60A5FA", color: "#FFF", boxShadow: "0 6px 0 #1E40AF", cursor: "pointer", transition: "transform 0.1s" }} onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"} onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}>←</button>
        <button onClick={() => move(0, 1)} style={{ padding: 20, fontSize: 30, borderRadius: 20, border: "none", background: "#4ADE80", color: "#FFF", boxShadow: "0 6px 0 #166534", cursor: "pointer", transition: "transform 0.1s" }} onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"} onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}>↓</button>
        <button onClick={() => move(1, 0)} style={{ padding: 20, fontSize: 30, borderRadius: 20, border: "none", background: "#60A5FA", color: "#FFF", boxShadow: "0 6px 0 #1E40AF", cursor: "pointer", transition: "transform 0.1s" }} onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"} onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}>→</button>
      </div>

      <div style={{ minHeight: 40 }}>
        {pos === 15 && <div className="game-feedback good gm-pop-in" style={{ margin: 0, padding: "12px 24px", borderRadius: 20, fontSize: 20 }}>Cible atteinte !</div>}
      </div>
    </div>
  </div>
}
