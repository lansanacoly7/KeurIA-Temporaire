"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Flame, MessageCircle, Zap } from "lucide-react";
import NavKidIcon, { type NavKidIconName } from "../components/NavKidIcon";
import ChildAvatar from "../../components/ChildAvatar";
import { Role, SchoolBrand } from "../dashboardShared";
import { SCHOOL_TABS } from "../cahier/cahierLogic";
import "../cahier/cahier.css";

export interface DashboardSidebarProps {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeTab: string;
  role: Role;
  accountRole: string;
  signedIn: boolean;
  isAdmin: boolean;
  isSchoolStudent?: boolean;
  school: SchoolBrand | null;
  visitorChildId: string | null;
  avatarId?: string | null;
  onOpenChat: () => void;
}

export function DashboardSidebar({
  sidebarCollapsed,
  toggleSidebar,
  activeTab,
  role,
  accountRole,
  signedIn,
  isAdmin,
  isSchoolStudent = false,
  school,
  visitorChildId,
  avatarId,
  onOpenChat,
}: DashboardSidebarProps) {
  const isLearner = accountRole === "eleve" || accountRole === "enfant";

  return (
    <aside
      className={`lms-side ${sidebarCollapsed ? "collapsed" : ""}${isSchoolStudent ? " cahier-side" : ""}`}
      aria-label="Menu principal"
    >
      <div className="lms-side-header">
        <Link className="lms-logo" href={signedIn ? "/dashboard" : "/"} title="kEur IA — Accueil">
          {sidebarCollapsed ? (
            <span className="logo-compact">K</span>
          ) : (
            <img src="/images/keur-ia-logo.png" alt="kEur IA — Apprendre, jouer, créer" />
          )}
        </Link>
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Déplier le menu" : "Replier le menu"}
          aria-label={sidebarCollapsed ? "Déplier le menu" : "Replier le menu"}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {isSchoolStudent ? (
        <nav aria-label="Mon cahier de classe">
          {SCHOOL_TABS.map(tab => (
            <Link
              key={tab.id}
              href={tab.href}
              className={activeTab === tab.id ? "on" : ""}
              title={tab.label}
            >
              <NavKidIcon name={tab.id as NavKidIconName} />
              <span className="nav-text">{tab.label}</span>
            </Link>
          ))}
        </nav>
      ) : (
      <nav aria-label="Navigation de l'apprenant">
        <Link
          href="/dashboard"
          className={(role === "enfant" || role === "eleve") && activeTab === "aventure" ? "on" : ""}
          title="Mon aventure"
        >
          <NavKidIcon name="aventure" />
          <span className="nav-text">Mon aventure</span>
        </Link>
        <Link
          href="/dashboard/modules"
          className={(role === "enfant" || role === "eleve") && activeTab === "modules" ? "on" : ""}
          title="Mes modules"
        >
          <NavKidIcon name="modules" />
          <span className="nav-text">Mes modules</span>
        </Link>
        <Link
          href="/dashboard/jeux"
          className={(role === "enfant" || role === "eleve") && activeTab === "jeux" ? "on" : ""}
          title="Jeux & défis"
        >
          <NavKidIcon name="jeux" />
          <span className="nav-text">Jeux & défis</span>
        </Link>
        <Link
          href="/dashboard/programmation"
          className={(role === "enfant" || role === "eleve") && (activeTab === "programmation" || activeTab === "code") ? "on" : ""}
          title="Programmation"
        >
          <NavKidIcon name="programmation" />
          <span className="nav-text">Programmation</span>
        </Link>

        <Link
          href="/dashboard/badges"
          className={`${(role === "enfant" || role === "eleve") && activeTab === "badges" ? "on" : ""} lms-nav-secondary`.trim()}
          title="Mes badges"
        >
          <NavKidIcon name="badges" />
          <span className="nav-text">Mes badges</span>
        </Link>
        <Link
          href="/dashboard/classement"
          className={`${(role === "enfant" || role === "eleve") && activeTab === "classement" ? "on" : ""} lms-nav-secondary`.trim()}
          title="Classement"
        >
          <NavKidIcon name="classement" />
          <span className="nav-text">Classement</span>
        </Link>

        {(isSchoolStudent || Boolean(school)) && (
          <Link
            href="/dashboard/devoirs"
            className={`${activeTab === "devoirs" ? "on" : ""} lms-nav-secondary`.trim()}
            title="Mes devoirs"
          >
            <NavKidIcon name="devoirs" />
            <span className="nav-text">Mes devoirs</span>
          </Link>
        )}

        {accountRole === "parent" && (
          <Link
            href="/dashboard/suivi"
            className={activeTab === "suivi" ? "on" : ""}
            title="Suivi Enfants"
          >
            <NavKidIcon name="suivi" />
            <span className="nav-text">Suivi Enfants</span>
          </Link>
        )}

        <i />

        {signedIn && (role === "enfant" || role === "eleve") && !visitorChildId && (
          <Link
            href="/dashboard/profil"
            className={activeTab === "profil" ? "on" : ""}
            title="Mon profil"
          >
            <NavKidIcon name="profil" avatarId={avatarId} />
            <span className="nav-text">Mon profil</span>
          </Link>
        )}

        {signedIn && !(role === "enfant" || role === "eleve") && (
          <Link className="admin-nav-link" href="/profile" title="Mon profil">
            <NavKidIcon name="compte" />
            <span className="nav-text">Mon profil</span>
          </Link>
        )}

        {isAdmin && (
          <Link className="admin-nav-link" href="/admin" title="Administration">
            <NavKidIcon name="admin" />
            <span className="nav-text">Administration</span>
          </Link>
        )}
      </nav>
      )}

      {!isSchoolStudent && (sidebarCollapsed ? (
        <button
          type="button"
          className="side-card-mini-btn"
          onClick={onOpenChat}
          title="Parler à Palou"
          aria-label="Parler à Palou"
        >
          <MessageCircle size={20} strokeWidth={2.3} />
        </button>
      ) : (
        <div className="side-card">
          <b>Besoin d’un coup de pouce ?</b>
          <small>Palou accompagne ton parcours et t’aide sans faire le travail à ta place.</small>
          <button type="button" onClick={onOpenChat}>
            Parler à Palou
          </button>
        </div>
      ))}

      {!(role === "enfant" || role === "eleve" || isLearner) && (
        <Link className="back-home" href="/" title="Retour à l'accueil">
          {sidebarCollapsed ? "←" : "← Retour à l’accueil"}
        </Link>
      )}
    </aside>
  );
}

