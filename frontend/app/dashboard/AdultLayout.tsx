"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "../sign-out-client";
import { LayoutDashboard, FileText, Settings, School, Target, BarChart3, LogOut, Menu, X, HeartHandshake, Compass, ShieldCheck } from "lucide-react";
import ParentNotificationCenter from "../components/ParentNotificationCenter";

type AdultLayoutProps = {
  role: "parent" | "enseignant";
  userName: string;
  userEmail: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  NotifBellComponent?: React.ReactNode;
};

// Icônes par onglet
const PARENT_MENU = [
  { id: "overview",  label: "Le Journal du Foyer",    icon: HeartHandshake },
  { id: "children",  label: "Carnets d'Explorateurs", icon: Compass },
  { id: "settings",  label: "Équilibre & Sérénité",    icon: ShieldCheck },
];

const TEACHER_MENU = [
  { id: "overview",  label: "Vue d'ensemble",   icon: LayoutDashboard },
  { id: "classes",   label: "Mes Classes",       icon: School },
  { id: "missions",  label: "Missions & Devoirs", icon: Target },
  { id: "analytics", label: "Analytiques",       icon: BarChart3 },
  { id: "settings",  label: "Paramètres",        icon: Settings },
];

export function AdultLayout({
  role,
  userName,
  userEmail,
  activeTab,
  onTabChange,
  children,
  NotifBellComponent,
}: AdultLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = role === "enseignant" ? TEACHER_MENU : PARENT_MENU;

  // Initiales pour l'avatar utilisateur
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh / var(--app-zoom, 1))", backgroundColor: role === "parent" ? "#FAF8F5" : "#f4f7f6", color: "#173e3c", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Overlay mobile */}
      <div role="presentation"
        className="mobile-overlay"
        onClick={() => setIsSidebarOpen(false)}
        style={{
          position: "fixed", inset: 0,
          backgroundColor: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 40,
          opacity: isSidebarOpen ? 1 : 0,
          pointerEvents: isSidebarOpen ? "auto" : "none",
          transition: "opacity 0.3s ease-out",
        }}
      />

      {/* ─── Sidebar ─────────────────────────────────────────── */}
      <aside style={{
        position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 50,
        width: 264,
        background: role === "parent" ? "linear-gradient(180deg, #0e3b33 0%, #082620 100%)" : "linear-gradient(180deg, #173e3c 0%, #0d2e2c 100%)",
        color: "white",
        transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
        boxShadow: "6px 0 24px rgba(0,0,0,0.18)",
      }}>

        {/* Logo kEur IA officiel (identique à l'espace enfant : juste le logo, aucun texte) */}
        <div style={{
          padding: "20px 20px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10
        }}>
          <Link
            className="lms-logo"
            href="/dashboard"
            title="kEur IA — Accueil"
            aria-label="kEur IA — Accueil"
            style={{ textDecoration: "none", display: "inline-block" }}
          >
            <img
              src="/images/keur-ia-logo.png"
              alt="kEur IA — Apprendre, jouer, créer"
            />
          </Link>

          {/* Bouton fermeture mobile */}
          <button
            className="menu-btn"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Fermer le menu"
            style={{
              background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8,
              padding: 6, cursor: "pointer", color: "white", display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "20px 12px", flex: 1 }}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => { onTabChange(item.id); setIsSidebarOpen(false); }}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 14px", borderRadius: 14, border: "none",
                  backgroundColor: isActive ? "rgba(13,132,110,0.35)" : "transparent",
                  color: isActive ? "white" : "#a5d6c9",
                  fontWeight: isActive ? 700 : 500, fontSize: 14.5,
                  cursor: "pointer", textAlign: "left",
                  marginBottom: 4, transition: "all 0.18s ease",
                  borderLeft: isActive ? "3px solid #d9ef59" : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.color = "white";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#a5d6c9";
                  }
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bas : Utilisateur + Déconnexion */}
        <div style={{
          padding: "16px", borderTop: "1px solid rgba(255,255,255,0.08)",
        }}>
          {/* Avatar + nom */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px", borderRadius: 14,
            background: "rgba(255,255,255,0.05)", marginBottom: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #0d846e, #d9ef59)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 14, color: "#173e3c", flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{
                fontWeight: 700, fontSize: 13,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{userName}</div>
              <div style={{
                color: "#a5d6c9", fontSize: 11,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{userEmail}</div>
            </div>
          </div>

          {/* Bouton déconnexion */}
          <button
            onClick={() => signOut("/connexion")}
            style={{
              width: "100%", padding: "11px 14px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              backgroundColor: "transparent", color: "#a5d6c9",
              cursor: "pointer", fontSize: 13, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.15)";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
              e.currentTarget.style.color = "#fca5a5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              e.currentTarget.style.color = "#a5d6c9";
            }}
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* ─── Zone de contenu principal ───────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media (min-width: 1024px) {
            aside { transform: translateX(0) !important; }
            .main-content { padding-left: calc(264px + 40px) !important; }
            .menu-btn-open { display: none !important; }
            .mobile-overlay { display: none !important; }
          }
          @media (max-width: 1023px) {
            .menu-btn { display: flex !important; }
            .menu-btn-open { display: flex !important; }
            header.adult-header { padding: 0 22px !important; height: 66px !important; }
            main.adult-main { padding: 24px 22px 110px !important; }
            .adult-tab-title { font-size: 16px !important; }
            .adult-tab-subtitle { font-size: 10.5px !important; }
            .adult-tab-icon { width: 36px !important; height: 36px !important; border-radius: 10px !important; }
          }
          @media (max-width: 640px) {
            header.adult-header { padding: 0 18px !important; height: 62px !important; gap: 8px !important; }
            main.adult-main { padding: 20px 18px 120px !important; }
            .adult-tab-subtitle { display: none !important; }
            .adult-header-left { gap: 10px !important; }
            .adult-tab-meta { gap: 8px !important; }
          }
          @media (max-width: 380px) {
            header.adult-header { padding: 0 14px !important; height: 58px !important; gap: 6px !important; }
            main.adult-main { padding: 16px 14px 120px !important; }
          }
        `}} />

        {/* Topbar */}
        <header className="main-content adult-header" style={{
          height: 76,
          backgroundColor: role === "parent" ? "rgba(250, 248, 245, 0.88)" : "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: role === "parent" ? "1px solid rgba(23, 62, 60, 0.07)" : "1px solid rgba(15, 23, 42, 0.04)",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 32px",
          position: "sticky", top: 0, zIndex: 30,
        }}>
          <div className="adult-header-left" style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
            {/* Bouton burger (mobile uniquement) */}
            <button
              className="menu-btn-open"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Ouvrir le menu de navigation"
              style={{
                background: "#f1f5f9", border: "none", borderRadius: 10,
                padding: 8, cursor: "pointer",
                alignItems: "center", justifyContent: "center",
                color: "#173e3c", flexShrink: 0,
              }}
            >
              <Menu size={22} />
            </button>

            {/* Titre de l'onglet actif */}
            <div className="adult-tab-meta" style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              {(() => {
                const current = menuItems.find((m) => m.id === activeTab);
                if (!current) return null;
                const Icon = current.icon;
                return (
                  <>
                    <div className="adult-tab-icon" style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                      border: "1px solid rgba(15, 23, 42, 0.05)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)", flexShrink: 0
                    }}>
                      <Icon size={20} color="#0f766e" strokeWidth={2.5} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2 className="adult-tab-title" style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {current.label}
                      </h2>
                      <span className="adult-tab-subtitle" style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", display: "block" }}>
                        Espace {role === "parent" ? "Parental" : "Enseignant"}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Actions droite du header : cloche de notifications */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
            {NotifBellComponent || <ParentNotificationCenter />}
          </div>
        </header>

        {/* Contenu de la page */}
        <main className="main-content adult-main" style={{ flex: 1, padding: "32px", transition: "padding 0.3s ease", minWidth: 0 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
