"use client";

import { sayUi } from "./parcours79/uiVoice";
import { useEffect, useState } from "react";
import { Volume2, Check, X, Target, Eye } from "lucide-react";
import { gameChallenges, playQuizSound } from "./dashboardShared";
import { shuffle } from "../utils/random";

export function JeVoisIAGame({ onComplete }: { onComplete: (stars?: number, feedback?: React.ReactNode) => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (index: number, isAI: boolean) => {
    if (selected !== null) return;
    setSelected(index);
    if (isAI) {
      playQuizSound(true);
      setTimeout(() => onComplete(3), 1500);
    } else {
      playQuizSound(false);
      setTimeout(() => onComplete(1, "Un vrai chien qui joue avec une balle est très intelligent, mais ce n'est pas de l'Intelligence Artificielle ! Le robot, lui, utilise un programme d'IA pour comprendre l'enfant."), 3000);
    }
  };

  return <div className="real-stage" style={{ textAlign: "center", padding: "10px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
    <h3 style={{ fontSize: 32, color: "#0E4B3C", margin: "0 0 30px 0" }}>Lequel utilise l'Intelligence Artificielle ?</h3>

    <div style={{ display: "flex", gap: "30px", justifyContent: "center", flexWrap: "wrap", width: "100%", maxWidth: 800 }}>
      <button
        onClick={() => handleSelect(0, true)}
        style={{
          flex: "1 1 300px",
          border: selected === 0 ? "8px solid #10B981" : "6px solid #E4DEC6",
          borderRadius: 32,
          background: "#FFF",
          padding: 16,
          cursor: selected !== null ? "default" : "pointer",
          transition: "transform 0.2s, box-shadow 0.2s",
          transform: selected === 0 ? "scale(1.03)" : selected !== null ? "scale(0.95)" : "scale(1)",
          boxShadow: selected === 0 ? "0 10px 20px rgba(16,185,129,0.3)" : "0 4px 10px rgba(0,0,0,0.05)",
          opacity: selected === 1 ? 0.5 : 1
        }}
      >
        <img src="/images/games/robot-ia.jpg" alt="Un robot qui aide un enfant" style={{ width: "100%", height: 260, borderRadius: 20, objectFit: "cover" }} />
        <div style={{ fontSize: 24, fontWeight: 700, margin: "16px 0 8px 0", color: "#0E3A2E" }}>Un robot tuteur</div>
      </button>

      <button
        onClick={() => handleSelect(1, false)}
        style={{
          flex: "1 1 300px",
          border: selected === 1 ? "8px solid #EF4444" : "6px solid #E4DEC6",
          borderRadius: 32,
          background: "#FFF",
          padding: 16,
          cursor: selected !== null ? "default" : "pointer",
          transition: "transform 0.2s, box-shadow 0.2s",
          transform: selected === 1 ? "scale(1.03)" : selected !== null ? "scale(0.95)" : "scale(1)",
          boxShadow: selected === 1 ? "0 10px 20px rgba(239,68,68,0.3)" : "0 4px 10px rgba(0,0,0,0.05)",
          opacity: selected === 0 ? 0.5 : 1
        }}
      >
        <img src="/images/games/chien-non-ia.jpg" alt="Un chien qui joue avec une balle" style={{ width: "100%", height: 260, borderRadius: 20, objectFit: "cover" }} />
        <div style={{ fontSize: 24, fontWeight: 700, margin: "16px 0 8px 0", color: "#0E3A2E" }}>Un vrai chien</div>
      </button>
    </div>

    <div style={{ minHeight: 80, marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {selected === 0 && <div className="game-feedback good gm-pop-in" style={{ fontSize: 22, padding: "16px 24px", borderRadius: 20, margin: 0 }}>Bravo ! Le robot tuteur utilise l'IA pour apprendre.</div>}
      {selected === 1 && <div className="game-feedback try gm-pop-in" style={{ fontSize: 22, padding: "16px 24px", borderRadius: 20, margin: 0 }}>Oups ! Ce n'est pas la bonne réponse.</div>}
    </div>
  </div>;
}

export function QuizGame({ index, onComplete }: { index: number; onComplete: (stars?: number, feedback?: React.ReactNode) => void }) {
  const challenge = gameChallenges[index];
  const [answer, setAnswer] = useState<number | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const choose = (i: number) => { if (answer !== null) return; setAnswer(i); if (i !== challenge.correct) setMistakes(m => m + 1); };
  const claim = () => { if (answer !== challenge.correct || claimed) return; setClaimed(true); const stars = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1; onComplete(stars, mistakes > 0 ? challenge.tip : undefined) };
  return <div className="game-question" style={{ textAlign: "center", padding: "20px 0" }}>
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 15 }}><Target size={40} color="#0E4B3C" /></div>
    <h3 style={{ fontSize: 32, color: "#0E4B3C", marginBottom: 40, lineHeight: 1.4 }}>{challenge.question}</h3>

    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600, margin: "0 auto" }}>
      {challenge.options.map((o, i) => {
        const isSelected = answer === i;
        const isCorrect = i === challenge.correct;
        const showResult = answer !== null;

        let bgColor = "#FFF";
        let borderColor = "#E4DEC6";
        let color = "#0E3A2E";

        if (showResult) {
          if (isSelected) {
            if (isCorrect) {
              bgColor = "#D1FAE5"; borderColor = "#10B981"; color = "#065F46"; // Vert (succès)
            } else {
              bgColor = "#FEE2E2"; borderColor = "#EF4444"; color = "#991B1B"; // Rouge (erreur)
            }
          } else if (isCorrect) {
            bgColor = "#D1FAE5"; borderColor = "#10B981"; color = "#065F46"; // Vert (montrer la bonne réponse)
          }
        }

        return (
          <button
            key={o}
            disabled={showResult}
            onClick={() => choose(i)}
            style={{
              padding: "20px 30px",
              fontSize: 22,
              fontWeight: 700,
              borderRadius: 20,
              background: bgColor,
              border: `4px solid ${borderColor}`,
              color: color,
              cursor: showResult ? "default" : "pointer",
              transition: "all 0.2s",
              boxShadow: showResult ? "none" : "0 6px 0 #E4DEC6",
              transform: showResult ? (isSelected ? "scale(1.02)" : "scale(0.98)") : "translateY(0)",
              opacity: showResult && !isSelected && !isCorrect ? 0.6 : 1
            }}
          >
            {o}
          </button>
        );
      })}
    </div>

    {answer !== null && (
      <div style={{ marginTop: 40, animation: "kiPop 0.3s ease-out" }}>
        <div style={{
          background: answer === challenge.correct ? "#D1FAE5" : "#FEF3C7",
          color: answer === challenge.correct ? "#065F46" : "#92400E",
          padding: "20px 30px",
          borderRadius: 20,
          border: `3px solid ${answer === challenge.correct ? "#10B981" : "#F59E0B"}`,
          display: "inline-block",
          fontSize: 20,
          fontWeight: 600,
          marginBottom: 30
        }}>
          <b style={{ display: "block", fontSize: 24, marginBottom: 10 }}>
            {answer === challenge.correct ? "Bravo !" : "Presque !"}
          </b>
          {challenge.tip}
        </div>

        {!claimed && (
          <div>
            {answer !== challenge.correct ? (
              <button
                onClick={() => setAnswer(null)}
                style={{ padding: "16px 32px", fontSize: 22, fontWeight: 700, background: "#FFF", border: "3px solid #0E4B3C", color: "#0E4B3C", borderRadius: 16, cursor: "pointer", boxShadow: "0 4px 0 #0E4B3C" }}
              >
                Réessayer
              </button>
            ) : (
              <button
                onClick={claim}
                style={{ padding: "18px 40px", fontSize: 24, fontWeight: 800, background: "#C8F24D", border: "none", color: "#0E3A2E", borderRadius: 20, cursor: "pointer", boxShadow: "0 6px 0 #9DC237", animation: "kiPulse 1.5s infinite alternate" }}
              >
                Gagner mes {challenge.xp} XP
              </button>
            )}
          </div>
        )}
      </div>
    )}
  </div>;
}

export function MemoryGame({ onComplete }: { onComplete: (stars?: number, feedback?: React.ReactNode) => void }) {
  const [cards] = useState(() => {
    const arr = [
      { p: 0, img: "/images/games/robot-ia.jpg" },
      { p: 1, img: "/images/games/chien-non-ia.jpg" },
      { p: 2, img: "/images/games/magic-book.jpg" },
      { p: 0, img: "/images/games/robot-ia.jpg" },
      { p: 1, img: "/images/games/chien-non-ia.jpg" },
      { p: 2, img: "/images/games/magic-book.jpg" }
    ];
    return shuffle(arr);
  });
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [won, setWon] = useState(false);

  // Phase de prévisualisation : les cartes sont face visible pendant 5 secondes
  const [isPreview, setIsPreview] = useState(true);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("levelProgress", { detail: matched.length / cards.length }));
  }, [matched.length, cards.length]);

  useEffect(() => {
    if (!isPreview) return;
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          setIsPreview(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPreview]);

  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open;
    if (cards[a].p === cards[b].p) {
      playQuizSound(true);
      const next = [...matched, a, b]; setMatched(next); setOpen([]);
      if (next.length === cards.length) {
        setWon(true);
        const stars = mistakes === 0 ? 3 : mistakes < 3 ? 2 : 1;
        onComplete(stars, mistakes > 0 ? "Pour avoir 3 étoiles, essaie de bien mémoriser la position des cartes avant de les retourner !" : undefined);
      }
    } else {
      playQuizSound(false); setWrong([a, b]); setMistakes(m => m + 1);
      const timer = setTimeout(() => { setOpen([]); setWrong([]); }, 800);
      return () => clearTimeout(timer)
    }
  }, [open]);

  return <>
    {/* Full screen background matching the intro */}
    <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(251, 250, 243, 0.7), rgba(251, 250, 243, 0.7)), url('/images/games/memory_3d_asset.jpg') center/cover" }}></div>
    </div>

    <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 40, width: "100%" }}>
      {/* Mascot Side */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <img src={isPreview ? "/images/palou/game-palou-joie.png" : "/images/palou/game-palou-reflexion.png"} alt="Palou" style={{ width: 180, animation: "kiFloatSlow 2.5s infinite alternate" }} />
        <button style={{ padding: "8px 20px", background: "#FFF", border: "3px solid #10B981", borderRadius: 999, color: "#0E4B3C", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 0 #059669" }} onClick={() => {
          void sayUi(isPreview ? "jeu-memoire-apercu" : "jeu-memoire-jouer", { force: true });
        }}>
          <Volume2 size={18} /> Ecouter Palou
        </button>
        {!isPreview && open.length === 0 && matched.length === 0 && (
          <button style={{ padding: "10px 24px", background: "#FEE2E2", border: "3px solid #EF4444", borderRadius: 999, color: "#B91C1C", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 0 #DC2626" }} onClick={() => {
            setCountdown(5);
            setIsPreview(true);
          }}>
            <Eye size={18} /> Revoir les cartes
          </button>
        )}
      </div>

      {/* Content Side */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>

        {/* Speech Bubble */}
        <div style={{ position: "relative", background: "#FFF", borderRadius: 24, padding: "16px 24px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", marginTop: 0 }}>
          <div style={{ position: "absolute", left: -20, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "20px solid transparent", borderBottom: "20px solid transparent", borderRight: "20px solid #FFF" }}></div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#144C3A", lineHeight: 1.2 }}>
            {isPreview ? (
              <>Mémorise les images ! Les cartes se retournent dans <span style={{ color: "#EF4444", fontSize: "1.1em" }}>{countdown}</span> secondes...</>
            ) : "À toi de jouer ! Retrouve les paires."}
          </h2>
        </div>

        {/* Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {cards.map((c, i) => {
            const show = isPreview || open.includes(i) || matched.includes(i);
            const isWrong = wrong.includes(i);
            const isMatched = matched.includes(i);
            return <button
              key={i}
              disabled={isPreview || show || open.length === 2}
              onClick={() => setOpen(o => [...o, i])}
              style={{
                aspectRatio: "1",
                borderRadius: 24,
                border: show ? (isMatched ? "6px solid #10B981" : isWrong ? "6px solid #EF4444" : "6px solid #FFFBEB") : "6px solid #C8F24D",
                background: show ? "#FFF" : "#164E3D",
                cursor: (isPreview || show) ? "default" : "pointer",
                boxShadow: show ? (isMatched ? "0 8px 0 #059669" : isWrong ? "0 8px 0 #B91C1C" : "0 8px 0 #E4DEC6") : "0 8px 0 #9DC237",
                transform: "translateY(0)",
                transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                padding: show ? 8 : 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}
              onMouseDown={e => { if (!isPreview && !show) e.currentTarget.style.transform = "translateY(6px)"; }}
              onMouseUp={e => { if (!isPreview && !show) e.currentTarget.style.transform = "translateY(0)"; }}
              onMouseLeave={e => { if (!isPreview && !show) e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {show ? (
                <img src={c.img} alt="Card" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12, animation: "gmPop 0.3s ease" }} />
              ) : (
                <div style={{ fontSize: 100, color: "#C8F24D", fontWeight: 900 }}>?</div>
              )}
            </button>
          })}
        </div>
      </div>
    </div>

    {won && (
      <div style={{ position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)", background: "#10B981", color: "#FFF", padding: "16px 32px", borderRadius: 999, fontSize: 24, fontWeight: 900, boxShadow: "0 10px 30px rgba(16,185,129,0.3)", animation: "gmPop 0.5s ease", zIndex: 20 }}>
        Toutes les paires sont trouvées !
      </div>
    )}
  </>
}

export function DetectIAGame({ onComplete }: { onComplete: (stars?: number, feedback?: React.ReactNode) => void }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [mistakesCount, setMistakesCount] = useState(0);

  const questions = [
    [
      { id: 0, src: "/images/games/cubes.jpg", isIA: false },
      { id: 1, src: "/images/games/ai_object.jpg", isIA: true }
    ],
    [
      { id: 0, src: "/images/games/ai_robot.jpg", isIA: true },
      { id: 1, src: "/images/games/traffic_light.jpg", isIA: false }
    ],
    [
      { id: 0, src: "/images/games/ai_speaker.jpg", isIA: true },
      { id: 1, src: "/images/games/desk_lamp.jpg", isIA: false }
    ]
  ];

  const images = questions[step];

  useEffect(() => {
    const progress = (step + (selected !== null ? 1 : 0)) / questions.length;
    window.dispatchEvent(new CustomEvent("levelProgress", { detail: Math.min(1, progress) }));
  }, [step, selected, questions.length]);

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    
    setSelected(index);
    const isCorrect = images[index].isIA;
    playQuizSound(isCorrect);
    
    let currentMistakes = mistakesCount;
    if (!isCorrect) {
      currentMistakes += 1;
      setMistakesCount(currentMistakes);
    }
    
    setTimeout(() => {
      if (step === questions.length - 1) {
        onComplete(currentMistakes === 0 ? 3 : currentMistakes <= 1 ? 2 : 1);
      } else {
        setStep(step + 1);
        setSelected(null);
      }
    }, 2000);
  };

  return <>
    {/* Full screen background matching the intro */}
    <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(251, 250, 243, 0.7), rgba(251, 250, 243, 0.7)), url('/images/games/niveau2_bg.jpg') center/cover" }}></div>
    </div>

    <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 40, width: "100%", padding: "10px" }}>
    
    {/* Mascot Side */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <img src="/images/palou/game-palou-reflexion.png" alt="Palou" style={{ width: 180, animation: "kiFloatSlow 2.5s infinite alternate" }} />
      <button style={{ padding: "8px 20px", background: "#FFF", border: "3px solid #10B981", borderRadius: 999, color: "#0E4B3C", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 0 #059669" }} onClick={() => {
        void sayUi("jeu-image-ia", { force: true });
      }}>
        <Volume2 size={18} /> Ecouter Palou
      </button>
    </div>

    {/* Content Side */}
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, maxWidth: 800 }}>
      
      {/* Speech Bubble */}
      <div style={{ position: "relative", background: "#FFF", borderRadius: 24, padding: "16px 24px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", width: "100%", textAlign: "center" }}>
        <div style={{ position: "absolute", left: -20, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "20px solid transparent", borderBottom: "20px solid transparent", borderRight: "20px solid #FFF" }}></div>
        <h3 style={{ fontSize: 24, color: "#144C3A", margin: 0, lineHeight: 1.3, fontWeight: 900 }}>
          Entre ces deux images, <br/>laquelle montre l'utilisation de l'IA ?
        </h3>
      </div>

      <div style={{ display: "flex", gap: 20, justifyContent: "center", width: "100%" }}>
        {images.map((img, idx) => {
          const isSelected = selected === idx;
          let borderColor = "#E4DEC6";
          
          if (isSelected) {
             borderColor = img.isIA ? "#10B981" : "#EF4444";
          }
          
          return (
            <button
              key={idx}
              disabled={selected !== null}
              onClick={() => handleSelect(idx)}
              style={{
                flex: 1,
                padding: 10,
                position: "relative",
                background: "#FFF",
                borderRadius: 24,
                border: `4px solid ${borderColor}`,
                boxShadow: isSelected ? "0 10px 20px rgba(0,0,0,0.2)" : "0 5px 15px rgba(0,0,0,0.1)",
                transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: isSelected ? "scale(0.95)" : "scale(1)",
                cursor: selected !== null ? "default" : "pointer",
                overflow: "hidden"
              }}
            >
              <img src={img.src} alt="Choix" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 14 }} />
              {isSelected && (
                <div style={{ position: "absolute", top: 10, right: 10, background: img.isIA ? "#10B981" : "#EF4444", color: "#FFF", width: 40, height: 40, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: "bold", boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }}>
                  {img.isIA ? <Check size={24} strokeWidth={3} /> : <X size={24} strokeWidth={3} />}
                </div>
              )}
            </button>
          );
      })}
      </div>
      </div>
    </div>
  </>
}
