"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Lock, Play, Rocket, Star } from "lucide-react";
import { AgeKey, computeEarnedBadges } from "../lms-data";
import { GAME_WORLDS, GAME_LEVELS, TOTAL_LEVELS, type GameLevel } from "./games-map-data";
import { TutorialOverlay } from "./TutorialOverlay";
import { LEVEL_BACKGROUNDS, LevelNode, WorldBackground, getModuleProgress, useCompactMap, useIsTablet } from "./GamesMapParts";
import { NodeState } from "./GamesMapShared";
import { ScrollDownHint } from "./components/ScrollDownHint";

const kindLabel = (k: GameLevel["kind"]) =>
  k === "quiz" ? "QUIZ" : k === "jeu" ? "JEU INTERACTIF" : k === "coffre" ? "COFFRE" : "DÉFI";

type GamesMapViewProps = {
  /** La progression serveur est chargée (sinon `completed` est encore vide et les guides « première fois » ne doivent pas s'afficher). */
  progressLoaded?: boolean;
  age: AgeKey;
  ageLocked: boolean;
  setAge: (age: AgeKey) => void;
  /** IDs de leçons/niveaux terminés (progress.completed, partagé avec le reste du dashboard). */
  completed: string[];
  /** Contient les étoiles obtenues pour chaque niveau (Record<string, number>) */
  lessonStars: Record<string, number>;
  /** XP totale gagnée par l'élève */
  xp?: number;
  /** Nombre total d'étoiles gagnées */
  totalStars?: number;
  /** Nombre total de badges obtenus */
  badgesCount?: number;
  /** Persiste la complétion d'un niveau (POST /api/progress) et met à jour l'XP partagée. Utilisé directement pour les coffres (pas de mini-jeu). */
  onComplete: (id: string, xp: number, kind: GameLevel["kind"]) => Promise<void>;
  /** Demande au parent d'ouvrir le vrai mini-jeu/quiz correspondant à ce niveau. */
  onPlay: (level: GameLevel) => void;
};

const isModuleCompleted = (moduleId: string, arr: string[]) => getModuleProgress(moduleId, arr).isComplete;

