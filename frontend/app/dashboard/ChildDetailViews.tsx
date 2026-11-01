"use client";

import { useState } from "react";
import { 
  Compass, Brain, Sparkles, Award, Star, 
  ArrowLeft, Lightbulb, Eye, MessageSquare, 
  HeartHandshake, Smile, Check, ShieldCheck,
  CheckCircle2, Lock, Trophy, Zap, ChevronRight,
  ChevronDown, ChevronUp, RefreshCw, Clock,
  BookOpen, Target, Flame, TrendingUp, Medal,
  Crown, Users, Info, ShieldAlert
} from "lucide-react";
import { 
  ChildTracking, 
  getColorForIndex, 
  getChildAdventure, 
  resolveLessonDetails, 
  getChildWorldsProgress,
  WorldProgress
} from "./ChildrenShared";
import { getAllLearnedDinnerTopics } from "./dinnerQuestions";

// ─── CATALOGUE DES 12 TROPHÉES OFFICIELS kEur IA (100% SVG, ZÉRO EMOJI) ──────

export const ALL_BADGES_CATALOG = [
  { id: "b_tuto", name: "Bienvenue au club", desc: "A terminé le tutoriel d'accueil et fait connaissance avec Palou.", icon: Sparkles, accent: "#0F766E", bg: "#E6F4F1", border: "#B4DDD4" },
  { id: "b_start", name: "En route !", desc: "A obtenu ses premiers points d'XP : son grand voyage numérique a débuté.", icon: Zap, accent: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
  { id: "b_contact", name: "Premier contact", desc: "A validé sa toute première mission d'atelier avec brio.", icon: Compass, accent: "#2563EB", bg: "#DBEAFE", border: "#BFDBFE" },
  { id: "b_eye", name: "L'Œil Curieux", desc: "A repéré sa première intelligence artificielle cachée dans le quotidien.", icon: Eye, accent: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  { id: "b_brain", name: "Petit Apprenti", desc: "A compris comment un algorithme s'entraîne avec des exemples.", icon: Brain, accent: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { id: "b_detective", name: "Détective Palou", desc: "A répondu sans faute à 3 séries consécutives d'énigmes et de quiz.", icon: Star, accent: "#EA580C", bg: "#FFEDD5", border: "#FED7AA" },
  { id: "b_sort", name: "Expert du tri", desc: "A réussi les défis de logique et de classification des données.", icon: Target, accent: "#0284C7", bg: "#E0F2FE", border: "#BAE6FD" },
  { id: "b_guard", name: "Petit Gardien", desc: "A intégré les bons réflexes pour protéger ses données privées en ligne.", icon: ShieldCheck, accent: "#16A34A", bg: "#DCFCE7", border: "#BBF7D0" },
  { id: "b_lynx", name: "Œil de Lynx", desc: "A franchi le cap héroïque des 150 points d'expérience en atelier.", icon: Award, accent: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
  { id: "b_secret", name: "Mes infos, mes secrets", desc: "A dépassé 300 XP et veille avec vigilance sur sa vie numérique.", icon: Lock, accent: "#9333EA", bg: "#F3E8FF", border: "#E9D5FF" },
  { id: "b_persist", name: "Je n'abandonne pas", desc: "A fait preuve d'une persévérance admirable face aux défis techniques.", icon: Flame, accent: "#DC2626", bg: "#FEE2E2", border: "#FECACA" },
  { id: "b_hidden_friend", name: "Ami fidèle de Palou", desc: "S'est connecté 7 jours d'affilée pour explorer le monde fascinant de l'IA.", icon: HeartHandshake, accent: "#E11D48", bg: "#FFE4E6", border: "#FECDD3" },
];

export type SubTabType = "overview" | "ranking" | "badges" | "achievements";

// ─── CARNET D'EXPLORATEUR AVEC SOUS-PAGES DÉDIÉES ────────────────────────────

export function ChildDetail({ 
  child, 
  index, 
  onShowPedagogy, 
  onVisitChild 
}: { 
  child: ChildTracking; 
  index: number; 
  onShowPedagogy: () => void; 
  onVisitChild?: (id: string | number, name: string) => void; 
}) {
  const color = getColorForIndex(index);
  const adv = getChildAdventure(child.lastLesson);
  const earnedBadges = child.earnedBadges ? child.earnedBadges.filter((b) => b.earned) : [];

  // Sous-page active pour une respiration absolue
  const [subTab, setSubTab] = useState<SubTabType>("overview");

  // Filtre d'affichage des badges
  const [badgeFilter, setBadgeFilter] = useState<"all" | "earned" | "upcoming">("all");

  // Sujets d'échange du soir basés STRICTEMENT sur les leçons apprises par l'enfant
  const learnedTopics = getAllLearnedDinnerTopics(child);
  const [topicIdx, setTopicIdx] = useState(0);
  const currentTopic = learnedTopics[topicIdx % learnedTopics.length];

  const isBeginner = child.totalLessons === 0;
  const stageSubtitle = isBeginner
    ? "Première découverte • Prêt(e) pour le voyage"
    : child.totalLessons <= 2
    ? "Exploration active • Premières notions acquises"
    : `Explorateur confirmé • Niveau ${child.level?.level || 1}`;

  // Calcul de la jauge d'XP vers le niveau suivant
  const xpCurrent = child.level?.xpInLevel || 0;
  const xpNeeded = child.level?.xpPerLevel || 100;
  const xpPct = Math.min(100, Math.max(0, Math.round((xpCurrent / xpNeeded) * 100)));

  // Résolution détaillée de tous les ateliers réellement complétés
  const completedList = (child.completedLessons || [])
    .map((id) => resolveLessonDetails(id))
    .filter(Boolean) as NonNullable<ReturnType<typeof resolveLessonDetails>>[];
  const reversedLessons = [...completedList].reverse();

  // Progression réelle dans les mondes kEur IA
  const allWorlds = getChildWorldsProgress(child.completedLessons || []);

  // Données de classement (avec fallbacks bienveillants si premier jour)
  const ranking = child.ranking || {
    rank: 1,
    totalParticipants: 1,
    badge: { label: "Explorateur Actif", color: "#0F766E", bg: "#F0FDFA" },
    xpEarned: child.xp || 0,
    xpToNextRank: 15,
    scope: "global",
    scopeLabel: "Promotion des Explorateurs",
    period: "weekly",
    periodLabel: "7 derniers jours",
    podium: []
  };

  const earnedBadgeIds = new Set(earnedBadges.map((b) => b.id));

  // Sous-onglets de navigation
  const SUB_TABS: { id: SubTabType; label: string; icon: typeof Compass; badge?: string }[] = [
    { id: "overview", label: "Vue d'ensemble", icon: Compass },
    { id: "ranking", label: "Classement & Ligue", icon: Trophy, badge: `#${ranking.rank}` },
    { id: "badges", label: "Trophées & Pouvoirs", icon: Award, badge: `${earnedBadges.length}/12` },
    { id: "achievements", label: "Exploits & Cursus", icon: Sparkles, badge: `${completedList.length}` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26, width: "100%", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        /* ══════════ HERO DU PASSEPORT D'AVENTURE ══════════ */
        .passport-hero {
          background: linear-gradient(135deg, #09332c 0%, #0d4a3e 50%, #135f50 100%);
          border-radius: 24px;
          padding: 28px 32px;
          color: white;
          box-shadow: 0 12px 32px -8px rgba(9, 51, 44, 0.35);
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
        }
        .passport-hero::after {
          content: '';
          position: absolute;
          top: -60px;
          right: -40px;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 239, 89, 0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .passport-btn-primary {
          background: #D9EF59;
          color: #09332C;
          border: none;
          border-radius: 99px;
          padding: 10px 22px;
          font-weight: 800;
          font-size: 13.5px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(217, 239, 89, 0.3);
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .passport-btn-primary:hover {
          background: #e3f868;
          transform: translateY(-2px);
        }
        .passport-btn-secondary {
          background: rgba(255, 255, 255, 0.12);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 99px;
          padding: 10px 18px;
          font-weight: 700;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease;
        }
        .passport-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* ══════════ BARRE D'ONGLETS SOUS-PAGES ══════════ */
        .subnav-tab-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #F1F6F3;
          padding: 6px;
          border-radius: 18px;
          border: 1.5px solid #DCE7E1;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .subnav-tab-btn {
          flex: 1;
          min-width: fit-content;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 18px;
          border-radius: 13px;
          border: none;
          background: transparent;
          color: #4A635F;
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .subnav-tab-btn:hover:not(.active) {
          background: rgba(255, 255, 255, 0.6);
          color: #0F766E;
        }
        .subnav-tab-btn.active {
          background: white;
          color: #09332C;
          font-weight: 800;
          box-shadow: 0 3px 12px rgba(15, 118, 110, 0.1);
        }
        .subnav-pill-badge {
          font-size: 10.5px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 99px;
          background: #E2ECE6;
          color: #0F766E;
        }
        .subnav-tab-btn.active .subnav-pill-badge {
          background: #E6F4F1;
          color: #0F766E;
        }

        /* ══════════ CAPSULES D'INFORMATIONS CLÉS ══════════ */
        .info-pill-stat {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 16px;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 170px;
          box-sizing: border-box;
        }

        /* ══════════ CARTES ET SECTIONS ══════════ */
        .subpage-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
          animation: subpageFadeIn 0.25s ease-out;
        }
        @keyframes subpageFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .lesson-done-card {
          background: white;
          border: 1.5px solid #E6ECE8;
          border-radius: 18px;
          padding: 18px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          transition: all 0.2s ease;
        }
        .lesson-done-card:hover {
          border-color: #0F766E;
          box-shadow: 0 6px 18px rgba(15, 118, 110, 0.08);
          transform: translateY(-2px);
        }

        .world-progress-card {
          background: white;
          border: 1.5px solid #E6ECE8;
          border-radius: 20px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 18px;
          transition: all 0.2s ease;
        }
        .world-progress-card:hover {
          border-color: #0F766E;
          box-shadow: 0 8px 20px rgba(15, 118, 110, 0.08);
          transform: translateY(-2px);
        }

        /* ══════════ RESPONSIVE ══════════ */
        @media (max-width: 820px) {
          .passport-hero {
            padding: 22px 18px;
            border-radius: 20px;
          }
          .passport-hero-actions {
            width: 100%;
            margin-top: 14px;
            flex-direction: column;
          }
          .passport-hero-actions button {
            width: 100%;
            justify-content: center;
          }
          .info-pill-stat {
            min-width: 100%;
            padding: 10px 14px;
          }
          .lesson-done-card {
            padding: 14px 16px;
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .world-progress-card {
            padding: 14px 16px;
          }
          .subnav-tab-btn {
            padding: 10px 14px;
            font-size: 12.5px;
          }
        }
      `}</style>

      {/* ─── 1. BANNIÈRE HERO DU PASSEPORT D'AVENTURE ──────────────────────── */}
      <div className="passport-hero">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap", position: "relative", zIndex: 2 }}>
          
          {/* Bloc gauche : Illustration + Titre + Progression */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1, minWidth: 280 }}>
            <div style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              overflow: "hidden",
              background: "rgba(255, 255, 255, 0.12)",
              border: "2px solid rgba(217, 239, 89, 0.4)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.25)"
            }}>
              <img 
                src={adv.image} 
                alt={adv.worldTitle}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/images/modules/p1.png";
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 800, color: "#D9EF59", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                <Compass size={14} /> Passeport d&apos;Aventure • {child.displayName}
              </div>
              <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "white", letterSpacing: "-0.01em" }}>
                {adv.worldTitle}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "#D6E8DC", fontWeight: 500 }}>
                {adv.lessonTitle} • <span style={{ color: "#D9EF59", fontWeight: 700 }}>{stageSubtitle}</span>
              </p>
            </div>
          </div>

          {/* Bloc droit : Actions directes */}
          <div className="passport-hero-actions" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {onVisitChild && (
              <button
                onClick={() => onVisitChild(child.id, child.displayName)}
                className="passport-btn-primary"
              >
                <Eye size={16} /> Explorer son espace élève
              </button>
            )}
            <button
              onClick={onShowPedagogy}
              className="passport-btn-secondary"
            >
              <Lightbulb size={15} color="#D9EF59" /> Repères éducatifs
            </button>
          </div>
        </div>

        {/* Barre d'XP vers le niveau supérieur */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255, 255, 255, 0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12.5, fontWeight: 700 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#D9EF59" }}>
              <Trophy size={15} /> Niveau {child.level?.level || 1} • {child.xp || 0} XP au total
            </span>
            <span style={{ color: "#E2F0E7", opacity: 0.85 }}>
              {xpCurrent} / {xpNeeded} XP vers le Niveau {(child.level?.level || 1) + 1}
            </span>
          </div>
          <div style={{ width: "100%", height: 8, borderRadius: 99, background: "rgba(255, 255, 255, 0.15)", overflow: "hidden" }}>
            <div style={{ width: `${xpPct}%`, height: "100%", background: "linear-gradient(90deg, #D9EF59 0%, #A3E635 100%)", borderRadius: 99, transition: "width 0.8s ease" }} />
          </div>
        </div>

        {/* 4 Capsules d'impact concret (temps, ateliers, régularité, réussite) */}
        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="info-pill-stat">
            <Clock size={20} color="#D9EF59" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "white" }}>
                {child.todayUsage?.minutes ? `${child.todayUsage.minutes} min` : "0 min"}
              </div>
              <div style={{ fontSize: 11, color: "#D1E2D7", opacity: 0.9 }}>
                Activité aujourd&apos;hui
              </div>
            </div>
          </div>

          <div className="info-pill-stat">
            <CheckCircle2 size={20} color="#A7F3D0" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "white" }}>
                {child.totalLessons} atelier{child.totalLessons > 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 11, color: "#D1E2D7", opacity: 0.9 }}>
                Missions validées
              </div>
            </div>
          </div>

          <div className="info-pill-stat">
            <TrendingUp size={20} color="#FDE047" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "white" }}>
                {child.comprehensionRate ? `${child.comprehensionRate}%` : "100%"}
              </div>
              <div style={{ fontSize: 11, color: "#D1E2D7", opacity: 0.9 }}>
                Réussite aux quiz
              </div>
            </div>
          </div>

          <div className="info-pill-stat">
            <Flame size={20} color="#F97316" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "white" }}>
                {child.streak || 1} jour{(child.streak || 1) > 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 11, color: "#D1E2D7", opacity: 0.9 }}>
                Série d&apos;exploration
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. BARRE DE NAVIGATION DES SOUS-PAGES ──────────────────────────── */}
      <div className="subnav-tab-bar" role="tablist" aria-label="Sections du carnet d'explorateur">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setSubTab(tab.id)}
              className={`subnav-tab-btn ${isActive ? "active" : ""}`}
            >
              <Icon size={17} color={isActive ? "#0F766E" : "#647E79"} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="subnav-pill-badge">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── SOUS-PAGE 1 : VUE D'ENSEMBLE ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === "overview" && (
        <div className="subpage-container">
          
          {/* L'INSTANT COMPLICITÉ EN FAMILLE (STRICTEMENT BASÉ SUR CE QU'IL A APPRIS) */}
          <section style={{
            background: "linear-gradient(135deg, #F4FBF7 0%, #EFF9F4 100%)",
            border: "1.5px solid #D2EBE0",
            borderRadius: 22,
            padding: "24px 28px",
            display: "flex",
            alignItems: "flex-start",
            gap: 20,
            flexWrap: "wrap",
            boxShadow: "0 4px 14px rgba(15, 118, 110, 0.05)"
          }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 16,
              background: "#0F766E",
              color: "#D9EF59",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 6px 14px rgba(15, 118, 110, 0.25)",
              marginTop: 2
            }}>
              <MessageSquare size={24} />
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#0F766E",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  background: "#D1FAE5",
                  padding: "3px 10px",
                  borderRadius: 99
                }}>
                  <CheckCircle2 size={13} color="#059669" /> Basé sur son atelier : {currentTopic.lessonTitle}
                </div>

                {learnedTopics.length > 1 && (
                  <button
                    onClick={() => setTopicIdx((prev) => (prev + 1) % learnedTopics.length)}
                    type="button"
                    style={{
                      background: "white",
                      border: "1px solid #CFE5D8",
                      color: "#0F766E",
                      borderRadius: 99,
                      padding: "4px 12px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.15s ease",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                    }}
                  >
                    <RefreshCw size={12} /> Autre sujet appris ({ (topicIdx % learnedTopics.length) + 1 }/{learnedTopics.length})
                  </button>
                )}
              </div>

              <div style={{ fontSize: 16, fontWeight: 800, color: "#143C37", lineHeight: 1.45, marginBottom: 8 }}>
                « {currentTopic.question} »
              </div>

              <div style={{
                fontSize: 12,
                color: "#3B635B",
                lineHeight: 1.5,
                background: "rgba(255,255,255,0.75)",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(15, 118, 110, 0.12)"
              }}>
                <strong style={{ color: "#0F766E" }}>Repère pour échanger : </strong>
                {currentTopic.hint}
              </div>
            </div>
          </section>

          {/* 2 CARTES DE SYNTHÈSE : CLASSEMENT ACTUEL & DERNIERS TROPHÉES */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 16 }}>
            
            {/* Carte 1 : Aperçu Classement */}
            <div style={{
              background: "white",
              borderRadius: 22,
              padding: "22px 24px",
              border: "1.5px solid #E6ECE8",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 16,
              boxShadow: "0 4px 14px rgba(0,0,0,0.02)"
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Trophy size={14} color="#D97706" /> Position dans sa promotion
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, background: "#FEF3C7", color: "#B45309", padding: "3px 8px", borderRadius: 99 }}>
                    {ranking.periodLabel}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
                    color: "#B45309",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    fontWeight: 900,
                    boxShadow: "0 6px 16px rgba(217, 119, 6, 0.18)",
                    flexShrink: 0
                  }}>
                    #{ranking.rank}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#143C37" }}>
                      {ranking.badge.label}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#647E79", marginTop: 2 }}>
                      Classé(e) parmi <strong>{ranking.totalParticipants} explorateurs</strong> • {ranking.scopeLabel}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSubTab("ranking")}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid #D6E4DB",
                  background: "#F7FAF8",
                  color: "#0F766E",
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s ease"
                }}
              >
                <span>Voir le classement & le podium</span>
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Carte 2 : Aperçu Trophées */}
            <div style={{
              background: "white",
              borderRadius: 22,
              padding: "22px 24px",
              border: "1.5px solid #E6ECE8",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 16,
              boxShadow: "0 4px 14px rgba(0,0,0,0.02)"
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Award size={14} color="#D97706" /> Salle des Pouvoirs
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, background: "#E6F4F1", color: "#0F766E", padding: "3px 8px", borderRadius: 99 }}>
                    {earnedBadges.length} / 12 Débloqués
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: "linear-gradient(135deg, #E6F4F1 0%, #CCFBF1 100%)",
                    color: "#0F766E",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 6px 16px rgba(15, 118, 110, 0.15)",
                    flexShrink: 0
                  }}>
                    <Star size={26} fill="#0F766E" />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#143C37" }}>
                      {earnedBadges.length > 0 ? `${earnedBadges.length} Trophées Acquis` : "Premiers trophées en vue"}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#647E79", marginTop: 2 }}>
                      {earnedBadges.length > 0
                        ? `Dernier pouvoir : « ${earnedBadges[earnedBadges.length - 1].label} »`
                        : "Prêt(e) à débloquer son premier pouvoir avec Palou"}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSubTab("badges")}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid #D6E4DB",
                  background: "#F7FAF8",
                  color: "#0F766E",
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s ease"
                }}
              >
                <span>Explorer les 12 trophées</span>
                <ChevronRight size={15} />
              </button>
            </div>

          </div>

          {/* DERNIÈRES MISSIONS ACCOMPLIES (RÉSUMÉ) */}
          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#143C37", display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={19} color="#0F766E" /> Derniers Ateliers Validés
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#647E79" }}>
                  Les récentes notions acquises avec succès par {child.displayName}
                </p>
              </div>
              {completedList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSubTab("achievements")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0F766E",
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  Voir tout ({completedList.length}) <ChevronRight size={15} />
                </button>
              )}
            </div>

            {completedList.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reversedLessons.slice(0, 2).map((item) => (
                  <div key={item.id} className="lesson-done-card">
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "#F0FDF4",
                        border: "1px solid #DCFCE7",
                        color: "#16A34A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <Check size={20} strokeWidth={2.5} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 800, color: "#143C37" }}>
                            {item.title}
                          </span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#0F766E", background: "#E6F4F1", padding: "2px 8px", borderRadius: 99 }}>
                            {item.worldTitle}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B", display: "flex", alignItems: "center", gap: 12 }}>
                          <span>+{item.xp} XP</span>
                          <span>•</span>
                          <span>{item.minutes} minutes</span>
                          <span>•</span>
                          <span style={{ color: "#16A34A", fontWeight: 700 }}>Notion comprise</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: "#FAFCFA",
                border: "1.5px dashed #D3E4D8",
                borderRadius: 20,
                padding: "24px",
                display: "flex",
                alignItems: "center",
                gap: 16
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#E6F4F1", color: "#0F766E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#143C37" }}>
                    Premier atelier prêt à être lancé : {adv.lessonTitle}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#647E79", marginTop: 2 }}>
                    Une première session de 10 minutes avec Palou permettra de débloquer son premier trophée !
                  </div>
                </div>
              </div>
            )}
          </section>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── SOUS-PAGE 2 : CLASSEMENT & LIGUE ───────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === "ranking" && (
        <div className="subpage-container">
          
          {/* GRANDE CARTE DE STANDING & LIGUE */}
          <div style={{
            background: "linear-gradient(135deg, #09332C 0%, #0F4C40 100%)",
            borderRadius: 24,
            padding: "28px 32px",
            color: "white",
            boxShadow: "0 10px 28px rgba(9, 51, 44, 0.25)",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", position: "relative", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 22, flex: 1, minWidth: 260 }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  background: "linear-gradient(135deg, #D9EF59 0%, #A3E635 100%)",
                  color: "#09332C",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  fontWeight: 900,
                  boxShadow: "0 8px 20px rgba(217, 239, 89, 0.35)",
                  flexShrink: 0
                }}>
                  #{ranking.rank}
                </div>

                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#D9EF59", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
                    <Crown size={14} /> Rang d&apos;Exploration • {ranking.periodLabel}
                  </div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "white" }}>
                    {ranking.badge.label}
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: "#D6E8DC" }}>
                    Sur un total de <strong>{ranking.totalParticipants} participants</strong> • {ranking.scopeLabel}
                  </p>
                </div>
              </div>

              <div style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                borderRadius: 16,
                padding: "14px 20px",
                textAlign: "right"
              }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#D9EF59" }}>
                  {ranking.xpEarned} XP
                </div>
                <div style={{ fontSize: 11.5, color: "#D1E2D7", marginTop: 2 }}>
                  engrangés cette période
                </div>
              </div>
            </div>

            {/* Barre de dynamique vers le palier supérieur */}
            {ranking.xpToNextRank > 0 && (
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255, 255, 255, 0.12)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, fontWeight: 700, color: "#D6E8DC" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Zap size={14} color="#D9EF59" /> Émulation amicale
                  </span>
                  <span>
                    Plus que <strong style={{ color: "#D9EF59" }}>{ranking.xpToNextRank} XP</strong> pour monter dans le classement !
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* PODIUM DES 3 PREMIERS EXPLORATEURS */}
          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#143C37", display: "flex", alignItems: "center", gap: 8 }}>
                  <Medal size={20} color="#D97706" /> Le Podium d&apos;Honneur
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#647E79" }}>
                  Les explorateurs les plus réguliers de la période
                </p>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 800, background: "#E6F4F1", color: "#0F766E", padding: "4px 10px", borderRadius: 99 }}>
                Top 3 Élite
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 14 }}>
              {(ranking.podium && ranking.podium.length > 0 ? ranking.podium : [
                { position: 1, rank: 1, displayName: child.displayName, initials: child.displayName.slice(0, 2).toUpperCase(), xp: ranking.xpEarned || 80, badge: { label: "Champion d'Or" }, isMe: true },
                { position: 2, rank: 2, displayName: "Awa D.", initials: "AD", xp: 60, badge: { label: "Dauphin d'Argent" }, isMe: false },
                { position: 3, rank: 3, displayName: "Modou S.", initials: "MS", xp: 40, badge: { label: "Virtuose de Bronze" }, isMe: false }
              ]).map((pod) => {
                const isGold = pod.position === 1;
                const isSilver = pod.position === 2;
                const isBronze = pod.position === 3;
                const medalBg = isGold ? "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)" : isSilver ? "#F1F5F9" : "#FFEDD5";
                const medalColor = isGold ? "#B45309" : isSilver ? "#475569" : "#C2410C";
                const medalBorder = isGold ? "#FDE68A" : isSilver ? "#E2E8F0" : "#FED7AA";

                return (
                  <div key={pod.position} style={{
                    background: pod.isMe ? "#F0FDF4" : "white",
                    border: pod.isMe ? "2px solid #0F766E" : `1.5px solid ${medalBorder}`,
                    borderRadius: 20,
                    padding: "20px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    boxShadow: pod.isMe ? "0 6px 18px rgba(15, 118, 110, 0.12)" : "0 3px 10px rgba(0,0,0,0.03)"
                  }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      background: medalBg,
                      color: medalColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 900,
                      flexShrink: 0
                    }}>
                      #{pod.position}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: "#143C37", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {pod.displayName}
                        </span>
                        {pod.isMe && (
                          <span style={{ fontSize: 9.5, fontWeight: 800, background: "#0F766E", color: "white", padding: "2px 6px", borderRadius: 99 }}>
                            Mon explorateur
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#647E79", marginTop: 2 }}>
                        {pod.xp} XP • {pod.badge?.label || "Explorateur"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* REPAIR ÉDUCATIF : COMPRENDRE LE CLASSEMENT kEur IA */}
          <div style={{
            background: "#F8FAFC",
            border: "1.5px solid #E2E8F0",
            borderRadius: 20,
            padding: "20px 24px",
            display: "flex",
            alignItems: "flex-start",
            gap: 16
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "#E2E8F0", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Info size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#143C37", marginBottom: 3 }}>
                La philosophie du classement kEur IA : Une saine émulation
              </div>
              <div style={{ fontSize: 12.5, color: "#64748B", lineHeight: 1.5 }}>
                Chez kEur IA, le classement a été conçu pour encourager l&apos;effort et la régularité, sans aucune pression négative. Seuls les élèves ayant gagné des points d&apos;XP dans la période y figurent, les prénoms sont anonymisés pour protéger la vie privée des enfants, et chaque atelier terminé valorise leur curiosité naturelle.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── SOUS-PAGE 3 : TROPHÉES & POUVOIRS (LA SALLE COMPLÈTE DES BADGES) ─ */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === "badges" && (
        <div className="subpage-container">
          
          {/* BANNIÈRE DE PROGRESSION DES TROPHÉES */}
          <div style={{
            background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
            border: "1.5px solid #FDE68A",
            borderRadius: 22,
            padding: "22px 26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 50, height: 50, borderRadius: 16, background: "#D97706", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 6px 14px rgba(217, 119, 6, 0.25)" }}>
                <Award size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#92400E" }}>
                  {earnedBadges.length} trophée{earnedBadges.length > 1 ? "s" : ""} débloqué{earnedBadges.length > 1 ? "s" : ""} sur 12
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#B45309" }}>
                  Chaque trophée couronne un palier clé dans la compréhension de l&apos;intelligence artificielle.
                </p>
              </div>
            </div>

            {/* Filtres de sélection */}
            <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.7)", padding: 4, borderRadius: 14, border: "1px solid #FDE68A" }}>
              {[
                { id: "all", label: `Tous (12)` },
                { id: "earned", label: `Débloqués (${earnedBadges.length})` },
                { id: "upcoming", label: `À conquérir (${12 - earnedBadges.length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBadgeFilter(f.id as typeof badgeFilter)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 10,
                    border: "none",
                    background: badgeFilter === f.id ? "#D97706" : "transparent",
                    color: badgeFilter === f.id ? "white" : "#92400E",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* GRILLE COMPLÈTE ET AÉRÉE DES TROPHÉES */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 16 }}>
            {ALL_BADGES_CATALOG
              .filter((b) => {
                const isUnlocked = earnedBadgeIds.has(b.id);
                if (badgeFilter === "earned") return isUnlocked;
                if (badgeFilter === "upcoming") return !isUnlocked;
                return true;
              })
              .map((badge) => {
                const Icon = badge.icon;
                const isUnlocked = earnedBadgeIds.has(badge.id);

                return (
                  <div key={badge.id} style={{
                    background: isUnlocked ? "white" : "#FAFCFA",
                    borderRadius: 20,
                    padding: "18px 20px",
                    border: isUnlocked ? `1.5px solid ${badge.border}` : "1.5px solid #E6ECE8",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    boxShadow: isUnlocked ? "0 4px 14px rgba(0,0,0,0.04)" : "none",
                    opacity: isUnlocked ? 1 : 0.85
                  }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 15,
                      background: isUnlocked ? badge.bg : "#F1F5F9",
                      color: isUnlocked ? badge.accent : "#94A3B8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: isUnlocked ? "0 4px 12px rgba(0,0,0,0.06)" : "none"
                    }}>
                      <Icon size={24} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: "#143C37" }}>
                          {badge.name}
                        </span>
                        <span style={{
                          fontSize: 9.5,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: isUnlocked ? "#DCFCE7" : "#F1F5F9",
                          color: isUnlocked ? "#15803D" : "#64748B"
                        }}>
                          {isUnlocked ? "Débloqué" : "À conquérir"}
                        </span>
                      </div>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#647E79", lineHeight: 1.4 }}>
                        {badge.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── SOUS-PAGE 4 : EXPLOITS & CURSUS (MONDES ET ATELIERS) ───────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === "achievements" && (
        <div className="subpage-container">
          
          {/* SYNTHÈSE DU CURSUS */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#143C37", display: "flex", alignItems: "center", gap: 8 }}>
                <Compass size={20} color="#0F766E" /> Les 10 Mondes Thématiques du Cursus
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#647E79" }}>
                Vue détaillée de l&apos;avancement de {child.displayName} dans chacun des univers
              </p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#0F766E", background: "#E6F4F1", padding: "4px 10px", borderRadius: 99 }}>
              10 Mondes Thématiques
            </span>
          </div>

          {/* GRILLE DES 10 MONDES */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 14 }}>
            {allWorlds.map((world, idx) => (
              <div key={world.id} className="world-progress-card">
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "#E2ECE5",
                  flexShrink: 0,
                  border: world.isStarted ? "2px solid #0F766E" : "1.5px solid #CBD5E1"
                }}>
                  <img 
                    src={world.image} 
                    alt={world.title} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/images/modules/p1.png";
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#143C37", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {idx + 1}. {world.title}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: world.isCompleted ? "#16A34A" : world.isStarted ? "#0F766E" : "#94A3B8" }}>
                      {world.done}/{world.total}
                    </span>
                  </div>

                  <div style={{ width: "100%", height: 6, borderRadius: 99, background: "#E2E8F0", overflow: "hidden", margin: "6px 0 4px" }}>
                    <div style={{ width: `${world.pct}%`, height: "100%", background: world.isCompleted ? "#16A34A" : "#0F766E", borderRadius: 99, transition: "width 0.4s ease" }} />
                  </div>

                  <div style={{ fontSize: 11, color: "#64748B", display: "flex", justifyContent: "space-between" }}>
                    <span>{world.isCompleted ? "Monde validé !" : world.isStarted ? `${world.pct}% complété` : "À découvrir"}</span>
                    <span style={{ fontWeight: 700, color: world.isStarted ? "#0F766E" : "#94A3B8" }}>
                      {world.isCompleted ? "Bravo !" : world.isStarted ? "En cours" : "Verrouillé doux"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* HISTORIQUE COMPLET DE TOUS LES ATELIERS RÉUSSIS */}
          <section style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#143C37", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={20} color="#16A34A" /> Répertoire de Tous les Ateliers Validés ({completedList.length})
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#647E79" }}>
                Chaque mission terminée représente des notions concrètes maîtrisées par l&apos;enfant
              </p>
            </div>

            {completedList.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reversedLessons.map((item) => (
                  <div key={item.id} className="lesson-done-card">
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "#F0FDF4",
                        border: "1px solid #DCFCE7",
                        color: "#16A34A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <Check size={20} strokeWidth={2.5} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 800, color: "#143C37" }}>
                            {item.title}
                          </span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#0F766E", background: "#E6F4F1", padding: "2px 8px", borderRadius: 99 }}>
                            {item.worldTitle}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B", display: "flex", alignItems: "center", gap: 12 }}>
                          <span>+{item.xp} XP</span>
                          <span>•</span>
                          <span>{item.minutes} minutes</span>
                          <span>•</span>
                          <span style={{ color: "#16A34A", fontWeight: 700 }}>Notion comprise</span>
                        </div>
                      </div>
                    </div>

                    <div style={{
                      padding: "4px 12px",
                      borderRadius: 99,
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#15803D",
                      whiteSpace: "nowrap"
                    }}>
                      Validé avec brio
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: "#FAFCFA",
                border: "1.5px dashed #D3E4D8",
                borderRadius: 20,
                padding: "24px",
                display: "flex",
                alignItems: "center",
                gap: 16
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#E6F4F1", color: "#0F766E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#143C37" }}>
                    Aucun atelier validé pour le moment
                  </div>
                  <div style={{ fontSize: 12.5, color: "#647E79", marginTop: 2 }}>
                    Invitez {child.displayName} à commencer son tout premier atelier interactif avec Palou !
                  </div>
                </div>
              </div>
            )}
          </section>

        </div>
      )}

    </div>
  );
}

// ─── GUIDE PÉDAGOGIQUE D'ACCOMPAGNEMENT ───────────────────────────────────────

export function ChildPedagogyView({ child, onBack }: { child: ChildTracking, onBack: () => void }) {
  return (
    <div style={{ padding: "0 0 40px", color: "#143C37", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            width: 40, height: 40, borderRadius: 12, background: "white",
            border: "1px solid #E2EAE3", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#0F766E", flexShrink: 0
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#143C37", letterSpacing: "-0.01em" }}>
            Guide Pédagogique d&apos;Accompagnement
          </h1>
          <p style={{ margin: "2px 0 0", color: "#647E79", fontSize: 13, fontWeight: 500 }}>
            Les clés pour accompagner l&apos;éveil numérique de <strong style={{ color: "#0F766E" }}>{child.displayName}</strong>
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{
          background: "linear-gradient(135deg, #0e3d32 0%, #165646 60%, #1a6351 100%)",
          borderRadius: 20, padding: "26px 28px", color: "white",
          boxShadow: "0 6px 20px rgba(14, 61, 50, 0.12)"
        }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles size={22} color="#D9EF59" />
            </div>
            <div>
              <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800, color: "white" }}>
                La philosophie kEur IA : Découvrir sans stresser
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#D1E2D7", lineHeight: 1.5 }}>
                Chez kEur IA, l&apos;apprentissage du numérique repose sur le plaisir d&apos;explorer et la méthode par essai-erreur. Votre enfant apprend à penser par lui-même, à poser des questions et à comprendre les rouages du monde numérique, sans jamais être jugé par une note ou un score.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 16 }}>
          {[
            {
              title: "Être un complice curieux",
              desc: "Pas besoin d'être un expert en informatique. Votre rôle le plus précieux est de lui demander : « Montre-moi ce que tu as fait ! ».",
              icon: <Smile size={18} color="#0F766E" />
            },
            {
              title: "Dédramatiser l'erreur",
              desc: "Dans la programmation, un bug est juste une hypothèse à réajuster. Félicitez sa persévérance plutôt que la vitesse.",
              icon: <Check size={18} color="#2563EB" />
            },
            {
              title: "Séances courtes de 10 à 15 min",
              desc: "Mieux vaut une séance de 10 minutes bien vécue qu'une heure d'écran. La régularité et le repos stimulent la mémorisation.",
              icon: <ShieldCheck size={18} color="#D97706" />
            },
            {
              title: "Faire le lien avec le réel",
              desc: "Reliez ce qu'il découvre aux objets du quotidien : les feux de circulation, la télécommande, la balance électronique.",
              icon: <Compass size={18} color="#7E22CE" />
            }
          ].map((item) => (
            <div key={item.title} style={{ background: "white", borderRadius: 16, border: "1px solid #E2EAE3", padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F1F5F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.icon}
                </div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#143C37" }}>{item.title}</h3>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#546E6A", lineHeight: 1.45 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
