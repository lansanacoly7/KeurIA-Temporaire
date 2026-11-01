"use client";

import { Clock, KeyRound, Send, LogOut, CheckCircle2, AlertCircle, Star, X } from "lucide-react";
import type { useScreenTimeManager } from "./useScreenTimeManager";

type HookState = ReturnType<typeof useScreenTimeManager>;

export function TimeWarningBanner({ s }: { s: HookState }) {
  const { dismissBanner, setDismissBanner, childDisplayName, isLocked, remaining } = s;
  return (
    <>
      {!isLocked && !dismissBanner && remaining !== null && remaining !== undefined && remaining <= 5 && remaining > 0 && (
        <div style={{
          position: "fixed",
          top: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99990,
          background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)",
          border: "2px solid #F59E0B",
          borderRadius: 24,
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 15px 35px rgba(245, 158, 11, 0.3)",
          color: "#92400E",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          animation: "slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "#FDE68A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#B45309"
          }}>
            <Clock size={22} className="animate-pulse" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            Plus que <span style={{ color: "#B45309", fontWeight: 900, fontSize: 17 }}>{remaining} min</span> de temps d'écran pour aujourd'hui, {childDisplayName} !
          </div>
          <button 
            onClick={() => setDismissBanner(true)}
            style={{
              background: "rgba(180, 83, 9, 0.12)",
              border: "none",
              borderRadius: 12,
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: 800,
              color: "#92400E",
              marginLeft: 8,
              transition: "0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(180, 83, 9, 0.25)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(180, 83, 9, 0.12)"}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}

export function DailyLimitScreen({ s }: { s: HookState }) {
  const { status, showPasswordModal, setShowPasswordModal, parentPassword, setParentPassword, unlockError, setUnlockError, unlockSuccess, requestSent, isSubmitting, childDisplayName, handleRequestTime, handleParentUnlock, handleSignOut, isLocked, lockReason } = s;
  return (
    <>
      {isLocked && lockReason === "limit_exceeded" && (
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
          background: "radial-gradient(ellipse at top, var(--brand, #064E3B) 0%, var(--brand, #042F2E) 50%, #0F172A 100%)",
          animation: "fadeIn 0.5s ease-out"
        }}>
          {/* Halo lumineux émeraude */}
          <div style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(0,0,0,0) 70%)",
            filter: "blur(60px)",
            pointerEvents: "none"
          }} />

          {/* Carte Principale */}
          <div style={{
            position: "relative",
            maxWidth: 640,
            width: "100%",
            background: "rgba(255, 255, 255, 0.98)",
            borderRadius: 44,
            padding: "45px 40px",
            textAlign: "center",
            boxShadow: "0 30px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.4)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
            backdropFilter: "blur(20px)"
          }}>

            {/* Illustration de Palou Félicitation */}
            <div style={{
              position: "relative",
              width: 140,
              height: 140,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <div style={{
                position: "absolute",
                inset: -6,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10B981, #F59E0B)",
                opacity: 0.85,
                boxShadow: "0 15px 35px rgba(16, 185, 129, 0.4)"
              }} />
              
              <div style={{
                position: "relative",
                width: 132,
                height: 132,
                borderRadius: "50%",
                overflow: "hidden",
                background: "white",
                border: "4px solid white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <img 
                  src="/palou/Bravo !.png" 
                  alt="Palou Bravo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    transform: "scale(1.08)"
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/palou/Encouragement.png";
                  }}
                />
              </div>

              <div style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#065F46",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                border: "3px solid white"
              }}>
                <Star size={24} style={{ color: "#F59E0B" }} />
              </div>
            </div>

            {/* Badge de statut */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              borderRadius: 100,
              background: "#ECFDF5",
              color: "#047857",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: "0.02em"
            }}>
              <Clock size={18} /> Mission quotidienne accomplie
            </div>

            {/* Titre personnalisé */}
            <div>
              <h1 style={{
                margin: 0,
                fontSize: 32,
                fontWeight: 900,
                color: "#0F172A",
                letterSpacing: "-0.03em",
                fontFamily: "'Fredoka One', cursive",
                lineHeight: 1.2
              }}>
                Bravo pour tes efforts aujourd'hui, {childDisplayName} !
              </h1>

              <p style={{
                margin: "16px 0 0",
                fontSize: 17,
                lineHeight: 1.65,
                color: "#475569",
                fontWeight: 500,
                maxWidth: 520
              }}>
                Tu as atteint ta limite de temps d'écran pour aujourd'hui. 
                Repose bien tes yeux, fais le plein d'énergie et reviens demain pour vivre de{" "}
                <strong style={{ color: "#065F46", fontWeight: 800 }}>nouvelles découvertes passionnantes</strong> avec Palou !
              </p>
            </div>

            {/* Statistiques du jour */}
            <div style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              background: "#F8FAFC",
              borderRadius: 24,
              padding: "18px 24px",
              border: "1px solid #E2E8F0"
            }}>
              <div>
                <div style={{ fontSize: 13, color: "#64748B", fontWeight: 700 }}>Temps passé aujourd'hui</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0F172A", marginTop: 4 }}>
                  {status?.usageToday?.minutes ?? 0} minutes
                </div>
              </div>
              <div style={{ width: 1, height: 36, background: "#CBD5E1" }} />
              <div>
                <div style={{ fontSize: 13, color: "#64748B", fontWeight: 700 }}>Limite autorisée</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#047857", marginTop: 4 }}>
                  {status?.limits?.dailyLimitMinutes ?? 45} min
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", marginTop: 8 }}>
              {!requestSent ? (
                <button
                  onClick={handleRequestTime}
                  disabled={isSubmitting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    padding: "18px 28px",
                    borderRadius: 22,
                    background: "linear-gradient(135deg, #10B981, #059669)",
                    color: "white",
                    border: "none",
                    fontSize: 17,
                    fontWeight: 800,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    boxShadow: "0 12px 25px rgba(16,185,129,0.35)",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseOver={e => !isSubmitting && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseOut={e => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <Send size={20} /> Demander 15 minutes de plus à un parent
                </button>
              ) : (
                <div style={{
                  padding: "16px",
                  borderRadius: 22,
                  background: "#ECFDF5",
                  border: "2px solid #A7F3D0",
                  color: "#065F46",
                  fontWeight: 800,
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10
                }}>
                  <CheckCircle2 size={22} color="#059669" /> Demande transmise avec succès à ton parent !
                </div>
              )}

              <div style={{ display: "flex", gap: 14 }}>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "16px 20px",
                    borderRadius: 20,
                    background: "#F1F5F9",
                    color: "#334155",
                    border: "none",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = "#E2E8F0")}
                  onMouseOut={e => (e.currentTarget.style.background = "#F1F5F9")}
                >
                  <KeyRound size={18} /> Déverrouillage Parent
                </button>

                <button
                  onClick={handleSignOut}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "16px 20px",
                    borderRadius: 20,
                    background: "#FEE2E2",
                    color: "#991B1B",
                    border: "none",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  <LogOut size={18} /> Se déconnecter
                </button>
              </div>
            </div>

            {/* Modal Saisie Mot de Passe Parent (Jour) */}
            {showPasswordModal && (
              <div style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15, 23, 42, 0.95)",
                borderRadius: 44,
                padding: "40px 32px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(12px)",
                animation: "fadeIn 0.25s ease-out"
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#38BDF8",
                  marginBottom: 16
                }}>
                  <KeyRound size={28} />
                </div>

                <h3 style={{ margin: "0 0 8px", color: "white", fontSize: 22, fontWeight: 800 }}>
                  Autorisation Parentale
                </h3>
                <p style={{ margin: "0 0 24px", color: "#94A3B8", fontSize: 15, maxWidth: 400 }}>
                  Entrez votre mot de passe parent pour prolonger immédiatement la session de 15 minutes.
                </p>

                <form onSubmit={handleParentUnlock} style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 16 }}>
                  <input
                    type="password"
                    placeholder="Mot de passe parent"
                    value={parentPassword}
                    onChange={e => setParentPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "16px 20px",
                      borderRadius: 16,
                      border: "2px solid rgba(255,255,255,0.25)",
                      background: "rgba(255,255,255,0.1)",
                      color: "white",
                      fontSize: 17,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />

                  {unlockError && (
                    <div style={{ color: "#F87171", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertCircle size={18} /> {unlockError}
                    </div>
                  )}

                  {unlockSuccess && (
                    <div style={{ color: "#34D399", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle2 size={18} /> {unlockSuccess}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordModal(false);
                        setUnlockError("");
                      }}
                      style={{
                        flex: 1,
                        padding: "14px",
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.12)",
                        color: "white",
                        border: "none",
                        fontSize: 15,
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
                        flex: 1.5,
                        padding: "14px",
                        borderRadius: 14,
                        background: "linear-gradient(135deg, #10B981, #059669)",
                        color: "white",
                        border: "none",
                        fontSize: 15,
                        fontWeight: 800,
                        cursor: "pointer"
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
