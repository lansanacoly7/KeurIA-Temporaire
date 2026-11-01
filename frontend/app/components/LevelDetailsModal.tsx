import React, { useEffect, useState } from "react";
import { X, TrendingUp, Sparkles, Star, Target } from "lucide-react";
import { getLevelTier, getNextTier } from "../level-tiers";

type Props = {
  currentXp: number;
  onClose: () => void;
};

export default function LevelDetailsModal({ currentXp, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Paliers partagés avec le reste de l'application (mêmes seuils que le serveur).
  const currentLevel = getLevelTier(currentXp);
  const nextLevel = getNextTier(currentLevel);
  const isMaxLevel = nextLevel === null;

  // La barre va du seuil du palier actuel au seuil du palier suivant.
  const progressPercentage = nextLevel
    ? Math.min(100, Math.max(0, ((currentXp - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100))
    : 100;
  return (
    <div role="presentation" style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px 12px", opacity: mounted ? 1 : 0, transition: "opacity 0.3s ease-out"
    }} onClick={onClose}>
      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.92) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes floatCenter {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-6px); }
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 18px rgba(251, 191, 36, 0.4); }
          50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.8); }
        }
        
        .premium-modal {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.25), inset 0 0 0 1px rgba(255,255,255,0.6);
          border-radius: 36px;
          width: 100%;
          max-width: 680px;
          max-height: min(92vh, 850px);
          animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .premium-modal::-webkit-scrollbar {
          width: 6px;
        }
        .premium-modal::-webkit-scrollbar-thumb {
          background: rgba(15, 23, 42, 0.15);
          border-radius: 99px;
        }

        .modal-header-premium {
          background: linear-gradient(135deg, rgba(13, 132, 110, 0.9) 0%, rgba(4, 91, 74, 0.98) 100%);
          padding: 40px 24px 68px;
          color: white;
          text-align: center;
          position: relative;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          flex-shrink: 0;
        }
        
        .modal-header-premium::before {
          content: "";
          position: absolute;
          inset: 0;
          background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="30" r="40" fill="white" opacity="0.05"/><circle cx="80" cy="70" r="50" fill="white" opacity="0.05"/></svg>') center/cover;
          opacity: 0.6;
          pointer-events: none;
        }

        .close-btn-premium {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 20;
        }
        
        .close-btn-premium:hover {
          background: rgba(255, 255, 255, 0.35);
          transform: rotate(90deg) scale(1.08);
        }

        .modal-level-title {
          margin: 0;
          font-size: 30px;
          font-weight: 900;
          text-shadow: 0 2px 10px rgba(0,0,0,0.2);
          position: relative;
          z-index: 1;
        }

        .modal-level-badge {
          display: inline-block;
          background: rgba(255,255,255,0.22);
          padding: 4px 14px;
          border-radius: 20px;
          margin-top: 6px;
          backdrop-filter: blur(5px);
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          position: relative;
          z-index: 1;
        }

        .level-avatar-premium {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 5px solid white;
          box-shadow: 0 12px 30px rgba(0,0,0,0.2), 0 0 0 2px rgba(251, 191, 36, 0.5);
          position: absolute;
          bottom: -60px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: floatCenter 6s ease-in-out infinite, pulse-glow 3s infinite;
          z-index: 10;
        }

        .modal-body-premium {
          padding: 72px 28px 32px;
          text-align: center;
          background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(248, 250, 252, 0.8) 100%);
          flex: 1;
        }

        .xp-bar-wrapper {
          background: rgba(226, 232, 240, 0.7);
          height: 20px;
          border-radius: 99px;
          margin: 12px 0 14px;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.06);
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.9);
        }

        .xp-bar-fill-premium {
          height: 100%;
          background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);
          background-size: 200% 100%;
          border-radius: 99px;
          transition: width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
        }

        .xp-bar-fill-premium::after {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          animation: shine 2s infinite linear;
        }

        .xp-next-box {
          margin: 12px 0 0;
          color: var(--brand-mid, #0d846e);
          font-weight: 800;
          font-size: 16px;
          background: rgba(13, 132, 110, 0.06);
          border: 1px solid rgba(13, 132, 110, 0.12);
          padding: 10px 16px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          max-width: 100%;
          box-sizing: border-box;
        }

        .tips-section {
          margin-top: 30px;
          text-align: left;
        }

        .tips-title {
          margin: 0 0 12px;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 17px;
          font-weight: 900;
          padding-left: 4px;
        }

        .tips-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 14px;
        }

        .tip-card {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 4px 15px rgba(0,0,0,0.03);
          border-radius: 20px;
          padding: 18px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .tip-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(13, 132, 110, 0.1);
          border-color: rgba(13, 132, 110, 0.2);
        }

        .tip-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .tip-card:nth-child(1) .tip-icon-box { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706; }
        .tip-card:nth-child(2) .tip-icon-box { background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #059669; }
        .tip-card:nth-child(3) .tip-icon-box { background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #4f46e5; }
        
        .tip-text {
          color: #334155;
          font-weight: 700;
          font-size: 0.9rem;
          line-height: 1.35;
        }

        /* ── RESPONSIVE MOBILE (<= 640px) ── */
        @media (max-width: 640px) {
          .premium-modal {
            border-radius: 26px;
            max-height: 92vh;
          }

          .modal-header-premium {
            padding: 24px 16px 46px;
          }

          .close-btn-premium {
            top: 12px;
            right: 12px;
            width: 34px;
            height: 34px;
          }

          .modal-level-title {
            font-size: 21px;
          }

          .modal-level-badge {
            font-size: 11.5px;
            padding: 3px 10px;
          }

          .level-avatar-premium {
            width: 86px;
            height: 86px;
            bottom: -43px;
            border-width: 4px;
          }

          .modal-body-premium {
            padding: 52px 14px 20px;
          }

          .xp-bar-wrapper {
            height: 16px;
            margin: 8px 0 10px;
          }

          .xp-next-box {
            font-size: 13px;
            padding: 8px 12px;
            width: 100%;
            margin-top: 10px;
          }

          .tips-section {
            margin-top: 22px;
          }

          .tips-title {
            font-size: 15px;
            margin-bottom: 10px;
          }

          .tips-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 10px;
          }

          .tip-card {
            flex-direction: row;
            align-items: center;
            text-align: left;
            padding: 12px 14px;
            gap: 12px;
            border-radius: 16px;
          }

          .tip-icon-box {
            width: 42px;
            height: 42px;
            border-radius: 12px;
          }

          .tip-text {
            font-size: 13.5px;
            line-height: 1.35;
          }
        }
      `}</style>
      
      <div role="presentation" className="premium-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header-premium">
          <button className="close-btn-premium" onClick={onClose} aria-label="Fermer">
            <X size={20} strokeWidth={2.5} />
          </button>
          
          <h2 className="modal-level-title">
            {currentLevel.name}
          </h2>
          <div className="modal-level-badge">
            Niveau actuel
          </div>
          
          <div className="level-avatar-premium">
            <img 
              src={currentLevel.image} 
              alt={currentLevel.name} 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            />
          </div>
        </div>
        
        <div className="modal-body-premium">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 6px" }}>
            <div style={{ textAlign: "left" }}>
              <span style={{ color: "#0f172a", fontSize: "clamp(22px, 5vw, 26px)", fontWeight: 900 }}>{currentXp}</span>
              <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700, marginLeft: 4 }}>XP</span>
            </div>
            
            {!isMaxLevel && (
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "#64748b", fontSize: 15, fontWeight: 800 }}>{nextLevel?.min}</span>
                <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, marginLeft: 4 }}>XP</span>
              </div>
            )}
          </div>
          
          <div className="xp-bar-wrapper">
            <div className="xp-bar-fill-premium" style={{ width: `${progressPercentage}%` }} />
          </div>
          
          <div className="xp-next-box">
            {isMaxLevel ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Sparkles size={18} /> Tu as atteint le niveau maximum !</span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Target size={18} /> Encore {nextLevel!.min - currentXp} XP pour devenir {nextLevel!.name} !</span>
            )}
          </div>

          <div className="tips-section">
            <h4 className="tips-title">
              <Sparkles size={20} color="#f59e0b" fill="#fef3c7" /> Comment progresser ?
            </h4>
            
            <div className="tips-container">
              <div className="tip-card">
                <div className="tip-icon-box"><Star size={22} strokeWidth={2.5} /></div>
                <div className="tip-text">Termine tes leçons guidées dans "Mon aventure"</div>
              </div>
              <div className="tip-card">
                <div className="tip-icon-box"><TrendingUp size={22} strokeWidth={2.5} /></div>
                <div className="tip-text">Conserve ta flamme active en jouant tous les jours</div>
              </div>
              <div className="tip-card">
                <div className="tip-icon-box"><Sparkles size={22} strokeWidth={2.5} /></div>
                <div className="tip-text">Remporte les mini-jeux et quiz avec un score parfait</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