export interface DashboardTopBarProps {
  activeTab: string;
  role: Role;
  accountRole: string;
  signedIn: boolean;
  visitorChildId: string | null;
  avatarId?: string | null;
  finalDisplayName: string;
  progress: {
    streak: number;
    xp: number;
  };
  levelName: string;
  signInUrl: string;
  onOpenLevelModal: () => void;
  onSignOut: () => void;
}

export function DashboardTopBar({
  activeTab,
  role,
  accountRole,
  signedIn,
  visitorChildId,
  avatarId,
  finalDisplayName,
  progress,
  levelName,
  signInUrl,
  onOpenLevelModal,
  onSignOut,
}: DashboardTopBarProps) {
  const isLearner = accountRole === "eleve" || accountRole === "enfant";

  if (activeTab === "profil") return null;

  return (
    <header className="lms-top" role="banner">
      <div>
        <span className="mobile-brand">kEur IA</span>
        <b>
          {accountRole === "admin"
            ? "Aperçu administrateur"
            : accountRole === "enfant"
            ? "Espace Enfant"
            : accountRole === "eleve"
            ? "Espace Élève"
            : accountRole === "parent"
            ? "Espace Parent"
            : "Espace Enseignant"}
        </b>
      </div>

      <div className="userline">
        <span
          title={`Série de connexion : ${progress.streak} jour${progress.streak > 1 ? "s" : ""} consécutif${progress.streak > 1 ? "s" : ""} ! Connecte-toi chaque jour pour faire briller la flamme.`}
          style={{ cursor: "help", display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          <span
            style={{
              display: "inline-block",
              transform: progress.streak > 1 ? "scale(1.15)" : "scale(1)",
              filter: progress.streak > 1 ? "drop-shadow(0 0 6px #f59e0b)" : "none",
            }}
          >
            <Flame size={18} color="#f97316" fill="#f97316" style={{ verticalAlign: "middle" }} />
          </span>
          <b>{progress.streak} {progress.streak > 1 ? "jours" : "jour"}</b>
        </span>

        <span
          onClick={onOpenLevelModal}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenLevelModal(); }}
          style={{ cursor: "pointer", transition: "transform 0.2s", display: "inline-block" }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          title="Voir les détails de mon niveau"
        >
          <Zap size={16} color="#eab308" fill="#eab308" style={{ verticalAlign: "middle" }} />{" "}
          {progress.xp} XP{" "}
          <span style={{ fontSize: "0.9em", color: "inherit", opacity: 0.8 }}>
            — {levelName}
          </span>
        </span>

        {signedIn ? (
          <Link
            className="user-profile-badge"
            href={
              role === "enfant" || role === "eleve"
                ? visitorChildId
                  ? "/dashboard"
                  : "/dashboard/profil"
                : "/profile"
            }
            title="Accéder à mon profil"
          >
            <span className="user-profile-avatar">
              {accountRole === "eleve" || accountRole === "enfant" ? (
                <ChildAvatar id={avatarId} size={32} title="Mon avatar" />
              ) : (
                <span className="user-avatar-initials">
                  {finalDisplayName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </span>
            <span className="user-profile-name">{finalDisplayName}</span>
          </Link>
        ) : (
          <div className="user-profile-badge discovery">
            <span className="user-profile-avatar">
              <span className="user-avatar-initials">
                {finalDisplayName.slice(0, 2).toUpperCase()}
              </span>
            </span>
            <span className="user-profile-name">Mode découverte</span>
          </div>
        )}

        {signedIn ? (
          !(role === "enfant" || role === "eleve" || isLearner) && (
            <button
              type="button"
              className="account-link"
              onClick={onSignOut}
              style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", padding: 0 }}
            >
              Déconnexion
            </button>
          )
        ) : (
          <a className="account-link" href={signInUrl}>
            Se connecter
          </a>
        )}
      </div>
    </header>
  );
}

export default function DashboardNavbar(props: DashboardSidebarProps & DashboardTopBarProps) {
  return (
    <>
      <DashboardSidebar {...props} />
      <DashboardTopBar {...props} />
    </>
  );
}
