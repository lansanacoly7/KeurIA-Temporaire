"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Lightbulb, PartyPopper, Sparkles, Star, X } from "lucide-react";
import "./DailyChallengeCard.css";

type Challenge = { id: number; theme: string; question: string; options: string[]; xp: number };

/**
 * Illustrations des défis : un pictogramme pour la question et un par réponse (bibliothèque des cours, /images/parcours79/pictos).
 * Pour 7-9 ans, jamais que du texte. Un défi sans entrée ici reçoit l'image de son thème ; une image manquante est simplement masquée.
 */
const VISUALS: Record<number, { ask: string; options: string[] }> = {
  1: { ask: "chat", options: ["baguette-magique", "peu-exemples", "mauvais-exemple"] },
  2: { ask: "cadenas-secret", options: ["chiffres", "enfant-moi", "mot-de-passe-cle"] },
  3: { ask: "ia-robot", options: ["consigne-vague", "consigne-precise", "boule-cristal"] },
  4: { ask: "lion-devine", options: ["publier-vite", "verifier-adulte", "croire-premier"] },
};
const THEME_ASK: [RegExp, string][] = [
  [/apprend|donn[ée]es/i, "donnees-classees"],
  [/secret|s[ée]curit/i, "cadenas-secret"],
  [/parler|cr[ée]ativ/i, "idees-ampoules"],
  [/vrai|critique/i, "a-verifier"],
];
const pictoSrc = (id?: string) => (id ? `/images/parcours79/pictos/${id}.webp` : undefined);

function Pic({ src, className }: { src?: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return <img className={className} src={src} alt="" aria-hidden="true" draggable={false} onError={() => setFailed(true)} />;
}

/**
 * Défi éclair du jour. La question, la correction et l'XP viennent du serveur
 * (/api/daily-challenge) : la bonne réponse n'est jamais présente dans le navigateur.
 */
export function DailyChallengeCard({ onResult }: { onResult: (correct: boolean, xpGained: number, totalXp?: number) => void }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [completed, setCompleted] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const day = useRef("");

  /**
   * Une nouvelle question chaque jour à minuit. Dès que l'enfant a fini (bonne réponse, ou deux essais utilisés), la carte
   * disparaît jusqu'au lendemain : au rechargement elle ne revient pas, et à minuit la nouvelle question arrive toute seule.
   */
  const load = useCallback(() => {
    day.current = new Date().toDateString();
    fetch("/api/daily-challenge", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.challenge || d.completed || d.attemptsLeft === 0) {
          setChallenge(null);
          return;
        }
        setChallenge(d.challenge);
        setCompleted(false);
        setExplanation(null);
        setSelected(null);
        setLocked(false);
        setError(null);
        // Les essais déjà utilisés aujourd'hui survivent à un rechargement de la page.
        setWrong(Array.isArray(d.wrong) ? d.wrong : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const now = new Date();
    const untilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 3).getTime() - now.getTime();
    const timer = window.setTimeout(load, untilMidnight);
    const onVisible = () => { if (document.visibilityState === "visible" && new Date().toDateString() !== day.current) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [load, challenge?.id]);

  if (!challenge) return null;

  const finished = completed || locked;
  const close = () => setChallenge(null);

  const answer = async (index: number) => {
    if (completed || locked || busy || wrong.includes(index)) return;
    setBusy(true);
    setError(null);
    setSelected(index);
    try {
      const res = await fetch("/api/daily-challenge", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answer: index }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSelected(null);
        if (data.locked) setLocked(true);
        setError(data.error || "Impossible d'enregistrer ta réponse.");
        return;
      }
      if (data.correct) {
        setCompleted(true);
        setExplanation(data.explanation ?? null);
      } else {
        setWrong((w) => (w.includes(index) ? w : [...w, index]));
        if (data.attemptsLeft === 0) {
          setLocked(true);
          setError("Tu as utilisé tes deux essais pour aujourd'hui : reviens demain pour un nouveau défi !");
        }
      }
      onResult(Boolean(data.correct), data.xpGained ?? 0, data.progress?.xp);
    } catch {
      setSelected(null);
      setError("Connexion impossible. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  const visuals = VISUALS[challenge.id];
  const askPicto = visuals?.ask ?? THEME_ASK.find(([re]) => re.test(challenge.theme))?.[1] ?? "idees-ampoules";
  const palouPose = completed ? "Celebration" : wrong.length > 0 ? "Encouragement" : "Question";
  const fresh = !completed && !locked && wrong.length === 0;

  return (
    <section className={`dcc${fresh ? " dcc-new" : ""}`} aria-labelledby="dcc-title">
      <div className="dcc-head">
        <div className="dcc-palou" aria-hidden="true">
          <img src={`/images/palou/Palou_${palouPose}.png`} alt="" />
        </div>
        <div className="dcc-titles">
          <span className="dcc-eyebrow">Défi éclair du jour • {challenge.theme}</span>
          <h3 className="dcc-title" id="dcc-title">L&apos;énigme de Palou</h3>
        </div>
        {fresh && <span className="dcc-badge-new"><Sparkles size={16} /> Nouveau !</span>}
        <div className="dcc-xp">
          <Star size={18} color="#f59e0b" fill="#f59e0b" /> +{challenge.xp} XP
          {completed && <span className="ok"><Check size={16} /> Réussi</span>}
        </div>
      </div>

      <div className="dcc-ask">
        <Pic className="dcc-ask-img" src={pictoSrc(askPicto)} />
        <div className="dcc-question">{challenge.question}</div>
      </div>

      <div className="dcc-options" role="group" aria-label="Choisis ta réponse">
        {challenge.options.map((option, idx) => {
          const isWrong = wrong.includes(idx);
          const isRight = completed && selected === idx;
          return (
            <button
              key={idx}
              type="button"
              className={`dcc-opt${isRight ? " ok" : isWrong ? " no" : ""}`}
              onClick={() => answer(idx)}
              disabled={completed || locked || busy || isWrong}
            >
              <span className="dcc-letter" aria-hidden="true">
                {isRight ? <Check size={18} /> : isWrong ? <X size={18} /> : String.fromCharCode(65 + idx)}
              </span>
              <Pic className="dcc-opt-img" src={pictoSrc(visuals?.options[idx])} />
              <span className="dcc-opt-text">{option}</span>
            </button>
          );
        })}
      </div>

      <div role="status" aria-live="polite">
        {completed && explanation && (
          <div className="dcc-msg good">
            <PartyPopper size={26} color="#10b981" />
            <span>{explanation}</span>
          </div>
        )}
        {!completed && wrong.length > 0 && !locked && (
          <div className="dcc-msg try">
            <Lightbulb size={24} color="#f59e0b" />
            <span>Presque ! Réfléchis bien à ce que Palou t&apos;a appris et retente ta chance !</span>
          </div>
        )}
        {error && <div className="dcc-msg err" role="alert">{error}</div>}
      </div>

      {finished && (
        <div className="dcc-done">
          <button type="button" className="dcc-ok" onClick={close}><Check size={22} /> J&apos;ai compris !</button>
          <span className="dcc-back">Une nouvelle question t&apos;attend demain.</span>
        </div>
      )}
    </section>
  );
}
