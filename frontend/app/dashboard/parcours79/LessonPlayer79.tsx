"use client";

import "./parcours79.css";
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ActivityScreen, Pose, Screen } from "./types";
import { RoundView } from "./activities";
import { CAST_LABELS } from "./content";
import { celebrate } from "./fx";
import { Icon79, StarBig79, type IconName } from "./Icons79";
import { Trophy79 } from "./Trophy79";
import { Img79, PalouImg, lessonImageUrl, moduleBackdropUrl, stickerUrl } from "./Img79";
import { fillTokens, parseVideoEmbedUrl, planFit, resolveMediaSource, scoreForStars, screenLayoutClasses, starsFor } from "./logic";
import { useP79Settings } from "./settings";
import { SoundControl79 } from "./SoundControl79";
import { sfx } from "./sound";
import { lessonClipSrc, speakLesson, stopSpeaking, voiceSupported, type LessonPart } from "./voice";
import type { LessonContent } from "./types";

interface Props {
  content: LessonContent;
  /** Prénom réel de l'enfant, pour les félicitations. */
  firstName: string;
  onClose: () => void;
  /** `then` : ce que l'enfant veut faire après sa leçon (carte des modules, leçon suivante, ou refaire celle-ci). */
  onComplete: (score: number, stars: number, then?: "map" | "next" | "replay") => void;
  /** Vrai quand le chapitre a une leçon suivante : la page finale propose alors « Continuer » au lieu de « Terminer ». */
  hasNext?: boolean;
  /** Vrai sur la dernière leçon d'un module quand un module suit : le bouton final devient « Module suivant » (retour aux îles, puis le saut). */
  nextModule?: boolean;
  /** Aperçu du studio : écran par lequel commencer (0 = le premier). */
  startAt?: number;
  /** Aperçu du studio : pas de voix, et rien n'est enregistré. */
  preview?: boolean;
  /** Navigation vers une autre leçon du parcours (ex. via bouton d'action interne). */
  onNavigateLesson?: (lessonId: string) => void;
}

/** Page finale : au bout de ce délai sans appui, le cours suivant s'ouvre tout seul (la barre du bouton se remplit pour le montrer). */
export const AUTO_NEXT_MS = 10000;

const isActivity = (screen: Screen): screen is ActivityScreen => screen.kind === "play" || screen.kind === "why";

const KIND: Record<Screen["kind"], { label: string; icon: IconName }> = {
  story: { label: "Histoire", icon: "book" },
  discover: { label: "Découvre", icon: "bulb" },
  ai: { label: "Et l’IA ?", icon: "sparkles" },
  media: { label: "Média", icon: "play" },
  play: { label: "À toi de jouer", icon: "play" },
  why: { label: "Pourquoi ?", icon: "help" },
  create: { label: "Crée", icon: "sparkles" },
  bravo: { label: "Je retiens", icon: "book" },
};

/** Félicitations de la page finale selon le nombre d'étoiles (« {prenom} » est remplacé par le prénom de l'enfant). */
const VICTORY_MESSAGE: Record<number, string> = {
  3: "Bravo {prenom}, tu as tout réussi du premier coup ! Palou est très fier de toi.",
  2: "Très bien {prenom} ! Encore un petit effort et tu auras les trois étoiles.",
  1: "Bien joué {prenom}, tu as persévéré ! Rejoue la leçon pour gagner plus d’étoiles.",
};

/**
 * Filet de sécurité de la page finale : si un de ses éléments plante, l'enfant voit quand même « Mission accomplie »
 * en version simple et peut terminer sa leçon (jamais d'écran cassé à la toute dernière étape).
 */
class Safe extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Page finale « Mission accomplie » : trophée, étoiles qui apparaissent une à une, message de Palou, autocollant. */
function VictoryBody({ stars, message, sticker }: { stars: number; message: string; sticker?: string }) {
  return (
    <div className="p79-victory">
      <Trophy79 size={150} />
      <h3 className="p79-victory-title">Mission accomplie !</h3>
      <div className="p79-stars" role="img" aria-label={`${stars} étoile${stars > 1 ? "s" : ""} sur 3`}>
        {[1, 2, 3].map(n => <StarBig79 key={n} on={n <= stars} delay={0.5 + n * 0.42} size={112} />)}
      </div>
      <div className="p79-bubble p79-victory-bubble">
        <p className="p79-say-text">{message}</p>
      </div>
      {sticker && (
        <div className="p79-sticker">
          <Img79 className="p79-sticker-img" src={stickerUrl(sticker)} alt="Ton autocollant du chapitre" pose="Parfait" />
          <span>Nouvel autocollant !</span>
        </div>
      )}
    </div>
  );
}

