"use client";

import { useEffect, useState } from "react";
import { Lock, Star } from "lucide-react";
import { tracks } from "../lms-data";
import { type GameLevel } from "./games-map-data";
import { World1Background } from "./World1Background";
import { World2Background } from "./World2Background";
import { World3Background } from "./World3Background";
import { NodeState } from "./GamesMapShared";

export const LEVEL_BACKGROUNDS: Record<number, string> = {
  1: "/images/parcours79/modules/m01-fond.webp",
  2: "/images/parcours79/modules/m02-fond.webp",
  3: "/images/parcours79/modules/m03-fond.webp",
  4: "/images/parcours79/modules/m04-fond.webp",
  5: "/images/parcours79/modules/m05-fond.webp",
  6: "/images/parcours79/modules/m06-fond.webp",
  7: "/images/parcours79/modules/m07-fond.webp",
  8: "/images/parcours79/modules/m08-fond.webp",
  9: "/images/parcours79/modules/m09-fond.webp",
  10: "/images/parcours79/modules/m10-fond.webp",
};

function ChestIcon() {
  return (
    <svg width="48" height="44" viewBox="0 0 48 44" fill="none">
      <rect x="4" y="14" width="40" height="26" rx="5" fill="#C9A977" stroke="#7A5C2E" strokeWidth={3} />
      <path d="M4 22h40" stroke="#7A5C2E" strokeWidth={3} />
      <path d="M6 14c2-7 8-10 18-10s16 3 18 10" stroke="#7A5C2E" strokeWidth={3} fill="#D8BC8B" />
      <rect x="20" y="18" width="8" height="12" rx="2" fill="#F4B63F" stroke="#7A5C2E" strokeWidth={2.5} />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="58" height="58" viewBox="0 0 24 24" fill="none">
      <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.7 1.2 6.6L12 17.6 6.1 20.8l1.2-6.6L2.5 9.5l6.6-.9z" fill="#F4B63F" stroke="#D7F26B" strokeWidth={1.2} />
    </svg>
  );
}

// Décors SVG par monde (repris du prototype Roadmap Jeux.dc.html, viewBox 720x960).
export function WorldBackground({ world }: { world: 0 | 1 | 2 }) {
  if (world === 0) {
    return <World1Background />;
  }
  if (world === 1) {
    return <World2Background />;
  }
  return <World3Background />;
}

/** Vrai sur tablette et mobile (<= 1024px) : la carte adopte le chemin vertical de haut en bas. */
export function useCompactMap(): boolean {
  const [compact, setCompact] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(max-width: 1024px)").matches;
    }
    return false;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(max-width: 1024px)");
    const update = () => setCompact(query.matches);
    update();
    try {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    } catch {
      query.addListener(update);
      return () => query.removeListener(update);
    }
  }, []);
  return compact;
}

/** Vrai sur tablette (601px à 1024px) : cibles tactiles et polices généreuses. */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(min-width: 601px) and (max-width: 1024px)").matches;
    }
    return false;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(min-width: 601px) and (max-width: 1024px)");
    const update = () => setIsTablet(query.matches);
    update();
    try {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    } catch {
      query.addListener(update);
      return () => query.removeListener(update);
    }
  }, []);
  return isTablet;
}