export default function GamesMapView({
  age,
  ageLocked,
  setAge,
  completed,
  lessonStars,
  xp,
  totalStars,
  badgesCount,
  onComplete,
  onPlay,
  progressLoaded = true
}: GamesMapViewProps) {
  const compact = useCompactMap();
  const isTablet = useIsTablet();
  // Entre téléphone et grand écran : la carte (dessinée pour 1000 px) se réduit proportionnellement à la largeur disponible.
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [mapScale, setMapScale] = useState(1);
  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setMapScale(Math.min(1, Math.max(0.55, (el.clientWidth - 40) / 1000)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [compact]);
  const [open, setOpen] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState<{ xp: number; id: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (open !== null) setOpen(null);
        if (celebrate !== null) setCelebrate(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, celebrate]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("keuria_dev_unlock_all");
    }
  }, []);

  const effectiveCompleted = completed;

  // La carte (nœuds + avatar) ne doit avancer visuellement qu'une fois que
  // rien ne la masque (popup de détail fermée, écran de célébration terminé) :
  // sinon l'enfant ferme et retrouve Palou déjà arrivé, sans avoir vu le trajet.
  const [displayCompleted, setDisplayCompleted] = useState(effectiveCompleted);
  const [worldCelebrate, setWorldCelebrate] = useState<number | null>(null);
  const effectiveCompletedGames = GAME_LEVELS.filter(l => effectiveCompleted.includes(l.id)).length;
  const [prevCompletedLength, setPrevCompletedLength] = useState(effectiveCompletedGames);

  // Détection de la complétion d'un monde
  useEffect(() => {
    if (effectiveCompletedGames > prevCompletedLength) {
      const getFirstIncompleteIndex = (arr: string[]) => GAME_LEVELS.findIndex((l) => !arr.includes(l.id));
      
      const prevIdx = getFirstIncompleteIndex(displayCompleted);
      const oldCurrent = prevIdx === -1 ? TOTAL_LEVELS + 1 : prevIdx + 1;
      
      const newIdx = getFirstIncompleteIndex(effectiveCompleted);
      const newCurrent = newIdx === -1 ? TOTAL_LEVELS + 1 : newIdx + 1;

      const oldWorld = oldCurrent <= TOTAL_LEVELS ? GAME_LEVELS[oldCurrent - 1].world : 2;
      const newWorld = newCurrent <= TOTAL_LEVELS ? GAME_LEVELS[newCurrent - 1].world : 3;

      if (newWorld > oldWorld) {
        setWorldCelebrate(oldWorld);
      }
      setPrevCompletedLength(effectiveCompletedGames);
    }
  }, [effectiveCompletedGames, prevCompletedLength, displayCompleted]);

  useEffect(() => {
    if (open === null && !celebrate && worldCelebrate === null) {
      setDisplayCompleted(completed);
    }
  }, [completed, open, celebrate, worldCelebrate]);

  const firstIncompleteIndex = GAME_LEVELS.findIndex((l) => !displayCompleted.includes(l.id));
  const current = firstIncompleteIndex === -1 ? TOTAL_LEVELS + 1 : firstIncompleteIndex + 1;

  // Fait défiler la page jusqu'à Palou dès qu'il change de position affichée
  // (notamment en changeant de monde, où le saut vertical est important et
  const [tutorialStep, setTutorialStep] = useState(0);
  
  // Ref pour le bouton manuel "Reprendre mon aventure" (aucun défilement automatique à l'ouverture)
  const avatarRef = useRef<HTMLDivElement>(null);

  const selected = open != null ? GAME_LEVELS[open - 1] : null;
  const modalStars = selected ? (lessonStars[selected.id] ?? 0) : 0;
  const done = selected ? completed.includes(selected.id) : false;
  const lockedSequential = selected ? open! > current : false;
  const selectedModProg = selected ? getModuleProgress(selected.moduleId, completed) : null;
  const lockedModule = selectedModProg ? !selectedModProg.isComplete : false;
  const locked = selected ? (!done && (lockedSequential || lockedModule)) : false;
  const isChest = selected?.kind === "coffre";
  const hasContent = isChest || selected?.gameIndex != null || selected?.quizIndex != null;

  const progressPct = Math.round(((current - 1) / TOTAL_LEVELS) * 100);

  // Statistiques réelles du compte utilisateur
  const realXp = xp ?? 0;

  const realStars = useMemo(() => {
    if (typeof totalStars === "number") return totalStars;
    const fromDict = Object.values(lessonStars || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);
    if (fromDict > 0) return fromDict;
    return GAME_LEVELS.filter((l) => displayCompleted.includes(l.id)).reduce(
      (acc, l) => acc + Math.max(1, lessonStars?.[l.id] || 0),
      0
    );
  }, [totalStars, lessonStars, displayCompleted]);

  const realBadgesCount = useMemo(() => {
    if (typeof badgesCount === "number") return badgesCount;
    return computeEarnedBadges(displayCompleted.length, realXp, 1, {
      completedLessons: displayCompleted
    }).length;
  }, [badgesCount, displayCompleted, realXp]);

  const currentLevel = current <= TOTAL_LEVELS ? GAME_LEVELS[current - 1] : null;
  const currentModProg = currentLevel ? getModuleProgress(currentLevel.moduleId, completed) : null;
  const currentModFin = currentModProg ? currentModProg.isComplete : true;

  const bubbleText = !currentLevel
    ? "Tous les jeux et défis sont terminés. Bravo !"
    : !currentModFin
    ? `Pour débloquer le niveau ${current}, termine d'abord le Module ${currentLevel.moduleNumber} : « ${currentLevel.moduleTitle} » !`
    : currentLevel.kind === "coffre"
    ? `Le coffre est à toi : ouvre-le pour gagner ${currentLevel.xp} XP.`
    : `Prochaine étape : niveau ${current}, « ${currentLevel.title} ». ${currentLevel.meta}.`;

  // Position de l'avatar de Palou sur le chemin
  const targetAvatarLevel = currentLevel ?? GAME_LEVELS[TOTAL_LEVELS - 1];
  const [displayedAvatarLevel, setDisplayedAvatarLevel] = useState(() => {
    if (typeof window !== "undefined") {
      const lastId = localStorage.getItem("lastAvatarId");
      if (lastId && lastId !== targetAvatarLevel.id) {
        const lastLvl = GAME_LEVELS.find(l => l.id === lastId);
        if (lastLvl) return lastLvl;
      }
    }
    return targetAvatarLevel;
  });
  const [isFlying, setIsFlying] = useState(false);

  useEffect(() => {
    localStorage.setItem("lastAvatarId", targetAvatarLevel.id);
    if (displayedAvatarLevel.id !== targetAvatarLevel.id) {
      // Un petit délai pour que la carte se dessine d'abord à l'ancienne position, puis déclenche l'animation
      const t = setTimeout(() => {
        if (displayedAvatarLevel.world !== targetAvatarLevel.world) {
          setIsFlying(true);
          const id1 = setTimeout(() => {
            setDisplayedAvatarLevel(targetAvatarLevel);
          }, 50);
          const id2 = setTimeout(() => {
            setIsFlying(false);
          }, 2800);
        } else {
          setDisplayedAvatarLevel(targetAvatarLevel);
        }
      }, 500);
      return () => clearTimeout(t);
    }
  }, [targetAvatarLevel, displayedAvatarLevel]);

  const SCALE = 1000 / 720;
  const W_H = 550 * SCALE; // Hauteur synchronisée avec le conteneur du monde
  const B_H = 160 + 40; // 40px est le marginBottom ajouté dans la boucle GAME_WORLDS
  const avatarCenterY = (2 - displayedAvatarLevel.world) * (W_H + B_H) + 160 + displayedAvatarLevel.y * SCALE;
  
  // Avatar Palou décalé sur le côté du niveau (et non par-dessus) pour laisser le bouton et le numéro 100% visibles
  const AVATAR_WIDTH = 64;
  const nodeScaledX = displayedAvatarLevel.x * SCALE;
  const avatarLeft = nodeScaledX > 520
    ? nodeScaledX - 56 - AVATAR_WIDTH - 12
    : nodeScaledX + 56 + 12;
  const avatarTop = avatarCenterY - AVATAR_WIDTH / 2;

  const modalCta = !selected
    ? ""
    : locked
    ? "Verrouillé"
    : !hasContent
    ? "Bientôt disponible"
    : done
    ? "Rejouer"
    : isChest
    ? "Ouvrir le coffre"
    : selected.kind === "quiz"
    ? "Faire le quiz"
    : "Lancer le jeu";

  const handlePrimary = async () => {
    if (!selected || locked || !hasContent) return;
    if (isChest) {
      if (!completed.includes(selected.id)) {
        setSaving(true);
        await onComplete(selected.id, selected.xp, selected.kind);
        setSaving(false);
        setCelebrate({ xp: selected.xp, id: selected.id });
      }
      setOpen(null);
      return;
    }
    setOpen(null);
    onPlay(selected);
  };

  return (
    <div className="game-map">
      <div style={{ maxWidth: 1210, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* HERO SECTION */}
        <section className="page-hero" style={{ position: "relative", overflow: "hidden", borderRadius: 26, background: "linear-gradient(160deg,#0E4B3C 0%,#13624E 58%,#17715A 100%)", color: "#fff", padding: "26px 30px", display: "flex", alignItems: "center", gap: 24, minHeight: 196 }}>
          <svg viewBox="0 0 1100 220" preserveAspectRatio="xMidYMax slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }} aria-hidden="true">
            <circle cx="930" cy="42" r="30" fill="#F7C948" opacity={0.55}/>
            <path d="M0 220 L0 158 C120 128 230 168 350 150 C480 130 560 166 700 148 C820 132 980 162 1100 140 L1100 220 Z" fill="#0A3B30"/>
            <path d="M0 220 L0 190 C160 170 320 200 500 186 C680 172 900 198 1100 180 L1100 220 Z" fill="#08322a"/>
          </svg>

          <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".17em", color: "#D7F26B" }}>ESPACE JEUX & DÉFIS · PETITS EXPLORATEURS</div>
            <h1 className="gm-title" style={{ fontSize: 40, fontWeight: 700, margin: "7px 0 0", lineHeight: 1.02 }}>La carte des jeux et défis</h1>
            <p style={{ fontSize: 16, color: "#DCEBC2", margin: "9px 0 16px 0", maxWidth: 520, lineHeight: 1.45 }}>Avance sur le chemin de l'aventure et relève des défis pour gagner des étoiles !</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {currentModFin ? (
                <button onClick={() => avatarRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} style={{ border: "none", borderRadius: 14, background: "#C8F24D", color: "#0E3A2E", fontFamily: "'Baloo 2',cursive", fontSize: 17, fontWeight: 700, padding: "12px 22px", cursor: "pointer", boxShadow: "0 5px 0 #8FB22F", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, transition: "transform .12s" }}><Play size={16} fill="currentColor" /> Reprendre mon aventure</button>
              ) : (
                <Link href="/dashboard/modules" style={{ border: "none", borderRadius: 14, background: "#C8F24D", color: "#0E3A2E", fontFamily: "'Baloo 2',cursive", fontSize: 17, fontWeight: 700, padding: "12px 22px", cursor: "pointer", boxShadow: "0 5px 0 #8FB22F", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, transition: "transform .12s" }}>
                  <Rocket size={18} /> Aller au Module {currentLevel?.moduleNumber ?? 1} ({currentModProg?.done}/{currentModProg?.total} leçons) →
                </Link>
              )}
              <button onClick={() => window.dispatchEvent(new Event("replayTutorial"))} style={{ border: "2px solid #D7F26B", background: "transparent", color: "#D7F26B", borderRadius: 14, fontFamily: "'Baloo 2',cursive", fontSize: 16, fontWeight: 700, padding: "12px 18px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #D7F26B", display: "grid", placeItems: "center", fontSize: 12 }}>?</span>Comment jouer</button>
            </div>
          </div>

          <div className="page-hero-art" style={{ position: "relative", flex: "none", animation: "kiFloatSlow 5s ease-in-out infinite" }}>
            <img src="/palou/Joie.png" alt="Palou" style={{ width: 190, display: "block", filter: "drop-shadow(0 12px 16px rgba(0,0,0,.28))" }} />
          </div>
        </section>

        {/* BANNIÈRE DE VERROUILLAGE DU PREMIER JEU OU MODULE ACTIF (masquée sur mobile pour éviter la répétition) */}
        {!compact && (
          !isModuleCompleted("p1", completed) ? (
            <section className="gm-lock-banner" style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)", border: "3px solid #F59E0B", borderRadius: 22, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", boxShadow: "0 8px 24px rgba(245,158,11,0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#FFF", border: "3px solid #F59E0B", display: "grid", placeItems: "center", color: "#92400E", flexShrink: 0 }}>
                  <Lock size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#92400E", letterSpacing: ".1em", textTransform: "uppercase" }}>
                    Accès verrouillé · Règle du parcours
                  </div>
                  <div className="gm-title" style={{ fontSize: 20, fontWeight: 700, color: "#78350F", margin: "2px 0" }}>
                    Termine le Module 1 (« Bonjour, l’IA ! ») pour déverrouiller le premier jeu !
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
                    Progression du Module 1 : {getModuleProgress("p1", completed).done} / {getModuleProgress("p1", completed).total} leçons terminées
                  </div>
                </div>
              </div>
              <Link
                href="/dashboard/modules"
                style={{
                  background: "#0E4B3C",
                  color: "#D7F26B",
                  fontFamily: "'Baloo 2', cursive",
                  fontSize: 16,
                  fontWeight: 700,
                  padding: "12px 22px",
                  borderRadius: 14,
                  textDecoration: "none",
                  boxShadow: "0 4px 0 #083228",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "transform .12s"
                }}
              >
                Commencer le Module 1 →
              </Link>
            </section>
          ) : (!currentModFin && currentLevel) ? (
            <section className="gm-lock-banner" style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)", border: "3px solid #F59E0B", borderRadius: 22, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", boxShadow: "0 8px 24px rgba(245,158,11,0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#FFF", border: "3px solid #F59E0B", display: "grid", placeItems: "center", color: "#92400E", flexShrink: 0 }}>
                  <Lock size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#92400E", letterSpacing: ".1em", textTransform: "uppercase" }}>
                    Niveau {current} en attente du Module {currentLevel.moduleNumber}
                  </div>
                  <div className="gm-title" style={{ fontSize: 20, fontWeight: 700, color: "#78350F", margin: "2px 0" }}>
                    Termine le Module {currentLevel.moduleNumber} : « {currentLevel.moduleTitle} » pour continuer l'aventure !
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
                    Progression du module : {currentModProg?.done} / {currentModProg?.total} leçons faites
                  </div>
                </div>
              </div>
              <Link
                href="/dashboard/modules"
                style={{
                  background: "#0E4B3C",
                  color: "#D7F26B",
                  fontFamily: "'Baloo 2', cursive",
                  fontSize: 16,
                  fontWeight: 700,
                  padding: "12px 22px",
                  borderRadius: 14,
                  textDecoration: "none",
                  boxShadow: "0 4px 0 #083228",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "transform .12s"
                }}
              >
                Aller au Module {currentLevel.moduleNumber} →
              </Link>
            </section>
          ) : null
        )}

        {/* PROGRESS SECTION */}
        <section className="gm-progress-card" style={{ background: "#FBFAF3", border: "2px solid #E4DEC6", borderRadius: 22, padding: "18px 20px", display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "min(300px, 100%)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 4, rowGap: 2, flexWrap: "wrap", marginBottom: 10 }}>
              <div className="gm-title gm-progress-title" style={{ fontSize: 21, fontWeight: 700 }}>Ma progression</div>
              <div className="gm-title gm-progress-count" style={{ fontSize: 17, fontWeight: 700, color: "#4C7A38", fontFeatureSettings: "'tnum'" }}>{Math.min(current - 1, TOTAL_LEVELS)} / {TOTAL_LEVELS} défis relevés</div>
            </div>
            <div style={{ position: "relative", height: 22, borderRadius: 999, background: "#EFEEE0", border: "2px solid #E0D9BF", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#B4E03A,#C8F24D)", borderRight: "3px solid #0E4B3C", transition: "width .8s cubic-bezier(.34,1.2,.64,1)", width: `${progressPct}%` }}></div>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#3B5B2C", letterSpacing: ".04em" }}>{progressPct}%</div>
            </div>
            <div className="gm-progress-legend" style={{ display: "flex", gap: 14, marginTop: 11, fontSize: 12, fontWeight: 700, color: "#55624F", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 16, borderRadius: "50%", background: "#F4B63F", border: "2px solid #0E4B3C" }}></span>Terminé</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 16, borderRadius: "50%", background: "#C8F24D", border: "2px solid #0E4B3C" }}></span>À faire</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 16, borderRadius: "50%", background: "#E8E2CE", border: "2px dashed #B0A587" }}></span>Verrouillé</span>
            </div>
          </div>

          <div className="gm-stats-row" style={{ display: "flex", gap: 11, flex: "none", maxWidth: "100%" }}>
            <div className="gm-stat-box" style={{ width: 112, background: "#FFF9E9", border: "2px solid #F0D79B", borderRadius: 16, padding: 12, textAlign: "center" }}>
              <div className="gm-stat-icon" style={{ display: "flex", justifyContent: "center", color: "#E2A32B", marginBottom: 2 }}><Star size={22} fill="#E2A32B" /></div>
              <div className="gm-stat-text-wrap">
                <div className="gm-title gm-stat-val" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, fontFeatureSettings: "'tnum'" }}>{realStars}</div>
                <div className="gm-stat-label" style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "#8A6B2E" }}>ÉTOILES</div>
              </div>
            </div>
            <div className="gm-stat-box" style={{ width: 112, background: "#EAF3D6", border: "2px solid #C6D9A6", borderRadius: 16, padding: 12, textAlign: "center" }}>
              <div className="gm-stat-icon" style={{ lineHeight: 1 }}><svg width="15" height="19" viewBox="0 0 15 19" fill="none"><path d="M9 1L1.5 11h4L6 18l7.5-10h-4L9 1z" fill="#8FB22F" stroke="#4C7A38" strokeWidth="1.4" strokeLinejoin="round"/></svg></div>
              <div className="gm-stat-text-wrap">
                <div className="gm-title gm-stat-val" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, fontFeatureSettings: "'tnum'" }}>{realXp}</div>
                <div className="gm-stat-label" style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "#4C7A38" }}>XP GAGNÉS</div>
              </div>
            </div>
            <div className="gm-stat-box" style={{ width: 112, background: "#FBF1E6", border: "2px solid #EFC9A2", borderRadius: 16, padding: 12, textAlign: "center" }}>
              <div className="gm-stat-icon" style={{ lineHeight: 1 }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M7 3h10v5a5 5 0 01-10 0V3z" fill="#F4B63F" stroke="#A9671F" strokeWidth="1.6"/><path d="M12 13v4M9 20h6" stroke="#A9671F" strokeWidth="1.8" strokeLinecap="round"/></svg></div>
              <div className="gm-stat-text-wrap">
                <div className="gm-title gm-stat-val" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, fontFeatureSettings: "'tnum'" }}>{realBadgesCount}</div>
                <div className="gm-stat-label" style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "#A9671F" }}>BADGES</div>
              </div>
            </div>
          </div>
        </section>

        {/* WORLDS SELECTOR (affiché sur bureau, masqué sur mobile) */}
        {!compact && (
          <section id="ki-worlds">
            <div className="gm-title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 9 }}>Mes mondes</div>
            <div style={{ display: "flex", gap: 11, flexWrap: "wrap" }}>
              {GAME_WORLDS.map((world, wi) => {
                const [minLvl, maxLvl] = world.levelRange;
                const worldLevels = GAME_LEVELS.filter((l) => l.world === wi);
                const worldCompleted = worldLevels.filter((l) => displayCompleted.includes(l.id)).length;
                const totalInWorld = worldLevels.length;
                const isCompleted = worldCompleted >= totalInWorld;
                const isCurrent = current >= minLvl && current <= maxLvl;
                const status = isCompleted ? "completed" : isCurrent ? "current" : "locked";
                return (
                  <a
                    key={world.title}
                    href={`#monde-${wi + 1}`}
                    style={{
                      flex: 1,
                      minWidth: 230,
                      textDecoration: "none",
                      color: "#0E3A2E",
                      background: status === "current" ? "#FFF4E2" : "#EAF3D6",
                      border: status === "current" ? "3px solid #F4B63F" : "2px solid #C6D9A6",
                      borderRadius: 18,
                      padding: status === "current" ? "12px 15px" : "13px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      transition: "transform .14s",
                      boxShadow: status === "current" ? "0 5px 0 #E2A32B" : "none"
                    }}
                  >
                    <span style={{ width: 42, height: 42, flex: "none", borderRadius: 13, background: "#fff", border: status === "current" ? "2px solid #F0C98B" : "2px solid #C6D9A6", display: "grid", placeItems: "center" }}>
                      <svg width="24" height="20" viewBox="0 0 24 20" fill="none" aria-hidden="true">
                        {wi === 0 && <><path d="M1 19c3-7 6-10 8-10s3 2 5 2 4-4 9-8" stroke="#4C7A38" strokeWidth="2" strokeLinecap="round"/><circle cx="19" cy="4" r="2.5" fill="#F4B63F"/></>}
                        {wi === 1 && <><rect x="2" y="11" width="5" height="7" rx="1.5" fill="#8FB22F"/><rect x="9.5" y="7" width="5" height="11" rx="1.5" fill="#4C7A38"/><rect x="17" y="3" width="5" height="15" rx="1.5" fill="#F4B63F"/></>}
                        {wi === 2 && <path d="M2 18L9 5l4 7 3-4 6 10H2z" fill="#C9A977" stroke="#7A5C2E" strokeWidth="1.6" strokeLinejoin="round"/>}
                      </svg>
                    </span>
                    <span>
                      <span style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: ".12em", color: status === "current" ? "#A9671F" : "#4C7A38" }}>MONDE {wi + 1} · {status === "completed" ? "TERMINÉ" : status === "current" ? "EN COURS" : "VERROUILLÉ"}</span>
                      <span className="gm-title" style={{ display: "block", fontSize: 18, fontWeight: 700, lineHeight: 1.15 }}>{world.title}</span>
                      <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: status === "current" ? "#8A6B2E" : "#55624F" }}>{worldCompleted} / {totalInWorld} niveaux</span>
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div ref={mapWrapRef} style={{ padding: compact ? "24px 12px 40px" : "40px 20px 100px", display: "flex", justifyContent: "center" }}>
        {/* L'espace de la carte est élargi à 1000px pour plus de confort visuel.
            On applique un scale sur les coordonnées (1000 / 780 = 1.282) */}
        {/* Plus étroit que 1000 px : `zoom` réduit TOUT d'un bloc (boutons, avatar, textes) ; sur téléphone, le chemin vertical ci-dessous. */}
        <div style={{ width: compact ? "100%" : 1000, maxWidth: compact || mapScale < 1 ? "none" : "100%", zoom: !compact && mapScale < 1 ? mapScale : undefined, position: "relative", flex: "none", display: "flex", flexDirection: "column" }}>
          {compact ?GAME_WORLDS.map((world, wi) => {
            // Téléphone : chemin vertical en zigzag, boutons grands, aucun élément hors de l'écran.
            const levels = GAME_LEVELS.filter((l) => l.world === wi);
            return (
              <section key={world.title} id={`monde-${wi + 1}`} style={{ marginBottom: 28 }}>
                <div
                  className="gm-world-header"
                  style={{
                    background: "#0E4B3C",
                    color: "#fff",
                    borderRadius: 16,
                    padding: "10px 14px",
                    boxShadow: "0 4px 0 #093429",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 66,
                  }}
                >
                  <img src={world.guardianSrc} alt="" width={50} height={50} style={{ width: 50, height: "auto", flex: "none" }} />
                  <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                    <div className="gm-world-kicker" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", color: "#D7F26B" }}>{world.kicker}</div>
                    <div className="gm-title gm-world-title" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, marginTop: 2 }}>{world.title}</div>
                  </div>
                </div>
                <div
                  className="mobile-world-card"
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 520,
                    marginTop: 14,
                    borderRadius: 24,
                    border: "3px solid #D5E2B8",
                    overflow: "hidden",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                  }}
                >
                  {/* Photo d'arrière-plan du monde 9:16 dédiée au mobile */}
                  <img
                    src={`/images/world${wi + 1}_bg_mobile.webp`}
                    alt={`Carte du Monde ${wi + 1}`}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                      display: "block",
                    }}
                  />

                  {/* Niveaux positionnés sur la route avec taille compacte */}
                  {levels.map((level) => {
                    const n = Number(level.id.split("-")[2]);
                    const modProg = getModuleProgress(level.moduleId, completed);
                    const modFin = modProg.isComplete;
                    const state: NodeState = n < current ? "done" : (n === current && modFin) ? "current" : "locked";
                    const isNextInLine = n === current && !modFin;
                    const mobilePosMap: Record<string, { x: string; y: string }> = {
                      // Monde 1 : départ en haut (Niveau 1) -> milieu (Niveau 2) -> bas (Niveau 3)
                      "jeux7-9-01": { x: "65%", y: "44%" },
                      "jeux7-9-02": { x: "41%", y: "57%" },
                      "jeux7-9-03": { x: "56%", y: "81%" },

                      // Monde 2 : départ en haut (Niveau 4) -> milieu (Niveau 5) -> bas (Niveau 6)
                      "jeux7-9-04": { x: "69%", y: "36%" },
                      "jeux7-9-05": { x: "54%", y: "56%" },
                      "jeux7-9-06": { x: "36%", y: "80%" },

                      // Monde 3 : départ en haut (Niveau 7) -> sentier (8) -> rivière (9) -> pont/coffre (10)
                      "jeux7-9-07": { x: "48%", y: "34%" },
                      "jeux7-9-08": { x: "32%", y: "56%" },
                      "jeux7-9-09": { x: "72%", y: "77%" },
                      "jeux7-9-10": { x: "50%", y: "87%" },
                    };
                    const coords = mobilePosMap[level.id] || { x: "50%", y: "50%" };

                    return (
                      <div
                        key={level.id}
                        style={{
                          position: "absolute",
                          left: coords.x,
                          top: coords.y,
                          transform: "translate(-50%, -50%)",
                          zIndex: n === current ? 15 : 10,
                        }}
                      >
                        {n === current && (
                          <img
                            src="/images/palou/game-palou-joie.png"
                            alt="Palou"
                            style={{
                              position: "absolute",
                              top: isTablet ? -62 : -36,
                              left: "50%",
                              transform: "translateX(-50%)",
                              width: isTablet ? 58 : 36,
                              height: "auto",
                              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                              animation: "kiFloat 2.6s ease-in-out infinite",
                              pointerEvents: "none",
                              zIndex: 20,
                            }}
                          />
                        )}
                        <LevelNode
                          compact
                          isTablet={isTablet}
                          inline
                          level={level}
                          state={state}
                          isNextInLine={isNextInLine}
                          starsEarned={lessonStars[level.id] || 0}
                          onOpen={() => setOpen(n)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }) : GAME_WORLDS.map((world, wi) => {
            return (
              <div key={world.title} id={`monde-${wi + 1}`} style={{ marginBottom: 40 }}>
                <div style={{ height: 160, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={world.guardianSrc} alt={`Palou, gardien du monde ${wi + 1}`} style={{ position: "absolute", [wi % 2 === 0 ? "left" : "right"]: -42, bottom: 2, width: 150 } as React.CSSProperties} />
                  <div style={{ background: "#0E4B3C", color: "#fff", borderRadius: 16, padding: "12px 40px", textAlign: "center", boxShadow: "0 6px 0 #093429" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".18em", color: "#D7F26B" }}>{world.kicker}</div>
                    <div className="gm-title" style={{ fontSize: 25, fontWeight: 700, lineHeight: 1.15, marginTop: 2 }}>{world.title}</div>
                  </div>
                </div>

                <div style={{ position: "relative", height: 550 * SCALE, borderRadius: 40, background: "linear-gradient(#EAF3D6,#DCEBC2)", overflow: "hidden", border: "4px solid #D5E2B8", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}>
                  {/* Le SVG s'étire automatiquement à 100% de la largeur/hauteur */}
                  <WorldBackground world={wi as 0 | 1 | 2} />
                  {GAME_LEVELS.filter((l) => l.world === wi).map((level) => {
                    const n = Number(level.id.split("-")[2]);
                    const modProg = getModuleProgress(level.moduleId, completed);
                    const modFin = modProg.isComplete;
                    const state: NodeState = n < current ? "done" : (n === current && modFin) ? "current" : "locked";
                    const isNextInLine = n === current && !modFin;
                    
                    // On redimensionne les coordonnées x, y
                    const scaledLevel = { ...level, x: level.x * SCALE, y: level.y * SCALE };
                    
                    return <LevelNode key={level.id} level={scaledLevel} state={state} isNextInLine={isNextInLine} starsEarned={lessonStars[level.id] || 0} onOpen={() => {
                        setOpen(n);
                      }} />;
                  })}
                </div>
              </div>
            );
          })}

          <div suppressHydrationWarning ref={avatarRef} style={{ position: "absolute", display: compact ? "none" : undefined, width: AVATAR_WIDTH, pointerEvents: "none", zIndex: 20, transition: isFlying ? "left 2.5s ease-in-out, top 2.5s ease-in-out" : "left .9s cubic-bezier(.34,1.3,.64,1), top .9s cubic-bezier(.34,1.3,.64,1)", left: avatarLeft, top: avatarTop }}>
            <div className="gm-avatar-float" style={{ transform: isFlying ? "translateY(-15px) rotate(5deg)" : "none", transition: "transform 0.5s" }}>
              <img src="/images/palou/game-palou-joie.png" alt="Palou, ton avatar sur la carte" style={{ width: AVATAR_WIDTH, display: "block" }} />
              
              {/* Le nuage volant apparait s'il voyage entre mondes */}
              {isFlying && (
                <div style={{ position: "absolute", bottom: -10, left: -20, width: AVATAR_WIDTH + 40, zIndex: -1 }}>
                  <svg viewBox="0 0 200 100" width="100%" height="100%" style={{ filter: "drop-shadow(0 15px 15px rgba(0,0,0,0.3))" }}>
                    <defs>
                      <linearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="100%" stopColor="#E2F1F8" />
                      </linearGradient>
                    </defs>
                    {/* Jetstream/Trail */}
                    <path d="M 10 70 Q 50 70 80 80" stroke="#FFF" strokeWidth="6" strokeLinecap="round" strokeDasharray="10 10" style={{ animation: "kiDash 1s linear infinite" }} opacity="0.6"/>
                    <path d="M 30 50 Q 60 50 80 60" stroke="#FFF" strokeWidth="4" strokeLinecap="round" strokeDasharray="5 10" style={{ animation: "kiDash 0.8s linear infinite" }} opacity="0.4"/>
                    {/* Cloud Base */}
                    <path d="M40 70 A 25 25 0 0 1 70 40 A 35 35 0 0 1 130 30 A 30 30 0 0 1 170 50 A 20 20 0 0 1 160 85 L 50 85 A 20 20 0 0 1 40 70 Z" fill="url(#cloudGrad)" />
                    {/* Little Star sparkles */}
                    <circle cx="20" cy="40" r="3" fill="#F4B63F" style={{ animation: "kiTwinkle 0.5s infinite alternate" }}/>
                    <circle cx="40" cy="20" r="4" fill="#F4B63F" style={{ animation: "kiTwinkle 0.7s infinite alternate" }}/>
                    <circle cx="170" cy="30" r="2.5" fill="#F4B63F" style={{ animation: "kiTwinkle 0.4s infinite alternate" }}/>
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <div onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(14,58,46,.5)", display: "grid", placeItems: "center", padding: 20 }}>
          <div role="presentation" onClick={(e) => e.stopPropagation()} className="gm-pop-in" style={{ display: "flex", gap: 16, alignItems: "flex-end", maxWidth: "100%" }}>
            
            {/* Palou Guide */}
            <div style={{ flex: "none", position: "relative", width: 140, display: "flex", flexDirection: "column", alignItems: "center", animation: "kiFloatSlow 4s ease-in-out infinite" }}>
              <div style={{ background: "#fff", border: "3px solid #0E4B3C", borderRadius: "16px 16px 0 16px", padding: "12px 16px", marginBottom: 12, position: "relative", boxShadow: "0 6px 0 rgba(14,75,60,0.2)" }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0E3A2E", lineHeight: 1.3 }}>
                  {locked ? "Encore un petit effort ! " : done ? "Tu as déjà relevé ce défi !" : "Prêt pour ce défi ?"}
                </p>
                <div style={{ position: "absolute", bottom: -10, right: 10, width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "10px solid #0E4B3C" }}></div>
                <div style={{ position: "absolute", bottom: -6, right: 10, width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "10px solid #fff" }}></div>
              </div>
              <img src={`/images/palou/${locked ? "game-palou-reflexion.png" : done ? "game-palou-joie.png" : "game-palou-main.png"}`} alt="Palou" style={{ width: 120, filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.2))" }} />
            </div>

            {/* Modal Content */}
            <div style={{ width: 420, maxWidth: "calc(100vw - 180px)", background: (open && LEVEL_BACKGROUNDS[open]) ? `linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url('${LEVEL_BACKGROUNDS[open]}') center/cover` : "#FBFAF3", border: "3px solid #0E4B3C", borderRadius: 26, padding: "26px 28px 24px", boxShadow: "0 20px 40px rgba(14,58,46,.3)", position: "relative" }}>
              
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".16em", color: "#4C7A38", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{kindLabel(selected.kind)} · NIVEAU {open}</span>
                {done && !isChest && (
                  <div style={{ display: "flex", gap: 4, color: "#E2A32B" }}>
                    <span style={{ opacity: modalStars >= 1 ? 1 : 0.3 }}><Star size={18} fill="#E2A32B" /></span>
                    <span style={{ opacity: modalStars >= 2 ? 1 : 0.3 }}><Star size={18} fill="#E2A32B" /></span>
                    <span style={{ opacity: modalStars >= 3 ? 1 : 0.3 }}><Star size={18} fill="#E2A32B" /></span>
                  </div>
                )}
                {locked && <Lock size={16} />}
              </div>
              
              <h2 className="gm-title" style={{ fontSize: 27, fontWeight: 700, margin: "6px 0 0", lineHeight: 1.1, display: "flex", alignItems: "center", gap: 8 }}>
                {locked ? <><span>Défi verrouillé</span> <Lock size={22} /></> : selected.title}
              </h2>
              
              <div style={{ fontSize: 14.5, color: "#55624F", lineHeight: 1.5, margin: "10px 0 16px" }}>
                {locked ? (
                  lockedModule ? (
                    <div>
                      <p style={{ margin: "0 0 8px 0" }}>
                        Ce défi est directement lié au <strong>Module {selected.moduleNumber} : « {selected.moduleTitle} »</strong>.
                      </p>
                      <p style={{ margin: 0, fontSize: 13.5, color: "#78350F" }}>
                        Tu dois d'abord terminer les <strong>{selectedModProg?.total} leçons</strong> de ce module dans l'Aventure pour débloquer ce défi !
                      </p>
                    </div>
                  ) : (
                    <p style={{ margin: 0 }}>
                      Termine d'abord le défi précédent (Niveau {open! - 1}) sur la carte pour ouvrir cette étape.
                    </p>
                  )
                ) : (
                  <p style={{ margin: 0 }}>{selected.desc}</p>
                )}
              </div>

              {locked && lockedModule && selectedModProg && (
                <div style={{ background: "#FFF", border: "2px solid #E4DEC6", borderRadius: 14, padding: "12px 16px", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, color: "#0E3A2E", marginBottom: 6 }}>
                    <span>Progression du Module {selected.moduleNumber}</span>
                    <span>{selectedModProg.done} / {selectedModProg.total} leçons</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "#EFEEE0", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(selectedModProg.done / selectedModProg.total) * 100}%`, background: "#10B981", borderRadius: 999, transition: "width .3s" }} />
                  </div>
                </div>
              )}
              
              {!locked && (
                <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                  <div style={{ background: "#EAF3D6", border: "1.5px solid #C6D9A6", borderRadius: 10, padding: "8px 13px", fontSize: 13, fontWeight: 800, color: "#3B5B2C" }}>+{selected.xp} XP</div>
                  <div style={{ background: "#EFEEE0", border: "1.5px solid #DDD9BF", borderRadius: 10, padding: "8px 13px", fontSize: 13, fontWeight: 700, color: "#6B6248" }}>{selected.meta}</div>
                  <div style={{ background: "#E0F2FE", border: "1.5px solid #BAE6FD", borderRadius: 10, padding: "8px 13px", fontSize: 13, fontWeight: 700, color: "#0369A1" }}>Module {selected.moduleNumber}</div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                {locked ? (
                  <>
                    {lockedModule ? (
                      <Link
                        href="/dashboard/modules"
                        style={{
                          flex: 1,
                          border: "none",
                          borderRadius: 14,
                          background: "#0E4B3C",
                          color: "#D7F26B",
                          fontFamily: "'Baloo 2',cursive",
                          fontSize: 16,
                          fontWeight: 700,
                          padding: 13,
                          cursor: "pointer",
                          boxShadow: "0 5px 0 #093429",
                          textDecoration: "none",
                          textAlign: "center",
                          display: "inline-block"
                        }}
                      >
                        Aller au Module {selected.moduleNumber} →
                      </Link>
                    ) : (
                      <button onClick={() => setOpen(null)} style={{ flex: 1, border: "none", borderRadius: 14, background: "#C8F24D", color: "#0E3A2E", fontFamily: "'Baloo 2',cursive", fontSize: 18, fontWeight: 700, padding: 13, cursor: "pointer", boxShadow: "0 5px 0 #9DC237" }}>
                        Compris !
                      </button>
                    )}
                    <button onClick={() => setOpen(null)} style={{ border: "2px solid #0E4B3C", background: "transparent", color: "#0E3A2E", borderRadius: 14, fontFamily: "'Baloo 2',cursive", fontSize: 16, fontWeight: 700, padding: "13px 18px", cursor: "pointer" }}>
                      Fermer
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handlePrimary}
                      disabled={!hasContent}
                      style={{ flex: 1, border: "none", borderRadius: 14, background: !hasContent ? "#DDD9BF" : "#C8F24D", color: "#0E3A2E", fontFamily: "'Baloo 2',cursive", fontSize: 18, fontWeight: 700, padding: 13, cursor: !hasContent ? "not-allowed" : "pointer", boxShadow: !hasContent ? "none" : "0 5px 0 #9DC237" }}
                    >
                      {done ? "Rejouer" : isChest ? "Ouvrir" : "Jouer"}
                    </button>
                    <button onClick={() => setOpen(null)} style={{ border: "2px solid #0E4B3C", background: "transparent", color: "#0E3A2E", borderRadius: 14, fontFamily: "'Baloo 2',cursive", fontSize: 16, fontWeight: 700, padding: "13px 18px", cursor: "pointer" }}>
                      Fermer
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {celebrate && (
        <div onClick={() => setCelebrate(null)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(14,58,46,.6)", display: "grid", placeItems: "center" }}>
          <div role="presentation" onClick={(e) => e.stopPropagation()} className="gm-pop-in" style={{ background: "#FBFAF3", border: "3px solid #0E4B3C", borderRadius: 26, padding: "32px 50px", textAlign: "center", boxShadow: "0 20px 50px rgba(14,58,46,.5)", position: "relative" }}>
            
            {/* Confettis statiques simples en SVG */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              <circle cx="20%" cy="20%" r="5" fill="#F4B63F" style={{ animation: "kiFloatSlow 2s infinite" }} />
              <circle cx="80%" cy="30%" r="6" fill="#C8F24D" style={{ animation: "kiFloatSlow 2.5s infinite" }} />
              <circle cx="15%" cy="70%" r="4" fill="#F4B63F" style={{ animation: "kiFloatSlow 3s infinite" }} />
              <circle cx="85%" cy="80%" r="5" fill="#8FB22F" style={{ animation: "kiFloatSlow 2.2s infinite" }} />
            </svg>

            <img src="/images/palou/game-palou-rire.png" alt="" style={{ width: 160, display: "block", margin: "0 auto", animation: "gmPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
            <div className="gm-title" style={{ fontSize: 36, fontWeight: 800, marginTop: 10, color: "#0E3A2E" }}>BRAVO !</div>
            
            <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "8px 0", color: "#F4B63F" }}>
              <span className="gm-star" style={{ animationDelay: "0.2s" }}><Star size={36} fill="#F4B63F" /></span>
              <span className="gm-star" style={{ animationDelay: "0.4s", transform: "translateY(-6px)" }}><Star size={42} fill="#F4B63F" /></span>
              <span className="gm-star" style={{ animationDelay: "0.6s" }}><Star size={36} fill="#F4B63F" /></span>
            </div>

            <div style={{ fontSize: 18, fontWeight: 800, color: "#4C7A38", marginTop: 8, background: "#EAF3D6", display: "inline-block", padding: "6px 16px", borderRadius: 999 }}>+{celebrate.xp} XP</div>
            
            <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "center" }}>
              <button onClick={() => setCelebrate(null)} style={{ padding: "12px 20px", background: "#EFEEE0", border: "2px solid #E4DEC6", borderRadius: 14, color: "#0E3A2E", fontWeight: 700, cursor: "pointer", fontFamily: "'Baloo 2',cursive", fontSize: 16 }}>Fermer</button>
              <button
                onClick={() => {
                  const idx = GAME_LEVELS.findIndex((l) => l.id === celebrate.id);
                  const nextLevel = GAME_LEVELS[idx + 1];
                  setCelebrate(null);
                  if (nextLevel && (nextLevel.gameIndex != null || nextLevel.quizIndex != null)) onPlay(nextLevel);
                }}
                style={{ padding: "12px 24px", background: "#C8F24D", border: "none", borderRadius: 14, color: "#0E3A2E", fontWeight: 700, boxShadow: "0 5px 0 #9DC237", cursor: "pointer", fontFamily: "'Baloo 2',cursive", fontSize: 18 }}
              >
                Continuer →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutoriel Interactif (desktop uniquement, désactivé sur mobile pour éviter tout scroll forcé) */}
      {!compact && (
        <TutorialOverlay currentLevel={currentLevel} hasPlayed={completed.length > 0} ready={progressLoaded} />
      )}

      {worldCelebrate !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(14,58,46,.8)", backdropFilter: "blur(5px)" }}>
          <div className="gm-pop-in" style={{ background: "#FBFAF3", borderRadius: 32, padding: "40px", maxWidth: 600, textAlign: "center", border: "4px solid #0E4B3C", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
            <img src="/images/palou/game-palou-joie.png" alt="Palou félicite" style={{ width: 160, display: "block", margin: "0 auto 20px", filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.2))" }} />
            
            {worldCelebrate === 0 && (
              <>
                <h2 style={{ fontSize: 32, color: "#0E3A2E", margin: "0 0 15px" }}>Monde 1 terminé !</h2>
                <p style={{ fontSize: 18, color: "#4A5D4E", margin: "0 0 30px", lineHeight: 1.5 }}>Bravo ! Tu as découvert les bases de l'IA. Prépare-toi à décoller vers la Plaine des Données !</p>
              </>
            )}
            {worldCelebrate === 1 && (
              <>
                <h2 style={{ fontSize: 32, color: "#0E3A2E", margin: "0 0 15px" }}>Monde 2 accompli !</h2>
                <p style={{ fontSize: 18, color: "#4A5D4E", margin: "0 0 30px", lineHeight: 1.5 }}>Incroyable ! Tu es un pro du tri des données. Envole-toi vers le Rocher du Gardien pour apprendre à les protéger !</p>
              </>
            )}
            {worldCelebrate === 2 && (
              <>
                <h2 style={{ fontSize: 32, color: "#0E3A2E", margin: "0 0 15px" }}>Tu es un Maître de l'IA !</h2>
                <p style={{ fontSize: 18, color: "#4A5D4E", margin: "0 0 30px", lineHeight: 1.5 }}>Félicitations, tu as terminé tous les défis ! Palou est super fier de toi. L'IA et la protection de tes données n'ont plus de secrets pour toi !</p>
              </>
            )}
            <button onClick={() => setWorldCelebrate(null)} style={{ background: "#C8F24D", border: "none", borderRadius: 16, color: "#0E3A2E", fontFamily: "'Baloo 2',cursive", fontSize: 22, fontWeight: 800, padding: "14px 40px", cursor: "pointer", boxShadow: "0 6px 0 #9DC237" }}>
              {worldCelebrate === 2 ? "Génial !" : "C'est parti !"}
            </button>
          </div>
        </div>
      )}
      {/* Indicateur de défilement mobile unifié style Keur IA */}
      <ScrollDownHint targetId="monde-1" ariaLabel="Faire défiler vers la carte des jeux" />

    </div>
  );
}
