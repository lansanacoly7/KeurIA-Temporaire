"use client";

import "./parcours79.css";
import "./adventure79.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { celebrate } from "./fx";
import { Icon79 } from "./Icons79";
import { PalouImg } from "./Img79";
import { sfx } from "./sound";
import { UI_PHRASES, sayUi, type UiKey } from "./uiVoice";

type Riddle = { id: number; question: string; options: string[]; xp: number; lessonTitle?: string | null };
type Result = { correct: boolean; answer: number; correctIndex: number; explanation: string; xpGained: number };

// Les mots de Palou après la réponse (leurs fichiers de voix : content/voix-ui.json, clés « defi-… »).
const CONGRATS: UiKey[] = ["defi-bravo-1", "defi-bravo-2", "defi-bravo-3"];
const ENCOURAGE: UiKey[] = ["defi-courage-1", "defi-courage-2", "defi-courage-3"];

/**
 * L'énigme de Palou (parcours 7-9) : une énigme par jour, qui revient chaque jour à minuit. Le serveur ne la choisit que parmi
 * les leçons que l'enfant a terminées. Un seul essai : bonne réponse = +10 XP et des félicitations ; mauvaise réponse = un mot
 * d'encouragement ; dans les deux cas l'explication. Une fois « J'ai compris » touché, la carte disparaît jusqu'à demain.
 * La bonne réponse n'arrive dans le navigateur qu'après la réponse de l'enfant.
 */
export function DailyChallenge79({ onResult }: { onResult: (correct: boolean, xpGained: number, totalXp?: number) => void }) {
  const [riddle, setRiddle] = useState<Riddle | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = useRef("");

  const load = useCallback(() => {
    day.current = new Date().toDateString();
    fetch("/api/daily-riddle", { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        // Pas d'énigme (aucune leçon terminée) ou déjà répondue aujourd'hui : la carte reste cachée jusqu'à demain.
        if (!d?.riddle || d.answered) { setRiddle(null); setResult(null); return; }
        setRiddle(d.riddle);
        setPicked(null);
        setResult(null);
        setError(null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // À minuit, la nouvelle énigme arrive sans recharger la page ; au retour sur l'onglet, on vérifie aussi que le jour n'a pas changé.
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 3).getTime() - now.getTime();
    const timer = window.setTimeout(load, midnight);
    const onVisible = () => { if (document.visibilityState === "visible" && new Date().toDateString() !== day.current) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [load, riddle?.id]);

  if (!riddle) return null;

  const validate = async () => {
    if (picked === null || busy || result) return;
    sfx.tap();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-riddle", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answer: picked }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Je n’ai pas pu enregistrer ta réponse. Réessaie !"); return; }
      const outcome: Result = { correct: Boolean(data.correct), answer: data.answer ?? picked, correctIndex: data.correctIndex, explanation: data.explanation ?? "", xpGained: data.xpGained ?? 0 };
      setResult(outcome);
      if (outcome.correct) {
        sfx.win();
        void celebrate();
        void sayUi(CONGRATS[riddle.id % CONGRATS.length]);
      } else {
        sfx.almost();
        void sayUi(ENCOURAGE[riddle.id % ENCOURAGE.length]);
      }
      onResult(outcome.correct, outcome.xpGained, data.progress?.xp);
    } catch {
      setError("Pas de connexion. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => { sfx.tap(); setRiddle(null); };

  return (
    <section className={`a79-card a79-challenge ${result ? (result.correct ? "won" : "lost") : ""}`} aria-labelledby="a79-challenge-title">
      <header className="a79-card-head">
        <div className="a79-challenge-palou" aria-hidden="true"><PalouImg pose={result ? (result.correct ? "Celebration" : "Encouragement") : "Question"} /></div>
        <div className="a79-card-title">
          <span className="p79-eyebrow">Énigme du jour</span>
          <h2 id="a79-challenge-title">L’énigme de Palou</h2>
          {!result && <p className="a79-riddle-sub">Une nouvelle énigme chaque jour, sur ce que tu as appris.</p>}
        </div>
        {(!result || result.correct) && (
          <span className="p79-chip-big a79-xp" title="XP à gagner">
            <Icon79 name="star" size={26} className="gold" /> +{riddle.xp} XP
          </span>
        )}
      </header>

      <div className="a79-question">{riddle.question}</div>

      <div className="a79-options" role="group" aria-label="Choisis ta réponse">
        {riddle.options.map((option, idx) => {
          const isRight = result !== null && idx === result.correctIndex;
          const isWrong = result !== null && !result.correct && idx === result.answer;
          return (
            <button
              key={idx}
              type="button"
              className={`a79-opt ${isRight ? "ok" : isWrong ? "no" : ""} ${!result && picked === idx ? "picked" : ""}`}
              onClick={() => { if (!result && !busy) { sfx.tap(); setPicked(idx); } }}
              disabled={result !== null || busy}
              aria-pressed={result ? isRight : picked === idx}
            >
              <span className="a79-letter" aria-hidden="true">
                {isRight ? <Icon79 name="check" size={24} /> : isWrong ? <Icon79 name="close" size={22} /> : String.fromCharCode(65 + idx)}
              </span>
              <span className="a79-opt-label">{option}</span>
            </button>
          );
        })}
      </div>

      {!result && (
        <div className="a79-riddle-actions">
          <button type="button" className="p79-btn" onClick={() => void validate()} disabled={picked === null || busy}>
            <Icon79 name="check" size={26} /> {busy ? "Je regarde…" : "Je valide ma réponse"}
          </button>
          {picked === null && <span className="a79-riddle-hint">Touche une réponse, puis valide. Tu n’as qu’un essai !</span>}
        </div>
      )}

      <div role="status" aria-live="polite">
        {error && <div className="a79-feedback no" role="alert"><Icon79 name="help" size={28} /><span>{error}</span></div>}
        {result && (
          <div className="a79-result">
            <div className={`a79-feedback ${result.correct ? "ok" : "no"}`}>
              <Icon79 name={result.correct ? "trophy" : "bulb"} size={30} />
              <span>
                <b>{UI_PHRASES[result.correct ? CONGRATS[riddle.id % CONGRATS.length] : ENCOURAGE[riddle.id % ENCOURAGE.length]]}</b>
                {result.correct && result.xpGained > 0 && <em className="a79-xp-won">+{result.xpGained} XP</em>}
              </span>
            </div>
            <div className="a79-explain">
              <span className="p79-tag">Pour comprendre</span>
              {!result.correct && <p className="a79-explain-answer">La bonne réponse était : <b>{riddle.options[result.correctIndex]}</b></p>}
              <p>{result.explanation}</p>
              {riddle.lessonTitle && <small>Tu l’as appris dans la leçon « {riddle.lessonTitle} ».</small>}
            </div>
            <button type="button" className="p79-btn" onClick={close}>
              <Icon79 name="check" size={26} /> J’ai compris !
            </button>
            <p className="a79-riddle-back">Une nouvelle énigme t’attend demain.</p>
          </div>
        )}
      </div>
    </section>
  );
}
