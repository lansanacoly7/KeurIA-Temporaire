"use client";

import "./parcours79.css";
import "./adventure79.css";
import Link from "next/link";
import { useMemo } from "react";
import type { World } from "../../lms-data";
import { getLevelTier, getNextTier, xpToNextTier } from "../../level-tiers";
import { DailyChallenge79 } from "./DailyChallenge79";
import { Icon79, type IconName } from "./Icons79";
import { PalouImg } from "./Img79";
import { sfx } from "./sound";
import type { MapModel } from "./types";

interface Props {
  firstName: string;
  xp: number;
  streak: number;
  completed: string[];
  lessonStars: Record<string, number>;
  worlds: World[];
  map: MapModel;
  onContinue: (lessonId: string, worldId: string) => void;
  /** Vrai quand l'enfant a assez joué pour aujourd'hui : un mot doux, jamais un blocage. */
  timeToPause: boolean;
  /** Défi du jour : réservé à l'enfant connecté (pas au mode visiteur d'un parent). */
  showChallenge: boolean;
  onChallengeResult: (correct: boolean, xpGained: number, totalXp?: number) => void;
  easterEggAvailable: boolean;
  onEasterEgg: () => void;
  checkedRules: Record<number, boolean>;
  onToggleRule: (id: number) => void;
}

/** Salutations de Palou : une seule par visite (jamais de texte qui change tout seul sous les yeux de l'enfant). */
const GREETINGS = [
  { t: "Jámm rekk", s: "Prêt pour une nouvelle aventure avec Palou ?" },
  { t: "Salut", s: "Palou t’attend pour continuer ton voyage." },
  { t: "Coucou", s: "Chaque erreur t’aide à apprendre. On y va ?" },
  { t: "C’est parti", s: "Découvre un nouveau secret de l’IA aujourd’hui !" },
];

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

const TILES: { href: string; icon: IconName; title: string; text: string; tone: string }[] = [
  { href: "/dashboard/jeux", icon: "sparkles", title: "Jeux et défis", text: "Joue avec Palou", tone: "lime" },

  { href: "/dashboard/programmation", icon: "bulb", title: "Programmation", text: "Crée ton propre jeu", tone: "mint" },
  { href: "/dashboard/dictionnaire", icon: "book", title: "Dictionnaire", text: "Les mots magiques de l’IA", tone: "amber" },
  { href: "/dashboard/classement", icon: "trophy", title: "Classement", text: "Vois où tu en es", tone: "lime" },
  { href: "/dashboard/badges", icon: "star", title: "Mes badges", text: "Tes récompenses", tone: "sky" },
];

const RULES = [
  { id: 0, icon: "lock" as IconName, title: "Mon mot de passe est secret", text: "Je ne le dis qu’à mes parents." },
  { id: 1, icon: "help" as IconName, title: "Je vérifie avant de croire", text: "Une photo peut être fausse. Je demande à un adulte." },
  { id: 2, icon: "shield" as IconName, title: "C’est moi le chef !", text: "L’IA m’aide, mais c’est moi qui décide." },
];

const DISCOVERIES: { icon: IconName; title: string; text: string }[] = [
  { icon: "sprout", title: "Des rizières bien soignées", text: "Des drones survolent les rizières du fleuve Sénégal. L’IA y repère les plantes malades." },
  { icon: "sound", title: "Des ordinateurs qui parlent wolof", text: "Des ingénieurs apprennent nos langues aux machines. Chacun peut s’informer dans sa langue." },
  { icon: "sparkles", title: "Des soignants futés", text: "Des applications aident à lire des radios. Elles repèrent vite certaines maladies, comme le paludisme." },
];

