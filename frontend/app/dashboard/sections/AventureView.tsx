"use client";

import React from "react";
import { Check, Flame, Star, Volume2 } from "lucide-react";
import { AgeKey, tracks, World } from "../../lms-data";
import { Progress } from "../dashboardShared";
import { sayUi } from "../parcours79/uiVoice";

/** Ce que dit Palou quand on touche son portrait : sa voix officielle (content/voix-ui.json, clé « accueil-palou »). */
import QuotidienView, { QuotidienViewProps } from "./QuotidienView";
import { DailyChallengeCard } from "../DailyChallengeCard";
import { ScrollDownHint } from "../components/ScrollDownHint";

export type Track = (typeof tracks)[AgeKey];

export interface AventureViewProps {
  headerImg: string;
  headerTitle: string;
  headerSubtitle: string;
  signedIn: boolean;
  finalDisplayName: string;
  progress: Progress;
  track: Track;
  percent: number;
  done: number;
  totalLessons: number;
  map79?: {
    current: { lessonId: string; moduleId: string } | null;
    waitingForContent: boolean;
  } | null;
  nextLesson?: { title: string; world: World } | null;
  lessonLimitReached: boolean;
  age: AgeKey;
  easterEggFound: boolean;
  onEasterEggClick: () => void;
  onStartLesson79: (lessonId: string, moduleId: string) => void;
  onOpenWorld: (world: World) => void;
  quotidienProps: QuotidienViewProps;
}

