"use client";

import { useState, useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import { BookOpen, CircleHelp, Lightbulb, MousePointerClick, Search, SearchX, Sparkles, Star, Target, X } from "lucide-react";
import { DictionaryEntry, FAVORITES_KEY, Filter, GlossaryMeta, GlossaryTermDto, QuizQuestion, WordIcon, buildQuiz, explorerTitle, loadFavorites, playPop } from "./DictionaryParts";

export function DictionaryView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [entries, setEntries] = useState<DictionaryEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [meta, setMeta] = useState<GlossaryMeta | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<{ questions: QuizQuestion[]; index: number; score: number; picked: string | null } | null>(null);

  useEffect(() => { setFavorites(loadFavorites()); }, []);

  const toggleFavorite = (word: string) => {
    setFavorites((current) => {
      const next = current.includes(word) ? current.filter((w) => w !== word) : [...current, word];
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch { /* favoris facultatifs : on continue sans les mémoriser */ }
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    // « ?v=2 » : les navigateurs gardent indéfiniment une redirection permanente (308) ; une URL neuve ignore celle de l'ancienne configuration.
    fetch("/api/curriculum/glossary/?v=2")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: GlossaryMeta & { terms: GlossaryTermDto[] }) => {
        if (cancelled) return;
        setEntries(data.terms.map(({ background, ...term }) => ({ ...term, bg: background })));
        setMeta({ total: data.total, discovered: data.discovered, next: data.next, lockedForLearner: data.lockedForLearner });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCardClick = (entry: DictionaryEntry) => {
    playPop();
    setSelectedEntry(entry);
    confetti({
      particleCount: 40,
      spread: 80,
      origin: { y: 0.6 },
      zIndex: 10000
    });
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedEntry(null);
      setIsClosing(false);
    }, 400);
  };

  // Le mot du jour change à minuit (heure locale) et vient du vrai dictionnaire chargé depuis le serveur.
  const wordOfTheDay = entries && entries.length > 0
    ? entries[Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000) % entries.length]
    : null;

  const filteredEntries = (entries ?? []).filter(entry =>
    (filter === "all" || (filter === "fav" ? favorites.includes(entry.word) : entry.isNew)) &&
    (entry.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.definition.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const newCount = useMemo(() => (entries ?? []).filter(e => e.isNew).length, [entries]);
  const discoveredCount = entries?.length ?? 0;
  const totalCount = meta?.total ?? discoveredCount;
  const isLearnerView = meta?.lockedForLearner ?? false;
  const quizAvailable = discoveredCount >= 3;

  const startQuiz = () => {
    if (!entries || entries.length < 3) return;
    playPop();
    setQuiz({ questions: buildQuiz(entries), index: 0, score: 0, picked: null });
  };
  const answerQuiz = (choice: string) => {
    if (!quiz || quiz.picked) return;
    const right = choice === quiz.questions[quiz.index].entry.word;
    if (right) confetti({ particleCount: 35, spread: 70, origin: { y: 0.7 }, zIndex: 20000 });
    setQuiz({ ...quiz, picked: choice, score: quiz.score + (right ? 1 : 0) });
  };
  const nextQuizStep = () => {
    if (!quiz) return;
    setQuiz({ ...quiz, index: quiz.index + 1, picked: null });
  };

  return (
    <div className="dash-content dict-container">
      <div className="dict-header">
        <div className="dict-header-text">
          <span>MON VOCABULAIRE IA</span>
          <h2>Le Dictionnaire Magique</h2>
          <p>Clique sur une carte pour découvrir son secret !</p>
        </div>
        <div className="dict-search">
          <input 
            type="text" 
            placeholder="Chercher un mot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon"><Search size={20} color="#64748b" /></span>
        </div>
      </div>
      
      {isLearnerView && entries !== null && (
        <section className="dict-progress" aria-label="Ma collection de mots">
          <div className="dict-progress-top">
            <div>
              <span className="dict-progress-title">{explorerTitle(discoveredCount, totalCount)}</span>
              <p className="dict-progress-count"><b>{discoveredCount}</b> mot{discoveredCount > 1 ? "s" : ""} découvert{discoveredCount > 1 ? "s" : ""} sur {totalCount}</p>
            </div>
            {quizAvailable && (
              <button type="button" className="dict-quiz-btn" onClick={startQuiz}><Target size={22} aria-hidden="true" /> Quiz des mots</button>
            )}
          </div>
          <div className="dict-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={totalCount} aria-valuenow={discoveredCount} aria-label="Mots découverts">
            <i style={{ width: `${totalCount > 0 ? Math.round((discoveredCount / totalCount) * 100) : 0}%` }} />
          </div>
          <p className="dict-progress-hint">
            {discoveredCount === 0
              ? "Ton dictionnaire est vide pour l’instant. Chaque leçon terminée y ajoute un mot !"
              : meta?.next
                ? `Prochain mot secret : termine la leçon « ${meta.next.lessonTitle} ».`
                : "Bravo, tu as découvert tous les mots !"}
          </p>
        </section>
      )}

      {entries !== null && discoveredCount > 0 && (
        <div className="dict-filters" role="group" aria-label="Filtrer les mots">
          <button type="button" className={filter === "all" ? "on" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Tous</button>
          <button type="button" className={filter === "fav" ? "on" : ""} aria-pressed={filter === "fav"} onClick={() => setFilter("fav")}><Star size={18} aria-hidden="true" /> Mes favoris{favorites.length > 0 ? ` (${favorites.filter(w => entries.some(e => e.word === w)).length})` : ""}</button>
          {newCount > 0 && <button type="button" className={filter === "new" ? "on" : ""} aria-pressed={filter === "new"} onClick={() => setFilter("new")}><Sparkles size={18} aria-hidden="true" /> Nouveaux ({newCount})</button>}
        </div>
      )}

      {wordOfTheDay && !searchTerm && filter === "all" && (
        <section
          aria-label="Le mot magique du jour"
          style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)', borderRadius: 28, padding: '28px 32px', border: '2px solid #bbf7d0', marginBottom: 32 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Lightbulb size={40} color="#f59e0b" />
              <div>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Le mot magique du jour</span>
                <h3 style={{ fontSize: 40, fontWeight: 900, color: '#173e3c', margin: '4px 0 0', fontFamily: "'Fredoka', cursive", lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 12 }}><WordIcon word={wordOfTheDay.word} size={36} color="#0d846e" /> {wordOfTheDay.word}</h3>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 20 }}>
            <div style={{ background: 'rgba(255,255,255,0.9)', padding: 24, borderRadius: 22 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Définition simple</span>
              <p style={{ fontSize: 24, color: '#1e293b', lineHeight: 1.5, margin: '10px 0 0', fontWeight: 700 }}>{wordOfTheDay.definition}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.9)', padding: 24, borderRadius: 22 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Exemple de la vie courante</span>
              <p style={{ fontSize: 22, color: '#334155', lineHeight: 1.5, margin: '10px 0 0', fontWeight: 600 }}>{wordOfTheDay.example}</p>
            </div>
          </div>
        </section>
      )}

      <div className="dict-grid">
        {filteredEntries.length === 0 ? (
          <div className="dict-empty">
            <span className="dict-empty-icon"><SearchX size={44} color="#94a3b8" /></span>
            <p className="dict-empty-title">
              {loadError ? "Le dictionnaire est indisponible..."
                : entries === null ? "Chargement..."
                : discoveredCount === 0 && isLearnerView ? "Ton dictionnaire t’attend !"
                : filter === "fav" && !searchTerm ? "Pas encore de favori"
                : "Aucun mot trouvé..."}
            </p>
            <p className="dict-empty-sub">
              {loadError ? "Réessaie dans un instant !"
                : entries === null ? "Palou ouvre le dictionnaire."
                : discoveredCount === 0 && isLearnerView ? "Termine ta première leçon pour y trouver ton tout premier mot."
                : filter === "fav" && !searchTerm ? "Touche l’étoile d’un mot pour le garder ici."
                : "Essaie de chercher autre chose !"}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.word}
              className="dict-card-front"
              style={{ background: entry.bg }}
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick(entry)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(entry); } }}
            >
              {entry.isNew && <span className="dict-new-ribbon">Nouveau !</span>}
              <button
                type="button"
                className={`dict-fav ${favorites.includes(entry.word) ? "on" : ""}`}
                aria-label={favorites.includes(entry.word) ? `Retirer ${entry.word} des favoris` : `Ajouter ${entry.word} aux favoris`}
                aria-pressed={favorites.includes(entry.word)}
                onClick={(e) => { e.stopPropagation(); toggleFavorite(entry.word); }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Star size={22} fill={favorites.includes(entry.word) ? "#f59e0b" : "none"} color={favorites.includes(entry.word) ? "#f59e0b" : "#64748b"} />
              </button>
              <div className="dict-card-icon-wrapper">
                <span className="dict-card-icon"><WordIcon word={entry.word} size={46} color="#173e3c" /></span>
              </div>
              <h3 className="dict-card-word">{entry.word}</h3>
              <div className="dict-card-hint"><MousePointerClick size={16} color="var(--brand-mid, #0f755f)" /></div>
            </div>
          ))
        )}
        {isLearnerView && meta?.next && filter === "all" && !searchTerm && entries !== null && (
          <div className="dict-card-mystery" aria-label="Un mot secret à découvrir">
            <div className="dict-card-icon-wrapper"><span className="dict-card-icon"><CircleHelp size={46} color="#6a7d76" strokeWidth={1.8} aria-hidden="true" /></span></div>
            <h3 className="dict-card-word">Mot secret</h3>
            <p>Termine la leçon<br /><b>« {meta.next.lessonTitle} »</b><br />pour le découvrir !</p>
          </div>
        )}
      </div>

      {selectedEntry && (
        <div className={`dict-modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
          <div role="presentation" className={`dict-modal-inner ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button className="dict-modal-close" onClick={handleClose} aria-label="Fermer"><X size={18} /></button>
            
            <div className="dict-modal-left">
              <div className="dict-modal-title-row">
                <div className="dict-modal-icon" style={{ background: selectedEntry.bg }}>
                  <WordIcon word={selectedEntry.word} size={46} color="#173e3c" />
                </div>
                <h2>{selectedEntry.word}</h2>
              </div>
              
              <div className="dict-modal-body">
                <p className="dict-modal-def">{selectedEntry.definition}</p>
                <div className="dict-modal-example">
                  <div className="dict-example-label"><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Lightbulb size={16} color="#f59e0b" /> Exemple</span></div>
                  <span className="dict-example-text">{selectedEntry.example}</span>
                </div>
                {selectedEntry.lesson && <p className="dict-modal-lesson"><BookOpen size={20} aria-hidden="true" /> Tu l’as appris dans la leçon « {selectedEntry.lesson.title} »</p>}
              </div>
            </div>

            <div className="dict-modal-right">
              <div className="dict-palou-large">
                <img src="/images/palou/Palou_Content.png" alt="Palou" />
              </div>
            </div>
          </div>
        </div>
      )}

      {quiz && (
        <div className="dict-modal-overlay" onClick={() => setQuiz(null)} role="presentation">
          <div role="dialog" aria-modal="true" aria-label="Quiz des mots" className="dict-quiz" onClick={(e) => e.stopPropagation()}>
            <button className="dict-modal-close" onClick={() => setQuiz(null)} aria-label="Fermer le quiz"><X size={18} /></button>
            {quiz.index < quiz.questions.length ? (
              <>
                <span className="dict-quiz-step">Question {quiz.index + 1} sur {quiz.questions.length}</span>
                <p className="dict-quiz-q">Quel mot correspond à cette phrase ?</p>
                <p className="dict-quiz-def">« {quiz.questions[quiz.index].entry.definition} »</p>
                <div className="dict-quiz-choices">
                  {quiz.questions[quiz.index].choices.map((choice) => {
                    const answer = quiz.questions[quiz.index].entry.word;
                    const state = !quiz.picked ? "" : choice === answer ? "right" : choice === quiz.picked ? "wrong" : "dim";
                    return <button key={choice} type="button" className={`dict-quiz-choice ${state}`} disabled={!!quiz.picked} onClick={() => answerQuiz(choice)}>{choice}</button>;
                  })}
                </div>
                {quiz.picked && (
                  <div className="dict-quiz-feedback">
                    <p>{quiz.picked === quiz.questions[quiz.index].entry.word ? "Bravo, c’est ça !" : `Presque ! C’était « ${quiz.questions[quiz.index].entry.word} ».`}</p>
                    <button type="button" className="dict-play-btn" onClick={nextQuizStep}>{quiz.index + 1 < quiz.questions.length ? "Question suivante" : "Voir mon score"}</button>
                  </div>
                )}
              </>
            ) : (
              <div className="dict-quiz-end">
                <p className="dict-quiz-score">{quiz.score} / {quiz.questions.length}</p>
                <p className="dict-quiz-q">{quiz.score === quiz.questions.length ? "Parfait, tu connais tous ces mots !" : quiz.score >= 3 ? "Très bien, continue comme ça !" : "Relis tes mots et réessaie, tu vas y arriver !"}</p>
                <div className="dict-quiz-actions">
                  <button type="button" className="dict-play-btn" onClick={startQuiz}>Rejouer</button>
                  <button type="button" className="dict-quiz-close" onClick={() => setQuiz(null)}>Fermer</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .dict-progress { background: white; border-radius: 24px; padding: 22px 28px; margin-bottom: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .dict-progress-top { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
        .dict-progress-title { color: var(--brand-mid, #0d846e); font-weight: 900; font-size: 18px; font-family: 'Fredoka', cursive; letter-spacing: 0.5px; }
        .dict-progress-count { margin: 4px 0 0; font-size: 20px; font-weight: 700; color: var(--brand, #173e3c); }
        .dict-progress-count b { font-size: 28px; color: var(--brand-mid, #0d846e); }
        .dict-progress-bar { height: 16px; background: #e8f0ec; border-radius: 99px; overflow: hidden; margin: 14px 0 10px; }
        .dict-progress-bar i { display: block; height: 100%; background: linear-gradient(90deg, var(--brand-mid, #0d846e), var(--brand-accent, #d9ef59)); border-radius: 99px; transition: width 0.6s ease; }
        .dict-progress-hint { margin: 0; font-size: 17px; font-weight: 600; color: #4b635c; }
        .dict-quiz-btn { background: var(--brand-accent, #d9ef59); color: var(--brand, #173e3c); border: none; padding: 12px 22px; border-radius: 30px; font-size: 18px; font-weight: 800; cursor: pointer; font-family: 'Fredoka', cursive; box-shadow: 0 6px 14px rgba(0,0,0,0.12); }
        .dict-quiz-btn:hover { transform: translateY(-2px); }
        .dict-quiz-btn, .dict-filters button, .dict-modal-lesson { display: inline-flex; align-items: center; gap: 8px; }
        .dict-card-icon { display: flex; align-items: center; justify-content: center; }
        .dict-filters { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 22px; }
        .dict-filters button { background: white; border: 2px solid #d6e2cc; color: var(--brand, #173e3c); padding: 10px 18px; border-radius: 99px; font-size: 17px; font-weight: 700; cursor: pointer; }
        .dict-filters button.on { background: var(--brand-mid, #0d846e); border-color: var(--brand-mid, #0d846e); color: white; }
        .dict-new-ribbon { position: absolute; top: 14px; left: -6px; background: #ef4444; color: white; font-weight: 900; font-size: 14px; padding: 5px 14px 5px 12px; border-radius: 0 12px 12px 0; box-shadow: 0 4px 10px rgba(239,68,68,0.35); transform: rotate(-3deg); }
        .dict-fav { position: absolute; top: 12px; right: 12px; width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.7); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s; }
        .dict-fav:hover { transform: scale(1.15); }
        .dict-card-mystery { height: 250px; border-radius: 30px; border: 5px dashed #b6c9c0; background: rgba(255,255,255,0.6); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 12px; color: #4b635c; }
        .dict-card-mystery p { margin: 6px 0 0; font-size: 16px; font-weight: 600; line-height: 1.4; }
        .dict-card-mystery .dict-card-word { font-size: 24px; margin: 0; }
        .dict-modal-lesson { margin: 18px 0 0; font-size: 17px; font-weight: 700; color: #4b635c; }
        .dict-quiz { position: relative; width: 100%; max-width: 640px; background: white; border-radius: 32px; border: 8px solid white; padding: 36px 32px; box-shadow: 0 30px 60px rgba(0,0,0,0.3); text-align: center; max-height: 90vh; overflow-y: auto; }
        .dict-quiz-step { font-weight: 800; color: #6a7d76; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
        .dict-quiz-q { font-size: 22px; font-weight: 800; color: var(--brand, #173e3c); margin: 10px 0; }
        .dict-quiz-def { font-size: 26px; font-weight: 700; color: var(--brand-mid, #0d846e); line-height: 1.4; margin: 6px 0 22px; }
        .dict-quiz-choices { display: grid; gap: 12px; }
        .dict-quiz-choice { background: #f0f9f1; border: 3px solid #d6e2cc; border-radius: 20px; padding: 16px; font-size: 22px; font-weight: 800; color: var(--brand, #173e3c); cursor: pointer; font-family: 'Fredoka', cursive; }
        .dict-quiz-choice:hover:not(:disabled) { border-color: var(--brand-mid, #0d846e); transform: scale(1.02); }
        .dict-quiz-choice.right { background: #bbf7d0; border-color: #16a34a; }
        .dict-quiz-choice.wrong { background: #fecaca; border-color: #dc2626; }
        .dict-quiz-choice.dim { opacity: 0.5; }
        .dict-quiz-feedback { margin-top: 20px; } .dict-quiz-feedback p { font-size: 20px; font-weight: 800; color: var(--brand, #173e3c); margin: 0 0 12px; }
        .dict-quiz-feedback .dict-play-btn, .dict-quiz-actions .dict-play-btn { margin: 0 auto; }
        .dict-quiz-score { font-size: 64px; font-weight: 900; color: var(--brand-mid, #0d846e); margin: 0; font-family: 'Fredoka', cursive; }
        .dict-quiz-actions { display: flex; gap: 12px; justify-content: center; margin-top: 18px; flex-wrap: wrap; }
        .dict-quiz-close { background: white; border: 3px solid #d6e2cc; border-radius: 30px; padding: 15px 25px; font-size: 18px; font-weight: 700; cursor: pointer; color: var(--brand, #173e3c); }
        .dict-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .dict-header {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          background: white;
          padding: 30px;
          border-radius: 20px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          margin-bottom: 40px;
          border-bottom: 4px solid var(--brand-mid, #0d846e);
        }
        .dict-header-text span {
          color: #6a7d76;
          font-weight: 800;
          font-size: 0.9rem;
          letter-spacing: 2px;
        }
        .dict-header-text h2 {
          color: var(--brand-mid, #0d846e);
          font-size: 2.5rem;
          margin: 10px 0;
          font-family: 'Fredoka', cursive;
        }
        .dict-header-text p {
          color: var(--brand, #173e3c);
          font-size: 1.1rem;
          font-weight: 600;
        }
        .dict-search {
          position: relative;
          width: 100%;
          max-width: 350px;
        }
        .dict-search input {
          width: 100%;
          padding: 15px 15px 15px 50px;
          border-radius: 30px;
          border: 3px solid var(--brand-accent, #d9ef59);
          font-size: 1.1rem;
          font-weight: bold;
          outline: none;
          transition: border-color 0.3s;
        }
        .dict-search input:focus {
          border-color: var(--brand-mid, #0d846e);
        }
        .search-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.5rem;
        }
        .dict-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(250px, 100%), 1fr));
          gap: 30px;
        }
        .dict-empty {
          grid-column: 1 / -1;
          background: white;
          border: 4px dashed #a3c2b8;
          border-radius: 30px;
          padding: 50px;
          text-align: center;
        }
        .dict-empty-icon {
          font-size: 4rem;
          display: block;
          margin-bottom: 15px;
        }
        .dict-empty-title {
          font-size: 1.5rem;
          color: var(--brand, #173e3c);
          font-weight: bold;
        }
        
        .dict-card-front {
          position: relative;
          height: 250px;
          border-radius: 30px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 5px solid rgba(255,255,255,0.4);
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.4, 0.2, 0.2, 1), box-shadow 0.3s;
        }
        .dict-card-front:hover {
          transform: scale(1.05) translateY(-5px);
          box-shadow: 0 20px 45px rgba(0,0,0,0.15);
        }
        .dict-card-icon-wrapper {
          background: rgba(255,255,255,0.3);
          width: 90px;
          height: 90px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 15px;
          box-shadow: inset 0 5px 10px rgba(0,0,0,0.1);
          transition: transform 0.3s;
        }
        .dict-card-front:hover .dict-card-icon-wrapper {
          transform: scale(1.1) rotate(10deg);
        }
        .dict-card-icon {
          font-size: 3rem;
        }
        .dict-card-word {
          color: var(--brand, #173e3c);
          font-size: 2rem;
          font-weight: 900;
          text-align: center;
          padding: 0 12px;
          text-transform: uppercase;
          font-family: 'Fredoka', cursive;
        }
        .dict-card-hint {
          position: absolute;
          bottom: 15px;
          right: 15px;
          background: rgba(255,255,255,0.4);
          width: 35px;
          height: 35px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          animation: dictBounce 2s infinite;
        }

        /* Modal Styles */
        .dict-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(5px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .dict-modal-inner {
          width: 100%;
          max-width: 900px;
          height: 80vh;
          max-height: 600px;
          background: white;
          border-radius: 40px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          box-shadow: 0 30px 60px rgba(0,0,0,0.3);
          animation: modalFlipIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          border: 8px solid white;
        }
        @media (min-width: 768px) {
          .dict-modal-inner {
            flex-direction: row;
          }
        }
        
        @keyframes modalFlipIn {
          0% { transform: perspective(2000px) rotateY(-180deg) scale(0.3); opacity: 0; }
          100% { transform: perspective(2000px) rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes modalFlipOut {
          0% { transform: perspective(2000px) rotateY(0deg) scale(1); opacity: 1; }
          100% { transform: perspective(2000px) rotateY(-180deg) scale(0.3); opacity: 0; }
        }
        @keyframes fadeOut {
          from { opacity: 1; backdrop-filter: blur(5px); }
          to { opacity: 0; backdrop-filter: blur(0px); }
        }
        
        .dict-modal-overlay.closing {
          animation: fadeOut 0.4s ease forwards;
        }
        .dict-modal-inner.closing {
          animation: modalFlipOut 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .dict-modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: #ff7675;
          color: white;
          border: none;
          width: 45px;
          height: 45px;
          border-radius: 50%;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          z-index: 10;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          transition: transform 0.2s, background 0.2s;
        }
        .dict-modal-close:hover {
          transform: scale(1.1) rotate(90deg);
          background: #d63031;
        }

        .dict-modal-left {
          flex: 2;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #fdfdfd;
          border-right: 4px dashed #e2ebf0;
          overflow-y: auto;
        }
        .dict-modal-title-row {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
        }
        .dict-modal-icon {
          width: 80px;
          height: 80px;
          border-radius: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          transform: rotate(-10deg);
        }
        .dict-modal-title-row h2 {
          font-size: 3.5rem;
          color: var(--brand, #173e3c);
          font-family: 'Fredoka', cursive;
          margin: 0;
          line-height: 1;
        }
        
        .dict-modal-body {
          flex: 1;
        }
        /* Hiérarchie : la définition est le texte principal (la plus grande), l'exemple vient ensuite. Spécificité renforcée
           pour ne pas être écrasée par les règles globales des paragraphes. */
        .dict-modal-inner .dict-modal-left .dict-modal-body p.dict-modal-def {
          font-size: clamp(24px, 2.6vw, 30px) !important; /* en px : le rem de cette page vaut ~14 px */
          color: #173e3c;
          font-weight: 700;
          line-height: 1.4;
          margin: 0 0 28px;
        }
        .dict-modal-example {
          background: #f0f9f1;
          border: 3px solid var(--brand-tint, #d6e2cc);
          border-radius: 20px;
          padding: 20px;
        }
        .dict-example-label {
          color: var(--brand-mid, #0d846e);
          font-size: 16px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }
        .dict-example-text {
          color: var(--brand, #173e3c);
          font-size: 22px;
          font-style: italic;
          font-weight: 600;
          line-height: 1.4;
        }

        .dict-modal-right {
          flex: 1;
          background: #f0f9f1;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .dict-palou-large {
          width: 180px;
          height: 180px;
          margin-bottom: 20px;
          transition: transform 0.3s;
        }
        .dict-palou-large img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1));
        }
        .dict-palou-large.speaking {
          animation: dictBounce 1s infinite;
        }
        .dict-palou-msg {
          color: #6a7d76;
          font-size: 1.1rem;
          font-weight: bold;
          margin-bottom: 20px;
          max-width: 80%;
        }
        .dict-play-btn {
          background: var(--brand-mid, #0d846e);
          color: white;
          border: none;
          padding: 15px 25px;
          border-radius: 30px;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(13,132,110,0.3);
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dict-play-btn:hover {
          background: var(--brand-2, #174e49);
          transform: translateY(-3px);
          box-shadow: 0 12px 25px rgba(13,132,110,0.4);
        }
        .dict-play-btn.active {
          background: var(--brand-accent, #d9ef59);
          color: var(--brand, #173e3c);
          animation: dictPulse 1.5s infinite;
        }

        @keyframes dictBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes dictPulse {
          0% { box-shadow: 0 0 0 0 rgba(217, 239, 89, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(217, 239, 89, 0); }
          100% { box-shadow: 0 0 0 0 rgba(217, 239, 89, 0); }
        }

        @media (max-width: 768px) {
          .dict-header {
            padding: 20px 16px;
            gap: 14px;
            margin-bottom: 24px;
            border-radius: 18px;
          }
          .dict-header-text h2 {
            font-size: clamp(24px, 6.5vw, 2rem);
            margin: 6px 0;
          }
          .dict-header-text p {
            font-size: 15px;
          }
          .dict-search {
            max-width: 100%;
          }
          .dict-search input {
            padding: 12px 14px 12px 44px;
            font-size: 16px;
          }
          .dict-grid {
            grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
            gap: 16px;
          }
          .dict-card-front {
            height: 190px;
            border-radius: 22px;
          }
          .dict-card-icon-wrapper {
            width: 68px;
            height: 68px;
            margin-bottom: 8px;
          }
          .dict-card-icon {
            font-size: 2.2rem;
          }
          .dict-card-word {
            font-size: 1.5rem;
          }
          .dict-modal-overlay {
            padding: 12px;
          }
          .dict-modal-inner {
            height: auto;
            max-height: calc(100dvh - 24px);
            border-radius: 24px;
            border-width: 4px;
          }
          .dict-modal-left {
            padding: 22px 18px;
            border-right: none;
            border-bottom: 3px dashed #e2ebf0;
          }
          .dict-modal-title-row {
            gap: 14px;
            margin-bottom: 16px;
          }
          .dict-modal-icon {
            width: 54px;
            height: 54px;
            border-radius: 16px;
            font-size: 2rem;
          }
          .dict-modal-title-row h2 {
            font-size: clamp(22px, 5.5vw, 32px);
          }
          .dict-modal-inner .dict-modal-left .dict-modal-body p.dict-modal-def {
            font-size: 18px !important;
            margin: 0 0 16px;
          }
          .dict-modal-example {
            padding: 14px 16px;
            border-radius: 16px;
          }
          .dict-example-text {
            font-size: 16px;
          }
          .dict-modal-right {
            padding: 20px 16px;
          }
          .dict-palou-large {
            width: 100px;
            height: 100px;
            margin-bottom: 12px;
          }
          .dict-quiz {
            padding: 24px 16px;
            border-radius: 22px;
            border-width: 4px;
          }
          .dict-quiz-q {
            font-size: 18px;
          }
          .dict-quiz-def {
            font-size: 18px;
          }
          .dict-quiz-choice {
            font-size: 17px;
            padding: 12px;
          }
          .dict-quiz-score {
            font-size: 48px;
          }
        }
      `}} />
    </div>
  );
}
