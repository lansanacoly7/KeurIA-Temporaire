"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TierIcon } from "../components/TierIcon";
import { AlertCircle, Crown, Search, Sparkles, Star, Target, Trophy, Zap } from "lucide-react";
import SkeletonLoader from "../components/SkeletonLoader";
import ChildAvatar from "../components/ChildAvatar";
import { LeaderboardPodium } from "./LeaderboardPodium";
import { LeaderboardProfileModal, type BadgeInfo, type LevelInfo, type ProfileEntry } from "./LeaderboardProfileModal";

type LeaderboardEntry = {
  /** Place dans la liste (1, 2, 3…) ; les ex æquo partagent le même rang mais pas la même position. */
  position: number;
  rank: number;
  displayName: string;
  initials: string;
  xpEarned: number;
  badge: BadgeInfo;
  isMe: boolean;
  /** Avatar choisi par l'élève, niveau et XP totale : montrés dans la fenêtre d'aperçu. */
  avatar: string | null;
  totalXp: number;
  level: LevelInfo;
};

type CurrentUserData = { rank: number; xpEarned: number; badge: BadgeInfo | null; xpToNextRank: number; avatar: string | null; totalXp: number; level: LevelInfo };

type View = "near" | "general";
type Period = "weekly" | "monthly" | "all_time";

type LeaderboardData = {
  /** "school" : élèves de mon établissement uniquement ; "global" : élèves sans école de mon parcours d'âge. */
  scope: "school" | "global";
  scopeLabel: string;
  view: View;
  nearAvailable: boolean;
  period: Period;
  periodLabel: string;
  totalParticipants: number;
  totalXpPeriod: number;
  /** Les 3 premières places, toujours renvoyées quelle que soit la vue. */
  podium: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
  currentUser: CurrentUserData | null;
};

const PERIODS: { id: Period; label: string }[] = [
  { id: "weekly", label: "7 jours" },
  { id: "monthly", label: "30 jours" },
  { id: "all_time", label: "Depuis le début" },
];

