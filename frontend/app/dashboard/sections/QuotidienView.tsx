"use client";

import React from "react";
import Link from "next/link";
import {
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Gamepad2,
  Globe,
  Languages,
  Lock,
  Mic,
  Palette,
  Search,
  Shield,
  ShieldCheck,
  Smile,
  Sprout,
  Stethoscope,
  Sunrise,
  Timer,
  Trophy,
} from "lucide-react";
import { AgeKey } from "../../lms-data";
import { DailyUsage } from "../../daily-plan";
import { GAME_LEVELS, GameLevel } from "../games-map-data";
import { DailyTip79 } from "../parcours79/DailyTip79";

export interface QuotidienViewProps {
  age: AgeKey;
  userScope: string;
  signedIn: boolean;
  visitorChildId: string | null;
  dailyUsage: DailyUsage;
  dailyPlan: {
    minutes: number;
    lessons: number;
    quizzes: number;
    games: number;
  };
  timeToPause: boolean;
  limitsApply: boolean;
  dailyNotice: string | null;
  workshopsUnlocked: boolean;
  gameUnlocked: (id: number) => boolean;
  onOpenLevel: (level: GameLevel) => void;
  onChallengeResult: (correct: boolean, xpGained?: number, totalXp?: number) => void;
  checkedRules: Record<number, boolean>;
  onToggleRule: (ruleId: number) => void;
}

