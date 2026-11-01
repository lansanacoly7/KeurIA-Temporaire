"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { Volume2 } from "lucide-react";
import { sayUi, type UiKey } from "../dashboard/parcours79/uiVoice";
import { stopSpeaking } from "../dashboard/parcours79/voice";

export type TutorialStep = {
  title: string;
  message: string;
  targetSelector?: string;
  badgeText?: string;
  palouEmote: string;
  palouPos?: "top" | "bottom" | "left" | "right" | "center";
  radius?: number;
  padding?: number;
  actionLabel?: string;
  allowClickTarget?: boolean;
};

const onboardingSteps: TutorialStep[] = [
  {
    title: "Salut Explorateur ! Moi c'est Palou !",
    message: "Bienvenue dans ton espace kEur IA ! Je suis ton compagnon et guide. Ensemble, nous allons percer tous les mystères de l'Intelligence Artificielle en nous amusant. Laisse-moi te faire visiter !",
    palouEmote: "Palou_Hero.png",
    palouPos: "center",
    actionLabel: "Commencer la visite →",
  },
  {
    targetSelector: ".userline",
    badgeText: "Tes Récompenses",
    palouEmote: "Palou_Intelligent.png",
    palouPos: "bottom",
    radius: 20,
    padding: 8,
    title: "Ta Progression & Tes Étoiles",
    message: "Regarde en haut à droite : c'est ici que tu découvres tes étoiles, tes points d'XP et ton rang d'explorateur ! Chaque cours et jeu réussi te fait progresser.",
    actionLabel: "Super ! Et ensuite ? →",
  },
  {
    targetSelector: ".lms-side nav",
    badgeText: "Ton Menu d'Aventure",
    palouEmote: "Palou_Gentil.png",
    palouPos: "right",
    radius: 22,
    padding: 10,
    title: "Ton Menu Principal",
    message: "Sur le côté gauche, voici ton menu magique ! Il te permet de naviguer entre ton aventure, tous tes modules de cours, des jeux amusants et même un atelier de programmation Scratch.",
    actionLabel: "Montre-moi les badges ! →",
  },
  {
    targetSelector: ".lms-side nav a[href*='badges']",
    badgeText: "Tes Trophées Secrets",
    palouEmote: "Palou_Celebration.png",
    palouPos: "right",
    radius: 16,
    padding: 6,
    title: "Tes Badges & Diplômes",
    message: "En cliquant sur 'Mes badges', tu accèdes à ta galerie de trophées. À chaque module validé, tu remportes un diplôme officiel d'IA que tu pourras même imprimer chez toi !",
    actionLabel: "Génial ! Et le cours ? →",
  },
  {
    targetSelector: ".track-hero",
    badgeText: "Module 1 : Qu'est-ce que l'IA ?",
    palouEmote: "Palou_Reflexion.png",
    palouPos: "bottom",
    radius: 28,
    padding: 10,
    title: "Ton Premier Module d'IA",
    message: "Voici le cœur de ta mission ! Le premier module va t'apprendre ce qu'est vraiment l'IA : comment elle voit avec ses yeux caméra, comment elle écoute et comment elle apprend grâce aux exemples.",
    actionLabel: "Où est-ce qu'on appuie ? →",
  },
  {
    targetSelector: ".track-hero button",
    badgeText: "C'est ici ! Clique pour commencer !",
    palouEmote: "Palou_Determine.png",
    palouPos: "top",
    radius: 30,
    padding: 8,
    allowClickTarget: true,
    title: "En Route pour ton Premier Cours !",
    message: "Tu as toutes les clés en main ! Appuie sur ce bouton brillant pour démarrer immédiatement ton tout premier cours avec moi. Es-tu prêt(e) ? C'est parti !",
    actionLabel: "Lancer mon premier cours",
  }
];

interface Placement {
  left: number;
  top: number;
  pos: "top" | "bottom" | "left" | "right" | "center";
}

/**
 * Calcule un positionnement strict qui ne se superpose JAMAIS à l'élément expliqué.
 */
