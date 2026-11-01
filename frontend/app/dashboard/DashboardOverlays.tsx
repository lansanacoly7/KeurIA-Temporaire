"use client";

import { sayUiIfKnown } from "./parcours79/uiVoice";
import { DefiGame } from "./AdvancedGames";
import { GAME_LEVELS } from "./games-map-data";
import { ArrowRight, RotateCcw, Star, Volume2 } from "lucide-react";
import { CelebrationSound, ConfettiOverlay } from "./dashboardShared";
import { QuizGame, RealGame } from "./DashboardActivities";
import { Gift } from "lucide-react";
import type { useDashboardState } from "./useDashboardState";

type HookState = ReturnType<typeof useDashboardState>;

export function LevelPlayOverlay({ s }: { s: HookState }) {
  const { playingLevel, setPlayingLevel, levelWon, setLevelWon, levelFeedback, setLevelFeedback, replayCount, setReplayCount, confirmQuit, setConfirmQuit, showLevelIntro, setShowLevelIntro, levelProgress, completeGameLevel } = s;
  return (
    <>
      {playingLevel && playingLevel.kind !== "coffre" && <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#FBFAF3", display: "flex", flexDirection: "column", overflowY: "auto" }}>

      {confirmQuit && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setConfirmQuit(false)}>
          <div role="presentation" style={{ background: "#FFF", borderRadius: 32, padding: "40px", maxWidth: 500, width: "90%", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <img src="/images/palou/game-palou-triste.png" alt="Palou triste" style={{ width: 140, margin: "0 auto 16px", display: "block" }} />
            <h2 style={{ fontSize: 32, fontWeight: 900, color: "#144C3A", margin: "0 0 16px" }}>Quitter le défi ?</h2>
            <p style={{ fontSize: 18, color: "#144C3A", fontWeight: 700, margin: "0 0 32px", lineHeight: 1.4 }}>
              Tu es sûr de vouloir quitter maintenant ? Ta progression sera perdue.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              <button
                onClick={() => setConfirmQuit(false)}
                style={{
                  flex: 1.25,
                  padding: "16px 24px",
                  background: "#10B981",
                  border: "none",
                  borderRadius: 20,
                  color: "#FFF",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontSize: 20,
                  boxShadow: "0 6px 0 #059669",
                  transition: "transform 0.1s",
                }}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.96) translateY(4px)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1) translateY(0)"}
              >
                Continuer à jouer
              </button>
              <button
                onClick={() => { setPlayingLevel(null); setLevelWon(null); setShowLevelIntro(false); setConfirmQuit(false); }}
                style={{
                  flex: 0.75,
                  padding: "16px 20px",
                  background: "#F3F4F6",
                  border: "1.5px solid #E5E7EB",
                  borderRadius: 20,
                  color: "#6B7280",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 18,
                  transition: "transform 0.1s",
                }}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.96)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                Quitter
              </button>
            </div>

          </div>
        </div>
      )}

      {showLevelIntro ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: `linear-gradient(rgba(255, 255, 255, ${playingLevel?.id?.startsWith("jeux7-9-") ? 0.7 : 0.85}), rgba(255, 255, 255, ${playingLevel?.id?.startsWith("jeux7-9-") ? 0.7 : 0.85})), url('${playingLevel?.id === "jeux7-9-02" ? "/images/games/niveau2_bg.jpg" : (playingLevel?.id === "jeux7-9-03" || playingLevel?.id === "jeux7-9-04") ? "/images/games/niveau3_bg.jpg" : playingLevel?.id === "jeux7-9-05" ? "/images/games/niveau5_bg.jpg" : playingLevel?.id === "jeux7-9-06" ? "/images/games/niveau6_bg.jpg" : playingLevel?.id === "jeux7-9-07" ? "/images/bg-level-7.jpg" : playingLevel?.id === "jeux7-9-08" ? "/images/bg-level-8.jpg" : playingLevel?.id === "jeux7-9-09" ? "/images/bg-level-9.jpg" : "/images/games/memory_3d_asset.jpg"}') center/cover` }}>
          <header style={{ padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FFF", borderRadius: 999, boxShadow: "0 4px 15px rgba(0,0,0,0.05)", margin: "16px 24px" }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#0E4B3C" }}>Niveau {playingLevel?.id.split("-")[2].replace(/^0+/, "")} : {playingLevel?.title}</span>
            <div style={{ flex: 1, margin: "0 40px", height: 12, background: "#F3F4F6", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${levelProgress * 100}%`, height: "100%", background: "#10B981", transition: "width 0.3s ease" }}></div>
            </div>
            <button onClick={() => setConfirmQuit(true)} style={{ width: 40, height: 40, borderRadius: "50%", background: "#FFF", border: "2px solid #E5E7EB", color: "#0E4B3C", fontSize: 24, fontWeight: "bold", cursor: "pointer", display: "grid", placeItems: "center" }}>×</button>
          </header>

          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 40px 60px", gap: 30 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <img src="/images/palou/game-palou-reflexion.png" alt="Palou réfléchit" style={{ width: 160 }} />
              <button style={{ padding: "10px 24px", background: "#FFF", border: "3px solid #10B981", borderRadius: 999, color: "#0E4B3C", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 0 #059669" }} onClick={() => {
                if (playingLevel?.id) void sayUiIfKnown(`niveau-${playingLevel.id.split("-")[2]}`, { force: true });
              }}>
                <Volume2 size={18} /> Ecouter Palou
              </button>
            </div>
            <div style={{ position: "relative", background: "#FFF", borderRadius: 40, padding: "40px 50px", maxWidth: 900, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", marginBottom: 40 }}>
              <div style={{ position: "absolute", left: -24, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "24px solid transparent", borderBottom: "24px solid transparent", borderRight: "24px solid #FFF" }}></div>
              <div style={{ margin: 0, fontSize: "42px", fontWeight: 900, color: "#0E4B3C", lineHeight: 1.2 }}>
                {playingLevel?.desc}
              </div>
            </div>
          </div>

          <div style={{ position: "absolute", right: 60, bottom: 60 }}>
            <button onClick={() => setShowLevelIntro(false)} style={{ padding: "18px 40px", background: "#10B981", border: "none", borderRadius: 999, color: "#FFF", fontWeight: 900, fontSize: 28, cursor: "pointer", boxShadow: "0 8px 0 #059669", transition: "transform 0.1s" }} onMouseDown={e => e.currentTarget.style.transform = "translateY(6px)"} onMouseUp={e => e.currentTarget.style.transform = "translateY(0)"}>
              Continuer →
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <header style={{ padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FFF", borderRadius: 999, boxShadow: "0 4px 15px rgba(0,0,0,0.05)", margin: "16px 24px", position: "sticky", top: 16, zIndex: 50 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#0E4B3C" }}>Niveau {playingLevel.id.split("-")[2].replace(/^0+/, "")} : {playingLevel.title}</span>
            <div style={{ flex: 1, margin: "0 40px", height: 12, background: "#F3F4F6", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${levelProgress * 100}%`, height: "100%", background: "#10B981", transition: "width 0.3s ease" }}></div>
            </div>
            <button onClick={() => { if (!levelWon && !levelFeedback) setConfirmQuit(true); else { setPlayingLevel(null); setLevelWon(null); setShowLevelIntro(false); } }} style={{ width: 40, height: 40, borderRadius: "50%", background: "#FFF", border: "2px solid #E5E7EB", color: "#0E4B3C", fontSize: 24, fontWeight: "bold", cursor: "pointer", display: "grid", placeItems: "center" }}>×</button>
          </header>
          <section style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 1200, margin: "0 auto", width: "100%", padding: "20px", position: "relative", justifyContent: "center" }} onClick={e => e.stopPropagation()}>

            <div>

              {!levelWon && !levelFeedback ? (
                <>
                  {playingLevel.kind === "jeu" && playingLevel.gameIndex != null && <RealGame key={playingLevel.id + "-" + replayCount} index={playingLevel.gameIndex} onComplete={(stars, feedback) => { void completeGameLevel(playingLevel.id, playingLevel.xp, playingLevel.kind, stars); if (feedback) { setLevelFeedback(feedback); setLevelWon({ stars: stars || 3 }); } else { setLevelWon({ stars: stars || 3 }); } }} />}
                  {playingLevel.kind === "quiz" && playingLevel.quizIndex != null && <QuizGame key={playingLevel.id + "-" + replayCount} index={playingLevel.quizIndex} onComplete={(stars, feedback) => { void completeGameLevel(playingLevel.id, playingLevel.xp, playingLevel.kind, stars); if (feedback) { setLevelFeedback(feedback); setLevelWon({ stars: stars || 3 }); } else { setLevelWon({ stars: stars || 3 }); } }} />}
                  {playingLevel.kind === "defi" && <DefiGame key={playingLevel.id + "-" + replayCount} onComplete={(stars) => { void completeGameLevel(playingLevel.id, playingLevel.xp, playingLevel.kind, stars); setLevelWon({ stars: stars || 3 }); }} />}
                  {/* Footer removed to save space */}
                </>
              ) : levelFeedback ? (
                <div style={{ position: "fixed", inset: 0, zIndex: 10020, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "50px 20px", background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)", animation: "gmPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)", overflow: "hidden" }}>
                  <div style={{ maxWidth: 900, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <img src="/images/palou/game-palou-reflexion.png" alt="Palou explique" style={{ width: 160, margin: "0 auto", display: "block", animation: "kiFloatSlow 2.5s infinite alternate", filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.1))" }} />
                    <h2 style={{ fontSize: 42, color: "#D97706", marginTop: 25, marginBottom: 25, fontWeight: 900 }}>Presque parfait !</h2>
                    <div style={{ background: "#FFF", border: "4px solid #FCD34D", borderRadius: 20, padding: "30px", marginBottom: 35, color: "#92400E", fontSize: 28, lineHeight: 1.5, fontWeight: 700, width: "100%", boxSizing: "border-box", boxShadow: "0 4px 15px rgba(217,119,6,0.15)" }}>
                      {levelFeedback}
                    </div>
                    <button onClick={() => setLevelFeedback(null)} style={{ padding: "20px 40px", background: "#F59E0B", border: "none", borderRadius: "20px", color: "#FFF", fontWeight: 900, cursor: "pointer", fontSize: 26, boxShadow: "0 6px 0 #B45309, 0 10px 20px rgba(245,158,11,0.3)", transition: "transform 0.1s" }} onMouseDown={e => e.currentTarget.style.transform = "translateY(6px)"} onMouseUp={e => e.currentTarget.style.transform = "translateY(0)"}>J'ai compris !</button>
                  </div>
                </div>
              ) : (
                <div style={{ position: "fixed", inset: 0, zIndex: 10020, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "50px 20px", background: "linear-gradient(135deg, #059669 0%, #047857 100%)", animation: "gmPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)", overflow: "hidden" }}>
                  <ConfettiOverlay />
                  <CelebrationSound />
                  <img
                    src={
                      levelWon?.stars === 3 ? "/images/palou/game-palou-joie.png" :
                        levelWon?.stars === 2 ? "/images/palou/game-palou-encouragement.png" :
                          "/images/palou/game-palou-triste.png"
                    }
                    alt="Palou"
                    style={{ width: 150, margin: "0 auto", display: "block", animation: "kiFloatSlow 2s infinite alternate", filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.1))" }}
                  />
                  <h2 style={{ fontSize: 48, color: "#FFC107", marginTop: 15, textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
                    {levelWon?.stars === 3 ? "Bravo !" : levelWon?.stars === 2 ? "Persévère !" : "Redouble d'efforts !"}
                  </h2>
                  <p style={{ fontSize: 24, color: "#FFD54F", marginBottom: 30, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
                    {levelWon?.stars === 3 ? "Tu as relevé ce défi avec brio." :
                      levelWon?.stars === 2 ? "Continue comme ça, tu y es presque !" :
                        "Ne te décourage pas, tu feras mieux la prochaine fois."}
                  </p>

                  <div style={{ display: "flex", justifyContent: "center", gap: 15, marginBottom: 40 }}>
                    {[1, 2, 3].map((starIdx) => (
                      <span key={starIdx} style={{ fontSize: 56, transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)", opacity: starIdx <= (levelWon?.stars || 0) ? 1 : 0.3, filter: starIdx <= (levelWon?.stars || 0) ? "drop-shadow(0 4px 10px rgba(244,182,63,0.8))" : "none", transform: starIdx <= (levelWon?.stars || 0) ? "scale(1.1) rotate(5deg)" : "scale(0.8)" }}>
                        <Star size={56} color="#f59e0b" fill={starIdx <= (levelWon?.stars || 0) ? "#f59e0b" : "none"} />
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
                    <button onClick={() => { setReplayCount(c => c + 1); setLevelWon(null); }} style={{ padding: "16px 28px", background: "#FFF", border: "3px solid #10B981", borderRadius: "20px", color: "#047857", fontWeight: 800, cursor: "pointer", fontSize: 22, transition: "all 0.2s", boxShadow: "0 4px 12px rgba(16,185,129,0.2)" }}><RotateCcw size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />Rejouer</button>
                    {(() => {
                      const currentIndex = playingLevel ? GAME_LEVELS.findIndex(l => l.id === playingLevel.id) : -1;
                      const nextLevel = currentIndex >= 0 && currentIndex < GAME_LEVELS.length - 1 ? GAME_LEVELS[currentIndex + 1] : null;

                      if (nextLevel) {
                        return (
                          <button onClick={() => {
                            setPlayingLevel(null);
                            setLevelWon(null);
                            setLevelFeedback(null);
                            setReplayCount(0);
                          }} style={{ padding: "16px 36px", background: "#C8F24D", border: "3px solid #064E3B", borderRadius: "20px", color: "#064E3B", fontWeight: 900, boxShadow: "0 6px 0 #9DC237", cursor: "pointer", fontSize: 24, transition: "transform 0.1s" }}>Suivant <ArrowRight size={22} style={{ verticalAlign: "middle" }} /></button>
                        );
                      } else {
                        return (
                          <button onClick={() => {
                            setPlayingLevel(null);
                            setLevelWon(null);
                          }} style={{ padding: "16px 36px", background: "#C8F24D", border: "3px solid #064E3B", borderRadius: "20px", color: "#064E3B", fontWeight: 900, boxShadow: "0 6px 0 #9DC237", cursor: "pointer", fontSize: 24, transition: "transform 0.1s" }}>Retour à la carte</button>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>}
    </>
  );
}

export function ChestOverlay({ s }: { s: HookState }) {
  const { playingLevel, setPlayingLevel, setLevelWon, completeGameLevel } = s;
  return (
    <>
      {playingLevel && playingLevel.kind === "coffre" && <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(14, 75, 60, 0.8)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.3s" }} onClick={() => { setPlayingLevel(null); setLevelWon(null); }}>
      <div role="presentation" style={{ background: "linear-gradient(135deg, #FFD700, #F59E0B)", padding: "40px", borderRadius: "32px", border: "6px solid #FFF", boxShadow: "0 20px 40px rgba(0,0,0,0.3)", maxWidth: 500, width: "90%", textAlign: "center", animation: "gmPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)", position: "relative" }} onClick={e => e.stopPropagation()}>
        <button onClick={() => { setPlayingLevel(null); setLevelWon(null); }} style={{ position: "absolute", top: 15, right: 15, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.3)", border: "none", fontSize: 24, fontWeight: "bold", color: "#FFF", cursor: "pointer" }}>×</button>
        <span style={{ fontSize: 100, display: "block", margin: "-80px auto 20px", filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.2))", animation: "palouFloat 3s infinite ease-in-out" }}><Gift size={100} color="#f59e0b" strokeWidth={1.6} style={{ display: "block", margin: "0 auto" }} /></span>
        <h2 style={{ fontSize: 36, color: "#FFF", marginBottom: 15, textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>Coffre aux Trésors !</h2>
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "20px", padding: "20px", marginBottom: 30 }}>
          <img src="/images/palou/Palou_Content.png" alt="Palou est content" style={{ width: 120, height: 120, objectFit: "contain", marginBottom: 10 }} />
          <p style={{ fontSize: 22, color: "#FFF", fontWeight: 700, margin: 0 }}>Palou a trouvé {playingLevel.xp} XP !</p>
        </div>
        <button onClick={(e) => {
          const btn = e.currentTarget;
          const rect = btn.getBoundingClientRect();

          const xpElem = document.createElement("div");
          xpElem.textContent = "+" + playingLevel.xp + " XP";
          xpElem.style.position = "fixed";
          xpElem.style.left = rect.left + rect.width / 2 + "px";
          xpElem.style.top = rect.top + "px";
          xpElem.style.transform = "translate(-50%, -50%)";
          xpElem.style.zIndex = "10001";
          xpElem.style.color = "#FFD700";
          xpElem.style.fontWeight = "900";
          xpElem.style.fontSize = "40px";
          xpElem.style.textShadow = "0 4px 10px rgba(0,0,0,0.5)";
          xpElem.style.transition = "all 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
          document.body.appendChild(xpElem);

          setTimeout(() => {
            xpElem.style.top = "20px";
            xpElem.style.left = "calc(50% + 150px)";
            xpElem.style.transform = "translate(-50%, -50%) scale(0.5)";
            xpElem.style.opacity = "0";
          }, 50);

          setTimeout(() => {
            document.body.removeChild(xpElem);
            void completeGameLevel(playingLevel.id, playingLevel.xp, playingLevel.kind, 3);
            setPlayingLevel(null);
            setLevelWon(null);
          }, 1500);

          btn.style.pointerEvents = "none";
          btn.style.opacity = "0.5";
        }} style={{ padding: "16px 36px", background: "#FFF", border: "none", borderRadius: "20px", color: "#D97706", fontWeight: 900, boxShadow: "0 6px 0 rgba(0,0,0,0.1)", cursor: "pointer", fontSize: 24, transition: "transform 0.1s" }}
          onMouseDown={e => e.currentTarget.style.transform = "translateY(6px)"} onMouseUp={e => e.currentTarget.style.transform = "translateY(0)"}>
          Récupérer mon trésor
        </button>
      </div>
    </div>}
    </>
  );
}

export function AgeJourneyPanel({ s }: { s: HookState }) {
  const { age } = s;
  return (
    <>
      {age === "7-9" && (
      <style dangerouslySetInnerHTML={{
        __html: `
               .kids-theme, .kids-theme * {
          font-family: 'Fredoka One', 'Baloo 2', cursive !important;
        }
        .kids-theme .lms-side nav button, .kids-theme .lms-side nav a {
          font-size: 1.15rem !important;
          padding: 13px 14px;
        }
        .kids-theme .lms-side.collapsed nav button, .kids-theme .lms-side.collapsed nav a {
          padding: 12px 0 !important;
          justify-content: center !important;
        }
        .kids-theme .lms-side.collapsed nav button .nav-text, .kids-theme .lms-side.collapsed nav a .nav-text {
          display: none !important;
        }
        @media (min-width: 761px) {
          .kids-theme .welcome-row h1, .kids-theme .adult h1 {
            font-size: 2.8rem;
          }
          .kids-theme .track-hero h2 {
            font-size: 2.2rem;
          }
          .kids-theme .track-hero button {
            font-size: 1.25rem !important;
            padding: 18px 32px !important;
          }
          .kids-theme .course-card h3 {
            font-size: 1.6rem;
          }
          .kids-theme .course-card p {
            font-size: 1.1rem;
            line-height: 1.6;
          }
          .kids-theme .lms-top, .kids-theme .userline {
            font-size: 1.2rem;
          }
        }
        .kids-theme .age-tabs button {
          font-size: 1.1rem;
        }
        .kids-theme .lms-side nav {
          margin-bottom: 22px;
        }
        .kids-theme .side-card {
          margin-top: auto;
        }
        .kids-theme .side-card b {
          font-size: 1.2rem;
        }
        .kids-theme .side-card small {
          font-size: 1rem;
        }
        .kids-theme .side-card button {
          font-size: 1rem;
          padding: 12px;
        }
      `}} />
    )}
    </>
  );
}
