"use client";

import ChildAvatar from "../components/ChildAvatar";

export type PodiumEntry = {
  /** Place dans la liste (1, 2, 3…) ; les ex æquo partagent le même rang mais pas la même position. */
  position: number;
  rank: number;
  displayName: string;
  initials: string;
  xpEarned: number;
  isMe: boolean;
  /** Avatar choisi par l'élève ; sans lui, on retombe sur les initiales. */
  avatar?: string | null;
};

type Metal = "gold" | "silver" | "bronze";

const METAL_OF = (rank: number): Metal => (rank <= 1 ? "gold" : rank === 2 ? "silver" : "bronze");
const HEIGHT_OF: Record<number, number> = { 1: 168, 2: 132, 3: 104 };
const WORD_OF = (rank: number) => (rank === 1 ? "1re place" : `${rank}e place`);

export const PODIUM_STYLES = `
.pdm { position: relative; margin: 6px 0 22px; padding: 6px 4px 0; color: #0f172a; isolation: isolate; }
.pdm::before { content: ""; position: absolute; left: 50%; top: 4%; width: min(560px, 100%); height: 78%; transform: translateX(-50%); z-index: -1; pointer-events: none;
  background: radial-gradient(closest-side, rgba(246, 196, 67, .26), rgba(246, 196, 67, 0)); }
.pdm-title { text-align: center; font-size: 12px; font-weight: 800; letter-spacing: .28em; text-transform: uppercase; color: #b7791f; margin-bottom: 12px; }
.pdm-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(8px, 2.6vw, 24px); align-items: end; max-width: 640px; margin: 0 auto; }
.pdm-col { display: flex; flex-direction: column; align-items: center; min-width: 0; animation: pdm-rise .8s cubic-bezier(.2, .8, .2, 1) both; }
.pdm-col.p1 { animation-delay: .38s; } .pdm-col.p2 { animation-delay: .2s; } .pdm-col.p3 { animation-delay: .05s; }
.pdm-hero { position: relative; display: flex; flex-direction: column; align-items: center; width: 100%; padding-bottom: 12px; }
.pdm-crown { position: relative; width: clamp(48px, 9.5vw, 68px); margin-bottom: -10px; z-index: 2; filter: drop-shadow(0 6px 8px rgba(214, 150, 0, .5)); animation: pdm-float 3.4s ease-in-out infinite; }
.pdm-crown svg { display: block; width: 100%; height: auto; }
.pdm-spark { position: absolute; color: #f6b800; animation: pdm-twinkle 2.4s ease-in-out infinite; }
.pdm-spark.s1 { left: -14px; top: 4px; width: 12px; } .pdm-spark.s2 { right: -16px; top: -2px; width: 16px; animation-delay: .8s; } .pdm-spark.s3 { right: -6px; top: 26px; width: 9px; animation-delay: 1.5s; }
.pdm-ring { --ring: conic-gradient(from 210deg, #fff3b0, #f6b800, #a86a00, #ffe58a, #fff3b0); position: relative; display: grid; place-items: center; border-radius: 50%; padding: 4px; background: var(--ring);
  width: clamp(58px, 12vw, 76px); height: clamp(58px, 12vw, 76px); box-shadow: 0 10px 20px rgba(15, 23, 42, .22), 0 0 0 1px rgba(255, 255, 255, .5) inset; }
.p1 .pdm-ring { width: clamp(76px, 15vw, 100px); height: clamp(76px, 15vw, 100px); padding: 5px; box-shadow: 0 0 0 6px rgba(246, 184, 0, .2), 0 0 30px rgba(246, 184, 0, .5), 0 14px 24px rgba(15, 23, 42, .26); }
.pdm-col.silver .pdm-ring { --ring: conic-gradient(from 210deg, #ffffff, #b9c4d0, #6b7a8a, #e8eef4, #ffffff); }
.pdm-col.bronze .pdm-ring { --ring: conic-gradient(from 210deg, #ffe0c2, #e08a45, #8a4313, #f6b27a, #ffe0c2); }
.pdm-face svg { width: 100% !important; height: 100% !important; }
.pdm-hit { all: unset; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; width: 100%; cursor: pointer; border-radius: 20px; -webkit-tap-highlight-color: transparent; }
.pdm-hit:hover .pdm-ring { transform: scale(1.05); }
.pdm-hit:focus-visible { outline: 4px solid #0d846e; outline-offset: 4px; }
.pdm-ring { transition: transform .15s ease; }
.pdm-face { width: 100%; height: 100%; border-radius: 50%; display: grid; place-items: center; font-weight: 900; font-size: clamp(18px, 4vw, 26px); letter-spacing: .02em; color: #fff;
  background: radial-gradient(circle at 30% 25%, #1fa38a 0%, #0d6a58 60%, #07463a 100%); text-shadow: 0 2px 4px rgba(0, 0, 0, .35); }
.p1 .pdm-face { font-size: clamp(24px, 5vw, 34px); }
.pdm-col.me .pdm-face { background: radial-gradient(circle at 30% 25%, #e3f56a 0%, #a5c92b 60%, #6e8f16 100%); color: #153b3b; text-shadow: none; }
.pdm-col.me .pdm-ring { box-shadow: 0 0 0 5px rgba(13, 132, 110, .35), 0 0 26px rgba(13, 132, 110, .55), 0 10px 20px rgba(15, 23, 42, .22); }
.pdm-badge { position: absolute; bottom: 4px; left: 50%; transform: translate(-50%, 55%); min-width: 26px; height: 26px; padding: 0 7px; border-radius: 99px; display: grid; place-items: center; font-size: 13px; font-weight: 900; color: #3b2a00;
  background: linear-gradient(180deg, #fff3b0, #f6b800); border: 2px solid #fff; box-shadow: 0 4px 8px rgba(15, 23, 42, .28); }
.pdm-col.silver .pdm-badge { color: #25303b; background: linear-gradient(180deg, #ffffff, #b9c4d0); }
.pdm-col.bronze .pdm-badge { color: #3d1c05; background: linear-gradient(180deg, #ffd9b8, #d9843f); }
.pdm-name { margin-top: 18px; max-width: 100%; font-weight: 900; font-size: clamp(14px, 2.6vw, 17px); color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pdm-me-tag { margin-top: 4px; font-size: 11px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; color: #fff; background: #0d846e; border-radius: 99px; padding: 3px 11px; box-shadow: 0 4px 10px rgba(13, 132, 110, .4); }
.pdm-xp { margin-top: 8px; display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 99px; font-weight: 900; font-size: clamp(12px, 2.4vw, 14px); white-space: nowrap;
  background: #fff; border: 1px solid #fde7a3; color: #92400e; box-shadow: 0 4px 10px rgba(180, 120, 20, .14); }
.pdm-block { position: relative; width: 100%; margin-top: 14px; border-radius: 16px 16px 0 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 14px; overflow: hidden;
  background: linear-gradient(180deg, #ffeeb0 0%, #f6c443 34%, #d29110 74%, #a96d05 100%); color: #5a3a00;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, .75), inset 2px 0 0 rgba(255, 255, 255, .25), inset -2px 0 0 rgba(0, 0, 0, .12), 0 14px 26px -10px rgba(168, 106, 0, .55); }
.pdm-col.silver .pdm-block { background: linear-gradient(180deg, #ffffff 0%, #d8e0e9 36%, #9aa8b8 76%, #6f7e8f 100%); color: #2c3744; box-shadow: inset 0 2px 0 rgba(255, 255, 255, .85), inset -2px 0 0 rgba(0, 0, 0, .12), 0 14px 26px -10px rgba(71, 85, 105, .5); }
.pdm-col.bronze .pdm-block { background: linear-gradient(180deg, #ffe2c6 0%, #eba56b 36%, #bd6a28 76%, #8a4617 100%); color: #4a2306; box-shadow: inset 0 2px 0 rgba(255, 255, 255, .7), inset -2px 0 0 rgba(0, 0, 0, .14), 0 14px 26px -10px rgba(138, 70, 23, .5); }
.pdm-block::after { content: ""; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, .55) 48%, transparent 66%); transform: translateX(-120%); animation: pdm-shine 5.5s ease-in-out 1.4s infinite; pointer-events: none; }
.pdm-col.silver .pdm-block::after { animation-delay: 2.6s; } .pdm-col.bronze .pdm-block::after { animation-delay: 3.8s; }
.pdm-rank { font-size: clamp(34px, 7vw, 54px); font-weight: 900; line-height: 1; letter-spacing: -.03em; text-shadow: 0 1px 0 rgba(255, 255, 255, .55), 0 -1px 0 rgba(0, 0, 0, .18); }
.pdm-rank .pdm-ord { font-size: .4em; font-weight: 800; vertical-align: .95em; margin-left: 2px; letter-spacing: 0; }
.pdm-floor { height: 6px; margin: 0 auto; max-width: 660px; border-radius: 0 0 8px 8px; background: linear-gradient(180deg, #cbd5e1, #e2e8f0); }
.pdm-empty { opacity: 0; }
@keyframes pdm-rise { from { opacity: 0; transform: translateY(46px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes pdm-float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-5px) rotate(2deg); } }
@keyframes pdm-twinkle { 0%, 100% { opacity: .15; transform: scale(.6) rotate(0); } 50% { opacity: 1; transform: scale(1) rotate(25deg); } }
@keyframes pdm-shine { 0% { transform: translateX(-120%); } 38%, 100% { transform: translateX(120%); } }
@media (prefers-reduced-motion: reduce) { .pdm-col, .pdm-crown, .pdm-spark, .pdm-block::after { animation: none !important; } .pdm-spark { opacity: .8; } }
`;

