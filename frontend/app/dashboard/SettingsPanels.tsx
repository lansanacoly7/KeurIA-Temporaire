"use client";

import { CheckCircle2, AlertCircle, Settings, User, Bell, ShieldCheck, Clock, ChevronRight, ShieldAlert, Loader2, GraduationCap } from "lucide-react";
import { signOut } from "@/app/sign-out-client";
import type { useParentSettings } from "./useParentSettings";

type HookState = ReturnType<typeof useParentSettings>;

export function SettingsToast({ s }: { s: HookState }) {
  const { toastMessage, toastType } = s;
  return (
    <>
      {toastMessage && (
        <div className="settings-toast-box" style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99999,
          maxWidth: "min(560px, calc(100vw - 32px))",
          background: toastType === "success" ? "#064E3B" : "#7F1D1D",
          color: "white",
          padding: "14px 24px",
          borderRadius: 20,
          boxShadow: "0 15px 35px rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontWeight: 700,
          fontSize: 14.5,
          animation: "fadeIn 0.25s ease-out",
          boxSizing: "border-box"
        }}>
          {toastType === "success" ? <CheckCircle2 size={22} color="#34D399" /> : <AlertCircle size={22} color="#F87171" />}
          <span style={{ wordBreak: "break-word" }}>{toastMessage}</span>
        </div>
      )}
    </>
  );
}

