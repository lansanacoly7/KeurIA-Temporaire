"use client";

import { useEffect, useState } from "react";
import { Volume2, RotateCcw, Check, X, Lock, Sparkles, LogOut } from "lucide-react";
import { AgeKey, World } from "../lms-data";
import { buildAdventureLesson } from "../curriculum-10-12";
import { buildCreatorLesson } from "../curriculum-13-15";
import { Lesson, learningCopy, playQuizSound } from "./dashboardShared";
import { buildYoungPilot, pilotLessons } from "./ActivitiesShared";

export function PilotLessonPlayer({ age, item, onClose, onComplete }: { age: AgeKey; item: { lesson: Lesson; module: World }; answer: number | null; setAnswer: (n: number) => void; onClose: () => void; onComplete: (score?: number) => void }) {
  const lessonIndex = Math.max(0, item.module.lessons.findIndex(l => l.id === item.lesson.id));
  const content = pilotLessons[item.lesson.id] || (item.module.id.startsWith("a") ? buildAdventureLesson(item.module.id, item.lesson.title, lessonIndex) : item.module.id.startsWith("c") ? buildCreatorLesson(item.module.id, item.lesson.title, lessonIndex) : buildYoungPilot(item));
  const labels = ["Mission", "Objectifs", "Découverte", "Jeu", "À retenir", "Création", "Quiz", "Correction", "Bravo !"];
  const [step, setStep] = useState(0);
  const [activityAnswer, setActivityAnswer] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>(content.questions.map(() => null));
  const [attempts, setAttempts] = useState(1);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [palouEmotion, setPalouEmotion] = useState("Palou_Content.png");
  const [audioPlaying, setAudioPlaying] = useState(false);

  const score = Math.round(quizAnswers.filter((a, i) => a === content.questions[i].correct).length / content.questions.length * 100);
  const quizComplete = quizAnswers.every(a => a !== null);
  const passed = quizComplete && score >= 70;
  const canNext = step === 3 ? activityAnswer === content.activity.correct : step === 6 ? quizComplete : true;

  useEffect(() => {
    if (step === 0) setPalouEmotion("Palou_Content.png");
    if (step === 1) setPalouEmotion("Palou reflexion.png");
    if (step === 2) setPalouEmotion("Palou_Question.png");
    if (step === 3 && activityAnswer === null) setPalouEmotion("Palou_Hero.png");
    if (step === 4) setPalouEmotion("Palou_Calme.png");
    if (step === 5) setPalouEmotion("Palou reflexion.png");
    if (step === 6 && !quizComplete) setPalouEmotion("Palou_Question.png");
    if (step === 7) setPalouEmotion(passed ? "Palou_Parfait.png" : "Palou_Encouragement.png");
    if (step === 8) setPalouEmotion("Palou_Celebration.png");
  }, [step, activityAnswer, quizComplete, passed]);

  const chooseQuizAnswer = (questionIndex: number, optionIndex: number) => {
    if (quizAnswers[questionIndex] !== null) return;
    const isCorrect = optionIndex === content.questions[questionIndex].correct;
    playQuizSound(isCorrect);
    setPalouEmotion(isCorrect ? "Palou_Parfait.png" : "Palou_Encouragement.png");
    setQuizAnswers(current => current.map((value, index) => index === questionIndex ? optionIndex : value));
  };

  const handleActivityAnswer = (i: number) => {
    setActivityAnswer(i);
    const isCorrect = i === content.activity.correct;
    setPalouEmotion(isCorrect ? "Palou_Parfait.png" : "Palou_Encouragement.png");
  };

  const retry = () => { setQuizAnswers(content.questions.map(() => null)); setAttempts(a => a + 1); setStep(6); setPalouEmotion("Palou_Encouragement.png"); };
  const handleQuit = () => { setPalouEmotion("Palou_Triste.png"); setShowQuitConfirm(true); };

  const playFakeAudio = () => {
    setAudioPlaying(true);
    setTimeout(() => setAudioPlaying(false), 3000);
  };

  const currentProgress = ((step + 1) / labels.length) * 100;

  return <div className="kids-lesson-fullscreen">
    <header className="kids-header">
      <h2>{item.lesson.title}</h2>
      <button className="kids-quit-btn" aria-label="Quitter le cours" onClick={handleQuit}><X size={22} /></button>
    </header>

    <div className="kids-progress-container">
      <div className="kids-progress-bar-bg">
        <div className="kids-progress-fill" style={{ width: `${currentProgress}%` }}></div>
        <img src="/images/palou/Palou_Hero.png" alt="Progression" className="kids-progress-head" style={{ left: `${currentProgress}%` }} />
      </div>
    </div>

    <div className="kids-content-area">
      <div className="kids-palou-character" style={{ background: 'transparent', border: 'none' }}>
        <img src={`/images/palou/${palouEmotion}`} alt="Palou" style={{ border: 'none', background: 'transparent', borderRadius: 0, mixBlendMode: 'normal' }} />
        <button className="kids-audio-btn" onClick={playFakeAudio}>
          <Volume2 size={20} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />{audioPlaying ? "Palou parle..." : "Écouter Palou"}
        </button>
      </div>

      <div className="kids-speech-bubble">
        {step === 0 && <div>
          <h3 style={{ color: 'var(--green)', fontSize: '2.5rem', marginBottom: '15px' }}>Ta mission</h3>
          <p>{content.mission}</p>
        </div>}

        {step === 1 && <div>
          <h3 style={{ color: 'var(--green)', fontSize: '2.5rem', marginBottom: '15px' }}>Ce qu'on va apprendre</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {content.objectives.map((o, i) => <li key={o} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <b style={{ background: 'var(--yellow)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</b>
              {o}
            </li>)}
          </ul>
        </div>}

        {step === 2 && <div>
          <h3 style={{ color: 'var(--green)', fontSize: '2.5rem', marginBottom: '15px' }}>Regarde bien !</h3>
          <p style={{ marginBottom: '20px' }}>{content.discover}</p>
          <div style={{ background: '#FFF9E6', padding: '20px', borderRadius: '20px', border: '2px solid var(--yellow)' }}>
            <b><Sparkles size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 6, color: "var(--yellow)" }} />Exemple :</b> {content.example}
          </div>
        </div>}

        {step === 3 && <div>
          <h3 style={{ color: 'var(--green)', fontSize: '2.5rem', marginBottom: '15px' }}>{content.activity.prompt}</h3>
          <div className="kids-activity-grid">
            {content.activity.options.map((o, i) => <button key={o} className={activityAnswer === i ? (i === content.activity.correct ? "correct" : "wrong") : ""} onClick={() => handleActivityAnswer(i)}>{o}</button>)}
          </div>
          {activityAnswer !== null && <p style={{ marginTop: '20px', fontWeight: 'bold', color: activityAnswer === content.activity.correct ? 'var(--green)' : '#d32f2f' }}>
            {activityAnswer === content.activity.correct ? content.activity.success : "Oups, essaie une autre réponse !"}
          </p>}
        </div>}

        {step === 4 && <div>
          <h3 style={{ color: 'var(--green)', fontSize: '2.5rem', marginBottom: '15px' }}>À retenir !</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {content.remember.map(x => <div key={x} style={{ background: '#E8F5E9', padding: '15px', borderRadius: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}><b style={{ color: 'var(--green)', display: 'flex', alignItems: 'center' }}><Check size={18} /></b> {x}</div>)}
          </div>
        </div>}

        {step === 5 && <div>
          <h3 style={{ color: 'var(--green)', fontSize: '2.5rem', marginBottom: '15px' }}>Ton grand défi créatif</h3>
          <p style={{ fontSize: '1.8rem' }}>{content.challenge}</p>
          <div style={{ marginTop: '20px', background: 'var(--yellow)', padding: '15px', borderRadius: '15px', textAlign: 'center' }}>
            Mets en pratique ce que tu as appris !
          </div>
        </div>}

        {step === 6 && <div>
          <h3 style={{ color: 'var(--green)', fontSize: '2.5rem', marginBottom: '15px' }}>Le grand quiz de Palou</h3>
          {content.questions.map((q, qi) => <article key={q.question} style={{ background: '#f5f5f5', padding: '20px', borderRadius: '20px', marginBottom: '20px' }}>
            <b style={{ fontSize: '1.4rem', display: 'block', marginBottom: '15px' }}>{qi + 1}. {q.question}</b>
            <div className="kids-activity-grid">
              {q.options.map((o, oi) => <button key={o} disabled={quizAnswers[qi] !== null} className={quizAnswers[qi] === oi ? (oi === q.correct ? "correct" : "wrong") : ""} onClick={() => chooseQuizAnswer(qi, oi)}>{o}</button>)}
            </div>
          </article>)}
          {quizComplete && <h3 style={{ color: passed ? 'var(--green)' : 'var(--ink)' }}>{passed ? "Bravo, tu as réussi !" : "Oups, regarde les corrections et réessaie."}</h3>}
        </div>}

        {step === 7 && <div>
          <h3 style={{ color: 'var(--green)', fontSize: '2.5rem', marginBottom: '15px' }}>{passed ? "Ce qu'il faut retenir" : "Ne t'inquiète pas, on apprend de ses erreurs"}</h3>
          {content.questions.map((q, i) => <div key={q.question} style={{ padding: '15px', borderLeft: quizAnswers[i] === q.correct ? '6px solid var(--green)' : '6px solid var(--yellow)', background: '#f9f9f9', marginBottom: '15px', borderRadius: '0 15px 15px 0' }}>
            <b style={{ color: quizAnswers[i] === q.correct ? 'var(--green)' : 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>{quizAnswers[i] === q.correct ? <><Check size={18} /> Super</> : <><RotateCcw size={18} /> Explication :</>}</b>
            <p style={{ margin: '10px 0 0 0' }}>{q.explain}</p>
          </div>)}
          {!passed && <button className="kids-btn-next" onClick={retry} style={{ marginTop: '20px', display: 'block', margin: '20px auto 0' }}>Réessayer le quiz</button>}
        </div>}

        {step === 8 && <div>
          <h3 style={{ color: 'var(--green)', fontSize: '3rem', marginBottom: '15px', textAlign: 'center' }}>MISSION ACCOMPLIE !</h3>
          <div style={{ textAlign: 'center' }}>
            <img src="/images/games/quiz-1.png" alt="Réussite" style={{ height: 120, margin: '20px' }} />
            <p style={{ fontSize: '1.8rem' }}>Tu as débloqué un nouveau pouvoir :</p>
            <b style={{ fontSize: '2rem', color: 'var(--green)' }}>{content.skill}</b>
          </div>
        </div>}

      </div>
    </div>

    <div className="kids-actions">
      <button className="kids-quit-btn" style={{ width: 'auto', padding: '0 20px', borderRadius: '30px', fontSize: '1.2rem', color: 'var(--ink)', borderColor: 'var(--line)' }} onClick={step === 0 ? handleQuit : () => setStep(s => s - 1)}>
        {step === 0 ? "Quitter l'aventure" : "Précédent"}
      </button>

      {step < 8 ? <button className="kids-btn-next" disabled={!canNext || (step === 7 && !passed)} onClick={() => setStep(s => s + 1)} style={{ transition: 'transform 0.1s ease', transform: 'scale(1)', boxShadow: '0 4px 0 var(--green-dark, #2b8a00)' }}>
        {step === 6 && !quizComplete ? "Réponds aux 3 questions" : step === 7 && !passed ? "Réussis le quiz" : "Continuer"}
      </button> : <button className="kids-btn-next" onClick={() => onComplete(score)} style={{ background: 'var(--yellow)', color: 'var(--ink)', boxShadow: '0 4px 0 #d4a000' }}>
        Valider et revenir au camp
      </button>}
    </div>

    {showQuitConfirm && (
      <div className="modal-bg" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
        <div style={{ background: 'white', padding: '30px', borderRadius: '30px', maxWidth: '450px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'palouPopIn 0.3s ease-out', fontFamily: 'Fredoka One, Baloo 2, cursive' }}>
          <img src="/images/palou/Palou_Triste.png" alt="Palou triste" style={{ height: 180, objectFit: 'contain', marginBottom: '20px', background: 'transparent' }} />
          <h3 style={{ fontSize: '2rem', color: 'var(--green)', marginBottom: '10px', letterSpacing: '-0.5px' }}>Tu veux vraiment t'arrêter là ?</h3>
          <p style={{ fontSize: '1.4rem', color: 'var(--ink)', marginBottom: '30px' }}>Ndeye a encore besoin de toi pour cette mission. On y était presque !</p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button style={{ padding: '15px 25px', borderRadius: '30px', border: 'none', background: 'var(--green)', color: 'white', fontSize: '1.4rem', cursor: 'pointer', flex: 1, boxShadow: '0 5px 0 #1B453C', transition: 'transform 0.1s' }} onClick={() => { setShowQuitConfirm(false); setPalouEmotion("Palou_Hero.png"); }}>Non, on continue !</button>
            <button style={{ padding: '15px 25px', borderRadius: '30px', border: '3px solid var(--line)', background: 'white', color: 'var(--ink)', fontSize: '1.4rem', cursor: 'pointer', flex: 1, transition: 'background 0.2s' }} onClick={onClose}>Oui, quitter</button>
          </div>
        </div>
      </div>
    )}
  </div>;
}

export function StandardLessonPlayer({ age, item, answer, setAnswer, onClose, onComplete }: { age: AgeKey; item: { lesson: Lesson; module: World }; answer: number | null; setAnswer: (n: number) => void; onClose: () => void; onComplete: (score?: number) => void }) {
  const c = learningCopy(item.lesson.title, item.module.description, age);
  const correctIndex = typeof (c.quiz as { correct?: number }).correct === "number" ? (c.quiz as { correct?: number }).correct! : 1;
  const [step, setStep] = useState(0);
  const [validated, setValidated] = useState<number[]>([]);
  const labels = ["Découvrir", "Mission", "Comprendre", "Vocabulaire", "Pratiquer", "Quiz", "Bilan"];
  const last = labels.length - 1;
  const canContinue = step === 5 ? answer === correctIndex : step === last || validated.includes(step);
  const confirmStep = () => setValidated(v => v.includes(step) ? v : [...v, step]);
  const chooseAnswer = (index: number) => { if (answer !== null) return; playQuizSound(index === correctIndex); setAnswer(index) };
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const handleQuit = () => setShowQuitConfirm(true);
  return <div className="lesson-player-bg"><section className="lesson-player">
    <header><div><small>{item.module.title} • {item.lesson.type.toUpperCase()}</small><h2>{item.lesson.title}</h2><span>{item.lesson.minutes} min &nbsp; {item.lesson.xp} XP</span></div><button style={{ background: "transparent", border: "none", fontSize: "1rem", cursor: "pointer", color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }} onClick={handleQuit}><LogOut size={16} /> Quitter</button></header>
    <div className="lesson-guide"><div><span>Étape {step + 1}/{labels.length}</span><b>{Math.round((step + 1) / labels.length * 100)}%</b></div><i><b style={{ width: `${(step + 1) / labels.length * 100}%` }} /></i><ol>{labels.map((label, i) => <li key={label} className={i < step ? "done" : i === step ? "active" : ""}><span>{i < step ? <Check size={14} /> : i + 1}</span><small>{label}</small></li>)}</ol></div>
    <div className="learning-content guided-content" key={step}>
      {step === 0 && <article className="learn-intro"><div><small>PALOU T’EXPLIQUE</small><h3>Ce que tu vas comprendre</h3><p>{c.concept}</p></div></article>}
      {step === 1 && <><article className="lesson-story"><span>L’AVENTURE DE PALOU</span><h3>Une mission à résoudre</h3><p>{c.story}</p></article><section className="lesson-steps"><div><h3>Mon parcours en 3 étapes</h3></div><ol>{c.steps.map((s: string, i: number) => <li key={s}><b>{i + 1}</b><span>{s}</span></li>)}</ol></section></>}
      {step === 2 && <><div className="learn-grid"><article><h3>Exemple concret</h3><p>{c.example}</p></article><article className="remember-card"><h3>À retenir</h3><p>{c.remember}</p></article></div><article className="lesson-fact"><div><h3>Le savais-tu ?</h3><p>{c.didYouKnow}</p></div></article></>}
      {step === 3 && <section className="lesson-vocab"><span>LES MOTS DE L’EXPLORATEUR</span><h3>Mon mini-dictionnaire</h3><div>{c.vocabulary.map(([word, meaning]: string[]) => <article key={word}><b>{word}</b><p>{meaning}</p></article>)}</div></section>}
      {step === 4 && <><article className="learn-challenge"><span>DÉFI MINUTE</span><h3>À toi de jouer !</h3><p>{c.challenge}</p></article><div className="lesson-actions"><article className="lesson-project"><span>MINI-PROJET</span><h3>Je crée quelque chose</h3><p>{c.project}</p></article><article className="lesson-discussion"><span>DISCUSSION</span><h3>J’explique mon point de vue</h3><p>{c.discussion}</p></article></div></>}
      {step === 5 && <article className="quick-quiz"><span>QUIZ OBLIGATOIRE</span><h3>{c.quiz.question}</h3><div>{c.quiz.options.map((option: string, i: number) => <button key={option} disabled={answer !== null} className={answer === i ? (i === correctIndex ? "correct" : "wrong") : ""} onClick={() => chooseAnswer(i)}>{option}</button>)}</div>{answer !== null && <><small className="answer-locked"><Lock size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} /> Réponse enregistrée</small><p className={answer === correctIndex ? "quiz-ok" : "quiz-hint"}>{answer === correctIndex ? `Exact ! ${c.quiz.tip}` : `Pas encore. ${c.quiz.tip}`}</p></>}</article>}
      {step === 6 && <section className="lesson-recap"><div><h3>Bravo, le parcours guidé est terminé !</h3><p>Valide ce cours pour débloquer le suivant.</p></div></section>}
      {step < 5 && <button className={validated.includes(step) ? "guided-check confirmed" : "guided-check"} onClick={confirmStep}><span>{validated.includes(step) ? <Check size={14} /> : "○"}</span><div><b>{validated.includes(step) ? "Étape validée" : "J’ai terminé cette étape"}</b><small>La validation est obligatoire pour continuer.</small></div></button>}
    </div>
    <footer><button onClick={step === 0 ? handleQuit : () => setStep(s => s - 1)}>{step === 0 ? "Quitter le cours" : "Étape précédente"}</button>{step < last ? <button className="finish" disabled={!canContinue} onClick={() => setStep(s => s + 1)}>{step === 5 && answer !== correctIndex ? "Réponds correctement" : "Continuer"}</button> : <button className="finish" onClick={() => onComplete()}>Valider et débloquer la suite • +{item.lesson.xp} XP</button>}</footer>
  </section>
    {showQuitConfirm && (
      <div className="modal-bg" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
        <div style={{ background: 'white', padding: '30px', borderRadius: '20px', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'palouPopIn 0.3s ease-out' }}>
          <img src="/images/palou/Palou_Triste.png" alt="Palou triste" style={{ height: 180, objectFit: 'contain', marginBottom: '20px' }} />
          <h3 style={{ fontSize: '24px', color: 'var(--green)', marginBottom: '10px' }}>Tu veux vraiment t'arrêter là ?</h3>
          <p style={{ fontSize: '16px', color: 'var(--ink)', marginBottom: '25px' }}>Tu étais sur une super lancée ! L'IA n'aura plus de secrets pour toi si on termine ça.</p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button style={{ padding: '12px 20px', borderRadius: '30px', border: 'none', background: 'var(--green)', color: 'white', fontWeight: 'bold', cursor: 'pointer', flex: 1 }} onClick={() => setShowQuitConfirm(false)}>Non, on continue !</button>
            <button style={{ padding: '12px 20px', borderRadius: '30px', border: '2px solid var(--line)', background: 'white', color: 'var(--ink)', fontWeight: 'bold', cursor: 'pointer', flex: 1 }} onClick={onClose}>Oui, quitter</button>
          </div>
        </div>
      </div>
    )}
  </div>
}