function Crown() {
  return (
    <svg viewBox="0 0 64 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pdm-crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" /><stop offset=".45" stopColor="#f6b800" /><stop offset="1" stopColor="#b87500" />
        </linearGradient>
      </defs>
      <path d="M5 40 1.5 11 18 24 32 3l14 21 16.500-13L59 40z" fill="url(#pdm-crown)" stroke="#8a5a00" strokeWidth="2" strokeLinejoin="round" />
      <rect x="5" y="39" width="54" height="7" rx="3.500" fill="url(#pdm-crown)" stroke="#8a5a00" strokeWidth="2" />
      <circle cx="32" cy="3.500" r="3" fill="#fff8d6" stroke="#8a5a00" strokeWidth="1.500" /><circle cx="1.500" cy="11" r="2.500" fill="#fff8d6" stroke="#8a5a00" strokeWidth="1.500" /><circle cx="62.500" cy="11" r="2.500" fill="#fff8d6" stroke="#8a5a00" strokeWidth="1.500" />
      <circle cx="32" cy="32" r="3.500" fill="#e0245e" stroke="#7a0f33" strokeWidth="1.200" /><circle cx="18" cy="35" r="2.200" fill="#3ec1ff" /><circle cx="46" cy="35" r="2.200" fill="#3ec1ff" />
    </svg>
  );
}

