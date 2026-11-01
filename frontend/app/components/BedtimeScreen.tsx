"use client";

import { Moon, Clock, KeyRound, LogOut, CheckCircle2, AlertCircle, Stars, Sparkles, Sun } from "lucide-react";
import type { useScreenTimeManager } from "./useScreenTimeManager";

type HookState = ReturnType<typeof useScreenTimeManager>;

export function BedtimeScreen({ s }: { s: HookState }) {
  const { status, showPasswordModal, setShowPasswordModal, parentPassword, setParentPassword, unlockError, setUnlockError, unlockSuccess, requestSent, isSubmitting, childDisplayName, handleRequestTime, handleParentUnlock, handleSignOut, isLocked, lockReason } = s;
  return (
    <>
      {isLocked && lockReason === "bedtime" && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 20px",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          overflowY: "auto",
          background: "radial-gradient(ellipse at 50% 18%, #161B3D 0%, #0D122B 45%, #050714 100%)",
          animation: "fadeIn 0.6s ease-out"
        }}>
          {/* Ciel Étoilé de Nuit, Nébuleuse & Constellations scintillantes */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            {[
              { top: "7%", left: "14%", size: 20, delay: "0s", color: "#FDE047" },
              { top: "14%", left: "84%", size: 24, delay: "1.2s", color: "#FEF08A" },
              { top: "26%", left: "8%", size: 16, delay: "0.8s", color: "#C7D2FE" },
              { top: "66%", left: "12%", size: 18, delay: "2s", color: "#FBBF24" },
              { top: "76%", left: "86%", size: 22, delay: "0.5s", color: "#E0E7FF" },
              { top: "10%", left: "64%", size: 14, delay: "1.6s", color: "#FFFBEB" },
              { top: "48%", left: "93%", size: 18, delay: "2.3s", color: "#FDE68A" },
              { top: "86%", left: "38%", size: 16, delay: "1s", color: "#FBBF24" },
              { top: "20%", left: "32%", size: 12, delay: "1.8s", color: "#DDD6FE" },
            ].map((star, i) => (
              <div 
                key={i} 
                style={{
                  position: "absolute",
                  top: star.top,
                  left: star.left,
                  color: star.color,
                  opacity: 0.85,
                  animation: `twinkle 3.5s infinite ease-in-out ${star.delay}`
                }}
              >
                <Stars size={star.size} />
              </div>
            ))}

            {/* Grande Lueur de Lune Céleste */}
            <div style={{
              position: "absolute",
              top: -60,
              right: "12%",
              width: 320,
              height: 320,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(251, 191, 36, 0.18) 0%, rgba(245, 158, 11, 0.06) 50%, transparent 75%)",
              filter: "blur(40px)"
            }} />

            {/* Douce Nébuleuse Cosmique au bas de l'écran */}
            <div style={{
              position: "absolute",
              bottom: -100,
              left: "20%",
              width: 500,
              height: 350,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.14) 0%, transparent 70%)",
              filter: "blur(60px)"
            }} />
          </div>

          {/* Halo d'Aura sous le Cocon */}
          <div style={{
            position: "absolute",
            width: 680,
            height: 680,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(245, 158, 11, 0.08) 45%, transparent 70%)",
            filter: "blur(70px)",
            pointerEvents: "none"
          }} />

          {/* Cocon Céleste : Somptueux Glassmorphism Nocturne & Harmonie Parfaite */}
          <div style={{
            position: "relative",
            maxWidth: 620,
            width: "100%",
            background: "linear-gradient(175deg, rgba(28, 35, 68, 0.88) 0%, rgba(14, 18, 42, 0.94) 100%)",
            border: "1.5px solid rgba(255, 255, 255, 0.14)",
            borderRadius: 36,
            padding: "38px 34px",
            textAlign: "center",
            boxShadow: "0 30px 90px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 0 50px rgba(99, 102, 241, 0.12)",
            backdropFilter: "blur(32px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            color: "#FFFFFF"
          }}>

            {/* Illustration de Palou qui dort dans son Cocon Céleste */}
            <div style={{
              position: "relative",
              width: 220,
              height: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "sleepFloat 4s infinite ease-in-out"
            }}>
              {/* Lueur d'Étoile et d'Oreiller Doré */}
              <div style={{
                position: "absolute",
                width: 200,
                height: 150,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(245, 158, 11, 0.28) 0%, rgba(253, 224, 71, 0.08) 55%, transparent 75%)",
                filter: "blur(20px)"
              }} />

              {/* Lettres Zzz Dorées et Scintillantes */}
              <div style={{ position: "absolute", top: 4, right: 30, display: "flex", flexDirection: "column", gap: 3, pointerEvents: "none" }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: "#F59E0B", animation: "zzzFloat 3s infinite ease-in-out", textShadow: "0 0 14px rgba(245, 158, 11, 0.7)" }}>Z</span>
                <span style={{ fontSize: 19, fontWeight: 900, color: "#FBBF24", animation: "zzzFloat 3s infinite ease-in-out 0.8s", marginLeft: 14, textShadow: "0 0 10px rgba(251, 191, 36, 0.6)" }}>z</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#FDE68A", animation: "zzzFloat 3s infinite ease-in-out 1.6s", marginLeft: 26, textShadow: "0 0 8px rgba(253, 230, 138, 0.6)" }}>z</span>
              </div>
              
              <img 
                src="/palou/Dormir.png" 
                alt="Palou qui dort"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter: "drop-shadow(0 14px 24px rgba(0, 0, 0, 0.5))",
                  animation: "sleepBreathe 3.5s infinite ease-in-out"
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/palou/Calme.png";
                }}
              />
            </div>

            {/* Badge Doux Songes */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              borderRadius: 100,
              background: "rgba(99, 102, 241, 0.18)",
              border: "1px solid rgba(165, 180, 252, 0.35)",
              color: "#C7D2FE",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.03em"
            }}>
              <Moon size={15} color="#FDE047" fill="#FDE047" /> Chut... C'est l'heure du dodo
            </div>

            {/* Titre & Message Bienveillant */}
            <div>
              <h1 style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 900,
                color: "#FFFFFF",
                letterSpacing: "-0.01em",
                fontFamily: "'Fredoka One', 'Plus Jakarta Sans', cursive",
                lineHeight: 1.28,
                textShadow: "0 2px 20px rgba(255, 255, 255, 0.2)"
              }}>
                Bonne nuit et doux rêves, <span style={{ color: "#FDE68A" }}>{childDisplayName}</span> !
              </h1>

              <p style={{
                margin: "12px auto 0",
                fontSize: 15,
                lineHeight: 1.65,
                color: "#CBD5E1",
                fontWeight: 500,
                maxWidth: 510
              }}>
                Les étoiles veillent sur toi et Palou s'est déjà endormi sur son oreiller. 
                Ferme doucement les yeux et repose-toi bien. Nous nous retrouverons demain matin dès{" "}
                <strong style={{ color: "#FDE68A", fontWeight: 800 }}>{status?.limits?.bedtimeEnd || "07:00"}</strong> pour continuer ton aventure !
              </p>
            </div>

            {/* Cadran Céleste Unifié : Le Voyage du Coucher jusqu'à l'Aube */}
            <div style={{
              width: "100%",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 22,
              padding: "16px 22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16
            }}>
              {/* Côté Nuit & Coucher */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "rgba(99, 102, 241, 0.22)",
                  border: "1px solid rgba(165, 180, 252, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#A5B4FC"
                }}>
                  <Moon size={22} fill="#A5B4FC" />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Heure du coucher
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#FFFFFF" }}>
                    {status?.limits?.bedtimeStart || "20:00"}
                  </div>
                </div>
              </div>

              {/* Pont Céleste / Nuit de Repos */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "0 8px", opacity: 0.85 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 22, height: 1, background: "linear-gradient(to right, rgba(165, 180, 252, 0.2), rgba(253, 224, 71, 0.6))" }} />
                  <Sparkles size={16} color="#FDE047" />
                  <div style={{ width: 22, height: 1, background: "linear-gradient(to right, rgba(253, 224, 71, 0.6), rgba(245, 158, 11, 0.2))" }} />
                </div>
                <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>Nuit de repos</span>
              </div>

              {/* Côté Aurore & Réveil kEur IA */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "flex-end" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#FCD34D", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Réveil kEur IA
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#FDE68A" }}>
                    {status?.limits?.bedtimeEnd || "07:00"}
                  </div>
                </div>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "rgba(245, 158, 11, 0.22)",
                  border: "1px solid rgba(251, 191, 36, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FBBF24"
                }}>
                  <Sun size={22} />
                </div>
              </div>
            </div>

            {/* Actions : Boutons Harmonieux et Chaleureux */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", marginTop: 4 }}>
              {!requestSent ? (
                <button
                  onClick={handleRequestTime}
                  disabled={isSubmitting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "16px 24px",
                    borderRadius: 18,
                    background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                    color: "#FFFFFF",
                    border: "none",
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    boxShadow: "0 10px 28px rgba(245, 158, 11, 0.38)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    textShadow: "0 1px 2px rgba(0,0,0,0.2)"
                  }}
                  onMouseOver={e => !isSubmitting && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseOut={e => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <Clock size={19} /> Demander 15 minutes à un parent
                </button>
              ) : (
                <div style={{
                  padding: "14px 20px",
                  borderRadius: 18,
                  background: "rgba(16, 185, 129, 0.16)",
                  border: "1.5px solid rgba(52, 211, 153, 0.45)",
                  color: "#34D399",
                  fontWeight: 800,
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  boxShadow: "0 4px 18px rgba(16, 185, 129, 0.2)"
                }}>
                  <CheckCircle2 size={20} color="#34D399" /> Demande envoyée à ton parent !
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "13px 18px",
                    borderRadius: 16,
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#E2E8F0",
                    border: "1.5px solid rgba(255, 255, 255, 0.14)",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)")}
                  onMouseOut={e => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
                >
                  <KeyRound size={16} color="#FBBF24" /> Code parent
                </button>

                <button
                  onClick={handleSignOut}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "13px 18px",
                    borderRadius: 16,
                    background: "rgba(244, 63, 94, 0.12)",
                    color: "#FDA4AF",
                    border: "1.5px solid rgba(244, 63, 94, 0.25)",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = "rgba(244, 63, 94, 0.2)")}
                  onMouseOut={e => (e.currentTarget.style.background = "rgba(244, 63, 94, 0.12)")}
                >
                  <LogOut size={16} color="#FB7185" /> Se déconnecter
                </button>
              </div>
            </div>

            {/* Modal de Déverrouillage Mot de Passe Parent (Harmonie Cosmique) */}
            {showPasswordModal && (
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(20, 25, 52, 0.98) 0%, rgba(10, 13, 30, 0.99) 100%)",
                borderRadius: 36,
                padding: "36px 30px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
                border: "1.5px solid rgba(255, 255, 255, 0.15)",
                animation: "fadeIn 0.2s ease-out"
              }}>
                <div style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(251, 191, 36, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FBBF24",
                  marginBottom: 14
                }}>
                  <KeyRound size={26} />
                </div>

                <h3 style={{ margin: "0 0 6px", color: "#FFFFFF", fontSize: 22, fontWeight: 800 }}>
                  Autorisation Parentale
                </h3>
                <p style={{ margin: "0 0 20px", color: "#94A3B8", fontSize: 14, maxWidth: 380 }}>
                  Entrez votre mot de passe parent pour accorder 15 minutes supplémentaires.
                </p>

                <form onSubmit={handleParentUnlock} style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 14 }}>
                  <input
                    type="password"
                    placeholder="Mot de passe parent"
                    value={parentPassword}
                    onChange={e => setParentPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "14px 18px",
                      borderRadius: 14,
                      border: "1.5px solid rgba(255, 255, 255, 0.2)",
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "#FFFFFF",
                      fontSize: 16,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />

                  {unlockError && (
                    <div style={{ color: "#F87171", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertCircle size={16} /> {unlockError}
                    </div>
                  )}

                  {unlockSuccess && (
                    <div style={{ color: "#34D399", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={16} /> {unlockSuccess}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordModal(false);
                        setUnlockError("");
                      }}
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: 12,
                        background: "rgba(255, 255, 255, 0.1)",
                        color: "#E2E8F0",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        flex: 1.4,
                        padding: "12px",
                        borderRadius: 12,
                        background: "linear-gradient(135deg, #F59E0B, #D97706)",
                        color: "white",
                        border: "none",
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: "0 6px 18px rgba(245, 158, 11, 0.3)"
                      }}
                    >
                      {isSubmitting ? "Vérification..." : "Déverrouiller"}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}