export function SettingsSidebar({ s }: { s: HookState }) {
  const { activeTab, setActiveTab, isHovered, setIsHovered } = s;
  return (
    <>
      <div className="settings-sidebar-wrapper" style={{ width: 300, flexShrink: 0 }}>
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 960px) {
            .settings-sidebar-wrapper {
              width: 100% !important;
            }
            .settings-sidebar-header {
              margin-bottom: 16px !important;
              gap: 12px !important;
            }
            .settings-sidebar-title {
              font-size: 24px !important;
            }
            .settings-sidebar-nav {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 8px !important;
            }
            .settings-nav-btn {
              padding: 12px 14px !important;
              border-radius: 18px !important;
              gap: 10px !important;
            }
            .settings-nav-desc {
              display: none !important;
            }
            .settings-nav-label {
              font-size: 14px !important;
              font-weight: 800 !important;
            }
            .settings-nav-arrow {
              display: none !important;
            }
          }
          @media (max-width: 480px) {
            .settings-sidebar-nav {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 6px !important;
            }
            .settings-nav-btn {
              padding: 10px 8px !important;
              border-radius: 14px !important;
              gap: 8px !important;
            }
            .settings-nav-label {
              font-size: 12.5px !important;
            }
            .settings-toast-box {
              left: 14px !important;
              right: 14px !important;
              bottom: 14px !important;
              padding: 12px 16px !important;
            }
          }
        `}} />
        <div className="settings-sidebar-header" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 35 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 18, background: "linear-gradient(135deg, #0F766E, #042F2E)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "white",
            boxShadow: "0 10px 25px rgba(15, 118, 110, 0.3)", flexShrink: 0
          }}>
            <Settings size={26} style={{ animation: "spinSlow 10s linear infinite" }} />
          </div>
          <h2 className="settings-sidebar-title" style={{ margin: 0, fontSize: 30, fontWeight: 900, color: "#134E4A", letterSpacing: "-0.02em", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Paramètres
          </h2>
        </div>

        <div className="settings-sidebar-nav" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { id: "profile", label: "Profil Parent", icon: <User size={22} />, desc: "Informations personnelles" },
            { id: "notifications", label: "Notifications", icon: <Bell size={22} />, desc: "Alertes et rapports" },
            { id: "security", label: "Sécurité", icon: <ShieldCheck size={22} />, desc: "Mots de passe et 2FA" },
            { id: "limits", label: "Limites & Temps", icon: <Clock size={22} />, desc: "Temps d'écran et horaires" }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const hovered = isHovered === tab.id;
            
            return (
              <button
                key={tab.id}
                className="settings-nav-btn"
                onMouseEnter={() => setIsHovered(tab.id)}
                onMouseLeave={() => setIsHovered(null)}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "18px 20px",
                  background: isActive ? "linear-gradient(135deg, #134e4a 0%, #0f766e 100%)" : hovered ? "white" : "transparent",
                  color: isActive ? "white" : hovered ? "#0F766E" : "#64748B",
                  border: "none",
                  borderRadius: 24, fontWeight: 700, fontSize: 16, cursor: "pointer",
                  boxShadow: isActive ? "0 12px 24px rgba(15, 118, 110, 0.3)" : hovered ? "0 4px 12px rgba(0,0,0,0.03)" : "none",
                  transform: isActive ? "scale(1.02)" : hovered ? "scale(1.01)" : "scale(1)",
                  transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)", textAlign: "left"
                }}
              >
                <div style={{
                  background: isActive ? "rgba(255,255,255,0.2)" : hovered ? "#F0FDFA" : "#F1F5F9",
                  padding: 10, borderRadius: 14, display: "flex", flexShrink: 0,
                  color: isActive ? "white" : hovered ? "#0D9488" : "#94A3B8",
                  transition: "all 0.3s"
                }}>
                  {tab.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="settings-nav-label" style={{ fontSize: 17, marginBottom: 2 }}>{tab.label}</div>
                  <div className="settings-nav-desc" style={{ fontSize: 13, fontWeight: 500, color: isActive ? "rgba(255,255,255,0.7)" : "#94A3B8", transition: "all 0.3s" }}>{tab.desc}</div>
                </div>
                {isActive && <ChevronRight size={20} className="settings-nav-arrow" style={{ opacity: 0.8, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Action : Relier mon enfant avec un code de l'école */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px dashed #E2E8F0" }}>
          <button
            type="button"
            onClick={() => s.setLinkOpen(true)}
            className="settings-link-child-btn hover-lift"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "13px 18px",
              borderRadius: 18,
              background: "linear-gradient(135deg, #0F766E 0%, #0d9488 100%)",
              color: "white",
              fontWeight: 800,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(15, 118, 110, 0.22)",
              transition: "all 0.2s ease"
            }}
          >
            <GraduationCap size={19} />
            Relier mon enfant
          </button>
          <div style={{ fontSize: 11.5, color: "#94A3B8", textAlign: "center", marginTop: 7, lineHeight: 1.35 }}>
            Code remis par l'école (format K7P-4Q2)
          </div>
        </div>
      </div>
    </>
  );
}


export function DeleteAccountDialog({ s }: { s: HookState }) {
  const { setChildren, selectedChildId, setSelectedChildId, deleteConfirm, setDeleteConfirm, actionLoading, setActionLoading, deactivatePassword, setDeactivatePassword, showToast } = s;
  const isParent = deleteConfirm?.type === "parent";
  const isSchoolChild = Boolean(deleteConfirm?.type === "child" && deleteConfirm.isSchool);
  const isFamilyChild = Boolean(deleteConfirm?.type === "child" && !deleteConfirm.isSchool);
  const needsPassword = isParent || isFamilyChild;

  return (
    <>
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease-out" }}>
          <div style={{ background: "white", width: "90%", maxWidth: 480, borderRadius: 24, padding: 32, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", color: "#DC2626", marginBottom: 20 }}>
              <ShieldAlert size={32} />
            </div>
            <h3 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 900, color: "#0F172A" }}>
              {isParent 
                ? "Désactiver mon compte parent ?" 
                : isSchoolChild 
                  ? `Retirer ${deleteConfirm.name} de votre espace ?`
                  : `Supprimer le compte de ${deleteConfirm.name} ?`}
            </h3>
            <p style={{ margin: "0 0 24px", color: "#64748B", fontSize: 15, lineHeight: 1.6 }}>
              {isParent 
                ? "Votre compte parent sera désactivé et votre session fermée. Vos données et vos enfants seront conservés : il vous suffira de vous reconnecter sur la page de connexion pour réactiver votre compte à tout moment."
                : isSchoolChild
                  ? `${deleteConfirm.name} est relié(e) via son école. Ses réglages de temps d'écran dans votre espace seront effacés. Son compte reste actif à son école, qui peut générer un nouveau code pour le relier de nouveau.`
                  : `Ce compte a été créé depuis votre espace famille. Cette action est irréversible : l'accès, le passeport, l'avatar et toute la progression de ${deleteConfirm.name} seront définitivement supprimés.`
              }
            </p>
            {needsPassword && (
              <input
                type="password"
                autoComplete="current-password"
                value={deactivatePassword}
                onChange={(e) => setDeactivatePassword(e.target.value)}
                placeholder="Votre mot de passe parent pour confirmer"
                style={{ width: "100%", padding: "14px", borderRadius: 14, border: "1px solid var(--field-border)", fontSize: 15, marginBottom: 20, boxSizing: "border-box" }}
              />
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button 
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setDeactivatePassword("");
                  setDeleteConfirm(null);
                }}
                style={{ flex: 1, padding: "14px", borderRadius: 16, background: "#F1F5F9", color: "#475569", border: "none", fontWeight: 800, fontSize: 16, cursor: actionLoading ? "not-allowed" : "pointer", transition: "background 0.2s" }}
                onMouseOver={e => !actionLoading && (e.currentTarget.style.background = "#E2E8F0")}
                onMouseOut={e => e.currentTarget.style.background = "#F1F5F9"}
              >
                Annuler
              </button>
              <button 
                type="button"
                disabled={actionLoading || (needsPassword && !deactivatePassword)}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    if (isParent) {
                      const res = await fetch("/api/auth/deactivate", {
                        method: "POST",
                        credentials: "same-origin",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ password: deactivatePassword }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        showToast(data.error || "Impossible de désactiver le compte.", "error");
                        return;
                      }
                      setDeactivatePassword("");
                      setDeleteConfirm(null);
                      await signOut("/connexion");
                    } else if (deleteConfirm.type === "child" && deleteConfirm.id) {
                      const res = await fetch(`/api/parent/children/${deleteConfirm.id}`, {
                        method: "DELETE",
                        credentials: "same-origin",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ password: deactivatePassword }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && data.ok) {
                        setChildren(prev => prev.filter(c => c.id.toString() !== deleteConfirm.id));
                        if (selectedChildId?.toString() === deleteConfirm.id) {
                          setSelectedChildId(null);
                        }
                        const msg = isSchoolChild 
                          ? `${deleteConfirm.name} a été retiré(e) de votre espace parent.`
                          : `Le compte de ${deleteConfirm.name} a été supprimé définitivement.`;
                        showToast(msg, "success");
                        setDeactivatePassword("");
                        setDeleteConfirm(null);
                      } else {
                        showToast(data.error || "Impossible de supprimer cet enfant.", "error");
                      }
                    }
                  } catch {
                    showToast("Erreur lors de la communication avec le serveur.", "error");
                  } finally {
                    setActionLoading(false);
                  }
                }}
                style={{ flex: 1, padding: "14px", borderRadius: 16, background: "#DC2626", color: "white", border: "none", fontWeight: 800, fontSize: 16, cursor: actionLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" }}
                onMouseOver={e => !actionLoading && (e.currentTarget.style.background = "#B91C1C")}
                onMouseOut={e => e.currentTarget.style.background = "#DC2626"}
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                {isParent ? "Désactiver mon compte" : isSchoolChild ? "Confirmer le retrait" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