function computeTutorialPlacement(
  viewport: { w: number; h: number },
  targetRect: { x: number; y: number; width: number; height: number } | null,
  cardSize: { w: number; h: number },
  preferredPos: "top" | "bottom" | "left" | "right" | "center" = "center"
): Placement {
  const PAD = 16;
  const GAP = 20;

  if (!targetRect || preferredPos === "center") {
    return {
      left: Math.round(Math.max(PAD, (viewport.w - cardSize.w) / 2)),
      top: Math.round(Math.max(PAD, (viewport.h - cardSize.h) / 2)),
      pos: "center"
    };
  }

  const safeTarget = {
    x: targetRect.x - 8,
    y: targetRect.y - 8,
    width: targetRect.width + 16,
    height: targetRect.height + 16
  };

  const collidesWithTarget = (x: number, y: number, w: number, h: number) => {
    return !(
      x + w <= safeTarget.x ||
      x >= safeTarget.x + safeTarget.width ||
      y + h <= safeTarget.y ||
      y >= safeTarget.y + safeTarget.height
    );
  };

  const fitsInViewport = (x: number, y: number, w: number, h: number) => {
    return (
      x >= PAD &&
      x + w <= viewport.w - PAD &&
      y >= PAD &&
      y + h <= viewport.h - PAD
    );
  };

  const cardW = Math.min(cardSize.w, viewport.w - PAD * 2);
  const cardH = cardSize.h;

  interface Candidate {
    name: string;
    pos: "top" | "bottom" | "left" | "right";
    x: number;
    y: number;
    prefScore: number;
  }

  const candidates: Candidate[] = [];

  // 1a. TOP centré
  const topCenterX = Math.max(PAD, Math.min(viewport.w - cardW - PAD, targetRect.x + targetRect.width / 2 - cardW / 2));
  const topY = targetRect.y - cardH - GAP;
  candidates.push({
    name: "top-center",
    pos: "top",
    x: topCenterX,
    y: topY,
    prefScore: preferredPos === "top" ? 0 : 30
  });

  // 1b. TOP décalé vers la droite de l'élément (ex: bouton à gauche)
  const rightShiftX = targetRect.x + targetRect.width + GAP;
  if (rightShiftX + cardW <= viewport.w - PAD) {
    candidates.push({
      name: "top-right",
      pos: "top",
      x: rightShiftX,
      y: Math.max(PAD, Math.min(viewport.h - cardH - PAD, targetRect.y - cardH / 2)),
      prefScore: preferredPos === "top" ? 5 : 35
    });
  }

  // 2a. BOTTOM centré
  const botCenterX = Math.max(PAD, Math.min(viewport.w - cardW - PAD, targetRect.x + targetRect.width / 2 - cardW / 2));
  const botY = targetRect.y + targetRect.height + GAP;
  candidates.push({
    name: "bottom-center",
    pos: "bottom",
    x: botCenterX,
    y: botY,
    prefScore: preferredPos === "bottom" ? 0 : 30
  });

  // 2b. BOTTOM décalé vers la droite
  if (rightShiftX + cardW <= viewport.w - PAD) {
    candidates.push({
      name: "bottom-right",
      pos: "bottom",
      x: rightShiftX,
      y: Math.max(PAD, Math.min(viewport.h - cardH - PAD, targetRect.y + targetRect.height / 2)),
      prefScore: preferredPos === "bottom" ? 5 : 35
    });
  }

  // 3a. RIGHT centré
  const rightY = Math.max(PAD, Math.min(viewport.h - cardH - PAD, targetRect.y + targetRect.height / 2 - cardH / 2));
  candidates.push({
    name: "right-center",
    pos: "right",
    x: rightShiftX,
    y: rightY,
    prefScore: preferredPos === "right" ? 0 : 20
  });

  // 3b. RIGHT aligné en haut de l'élément (très utile pour grand nav)
  candidates.push({
    name: "right-top",
    pos: "right",
    x: rightShiftX,
    y: Math.max(PAD, Math.min(viewport.h - cardH - PAD, targetRect.y)),
    prefScore: preferredPos === "right" ? 2 : 25
  });

  // 4. LEFT centré
  const leftX = targetRect.x - cardW - GAP;
  const leftY = Math.max(PAD, Math.min(viewport.h - cardH - PAD, targetRect.y + targetRect.height / 2 - cardH / 2));
  candidates.push({
    name: "left-center",
    pos: "left",
    x: leftX,
    y: leftY,
    prefScore: preferredPos === "left" ? 0 : 20
  });

  // Filtre strict : DOIT être dans le viewport et NE DOIT PAS toucher la cible
  const validCandidates = candidates.filter(
    (c) => fitsInViewport(c.x, c.y, cardW, cardH) && !collidesWithTarget(c.x, c.y, cardW, cardH)
  );

  if (validCandidates.length > 0) {
    validCandidates.sort((a, b) => a.prefScore - b.prefScore);
    const chosen = validCandidates[0];
    return {
      left: Math.round(chosen.x),
      top: Math.round(chosen.y),
      pos: chosen.pos
    };
  }

  // Si l'espace est très contraint (ex. petit écran) : chercher le candidat qui ne chevauche pas le centre de la cible
  const candidatesInVp = candidates.filter((c) => fitsInViewport(c.x, c.y, cardW, cardH));
  if (candidatesInVp.length > 0) {
    candidatesInVp.sort((a, b) => a.prefScore - b.prefScore);
    return {
      left: Math.round(candidatesInVp[0].x),
      top: Math.round(candidatesInVp[0].y),
      pos: candidatesInVp[0].pos
    };
  }

  return {
    left: Math.round(Math.max(PAD, (viewport.w - cardW) / 2)),
    top: Math.round(Math.max(PAD, (viewport.h - cardH) / 2)),
    pos: "center"
  };
}

