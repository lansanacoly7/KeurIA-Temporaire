"use client";

import { useEffect, useRef } from "react";
import { TierIcon } from "../components/TierIcon";
import { createPortal } from "react-dom";
import { Star, X } from "lucide-react";
import ChildAvatar from "../components/ChildAvatar";

export type BadgeInfo = { id: string; label: string; emoji: string; tier: string; color: string; bg: string; border: string };
export type LevelInfo = { level: number; name: string; nextName: string | null; xpToNext: number; xpInLevel: number; xpPerLevel: number; isMax: boolean };

/** Ce que l'aperçu montre d'un élève du classement : rien de plus que ce que la liste affiche déjà, plus son niveau et son XP. */
export type ProfileEntry = {
  rank: number;
  displayName: string;
  xpEarned: number;
  badge: BadgeInfo | null;
  isMe: boolean;
  avatar?: string | null;
  totalXp?: number;
  level?: LevelInfo;
};

const STYLES = `
.lbp-back { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 16px; background: rgba(15, 23, 42, .55); backdrop-filter: blur(3px); animation: lbp-fade .18s ease-out; }
.lbp { position: relative; width: min(440px, 100%); max-height: calc(100dvh - 32px); overflow-y: auto; border-radius: 30px; padding: 26px 22px 24px; text-align: center; color: #0f172a;
  background: radial-gradient(120% 90% at 50% 0%, #fff7d6 0%, #ffffff 58%); border: 3px solid #fde047; box-shadow: 0 24px 60px rgba(15, 23, 42, .4); animation: lbp-pop .22s ease-out; }
.lbp.me { border-color: #0d846e; background: radial-gradient(120% 90% at 50% 0%, #e6fbd0 0%, #ffffff 58%); }
.lbp-close { position: absolute; top: 12px; right: 12px; width: 44px; height: 44px; border-radius: 50%; border: 0; display: grid; place-items: center; background: #f1f5f9; color: #475569; cursor: pointer; }
.lbp-close:hover { background: #e2e8f0; }
.lbp-close:focus-visible, .lbp-ok:focus-visible { outline: 4px solid #f59e0b; outline-offset: 2px; }
.lbp-avatar { width: 128px; height: 128px; margin: 4px auto 10px; border-radius: 50%; padding: 5px; background: conic-gradient(from 210deg, #fff3b0, #f6b800, #a86a00, #ffe58a, #fff3b0); box-shadow: 0 10px 24px rgba(168, 106, 0, .35); }
.lbp.me .lbp-avatar { background: conic-gradient(from 210deg, #e3f56a, #0d846e, #07463a, #a5c92b, #e3f56a); box-shadow: 0 10px 24px rgba(13, 132, 110, .4); }
.lbp-avatar svg { width: 100% !important; height: 100% !important; }
.lbp-name { margin: 0; font-size: 26px; font-weight: 900; line-height: 1.15; }
.lbp-me-tag { display: inline-block; margin-top: 6px; padding: 3px 12px; border-radius: 99px; background: #0d846e; color: #fff; font-size: 12px; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; }
.lbp-title { display: inline-flex; align-items: center; gap: 8px; margin-top: 12px; padding: 8px 18px; border-radius: 99px; border: 2px solid; font-size: 18px; font-weight: 900; }
.lbp-title small { display: block; }
.lbp-label { display: block; margin-top: 12px; font-size: 12px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; color: #94a3b8; }
.lbp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
.lbp-tile { padding: 12px 8px 12px; border-radius: 20px; background: #fff; border: 2px solid #f1f5f9; box-shadow: 0 3px 0 #f1f5f9; }
.lbp-tile b { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 28px; font-weight: 900; line-height: 1.1; color: #0f172a; }
.lbp-tile span { display: block; margin-top: 4px; font-size: 14px; font-weight: 800; color: #64748b; line-height: 1.25; }
.lbp-level { margin-top: 14px; padding: 14px 16px; border-radius: 20px; background: #f0fdfa; border: 2px solid #99f6e4; text-align: left; }
.lbp-level strong { display: block; font-size: 17px; font-weight: 900; color: #0f766e; }
.lbp-bar { height: 12px; margin: 10px 0 8px; border-radius: 99px; background: #ccfbf1; overflow: hidden; }
.lbp-bar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #14b8a6, #d9ef59); }
.lbp-level span { font-size: 15px; font-weight: 800; color: #0f766e; }
.lbp-ok { margin-top: 18px; width: 100%; min-height: 52px; border: 0; border-radius: 18px; background: #0d846e; color: #fff; font-size: 18px; font-weight: 900; cursor: pointer; box-shadow: 0 5px 0 #075f4f; }
.lbp-ok:active { transform: translateY(2px); box-shadow: 0 3px 0 #075f4f; }
@keyframes lbp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes lbp-pop { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .lbp-back, .lbp { animation: none; } }
@media (max-width: 420px) { .lbp { padding: 22px 14px 18px; border-radius: 26px; } .lbp-avatar { width: 108px; height: 108px; } .lbp-name { font-size: 23px; } .lbp-tile b { font-size: 24px; } }
`;