const STYLES = `
.lb { max-width: 880px; margin: 0 auto; padding: 8px 0 48px; color: #0f172a; }
.lb-controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin: 14px 0 16px; }
.lb-seg { display: inline-flex; padding: 4px; gap: 4px; background: #f1f5f9; border-radius: 999px; }
.lb-seg button { border: 0; background: transparent; padding: 9px 16px; border-radius: 999px; font-weight: 800; font-size: 14px; color: #64748b; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background .2s, color .2s; }
.lb-seg button[aria-pressed="true"] { background: #fff; color: #0d846e; box-shadow: 0 2px 10px rgba(15,23,42,.1); }
.lb-seg button:disabled { opacity: .45; cursor: not-allowed; }
.lb-seg.views button[aria-pressed="true"] { background: #0d846e; color: #fff; }
.lb-search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; padding: 8px 14px; flex: 1 1 200px; max-width: 320px; }
.lb-search input { border: 0; outline: 0; background: transparent; font-weight: 600; width: 100%; font-size: 14px; }
.lb-avatar { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; font-weight: 900; font-size: 18px; background: #fff; border: 3px solid #e2e8f0; margin-bottom: 6px; }
.lb-avatar.me { background: #0d846e; color: #fff; border-color: #0d846e; }
.lb-list { display: flex; flex-direction: column; gap: 8px; }
.lb-row { display: flex; align-items: center; gap: 12px; width: 100%; background: #fff; border: 2px solid #f1f5f9; border-radius: 18px; padding: 10px 14px; font: inherit; color: inherit; text-align: left; cursor: pointer; transition: transform .15s ease, border-color .15s ease; }
.lb-row:hover { transform: translateY(-2px); border-color: #99f6e4; }
.lb-row:focus-visible { outline: 4px solid #0d846e; outline-offset: 2px; }
.lb-av { display: block; flex-shrink: 0; width: 46px; height: 46px; border-radius: 50%; padding: 2px; background: #e2e8f0; }
.lb-row.me .lb-av { background: #0d846e; }
.lb-av svg { width: 100% !important; height: 100% !important; }
.lb-row.me { position: relative; z-index: 1; margin: 6px 0; padding: 14px 16px 14px 20px; background: linear-gradient(90deg, #ecfccb 0%, #f0fdfa 70%); border: 3px solid #0d846e; border-radius: 22px; box-shadow: 0 0 0 5px rgba(13, 132, 110, .14), 0 16px 30px -14px rgba(13, 132, 110, .7); }
.lb-row.me::before { content: ""; position: absolute; left: 0; top: 14px; bottom: 14px; width: 6px; border-radius: 0 6px 6px 0; background: #0d846e; }
.lb-row.me .lb-rank { color: #0d846e; font-size: 20px; }
.lb-row.me .lb-name { font-size: 17px; font-weight: 900; }
.lb-row.me .lb-xp { font-size: 17px; }
.lb-mine { position: relative; isolation: isolate; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 6px 18px; align-items: center; margin: 0 0 8px; padding: 16px 20px; border-radius: 24px; overflow: hidden; color: #fff;
  background: radial-gradient(120% 150% at 100% 0%, rgba(217, 239, 89, .24) 0%, rgba(217, 239, 89, 0) 48%), linear-gradient(135deg, #174e49 0%, #103f3b 100%);
  box-shadow: 0 7px 0 #dce9ae, 0 20px 30px -14px rgba(16, 63, 59, .6); }
.lb-mine::before { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; background: radial-gradient(circle at 10% 130%, rgba(255, 255, 255, .11) 0 36%, transparent 37%), radial-gradient(circle at 96% 140%, rgba(255, 255, 255, .07) 0 28%, transparent 29%); }
.lb-mine-medal { position: relative; display: grid; place-items: center; width: 74px; height: 74px; border-radius: 50%; color: #153f3b; font-weight: 900; font-size: 32px; line-height: 1; letter-spacing: -.05em;
  background: linear-gradient(180deg, #eefb92 0%, #d9ef59 52%, #b9d22f 100%); box-shadow: 0 0 0 5px rgba(217, 239, 89, .2), 0 5px 0 #8ba51f, inset 0 2px 0 rgba(255, 255, 255, .75); }
.lb-mine-medal i { position: absolute; left: 50%; top: 13px; transform: translateX(-50%); font-style: normal; font-size: 12px; font-weight: 900; letter-spacing: 0; opacity: .6; }
.lb-mine-medal b { margin-top: 8px; }
.lb-mine.gold .lb-mine-medal { color: #4d3200; background: linear-gradient(180deg, #fff6c2 0%, #f6c443 50%, #cf9412 100%); box-shadow: 0 0 0 5px rgba(246, 196, 67, .25), 0 5px 0 #9a6a05, inset 0 2px 0 rgba(255, 255, 255, .8); }
.lb-mine-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.lb-mine-kicker { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; color: #d9ef59; }
.lb-mine.gold .lb-mine-kicker { color: #ffd966; }
.lb-mine-main > b { font-size: clamp(18px, 2.8vw, 22px); line-height: 1.15; font-weight: 900; color: #fff; letter-spacing: -.01em; }
.lb-mine-main > span:not(.lb-mine-kicker) { font-size: 13px; font-weight: 700; color: #b9e6d6; }
.lb-mine-bar { height: 8px; margin: 6px 0 2px; border-radius: 99px; background: rgba(255, 255, 255, .16); overflow: hidden; max-width: 360px; }
.lb-mine-bar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #8fd16a, #d9ef59); box-shadow: 0 0 12px rgba(217, 239, 89, .6); }
.lb-mine.gold .lb-mine-bar i { background: linear-gradient(90deg, #f6b800, #ffe28a); box-shadow: 0 0 12px rgba(246, 196, 67, .6); }
.lb-mine-xp { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 8px 16px 9px; border-radius: 16px; background: #fffaf0; color: #153b3b; text-align: center; box-shadow: 0 4px 0 #b9d22f; }
.lb-mine-xp b { display: inline-flex; align-items: center; gap: 6px; font-size: clamp(20px, 3vw, 24px); font-weight: 900; line-height: 1; }
.lb-mine-xp small { font-size: 11px; font-weight: 800; color: #5c746f; letter-spacing: .02em; }
.lb-mine.empty { grid-template-columns: auto minmax(0, 1fr); }
@media (max-width: 620px) { .lb-mine { grid-template-columns: auto minmax(0, 1fr); padding: 14px 14px 16px; } .lb-mine-medal { width: 62px; height: 62px; font-size: 27px; } .lb-mine-medal i { top: 10px; } .lb-mine-xp { grid-column: 1 / -1; flex-direction: row; justify-content: center; gap: 10px; } }
  background: linear-gradient(135deg, #fffbe6 0%, #ecfccb 52%, #ccfbf1 100%); border: 2px solid #0d846e; box-shadow: 0 0 0 4px rgba(13, 132, 110, .12), 0 12px 24px -14px rgba(13, 132, 110, .6); }
.lb-rank { width: 40px; text-align: center; font-weight: 900; color: #94a3b8; }
.lb-row.top .lb-rank { color: #0d846e; }
.lb-name { flex: 1; min-width: 0; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lb-tag { font-size: 11px; font-weight: 900; background: #0d846e; color: #fff; border-radius: 999px; padding: 3px 10px; margin-left: 8px; box-shadow: 0 4px 10px rgba(13, 132, 110, .35); }
.lb-badge { font-size: 12px; font-weight: 800; border-radius: 999px; padding: 4px 10px; border: 1px solid; white-space: nowrap; }
.lb-xp { display: inline-flex; align-items: center; gap: 4px; font-weight: 900; color: #d97706; white-space: nowrap; }
.lb-gap { text-align: center; color: #94a3b8; font-weight: 900; letter-spacing: .3em; }
.lb-empty { background: #fff; border: 1px solid #e2e8f0; border-radius: 22px; padding: 40px 20px; text-align: center; }
.lb-note { background: #f0fdfa; border: 1px solid #99f6e4; color: #0f766e; border-radius: 16px; padding: 12px 16px; margin-bottom: 16px; font-weight: 700; font-size: 14px; }
@media (max-width: 560px) { .lb-badge { display: none; } .lb-row.me .lb-tag { display: none; } .lb-row.me { padding: 12px 12px 12px 16px; } }
`;