function Spark({ className }: { className: string }) {
  return (
    <svg className={`pdm-spark ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1l2.600 8.400L23 12l-8.400 2.600L12 23l-2.600-8.400L1 12l8.400-2.600L12 1z" fill="currentColor" /></svg>
  );
}

function Star() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.500l2.900 6.100 6.600.8-4.900 4.600 1.300 6.600L12 17.300l-5.900 3.300 1.300-6.600L2.500 9.400l6.600-.8L12 2.500z" fill="#f6b800" stroke="#fff3b0" strokeWidth="1.200" strokeLinejoin="round" /></svg>
  );
}

/**
 * Podium des trois premières places : estrade sombre, anneaux et marches métalliques (or, argent, bronze), couronne pour la première.
 * L'ordre visuel est 2 - 1 - 3 ; la couleur suit le RANG (deux ex æquo premiers sont tous deux en or), la hauteur suit la place.
 */
export function LeaderboardPodium<T extends PodiumEntry>({ podium, onSelect }: { podium: T[]; onSelect?: (entry: T) => void }) {
  const slots: (T | undefined)[] = [podium[1], podium[0], podium[2]];
  return (
    <section className="pdm" aria-label="Podium">
      <style>{PODIUM_STYLES}</style>
      <div className="pdm-title">Le podium</div>
      <div className="pdm-row" role="list">
        {slots.map((entry, i) => {
          const place = ([2, 1, 3] as const)[i];
          if (!entry) return <div key={`empty-${place}`} className="pdm-col pdm-empty" aria-hidden="true" />;
          const metal = METAL_OF(entry.rank);
          return (
            <div key={entry.position} role="listitem" className={`pdm-col p${place} ${metal}${entry.isMe ? " me" : ""}`} aria-label={`${WORD_OF(entry.rank)} : ${entry.displayName}, ${entry.xpEarned} XP${entry.isMe ? " (c'est toi)" : ""}`}>
              <div className="pdm-hero">
                {place === 1 && (
                  <div className="pdm-crown" aria-hidden="true"><Crown /><Spark className="s1" /><Spark className="s2" /><Spark className="s3" /></div>
                )}
                <button type="button" className="pdm-hit" onClick={() => onSelect?.(entry)} aria-label={`Voir la progression de ${entry.displayName}`}>
                <div className="pdm-ring">
                  <div className="pdm-face" aria-hidden="true">{entry.avatar ? <ChildAvatar id={entry.avatar} size={100} title="" /> : entry.initials}</div>
                  {entry.rank > 1 && <span className="pdm-badge" aria-hidden="true">{entry.rank}</span>}
                </div>
                <div className="pdm-name">{entry.displayName}</div>
                {entry.isMe && <span className="pdm-me-tag">C’est toi !</span>}
                <div className="pdm-xp"><Star />{entry.xpEarned} XP</div>
                </button>
              </div>
              <div className="pdm-block" style={{ height: HEIGHT_OF[entry.position] ?? HEIGHT_OF[3] }} aria-hidden="true">
                <div className="pdm-rank">{entry.rank}<span className="pdm-ord">{entry.rank === 1 ? "er" : "e"}</span></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="pdm-floor" aria-hidden="true" />
    </section>
  );
}