/** Numéro du chapitre d'après l'identifiant de la leçon (« p2-3 » → 2) : il choisit le décor de fond. */
const chapterOf = (lessonId: string) => Number(lessonId.match(/^p(\d+)-/)?.[1] ?? 1);

/**
 * Règle de mise en page d'un écran de leçon (elle vaut pour TOUS les écrans, présents et futurs) :
 *  1. le contenu garde une taille lisible : il n'est jamais réduit en dessous de MIN_SCALE (85 %) ;
 *  2. avant de réduire quoi que ce soit, on LUI DONNE PLUS DE LARGEUR : s'il manque de la hauteur alors qu'il reste de la place sur les
 *     côtés, le contenu se réorganise sur plus de colonnes (donc moins haut) au lieu de rapetisser ;
 *  3. si malgré tout il ne tient pas, la zone de jeu défile doucement (une flèche le montre) : on ne coupe et on ne rapetisse jamais.
 * Palou, lui, n'entre pas dans ce calcul : sa taille ne dépend jamais du contenu (voir le bloc « taille de Palou » du CSS).
 */
function useFit(deps: unknown[]) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, x: 0, y: 0, width: 0, overflow: false });
  useLayoutEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;
    box.scrollTop = 0;   // chaque écran repart du haut
    const measure = () => {
      const available = box.clientHeight;
      const boxWidth = box.clientWidth;
      if (available <= 0 || boxWidth <= 0) return;
      const { scale, width, needed, overflow } = planFit(available, boxWidth, w => { inner.style.width = `${w}px`; return inner.offsetHeight; });
      inner.style.width = `${width}px`;
      const y = overflow ? 0 : Math.max(0, (available - needed * scale) / 2);
      const x = Math.max(0, (boxWidth - width * scale) / 2);
      setFit(prev => (Math.abs(prev.scale - scale) < 0.004 && Math.abs(prev.y - y) < 1 && Math.abs(prev.x - x) < 1 && Math.abs(prev.width - width) < 2 && prev.overflow === overflow ? prev : { scale, x, y, width, overflow }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(inner);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { boxRef, innerRef, fit };
}

export function LessonPlayer79({ content, firstName, onClose, onComplete, hasNext = false, nextModule = false, startAt = 0, preview = false, onNavigateLesson }: Props) {
  const [settings, updateSettings] = useP79Settings();
  const [index, setIndex] = useState(Math.max(0, Math.min(startAt, content.screens.length - 1)));
  const [round, setRound] = useState(0);
  const [roundDone, setRoundDone] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [reaction, setReaction] = useState<Pose | null>(null);
  const [bump, setBump] = useState(0);
  const [showQuit, setShowQuit] = useState(false);
  const [pendingExternalLink, setPendingExternalLink] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(false);   // la zone de jeu défile : la flèche disparaît quand l'enfant est arrivé en bas
  const [autoRunning, setAutoRunning] = useState(false);   // le compte à rebours du cours suivant a démarré (la barre du bouton se remplit)
  const voiceDone = useRef<Promise<unknown>>(Promise.resolve());
  const nextRef = useRef<() => void>(() => {});

  const screens = content.screens;
  // Après la page « Je retiens » (dernier écran du contenu) vient toujours la page finale « Mission accomplie ».
  const victory = index >= screens.length;
  const screen = screens[Math.min(index, screens.length - 1)];
  const lastScreen = index === screens.length - 1;
  const activity = !victory && isActivity(screen) ? screen : null;
  const currentRound = activity ? activity.rounds[round] : null;
  const stars = starsFor(mistakes);
  const text = fillTokens(screen.text, firstName);
  const victoryText = fillTokens(VICTORY_MESSAGE[stars] ?? VICTORY_MESSAGE[1], firstName);
  const chapter = chapterOf(content.id);
  const bravoScreen = screens[screens.length - 1];
  const sticker = bravoScreen.kind === "bravo" ? bravoScreen.sticker : undefined;
  const { boxRef, innerRef, fit } = useFit([index, round, roundDone]);

  // Ce que Palou lit : le texte de l'écran, puis la consigne de la manche. Chaque morceau a son fichier audio (voix officielle) ;
  // s'il n'est pas encore enregistré, le morceau est lu par la voix du navigateur (voir speakLesson).
  const spokenParts = useMemo<LessonPart[]>(() => {
    const n = `e${String(Math.min(index, screens.length - 1) + 1).padStart(2, "0")}`;
    const part = (key: string, partText: string): LessonPart => ({ src: content.voiceOff?.includes(key) ? "" : lessonClipSrc(content.id, key), text: partText });
    if (victory) {
      // Page finale, dans l'ordre où l'enfant la lit : « Mission accomplie », ses étoiles, le message de Palou, puis l'autocollant s'il y en a un.
      const starsLabel = stars === 3 ? "trois" : stars === 2 ? "deux" : "une";
      return [
        part("commun_mission", "Mission accomplie !"),
        part(`commun_tu-as-${stars}-etoile${stars > 1 ? "s" : ""}`, `Tu as gagné ${starsLabel} étoile${stars > 1 ? "s" : ""} !`),
        part(`commun_${stars}-etoile${stars > 1 ? "s" : ""}`, victoryText),
        ...(sticker ? [part("commun_autocollant", "Nouvel autocollant !")] : []),
      ];
    }
    const base = fillTokens(("dit" in screen && screen.dit) || screen.text, firstName);
    if (activity && currentRound) {
      const question = part(`${n}-m${round + 1}-q`, currentRound.dit ?? currentRound.prompt);
      return round === 0 ? [part(n, base), question] : [question];
    }
    if (screen.kind === "bravo") return [part(`${n}-bravo`, base), part(`${n}-retiens`, screen.learned)];
    return [part(n, base)];
  }, [victory, victoryText, stars, sticker, screen, screens.length, index, activity, currentRound, round, firstName, content.id, content.voiceOff]);

  useEffect(() => {
    // On garde la promesse : la page finale compte ses 10 secondes avant le cours suivant APRÈS la voix de Palou, jamais pendant.
    voiceDone.current = preview ? Promise.resolve() : speakLesson(spokenParts);
    return () => stopSpeaking();
    // La lecture repart à chaque nouvel écran ou nouvelle manche, pas quand un réglage change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, round]);

  // Page finale : fanfare de victoire, une note par étoile gagnée, confettis qui reviennent plusieurs fois.
  useEffect(() => {
    if (!victory) return;
    sfx.win();
    void celebrate();
    const timers = [1, 2, 3].filter(n => n <= stars).map(n => window.setTimeout(() => sfx.star(), 500 + n * 420));
    timers.push(window.setTimeout(() => void celebrate(), 2600));
    return () => timers.forEach(t => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [victory]);

  const canNext =
    victory ? true :
    activity ? roundDone :
    true;

  const react = (pose: Pose) => { setReaction(pose); setBump(b => b + 1); };

  const go = (to: number) => {
    sfx.page();
    setIndex(to);
    setRound(0);
    setRoundDone(false);
    setReaction(null);
  };

  const next = () => {
    if (!canNext) return;
    if (activity && round < activity.rounds.length - 1) {
      sfx.page();
      setRound(round + 1);
      setRoundDone(false);
      setReaction(null);
      return;
    }
    if (victory) {
      stopSpeaking();
      onComplete(scoreForStars(stars), stars, hasNext ? "next" : "map");
      return;
    }
    go(index + 1); // après « Je retiens », la page « Mission accomplie »
  };

  nextRef.current = next;

  // Les images de Palou de l'écran de chargement sont demandées d'avance : elles sont déjà là quand il s'affiche.
  useEffect(() => {
    if (!victory) return;
    for (const pose of ["Determine", "Encouragement"]) document.createElement("img").src = `/images/palou/Palou_${pose}.png`;
  }, [victory]);

  // Page finale : si l'enfant ne touche à rien pendant 10 secondes (après la voix de Palou), le cours suivant s'ouvre tout seul, comme s'il
  // avait appuyé sur le bouton. Le compte à rebours s'arrête si le menu « Quitter » est ouvert.
  useEffect(() => {
    if (!victory || !hasNext || showQuit) { setAutoRunning(false); return; }
    let cancelled = false;
    let timer: number | undefined;
    const start = () => {
      if (cancelled) return;
      setAutoRunning(true);
      timer = window.setTimeout(() => { if (!cancelled) nextRef.current(); }, AUTO_NEXT_MS);
    };
    voiceDone.current.then(start, start);
    return () => { cancelled = true; setAutoRunning(false); window.clearTimeout(timer); };
  }, [victory, hasNext, showQuit]);

  const back = () => {
    sfx.tap();
    if (victory) return;
    if (activity && round > 0) return; // pas de retour entre deux manches : on garde la manche réussie
    if (index === 0) setShowQuit(true);
    else go(index - 1);
  };

  // Navigation clavier accessible (WCAG 2.1 AA) : Entrée / Flèche Droite pour continuer, Flèche Gauche pour retour, Escape pour quitter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ne pas intercepter si l'utilisateur saisit dans un champ de texte
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setShowQuit(q => !q);
      } else if (e.key === "ArrowRight") {
        if (canNext && !showQuit) {
          e.preventDefault();
          next();
        }
      } else if (e.key === "ArrowLeft") {
        if (!showQuit && !victory && !(activity && round > 0)) {
          e.preventDefault();
          back();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canNext, showQuit, victory, activity, round, index]);

  const pose: Pose = victory ? "Celebration" : reaction ?? screen.pose ?? "Content";
  const palouMood = victory ? "party" : reaction === "Celebration" ? "joy" : reaction === "Encouragement" ? "wiggle" : "";
  const speakerLabel = !victory && "speaker" in screen && screen.speaker ? CAST_LABELS[screen.speaker] : null;
  const hasPicture = !victory && (screen.kind === "story" || screen.kind === "discover" || screen.kind === "ai") && !!screen.image;
  const total = screens.length + 1;
  const progress = victory ? 100 : Math.round(((index + (roundDone ? 1 : 0)) / total) * 100);
  const kind = KIND[screen.kind];

  return (
    <div
      className={`p79 p79-lesson ${hasPicture ? "with-picture" : ""} ${currentRound?.type === "sort" || currentRound?.type === "whois" || currentRound?.type === "rulesort" || currentRound?.type === "cleanup" || currentRound?.type === "train" || currentRound?.type === "relabel" || currentRound?.type === "probe" || currentRound?.type === "focus" || currentRound?.type === "lens" || currentRound?.type === "speak" || currentRound?.type === "layers" || currentRound?.type === "verify" || currentRound?.type === "loupe" || currentRound?.type === "machine" || currentRound?.type === "shield" ? "with-sort" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={content.title}
      style={{ "--fond": `url(${moduleBackdropUrl(chapter)})` } as React.CSSProperties}
    >
      <div className="p79-l-top">
        <h2 className="p79-l-title">{content.title}</h2>
        <div className="p79-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Avancement de la leçon">
          <i style={{ width: `${Math.max(progress, 5)}%` }} />
          <span className="p79-bar-palou" style={{ left: `${Math.max(progress, 5)}%` }}><PalouImg pose="Gentil" /></span>
        </div>
        <SoundControl79 />
        <button type="button" className="p79-round-btn" onClick={() => { sfx.tap(); setShowQuit(true); }} aria-label="Quitter la leçon"><Icon79 name="close" size={28} /></button>
      </div>

      <div className="p79-l-scene">
        <div className="p79-l-pal">
          <div key={bump} className={`p79-l-palou ${palouMood}`}><PalouImg pose={pose} /></div>
        </div>

        <div
          className={`p79-l-box ${fit.overflow ? "scrolls" : ""}`}
          ref={boxRef}
          onScroll={e => setAtBottom(e.currentTarget.scrollTop + e.currentTarget.clientHeight >= e.currentTarget.scrollHeight - 12)}
        >
          <div
            className="p79-fit"
            ref={innerRef}
            key={index}
            style={{ transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})`, transformOrigin: "top left", width: fit.width || undefined }}
          >
            {(index === 0 && (content.callback || content.problem)) && (
              <div className="p79-intro">
                {content.callback && <div className="p79-callback"><Icon79 name="book" size={28} /><span>{content.callback}</span></div>}
                <div className="p79-problem"><Icon79 name="flag" size={28} /><span><b>Le problème :</b> {content.problem}</span></div>
              </div>
            )}

            {victory && (
              <Safe fallback={<div className="p79-victory"><h3 className="p79-victory-title">Mission accomplie !</h3><p className="p79-say-text">{victoryText}</p></div>}>
                <VictoryBody stars={stars} message={victoryText} sticker={sticker} />
              </Safe>
            )}

            {!victory && (() => {
              const extraClasses = screenLayoutClasses(screen.layout, hasPicture);
              const topRowClass = extraClasses.length > 0 ? `p79-top-row ${extraClasses.join(" ")}` : "p79-top-row";
              return (
                <div className={topRowClass}>
                  <div className="p79-bubble">
                    <div className="p79-bubble-head">
                      <span className="p79-kind"><Icon79 name={kind.icon} size={22} /> {kind.label}</span>
                      {speakerLabel && <span className="p79-speaker">{speakerLabel}</span>}
                      {voiceSupported() && (
                        <button type="button" className="p79-listen" onClick={() => { sfx.tap(); void speakLesson(spokenParts, { force: true }); }} aria-label="Écouter Palou">
                          <Icon79 name="sound" size={24} /> Écouter
                        </button>
                      )}
                    </div>
                    <p className="p79-say-text">{text}</p>
                    {screen.wolof && <div className="p79-wolof" lang="wo"><span className="p79-tag">Wolof</span> <b>{screen.wolof.mot}</b> = {screen.wolof.sens}</div>}
                    {screen.kind === "discover" && screen.word && (
                      <div className="p79-word"><span className="p79-tag">Mot nouveau</span> <b>{screen.word.terme}</b> : {screen.word.sens}</div>
                    )}
                  </div>

                  {hasPicture && (
                    <div className="p79-frame">
                      <Img79 className="p79-picture" src={lessonImageUrl(screen.image!)} alt={screen.alt} pose={pose} />
                    </div>
                  )}
                </div>
              );
            })()}

            {!victory && screen.kind === "media" && (
              <div className="p79-media-block">
                {screen.media?.type === "video-link" && (() => {
                  const parsed = parseVideoEmbedUrl(screen.media.url || "");
                  return parsed ? (
                    <div className="p79-media-frame p79-video-container">
                      <iframe
                        className="p79-video-iframe"
                        src={parsed.embedUrl}
                        title="Vidéo de la leçon"
                        sandbox="allow-scripts allow-same-origin allow-presentation"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="p79-media-frame p79-fallback">
                      <p>Vidéo non disponible</p>
                    </div>
                  );
                })()}

                {screen.media?.type === "video-file" && (
                  <div className="p79-media-frame p79-video-container">
                    <video
                      className="p79-video-player"
                      controls
                      playsInline
                      preload="metadata"
                      src={resolveMediaSource(screen.media.ref || "")}
                    />
                  </div>
                )}

                {screen.media?.type === "image" && (
                  <div className="p79-media-frame p79-media-image-box">
                    <img
                      className="p79-media-image"
                      src={resolveMediaSource(screen.media.ref || screen.media.url || screen.image || "")}
                      alt={screen.media.caption || screen.alt || "Illustration"}
                    />
                  </div>
                )}

                {screen.media?.caption && (
                  <p className="p79-media-caption">{screen.media.caption}</p>
                )}

                {screen.actions && screen.actions.length > 0 && (
                  <div className="p79-actions-row">
                    {screen.actions.map((act, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`p79-action-btn ${i > 0 ? "alt" : ""}`}
                        onClick={() => {
                          sfx.tap();
                          if (act.kind === "external") {
                            setPendingExternalLink(act.target);
                          } else if (act.kind === "lesson") {
                            if (onNavigateLesson) {
                              onNavigateLesson(act.target);
                            } else {
                              window.location.href = `/dashboard/parcours79?lesson=${act.target}`;
                            }
                          }
                        }}
                      >
                        {act.label} <Icon79 name="arrow-right" size={22} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activity && currentRound && (
              <div className="p79-activity">
                <div className="p79-prompt-row">
                  <p className="p79-prompt">{currentRound.prompt}</p>
                  <div className="p79-round-dots" aria-label={`Manche ${round + 1} sur ${activity.rounds.length}`}>
                    {activity.rounds.map((_, i) => <span key={i} className={i < round || (i === round && roundDone) ? "done" : i === round ? "now" : ""} />)}
                  </div>
                </div>
                <RoundView
                  key={`${index}-${round}`}
                  round={currentRound}
                  voice={{ lessonId: content.id, screen: index + 1, round: round + 1 }}
                  onMistake={() => { setMistakes(m => m + 1); react("Encouragement"); }}
                  onDone={() => { setRoundDone(true); react("Celebration"); }}
                />
              </div>
            )}

            {!victory && screen.kind === "bravo" && (
              <div className="p79-bravo">
                <div className="p79-learned"><span className="p79-tag">Je retiens</span><p>{screen.learned}</p></div>
              </div>
            )}
          </div>
        </div>
        {fit.overflow && !atBottom && (
          <span className="p79-scroll-hint" aria-hidden="true"><Icon79 name="arrow-right" size={30} /></span>
        )}
      </div>

      <div className="p79-l-bottom">
        {victory ? (
          <button
            type="button"
            className="p79-btn alt"
            onClick={() => { stopSpeaking(); onComplete(scoreForStars(stars), stars, "replay"); }}
            aria-label="Refaire la leçon pour gagner plus d’étoiles"
          >
            <Icon79 name="replay" size={26} /> Refaire
          </button>
        ) : (
          <button
            type="button"
            className="p79-btn alt"
            onClick={back}
            style={activity && round > 0 ? { visibility: "hidden" } : undefined}
            aria-label={index === 0 ? "Quitter la leçon" : "Écran précédent"}
          >
            {index === 0 ? "Quitter" : <><Icon79 name="arrow-left" size={26} /> Retour</>}
          </button>
        )}
        <button
          type="button"
          className={`p79-btn ${victory && hasNext ? "p79-auto-next" : ""} ${autoRunning ? "running" : ""}`}
          style={autoRunning ? ({ "--auto-ms": `${AUTO_NEXT_MS}ms` } as React.CSSProperties) : undefined}
          onClick={next}
          disabled={!canNext}
          aria-label={victory ? (hasNext ? "Passer au cours suivant" : nextModule ? "Passer au module suivant" : "Terminer la leçon") : activity && round < activity.rounds.length - 1 ? "Manche suivante" : "Continuer vers l'écran suivant"}
        >
          {victory ? (hasNext ? <>Cours suivant <Icon79 name="arrow-right" size={26} /></> : nextModule ? <>Module suivant <Icon79 name="arrow-right" size={26} /></> : <>Terminer <Icon79 name="trophy" size={26} /></>) : activity && round < activity.rounds.length - 1 ? <>Manche suivante <Icon79 name="arrow-right" size={26} /></> : <>Continuer <Icon79 name="arrow-right" size={26} /></>}
        </button>
      </div>

      {showQuit && (
        <div className="p79-modal-back" role="alertdialog" aria-modal="true" aria-label="Quitter la leçon ?">
          <div className="p79-modal">
            <PalouImg pose="Triste" className="p79-modal-palou" />
            <h3>Tu veux t’arrêter ?</h3>
            <p>Ta leçon ne sera pas finie, mais tu pourras la reprendre quand tu veux.</p>
            <div className="p79-modal-actions">
              <button type="button" className="p79-btn" onClick={() => { sfx.tap(); setShowQuit(false); }}>Non, je reste</button>
              <button type="button" className="p79-btn alt" onClick={() => { stopSpeaking(); onClose(); }}>Oui, je quitte</button>
            </div>
          </div>
        </div>
      )}

      {pendingExternalLink && (
        <div className="p79-modal-back" role="alertdialog" aria-modal="true" aria-label="Demande à un adulte">
          <div className="p79-modal">
            <PalouImg pose="Question" className="p79-modal-palou" />
            <h3>Demande à un adulte !</h3>
            <p>Ce bouton mène vers un site externe à kEur IA. Demande à un adulte avant de continuer.</p>
            <div className="p79-modal-actions">
              <button
                type="button"
                className="p79-btn alt"
                onClick={() => { sfx.tap(); setPendingExternalLink(null); }}
              >
                Rester ici
              </button>
              <button
                type="button"
                className="p79-btn"
                onClick={() => {
                  sfx.tap();
                  window.open(pendingExternalLink, "_blank", "noopener,noreferrer");
                  setPendingExternalLink(null);
                }}
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
