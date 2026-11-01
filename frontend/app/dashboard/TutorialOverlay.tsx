"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { GameLevel, TOTAL_LEVELS } from "./games-map-data";
import { hasSeenEvent, markEventSeen } from "./dashboardShared";

type TutorialOverlayProps = {
  currentLevel: GameLevel | null;
  hasPlayed?: boolean;
  /** La progression du serveur (dont les événements déjà vus) est chargée : avant, on ne sait pas si l'élève a déjà vu ce guide. */
  ready?: boolean;
};

export function TutorialOverlay({ currentLevel, hasPlayed, ready = true }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const [spot, setSpot] = useState({ x: -1000, y: -1000, radius: 120 });

  // Guide affiché une seule fois par élève : l'état « déjà vu » est conservé côté serveur (comme les badges),
  // sinon il revenait à chaque connexion puisque la déconnexion vide le stockage local.
  useEffect(() => {
    if (!ready) return;
    // Ancien drapeau local (avant la mémorisation serveur) : on le reprend pour ne pas rejouer le guide à ceux qui l'ont déjà vu.
    if (localStorage.getItem("jeux_defis_tutorial_completed")) markEventSeen("games_tutorial");
    if (!hasSeenEvent("games_tutorial") && !hasPlayed) {
      setShow(true);
      // Marqué dès l'apparition pour ne pas se relancer si l'enfant quitte la page.
      markEventSeen("games_tutorial");
    }
  }, [ready, hasPlayed]);

  useEffect(() => {
    const handleReplay = () => {
      setStep(0);
      setShow(true);
    };
    window.addEventListener("replayTutorial", handleReplay);
    return () => window.removeEventListener("replayTutorial", handleReplay);
  }, []);

  useEffect(() => {
    if (!show) return;

    let targetId = "";
    const radius = 120;
    
    // Déterminer la cible en fonction de l'étape
    if (step === 1 && currentLevel) targetId = `gm-node-${currentLevel.id}`; // "Voici ton prochain défi" -> Niveau courant
    if (step === 2 && currentLevel) targetId = `gm-node-${currentLevel.id}`; // "Tu peux gagner 3 étoiles" -> Maintient sur le niveau courant
    if (step === 3 && currentLevel) {
      // "Suivre le chemin" -> Pointe vers le niveau suivant (ou le dernier)
      const n = parseInt(currentLevel.id.split("-")[2]);
      const nextId = Math.min(TOTAL_LEVELS, n + 1);
      targetId = `gm-node-jeux7-9-${String(nextId).padStart(2, '0')}`;
    }
    if (step === 4 && currentLevel) {
      // "Défis verrouillés" -> Pointe vers un niveau un peu plus loin, supposé verrouillé
      const n = parseInt(currentLevel.id.split("-")[2]);
      const nextLockedId = Math.min(TOTAL_LEVELS, n + 2);
      targetId = `gm-node-jeux7-9-${String(nextLockedId).padStart(2, '0')}`;
    }

    const updateSpot = () => {
      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) {
          const rect = el.getBoundingClientRect();
          // On augmente le radius pour s'assurer que l'avatar Palou à côté du niveau est bien éclairé
          setSpot({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, radius: 200 });
        }
      } else {
        // Spotlight générique (milieu haut)
        setSpot({ x: window.innerWidth / 2, y: window.innerHeight * 0.4, radius: 250 });
      }
    };

    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    updateSpot();
    const interval = setInterval(updateSpot, 50); // Rafraîchir pendant le scroll
    setTimeout(() => clearInterval(interval), 1000); // Arrêter après 1s (fin du scroll fluide)

    window.addEventListener("scroll", updateSpot, true);
    window.addEventListener("resize", updateSpot);
    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", updateSpot, true);
      window.removeEventListener("resize", updateSpot);
    };
  }, [step, show, currentLevel]);

  if (!show) return null;

  const nextStep = () => {
    if (step === 5) {
      // Scroller vers le niveau actif avant de fermer
      if (currentLevel) {
        const targetId = `gm-node-${currentLevel.id}`;
        const el = document.getElementById(targetId);
        if (el) {
          // Scroll avec padding à gauche pour montrer le bouton sans couper
          const rect = el.getBoundingClientRect();
          const scrollLeft = window.scrollX + rect.left - 700; // 700px de padding à gauche pour garantir le bouton visible sur tous les niveaux
          window.scrollTo({ left: scrollLeft, behavior: "smooth" });

          // Fermer après le scroll
          setTimeout(() => {
            markEventSeen("games_tutorial");
            setShow(false);
          }, 600);
        } else {
          markEventSeen("games_tutorial");
          setShow(false);
        }
      } else {
        markEventSeen("games_tutorial");
        setShow(false);
      }
    } else {
      setStep(s => s + 1);
    }
  };

  const skip = () => {
    markEventSeen("games_tutorial");
    setShow(false);
  };

  const steps = [
    {
      palou: "Coucou ! Bienvenue sur ta carte des défis ! Je suis Palou, ton guide.",
      btn: "C'est parti !",
      media: null
    },
    {
      palou: "Voici ton prochain défi. Clique dessus pour commencer !",
      btn: "Suivant",
      media: null
    },
    {
      palou: "À chaque défi, tu peux gagner jusqu'à 3 étoiles ! Plus tu fais de bonnes réponses, plus tu as d'étoiles.",
      btn: "Super !",
      media: "stars" // Ajout de l'image des étoiles pour la cohérence
    },
    {
      palou: "Suis le chemin pour découvrir les prochains défis !",
      btn: "Compris",
      media: null
    },
    {
      palou: "Certains défis sont verrouillés (avec un cadenas). Tu dois terminer le module Aventure correspondant pour les débloquer.",
      btn: "D'accord",
      media: null
    },
    {
      palou: "Tu es prêt ! À toi de jouer !",
      btn: "Commencer l'aventure",
      media: null
    }
  ];

  const currentStep = steps[step];
  
  // Positionnement dynamique de la boîte de dialogue pour ne pas cacher le spot
  // Si le spot est en bas de l'écran, on met la boîte en haut, sinon en bas.
  const dialogPosition = typeof window !== 'undefined' && spot.y > window.innerHeight / 2 
    ? { top: 40, left: "50%", transform: "translateX(-50%)" }
    : { bottom: 40, left: "50%", transform: "translateX(-50%)" };

  return (
    <div className="gm-tutorial-overlay" style={{ "--spotlight-x": `${spot.x}px`, "--spotlight-y": `${spot.y}px`, background: `radial-gradient(circle at var(--spotlight-x) var(--spotlight-y), transparent 0%, transparent ${spot.radius}px, rgba(0, 0, 0, 0.75) ${spot.radius + 80}px, rgba(0, 0, 0, 0.85) 100%)` } as React.CSSProperties}>
      <div className="gm-tutorial-content" style={{ position: "fixed", ...dialogPosition, width: 500, maxWidth: "90vw", transition: "top 0.5s, bottom 0.5s" }}>
        
        <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
          <img src="/images/palou/game-palou-joie.png" alt="Palou" style={{ width: 140, filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.4))", animation: "kiFloatSlow 3s infinite" }} />
          
          <div style={{ background: "#FBFAF3", border: "4px solid var(--brand, #0E4B3C)", borderRadius: "24px 24px 24px 0", padding: "24px 30px", position: "relative", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <p style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "var(--brand, #0E3A2E)", lineHeight: 1.4 }}>
              {currentStep.palou}
            </p>
            
            {currentStep.media === "stars" && (
              <div style={{ display: "flex", justifyContent: "center", gap: 10, margin: "0 0 20px 0", color: "#F4B63F" }}>
                <span style={{ animation: "kiPulse 1.5s infinite alternate", animationDelay: "0.1s" }}><Star size={36} fill="#F4B63F" /></span>
                <span style={{ animation: "kiPulse 1.5s infinite alternate", animationDelay: "0.3s", transform: "translateY(-8px)" }}><Star size={42} fill="#F4B63F" /></span>
                <span style={{ animation: "kiPulse 1.5s infinite alternate", animationDelay: "0.5s" }}><Star size={36} fill="#F4B63F" /></span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={skip} style={{ background: "transparent", border: "none", color: "#6C7A63", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
                Passer
              </button>
              
              <button onClick={nextStep} style={{ background: "var(--brand-accent, #C8F24D)", border: "none", borderRadius: 12, color: "var(--brand, #0E3A2E)", fontFamily: "'Baloo 2',cursive", fontSize: 18, fontWeight: 700, padding: "10px 20px", cursor: "pointer", boxShadow: "0 5px 0 var(--brand-accent-deep, #9DC237)" }}>
                {currentStep.btn}
              </button>
            </div>
            
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16 }}>
              {steps.map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === step ? "var(--brand, #0E4B3C)" : "#E4DEC6" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