export function Adventure79({
  firstName, xp, streak, completed, lessonStars, worlds, map, onContinue, timeToPause, showChallenge, onChallengeResult,
  easterEggAvailable, onEasterEgg, checkedRules, onToggleRule,
}: Props) {
  const totalLessons = map.modules.reduce((n, m) => n + m.total, 0);
  const doneLessons = map.modules.reduce((n, m) => n + m.doneCount, 0);
  const percent = totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0;
  const totalStars = useMemo(
    () => worlds.flatMap(w => w.lessons).reduce((n, l) => n + (completed.includes(l.id) ? Math.max(1, lessonStars[l.id] ?? 0) : 0), 0),
    [worlds, completed, lessonStars],
  );

  const currentWorld = map.current ? worlds.find(w => w.id === map.current!.moduleId) : undefined;
  const currentLesson = currentWorld?.lessons.find(l => l.id === map.current!.lessonId);
  const currentIndex = currentWorld ? worlds.indexOf(currentWorld) : -1;
  const finishedAll = !map.current && !map.waitingForContent;

  const tier = getLevelTier(xp);
  const nextTier = getNextTier(tier);
  const missing = xpToNextTier(xp);
  const tierPercent = nextTier ? Math.min(100, Math.round(((xp - tier.min) / (nextTier.min - tier.min)) * 100)) : 100;

  const todayIndex = (new Date().getDay() + 6) % 7; // lundi = 0
  const rulesDone = Object.values(checkedRules).filter(Boolean).length;
  const pose = finishedAll ? "Celebration" : doneLessons === 0 ? "Content" : "Hero";
  // Salutation stable (pas d'aléatoire : le serveur et le navigateur affichent la même) ; elle change quand l'enfant progresse.
  const greeting = GREETINGS[(doneLessons + streak) % GREETINGS.length];

  return (
    <div className="p79 a79">
      {/* ═══ L'ÉNIGME DE PALOU : au-dessus de la section verte, jusqu'à ce que l'enfant y réponde ═══ */}
      {showChallenge && <DailyChallenge79 onResult={onChallengeResult} />}

      {/* ═══ ACCUEIL : Palou, un seul gros bouton, le chemin ═══ */}
      <section className="a79-hero" aria-labelledby="a79-hello">
        {easterEggAvailable && (
          <button type="button" className="a79-secret" onClick={() => { sfx.star(); onEasterEgg(); }} aria-label="Un bonus secret ! Touche l’étoile">
            <Icon79 name="star" size={34} className="gold" />
          </button>
        )}
        <div className="a79-hero-palou"><PalouImg pose={pose} /></div>

        <div className="a79-hello">
          <span className="p79-eyebrow">Mon aventure</span>
          <h1 id="a79-hello">{greeting.t}, {firstName} !</h1>
          <div className="a79-sub">{greeting.s}</div>

          <div className="a79-cta-row">
            {map.current && currentLesson ? (
              <>
                <button type="button" className="p79-btn" onClick={() => { sfx.tap(); onContinue(currentLesson.id, currentWorld!.id); }}>
                  <Icon79 name="play" size={26} /> Continuer
                </button>
                <div className="a79-next">
                  <span>Prochaine étape</span>
                  <b>{currentLesson.title}</b>
                </div>
              </>
            ) : map.waitingForContent ? (
              <div className="a79-next"><b>La suite arrive bientôt !</b><span>Palou prépare de nouvelles aventures. Tu peux revoir tes leçons.</span></div>
            ) : (
              <div className="a79-next"><b>Bravo, tu as tout fini !</b><span>Tu peux revoir n’importe quelle leçon.</span></div>
            )}
          </div>
        </div>

        <div className="a79-path-wrap">
          <Link href="/dashboard/modules" className="a79-path" aria-label={`Mon chemin : ${doneLessons} leçons terminées sur ${totalLessons}. Ouvrir ma carte.`} onClick={() => sfx.page()}>
            {map.modules.map((m, i) => (
              <span key={m.id} className="a79-step">
                {i > 0 && <i className={`a79-link ${map.modules[i - 1].state === "done" ? "done" : ""}`} aria-hidden="true" />}
                <span className={`a79-node ${m.state} ${i === currentIndex ? "here" : ""}`} aria-hidden="true">
                  {m.state === "done" ? <Icon79 name="check" size={24} /> : m.state === "lock" ? <Icon79 name="lock" size={20} /> : i + 1}
                </span>
              </span>
            ))}
          </Link>
          <div className="a79-bar-row">
            <div className="a79-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Avancement du parcours">
              <i style={{ width: `${Math.max(percent, 4)}%` }} />
            </div>
            <span className="a79-bar-text">{doneLessons} / {totalLessons} leçons</span>
          </div>
        </div>
      </section>

      {timeToPause && (
        <div className="a79-pause" role="status">
          <Icon79 name="clock" size={34} />
          <div><b>Tu as bien travaillé !</b><span>C’est le moment de faire une petite pause. Bouge un peu et repose tes yeux.</span></div>
        </div>
      )}

      {/* ═══ MES TROIS CHIFFRES ═══ */}
      <section className="a79-stats" aria-label="Mes progrès">
        <div className="a79-stat">
          <span className="a79-stat-ico star"><Icon79 name="star" size={40} className="gold" /></span>
          <div><b className="a79-big">{totalStars}</b><span>étoile{totalStars > 1 ? "s" : ""} gagnée{totalStars > 1 ? "s" : ""}</span></div>
        </div>

        <div className="a79-stat level">
          <span className="a79-level-img">
            <img src={tier.image} alt="" />
          </span>
          <div className="a79-level-text">
            <span>Niveau {tier.level}</span>
            <b>{tier.name}</b>
            <div className="a79-bar small" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={tierPercent} aria-label="Avancement vers le niveau suivant"><i style={{ width: `${Math.max(tierPercent, 4)}%` }} /></div>
            <span className="a79-level-more">{nextTier ? `Encore ${missing} XP pour devenir « ${nextTier.name} »` : "Niveau maximum atteint !"}</span>
          </div>
        </div>

        <div className="a79-stat">
          <span className="a79-stat-ico flame"><Icon79 name="flame" size={40} /></span>
          <div><b className="a79-big">{streak}</b><span>jour{streak > 1 ? "s" : ""} de suite</span></div>
        </div>
      </section>

      {/* ═══ MA SEMAINE ═══ */}
      <section className="a79-card" aria-labelledby="a79-week-title">
        <header className="a79-card-head">
          <div className="a79-card-title">
            <span className="p79-eyebrow">Mes flammes</span>
            <h2 id="a79-week-title">Ma semaine</h2>
          </div>
        </header>
        <ol className="a79-week">
          {DAYS.map((d, i) => {
            const active = i <= todayIndex && streak > todayIndex - i;
            const today = i === todayIndex;
            return (
              <li key={i} className={`a79-day ${active ? "on" : ""} ${today ? "today" : ""}`} aria-label={`${DAY_NAMES[i]}${today ? " (aujourd’hui)" : ""} : ${active ? "tu as joué" : "pas encore joué"}`}>
                <span className="a79-day-box" aria-hidden="true">{active ? <Icon79 name="flame" size={36} /> : d}</span>
                <span className="a79-day-name" aria-hidden="true">{today ? <><span className="a79-long">Aujourd’hui</span><span className="a79-short">Auj.</span></> : d}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ═══ OÙ VEUX-TU ALLER ? ═══ */}
      <section aria-labelledby="a79-go-title">
        <div className="a79-section-head">
          <span className="p79-eyebrow">Explore</span>
          <h2 id="a79-go-title">Où veux-tu aller ?</h2>
        </div>
        <div className="a79-tiles">
          {TILES.map(t => (
            <Link key={t.href} href={t.href} className={`a79-tile ${t.tone}`} onClick={() => sfx.page()}>
              <span className="a79-tile-ico"><Icon79 name={t.icon} size={40} /></span>
              <span className="a79-tile-text"><b>{t.title}</b><span>{t.text}</span></span>
              <Icon79 name="arrow-right" size={28} className="a79-tile-go" />
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ MES 3 RÈGLES D'OR ═══ */}
      <section aria-labelledby="a79-rules-title">
        <div className="a79-section-head">
          <span className="p79-eyebrow">Palou te protège</span>
          <h2 id="a79-rules-title">Mes 3 règles d’or</h2>
          <span className="p79-chip-big a79-count"><Icon79 name="shield" size={26} /> {rulesDone} / 3</span>
        </div>
        <div className="a79-rules">
          {RULES.map(r => {
            const on = !!checkedRules[r.id];
            return (
              <button key={r.id} type="button" className={`a79-rule ${on ? "on" : ""}`} aria-pressed={on} onClick={() => { sfx.tap(); onToggleRule(r.id); }}>
                <span className="a79-rule-ico"><Icon79 name={r.icon} size={36} /></span>
                <span className="a79-rule-text"><b>{r.title}</b><span>{r.text}</span></span>
                <span className="a79-check" aria-hidden="true">{on && <Icon79 name="check" size={28} />}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ LE SAVAIS-TU ? ═══ */}
      <section aria-labelledby="a79-know-title">
        <div className="a79-section-head">
          <span className="p79-eyebrow">L’IA chez nous</span>
          <h2 id="a79-know-title">Le savais-tu ?</h2>
        </div>
        <div className="a79-know">
          {DISCOVERIES.map(d => (
            <article key={d.title} className="a79-fact">
              <span className="a79-fact-ico"><Icon79 name={d.icon} size={34} /></span>
              <h3>{d.title}</h3>
              <div className="a79-fact-text">{d.text}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