const ordinal = (n: number) => (n === 1 ? "1er" : `${n}e`);

/** Ma place, tout en haut aux couleurs de la charte kEur IA (vert profond, lime, crème) : c'est ce que l'élève cherche en premier. */
function MyRankCard({ me, total, periodLabel }: { me: CurrentUserData | null; total: number; periodLabel: string }) {
  if (!me) {
    return (
      <section className="lb-mine empty" aria-label="Mon classement">
        <div className="lb-mine-medal" aria-hidden="true"><Trophy size={30} /></div>
        <div className="lb-mine-main">
          <span className="lb-mine-kicker">Mon classement</span>
          <b>Pas encore classé(e)</b>
          <span>Gagne de l&apos;XP sur cette période pour entrer dans le classement !</span>
        </div>
      </section>
    );
  }
  const behind = total > 0 ? Math.max(0, Math.round(((total - me.rank) / total) * 100)) : 0;
  const onPodium = me.rank <= 3;
  return (
    <section className={`lb-mine${onPodium ? " gold" : ""}`} aria-label="Mon classement">
      <div className="lb-mine-medal" aria-hidden="true"><i>#</i><b>{me.rank}</b></div>
      <div className="lb-mine-main">
        <span className="lb-mine-kicker">{onPodium ? <><Trophy size={13} /> Sur le podium !</> : "Mon classement"}</span>
        <b>Tu es {ordinal(me.rank)} sur {total}</b>
        <span>{me.rank === 1 ? "Tu es en tête, bravo !" : me.xpToNextRank > 0 ? `Encore ${me.xpToNextRank} XP pour gagner une place` : "Continue comme ça !"}</span>
        <div className="lb-mine-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={behind} aria-label={`Tu fais mieux que ${behind} % des explorateurs`}><i style={{ width: `${Math.max(behind, 4)}%` }} /></div>
        <span>{behind > 0 ? `Tu fais mieux que ${behind} % des explorateurs` : "Les autres sont devant toi : à toi de jouer !"}</span>
      </div>
      <div className="lb-mine-xp">
        <b><Star size={20} color="#f59e0b" fill="#f59e0b" />{me.xpEarned} XP</b>
        <small>{periodLabel}</small>
      </div>
    </section>
  );
}
export function WeeklyLeaderboardView() {
  const [view, setView] = useState<View>("near");
  const [period, setPeriod] = useState<Period>("weekly");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProfileEntry | null>(null);
  const closeProfile = useCallback(() => setSelected(null), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/progress/leaderboard/weekly?period=${period}&view=${view}`, { credentials: "include" });
        if (!res.ok) throw new Error("Impossible de charger le classement.");
        const result: LeaderboardData = await res.json();
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur de connexion.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period, view]);

  // « Proche de moi » n'a de sens que si j'ai de l'XP sur la période : le serveur bascule alors sur la vue générale.
  const effectiveView: View = data?.view ?? view;
  const searching = effectiveView === "general" && query.trim() !== "";

  const list = useMemo(() => {
    const entries = data?.leaderboard ?? [];
    if (searching) return entries.filter((e) => e.displayName.toLowerCase().includes(query.toLowerCase().trim()));
    return entries;
  }, [data, query, searching]);

  // Le podium est toujours affiché (sauf pendant une recherche) ; la liste ne reprend pas ceux qui y figurent déjà.
  const podium = searching ? [] : data?.podium ?? [];
  const rows = searching ? list : list.filter((e) => e.position > 3);
  const me = data?.currentUser ?? null;

  return (
    <div className="lb">
      <style>{STYLES}</style>

      {data && <MyRankCard me={data.currentUser} total={data.totalParticipants} periodLabel={data.periodLabel} />}

      <div className="lb-controls">
        <div className="lb-seg views" role="group" aria-label="Type de classement">
          <button type="button" aria-pressed={effectiveView === "near"} disabled={data ? !data.nearAvailable : false} onClick={() => setView("near")}>
            <Target size={15} /> Proche de moi
          </button>
          <button type="button" aria-pressed={effectiveView === "general"} onClick={() => setView("general")}>
            <Crown size={15} /> Générale
          </button>
        </div>
        <div className="lb-seg" role="group" aria-label="Période">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>
              {p.id === "weekly" && <Zap size={14} />}{p.label}
            </button>
          ))}
        </div>
        {effectiveView === "general" && (
          <label className="lb-search">
            <Search size={16} color="#94a3b8" />
            <input type="text" placeholder="Chercher un prénom…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Chercher un élève" />
          </label>
        )}
      </div>

      {error && <div className="lb-note" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c", display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={18} color="#b91c1c" /> {error}</div>}

      {loading ? (
        <SkeletonLoader variant="leaderboard" />
      ) : data ? (
        <>
          {view === "near" && !data.nearAvailable && data.leaderboard.length > 0 && (
            <div className="lb-note">Tu n&apos;as pas encore d&apos;XP sur cette période : voici le classement général. Termine une activité pour voir tes voisins !</div>
          )}

          {podium.length > 0 && <LeaderboardPodium podium={podium} onSelect={setSelected} />}

          {data.leaderboard.length === 0 ? (
            <div className="lb-empty">
              <Sparkles size={36} color="#f59e0b" />
              <p style={{ fontWeight: 800, margin: "8px 0 4px" }}>Personne n&apos;est encore classé sur cette période</p>
              <p style={{ margin: 0, color: "#64748b" }}>Termine une leçon ou un jeu pour ouvrir le classement !</p>
            </div>
          ) : searching && rows.length === 0 ? (
            <div className="lb-empty">
              <Search size={32} color="#94a3b8" />
              <p style={{ fontWeight: 800, margin: "8px 0 0" }}>Aucun explorateur ne correspond à « {query} »</p>
            </div>
          ) : (
            <div className="lb-list">
              {effectiveView === "near" && !searching && rows[0] && rows[0].position > 4 && <div className="lb-gap" aria-hidden="true">···</div>}
              {rows.map((entry, index) => (
                <button
                  type="button"
                  key={`${entry.rank}-${entry.displayName}-${index}`}
                  className={`lb-row${entry.isMe ? " me" : ""}${entry.rank <= 10 ? " top" : ""}`}
                  onClick={() => setSelected(entry)}
                  aria-label={`Voir la progression de ${entry.displayName}`}
                >
                  <span className="lb-rank">#{entry.rank}</span>
                  <span className="lb-av"><ChildAvatar id={entry.avatar} size={42} title="" /></span>
                  <span className="lb-name">
                    {entry.displayName}
                    {entry.isMe && <span className="lb-tag">C&apos;est toi !</span>}
                  </span>
                  <span className="lb-badge" style={{ background: entry.badge.bg, borderColor: entry.badge.border, color: entry.badge.color }}>
                    <TierIcon tier={entry.badge.tier} /> {entry.badge.label}
                  </span>
                  <span className="lb-xp"><Star size={14} fill="#f59e0b" color="#f59e0b" />{entry.xpEarned} XP</span>
                </button>
              ))}
              {effectiveView === "near" && rows.length > 0 && rows[rows.length - 1].position < data.totalParticipants && <div className="lb-gap" aria-hidden="true">···</div>}
              {/* Hors des 100 premiers : ma place reste visible, épinglée sous la liste. */}
              {effectiveView === "general" && !searching && me && !data.leaderboard.some((e) => e.isMe) && (
                <>
                  <div className="lb-gap" aria-hidden="true">···</div>
                  <button
                    type="button"
                    className="lb-row me"
                    onClick={() => setSelected({ rank: me.rank, displayName: "Toi", xpEarned: me.xpEarned, badge: me.badge, isMe: true, avatar: me.avatar, totalXp: me.totalXp, level: me.level })}
                    aria-label="Voir ma progression"
                  >
                    <span className="lb-rank">#{me.rank}</span>
                    <span className="lb-av"><ChildAvatar id={me.avatar} size={42} title="" /></span>
                    <span className="lb-name">Toi<span className="lb-tag">C&apos;est toi !</span></span>
                    {me.badge && (
                      <span className="lb-badge" style={{ background: me.badge.bg, borderColor: me.badge.border, color: me.badge.color }}><TierIcon tier={me.badge.tier} /> {me.badge.label}</span>
                    )}
                    <span className="lb-xp"><Star size={14} fill="#f59e0b" color="#f59e0b" />{me.xpEarned} XP</span>
                  </button>
                </>
              )}
            </div>
          )}
        </>
      ) : null}

      {selected && data && <LeaderboardProfileModal entry={selected} total={data.totalParticipants} periodLabel={data.periodLabel} onClose={closeProfile} />}
    </div>
  );
}
