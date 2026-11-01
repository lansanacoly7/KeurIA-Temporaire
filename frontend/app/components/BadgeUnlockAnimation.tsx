"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { PartyPopper, Rocket, Sparkles, Star, Trophy } from "lucide-react";
import { badgeImage } from "../lms-data";
import { randomFloat } from "../utils/random";

export type BadgeUnlockInfo = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity?: string;
};

const subscribeNothing = () => () => {};

// Rendu à la racine de la page : « position: fixed » est relatif au plus proche parent transformé
// (ex. le lecteur de leçon réduit à l'échelle), ce qui rognait la fenêtre et la passait derrière le reste.
export default function BadgeUnlockAnimation(props: { badge: BadgeUnlockInfo; onClose: () => void }) {
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return isClient ? createPortal(<BadgeUnlockOverlay {...props} />, document.body) : null;
}

function BadgeUnlockOverlay({
  badge,
  onClose
}: {
  badge: BadgeUnlockInfo;
  onClose: () => void;
}) {
  useEffect(() => {
    // Energetic colorful celebratory fireworks & confetti
    const duration = 4500;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 40, spread: 360, ticks: 90, zIndex: 100000 };

    const randomInRange = (min: number, max: number) => randomFloat() * (max - min) + min;

    const interval: ReturnType<typeof setInterval> = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 70 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.15, 0.85), y: randomFloat() - 0.2 },
        colors: ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#fbbf24']
      });
    }, 220);



    return () => clearInterval(interval);
  }, [badge]);

  // Support touche Escape (WCAG 2.1 AA)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Determine vibrant accent colors based on rarity or badge
  const rarityLabel = badge.rarity === "gold" || badge.rarity === "1" ? "Trophée d'Or" : badge.rarity === "silver" || badge.rarity === "2" ? "Trophée d'Argent" : badge.rarity === "bronze" || badge.rarity === "3" ? "Trophée de Bronze" : "Insigne Spécial";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-unlock-title"
      aria-describedby="badge-unlock-desc"
      style={{
      position: 'fixed',
      top: 0, left: 0, width: 'calc(100vw / var(--app-zoom, 1))', height: 'calc(100vh / var(--app-zoom, 1))',
      background: 'radial-gradient(circle at 50% 40%, rgba(20, 184, 166, 0.85) 0%, rgba(15, 118, 110, 0.92) 50%, rgba(13, 79, 74, 0.96) 100%)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100000,
      fontFamily: "'Fredoka One', 'Baloo 2', 'Nunito', cursive, sans-serif"
    }}>
      <style>{`
        @keyframes spinSlowRays {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseAuraGlow {
          0%, 100% {
            box-shadow: 0 0 50px rgba(251, 191, 36, 0.7), 0 0 100px rgba(245, 158, 11, 0.4), inset 0 0 25px rgba(254, 240, 138, 0.6);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 80px rgba(251, 191, 36, 0.95), 0 0 140px rgba(245, 158, 11, 0.6), inset 0 0 45px rgba(254, 240, 138, 0.9);
            transform: scale(1.04);
          }
        }
        @keyframes floatStar {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(15deg); }
        }
        .shimmer-badge-text {
          background: linear-gradient(90deg, #d97706, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #10b981, #d97706);
          background-size: 250% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shineBadgeText 3.5s linear infinite;
        }
        @keyframes shineBadgeText {
          to { background-position: 250% center; }
        }
      `}</style>

      {/* Sunburst golden & teal celebratory rays */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '180vw', height: '180vw',
        marginLeft: '-90vw', marginTop: '-90vw',
        background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255, 255, 255, 0.22) 15deg, transparent 30deg, rgba(254, 240, 138, 0.22) 45deg, transparent 60deg, rgba(255, 255, 255, 0.22) 75deg, transparent 90deg, rgba(254, 240, 138, 0.22) 105deg, transparent 120deg, rgba(255, 255, 255, 0.22) 135deg, transparent 150deg, rgba(254, 240, 138, 0.22) 165deg, transparent 180deg, rgba(255, 255, 255, 0.22) 195deg, transparent 210deg, rgba(254, 240, 138, 0.22) 225deg, transparent 240deg, rgba(255, 255, 255, 0.22) 255deg, transparent 270deg, rgba(254, 240, 138, 0.22) 285deg, transparent 300deg, rgba(255, 255, 255, 0.22) 315deg, transparent 330deg, rgba(254, 240, 138, 0.22) 345deg, transparent 360deg)',
        animation: 'spinSlowRays 28s linear infinite',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Floating Sparkles around card */}
      <div style={{ position: 'absolute', top: '15%', left: '18%', animation: 'floatStar 3s ease-in-out infinite', pointerEvents: 'none', zIndex: 1, color: '#fde047' }}><Sparkles size={42} /></div>
      <div style={{ position: 'absolute', top: '22%', right: '18%', animation: 'floatStar 2.6s ease-in-out infinite reverse', pointerEvents: 'none', zIndex: 1, color: '#facc15' }}><Star size={46} /></div>
      <div style={{ position: 'absolute', bottom: '18%', left: '22%', animation: 'floatStar 3.4s ease-in-out infinite', pointerEvents: 'none', zIndex: 1, color: '#fbbf24' }}><Sparkles size={38} /></div>
      <div style={{ position: 'absolute', bottom: '20%', right: '20%', animation: 'floatStar 2.8s ease-in-out infinite reverse', pointerEvents: 'none', zIndex: 1, color: '#f59e0b' }}><PartyPopper size={44} /></div>

      {/* Main Festive Modal Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.45, y: 80, rotate: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 17, delay: 0.05 }}
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)',
          padding: '45px 36px 50px',
          borderRadius: '42px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.35), 0 0 0 6px #fde047, 0 0 45px rgba(251, 191, 36, 0.65)',
          border: '4px solid white',
          textAlign: 'center',
          maxWidth: '500px',
          width: '92%',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 2
        }}
      >
        {/* Top celebratory banner pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '2px solid #f59e0b',
          borderRadius: '999px',
          padding: '6px 20px',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
          color: '#b45309'
        }}>
          <Sparkles size={16} />
          <span style={{
            fontSize: '13px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            {rarityLabel}
          </span>
          <Sparkles size={16} />
        </div>

        {/* Title: NOUVEAU POUVOIR ! */}
        <h2 style={{
          fontSize: '24px',
          color: 'var(--brand-mid, #0f766e)',
          margin: '0 0 20px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontWeight: 900,
          textShadow: '0 1px 2px rgba(15, 118, 110, 0.15)'
        }}>
          Nouveau Pouvoir Débloqué !
        </h2>

        {/* 3D Floating Badge Container with pulsating golden sun aura */}
        <motion.div 
          animate={{ y: [0, -12, 0], rotate: [-2, 2, -2] }} 
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          style={{ 
            position: 'relative', 
            zIndex: 1, 
            marginBottom: '25px', 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {/* Pulsating golden aura */}
          <div style={{
            width: '210px',
            height: '210px',
            background: 'linear-gradient(135deg, #fef08a 0%, #fde047 50%, #f59e0b 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '6px solid #ffffff',
            animation: 'pulseAuraGlow 2.2s infinite ease-in-out',
            position: 'relative',
            padding: '8px'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <img 
                src={badgeImage(badge.id)}
                alt={badge.name}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover'
                }} 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.innerHTML = '<svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';
                  fallback.style.display = 'flex';
                  fallback.style.alignItems = 'center';
                  fallback.style.justifyContent = 'center';
                  fallback.style.width = '100%';
                  fallback.style.height = '100%';
                  fallback.style.background = 'linear-gradient(135deg, #fef08a 0%, #fbbf24 100%)';
                  fallback.style.borderRadius = '50%';
                  (e.target as HTMLImageElement).parentNode?.appendChild(fallback);
                }}
              />
            </div>
          </div>
        </motion.div>
        
        {/* Badge Name with Rainbow shimmering effect */}
        <p id="badge-unlock-title" className="shimmer-badge-text" style={{ 
          fontSize: '34px', 
          fontWeight: 900, 
          margin: '0 0 10px 0', 
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.3))'
        }}>
          {badge.name}
        </p>

        {/* Badge Description */}
        <p id="badge-unlock-desc" style={{
          fontSize: '16px',
          color: '#334155',
          margin: '0 auto 28px',
          maxWidth: '88%',
          lineHeight: 1.5,
          fontWeight: 600
        }}>
          {badge.description}
        </p>
        
        {/* Big Joyful CTA Button */}
        <motion.button 
          whileHover={{ scale: 1.05, boxShadow: "0 18px 36px rgba(245, 158, 11, 0.55)" }}
          whileTap={{ scale: 0.94 }}
          onClick={onClose}
          aria-label={`Récupérer mon pouvoir : ${badge.name} et continuer`}
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #d97706 100%)',
            color: '#451a03',
            border: 'none',
            padding: '18px 45px',
            fontSize: '20px',
            fontWeight: 900,
            borderRadius: '999px',
            cursor: 'pointer',
            boxShadow: '0 12px 28px -4px rgba(245, 158, 11, 0.5), inset 0 -4px 0 rgba(180, 83, 9, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.6)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <Star size={20} />
          <span>Récupérer mon pouvoir !</span>
          <Rocket size={20} />
        </motion.button>
      </motion.div>
    </div>
  );
}
