"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Lock, CheckCircle2, Trophy, ArrowRight, Gamepad2, Sparkles, BookOpen } from "lucide-react";
import { ModuleIcon } from "../components/ModuleIcon";
import { tracks, type AgeKey, type World, computeEarnedBadges } from "../lms-data";
import GamesMapView from "./GamesMapView";
import type { DailyKind, DailyUsage, DailyPlan } from "../daily-plan";
import { isDevMode } from "../utils/devMode";

interface Track {
  worlds?: World[];
  [key: string]: unknown;
}

interface JeuxDefisDashboardViewProps {
  age: AgeKey;
  ageLocked: boolean;
  selectAge: (age: AgeKey) => void;
  progress: {
    xp: number;
    completed: string[];
    streak: number;
    lessonStars?: Record<string, number>;
    badges?: string[];
    totalStars?: number;
  };
  track: Track;
  tracks: Record<AgeKey, Track>;
  mapCompleted: string[];
  lessonStars?: Record<string, number>;
  completeGameLevel: (id: string, xp: number, kind: "jeu" | "quiz" | "coffre" | "defi", stars?: number) => Promise<void>;
  openLevel: (level: any) => void;
  /** Enregistre une activité d'arcade : l'XP est décidée par le serveur, jamais par l'interface. */
  awardActivity: (activityId: string) => Promise<void>;
  dailyUsage?: DailyUsage;
  dailyPlan?: DailyPlan;
  limitsApply?: boolean;
  recordDaily?: (metric: DailyKind) => Promise<void>;
  progressLoaded?: boolean;
}