export default function AventureView({
  headerImg,
  headerTitle,
  headerSubtitle,
  signedIn,
  finalDisplayName,
  progress,
  track,
  percent,
  done,
  totalLessons,
  map79,
  nextLesson,
  lessonLimitReached,
  age,
  easterEggFound,
  onEasterEggClick,
  onStartLesson79,
  onOpenWorld,
  quotidienProps,
}: AventureViewProps) {
  return (
    <div className="dash-content">
      {/* ═══ BIENVENUE & ANECDOTE & STREAK ═══ */}
      <section
        className="welcome-row lms-anchor"
        id="lms-adventure"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          position: "relative",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Gauche: Avatar + Text + Voix de Palou */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flex: "1 1 240px", minWidth: 0, maxWidth: "100%" }}>
          <div
            key={headerImg}
            style={{ animation: "palouPopIn 0.5s ease-out forwards", flexShrink: 0, cursor: "pointer" }}
            onClick={() => void sayUi("accueil-palou")}
            title="Clique pour écouter Palou !"
            role="button"
            tabIndex={0}
            aria-label="Écouter la voix de Palou"
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") void sayUi("accueil-palou"); }}
          >
            <img
              src={`/images/palou/${headerImg}`}
              alt="Palou kEur IA"
              style={{
                width: "clamp(80px, 22vw, 130px)",
                height: "auto",
                maxHeight: 130,
                objectFit: "contain",
                filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.1))",
                animation: "palouFloat 6s ease-in-out infinite 0.5s",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0, flex: 1 }}>
            <div key={headerTitle} style={{ animation: "fadeText 0.5s ease-out forwards" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span className="tiny-kicker" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>MON TABLEAU DE BORD • MON AVENTURE</span>
                <button
                  type="button"
                  onClick={() => void sayUi("accueil-palou")}
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#0f755f",
                    borderRadius: "999px",
                    padding: "3px 10px",
                    fontSize: "12px",
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(15,117,95,0.1)",
                  }}
                  title="Écouter Palou te saluer !"
                  aria-label="Écouter Palou"
                >
                  <Volume2 size={15} color="#0f755f" />
                  <span>Écouter Palou</span>
                </button>
              </div>
              <h1 style={{ margin: "4px 0", fontSize: "clamp(20px, 5vw, 32px)", lineHeight: 1.2, wordBreak: "break-word" }}>
                {headerTitle}, {signedIn ? finalDisplayName.split(" ")[0] : "Explorateur"} !
              </h1>
              <p style={{ margin: 0, fontSize: "clamp(12px, 3.5vw, 14px)", color: "#64748b" }}>{headerSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Droite: Chemin de Flamme (Streak) */}
        <div
          className="streak-card-wrapper"
          style={{
            background: "white",
            padding: "16px",
            borderRadius: "20px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.05)",
            border: "1px solid #f1f5f9",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            maxWidth: "340px",
            boxSizing: "border-box",
            marginTop: "10px",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 900,
              color: "#94a3b8",
              textTransform: "uppercase",
              marginBottom: "12px",
              letterSpacing: "0.5px",
            }}
          >
            Ta progression
          </div>
          <div style={{ display: "flex", gap: "clamp(4px, 1.8vw, 8px)", justifyContent: "center", width: "100%" }}>
            {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => {
              const currentDayIdx = (new Date().getDay() + 6) % 7;
              const isActive = i <= currentDayIdx && progress.streak > currentDayIdx - i;
              const isToday = i === currentDayIdx;
              return (
                <div key={day + i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div
                    style={{
                      width: "clamp(32px, 8vw, 38px)",
                      height: "clamp(32px, 8vw, 38px)",
                      borderRadius: "10px",
                      background: isActive ? "#fef08a" : "#f1f5f9",
                      border: isToday ? "2px solid #eab308" : "1px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      boxShadow: isActive ? "0 4px 12px rgba(234, 179, 8, 0.25)" : "none",
                      transition: "0.3s",
                    }}
                  >
                    {isActive ? (
                      <Flame size={18} color="#f97316" fill="#f97316" />
                    ) : (
                      <span style={{ color: "#cbd5e1", fontSize: "12px", fontWeight: 900 }}>{day}</span>
                    )}
                  </div>
                  {isToday && <div style={{ width: "5px", height: "5px", background: "#eab308", borderRadius: "50%" }} />}
                </div>
              );
            })}
          </div>
        </div>
      </section>


      {/* ═══ TRACK HERO : LE BOUTON CONTINUER & PROGRESSION ═══ */}
      <section
        className="track-hero"
        style={{ marginTop: "20px", marginBottom: "44px", position: "relative", overflow: "hidden" }}
      >
        {!easterEggFound && !progress.completed.includes("bonus-easter-egg") && (
          <span
            onClick={onEasterEggClick}
            style={{
              position: "absolute",
              top: "20px",
              right: "35px",
              fontSize: "24px",
              cursor: "pointer",
              animation: "palouFloat 2s infinite",
              filter: "drop-shadow(0 0 10px rgba(255,255,255,0.8))",
              zIndex: 10,
            }}
            title="Bonus secret !"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEasterEggClick(); }}
          >
            <Star size={24} color="#f59e0b" fill="#f59e0b" />
          </span>
        )}
        <div className="track-hero-content">
          <span>{track.name.toUpperCase()}</span>
          <h2>{track.tagline}</h2>

          {/* Mini-carte de progression */}
          <div
            className="track-steps"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: "20px 0",
              background: "rgba(0,0,0,0.2)",
              padding: "10px 14px",
              borderRadius: "16px",
              maxWidth: "100%",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
            }}
          >
            {track.worlds.map((w, i) => {
              const wd = w.lessons.filter((l) => progress.completed.includes(l.id)).length;
              const isDone = wd === w.lessons.length;
              const isCurrent = !isDone && (i === 0 || track.worlds[i - 1].lessons.every((l) => progress.completed.includes(l.id)));
              return (
                <div key={w.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: isDone ? "#a3e635" : isCurrent ? "#fef08a" : "rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 900,
                      color: isCurrent ? "#854d0e" : isDone ? "#3f6212" : "white",
                      boxShadow: isCurrent ? "0 0 15px rgba(254,240,138,0.5)" : "none",
                      border: isCurrent ? "2px solid white" : "none",
                    }}
                  >
                    {isDone ? <Check size={14} /> : i + 1}
                  </div>
                  {i < track.worlds.length - 1 && (
                    <div
                      style={{
                        width: "20px",
                        height: "4px",
                        background: isDone ? "#a3e635" : "rgba(255,255,255,0.2)",
                        borderRadius: "2px",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="overall" style={{ marginBottom: "18px" }}>
            <i>
              <b style={{ width: `${percent}%` }} />
            </i>
            <strong>{percent}%</strong>
            <small>{done}/{totalLessons} leçons</small>
          </div>

          {map79 ? (
            map79.current ? (
              <button
                type="button"
                className="track-hero-btn"
                disabled={lessonLimitReached}
                onClick={() => onStartLesson79(map79.current!.lessonId, map79.current!.moduleId)}
              >
                {lessonLimitReached
                  ? "Programme du jour terminé"
                  : `Continuer : ${track.worlds.flatMap((w) => w.lessons).find((l) => l.id === map79.current!.lessonId)?.title ?? "ma leçon"} →`}
              </button>
            ) : (
              map79.waitingForContent && (
                <button type="button" className="track-hero-btn" disabled>
                  La suite arrive bientôt !
                </button>
              )
            )
          ) : (
            nextLesson && (
              <button
                type="button"
                className="track-hero-btn"
                disabled={lessonLimitReached}
                onClick={() => onOpenWorld(nextLesson.world)}
              >
                {lessonLimitReached ? "Programme du jour terminé" : `Continuer : ${nextLesson.title} →`}
              </button>
            )
          )}
        </div>
        <div className="track-hero-visual">
          <img
            src={`/images/age-${age}.webp`}
            alt={`Illustration du parcours ${track.label}`}
            style={{ objectPosition: "center 20%" }}
          />
        </div>
      </section>

      {/* ═══ DÉFI ÉCLAIR DU JOUR : tout en haut, juste sous le grand bandeau, pour qu'il se voie à chaque nouveau jour ═══ */}
      {quotidienProps.signedIn && !quotidienProps.visitorChildId && (
        <DailyChallengeCard onResult={quotidienProps.onChallengeResult} />
      )}

      {/* ═══ QUOTIDIEN VIEW (DÉFIS, PROGRAMME DU JOUR, ATELIERS, CITOYENNETÉ) ═══ */}
      <QuotidienView {...quotidienProps} />

      {/* Indicateur de défilement mobile unifié style Keur IA */}
      <ScrollDownHint scrollOffset={380} ariaLabel="Faire défiler vers mon programme du jour" />
    </div>
  );
}