export default function QuotidienView({
  age,
  userScope,
  dailyUsage,
  dailyPlan,
  timeToPause,
  limitsApply,
  dailyNotice,
  workshopsUnlocked,
  gameUnlocked,
  onOpenLevel,
  checkedRules,
  onToggleRule,
}: QuotidienViewProps) {
  return (
    <div className="quotidien-view">
      {/* ═══ PROGRAMME DU JOUR ═══ */}
      <section
        className="daily-programme-box"
        style={{
          marginTop: "20px",
          marginBottom: "36px",
          background: "#ffffff",
          border: "1px solid #e3ebe6",
          borderRadius: "24px",
          padding: "20px 24px",
          boxShadow: "0 6px 18px rgba(16, 63, 59, 0.06)",
          color: "#173e3c",
          position: "relative",
          overflow: "hidden",
        }}
        aria-label="Mon programme du jour"
      >
        <div
          className="programme-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "18px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            className="programme-header-icon"
            style={{
              width: "48px",
              height: "48px",
              background: "#e8f3ef",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {timeToPause ? <Sunrise size={24} color="#0f755f" /> : <Clock size={24} color="#0f755f" />}
          </div>
          <div>
            <small
              className="programme-kicker"
              style={{
                fontWeight: 800,
                fontSize: "12px",
                color: "#6b8a82",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              MON PROGRAMME DU JOUR
            </small>
            <h2 className="programme-title" style={{ fontSize: "19px", fontWeight: 900, margin: "3px 0 0", color: "#173e3c" }}>
              {timeToPause ? "Tu as bien avancé, pense à faire une pause !" : "Avance à ton rythme, sans te fatiguer"}
            </h2>
            <p className="programme-subtitle" style={{ margin: "3px 0 0", color: "#64807a", fontSize: "14px" }}>
              {limitsApply
                ? "Les compteurs reviennent à zéro chaque nouveau jour."
                : "Aperçu du rythme conseillé pour tes activités."}
            </p>
          </div>
        </div>

        <div className="programme-metrics-grid">
          {([
            [Timer, "Temps", dailyUsage.minutes, dailyPlan.minutes, "min", "#3b82f6"],
            [BookOpen, "Leçons", dailyUsage.lessons, dailyPlan.lessons, "", "#8b5cf6"],
            [Bot, "Quiz", dailyUsage.quizzes, dailyPlan.quizzes, "", "#f59e0b"],
            [Gamepad2, "Jeux", dailyUsage.games, dailyPlan.games, "", "#ec4899"],
          ] as const).map(([Icon, label, value, max, unit, accentColor]) => {
            const isDone = value >= max;
            const pct = Math.min(100, (value / max) * 100);
            return (
              <div
                key={label}
                className="programme-metric-item"
                style={{
                  background: "#f6faf8",
                  border: "1px solid #e3ebe6",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  color: "#173e3c",
                }}
              >
                <div className="programme-metric-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <span className="programme-metric-icon" style={{ display: "flex", flexShrink: 0 }}>
                      {isDone ? <CheckCircle2 size={20} color="#10b981" /> : <Icon size={20} color={accentColor} />}
                    </span>
                    <b className="programme-metric-label" style={{ fontSize: "15px", fontWeight: 800 }}>{label}</b>
                  </div>
                  <span className="programme-metric-value" style={{ fontSize: "17px", fontWeight: 900, color: isDone ? "#0f9d6e" : "#173e3c", whiteSpace: "nowrap" }}>
                    {value}
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#8aa39c" }}>
                      /{max} {unit}
                    </span>
                  </span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "#e3ebe6", borderRadius: "99px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: isDone ? "#34d399" : accentColor,
                      borderRadius: "99px",
                      transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {(dailyNotice || timeToPause) && (
          <div
            style={{
              marginTop: "16px",
              padding: "10px 16px",
              background: "#e8f3ef",
              color: "#0f755f",
              borderRadius: "14px",
              fontWeight: 700,
              fontSize: "15px",
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <Smile size={22} color="#0f755f" style={{ flexShrink: 0 }} />{" "}
            {dailyNotice || "Tu as bien travaillé. C'est peut-être le moment de bouger un peu ou de reposer tes yeux !"}
          </div>
        )}
      </section>

      {/* ═══ ACCÈS RAPIDE ═══ */}
      <div className="dash-title">
        <div>
          <span>OUTILS MAGIQUES</span>
          <h2>Accès Rapide</h2>
        </div>
      </div>
      <section className="course-grid quick-access-grid" style={{ marginBottom: "40px" }}>
        <Link href="/dashboard/dictionnaire" style={{ textDecoration: "none", display: "block" }}>
          <div
            className="course-card purple"
            style={{
              height: "100%",
              cursor: "pointer",
              border: "none",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="course-art"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#e9d5ff" }}
            >
              <span style={{ fontSize: "4rem", filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.2))", display: "flex" }}>
                <BookOpen size={64} color="#7c3aed" strokeWidth={1.8} />
              </span>
            </div>
            <small>LEXIQUE IA</small>
            <h3>Dictionnaire</h3>
            <p style={{ flex: 1 }}>Découvre tous les mots magiques de l'Intelligence Artificielle de façon simple et amusante !</p>
          </div>
        </Link>
        <Link href="/dashboard/classement" style={{ textDecoration: "none", display: "block" }}>
          <div
            className="course-card yellow"
            style={{
              height: "100%",
              cursor: "pointer",
              border: "none",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="course-art"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fef08a" }}
            >
              <span style={{ fontSize: "4rem", filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.2))", display: "flex" }}>
                <Trophy size={64} color="#ca8a04" strokeWidth={1.8} />
              </span>
            </div>
            <small>COMPÉTITION</small>
            <h3>Classement</h3>
            <p style={{ flex: 1 }}>Regarde ta position par rapport aux autres joueurs et deviens le champion de kEur IA !</p>
          </div>
        </Link>
      </section>

      {/* ═══ ATELIERS & MINI-JEUX IA EN ACCÈS DIRECT ═══ */}
      {workshopsUnlocked && (
        <>
          <div className="dash-title" style={{ marginTop: "10px" }}>
            <div>
              <span>EXPÉRIMENTATION PRATIQUE • APPRENDRE EN JOUANT</span>
              <h2>Ateliers & Mini-Jeux IA de Palou</h2>
            </div>

          </div>

          <section className="ateliers-grid">
            {/* Atelier 1: Machine Learning & Vision */}
            {gameUnlocked(3) && (
              <div
                style={{
                  background: "linear-gradient(145deg, #ecfdf5 0%, #d1fae5 50%, #ffffff 100%)",
                  borderRadius: "26px",
                  padding: "24px",
                  border: "2px solid #6ee7b7",
                  boxShadow: "0 10px 30px rgba(16, 185, 129, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", background: "linear-gradient(90deg, #10b981, #06b6d4)" }} />
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                      <Bot size={28} color="#2563eb" />
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 900, color: "#059669", background: "#d1fae5", padding: "4px 10px", borderRadius: "12px", border: "1px solid #a7f3d0" }}>VISION & ML</span>
                  </div>
                  <h3 style={{ fontSize: "18px", fontWeight: 900, color: "#1e293b", margin: "0 0 8px" }}>Entraînement Express</h3>
                  <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>
                    Apprends à l'IA à reconnaître et classifier des images de chats et de chiens en lui donnant les bons exemples !
                  </p>
                </div>
                <div>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", background: "rgba(255,255,255,0.9)", padding: "3px 8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>Dataset</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", background: "rgba(255,255,255,0.9)", padding: "3px 8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>Classification</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "3px 8px", borderRadius: "8px", border: "1px solid #a7f3d0" }}>+40 XP</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenLevel(GAME_LEVELS[3])}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "16px",
                      fontWeight: 800,
                      fontSize: "14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <span>Lancer l'atelier</span> →
                  </button>
                </div>
              </div>
            )}

            {/* Atelier 2: Prompting & Création */}
            {gameUnlocked(6) && (
              <div
                style={{
                  background: "linear-gradient(145deg, #f5f3ff 0%, #ede9fe 50%, #ffffff 100%)",
                  borderRadius: "26px",
                  padding: "24px",
                  border: "2px solid #c4b5fd",
                  boxShadow: "0 10px 30px rgba(139, 92, 246, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", background: "linear-gradient(90deg, #8b5cf6, #ec4899)" }} />
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                      <Palette size={28} color="#db2777" />
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 900, color: "#7c3aed", background: "#ede9fe", padding: "4px 10px", borderRadius: "12px", border: "1px solid #ddd6fe" }}>CRÉATION & PROMPT</span>
                  </div>
                  <h3 style={{ fontSize: "18px", fontWeight: 900, color: "#1e293b", margin: "0 0 8px" }}>Dessine pour l'IA</h3>
                  <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>
                    Dessine des objets et regarde comment le modèle neuronal devine en temps réel ce que tu représentes !
                  </p>
                </div>
                <div>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", background: "rgba(255,255,255,0.9)", padding: "3px 8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>Neurones</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", background: "rgba(255,255,255,0.9)", padding: "3px 8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>Reconnaissance</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", padding: "3px 8px", borderRadius: "8px", border: "1px solid #ddd6fe" }}>+45 XP</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenLevel(GAME_LEVELS[6])}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "16px",
                      fontWeight: 800,
                      fontSize: "14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
                    }}
                  >
                    <span>Lancer l'atelier</span> →
                  </button>
                </div>
              </div>
            )}

            {/* Atelier 3: Voix & Dialogue */}
            {gameUnlocked(5) && (
              <div
                style={{
                  background: "linear-gradient(145deg, #fffbeb 0%, #fef3c7 50%, #ffffff 100%)",
                  borderRadius: "26px",
                  padding: "24px",
                  border: "2px solid #fde047",
                  boxShadow: "0 10px 30px rgba(245, 158, 11, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                      <Mic size={28} color="#7c3aed" />
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 900, color: "#d97706", background: "#fef3c7", padding: "4px 10px", borderRadius: "12px", border: "1px solid #fde68a" }}>VOIX & DIALOGUE</span>
                  </div>
                  <h3 style={{ fontSize: "18px", fontWeight: 900, color: "#1e293b", margin: "0 0 8px" }}>L'IA qui parle</h3>
                  <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>
                    Interagis avec un assistant vocal intelligent en lui fournissant le contexte parfait pour qu'il te réponde au mieux !
                  </p>
                </div>
                <div>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", background: "rgba(255,255,255,0.9)", padding: "3px 8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>NLP</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", background: "rgba(255,255,255,0.9)", padding: "3px 8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>Contexte</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#d97706", background: "#fffbeb", padding: "3px 8px", borderRadius: "8px", border: "1px solid #fde68a" }}>+50 XP</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenLevel(GAME_LEVELS[5])}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "16px",
                      fontWeight: 800,
                      fontSize: "14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                    }}
                  >
                    <span>Lancer l'atelier</span> →
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* ═══ LE BOUCLIER DU CITOYEN NUMÉRIQUE ═══ */}
      {age === "7-9" ? (
        <DailyTip79 scope={userScope} />
      ) : (
        <>
          <div className="dash-title">
            <div>
              <span>SÉCURITÉ & ESPRIT CRITIQUE • PALOU TE PROTÈGE</span>
              <h2>Le Bouclier de l'Explorateur</h2>
            </div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "#15803d",
                background: "#dcfce7",
                padding: "6px 12px",
                borderRadius: "12px",
              }}
            >
              <ShieldCheck size={16} color="#0f755f" style={{ verticalAlign: "middle" }} />{" "}
              {Object.values(checkedRules).filter(Boolean).length}/3 règles validées
            </span>
          </div>

          <section className="charte-grid">
            {[
              {
                id: 0,
                icon: <Lock size={22} color="#0f755f" />,
                title: "Secret Absolu",
                sub: "Mots de passe & vie privée",
                desc: "Ne donne jamais ton mot de passe, ton numéro de téléphone ni ton adresse à un chatbot ou sur internet. Ils t'appartiennent !",
                tag: "Vie Privée",
              },
              {
                id: 1,
                icon: <Search size={22} color="#0284c7" />,
                title: "Œil de Lynx",
                sub: "Détecte les illusions (Deepfakes)",
                desc: "Une photo ou une vidéo très réaliste peut être fabriquée de toutes pièces par une IA. Si une nouvelle te choque, vérifie toujours la source !",
                tag: "Vérification",
              },
              {
                id: 2,
                icon: <Shield size={22} color="#8b5cf6" />,
                title: "Le Maître, c'est Toi !",
                sub: "L'IA est un super assistant",
                desc: "L'ordinateur peut t'inspirer des idées, mais c'est toujours ton cerveau, ta sensibilité et ta créativité qui mènent la danse.",
                tag: "Créativité Responsable",
              },
            ].map((rule) => {
              const isChecked = !!checkedRules[rule.id];
              return (
                <div
                  key={rule.id}
                  onClick={() => onToggleRule(rule.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onToggleRule(rule.id);
                  }}
                  style={{
                    background: isChecked
                      ? "linear-gradient(145deg, #dcfce7 0%, #bbf7d0 100%)"
                      : rule.id === 0
                      ? "linear-gradient(145deg, #eff6ff 0%, #dbeafe 50%, #ffffff 100%)"
                      : rule.id === 1
                      ? "linear-gradient(145deg, #fff7ed 0%, #ffedd5 50%, #ffffff 100%)"
                      : "linear-gradient(145deg, #fdf2f8 0%, #fce7f3 50%, #ffffff 100%)",
                    border: isChecked
                      ? "2px solid #22c55e"
                      : rule.id === 0
                      ? "2px solid #93c5fd"
                      : rule.id === 1
                      ? "2px solid #fdba74"
                      : "2px solid #f9a8d4",
                    borderRadius: "24px",
                    padding: "24px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 8px 25px rgba(0,0,0,0.03)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <span style={{ fontSize: "32px" }}>{rule.icon}</span>
                      <div
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "8px",
                          border: isChecked ? "none" : "2px solid #cbd5e1",
                          background: isChecked ? "#22c55e" : "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: 900,
                          fontSize: "14px",
                        }}
                      >
                        {isChecked && <Check size={14} />}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 900,
                        color: isChecked ? "#15803d" : "#8b5cf6",
                        textTransform: "uppercase",
                        background: isChecked ? "#dcfce7" : "#f5f3ff",
                        padding: "3px 8px",
                        borderRadius: "8px",
                      }}
                    >
                      {rule.tag}
                    </span>
                    <h4 style={{ fontSize: "16px", fontWeight: 900, color: "#1e293b", margin: "8px 0 2px" }}>{rule.title}</h4>
                    <p style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, margin: "0 0 10px" }}>{rule.sub}</p>
                    <p style={{ fontSize: "13px", color: "#334155", lineHeight: 1.5, margin: 0 }}>{rule.desc}</p>
                  </div>
                  <div
                    style={{
                      marginTop: "16px",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: isChecked ? "#15803d" : "#94a3b8",
                      textAlign: "right",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 4,
                    }}
                  >
                    {isChecked ? <><Check size={13} /> Règle adoptée !</> : "Cliquer pour valider"}
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}

      {/* ═══ L'IA AU SÉNÉGAL ET EN AFRIQUE ═══ */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "white",
          borderRadius: "28px",
          padding: "30px",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.15)",
          marginBottom: "40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-40px",
            width: "220px",
            height: "220px",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
          <Globe size={26} color="#34d399" />
          <div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 900,
                color: "#34d399",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              L'AFRIQUE AU CŒUR DE L'INNOVATION
            </span>
            <h3 style={{ fontSize: "22px", fontWeight: 900, margin: "2px 0 0", color: "white" }}>
              L'IA au service de notre continent
            </h3>
          </div>
        </div>

        <div className="africa-ia-grid">
          <div
            style={{
              background: "rgba(255, 255, 255, 0.07)",
              padding: "20px",
              borderRadius: "20px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ marginBottom: "8px" }}><Sprout size={24} color="#6ee7b7" /></div>
            <h4 style={{ fontSize: "15px", fontWeight: 800, margin: "0 0 6px", color: "#6ee7b7" }}>Agriculture Intelligente</h4>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", lineHeight: 1.5, margin: 0 }}>
              Dans la vallée du fleuve Sénégal, des drones avec vision IA survolent les rizières pour détecter les maladies des plantes et économiser l'eau d'irrigation.
            </p>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.07)",
              padding: "20px",
              borderRadius: "20px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ marginBottom: "8px" }}><Languages size={24} color="#93c5fd" /></div>
            <h4 style={{ fontSize: "15px", fontWeight: 800, margin: "0 0 6px", color: "#93c5fd" }}>Nos Langues Nationales</h4>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", lineHeight: 1.5, margin: 0 }}>
              Des ingénieurs entraînent des modèles de langage en Wolof, Pulaar et Sérère pour que tout le monde puisse s'informer et utiliser la technologie dans sa langue maternelle.
            </p>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.07)",
              padding: "20px",
              borderRadius: "20px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ marginBottom: "8px" }}><Stethoscope size={24} color="#fde047" /></div>
            <h4 style={{ fontSize: "15px", fontWeight: 800, margin: "0 0 6px", color: "#fde047" }}>Santé en Brousse</h4>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", lineHeight: 1.5, margin: 0 }}>
              Des soignants utilisent des applications IA sur smartphone pour analyser des radios pulmonaires ou repérer des signes de paludisme en quelques secondes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
