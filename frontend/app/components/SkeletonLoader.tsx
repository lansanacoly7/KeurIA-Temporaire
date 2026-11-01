/**
 * ═══════════════════════════════════════════════════════════════
 * KeurIA — Skeleton Loader ludique
 * ═══════════════════════════════════════════════════════════════
 *
 * Squelettes de chargement adaptés au thème actif.
 * Pas de spinner générique — des formes ondulantes avec gradient.
 */
"use client";

interface SkeletonProps {
  variant?: "card" | "text" | "avatar" | "badge" | "progress" | "row" | "leaderboard";
  count?: number;
  className?: string;
}

const baseStyle = {
  borderRadius: "var(--kia-radius, 16px)",
  background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
  backgroundSize: "200% 100%",
  animation: "kia-shimmer 1.5s ease-in-out infinite",
};

function SkeletonCard() {
  return (
    <div style={{ ...baseStyle, width: "100%", minHeight: 200, borderRadius: "var(--kia-radius-lg, 22px)" }} />
  );
}

function SkeletonText({ width = "100%" }: { width?: string }) {
  return (
    <div style={{ ...baseStyle, width, height: 16, borderRadius: 8, marginBottom: 8 }} />
  );
}

function SkeletonAvatar() {
  return (
    <div style={{ ...baseStyle, width: 48, height: 48, borderRadius: "50%", flexShrink: 0 }} />
  );
}

function SkeletonBadge() {
  return (
    <div style={{ ...baseStyle, width: 80, height: 80, borderRadius: "var(--kia-radius, 16px)" }} />
  );
}

function SkeletonProgress() {
  return (
    <div style={{ ...baseStyle, width: "100%", height: 10, borderRadius: 8 }} />
  );
}

function SkeletonRow() {
  return (
    <div style={{ ...baseStyle, width: "100%", height: 68, borderRadius: 20, display: "flex", alignItems: "center", padding: "0 20px", gap: 16 }}>
      <div style={{ width: 36, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.6)" }} />
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.7)" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ width: "35%", height: 16, borderRadius: 6, background: "rgba(255,255,255,0.7)" }} />
        <div style={{ width: "20%", height: 12, borderRadius: 6, background: "rgba(255,255,255,0.5)" }} />
      </div>
      <div style={{ width: 90, height: 28, borderRadius: 99, background: "rgba(255,255,255,0.7)" }} />
      <div style={{ width: 70, height: 28, borderRadius: 99, background: "rgba(255,255,255,0.8)" }} />
    </div>
  );
}

function SkeletonLeaderboard() {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Podium Skeleton */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 16, height: 240, margin: "20px 0" }}>
        <div style={{ ...baseStyle, width: 140, height: 170, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
        <div style={{ ...baseStyle, width: 160, height: 220, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
        <div style={{ ...baseStyle, width: 140, height: 150, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
      </div>
      {/* Rows Skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}

export default function SkeletonLoader({ variant = "card", count = 1, className = "" }: SkeletonProps) {
  if (variant === "leaderboard") {
    return (
      <div className={`skeleton-container ${className}`} style={{ width: "100%" }}>
        <style>{`@keyframes kia-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
        <SkeletonLeaderboard />
      </div>
    );
  }

  const items = Array.from({ length: count });
  const Component = variant === "card" ? SkeletonCard
    : variant === "text" ? SkeletonText
    : variant === "avatar" ? SkeletonAvatar
    : variant === "badge" ? SkeletonBadge
    : variant === "row" ? SkeletonRow
    : SkeletonProgress;

  return (
    <div className={`skeleton-container ${className}`} style={{ display: "flex", gap: 12, flexWrap: "wrap", width: "100%" }}>
      <style>{`@keyframes kia-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
      {items.map((_, i) => <Component key={i} />)}
    </div>
  );
}

/** Squelette plein écran affiché pendant l'ouverture d'une leçon : reprend l'ossature du lecteur (en-tête, carte, choix). */
export function LessonSkeleton() {
  const bar = (style: React.CSSProperties) => <div style={{ ...baseStyle, ...style }} />;
  return (
    <div role="status" aria-label="Chargement de la leçon" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#fffdf7", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px clamp(16px, 4vw, 40px)" }}>
        {bar({ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 })}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>{bar({ width: "100%", maxWidth: 500, height: 15, borderRadius: 999 })}</div>
        {bar({ width: 90, height: 40, borderRadius: 999, flexShrink: 0 })}
      </div>
      <div style={{ width: "100%", maxWidth: 760, margin: "0 auto", padding: "16px clamp(16px, 4vw, 24px) 40px", display: "flex", flexDirection: "column", gap: 22 }}>
        {bar({ width: "40%", height: 24, borderRadius: 8 })}
        {bar({ width: "100%", height: 220, borderRadius: 24 })}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {[0, 1, 2, 3].map((i) => <div key={i}>{bar({ width: "100%", height: 64, borderRadius: 18 })}</div>)}
        </div>
      </div>
    </div>
  );
}