export function JeuxDefisDashboardView({
  age,
  ageLocked,
  selectAge,
  progress,
  mapCompleted,
  completeGameLevel,
  openLevel,
  awardActivity,
  dailyUsage,
  dailyPlan,
  limitsApply,
  recordDaily,
  progressLoaded
}: JeuxDefisDashboardViewProps) {

  if (age === "7-9") {
    const earnedBadgesList = computeEarnedBadges(progress.completed.length, progress.xp, progress.streak, {
      completedLessons: progress.completed,
      badges: progress.badges,
    });
    const allEarnedBadges = Array.from(new Set([...earnedBadgesList, ...(progress.badges || [])]));
    const calculatedStars =
      typeof progress.totalStars === "number"
        ? progress.totalStars
        : Object.values(progress.lessonStars || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);

    return (
      <div className="dash-content" style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}>
        <GamesMapView
          age={age}
          ageLocked={ageLocked}
          setAge={selectAge}
          completed={mapCompleted}
          lessonStars={progress.lessonStars || {}}
          xp={progress.xp ?? 0}
          totalStars={calculatedStars}
          badgesCount={allEarnedBadges.length}
          progressLoaded={progressLoaded}
          onComplete={completeGameLevel}
          onPlay={openLevel}
        />
      </div>
    );
  }

  // Pour 10-12 et 13-15 ans : Hub des Défis intrinsèquement liés aux modules
  const currentTrack = tracks[age];
  const worlds = currentTrack?.worlds || [];

  return (
    <div className="dash-content" style={{ paddingBottom: 60, maxWidth: 1210, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      
      {/* HERO SECTION 10-12 & 13-15 */}
      <section className="page-hero" style={{ position: "relative", overflow: "hidden", borderRadius: 26, background: "linear-gradient(160deg,#0E4B3C 0%,#13624E 58%,#17715A 100%)", color: "#fff", padding: "26px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, minHeight: 180 }}>
        <div style={{ position: "relative", zIndex: 2, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".16em", color: "#D7F26B", textTransform: "uppercase" }}>
            DÉFIS DE MODULES · {currentTrack?.label} ({currentTrack?.name})
          </div>
          <h1 className="gm-title" style={{ fontSize: 36, fontWeight: 800, margin: "6px 0 0", lineHeight: 1.1 }}>
            Défis & Missions Pratiques
          </h1>
          <p style={{ fontSize: 15.5, color: "#DCEBC2", margin: "8px 0 16px 0", maxWidth: 580, lineHeight: 1.45 }}>
            Chaque défi est intrinsèquement lié à son module. Termine d'abord toutes les leçons du module pour déverrouiller son épreuve pratique !
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/dashboard/modules"
              style={{
                border: "none",
                borderRadius: 14,
                background: "#C8F24D",
                color: "#0E3A2E",
                fontFamily: "'Baloo 2', cursive",
                fontSize: 16,
                fontWeight: 700,
                padding: "10px 20px",
                textDecoration: "none",
                boxShadow: "0 4px 0 #8FB22F",
                display: "inline-flex",
                alignItems: "center",
                gap: 8
              }}
            >
              <BookOpen size={18} /> Continuer mes modules →
            </Link>
          </div>
        </div>

        <div className="page-hero-art" style={{ flex: "none", position: "relative", zIndex: 1 }}>
          <img src="/images/palou/game-palou-joie.png" alt="Palou" style={{ width: 140, display: "block", filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.25))" }} />
        </div>
      </section>


      {/* GRILLE DES DÉFIS PAR MODULE */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))", gap: 18 }}>
        {worlds.map((world, wi) => {
          const totalLessons = world.lessons.length;
          const completedLessons = world.lessons.filter((l) => progress.completed.includes(l.id)).length;
          const isModuleDone = isDevMode() || completedLessons >= totalLessons;
          const challengeId = `defi-${age}-${world.id}`;
          const isChallengeDone = progress.completed.includes(challengeId);

          return (
            <div
              key={world.id}
              style={{
                background: "#FFF",
                border: isChallengeDone ? "2.5px solid #10B981" : isModuleDone ? "2.5px solid #F59E0B" : "2px solid #E2E8F0",
                borderRadius: 22,
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 16,
                boxShadow: isModuleDone ? "0 8px 20px rgba(0,0,0,0.06)" : "0 2px 6px rgba(0,0,0,0.03)",
                opacity: isModuleDone ? 1 : 0.85,
                transition: "transform .15s ease, box-shadow .15s ease"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", color: "#0D846E" }}>
                      <ModuleIcon name={world.icon} size={20} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 900, color: "#64748B", letterSpacing: ".1em", textTransform: "uppercase" }}>
                      MODULE {wi + 1}
                    </span>
                  </div>
                  {isChallengeDone ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#ECFDF5", color: "#059669", fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 999, border: "1px solid #A7F3D0" }}>
                      <CheckCircle2 size={13} /> Défi réussi
                    </span>
                  ) : isModuleDone ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#FEF3C7", color: "#D97706", fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 999, border: "1px solid #FDE68A" }}>
                      <Sparkles size={13} /> Prêt à jouer
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#F1F5F9", color: "#64748B", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>
                      <Lock size={12} /> Verrouillé
                    </span>
                  )}
                </div>

                <h3 className="gm-title" style={{ fontSize: 20, fontWeight: 700, color: "#0E3A2E", margin: "0 0 6px 0", lineHeight: 1.25 }}>
                  {world.title}
                </h3>
                <p style={{ fontSize: 13.5, color: "#64748B", margin: 0, lineHeight: 1.45 }}>
                  {world.description}
                </p>
              </div>

              {/* BARRE DE PROGRESSION DU MODULE */}
              <div style={{ background: "#F8FAFC", borderRadius: 14, padding: "10px 14px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                  <span>Leçons du module</span>
                  <span>{completedLessons} / {totalLessons} terminées</span>
                </div>
                <div style={{ height: 8, background: "#E2E8F0", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(completedLessons / totalLessons) * 100}%`, background: isModuleDone ? "#10B981" : "#F59E0B", borderRadius: 999, transition: "width .3s" }} />
                </div>
              </div>

              {/* ACTION DU DÉFI */}
              <div>
                {isModuleDone ? (
                  <button
                    onClick={() => {
                      openLevel({
                        id: challengeId,
                        kind: wi % 2 === 0 ? "quiz" : "defi",
                        title: `Défi Module ${wi + 1} : ${world.title}`,
                        desc: `Valide tes acquis sur le Module ${wi + 1} (« ${world.title} ») et gagne 50 XP !`,
                        xp: 50,
                        quizIndex: Math.min(wi, 9),
                        moduleId: world.id,
                        moduleTitle: world.title,
                        moduleNumber: wi + 1
                      });
                    }}
                    style={{
                      width: "100%",
                      border: "none",
                      borderRadius: 14,
                      background: isChallengeDone ? "#E2E8F0" : "#C8F24D",
                      color: isChallengeDone ? "#334155" : "#0E3A2E",
                      fontFamily: "'Baloo 2', cursive",
                      fontSize: 16,
                      fontWeight: 700,
                      padding: "11px 18px",
                      cursor: "pointer",
                      boxShadow: isChallengeDone ? "none" : "0 4px 0 #8FB22F",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      transition: "transform .12s"
                    }}
                  >
                    <Trophy size={18} />
                    {isChallengeDone ? "Rejouer le défi (+50 XP)" : "Lancer le Défi (+50 XP) →"}
                  </button>
                ) : (
                  <Link
                    href="/dashboard/modules"
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      background: "#F1F5F9",
                      color: "#64748B",
                      border: "1.5px solid #CBD5E1",
                      fontFamily: "'Baloo 2', cursive",
                      fontSize: 14.5,
                      fontWeight: 700,
                      padding: "10px 16px",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxSizing: "border-box"
                    }}
                  >
                    <Lock size={15} /> Terminer le Module {wi + 1} pour débloquer →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
