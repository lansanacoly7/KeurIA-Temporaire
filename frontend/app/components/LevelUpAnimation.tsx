"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { randomFloat } from "../utils/random";

export default function LevelUpAnimation({
  levelName,
  levelImage,
  onClose
}: {
  levelName: string;
  levelImage: string;
  onClose: () => void;
}) {
  useEffect(() => {
    // Super energetic fireworks and confetti!
    const duration = 5000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 100000 };

    const randomInRange = (min: number, max: number) => randomFloat() * (max - min) + min;

    const interval: ReturnType<typeof setInterval> = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 80 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.9), y: randomFloat() - 0.2 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
      });
    }, 200);



    return () => clearInterval(interval);
  }, [levelName]);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: 'calc(100vw / var(--app-zoom, 1))', height: 'calc(100vh / var(--app-zoom, 1))',
      background: 'rgba(13, 132, 110, 0.8)', // vibrant teal overlay instead of dead gray
      backdropFilter: 'blur(15px)',
      WebkitBackdropFilter: 'blur(15px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100000,
      fontFamily: "'Fredoka One', 'Baloo 2', cursive"
    }}>
      <style>{`
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlowBig {
          0%, 100% { box-shadow: 0 0 50px rgba(251, 191, 36, 0.6), inset 0 0 30px rgba(251,191,36,0.5); }
          50% { box-shadow: 0 0 100px rgba(251, 191, 36, 0.9), inset 0 0 60px rgba(251,191,36,0.8); }
        }
        .rainbow-text {
          background: linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6, #3b82f6, #10b981, #f59e0b);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shineText 3s linear infinite;
        }
        @keyframes shineText {
          to { background-position: 200% center; }
        }
      `}</style>
      
      {/* Background sunburst effect */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '150vw', height: '150vw',
        marginLeft: '-75vw', marginTop: '-75vw',
        background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.2) 20deg, transparent 40deg, rgba(255,255,255,0.2) 60deg, transparent 80deg, rgba(255,255,255,0.2) 100deg, transparent 120deg, rgba(255,255,255,0.2) 140deg, transparent 160deg, rgba(255,255,255,0.2) 180deg, transparent 200deg, rgba(255,255,255,0.2) 220deg, transparent 240deg, rgba(255,255,255,0.2) 260deg, transparent 280deg, rgba(255,255,255,0.2) 300deg, transparent 320deg, rgba(255,255,255,0.2) 340deg, transparent 360deg)',
        animation: 'spinSlow 30s linear infinite',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.5, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '50px 40px 60px',
          borderRadius: '40px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.3), inset 0 0 0 6px rgba(251, 191, 36, 0.5)',
          border: '4px solid white',
          textAlign: 'center',
          maxWidth: '480px',
          width: '90%',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1
        }}
      >
        <motion.div 
          animate={{ y: [0, -15, 0] }} 
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          style={{ position: 'relative', zIndex: 1, marginBottom: '25px', display: 'flex', justifyContent: 'center' }}
        >
          {/* White circular container to hide image background via multiply, and glowing heavily */}
          <div style={{
            width: '220px', height: '220px',
            background: 'white',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '6px solid white',
            animation: 'pulseGlowBig 2s infinite ease-in-out',
            overflow: 'hidden', // cuts off any square edges of the image
            position: 'relative'
          }}>
            <img 
              src={levelImage} 
              alt={levelName}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                mixBlendMode: 'multiply' // Hides white background inside the white container
              }} 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = document.createElement('div');
                fallback.innerHTML = '<svg width="100" height="100" viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
                fallback.style.display = 'flex';
                fallback.style.alignItems = 'center';
                fallback.style.justifyContent = 'center';
                fallback.style.width = '100%';
                fallback.style.height = '100%';
                (e.target as HTMLImageElement).parentNode?.appendChild(fallback);
              }}
            />
          </div>
        </motion.div>
        
        <h2 style={{
          fontSize: '22px',
          color: 'var(--brand-mid, #0d846e)',
          margin: '0 0 10px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 900
        }}>
          Niveau Supérieur !
        </h2>
        
        <p className="rainbow-text" style={{ 
          fontSize: '48px', 
          fontWeight: 900, 
          margin: '0 0 35px 0', 
          lineHeight: 1.1,
          textShadow: '0 5px 15px rgba(245, 158, 11, 0.3)'
        }}>
          {levelName}
        </p>
        
        <motion.button 
          whileHover={{ scale: 1.05, boxShadow: "0 15px 30px rgba(245, 158, 11, 0.4)" }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          style={{
            background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
            color: '#78350f',
            border: 'none',
            padding: '20px 45px',
            fontSize: '22px',
            fontWeight: 900,
            borderRadius: '99px',
            cursor: 'pointer',
            boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.5), inset 0 -4px 0 rgba(217, 119, 6, 0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: "'Fredoka One', 'Baloo 2', cursive"
          }}
        >
          Super ! 
        </motion.button>
      </motion.div>
    </div>
  );
}