export function LevelNode({
  level,
  state,
  starsEarned,
  isNextInLine,
  onOpen,
  inline = false,
  compact = false,
  isTablet: isTabletProp,
  overridePos
}: {
  level: GameLevel;
  state: NodeState;
  starsEarned?: number;
  isNextInLine?: boolean;
  onOpen: () => void;
  inline?: boolean;
  compact?: boolean;
  isTablet?: boolean;
  overridePos?: { x: string | number; y: string | number };
}) {
  const isTabletHook = useIsTablet();
  const isTablet = isTabletProp ?? isTabletHook;
  const n = Number(level.id.split("-")[2]);
  const pillWrap = isTablet
    ? { whiteSpace: "nowrap" as const, textAlign: "center" as const, maxWidth: 240, overflow: "hidden" as const, textOverflow: "ellipsis" as const }
    : compact
    ? { whiteSpace: "nowrap" as const, textAlign: "center" as const, maxWidth: 125, overflow: "hidden" as const, textOverflow: "ellipsis" as const }
    : inline
    ? { whiteSpace: "normal" as const, textAlign: "center" as const, maxWidth: 220 }
    : { whiteSpace: "nowrap" as const };
  const isChest = level.kind === "coffre";
  const isDefi = level.kind === "defi";
  const stars = starsEarned ?? 0;

  const btnClass = `gm-node-btn ${state === "current" ? "gm-node-current" : state === "locked" ? "locked" : "gm-node-done"}`;

  const posStyle = overridePos
    ? { position: "absolute" as const, left: overridePos.x, top: overridePos.y, transform: "translate(-50%,-50%)" }
    : inline
    ? { position: "relative" as const }
    : { position: "absolute" as const, left: level.x, top: level.y, transform: "translate(-50%,-50%)" };

  // Tailles adaptées :
  // Mobile (< 601px) : compact (46px / 52px)
  // Tablette (601px - 1024px) : généreux et ergonomique (84px / 96px, défi 96px)
  // Desktop (> 1024px) : plein format (100px / 112px, défi 126px)
  const normalSize = isTablet ? (state === "current" ? 96 : 84) : compact ? (state === "current" ? 52 : 46) : (state === "current" ? 112 : 100);
  const defiSize = isTablet ? 96 : compact ? 56 : 126;
  const borderWidth = isTablet ? 4.5 : compact ? 3 : 5;

  return (
    <div id={`gm-node-${level.id}`} style={{ ...posStyle, display: "flex", flexDirection: "column", alignItems: "center", gap: isTablet ? 7 : compact ? 3 : 7, zIndex: state === "current" ? 15 : 5 }}>
      
      {state === "current" && !isChest && (
        <div style={{ background: "#0E4B3C", color: "#D7F26B", borderRadius: 999, padding: isTablet ? "4px 14px" : compact ? "1px 7px" : "3px 12px", fontSize: isTablet ? 12.5 : compact ? 9 : 12, fontWeight: 800, letterSpacing: ".06em", animation: "kiFloat 2.6s ease-in-out infinite", whiteSpace: "nowrap" }}>
          À TOI DE JOUER
        </div>
      )}

      {state === "locked" && isNextInLine && !isChest && (
        <div style={{ background: "#DC2626", color: "#FFF", borderRadius: 999, padding: isTablet ? "4px 14px" : compact ? "1px 7px" : "3px 11px", fontSize: isTablet ? 12.5 : compact ? 9 : 12, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center", gap: 3, boxShadow: "0 2px 8px rgba(220,38,38,0.35)", animation: "kiFloat 2.6s ease-in-out infinite", whiteSpace: "nowrap" }}>
          <Lock size={isTablet ? 13 : compact ? 9 : 11} /> M{level.moduleNumber} REQUIS
        </div>
      )}

      {isDefi ? (
        <>
          <div style={{ fontSize: isTablet ? 12 : compact ? 9 : 12, fontWeight: 800, letterSpacing: ".08em", color: "#4A3610", whiteSpace: "nowrap" }}>DÉFI SEMAINE</div>
          <div style={{ position: "relative" }}>
            <button
              data-node={n}
              onClick={onOpen}
              className={btnClass}
              aria-label={`Défi : ${level.title}`}
              style={{ position: "relative", width: defiSize, height: defiSize, borderRadius: "50%", border: `${borderWidth}px solid #0E4B3C`, background: "#0E4B3C", cursor: "pointer", display: "grid", placeItems: "center", padding: 0, boxShadow: isTablet ? "0 6px 0 #093429" : compact ? "0 4px 0 #093429" : "0 7px 0 #093429", transition: "transform .14s" }}
            >
              <svg width={isTablet ? "46" : compact ? "28" : "56"} height={isTablet ? "46" : compact ? "28" : "56"} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.7 1.2 6.6L12 17.6 6.1 20.8l1.2-6.6L2.5 9.5l6.6-.9z" fill="#F4B63F" stroke="#D7F26B" strokeWidth={1.2}/></svg>
              <span style={{ position: "absolute", bottom: -2, right: -2, width: isTablet ? 26 : compact ? 18 : 34, height: isTablet ? 26 : compact ? 18 : 34, borderRadius: "50%", background: "#FBF4DE", border: `${isTablet ? 2.5 : compact ? 2 : 3}px solid #0E4B3C`, display: "grid", placeItems: "center" }}>
                <svg width={isTablet ? "14" : compact ? "9" : "15"} height={isTablet ? "15" : compact ? "10" : "17"} viewBox="0 0 34 36" fill="none" aria-hidden="true"><rect x="5" y="15" width="24" height="18" rx="4" fill="#C3B99C" stroke="#453E2C" strokeWidth="3"/><path d="M11 15v-4a6 6 0 0112 0v4" stroke="#453E2C" strokeWidth="3" strokeLinecap="round"/></svg>
              </span>
              {state === "current" && (
                <span style={{ position: "absolute", inset: -4, borderRadius: "50%", border: `${borderWidth}px solid #0E4B3C`, background: "#F4B63F", display: "grid", placeItems: "center", animation: "kiPulse 2.2s ease-in-out infinite" }}>
                  <svg width={isTablet ? "46" : compact ? "28" : "56"} height={isTablet ? "46" : compact ? "28" : "56"} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.7 1.2 6.6L12 17.6 6.1 20.8l1.2-6.6L2.5 9.5l6.6-.9z" fill="#0E4B3C" stroke="#0E4B3C" strokeWidth={1.2}/></svg>
                </span>
              )}
            </button>
          </div>
          <div className="gm-node-pill" style={{ background: "#F4B63F", color: "#0E3A2E", border: `${compact && !isTablet ? 1.5 : 2}px solid #0E4B3C`, borderRadius: 999, padding: isTablet ? "5px 14px" : compact ? "2px 8px" : "5px 15px", fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: isTablet ? 14 : compact ? 10.5 : 14, ...pillWrap }} title={level.title}>
            {level.title}
          </div>
        </>
      ) : isChest ? (
        <>
          <div style={{ position: "relative" }}>
            {state === "current" && <span style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "3px solid #C8F24D", animation: "kiRing 2.2s ease-out infinite", pointerEvents: "none" }}></span>}
            <button
              data-node={n}
              onClick={onOpen}
              className={btnClass}
              aria-label={`Coffre : ${level.title}`}
              style={{ position: "relative", width: normalSize, height: normalSize, borderRadius: "50%", border: state === "done" ? `${borderWidth}px solid #0E4B3C` : state === "current" ? `${borderWidth}px solid #0E4B3C` : `${compact && !isTablet ? 2.5 : 4}px dashed #7E7660`, background: state === "done" ? "#F4B63F" : state === "current" ? "#C8F24D" : "#E8E2CE", cursor: "pointer", display: "grid", placeItems: "center", padding: 0, transition: "transform .14s", animation: state === "current" ? "kiPulse 2.2s ease-in-out infinite" : "none" }}
            >
              <div style={{ transform: isTablet ? "scale(0.95)" : compact ? "scale(0.55)" : "none" }}><ChestIcon /></div>
            </button>
          </div>
          <div className="gm-node-pill" style={{ background: state === "current" ? "#0E4B3C" : state === "done" ? "#fff" : "#FBF4DE", color: state === "current" ? "#fff" : state === "done" ? "#0E3A2E" : "#3B3525", border: state === "current" ? `${compact && !isTablet ? 1.5 : 2}px solid #0E4B3C` : state === "done" ? `${compact && !isTablet ? 1.5 : 2}px solid #0E4B3C` : `${compact && !isTablet ? 1.5 : 2}px dashed #7E7660`, borderRadius: 999, padding: isTablet ? "5px 14px" : compact ? "2px 8px" : "5px 15px", fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: isTablet ? 14 : compact ? 10.5 : 14.5, ...pillWrap }} title={level.title}>
            {level.title}
          </div>
        </>
      ) : (
        <>
          <div style={{ position: "relative" }}>
            {state === "current" && <span style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "3px solid #C8F24D", animation: "kiRing 2.2s ease-out infinite", pointerEvents: "none" }}></span>}
            <button
              data-node={n}
              onClick={onOpen}
              className={btnClass}
              aria-label={`Niveau ${n} : ${level.title}`}
              style={{ position: "relative", width: normalSize, height: normalSize, borderRadius: "50%", border: state === "done" ? `${borderWidth}px solid #0E4B3C` : state === "current" ? `${borderWidth}px solid #0E4B3C` : `${compact && !isTablet ? 2.5 : 4}px dashed #7E7660`, background: state === "done" ? "#F4B63F" : state === "current" ? "#C8F24D" : "#E8E2CE", cursor: state === "locked" ? "default" : "pointer", display: "grid", placeItems: "center", padding: 0, fontFamily: "'Baloo 2',cursive", fontSize: isTablet ? (state === "current" ? 32 : 28) : compact ? (state === "current" ? 20 : 18) : (state === "current" ? 36 : 28), fontWeight: 700, color: state === "done" ? "#0E3A2E" : state === "current" ? "#0E3A2E" : "#4A4333", fontFeatureSettings: "'tnum'", transition: "transform .14s", animation: state === "current" ? "kiPulse 2.2s ease-in-out infinite" : "none" }}
            >
              {state === "locked" ? (
                <>
                  <svg width={isTablet ? "30" : compact ? "18" : "34"} height={isTablet ? "32" : compact ? "20" : "36"} viewBox="0 0 34 36" fill="none" aria-hidden="true"><rect x="5" y="15" width="24" height="18" rx="4" fill="#C3B99C" stroke="#4A4333" strokeWidth="2.5"/><path d="M11 15v-4a6 6 0 0112 0v4" stroke="#4A4333" strokeWidth="2.5" strokeLinecap="round"/><circle cx="17" cy="24" r="2.5" fill="#4A4333"/></svg>
                  <span style={{ position: "absolute", bottom: -2, right: -2, width: isTablet ? 26 : compact ? 16 : 30, height: isTablet ? 26 : compact ? 16 : 30, borderRadius: "50%", background: "#FBF4DE", border: `${isTablet ? 2.5 : compact ? 1.5 : 2.5}px solid #7E7660`, display: "grid", placeItems: "center", fontFamily: "'Baloo 2',cursive", fontSize: isTablet ? 14 : compact ? 9 : 14, fontWeight: 700, color: "#3B3525", fontFeatureSettings: "'tnum'" }}>{n}</span>
                </>
              ) : (
                n
              )}
              
              {state === "done" && (
                <span style={{ position: "absolute", inset: -3, borderRadius: "50%", border: `${borderWidth}px solid #0E4B3C`, background: "#F4B63F", display: "grid", placeItems: "center", animation: "kiPop .4s ease" }}>
                  {n}
                  <div style={{ position: "absolute", top: isTablet ? -22 : compact ? -14 : -24, display: "flex", gap: 1, color: "#FFC107", filter: "drop-shadow(0 2px 4px rgba(255,193,7,0.6))" }}>
                    <span style={{ opacity: stars >= 1 ? 1 : 0.3 }}><Star size={isTablet ? 16 : compact ? 9 : 16} fill="#FFC107" /></span>
                    <span style={{ opacity: stars >= 2 ? 1 : 0.3, transform: "translateY(-1px)" }}><Star size={isTablet ? 16 : compact ? 9 : 16} fill="#FFC107" /></span>
                    <span style={{ opacity: stars >= 3 ? 1 : 0.3 }}><Star size={isTablet ? 16 : compact ? 9 : 16} fill="#FFC107" /></span>
                  </div>
                </span>
              )}
            </button>
          </div>
          <div className="gm-node-pill" style={{ background: state === "current" ? "#0E4B3C" : state === "done" ? "#fff" : "#FBF4DE", color: state === "current" ? "#fff" : state === "done" ? "#0E3A2E" : "#3B3525", border: state === "current" ? `${compact && !isTablet ? 1.5 : 2}px solid #0E4B3C` : state === "done" ? `${compact && !isTablet ? 1.5 : 2}px solid #0E4B3C` : `${compact && !isTablet ? 1.5 : 2}px dashed #7E7660`, borderRadius: 999, padding: isTablet ? "5px 14px" : compact ? "2px 8px" : "5px 15px", fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: isTablet ? 14 : compact ? 10.5 : 14.5, ...pillWrap }} title={level.title}>
            {level.title}
          </div>
        </>
      )}

    </div>
  );
}

export const getModuleProgress = (moduleId: string, arr: string[]) => {
  const world = tracks["7-9"].worlds.find((w) => w.id === moduleId);
  const total = world ? world.lessons.length : 4;
  const done = world ? world.lessons.filter((l) => arr.includes(l.id)).length : [1, 2, 3, 4].filter((i) => arr.includes(`${moduleId}-${i}`)).length;
  return { done, total, isComplete: done >= total, title: world?.title || "" };
};
