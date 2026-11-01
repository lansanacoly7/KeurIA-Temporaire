"use client";

import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { ArrowRight, Sparkles } from "lucide-react";
import { playMagic } from "../utils/sounds";

const TrophySVG = () => (
  <svg width="70" height="70" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF176" />
        <stop offset="50%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#F57F17" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    {/* Base */}
    <path d="M30 85 L70 85 L75 95 L25 95 Z" fill="url(#gold)" stroke="#B8860B" strokeWidth="2"/>
    <path d="M40 70 L60 70 L65 85 L35 85 Z" fill="url(#gold)" stroke="#B8860B" strokeWidth="2"/>
    {/* Stem */}
    <rect x="42" y="55" width="16" height="15" fill="url(#gold)" stroke="#B8860B" strokeWidth="2"/>
    {/* Bowl */}
    <path d="M20 20 C20 20 20 55 50 55 C80 55 80 20 80 20 Z" fill="url(#gold)" stroke="#B8860B" strokeWidth="2" filter="url(#glow)"/>
    {/* Handles */}
    <path d="M20 25 C10 25 5 35 15 45 C20 50 25 45 25 45" fill="none" stroke="url(#gold)" strokeWidth="6" strokeLinecap="round"/>
    <path d="M80 25 C90 25 95 35 85 45 C80 50 75 45 75 45" fill="none" stroke="url(#gold)" strokeWidth="6" strokeLinecap="round"/>
    {/* Star inside bowl */}
    <path d="M50 25 L53 33 L62 33 L55 38 L57 46 L50 42 L43 46 L45 38 L38 33 L47 33 Z" fill="#FFF9C4"/>
  </svg>
);

