"use client";

import { useEffect, useState } from "react";
import { randomInt, randomFloat } from "../utils/random";

export type PalouEvent = "jump" | "greet" | "sad" | "celebrate" | "curious" | "surprise" | null;

interface PalouGuideProps {
  isWalking?: boolean;
  isThinking?: boolean;
  event?: PalouEvent;
  onEventConsumed?: () => void;
  className?: string;
  size?: number;
  inline?: boolean;
}

export function PalouGuide({
  isWalking = false,
  isThinking = false,
  event = null,
  onEventConsumed,
  className = "",
  size = 240, // Diminué légèrement selon la demande (de 300 à 240)
  inline = false
}: PalouGuideProps) {
  const [currentMood, setCurrentMood] = useState<string>("Palou_Content");
  const [animClass, setAnimClass] = useState<string>("palou-pop");
  const [imgExt, setImgExt] = useState<string>("png");
  
  // Tips state
  const [activeTip, setActiveTip] = useState<string | null>(null);

  const TIPS = [
    "Prends ton temps pour bien lire chaque question !",
    "Savais-tu qu'une IA apprend grâce à des exemples ?",
    "N'oublie pas de faire des pauses, c'est important !",
    "L'humain reste toujours responsable des décisions d'une IA.",
    "Clique sur moi si tu veux me voir sauter !",
    "Rappelle-toi : ne partage jamais tes secrets en ligne.",
    "Chaque erreur est une occasion d'apprendre."
  ];

  // Random tips interval
  useEffect(() => {
    if (inline) return; // Pas de bulles si Palou est juste une icône intégrée

    const interval = setInterval(() => {
      // 1 chance sur 2 d'afficher un message toutes les 25 secondes
      if (randomFloat() > 0.5) {
        const randomTip = TIPS[randomInt(TIPS.length)];
        setActiveTip(randomTip);
        
        // Disparaît après 7 secondes
        setTimeout(() => {
          setActiveTip(null);
        }, 7000);
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [inline]);

  // Handle click interaction to trigger jump manually if idle
  const handleInteraction = () => {
    if (animClass === "palou-idle") {
      setAnimClass("palou-jump");
      setCurrentMood("Palou_Celebration");
      setActiveTip("Youhou ! C'est parti !");
      setTimeout(() => setActiveTip(null), 2000);
      setTimeout(() => {
        setAnimClass("palou-idle");
        setCurrentMood("Palou_Content");
      }, 1500);
    }
  };

  useEffect(() => {
    setImgExt("png");
    
    if (event) {
      if (event === "jump" || event === "celebrate") {
        setCurrentMood("Palou_Celebration");
        setAnimClass("palou-jump");
      } else if (event === "greet") {
        setCurrentMood("Palou_Content");
        setAnimClass("palou-pop");
      } else if (event === "sad") {
        setCurrentMood("Palou_Triste");
        setAnimClass("palou-pop");
      }
      
      const t = setTimeout(() => {
        setAnimClass("palou-idle");
        if (onEventConsumed) onEventConsumed();
      }, 1500);
      return () => clearTimeout(t);
    } else {
      if (isWalking) {
        setAnimClass("palou-float");
      } else if (isThinking) {
        setCurrentMood("Palou_Reflexion");
        setAnimClass("palou-curious");
      } else {
        setCurrentMood("Palou_Content");
        setAnimClass("palou-idle");
      }
    }
  }, [event, isWalking, isThinking, onEventConsumed]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* Advanced Character Animations for Palou */
        .palou-wrapper {
          transform-origin: bottom center;
          transition: filter 0.3s ease;
          filter: drop-shadow(0 15px 15px rgba(0,0,0,0.15));
        }

        .palou-wrapper:hover {
          filter: drop-shadow(0 20px 20px rgba(0,0,0,0.25)) brightness(1.05);
        }

        /* Speech Bubble */
        .palou-speech-bubble {
          position: absolute;
          bottom: 95%;
          right: 50%;
          width: max-content;
          max-width: 220px;
          background: white;
          color: var(--brand, #153b3b);
          padding: 12px 16px;
          border-radius: 20px;
          border-bottom-right-radius: 0;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.4;
          animation: palouPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          pointer-events: none;
          z-index: 2;
        }
        
        .palou-speech-bubble::after {
          content: '';
          position: absolute;
          bottom: -10px;
          right: 0;
          border-width: 10px 10px 0 0;
          border-style: solid;
          border-color: white transparent transparent transparent;
        }

        /* 1. Idle Breathing (subtle squash and stretch) */
        @keyframes palouBreathing {
          0%, 100% { transform: scaleY(1) scaleX(1) translateY(0); }
          50% { transform: scaleY(0.97) scaleX(1.02) translateY(3px); }
        }
        .palou-idle {
          animation: palouBreathing 3.5s cubic-bezier(0.37, 0, 0.63, 1) infinite;
          cursor: pointer;
        }

        /* 2. Jump/Celebrate (anticipation -> explosive jump -> gravity fall -> squash on land) */
        @keyframes palouJumpSquash {
          0%   { transform: scaleY(1) scaleX(1) translateY(0); }
          15%  { transform: scaleY(0.8) scaleX(1.15) translateY(10px); } /* Anticipation (squash) */
          40%  { transform: scaleY(1.1) scaleX(0.9) translateY(-60px); } /* Blast off (stretch) */
          60%  { transform: scaleY(1) scaleX(1) translateY(-70px); } /* Hang time */
          80%  { transform: scaleY(1.05) scaleX(0.95) translateY(0); } /* Falling (stretch) */
          90%  { transform: scaleY(0.85) scaleX(1.1) translateY(5px); } /* Land (squash) */
          100% { transform: scaleY(1) scaleX(1) translateY(0); }
        }
        .palou-jump {
          animation: palouJumpSquash 1.5s cubic-bezier(0.28, 0.84, 0.42, 1) forwards;
        }

        /* 3. Pop in (overshoot scale) */
        @keyframes palouPopIn {
          0% { transform: scale(0) translateY(100px); opacity: 0; }
          60% { transform: scale(1.1) translateY(-20px); opacity: 1; }
          80% { transform: scale(0.95) translateY(5px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .palou-pop {
          animation: palouPopIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        /* 4. Curious/Thinking (tilting head side to side) */
        @keyframes palouTilt {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
        .palou-curious {
          animation: palouTilt 4s ease-in-out infinite;
        }

        /* 5. Float (gentle levitation) */
        @keyframes palouFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        .palou-float {
          animation: palouFloat 4s ease-in-out infinite;
        }
      `}} />
      <div 
        className={`palou-wrapper ${animClass} ${className}`} 
        onClick={handleInteraction}
        style={{ 
          width: size, 
          height: size, 
          position: inline ? 'relative' : 'fixed',
          bottom: inline ? 'auto' : '10px',
          right: inline ? 'auto' : '20px', // Placé à droite au lieu de gauche
          zIndex: inline ? 10 : 9999,
          pointerEvents: 'auto'
        }}
      >
        {activeTip && (
          <div className="palou-speech-bubble">
            {activeTip}
          </div>
        )}
        <img 
          src={`/images/palou/${currentMood}.${imgExt}`} 
          alt="Palou Mascot" 
          style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'relative',
              zIndex: 1
          }}
          onError={() => {
              if (imgExt === 'png') setImgExt('jpg');
          }}
        />
      </div>
    </>
  );
}