export default function PalouTutorial({
  onComplete,
  onStartCourse
}: {
  activeTab?: string;
  onComplete: () => void;
  onStartCourse?: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
  } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 1200, h: 800 });
  const [cardSize, setCardSize] = useState({ w: 520, h: 320 });

  const currentStep = onboardingSteps[stepIndex] || onboardingSteps[0];

  // Mesure dynamique de la taille réelle de la boîte du dialogue
  useLayoutEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCardSize({
          w: Math.round(rect.width),
          h: Math.round(rect.height)
        });
      }
    }
  }, [stepIndex, viewport]);

  // Update viewport size
  useEffect(() => {
    const updateVp = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    updateVp();
    window.addEventListener("resize", updateVp);
    return () => window.removeEventListener("resize", updateVp);
  }, []);

  // Arrêter la voix si le tutoriel est fermé
  useEffect(() => () => stopSpeaking(), []);

  // La voix officielle de Palou lit l'étape en cours
  const playVoice = useCallback(() => {
    setIsSpeaking(true);
    void sayUi(`tuto-${stepIndex + 1}` as UiKey, { force: true })
      .catch(() => {})
      .finally(() => setIsSpeaking(false));
  }, [stepIndex]);

  // AUTO-LECTURE DE LA VOIX : Palou parle automatiquement à chaque nouvelle étape
  useEffect(() => {
    stopSpeaking();
    setIsSpeaking(false);

    // Déclenchement automatique avec un court délai pour laisser l'animation visuelle s'amorcer
    const timer = setTimeout(() => {
      playVoice();
    }, 280);

    // Si le navigateur bloque l'autoplay audio avant le premier geste, on capte le premier clic
    const handleFirstTouch = () => {
      playVoice();
    };
    window.addEventListener("pointerdown", handleFirstTouch, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", handleFirstTouch);
      stopSpeaking();
    };
  }, [stepIndex, playVoice]);

  // Measure target bounding rect accurately
  const measureTarget = useCallback(() => {
    if (!currentStep.targetSelector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const pad = currentStep.padding ?? 8;
      setTargetRect({
        x: Math.max(0, rect.left - pad),
        y: Math.max(0, rect.top - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        radius: currentStep.radius ?? 18
      });
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  // Défilement intelligent : positionne la cible de manière à laisser un maximum d'espace pour la carte
  const scrollTargetIntoView = useCallback((el: Element, pos?: string) => {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;

    if (pos === "top") {
      // Pour une carte au-dessus, défilement vers le bas de l'écran pour dégager tout le haut
      const targetY = vh - rect.height - 90;
      const diff = rect.top - targetY;
      window.scrollBy({ top: diff, behavior: "smooth" });
    } else if (pos === "bottom") {
      // Pour une carte en dessous, défilement vers le haut de l'écran pour dégager le bas
      const targetY = 85;
      const diff = rect.top - targetY;
      window.scrollBy({ top: diff, behavior: "smooth" });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // When step changes, smooth scroll target into view and measure
  useEffect(() => {
    if (currentStep?.targetSelector) {
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        scrollTargetIntoView(el, currentStep.palouPos);
        measureTarget();
        const t1 = setTimeout(measureTarget, 80);
        const t2 = setTimeout(measureTarget, 240);
        const t3 = setTimeout(measureTarget, 480);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
        };
      }
    } else {
      setTargetRect(null);
    }
  }, [stepIndex, currentStep, measureTarget, scrollTargetIntoView]);

  // Update on scroll & resize
  useEffect(() => {
    const handleScrollOrResize = () => {
      measureTarget();
    };
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [measureTarget]);

  const handleSkip = () => {
    stopSpeaking();
    onComplete();
  };

  const handleFinish = () => {
    stopSpeaking();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#f4b942", "#11998e", "#38ef7d", "#ffffff"]
    });
    if (stepIndex === onboardingSteps.length - 1 && onStartCourse) {
      onStartCourse();
    } else {
      onComplete();
    }
  };

  const handleNext = () => {
    if (stepIndex < onboardingSteps.length - 1) {
      setStepIndex((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex((s) => s - 1);
    }
  };

  // Calcul mathématique infaillible de placement sans superposition
  const placement = useMemo(() => {
    return computeTutorialPlacement(viewport, targetRect, cardSize, currentStep.palouPos);
  }, [viewport, targetRect, cardSize, currentStep.palouPos]);

  const isLastStep = stepIndex === onboardingSteps.length - 1;

  return (
    <div className="palou-tutorial-overlay">
      {/* ── SVG Spotlight Mask (Clean Cutout) ── */}
      <svg className="palou-spotlight-svg">
        <defs>
          <mask id="palou-spotlight-hole-mask">
            {/* White fills the mask (visible backdrop) */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black cuts out the crystal-clear hole */}
            {targetRect && (
              <rect
                x={targetRect.x}
                y={targetRect.y}
                width={targetRect.width}
                height={targetRect.height}
                rx={targetRect.radius}
                ry={targetRect.radius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          className="palou-spotlight-backdrop"
          width="100%"
          height="100%"
          fill="rgba(10, 26, 28, 0.74)"
          mask="url(#palou-spotlight-hole-mask)"
          onClick={handleNext}
        />
      </svg>

      {/* ── Golden Glowing Frame around Target ── */}
      {targetRect && (
        <div
          className="palou-spotlight-frame"
          style={{
            top: targetRect.y,
            left: targetRect.x,
            width: targetRect.width,
            height: targetRect.height,
            borderRadius: targetRect.radius,
            pointerEvents: currentStep.allowClickTarget ? "auto" : "none",
            cursor: currentStep.allowClickTarget ? "pointer" : "default"
          }}
          onClick={() => {
            if (currentStep.allowClickTarget) {
              handleFinish();
            }
          }}
        >
          {currentStep.badgeText && (
            <div className="palou-spotlight-badge">
              <span>{currentStep.badgeText}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Dialogue Container (Palou + Speech Bubble) ── */}
      <AnimatePresence mode="wait">
        <motion.div
          ref={containerRef}
          key={stepIndex}
          className="palou-tutorial-container"
          style={{
            top: placement.top,
            left: placement.left
          }}
          data-placement={placement.pos}
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -12 }}
          transition={{ type: "spring", damping: 24, stiffness: 300 }}
        >
          {/* Speech Bubble */}
          <div className="palou-tutorial-speech" data-placement={placement.pos}>
            <div className="palou-tutorial-header">
              <span className="palou-tutorial-step-tag">
                Étape {stepIndex + 1} sur {onboardingSteps.length}
              </span>
              <button
                type="button"
                className={`palou-tuto-audio-btn ${isSpeaking ? "speaking" : ""}`}
                onClick={playVoice}
                title="Écouter la voix de Palou"
                aria-label={isSpeaking ? "Palou parle" : "Écouter la voix de Palou"}
              >
                <Volume2 size={16} style={{ verticalAlign: "middle" }} /> {isSpeaking ? "Je parle..." : "Écouter"}
              </button>
            </div>

            <h3>{currentStep.title}</h3>
            <p>{currentStep.message}</p>

            {/* Dots navigation */}
            <div className="palou-tutorial-dots">
              {onboardingSteps.map((_, i) => (
                <div
                  key={i}
                  className={`palou-tuto-dot ${i === stepIndex ? "active" : i < stepIndex ? "done" : "inactive"}`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="palou-tutorial-actions">
              {stepIndex > 0 && (
                <button type="button" className="palou-tuto-btn-prev" onClick={handlePrev}>
                  ← Retour
                </button>
              )}
              <button
                type="button"
                className={`palou-tuto-btn-next ${isLastStep ? "start-course" : ""}`}
                onClick={handleNext}
              >
                {currentStep.actionLabel || (isLastStep ? "Lancer mon premier cours" : "Suivant →")}
              </button>
            </div>

            <button type="button" className="palou-tuto-skip" onClick={handleSkip}>
              Passer la visite
            </button>
          </div>

          {/* Palou Mascot */}
          <div className="palou-tutorial-mascot">
            <img
              src={`/images/palou/${currentStep.palouEmote}`}
              alt="Palou guide"
              width={140}
              height={140}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