const StarSVG = ({ filled, delay }: { filled: boolean; delay: number }) => (
  <svg 
    width="60" 
    height="60" 
    viewBox="0 0 24 24" 
    className={`star-anim ${filled ? 'filled' : 'empty'}`}
    style={{ animationDelay: `${delay}s` }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="starGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF176" />
        <stop offset="50%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#F57F17" />
      </linearGradient>
      <filter id="starGlow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <polygon 
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" 
      fill={filled ? "url(#starGold)" : "rgba(255,255,255,0.2)"}
      stroke={filled ? "#B8860B" : "rgba(255,255,255,0.4)"}
      strokeWidth="1"
      strokeLinejoin="round"
      filter={filled ? "url(#starGlow)" : "none"}
    />
  </svg>
);

export default function KidsRewardAnimation({
  skill,
  score,
  maxXp,
  onFinish,
  onNextLesson,
  hasNextLesson
}: {
  skill: string;
  score: number;
  maxXp?: number;
  onFinish: () => void;
  onNextLesson?: () => void;
  hasNextLesson?: boolean;
}) {
  const [showBadge, setShowBadge] = useState(false);
  const [showStars, setShowStars] = useState(false);
  
  // The user requested to ALWAYS give 3 stars and "Excellent !!" for every completion
  const earnedStars = 3;
  const gradeText = "Excellent !!";

  useEffect(() => {
    // Show stars animation immediately
    setShowStars(true);
    playMagic();

    // Lancer de multiples salves de confettis ultra-dynamiques
    const duration = 4 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 8,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors: ['#0f755f', '#d8f05b', '#ffb3b3', '#87CEEB', '#FFD700']
      });
      confetti({
        particleCount: 8,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors: ['#0f755f', '#d8f05b', '#ffb3b3', '#87CEEB', '#FFD700']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
    
    // Grand feu d'artifice central au tout début
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#d8f05b', '#FFD700', '#ffffff', '#ffb3b3']
    });

    // Show badge a bit later
    const timeout = setTimeout(() => setShowBadge(true), 2000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="reward-container">
      <style dangerouslySetInnerHTML={{__html: `
        .reward-container {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 2000;
          background: radial-gradient(circle at center, rgba(15, 117, 95, 0.95), rgba(10, 79, 64, 0.98));
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 2vh 20px;
          overflow-y: auto;
          font-family: 'Fredoka', 'Quicksand', sans-serif;
          color: white;
        }

        .reward-title {
          font-size: clamp(2.5rem, 6vw, 4rem);
          font-weight: 900;
          text-shadow: 0 4px 15px rgba(0,0,0,0.4);
          margin-bottom: 10px;
          text-align: center;
          animation: dropDown 1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          background: linear-gradient(to bottom, #ffffff, #d8f05b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .palou-winner {
          width: 180px;
          height: 180px;
          object-fit: contain;
          animation: bounceWinner 2s infinite, glowPalou 3s infinite alternate;
          z-index: 10;
        }

        .stars-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 15px 0;
          animation: popIn 0.8s ease-out 0.5s both;
        }
        
        .stars-row {
          display: flex;
          gap: 15px;
          margin-bottom: 5px;
        }

        .star-anim.empty {
          opacity: 0.5;
          transform: scale(0.9);
        }

        .star-anim.filled {
          opacity: 0;
          animation: starPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        
        .grade-text {
          font-size: clamp(1.8rem, 3vw, 2.5rem);
          font-weight: 900;
          color: #d8f05b;
          text-shadow: 0 2px 10px rgba(0,0,0,0.4);
          animation: dropDown 0.5s ease-out 2s both;
        }

        .badge-section {
          margin-top: 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: popBadge 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }

        .badge-icon-wrapper {
          background: radial-gradient(circle at center, rgba(255,255,255,1), rgba(240,240,240,0.8));
          width: 100px;
          height: 100px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          animation: glowBadge 2s infinite alternate;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          border: 4px solid #FFF176;
        }

        .badge-text {
          font-size: clamp(1.3rem, 2vw, 1.8rem);
          font-weight: 900;
          background: white;
          color: #0f755f;
          padding: 10px 30px;
          border-radius: 40px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          text-align: center;
          border: 4px solid #d8f05b;
        }

        .finish-btn {
          margin-top: 20px;
          margin-bottom: 20px;
          background: linear-gradient(to bottom, #d8f05b, #b9d62d);
          color: #0f755f;
          border: none;
          border-radius: 50px;
          padding: 16px 40px;
          font-size: clamp(1.4rem, 2vw, 1.8rem);
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 0 #8b9c1d, 0 12px 15px rgba(0,0,0,0.3);
          transition: all 0.2s;
          animation: pulseBtn 2s infinite, slideUp 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }

        .finish-btn:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 0 #8b9c1d, 0 20px 25px rgba(0,0,0,0.4);
        }

        .finish-btn:active {
          transform: translateY(5px);
          box-shadow: 0 5px 0 #8b9c1d, 0 5px 10px rgba(0,0,0,0.2);
        }

        @keyframes dropDown {
          from { transform: translateY(-100px) scale(0.8); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }

        @keyframes popIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes starPop {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          70% { transform: scale(1.3) rotate(10deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        @keyframes popBadge {
          0% { transform: scale(0) translateY(50px); opacity: 0; }
          70% { transform: scale(1.1) translateY(-10px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        @keyframes bounceWinner {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes glowPalou {
          from { filter: drop-shadow(0 15px 25px rgba(216, 240, 91, 0.3)); }
          to { filter: drop-shadow(0 20px 40px rgba(216, 240, 91, 0.7)); }
        }

        @keyframes glowBadge {
          from { box-shadow: 0 15px 35px rgba(0,0,0,0.4), 0 0 0 8px rgba(216, 240, 91, 0.3); }
          to { box-shadow: 0 20px 45px rgba(0,0,0,0.5), 0 0 0 18px rgba(216, 240, 91, 0.8); }
        }

        @keyframes pulseBtn {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />

      <h1 className="reward-title">MISSION ACCOMPLIE !</h1>
      
      <img src="/images/palou/Palou_Celebration.png" alt="Palou célèbre" className="palou-winner" />

      {showStars && (
        <div className="stars-section">
          <div className="stars-row">
            <StarSVG filled={earnedStars >= 1} delay={0.6} />
            <StarSVG filled={earnedStars >= 2} delay={1.1} />
            <StarSVG filled={earnedStars >= 3} delay={1.6} />
          </div>
          <div className="grade-text">{gradeText}</div>
        </div>
      )}

      {showBadge && (
        <div className="badge-section">
          <div className="badge-icon-wrapper">
            <TrophySVG />
          </div>
          <div className="badge-text">Pouvoir débloqué : {skill}</div>
        </div>
      )}

      {showBadge && (
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          <button className="finish-btn" onClick={onFinish} style={{ background: '#f0f0f0', color: '#153b3b', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span>Retourner au menu</span>
            <Sparkles size={16} />
          </button>
          {hasNextLesson && onNextLesson && (
            <button className="finish-btn" onClick={onNextLesson} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>Leçon suivante</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
