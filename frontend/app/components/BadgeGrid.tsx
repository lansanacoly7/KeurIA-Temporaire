/**
 * ═══════════════════════════════════════════════════════════════
 * KeurIA — Grille de Badges (Collection)
 * ═══════════════════════════════════════════════════════════════
 *
 * Affiche les badges sous forme de grille de collection.
 * Chaque badge peut être :
 *   - earned (débloqué) : coloré, avec effet "shine" au survol
 *   - locked (verrouillé) : grisé, opacité réduite
 *
 * Compatible avec le système de téléchargement de badges existant.
 */
"use client";

import { Award } from "lucide-react";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "../design/motion-variants";

export interface Badge {
  id: string;
  /** Ancien pictogramme : plus affiché (l'interface n'utilise aucun emoji). */
  label: string;
  description: string;
  earned: boolean;
  image?: string;
}

interface BadgeGridProps {
  badges: Badge[];
  onBadgeClick?: (badge: Badge) => void;
  className?: string;
}

export default function BadgeGrid({ badges, onBadgeClick, className = "" }: BadgeGridProps) {
  return (
    <motion.div
      className={`badge-grid-v2 ${className}`}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "var(--kia-space-lg, 24px)",
      }}
    >
      {badges.map((badge) => (
        <div key={badge.id} style={{ minHeight: "260px" }}>
          <motion.button
            variants={staggerItem}
            onClick={() => badge.earned && onBadgeClick?.(badge)}
            disabled={!badge.earned}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              cursor: badge.earned ? "pointer" : "not-allowed",
              filter: badge.earned ? "none" : "grayscale(1) opacity(0.5)",
              background: badge.earned ? "#fff" : "#f5f5f5",
              border: badge.earned ? "3px solid var(--brand, #153b3b)" : "2px solid #ccc",
              borderRadius: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              boxShadow: badge.earned ? "0 8px 0 var(--brand, #153b3b)" : "0 4px 0 #ccc",
              padding: "24px 15px",
              overflow: "hidden",
              textAlign: "center"
            }}
            whileHover={badge.earned ? { scale: 1.05, y: -5, boxShadow: "0 12px 20px rgba(0,0,0,0.15)" } : {}}
            whileTap={badge.earned ? { scale: 0.95 } : {}}
          >
            {badge.earned && (
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: "-75%",
                  width: "50%",
                  height: "100%",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
                  transform: "skewX(-25deg)",
                  pointerEvents: "none",
                }}
                className="badge-shine"
              />
            )}
            <div style={{
              background: badge.earned ? "rgba(216, 240, 91, 0.2)" : "rgba(0,0,0,0.05)",
              width: "110px",
              height: "110px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              boxShadow: badge.earned ? "inset 0 6px 12px rgba(216, 240, 91, 0.4), 0 4px 8px rgba(0,0,0,0.1)" : "inset 0 4px 8px rgba(0,0,0,0.05)",
              overflow: "hidden"
            }}>
              {badge.image ? (
                <img 
                  src={badge.image} 
                  style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.1)" }} 
                  alt={badge.label} 
                />
              ) : (
                <Award size={54} color="var(--brand, #153b3b)" strokeWidth={1.6} aria-hidden="true" />
              )}
            </div>
            <b style={{ fontSize: "16px", color: "var(--brand, #153b3b)", lineHeight: 1.2, marginBottom: "8px", fontFamily: "'Fredoka One', 'Fredoka', cursive" }}>
              {badge.label}
            </b>
            <small style={{ fontSize: "13px", color: "#6a7d76", lineHeight: 1.3, fontWeight: 500 }}>
              {badge.description}
            </small>
          </motion.button>
        </div>
      ))}

      <style>{`
        .badge-grid-v2 button:hover .badge-shine {
          animation: kia-shine 0.6s ease forwards;
        }
      `}</style>
    </motion.div>
  );
}
