"use client";

import { ScrollDownHint } from "./ScrollDownHint";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Check, CheckCircle2, Clock, Compass, Fingerprint, Flame, GraduationCap, Lightbulb, LogOut, Pencil, PlayCircle, School, Sparkles, Star, Target, Trophy, X } from "lucide-react";
import ChildAvatar, { AVATARS, DEFAULT_AVATAR_ID, getAvatar } from "../../components/ChildAvatar";
import { getLevelTier, getNextTier } from "../../level-tiers";
import { badgeImage, computeEarnedBadges, skillBadges } from "../../lms-data";
import { signOut } from "../../sign-out-client";
import "../../profile/profile.css";

type Progress = {
  xp: number;
  completedLessons: string[];
  streak: number;
  gamesUnlocked: string[];
  badges: string[];
  totalStars: number;
  totalMinutes: number;
  perfectStreak: number;
};

const NAME_MIN = 2;
const NAME_MAX = 30;


async function readJson(r: Response) {
  try { return await r.json(); } catch { return {}; }
}

/** Passeport d'explorateur : onglet « Mon profil » de l'espace élève (rendu dans le tableau de bord, sans sidebar propre). */
export default function ChildProfileView({ authName, schoolName, assignedAge, onUpdateProfile }: {
  authName: string;
  schoolName: string | null;
  assignedAge?: string;
  onUpdateProfile?: (displayName: string, avatar: string) => void;
}) {
  const [displayName, setDisplayName] = useState(authName);
  const [school, setSchool] = useState<string | null>(schoolName);
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR_ID);
  const [userId, setUserId] = useState<string | number>(1);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [ageGroup, setAgeGroup] = useState<string | null>(assignedAge ?? null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Progress>({
    xp: 0,
    completedLessons: [],
    streak: 1,
    gamesUnlocked: [],
    badges: [],
    totalStars: 0,
    totalMinutes: 0,
    perfectStreak: 0,
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(DEFAULT_AVATAR_ID);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then(async (r) => ({ ok: r.ok, data: await readJson(r) }))
      .then(({ ok, data }) => {
        if (ok && data.profile) {
          setDisplayName(data.profile.displayName);
          setSchool(data.profile.schoolName ?? null);
          setAvatar(getAvatar(data.profile.avatar).id);
          if (data.profile.id) setUserId(data.profile.id);
          if (data.profile.createdAt) setCreatedAt(data.profile.createdAt);
          if (data.profile.ageGroup) setAgeGroup(data.profile.ageGroup);
        } else setError(data.error || "Impossible de charger le profil");
      })
      .catch(() => setError("Impossible de charger le profil"))
      .finally(() => setLoading(false));
    fetch("/api/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.progress) return;
        const ls = d.progress.lessonStars || {};
        const starsSum = typeof d.progress.totalStars === "number"
          ? d.progress.totalStars
          : Object.values(ls).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
        setProgress({
          xp: d.progress.xp ?? 0,
          completedLessons: d.progress.completedLessons ?? [],
          streak: d.progress.streak ?? 1,
          gamesUnlocked: d.progress.gamesUnlocked ?? [],
          badges: d.progress.badges ?? [],
          totalStars: starsSum,
          totalMinutes: d.progress.totalMinutes ?? 0,
          perfectStreak: d.progress.perfectStreak ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  const trimmedName = displayName.trim();
  const nameValid = trimmedName.length >= NAME_MIN && trimmedName.length <= NAME_MAX;
  const nameProblem = `Ton pseudo doit avoir entre ${NAME_MIN} et ${NAME_MAX} lettres.`;

  /** Enregistre le pseudo et l'avatar en base (l'avatar suit l'élève d'un ordinateur à l'autre). */
  const persist = async (nextAvatar: string) => {
    setSaving(true); setError(""); setNotice("");
    try {
      const r = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: trimmedName, avatar: nextAvatar }),
      });
      const d = await readJson(r);
      if (!r.ok) { setError(d.error || "Impossible d'enregistrer."); return false; }
      const savedAvatar = getAvatar(d.profile.avatar).id;
      setDisplayName(d.profile.displayName);
      setAvatar(savedAvatar);
      setNotice("Ton profil est enregistré !");
      onUpdateProfile?.(d.profile.displayName, savedAvatar);
      return true;
    } catch {
      setError("Impossible d'enregistrer le profil.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openPicker = () => { setPending(avatar); setPickerOpen(true); };
  const confirmAvatar = async () => {
    if (!nameValid) { setPickerOpen(false); setError(nameProblem); return; }
    if (await persist(pending)) setPickerOpen(false);
  };

  const tier = getLevelTier(progress.xp);
  const next = getNextTier(tier);
  const pct = next ? Math.min(100, Math.round(((progress.xp - tier.min) / (tier.max - tier.min)) * 100)) : 100;
  const earned = computeEarnedBadges(progress.completedLessons.length, progress.xp, progress.streak, {
    completedLessons: progress.completedLessons,
    badges: progress.badges,
  });
  const earnedBadges = skillBadges.filter((b) => earned.includes(b.id));

  // Carte d'agent secret
  const matricule = `#KIA-${new Date(createdAt || Date.now()).getFullYear()}-EXP${String(userId).padStart(3, "0")}`;
  const memberDate = createdAt
    ? new Date(createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : "2026";
  const leagueName = (ageGroup === "13-15" || assignedAge === "13-15") ? "Jeunes Créateurs (13-15 ans)"
    : (ageGroup === "10-12" || assignedAge === "10-12") ? "Jeunes Aventuriers (10-12 ans)"
    : "Petits Explorateurs (7-9 ans)";


  const bubble = progress.streak > 1
    ? `Bravo ${trimmedName || "explorateur"} ! ${progress.streak} jours de suite, continue comme ça !`
    : `Salut ${trimmedName || "explorateur"} ! Prêt pour une nouvelle aventure ?`;

  return (
    <div className="pf-page pf-embedded">
      <div className="pf-content">
        <div className="pf-card pf-hero">
          <div className="pf-avatar-wrap">
            <div className="pf-avatar-ring"><ChildAvatar id={avatar} size={88} /></div>
            <button type="button" className="pf-avatar-edit" onClick={openPicker} aria-label="Modifier mon avatar" title="Modifier mon avatar"><Pencil size={17} /></button>
          </div>
          <div>
            <span className="pf-eyebrow">Passeport d&apos;explorateur</span>
            <h1>{trimmedName || authName}</h1>
            <div className="pf-status">
              <span className="pf-chip"><Sparkles size={15} />Explorateur de l&apos;IA</span>
              {school && <span className="pf-chip gold"><School size={15} />{school}</span>}
              <span className="pf-chip flame" title={`Série de connexion : ${progress.streak} jour${progress.streak > 1 ? "s" : ""} consécutif${progress.streak > 1 ? "s" : ""} !`}>
                <Flame size={15} color="#ea580c" />
                {progress.streak} {progress.streak > 1 ? "jours" : "jour"}
              </span>
              <span className="pf-chip xp" title={`${progress.xp} XP`}>
                <Star size={15} color="#ca8a04" />
                {progress.xp} XP — {tier.name}
              </span>
            </div>
          </div>
          <div className="pf-palou">
            <div className="pf-bubble">{bubble}</div>
            <img src="/images/palou/palou-officiel-cheer.png" alt="Palou, la mascotte de kEur IA" />
          </div>
        </div>



        {notice && <div className="pf-notice ok" role="status"><CheckCircle2 size={18} />{notice}</div>}
        {error && <div className="pf-notice bad" role="alert">{error}</div>}

        <section className="pf-stats" aria-label="Ma progression">
          <div className="pf-card pf-stat">
            <span className="pf-stat-label"><Trophy size={16} />Niveau et rang</span>
            <div className="pf-level">
              <img src={tier.image} alt="" />
              <div><h3>{tier.name}</h3><small>Niveau {tier.level}</small></div>
            </div>
            <div className="pf-xp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progression vers le niveau suivant">
              <div className="pf-xp-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="pf-xp-meta">
              <span>{progress.xp} XP</span>
              <span>{next ? `${next.min - progress.xp} XP pour « ${next.name} »` : "Niveau maximum atteint !"}</span>
            </div>
          </div>

          <div className="pf-card pf-stat pf-streak">
            <span className="pf-stat-label"><Flame size={16} />Série quotidienne</span>
            <div className="pf-streak-num"><Flame size={42} /><span>{progress.streak}<small> jour{progress.streak > 1 ? "s" : ""}</small></span></div>
            <p>Connecte-toi demain pour garder ta série !</p>
          </div>

          <div className="pf-card pf-stat">
            <span className="pf-stat-label"><Award size={16} />Missions et ateliers</span>
            <div className="pf-missions">
              <div className="pf-mission"><span><GraduationCap size={22} /></span><div><b>{progress.completedLessons.length}</b><small>leçon{progress.completedLessons.length > 1 ? "s" : ""} terminée{progress.completedLessons.length > 1 ? "s" : ""}</small></div></div>
              <div className="pf-mission"><span><PlayCircle size={22} /></span><div><b>{progress.gamesUnlocked.length}</b><small>jeu{progress.gamesUnlocked.length > 1 ? "x" : ""} débloqué{progress.gamesUnlocked.length > 1 ? "s" : ""}</small></div></div>
            </div>
          </div>
        </section>

        {/* Carnet de bord de l'explorateur : Statistiques stimulantes */}
        <section className="pf-card pf-logbook">
          <div className="pf-card-head">
            <h2>
              <Compass size={22} color="var(--pf-green)" />
              Carnet de bord de l&apos;explorateur
            </h2>
            <span className="pf-logbook-badge">Activité en direct</span>
          </div>

          <div className="pf-logbook-grid">
            {/* 1. Étoiles récoltées */}
            <div className="pf-logbook-item stars">
              <div className="pf-logbook-icon">
                <Star size={24} fill="#f59e0b" color="#d97706" />
              </div>
              <div className="pf-logbook-data">
                <b>{progress.totalStars}</b>
                <span>Étoiles récoltées</span>
                <small>Défis et mini-jeux validés</small>
              </div>
            </div>

            {/* 2. Temps d'apprentissage */}
            <div className="pf-logbook-item time">
              <div className="pf-logbook-icon">
                <Clock size={24} color="var(--brand-mid, #0f766e)" />
              </div>
              <div className="pf-logbook-data">
                <b>{progress.totalMinutes >= 60 ? `${Math.floor(progress.totalMinutes / 60)}h ${progress.totalMinutes % 60}m` : `${progress.totalMinutes} min`}</b>
                <span>Temps d&apos;apprentissage</span>
                <small>D&apos;exploration active avec Palou</small>
              </div>
            </div>

            {/* 3. Quiz réussis du 1er coup */}
            <div className="pf-logbook-item quiz">
              <div className="pf-logbook-icon">
                <Target size={24} color="#7c3aed" />
              </div>
              <div className="pf-logbook-data">
                <b>{progress.perfectStreak}</b>
                <span>Série de sans-faute</span>
                <small>Quiz réussis d&apos;affilée, sans erreur</small>
              </div>
            </div>

            {/* 4. Missions franchies */}
            <div className="pf-logbook-item missions">
              <div className="pf-logbook-icon">
                <GraduationCap size={24} color="var(--brand-mid, #0f755f)" />
              </div>
              <div className="pf-logbook-data">
                <b>{progress.completedLessons.length}</b>
                <span>Missions franchies</span>
                <small>Sur la carte d&apos;aventure</small>
              </div>
            </div>
          </div>

          <div className="pf-logbook-footer">
            <div className="pf-logbook-tip">
              <span><Lightbulb size={18} color="#f59e0b" /></span>
              <p>
                {progress.completedLessons.length > 0 || progress.totalStars > 0
                  ? `Bravo pour ton travail ! Chaque quiz réussi et chaque défi relevé continuent d'enrichir ton carnet d'explorateur.`
                  : `Ton carnet d'explorateur est prêt ! Termine ton premier cours ou relève un défi pour voir tes statistiques grandir.`}
              </p>
            </div>
          </div>
        </section>

        <section className="pf-card">
          <div className="pf-card-head">
            <h2><Award size={22} color="#f59e0b" />Mes trophées ({earnedBadges.length})</h2>
            <Link href="/dashboard/badges" style={{ fontSize: 13, fontWeight: 700, color: "var(--pf-green)", textDecoration: "none" }}>
              Tous les badges →
            </Link>
          </div>
          {earnedBadges.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--pf-muted)" }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--pf-ink)" }}>Aucun trophée débloqué pour le moment.</p>
              <p style={{ margin: "6px 0 0", fontSize: 13 }}>Termine tes premières leçons et relève des défis pour gagner tes premiers badges !</p>
            </div>
          ) : (
            <div className="pf-badges">
              {earnedBadges.map((b) => (
                <div key={b.id} className="pf-badge on" tabIndex={0} title={b.description}>
                  <img src={badgeImage(b.id)} alt={b.name} />
                  <b>{b.name}</b>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Carte d'Aventurier (Effet Passeport / Badge d'agent secret) */}
        <div className="pf-agent-card">
          <svg viewBox="0 0 1100 220" preserveAspectRatio="xMidYMax slice" className="pf-agent-card-svg" aria-hidden="true">
            <path d="M0 220 L0 158 C120 128 230 168 350 150 C480 130 560 166 700 148 C820 132 980 162 1100 140 L1100 220 Z" fill="var(--brand, #0A3B30)" />
            <path d="M0 220 L0 190 C160 170 320 200 500 186 C680 172 900 198 1100 180 L1100 220 Z" fill="var(--brand, #08322a)" />
          </svg>
          <div className="pf-agent-inner">
            <div className="pf-agent-top">
              <div className="pf-agent-brand">
                <Fingerprint size={18} />
                <span>Passeport Officiel d&apos;Explorateur • KEUR IA</span>
              </div>
              <span className="pf-agent-matricule">{matricule}</span>
            </div>
            <div className="pf-agent-grid">
              <div className="pf-agent-field">
                <small>Nom d&apos;agent</small>
                <b>{trimmedName || authName}</b>
              </div>
              <div className="pf-agent-field">
                <small>Ligue d&apos;aventure</small>
                <b>{leagueName}</b>
              </div>
              <div className="pf-agent-field">
                <small>Engagement</small>
                <b>Depuis {memberDate}</b>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="pf-agent-stamp"><Star size={12} color="var(--brand-mid, #0f755f)" fill="var(--brand-mid, #0f755f)" style={{ verticalAlign: "middle" }} /> Approuvé Palou <Star size={12} color="var(--brand-mid, #0f755f)" fill="var(--brand-mid, #0f755f)" style={{ verticalAlign: "middle" }} /></span>
              </div>
            </div>
          </div>
        </div>

        {/* Pause de l'explorateur (Déconnexion bienveillante) */}
        <section className="pf-break-card">
          <div className="pf-break-left">
            {confirmLogout ? (
              <div className="pf-break-confirm">
                <span className="pf-break-warn">Tu veux vraiment faire une pause ?</span>
                <div className="pf-break-actions">
                  <button type="button" className="pf-btn ghost" onClick={() => setConfirmLogout(false)}>
                    Non, je reste
                  </button>
                  <button type="button" className="pf-btn pf-btn-danger" onClick={() => signOut("/connexion")}>
                    <LogOut size={16} /> Oui, quitter
                  </button>
                </div>
              </div>
            ) : (
              <div className="pf-break-actions">
                <button type="button" className="pf-btn pf-btn-break" onClick={() => setConfirmLogout(true)} title="Faire une pause et me déconnecter">
                  <LogOut size={16} /> Me déconnecter
                </button>
              </div>
            )}
          </div>

          <div className="pf-break-right">
            <div className="pf-break-text">
              <span className="pf-break-eyebrow">Pause bien méritée</span>
              <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}><Compass size={22} color="var(--brand-mid, #0f755f)" style={{ flexShrink: 0 }} />À bientôt pour de nouvelles aventures !</h2>
              <p>
                Tes étoiles, tes cours et tes trophées sont bien sauvegardés. Tu pourras reprendre exactement là où tu t&apos;es arrêté !
              </p>
            </div>
            <div className="pf-break-mascot">
              <img src="/palou/PalouMain.png" alt="Palou te salue" width={74} height={74} />
            </div>
          </div>
        </section>

      </div>

      {/* Indicateur de défilement mobile unifié style Keur IA */}
      <ScrollDownHint scrollOffset={380} ariaLabel="Faire défiler vers mon passeport et mes statistiques" />

      {pickerOpen && (
        <div className="pf-overlay" onClick={() => setPickerOpen(false)}>
          <div className="pf-modal" role="dialog" aria-modal="true" aria-labelledby="pf-picker-title" onClick={(e) => e.stopPropagation()}>
            <header>
              <div><h2 id="pf-picker-title">Choisis ton avatar</h2><p>Clique sur celui qui te ressemble le plus.</p></div>
              <button type="button" className="pf-close" onClick={() => setPickerOpen(false)} aria-label="Fermer"><X size={18} /></button>
            </header>
            {(["companion", "explorer"] as const).map((group) => (
              <div key={group}>
                <h3>{group === "explorer" ? "Jeunes explorateurs" : "Palou et ses compagnons"}</h3>
                <div className="pf-choices">
                  {AVATARS.filter((a) => a.group === group).map((a) => (
                    <button key={a.id} type="button" className={`pf-choice ${pending === a.id ? "on" : ""}`} aria-pressed={pending === a.id} onClick={() => setPending(a.id)}>
                      <ChildAvatar id={a.id} size={80} />
                      <span>{a.label}</span>
                      {pending === a.id && <i className="pf-tick"><Check size={15} strokeWidth={3} /></i>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="pf-actions">
              <button type="button" className="pf-btn ghost" onClick={() => setPickerOpen(false)}>Annuler</button>
              <button type="button" className="pf-btn" disabled={saving} onClick={confirmAvatar}>{saving ? "Enregistrement…" : "Valider mon avatar"}</button>
            </div>
          </div>
        </div>
      )}
    <ScrollDownHint scrollOffset={380} ariaLabel="Faire défiler vers mon passeport et mes statistiques" />
    </div>
  );
}
