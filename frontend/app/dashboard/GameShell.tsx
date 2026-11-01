import React, { useState, useEffect } from "react";
import "./kids-shared.css";
import { randomInt, randomFloat } from "../utils/random";

export type GameShellProps = {
  title: string;
  progress: number;
  palouImg?: string;
  palouText: string;
  introText?: string;
  feedback?: { text: string; isCorrect: boolean } | null;
  bgImage?: string;
  onClose: () => void;
  onGameStart?: () => void;
  hideSpeechBubbleInGame?: boolean;
  children: React.ReactNode;
};

export default function GameShell({
  title,
  progress,
  palouImg = "game-palou-main.png",
  palouText,
  introText,
  feedback,
  bgImage,
  onClose,
  onGameStart,
  hideSpeechBubbleInGame = false,
  children,
}: GameShellProps) {
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    setShowIntro(true);
  }, [title]);

  // Simple particle system simulation for ambient stars/bubbles
  useEffect(() => {
    const p = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: randomFloat() * window.innerWidth,
      y: randomFloat() * window.innerHeight,
      color: ["var(--brand-accent, #C8F24D)", "#FFFFFF", "#F4B63F"][randomInt(3)],
    }));
    setParticles(p);
  }, []);

  const currentText = (showIntro && introText) ? introText : palouText;

  return (
    <div className="p11-full-screen" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "radial-gradient(circle at center, #f4f9f1 0%, var(--brand-tint, #eaf5df) 100%)", overflow: "hidden" }}>
      {bgImage && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0, opacity: 0.4, filter: "blur(3px)",
          backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center",
        }} />
      )}
      {/* Starry bg */}
      <div className="p11-stars-bg" style={{ zIndex: 1, position: "relative" }} />

      {/* Particle FX layer */}
      <div className="p11-particle-layer">
        {particles.map((p, i) => {
          const angle = (i / particles.length) * Math.PI * 2;
          const dist = 60 + randomFloat() * 80;
          const dx = Math.cos(angle) * dist;
          const dy = Math.sin(angle) * dist - 60;
          return (
            <div
              key={p.id}
              className="p11-particle"
              style={{
                left: p.x - 6,
                top: p.y - 6,
                background: p.color,
                ...({ "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties),
                animationDelay: `${(i % 4) * 0.05}s`
              }}
            />
          );
        })}
      </div>

      {/* Header */}
      <div className="p11-header">
        <span style={{ color: "var(--brand, #1a3a2a)", fontWeight: 800, fontSize: "1.1rem", textShadow: "0 1px 3px rgba(255,255,255,0.8)" }}>
          {title}
        </span>
        <div className="p11-progress">
          <div className="p11-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <button className="p11-close-btn" onClick={() => setShowQuitConfirm(true)}>×</button>
      </div>

      {/* Main scene */}
      <div className="p11-scene">
        {/* Left panel: Palou */}
        <div className="p11-palou-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img
            src={`/images/palou/${palouImg}`}
            className="p11-palou-img"
            alt="Palou"
          />
        </div>

        {feedback && !showIntro && (
          <div className={`p11-feedback ${feedback.isCorrect ? "" : "error"}`}>
            {feedback.text}
          </div>
        )}

        {/* Right panel: Content */}
        <div className="p11-content-panel">
          {(!hideSpeechBubbleInGame || showIntro) && (
            <div className="p11-dialogue-container" style={showIntro ? { flex: 1, justifyContent: "center" } : {}}>
              <div className="p11-speech" style={showIntro ? { fontSize: "clamp(30px, 3.5vw, 42px)", lineHeight: 1.4 } : {}}>
                {currentText}
              </div>
            </div>
          )}

          {showIntro ? (
            <div style={{ position: "absolute", bottom: 30, right: 30 }}>
              <button
                onClick={() => {
                  setShowIntro(false);
                  if (onGameStart) onGameStart();
                }}
                style={{
                  background: "#10B981", color: "#FFF", border: "none", borderRadius: 30, padding: "20px 50px", fontSize: "2rem", fontWeight: "900", cursor: "pointer", boxShadow: "0 8px 0 #059669", transition: "transform 0.1s"
                }}
                onMouseDown={e => e.currentTarget.style.transform = "translateY(8px)"}
                onMouseUp={e => e.currentTarget.style.transform = "translateY(0)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                Continuer &rarr;
              </button>
            </div>
          ) : (
            <div style={{ flex: 1, position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {children}
            </div>
          )}
        </div>
      </div>

      {showQuitConfirm && (
        <div className="p11-modal-overlay" style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(14,58,46,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="p11-modal-box gm-pop-in" style={{ position: "relative", background: "#fff", padding: "50px 30px 30px", borderRadius: 24, textAlign: "center", maxWidth: 400, marginTop: 50 }}>
            
            <img 
              src="/images/palou/game-palou-triste.png" 
              alt="Palou triste" 
              style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 120 }} 
            />

            <h2 style={{ fontSize: "1.8rem", color: "var(--brand, #1a3a2a)", margin: "0 0 20px" }}>Quitter le défi ?</h2>
            <p style={{ fontSize: "1.2rem", color: "#4a5a4a", margin: "0 0 30px" }}>Tu es sûr de vouloir quitter maintenant ? Ta progression sera perdue.</p>
            
            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
              <button 
                onClick={() => setShowQuitConfirm(false)}
                style={{
                  padding: "14px 28px",
                  fontSize: "1.2rem",
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: 14,
                  cursor: "pointer",
                  fontWeight: 900,
                  boxShadow: "0 4px 0 #059669",
                  fontFamily: "inherit",
                  transition: "transform 0.1s"
                }}
              >
                Continuer à jouer
              </button>
              <button 
                onClick={onClose}
                style={{
                  padding: "14px 22px",
                  fontSize: "1.1rem",
                  background: "#f3f4f6",
                  color: "#6b7280",
                  border: "1.5px solid #e5e7eb",
                  borderRadius: 14,
                  cursor: "pointer",
                  fontWeight: 800,
                  fontFamily: "inherit"
                }}
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
