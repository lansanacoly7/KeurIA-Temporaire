"use client";

import { useState, useEffect } from "react";
import { User, Bell, Clock, Smartphone, Mail, Check, ShieldAlert, Shield, Activity, Moon, CheckCircle2, Loader2, Users, Lightbulb, Target, GraduationCap } from "lucide-react";
import { MyDataCard } from "./MyDataCard";
import { CustomDropdown, ModernTimePicker, ToggleSwitch } from "./SettingsControls";
import type { useParentSettings } from "./useParentSettings";

type HookState = ReturnType<typeof useParentSettings>;

export function SettingsContent({ s }: { s: HookState }) {
  const { activeTab, toggles, timeLimit, setTimeLimit, bedtimeStart, setBedtimeStart, bedtimeEnd, setBedtimeEnd, displayName, setDisplayName, email, setEmail, loadError, children, selectedChildId, setSelectedChildId, linkOpen, setLinkOpen, loading, setLoading, saving, setDeleteConfirm, savedTwoFactor, twoFactorPassword, setTwoFactorPassword, resetChildId, setResetChildId, resetPassword, setResetPassword, resetting, loadSettings, handleResetChildPassword, handleToggle, handlePushToggle, handleSaveLimits, handleSaveProfile, selectedChildObj } = s;
  return (
    <>
      <div className="settings-content-card" style={{ 
        flex: 1, background: "white", borderRadius: 40, padding: "50px", 
        border: "1px solid rgba(15, 118, 110, 0.1)", 
        boxShadow: "0 25px 60px -15px rgba(15, 118, 110, 0.1), 0 0 0 10px rgba(255,255,255,0.6) inset",
        position: "relative", overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 960px) {
            .settings-content-card {
              padding: 20px 18px !important;
              border-radius: 20px !important;
              width: 100% !important;
              box-sizing: border-box !important;
            }
            .settings-content-title {
              font-size: 19px !important;
              margin-bottom: 5px !important;
            }
            .settings-content-sub {
              font-size: 12.5px !important;
              margin-bottom: 16px !important;
            }
            .settings-card-item {
              padding: 16px 14px !important;
              border-radius: 16px !important;
            }
            .settings-save-btn {
              width: 100% !important;
              align-self: stretch !important;
              justify-content: center !important;
              padding: 12px 18px !important;
              font-size: 14px !important;
              border-radius: 12px !important;
            }
            .settings-profile-avatar {
              width: 64px !important;
              height: 64px !important;
              font-size: 24px !important;
            }
            .settings-profile-header {
              gap: 16px !important;
              padding-bottom: 20px !important;
            }
            .settings-danger-actions {
              flex-direction: column !important;
              align-items: stretch !important;
            }
            .settings-danger-actions > * {
              width: 100% !important;
              min-width: 0 !important;
            }
            .settings-time-picker-row {
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 12px !important;
            }
            .settings-time-sep {
              margin: 0 auto !important;
              align-self: center !important;
              margin-top: 0 !important;
            }
            .settings-notif-row {
              gap: 16px !important;
            }
          }
          @media (max-width: 480px) {
            .settings-content-card {
              padding: 18px 12px !important;
              border-radius: 20px !important;
            }
            .settings-card-item {
              padding: 14px 12px !important;
            }
            .settings-notif-row {
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 12px !important;
            }
            .settings-notif-row > div:last-child {
              align-self: flex-end !important;
            }
          }
        `}} />
        {/* Decorative background element */}
        <div style={{
          position: "absolute", top: -50, right: -50, width: 200, height: 200,
          background: "radial-gradient(circle, rgba(15, 118, 110,0.08) 0%, rgba(255,255,255,0) 70%)",
          borderRadius: "50%", pointerEvents: "none"
        }} />
        
        {/* TAB 1: PROFIL PARENT */}
        {loadError && (
          <div role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24, padding: "14px 18px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 16, color: "#B91C1C", fontWeight: 700, fontSize: 14 }}>
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => { setLoading(true); void loadSettings(selectedChildId); }}
              style={{ padding: "8px 16px", borderRadius: 12, border: "none", background: "#B91C1C", color: "white", fontWeight: 700, cursor: "pointer" }}
            >
              Réessayer
            </button>
          </div>
        )}

        {activeTab === "profile" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <h3 className="settings-content-title" style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 900, color: "#134E4A", letterSpacing: "-0.02em" }}>Profil Parent</h3>
            <p className="settings-content-sub" style={{ margin: "0 0 35px", color: "#64748B", fontSize: 16 }}>Gérez vos informations personnelles et identifiants.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="settings-profile-header" style={{ display: "flex", gap: 30, alignItems: "center", paddingBottom: 30, borderBottom: "1px dashed #E2E8F0" }}>
                <div className="settings-profile-avatar" style={{
                  width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg, #F59E0B, #D97706)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 36,
                  fontWeight: 900, boxShadow: "0 10px 25px rgba(245, 158, 11, 0.3)", border: "4px solid white", flexShrink: 0
                }}>
                  {displayName ? displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "PA"}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName || "Parent kEur IA"}</div>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</p>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Nom complet</label>
                <div style={{ 
                  display: "flex", alignItems: "center", background: "#F8FAFC", 
                  border: "2px solid var(--field-border)", borderRadius: 18, padding: "0 16px", transition: "all 0.2s",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
                }}>
                  <User size={20} color="#64748B" style={{ flexShrink: 0 }} />
                  <input 
                    type="text" 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)}
                    style={{ 
                      flex: 1, border: "none", background: "transparent", padding: "14px 12px", 
                      fontSize: 16, outline: "none", color: "#0F172A", fontWeight: 600, width: "100%" 
                    }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Adresse E-mail</label>
                <div style={{ 
                  display: "flex", alignItems: "center", background: "#F8FAFC", 
                  border: "2px solid var(--field-border)", borderRadius: 18, padding: "0 16px", transition: "all 0.2s",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
                }}>
                  <Mail size={20} color="#64748B" style={{ flexShrink: 0 }} />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre.email@exemple.com"
                    style={{ 
                      flex: 1, border: "none", background: "transparent", padding: "14px 12px", 
                      fontSize: 16, outline: "none", color: "#0F172A", fontWeight: 600, width: "100%" 
                    }} 
                  />
                </div>
              </div>

              <button 
                onClick={handleSaveProfile}
                disabled={saving || loading || displayName.trim().length < 2 || !email.trim() || !email.includes("@")}
                className="settings-save-btn hover-lift"
                style={{ 
                  marginTop: 6, background: "linear-gradient(135deg, #134e4a 0%, #0f766e 100%)", color: "white", 
                  border: "none", borderRadius: 18, padding: "16px 28px", fontSize: 16, fontWeight: 800, 
                  cursor: saving ? "not-allowed" : "pointer", alignSelf: "flex-start", boxShadow: "0 10px 20px rgba(15,118,110,0.3)",
                  transition: "transform 0.2s, box-shadow 0.2s", display: "flex", alignItems: "center", gap: 10
                }} 
                onMouseOver={e => !saving && (e.currentTarget.style.transform = "translateY(-2px)")} 
                onMouseOut={e => (e.currentTarget.style.transform = "translateY(0)")}
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                Sauvegarder les modifications
              </button>

              {/* Enfants rattachés au compte */}
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px dashed #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                      <Users size={20} color="#0F766E" /> Enfants rattachés au compte
                    </h4>
                    <p style={{ margin: 0, color: "#64748B", fontSize: 13.5 }}>
                      Comptes élèves reliés à votre espace parental via le code de l'école.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLinkOpen(true)}
                    className="hover-lift"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 18px",
                      borderRadius: 14,
                      background: "#F0FDF4",
                      border: "1.5px solid #0F766E",
                      color: "#0F766E",
                      fontWeight: 800,
                      fontSize: 13.5,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: "0 2px 6px rgba(15, 118, 110, 0.08)",
                    }}
                  >
                    <GraduationCap size={17} /> Relier mon enfant
                  </button>
                </div>

                {children.length === 0 ? (
                  <div style={{ padding: "16px 20px", background: "#F8FAFC", borderRadius: 16, border: "1px dashed #CBD5E1", color: "#64748B", fontSize: 13.5 }}>
                    Aucun enfant n'est actuellement rattaché à votre compte. Cliquez sur « Relier mon enfant » avec le code à 6 caractères remis par l'école.
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {children.map(child => (
                      <div
                        key={child.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 16px",
                          borderRadius: 14,
                          background: "#F8FAFC",
                          border: "1px solid #E2E8F0",
                        }}
                      >
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #0F766E, #0D9488)",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 13,
                        }}>
                          {child.displayName ? child.displayName[0].toUpperCase() : "E"}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                            {child.displayName}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748B" }}>
                            Compte relié
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Zone Dangereuse */}
              <div style={{ marginTop: 32, paddingTop: 24, borderTop: "2px dashed #FECACA" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 900, color: "#991B1B", display: "flex", alignItems: "center", gap: 8 }}>
                  <ShieldAlert size={22} style={{ flexShrink: 0 }} /> Désactiver mon compte & gérer les enfants
                </h4>
                <p style={{ margin: "0 0 16px", color: "#7F1D1D", fontSize: 14, lineHeight: 1.5 }}>
                  <strong>Compte parent :</strong> désactive votre compte et ferme votre session. Vos données et vos enfants sont conservés : une connexion suivie d'un code reçu par e-mail le réactive.<br />
                  <strong>Enfant du foyer :</strong> vous pouvez supprimer définitivement le compte d'un enfant créé par vos soins (mot de passe parent requis), ou détacher un élève relié par le code de son école.
                </p>
                <div className="settings-danger-actions" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                  <button 
                    type="button"
                    onClick={() => setDeleteConfirm({ type: "parent" })}
                    style={{ background: "white", color: "#DC2626", border: "2px solid #FECACA", borderRadius: 14, padding: "12px 20px", fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 10px rgba(220, 38, 38, 0.1)" }}
                    onMouseOver={e => e.currentTarget.style.background = "#FEF2F2"}
                    onMouseOut={e => e.currentTarget.style.background = "white"}
                  >
                    Désactiver mon compte parent
                  </button>

                  <select 
                    value=""
                    onChange={(e) => {
                      const childId = e.target.value;
                      if (childId) {
                        const childObj = children.find(c => c.id.toString() === childId);
                        const isSchool = Boolean(childObj?.isSchoolStudent || childObj?.schoolId);
                        setDeleteConfirm({
                          type: "child",
                          id: childId,
                          name: childObj?.displayName,
                          isSchool,
                        });
                      }
                    }}
                    style={{ background: "white", color: "#DC2626", border: "2px solid #FECACA", borderRadius: 14, padding: "12px 20px", fontSize: 14, fontWeight: 800, cursor: "pointer", outline: "none", boxShadow: "0 4px 10px rgba(220, 38, 38, 0.1)", minWidth: 260 }}
                  >
                    <option value="">Supprimer ou retirer un enfant ▾</option>
                    {children.map(c => {
                      const isSchool = Boolean(c.isSchoolStudent || c.schoolId);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.displayName} {isSchool ? "(Élève relié)" : "(Compte créé)"}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <h3 className="settings-content-title" style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 900, color: "#134E4A", letterSpacing: "-0.02em" }}>Notifications</h3>
            <p className="settings-content-sub" style={{ margin: "0 0 35px", color: "#64748B", fontSize: 16 }}>Gérez la façon dont kEur IA communique avec vous.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="settings-card-item settings-notif-row" style={{ 
                display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 30px", 
                background: "#F8FAFC", borderRadius: 24, border: "1px solid #E2E8F0", transition: "all 0.3s",
                boxShadow: toggles.emailNotifs ? "0 4px 20px rgba(0,0,0,0.03)" : "none",
                borderColor: toggles.emailNotifs ? "#CDECE3" : "#E2E8F0"
              }}>
                <div style={{ display: "flex", gap: 20, alignItems: "center", minWidth: 0, flex: 1 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 16, background: toggles.emailNotifs ? "#ccfbf1" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", color: toggles.emailNotifs ? "#0f766e" : "#64748B", transition: "all 0.3s", flexShrink: 0 }}>
                    <Mail size={24} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>Notifications par E-mail</h4>
                    <p style={{ margin: 0, color: "#64748b", fontSize: 15 }}>Un e-mail pour les moments importants : nouveau palier, nouveau badge, demande de temps supplémentaire.</p>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <ToggleSwitch checked={toggles.emailNotifs} onChange={() => handleToggle("emailNotifs")} />
                </div>
              </div>

              <div className="settings-card-item settings-notif-row" style={{ 
                display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 30px", 
                background: "#F8FAFC", borderRadius: 24, border: "1px solid #E2E8F0", transition: "all 0.3s",
                boxShadow: toggles.pushNotifs ? "0 4px 20px rgba(0,0,0,0.03)" : "none",
                borderColor: toggles.pushNotifs ? "#CDECE3" : "#E2E8F0"
              }}>
                <div style={{ display: "flex", gap: 20, alignItems: "center", minWidth: 0, flex: 1 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 16, background: toggles.pushNotifs ? "#ccfbf1" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", color: toggles.pushNotifs ? "#0f766e" : "#64748B", transition: "all 0.3s", flexShrink: 0 }}>
                    <Bell size={24} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>Alertes en direct (Push)</h4>
                    <p style={{ margin: 0, color: "#64748b", fontSize: 15 }}>Une notification sur cet appareil quand un enfant demande du temps, monte de palier ou gagne un badge. Le navigateur vous demandera l&apos;autorisation.</p>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <ToggleSwitch checked={toggles.pushNotifs} onChange={handlePushToggle} />
                </div>
              </div>

              <div className="settings-card-item settings-notif-row" style={{ 
                display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 30px", 
                background: "#F8FAFC", borderRadius: 24, border: "1px solid #E2E8F0", transition: "all 0.3s",
                boxShadow: toggles.weeklyReport ? "0 4px 20px rgba(0,0,0,0.03)" : "none",
                borderColor: toggles.weeklyReport ? "#CDECE3" : "#E2E8F0"
              }}>
                <div style={{ display: "flex", gap: 20, alignItems: "center", minWidth: 0, flex: 1 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 16, background: toggles.weeklyReport ? "#ccfbf1" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", color: toggles.weeklyReport ? "#0f766e" : "#64748B", transition: "all 0.3s", flexShrink: 0 }}>
                    <Activity size={24} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>Rapport Hebdomadaire</h4>
                    <p style={{ margin: 0, color: "#64748b", fontSize: 15 }}>Résumé des apprentissages de vos enfants, envoyé une fois par semaine par e-mail.</p>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <ToggleSwitch checked={toggles.weeklyReport} onChange={() => handleToggle("weeklyReport")} />
                </div>
              </div>

              <button 
                onClick={handleSaveLimits}
                disabled={saving}
                className="settings-save-btn hover-lift"
                style={{ 
                  marginTop: 10, background: "linear-gradient(135deg, #134e4a 0%, #0f766e 100%)", color: "white", 
                  border: "none", borderRadius: 20, padding: "18px 32px", fontSize: 17, fontWeight: 800, 
                  cursor: saving ? "not-allowed" : "pointer", alignSelf: "flex-start", boxShadow: "0 10px 20px rgba(15,118,110,0.3)",
                  transition: "transform 0.2s, box-shadow 0.2s", display: "flex", alignItems: "center", gap: 10
                }} 
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                Enregistrer les préférences
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SÉCURITÉ */}
        {activeTab === "security" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <h3 className="settings-content-title" style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 900, color: "#134E4A", letterSpacing: "-0.02em" }}>Sécurité du Compte</h3>
            <p className="settings-content-sub" style={{ margin: "0 0 35px", color: "#64748B", fontSize: 16 }}>Protégez l'accès à vos paramètres parentaux et aux limites.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
              <div className="settings-card-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20, padding: "30px", background: "linear-gradient(135deg, #1E293B, #0F172A)", color: "white", borderRadius: 28, boxShadow: "0 15px 30px rgba(15,23,42,0.2)" }}>
                <div style={{ display: "flex", gap: 20, alignItems: "center", flex: "1 1 260px", minWidth: 0 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 20, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38BDF8", backdropFilter: "blur(10px)", flexShrink: 0 }}>
                    <Shield size={32} />
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>Double Authentification (2FA)</h4>
                    <p style={{ margin: 0, color: "#94A3B8", fontSize: 15, maxWidth: 350, lineHeight: 1.5 }}>Après votre mot de passe, un code à 6 chiffres reçu par e-mail est demandé à chaque connexion.</p>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <ToggleSwitch checked={toggles.twoFactor} onChange={() => handleToggle("twoFactor")} />
                </div>
              </div>

              {toggles.twoFactor !== savedTwoFactor && (
                <div className="settings-card-item" style={{ padding: "24px 28px", background: "#F8FAFC", borderRadius: 24, border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: 14 }}>
                  <p style={{ margin: 0, color: "#475569", fontSize: 15, fontWeight: 600 }}>
                    {toggles.twoFactor
                      ? "Enregistrez pour activer la double authentification : un code vous sera demandé à chaque connexion."
                      : "Pour désactiver la double authentification, confirmez votre mot de passe."}
                  </p>
                  {!toggles.twoFactor && (
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={twoFactorPassword}
                      onChange={(e) => setTwoFactorPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      style={{ maxWidth: 320, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--field-border)", fontSize: 15 }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleSaveLimits}
                    disabled={saving || (!toggles.twoFactor && !twoFactorPassword)}
                    className="settings-save-btn hover-lift"
                    style={{ alignSelf: "flex-start", padding: "12px 22px", borderRadius: 14, border: "none", background: "#0D846E", color: "white", fontWeight: 800, fontSize: 15, cursor: saving ? "not-allowed" : "pointer" }}
                  >
                    {saving ? "Enregistrement…" : "Enregistrer la sécurité"}
                  </button>
                </div>
              )}
              
              <div className="settings-card-item" style={{ padding: "35px", background: "#F8FAFC", borderRadius: 28, border: "1px solid #E2E8F0" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: "#0F172A" }}>Code de déverrouillage parent</h4>
                <p style={{ margin: "0 0 20px", color: "#64748B", fontSize: 15 }}>
                  Votre mot de passe actuel sert de clé de sécurité lorsque votre enfant vous demande de débloquer la session sur sa tablette ou ordinateur.
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "#ECFDF5", borderRadius: 16, border: "1px solid #A7F3D0", color: "#065F46", fontWeight: 700 }}>
                  <CheckCircle2 size={20} color="#0f766e" style={{ flexShrink: 0 }} />
                  Code de sécurité actif et synchronisé avec votre compte.
                </div>
              </div>

              <div className="settings-card-item" style={{ padding: "35px", background: "#F8FAFC", borderRadius: 28, border: "1px solid #E2E8F0" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: "#0F172A" }}>Mot de passe de mon enfant</h4>
                <p style={{ margin: "0 0 20px", color: "#64748B", fontSize: 15 }}>
                  Votre enfant a oublié son mot de passe ? Choisissez-en un nouveau, puis communiquez-le-lui. Son ancien mot de passe ne fonctionnera plus.
                </p>
                {children.length === 0 ? (
                  <p style={{ margin: 0, color: "#94A3B8", fontSize: 14, fontWeight: 600 }}>Aucun enfant rattaché à votre compte pour le moment.</p>
                ) : (
                  <form
                    onSubmit={(e) => { e.preventDefault(); void handleResetChildPassword(); }}
                    style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 420 }}
                  >
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 800, color: "#475569" }}>
                      Enfant
                      <select
                        value={resetChildId || children[0].id.toString()}
                        onChange={(e) => setResetChildId(e.target.value)}
                        style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid var(--field-border)", fontSize: 15, background: "white", color: "#0F172A" }}
                      >
                        {children.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 800, color: "#475569" }}>
                      Nouveau mot de passe
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="8 caractères min., lettres et chiffres"
                        style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid var(--field-border)", fontSize: 15 }}
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={resetting || resetPassword.length < 8}
                      className="settings-save-btn hover-lift"
                      style={{
                        alignSelf: "flex-start", padding: "12px 22px", borderRadius: 14, border: "none",
                        background: "linear-gradient(135deg, #134e4a 0%, #0f766e 100%)", color: "white", fontWeight: 800, fontSize: 15,
                        cursor: resetting || resetPassword.length < 8 ? "not-allowed" : "pointer",
                        opacity: resetting || resetPassword.length < 8 ? 0.6 : 1
                      }}
                    >
                      {resetting ? "Enregistrement…" : "Changer son mot de passe"}
                    </button>
                  </form>
                )}
              </div>

              <MyDataCard />
            </div>
          </div>
        )}

        {/* TAB 4: LIMITES & TEMPS D'ÉCRAN */}
        {activeTab === "limits" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <div style={{ marginBottom: 28 }}>
              <h3 className="settings-content-title" style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 900, color: "#134E4A", letterSpacing: "-0.02em" }}>Limites & Temps d'Écran</h3>
              <p className="settings-content-sub" style={{ margin: 0, color: "#64748B", fontSize: 16 }}>Définissez des règles d'apprentissage saines et équilibrées.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {/* Carte Temps Limite Strict - TOUT EN HAUT */}
              <div className="settings-card-item settings-notif-row" style={{ 
                display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 30px", 
                background: toggles.strictTimeLimit ? "#FFFBEB" : "#F8FAFC", borderRadius: 24, 
                border: toggles.strictTimeLimit ? "2px solid #FCD34D" : "2px solid #E2E8F0", transition: "all 0.3s"
              }}>
                <div style={{ display: "flex", gap: 20, alignItems: "center", minWidth: 0, flex: 1 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 18, background: toggles.strictTimeLimit ? "#FDE68A" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", color: toggles.strictTimeLimit ? "#B45309" : "#64748B", transition: "all 0.3s", flexShrink: 0 }}>
                    <ShieldAlert size={26} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>Temps limite strict</h4>
                    <p style={{ margin: 0, color: "#64748b", fontSize: 15 }}>Bloquer complètement l'accès lorsque le temps est écoulé.</p>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <ToggleSwitch checked={toggles.strictTimeLimit} onChange={() => handleToggle("strictTimeLimit")} />
                </div>
              </div>

              {/* PALOU : l'assistant IA envoie les messages de l'enfant à un service tiers, le parent décide */}
              <div className="settings-card-item settings-notif-row" style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20, padding: "24px 28px",
                background: toggles.palouEnabled ? "#F0FDF4" : "#F8FAFC", borderRadius: 24,
                border: toggles.palouEnabled ? "2px solid #86EFAC" : "2px solid #E2E8F0", transition: "all 0.3s"
              }}>
                <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>Discuter avec Palou</h4>
                  <p style={{ margin: 0, color: "#64748b", fontSize: 15, lineHeight: 1.5 }}>
                    Palou est un assistant IA. Les messages de l'enfant sont traités par un service externe (adresses e-mail et numéros de téléphone masqués).
                    Éteint par défaut : Palou ne répond à un enfant que si vous l'autorisez ici.
                  </p>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <ToggleSwitch checked={toggles.palouEnabled} onChange={() => handleToggle("palouEnabled")} />
                </div>
              </div>

              {/* SÉLECTEUR AVANCÉ : TOUS LES ENFANTS OU UN ENFANT EN PARTICULIER */}
              <div className="settings-card-item" style={{
                background: "#F8FAFC",
                border: "2px solid #E2E8F0",
                borderRadius: 26,
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 14
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Target size={15} /> Appliquer la règle à :
                  </div>
                  {selectedChildId !== null && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", background: "#ccfbf1", padding: "4px 12px", borderRadius: 100 }}>
                      Règle personnalisée
                    </span>
                  )}
                  {selectedChildId === null && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0F766E", background: "#CCFBF1", padding: "4px 12px", borderRadius: 100 }}>
                      Règle générale (foyer)
                    </span>
                  )}
                </div>

                {/* Barre de boutons de sélection d'enfant */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {/* Option 1: Règle Globale (Tous les enfants) */}
                  <button
                    onClick={() => setSelectedChildId(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 22px",
                      borderRadius: 20,
                      border: selectedChildId === null ? "2px solid #0f766e" : "2px solid #E2E8F0",
                      background: selectedChildId === null ? "linear-gradient(135deg, #ECFDF5, #F0FDF4)" : "white",
                      color: selectedChildId === null ? "#065F46" : "#334155",
                      fontWeight: selectedChildId === null ? 800 : 600,
                      fontSize: 15,
                      cursor: "pointer",
                      boxShadow: selectedChildId === null ? "0 4px 14px rgba(15, 118, 110,0.15)" : "0 2px 6px rgba(0,0,0,0.02)",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      background: selectedChildId === null ? "#0f766e" : "#E2E8F0",
                      color: selectedChildId === null ? "white" : "#64748B",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <Users size={18} />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div>Tous les enfants du foyer</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#64748B" }}>Règle globale par défaut</div>
                    </div>
                  </button>

                  {/* Option 2..N: Enfants individuels */}
                  {children.map(child => {
                    const isSelected = selectedChildId === child.id;
                    const initial = child.displayName ? child.displayName[0].toUpperCase() : "E";
                    return (
                      <button
                        key={child.id}
                        onClick={() => setSelectedChildId(child.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "14px 22px",
                          borderRadius: 20,
                          border: isSelected ? "2px solid #0f766e" : "2px solid #E2E8F0",
                          background: isSelected ? "linear-gradient(135deg, #ECFDF5, #F0FDF4)" : "white",
                          color: isSelected ? "#065F46" : "#334155",
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: 15,
                          cursor: "pointer",
                          boxShadow: isSelected ? "0 4px 14px rgba(15, 118, 110,0.15)" : "0 2px 6px rgba(0,0,0,0.02)",
                          transition: "all 0.2s"
                        }}
                      >
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: 12,
                          background: isSelected ? "linear-gradient(135deg, #F59E0B, #D97706)" : "#E2E8F0",
                          color: isSelected ? "white" : "#64748B",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          fontSize: 16,
                          flexShrink: 0
                        }}>
                          {initial}
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <div>{child.displayName}</div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "#64748B" }}>
                            {child.todayMinutes} min auj.
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Option : Relier un nouvel enfant */}
                  <button
                    type="button"
                    onClick={() => setLinkOpen(true)}
                    className="hover-lift"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "14px 20px",
                      borderRadius: 20,
                      border: "2px dashed #0D9488",
                      background: "#F0FDFA",
                      color: "#0F766E",
                      fontWeight: 800,
                      fontSize: 14.5,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      background: "#0F766E",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <GraduationCap size={18} />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div>Relier un enfant</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#0F766E", opacity: 0.85 }}>Avec code école</div>
                    </div>
                  </button>
                </div>

                {/* Message informatif contextuel */}
                <div style={{ fontSize: 13, color: "#64748B", fontStyle: "italic", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <Lightbulb size={14} style={{ flexShrink: 0 }} />
                  <span>
                    {selectedChildId === null ? (
                      "Cette règle s'appliquera par défaut à tous les enfants qui n'ont pas de règle personnalisée."
                    ) : (
                      `Vous configurez actuellement les limites exclusives pour ${selectedChildObj?.displayName || "cet enfant"}.`
                    )}
                  </span>
                </div>
              </div>

              {/* Carte Durée Quotidienne */}
              <div className="settings-card-item" style={{ padding: "30px", background: "#F8FAFC", borderRadius: 28, border: "1px solid #E2E8F0" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>
                  {selectedChildId ? `Temps quotidien autorisé pour ${selectedChildObj?.displayName || "l'enfant"}` : "Temps quotidien autorisé par défaut"}
                </h4>
                <p style={{ margin: "0 0 20px", color: "#64748B", fontSize: 15 }}>Durée recommandée pour un usage modéré : 45 minutes.</p>
                
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", background: "white", border: "2px solid #E2E8F0", borderRadius: 20, padding: "0 20px", transition: "all 0.2s" }}>
                    <Smartphone size={20} color="#64748B" />
                    <CustomDropdown 
                      options={["30 minutes", "45 minutes", "1 heure", "2 heures", "Illimité"]}
                      value={timeLimit}
                      onChange={setTimeLimit}
                    />
                  </div>
                </div>
              </div>

              {/* Carte Heure du Coucher avec ModernTimePicker */}
              <div className="settings-card-item" style={{ 
                padding: "30px", 
                background: toggles.bedtimeEnabled ? "#F0F9FF" : "#F8FAFC", 
                borderRadius: 28, 
                border: toggles.bedtimeEnabled ? "2px solid #BAE6FD" : "1px solid #E2E8F0",
                transition: "all 0.3s"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>Heure du coucher (Sommeil)</h4>
                    <p style={{ margin: 0, color: "#64748B", fontSize: 15 }}>Bloque l'accès à la plateforme avec l'interface de nuit pendant ces horaires.</p>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <ToggleSwitch checked={toggles.bedtimeEnabled} onChange={() => handleToggle("bedtimeEnabled")} />
                  </div>
                </div>
                
                <div className="settings-time-picker-row" style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                  <ModernTimePicker 
                    label="Début du coucher"
                    value={bedtimeStart}
                    onChange={setBedtimeStart}
                    icon={<Moon size={22} color="#4F46E5" />}
                  />
                  <div className="settings-time-sep" style={{ 
                    width: 44, height: 44, borderRadius: "50%", background: "#E2E8F0", 
                    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#64748B", fontSize: 15,
                    alignSelf: "center", marginTop: 24, flexShrink: 0
                  }}>
                    à
                  </div>
                  <ModernTimePicker 
                    label="Fin du coucher (Réveil)"
                    value={bedtimeEnd}
                    onChange={setBedtimeEnd}
                    icon={<Clock size={22} color="#0f766e" />}
                  />
                </div>
              </div>

              {/* Bouton d'enregistrement */}
              <button 
                onClick={handleSaveLimits}
                disabled={saving}
                className="settings-save-btn hover-lift"
                style={{ 
                  background: "linear-gradient(135deg, #134e4a 0%, #0f766e 100%)", color: "white", 
                  border: "none", borderRadius: 20, padding: "20px 32px", fontSize: 18, fontWeight: 800, 
                  cursor: saving ? "not-allowed" : "pointer", alignSelf: "flex-end", boxShadow: "0 10px 25px rgba(15, 118, 110,0.3)",
                  transition: "transform 0.2s, box-shadow 0.2s", display: "flex", alignItems: "center", gap: 10
                }} 
                onMouseOver={e => !saving && (e.currentTarget.style.transform = "translateY(-2px)")} 
                onMouseOut={e => (e.currentTarget.style.transform = "translateY(0)")}
              >
                {saving ? (
                  <>
                    <Loader2 size={22} className="animate-spin" /> Enregistrement...
                  </>
                ) : (
                  <>
                    Enregistrer pour {selectedChildId ? (selectedChildObj?.displayName || "cet enfant") : "tous les enfants"} <Check size={22} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}


      </div>
    </>
  );
}