const ordinal = (n: number) => (n === 1 ? "1er" : `${n}e`);

/** Aperçu de la progression d'un élève : avatar, titre du classement, place, niveau et XP. Se ferme avec Échap, un clic à côté ou le bouton. */
export function LeaderboardProfileModal({ entry, total, periodLabel, onClose }: { entry: ProfileEntry; total: number; periodLabel: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [onClose]);

  const level = entry.level;
  const levelPercent = level ? (level.isMax ? 100 : Math.round((level.xpInLevel / Math.max(1, level.xpPerLevel)) * 100)) : 0;

  return createPortal(
    <div className="lbp-back" onClick={onClose}>
      <style>{STYLES}</style>
      <div className={`lbp${entry.isMe ? " me" : ""}`} role="dialog" aria-modal="true" aria-labelledby="lbp-name" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className="lbp-close" onClick={onClose} aria-label="Fermer"><X size={22} /></button>

        <div className="lbp-avatar"><ChildAvatar id={entry.avatar} size={128} title={`Avatar de ${entry.displayName}`} /></div>
        <h2 className="lbp-name" id="lbp-name">{entry.displayName}</h2>
        {entry.isMe && <span className="lbp-me-tag">C&apos;est toi !</span>}

        {entry.badge && (
          <>
            <span className="lbp-label">{entry.isMe ? "Ton titre" : "Son titre"}</span>
            <div className="lbp-title" style={{ background: entry.badge.bg, borderColor: entry.badge.border, color: entry.badge.color }}>
              <TierIcon tier={entry.badge.tier} /> {entry.badge.label}
            </div>
          </>
        )}

        <div className="lbp-grid">
          <div className="lbp-tile"><b>#{entry.rank}</b><span>{entry.rank === 1 ? "1re place" : `${ordinal(entry.rank)} sur ${total}`}</span></div>
          {level && <div className="lbp-tile"><b>{level.level}</b><span>Niveau<br />{level.name}</span></div>}
          <div className="lbp-tile"><b><Star size={22} color="#f59e0b" fill="#f59e0b" />{entry.xpEarned}</b><span>XP · {periodLabel}</span></div>
          {entry.totalXp !== undefined && <div className="lbp-tile"><b><Star size={22} color="#f59e0b" fill="#f59e0b" />{entry.totalXp}</b><span>XP en tout</span></div>}
        </div>

        {level && (
          <div className="lbp-level">
            <strong>{level.isMax ? "Niveau maximum, bravo !" : `Vers : ${level.nextName}`}</strong>
            <div className="lbp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={levelPercent} aria-label="Progression vers le niveau suivant"><i style={{ width: `${Math.max(levelPercent, 4)}%` }} /></div>
            <span>{level.isMax ? "Tous les niveaux sont débloqués." : `Encore ${level.xpToNext} XP pour le prochain niveau`}</span>
          </div>
        )}

        <button type="button" className="lbp-ok" onClick={onClose}>Fermer</button>
      </div>
    </div>,
    document.body,
  );
}
