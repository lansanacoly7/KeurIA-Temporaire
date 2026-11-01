"use client";

import type { Block, WorkspaceSvg } from "blockly";
import type { JavascriptGenerator } from "blockly/javascript";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, Lock, Zap, Target, FlaskConical, Gamepad2, Flag, Lightbulb, Puzzle, Cat } from "lucide-react";
import { ModuleIcon } from "../components/ModuleIcon";
import { AgeKey, games, tracks, World } from "../lms-data";
import { type DailyKind, type DailyPlan, type DailyUsage } from "../daily-plan";
import dynamic from "next/dynamic";

// Chargement à la demande des jeux avancés : évite d'inclure MediaPipe (22 Mo) et les moteurs graphiques dans le bundle principal
const GestureCameraGame = dynamic(() => import("./games/GestureCameraGame").then(m => m.GestureCameraGame), { ssr: false });
const ChatbotBuilderGame = dynamic(() => import("./AdvancedGames").then(m => m.ChatbotBuilderGame), { ssr: false });
const CreativeStudioGame = dynamic(() => import("./AdvancedGames").then(m => m.CreativeStudioGame), { ssr: false });
const DrawingGuessGame = dynamic(() => import("./AdvancedGames").then(m => m.DrawingGuessGame), { ssr: false });
const EscapeAIGame = dynamic(() => import("./AdvancedGames").then(m => m.EscapeAIGame), { ssr: false });
const ImageTrainingGame = dynamic(() => import("./AdvancedGames").then(m => m.ImageTrainingGame), { ssr: false });
const TrainYourModelGame = dynamic(() => import("./AdvancedGames").then(m => m.TrainYourModelGame), { ssr: false });
const VoiceAssistantGame = dynamic(() => import("./AdvancedGames").then(m => m.VoiceAssistantGame), { ssr: false });
import { LessonUnavailable79 } from "./parcours79/LessonUnavailable79";
import { LessonPlayer79 } from "./parcours79/LessonPlayer79";
import { getLessonContent } from "./parcours79/content";
import { ensureLesson } from "./parcours79/studioContent";
import type { LessonContent } from "./parcours79/types";
import { LessonSkeleton } from "../components/SkeletonLoader";
import { ScratchEmbed } from "./programmation/ScratchEmbed";
import { Lesson, arcadeActivityId, gameChallenges, playQuizSound } from "./dashboardShared";
import { runProgram } from "./programmation/blocklyInterpreter";
import { PilotLessonPlayer, StandardLessonPlayer } from "./ActivitiesLessonPlayers";
import { DetectIAGame, JeVoisIAGame, MemoryGame } from "./ActivitiesGamesBasic";
import { ClassifGame, PromptGame, RobotGame } from "./ActivitiesGamesClassify";
import { BalanceGame, ModelLabGame, SequenceGame } from "./ActivitiesGamesLogic";
import { QuickMissionGame } from "./ActivitiesQuickMission";

export { PilotLessonPlayer, StandardLessonPlayer } from "./ActivitiesLessonPlayers";
export { JeVoisIAGame, QuizGame, MemoryGame, DetectIAGame } from "./ActivitiesGamesBasic";
export { ClassifGame, PromptGame, RobotGame } from "./ActivitiesGamesClassify";
export { SequenceGame, BalanceGame, ModelLabGame } from "./ActivitiesGamesLogic";
export { QuickMissionGame } from "./ActivitiesQuickMission";

export function LessonPlayer({
  age,
  item,
  answer,
  setAnswer,
  onClose,
  onComplete,
  learnerName,
}: {
  age: AgeKey;
  item: { lesson: Lesson; module: World };
  answer: number | null;
  setAnswer: (n: number) => void;
  onClose: () => void;
  onComplete: (score?: number, stars?: number, then?: "map" | "next" | "replay") => void;
  learnerName: string;
  scope?: string;
}) {
  // Parcours 7-9 : la version publiée depuis le studio est chargée AVANT le lecteur (écran de chargement), puis FIGÉE
  // dans l'état ci-dessous : le contenu ne change jamais pendant qu'une leçon est en cours.
  const [content79, setContent79] = useState<LessonContent | undefined>(() => (age === "7-9" ? getLessonContent(item.lesson.id) : undefined));
  const [opening79, setOpening79] = useState(age === "7-9");

  useEffect(() => {
    if (age !== "7-9") return;
    let alive = true;
    setOpening79(true);
    // ensureLesson ne se réjouit jamais d'exception : au pire on ouvre la leçon avec le contenu déjà en mémoire.
    ensureLesson(item.lesson.id).catch(() => undefined).then(() => {
      if (!alive) return;
      setContent79(getLessonContent(item.lesson.id));
      setOpening79(false);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [age, item.lesson.id]);

  if (age === "7-9") {
    // Les 40 leçons du parcours 7-9 sont écrites (frontend/content/parcours79) et jouées par le lecteur « Palou à Dakar ».
    if (opening79) return <LessonSkeleton />;
    const lessons = item.module.lessons;
    const following = lessons[lessons.findIndex(l => l.id === item.lesson.id) + 1];
    const hasNext = !!following && !!getLessonContent(following.id);
    // Dernière leçon du module : s'il existe un module après (« p3-4 » → « p4-1 »), le bouton final mène aux îles et au saut vers la suivante.
    const chapter = /^p(\d+)-/.exec(item.lesson.id);
    const nextModule = !following && !!chapter && !!getLessonContent(`p${Number(chapter[1]) + 1}-1`);
    if (content79) return <LessonPlayer79 content={content79} firstName={learnerName} hasNext={hasNext} nextModule={nextModule} onClose={onClose} onComplete={onComplete} />;
    return <LessonUnavailable79 onClose={onClose} />;
  }
  if (age === "10-12" || age === "13-15") {
    return (
      <PilotLessonPlayer
        age={age}
        item={item}
        answer={answer}
        setAnswer={setAnswer}
        onClose={onClose}
        onComplete={onComplete}
      />
    );
  }
  return <StandardLessonPlayer age={age} item={item} answer={answer} setAnswer={setAnswer} onClose={onClose} onComplete={onComplete} />;
}

export function GamesView({ age, ageLocked, setAge, completed, onAward, usage, plan, limitsApply, onDaily }: { age: AgeKey; ageLocked: boolean; setAge: (age: AgeKey) => void; completed: string[]; onAward: (activityId: string) => Promise<void>; usage: DailyUsage; plan: DailyPlan; limitsApply: boolean; onDaily: (kind: DailyKind) => Promise<void> }) {
  const realGames = [
    ["eye", "Je vois l'IA", "Trouve les applications qui utilisent l'IA", 30, "Découverte", 1],
    ["brain", "Memory IA", "Retrouve les paires concept + symbole", 40, "Mémoire", 1],
    ["basket", "Data Basket", "Trie les données publiques et privées", 40, "Tri", 2],
    ["paw", "Classif' Express", "Classe les animaux le plus vite possible", 45, "Classification", 3],
    ["wand", "Prompt Builder", "Remets les briques d'un bon prompt dans l'ordre", 45, "Construction", 4],
    ["bot", "Robot Mission", "Guide Palou jusqu'à la cible sans toucher les obstacles", 50, "Logique", 5],
    ["music", "La séquence de Palou", "Observe puis reproduis une suite de couleurs qui s'allonge", 45, "Attention", 1],
    ["shield", "Bouclier numérique", "Choisis très vite les bons réflexes pour protéger Ndeye", 45, "Sécurité", 2],
    ["search", "Chasse aux sources", "Aide Ndeye à retrouver la preuve la plus fiable", 55, "Enquête", 4],
    ["scale", "Balance des données", "Rééquilibre les exemples avant d'entraîner Palou", 55, "Équité", 3],
    ["flask", "Model Lab", "Choisis les meilleures données pour améliorer un modèle", 60, "Expérience", 5],
    ["landmark", "Conseil de l'IA", "Prends des décisions responsables dans des situations difficiles", 60, "Éthique", 4],
    ["image", "Le grand tri d'images", "Glisse les images dans la bonne famille et entraîne Palou", 50, "Reconnaissance", 3],
    ["camera", "Gestes magiques", "Entraîne deux gestes avec la webcam puis teste la reconnaissance", 50, "Caméra", 5],
    ["pencil", "Palou devine mon dessin", "Dessine un soleil ou une maison et laisse Palou chercher", 50, "Dessin", 1],
    ["brain", "Mon premier modèle", "Crée trois catégories, ajoute des exemples puis teste la fiabilité", 60, "Entraînement", 3],
    ["message", "Fabrique ton chatbot", "Programme les réponses d'un assistant et découvre ses limites", 60, "Langage", 4],
    ["lock", "Escape game IA", "Résous les énigmes de données, d'images et de prompts pour sortir", 70, "Évasion", 5],
    ["gamepad", "Studio mini-jeu IA", "Conçois en équipe le plan d'un mini-jeu responsable", 70, "Création", 1],
    ["speech", "L'IA qui parle", "Aide Palou à parler à un assistant vocal", 80, "Langage", 4]
  ] as const;
  const activitiesByAge: Record<AgeKey, { real: number[]; quiz: number[]; challenge: [string, string, string, number] }> = {
    "7-9": { real: [0, 1, 2, 3, 6, 7, 12, 13, 14, 19], quiz: [0, 1, 2, 5], challenge: ["palette", "Mon héros numérique", "Dessine un héros qui aide les enfants à protéger leurs informations personnelles.", 45] },
    "10-12": { real: [1, 2, 3, 4, 5, 6, 8, 9, 15, 16, 19], quiz: [0, 1, 2, 3, 4, 5, 8, 9], challenge: ["school", "IA utile à mon école", "Observe un problème de ton école, imagine une solution et dessine son fonctionnement.", 75] },
    "13-15": { real: [2, 3, 4, 5, 9, 10, 11, 16, 17, 18, 19], quiz: [2, 3, 4, 5, 6, 7, 8, 9], challenge: ["scale", "Audit d’une IA responsable", "Analyse une solution IA : données, biais, sécurité, impact et améliorations possibles.", 100] }
  };
  const visible = activitiesByAge[age];
  const [mode, setMode] = useState<"games" | "quiz">("games"); const [active, setActive] = useState<number | null>(null); const [activeReal, setActiveReal] = useState<number | null>(null); const [answer, setAnswer] = useState<number | null>(null);
  // « Gagné » = enregistré par le serveur : cela survit au rechargement et aux changements d'appareil.
  const realWon = realGames.map((_, i) => i).filter(i => completed.includes(arcadeActivityId("game", i)));
  const quizWon = gameChallenges.map((_, i) => i).filter(i => completed.includes(arcadeActivityId("quiz", i)));
  const timeBlocked = limitsApply && usage.minutes >= plan.minutes; const gameBlocked = limitsApply && (timeBlocked || usage.games >= plan.games); const quizBlocked = limitsApply && (timeBlocked || usage.quizzes >= plan.quizzes);
  const challenge = active === null ? null : gameChallenges[active];
  const choose = (index: number) => { if (answer !== null || !challenge) return; playQuizSound(index === challenge.correct); setAnswer(index) };
  const claim = async () => { if (active === null || !challenge || answer !== challenge.correct || quizWon.includes(active) || quizBlocked) return; await onAward(arcadeActivityId("quiz", active)); await onDaily("quiz") };
  const winReal = async (index: number) => { if (realWon.includes(index) || gameBlocked) return; await onAward(arcadeActivityId("game", index)); await onDaily("game") };
  const ageRealWon = visible.real.filter(i => realWon.includes(i)).length;
  const ageQuizWon = visible.quiz.filter(i => quizWon.includes(i)).length;
  return <div className="dash-content games-hub">
    {(gameBlocked || quizBlocked) && <section className="daily-rest-message arcade-rest">Tu as atteint une limite de ton programme aujourd’hui. Les activités concernées seront de nouveau disponibles demain.</section>}
    <section className="games-hero"><div><span>ARCADE kEur IA</span><h1>Des jeux adaptés !</h1><p>Joue, explore et relève des défis pour gagner des points d'expérience !</p><div className="games-score"><b>{ageRealWon}/{visible.real.length} jeux gagnés</b><b>{ageQuizWon}/{visible.quiz.length} quiz réussis</b></div></div></section>
    <section className="games-toolbar"><div><span>APPRENDRE EN JOUANT</span><h2>Choisis ton activité</h2></div>{!ageLocked && <div className="age-tabs">{(Object.keys(tracks) as AgeKey[]).map(k => <button key={k} disabled={ageLocked && k !== age} className={age === k ? "sel" : ageLocked ? "locked-age" : ""} onClick={() => { setAge(k); setActive(null); setActiveReal(null); setAnswer(null) }}>{tracks[k].label}<small>{ageLocked && k !== age ? "Non attribué" : tracks[k].name}</small></button>)}</div>}</section>
    <div className="arcade-tabs"><button className={mode === "games" ? "on" : ""} onClick={() => setMode("games")}>Jeux interactifs <small>{visible.real.length} jeux</small></button><button className={mode === "quiz" ? "on" : ""} onClick={() => setMode("quiz")}>Quiz & connaissances <small>{visible.quiz.length} quiz</small></button></div>
    {mode === "games" && <><div className="section-intro"><span><Gamepad2 size={24} /></span><div><h2>Je joue et je manipule</h2><p>Activités sélectionnées pour toi.</p></div></div><section className="real-games-grid">{visible.real.map(i => { const g = realGames[i]; return <article className={realWon.includes(i) ? "real-game-card won" : "real-game-card"} key={g[1]}><div><img src={`/images/games/real-${g[5]}.png`} alt={`Illustration du jeu ${g[1]}`} /><small>{realWon.includes(i) ? "Gagné" : "+" + g[3] + " XP"}</small></div><span>{g[4]}</span><h3>{g[1]}</h3><p>{g[2]}</p><button disabled={gameBlocked} onClick={() => setActiveReal(i)}>{gameBlocked ? "Limite du jour atteinte" : realWon.includes(i) ? "Rejouer" : "Lancer le jeu"}</button></article> })}</section><section className="weekly-challenge"><span><ModuleIcon name={visible.challenge[0]} size={28} /></span><div><small>DÉFI DE LA SEMAINE</small><h2>Mission : {visible.challenge[1]}</h2><p>{visible.challenge[2]}</p></div><b>+{visible.challenge[3]} XP</b></section></>}
    {mode === "quiz" && <><div className="section-intro"><span><FlaskConical size={24} /></span><div><h2>Je teste mes connaissances</h2><p>Questions sélectionnées pour tester tes connaissances.</p></div></div><section className="arcade-grid">{visible.quiz.map(i => { const g = games[i]; const c = gameChallenges[i]; const done = quizWon.includes(i); return <article className={done ? "arcade-card won" : "arcade-card"} key={g[1]}><div className="arcade-icon"><img src={`/images/games/quiz-${i + 1}.png`} alt={`Illustration du jeu ${g[1]}`} /><small>{done ? "Réussi" : "+" + c.xp + " XP"}</small></div><span>{c.level} • {c.minutes} MIN</span><h3>{g[1]}</h3><p>{g[2]}</p><div className="arcade-skill">{["Reconnaissance IA", "Données", "Classification", "Prompts", "Esprit critique", "Vie privée", "Biais & équité", "Modèles", "Fact-checking", "Impact local"][i]}</div><button disabled={quizBlocked} onClick={() => { setActive(i); setAnswer(null) }}>{quizBlocked ? "Limite du jour atteinte" : done ? "Revoir le quiz" : "Faire le quiz"}</button></article> })}</section></>}
    {challenge && active !== null && <div className="game-modal-bg" onClick={() => setActive(null)}><section className="game-modal" onClick={e => e.stopPropagation()}><button className="game-close" onClick={() => setActive(null)}>×</button><div className="game-modal-head"><img src={`/images/games/quiz-${active + 1}.png`} alt={`Illustration du jeu ${games[active][1]}`} /><div><small>QUIZ {active + 1} • {challenge.level.toUpperCase()}</small><h2>{games[active][1]}</h2><p>{games[active][2]}</p></div></div><div className="game-question"><span><Target size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} /> QUESTION</span><h3>{challenge.question}</h3><div>{challenge.options.map((o, i) => <button key={o} disabled={answer !== null} className={answer === i ? (i === challenge.correct ? "right" : "wrong") : ""} onClick={() => choose(i)}>{o}</button>)}</div>{answer !== null && <><small className="answer-locked"><Lock size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> Réponse enregistrée</small><div className={answer === challenge.correct ? "game-feedback good" : "game-feedback try"}>{answer === challenge.correct ? "Bravo ! " : "Réponse incorrecte. "}{challenge.tip}</div></>}</div><footer><span><Zap size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> Récompense : {challenge.xp} XP</span>{quizWon.includes(active) ? <b>Quiz réussi</b> : <button disabled={answer !== challenge.correct} onClick={claim}>Gagner mes {challenge.xp} XP</button>}</footer></section></div>}
    {activeReal !== null && <div role="presentation" className="game-modal-bg" onClick={() => setActiveReal(null)}><section className="game-modal real-play-modal" onClick={e => e.stopPropagation()}><button className="game-close" onClick={() => setActiveReal(null)}>×</button><div role="presentation" className="game-modal-head"><img src={`/images/games/real-${realGames[activeReal][5]}.png`} alt={`Illustration du jeu ${realGames[activeReal][1]}`} /><div role="presentation"><small>JEU INTERACTIF • {realGames[activeReal][4].toUpperCase()}</small><h2>{realGames[activeReal][1]}</h2><p style={{ fontSize: "28px", fontWeight: 600, color: "#0E4B3C", lineHeight: 1.4 }}>{realGames[activeReal][2]}</p></div></div><RealGame key={activeReal} index={activeReal} onComplete={() => winReal(activeReal)} /><footer><span><Zap size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> Récompense : {realGames[activeReal][3]} XP</span>{realWon.includes(activeReal) && <b>Jeu gagné !</b>}</footer></section></div>}
  </div>
}

export function RealGame({ index, onComplete }: { index: number; onComplete: (stars?: number, feedback?: React.ReactNode) => void }) {
  if (index === 0) return <JeVoisIAGame onComplete={onComplete} />;
  if (index === 1) return <MemoryGame onComplete={onComplete} />;
  if (index === 2) return <DetectIAGame onComplete={onComplete} />;
  if (index === 3) return <ClassifGame onComplete={onComplete} />;
  if (index === 4) return <PromptGame onComplete={onComplete} />;
  if (index === 5) return <RobotGame onComplete={onComplete} />;
  if (index === 6) return <SequenceGame onComplete={onComplete} />;
  if (index === 7) return <QuickMissionGame kind="shield" onComplete={onComplete} />;
  if (index === 8) return <QuickMissionGame kind="source" onComplete={onComplete} />;
  if (index === 9) return <BalanceGame onComplete={onComplete} />;
  if (index === 10) return <ModelLabGame onComplete={onComplete} />;
  if (index === 11) return <QuickMissionGame kind="ethics" onComplete={onComplete} />;
  if (index === 12) return <ImageTrainingGame onComplete={onComplete} />;
  if (index === 13) return <GestureCameraGame onComplete={onComplete} />;
  if (index === 14) return <DrawingGuessGame onComplete={onComplete} />;
  if (index === 15) return <TrainYourModelGame onComplete={onComplete} />;
  if (index === 16) return <ChatbotBuilderGame onComplete={onComplete} />;
  if (index === 17) return <EscapeAIGame onComplete={onComplete} />;
  if (index === 18) return <CreativeStudioGame onComplete={onComplete} />;
  return <VoiceAssistantGame onComplete={onComplete} />;
}

export const scratchLabs: Record<AgeKey, { icon: string; title: string; mission: string; duration: string; level: string; blocks: string }[]> = {
  "7-9": [
    { icon: "hand", title: "Mon chat dit bonjour", mission: "Anime le chat pour qu’il accueille la classe avec une phrase et un mouvement.", duration: "15 min", level: "Premiers blocs", blocks: "Drapeau vert · Dire · Attendre" },
    { icon: "music", title: "La danse des animaux", mission: "Crée une petite chorégraphie avec deux costumes, des sons et une boucle.", duration: "20 min", level: "Débutant", blocks: "Avancer · Tourner · Costume · Son" },
    { icon: "star", title: "Attrape l’étoile", mission: "Programme un jeu où le joueur déplace un personnage et gagne un point en touchant l’étoile.", duration: "25 min", level: "Débutant +", blocks: "Touches · Touché ? · Variable score" },
    { icon: "home", title: "Mon histoire du quartier", mission: "Raconte une scène utile à ton quartier avec des décors et des personnages qui dialoguent.", duration: "30 min", level: "Créateur", blocks: "Décors · Dire · Envoyer un message" }
  ],
  "10-12": [
    { icon: "compass", title: "Course au trésor", mission: "Guide un explorateur avec le clavier, évite les obstacles et trouve le trésor.", duration: "25 min", level: "Explorateur", blocks: "Coordonnées · Touches · Conditions" },
    { icon: "help", title: "Quiz « IA ou pas IA ? »", mission: "Construis un quiz qui pose des questions, vérifie les réponses et calcule le score.", duration: "30 min", level: "Logique", blocks: "Demander · Réponse · Si/Sinon · Score" },
    { icon: "recycle", title: "Tri des déchets", mission: "Fais tomber des objets et classe-les dans le bon bac avant la fin du chrono.", duration: "35 min", level: "Concepteur", blocks: "Clones · Touché ? · Variables" },
    { icon: "cloud", title: "Météo animée du Sénégal", mission: "Présente plusieurs villes avec un décor, une température et une animation adaptés.", duration: "35 min", level: "Créatif", blocks: "Listes · Costumes · Messages" },
    { icon: "message", title: "Mini-assistant scolaire", mission: "Simule un assistant à règles qui répond poliment et rappelle de protéger les données personnelles.", duration: "40 min", level: "Responsable", blocks: "Demander · Opérateurs · Si/Sinon" }
  ],
  "13-15": [
    { icon: "compass", title: "Labyrinthe intelligent", mission: "Crée un personnage qui réagit aux murs et choisit une direction grâce à des règles.", duration: "35 min", level: "Intermédiaire", blocks: "Capteurs · Opérateurs · Conditions" },
    { icon: "folder", title: "Simulateur de classification", mission: "Classe des exemples par catégories et affiche la précision obtenue sur une série de tests.", duration: "45 min", level: "Data Lab", blocks: "Listes · Variables · Catégories" },
    { icon: "scale", title: "Détecteur de biais", mission: "Compare deux jeux d’exemples et montre comment un échantillon déséquilibré change le résultat.", duration: "45 min", level: "Esprit critique", blocks: "Listes · Compteurs · Pourcentages" },
    { icon: "bot", title: "Chatbot à règles", mission: "Programme un chatbot qui reconnaît quelques intentions sans prétendre être une vraie IA.", duration: "50 min", level: "Avancé", blocks: "Texte · Demander · Conditions imbriquées" },
    { icon: "globe", title: "Data story climat", mission: "Transforme une petite liste de données en récit animé sur le climat au Sénégal.", duration: "50 min", level: "Data créative", blocks: "Listes · Stylo · Variables" },
    { icon: "lightbulb", title: "IA utile au Sénégal", mission: "Imagine, prototype et teste une solution responsable à un problème local avec Scratch.", duration: "2 séances", level: "Projet final", blocks: "Storyboard · Prototype · Test utilisateur" }
  ]
};

export function ScratchView({ age, ageLocked, setAge }: { age: AgeKey; ageLocked: boolean; setAge: (age: AgeKey) => void }) {
  const [showScratchStudio, setShowScratchStudio] = useState(false);
  const labs = scratchLabs[age];
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (sectionRef.current) {
        sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [age]);

  return <div className="dash-content scratch-labs-page">
    <section className="scratch-labs-hero">
      <div><span>PROGRAMMATION CRÉATIVE</span><h1>Les labs Scratch</h1><p>Réalise les missions dans l’ordre puis crée ton projet sur l’éditeur officiel de Scratch.</p>{!ageLocked && <div className="age-tabs">{(Object.keys(tracks) as AgeKey[]).map(k => <button key={k} disabled={ageLocked && k !== age} className={age === k ? "sel" : ageLocked ? "locked-age" : ""} onClick={() => setAge(k)}>{tracks[k].label}<small>{ageLocked && k !== age ? "Non attribué" : tracks[k].name}</small></button>)}</div>}</div>
    </section>
    <section ref={sectionRef} className="scratch-labs-section">
      <header><div><small>MISSIONS CRÉATIVES</small><h2>Des missions progressives à construire</h2><p>Chaque lab est une simulation ou un projet créatif réalisé avec les blocs Scratch.</p></div><span>{labs.length} missions</span></header>
      <div className="scratch-labs-grid">{labs.map((lab, index) => <article className="scratch-lab-card" key={lab.title}>
        <div className="scratch-lab-number"><span><ModuleIcon name={lab.icon} size={20} /></span><b>LAB {String(index + 1).padStart(2, "0")}</b></div>
        <h3>{lab.title}</h3><p>{lab.mission}</p>
        <div className="scratch-lab-meta"><span>{lab.duration}</span><span>{lab.level}</span></div>
        <footer><small>BLOCS À MOBILISER</small><b>{lab.blocks}</b></footer>
      </article>)}</div>
    </section>
    <section className="scratch-labs-cta">
      <div><div><b>Prêt à construire ton projet ?</b><p>Ouvre le Studio Scratch complet directement dans kEur IA et avance bloc par bloc.</p></div></div>
      <button 
        type="button" 
        onClick={() => setShowScratchStudio(true)} 
        style={{ 
          background: "#F59E0B", 
          color: "#FFF", 
          border: "none", 
          padding: "14px 28px", 
          borderRadius: "16px", 
          fontWeight: 800, 
          fontSize: "16px", 
          cursor: "pointer", 
          display: "inline-flex", 
          alignItems: "center", 
          gap: "8px", 
          boxShadow: "0 4px 0 #D97706",
          transition: "all 0.1s"
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 0 0 #D97706'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 #D97706'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 #D97706'; }}
      >
        Ouvrir le Studio Scratch
      </button>
    </section>
    {showScratchStudio && <ScratchEmbed onClose={() => setShowScratchStudio(false)} title={tracks[age] ? `Studio Scratch · ${tracks[age].label}` : "Studio Scratch"} />}
  </div>
}

export function ScratchStudio() {
  const blocklyHost = useRef<HTMLDivElement | null>(null); const workspaceRef = useRef<WorkspaceSvg | null>(null);
  const [ready, setReady] = useState(false); const [code, setCode] = useState("// Glisse des blocs pour créer ton programme."); const [x, setX] = useState(18); const [angle, setAngle] = useState(0); const [say, setSay] = useState(""); const [status, setStatus] = useState("Charge la palette puis assemble ton premier programme.");
  useEffect(() => {

    let disposed = false; let observer: ResizeObserver | undefined; (async () => {
      const Blockly = await import("blockly"); const { javascriptGenerator } = await import("blockly/javascript"); const fr = await import("blockly/msg/fr"); Blockly.setLocale(fr.default); if (disposed || !blocklyHost.current) return;
      if (!Blockly.Blocks.event_when_flag) Blockly.common.defineBlocksWithJsonArray([
        { type: "event_when_flag", message0: "quand le drapeau vert est cliqué", nextStatement: null, colour: 45, tooltip: "Démarre le programme." },
        { type: "move_steps", message0: "avancer de %1 pas", args0: [{ type: "field_number", name: "STEPS", value: 10, min: -200, max: 200 }], previousStatement: null, nextStatement: null, colour: 210 },
        { type: "turn_degrees", message0: "tourner de %1 degrés", args0: [{ type: "field_number", name: "DEGREES", value: 15, min: -360, max: 360 }], previousStatement: null, nextStatement: null, colour: 210 },
        { type: "go_center", message0: "aller au centre", previousStatement: null, nextStatement: null, colour: 210 },
        { type: "say_text", message0: "dire %1", args0: [{ type: "field_input", name: "TEXT", text: "Bonjour !" }], previousStatement: null, nextStatement: null, colour: 290 },
        { type: "wait_seconds", message0: "attendre %1 seconde(s)", args0: [{ type: "field_number", name: "SECONDS", value: 1, min: 0, max: 10 }], previousStatement: null, nextStatement: null, colour: 120 }
      ]);
      javascriptGenerator.forBlock.event_when_flag = (b: Block, g: JavascriptGenerator) => g.statementToCode(b, "DO") || "";
      javascriptGenerator.forBlock.move_steps = (b: Block) => `move(${Number(b.getFieldValue("STEPS"))});\n`;
      javascriptGenerator.forBlock.turn_degrees = (b: Block) => `turn(${Number(b.getFieldValue("DEGREES"))});\n`;
      javascriptGenerator.forBlock.go_center = () => "center();\n";
      javascriptGenerator.forBlock.say_text = (b: Block) => `say(${JSON.stringify(b.getFieldValue("TEXT"))});\n`;
      javascriptGenerator.forBlock.wait_seconds = (b: Block) => `wait(${Number(b.getFieldValue("SECONDS"))});\n`;
      const toolbox = {
        kind: "categoryToolbox", contents: [
          { kind: "category", name: "Événements", colour: "#f4b942", contents: [{ kind: "block", type: "event_when_flag" }] },
          { kind: "category", name: "Mouvement", colour: "#4c97ff", contents: [{ kind: "block", type: "move_steps" }, { kind: "block", type: "turn_degrees" }, { kind: "block", type: "go_center" }] },
          { kind: "category", name: "Apparence", colour: "#9966ff", contents: [{ kind: "block", type: "say_text" }] },
          { kind: "category", name: "Contrôle", colour: "#ffab19", contents: [{ kind: "block", type: "controls_repeat_ext", inputs: { TIMES: { shadow: { type: "math_number", fields: { NUM: 3 } } } } }, { kind: "block", type: "wait_seconds" }, { kind: "block", type: "controls_if" }] },
          { kind: "category", name: "Maths", colour: "#59c059", contents: [{ kind: "block", type: "math_number" }, { kind: "block", type: "math_arithmetic" }] },
          { kind: "category", name: "Variables", custom: "VARIABLE", colour: "#ff8c1a" }
        ]
      };
      const workspace = Blockly.inject(blocklyHost.current, { toolbox, trashcan: true, scrollbars: true, renderer: "zelos", zoom: { controls: true, wheel: true, startScale: .82, maxScale: 1.4, minScale: .45 }, grid: { spacing: 24, length: 3, colour: "#d8e3dc", snap: true } }); workspaceRef.current = workspace;
      const update = () => setCode(javascriptGenerator.workspaceToCode(workspace) || "// Assemble des blocs pour générer le programme."); workspace.addChangeListener(update); update(); observer = new ResizeObserver(() => Blockly.svgResize(workspace)); observer.observe(blocklyHost.current); setReady(true); setStatus("Blockly est prêt. Glisse les blocs de la palette vers l’espace de travail.");
    })().catch(() => setStatus("Impossible de charger l’éditeur Blockly pour le moment.")); return () => { disposed = true; observer?.disconnect(); workspaceRef.current?.dispose(); workspaceRef.current = null }
  }, []);
  const resetStage = () => { setX(18); setAngle(0); setSay("") };
  const clearWorkspace = () => { workspaceRef.current?.clear(); resetStage(); setStatus("Nouveau projet Blockly prêt.") };
  // Le programme n'est PAS converti en JavaScript puis exécuté (plus de `new Function`) : on parcourt les blocs (blocklyInterpreter.ts),
  // avec un budget d'instructions qui empêche une boucle géante de geler l'onglet.
  const run = () => {
    const workspace = workspaceRef.current;
    if (!ready || !workspace) return;
    const flags = workspace.getBlocksByType("event_when_flag", true);
    if (!flags.length) { setStatus("Ajoute d’abord le bloc jaune « quand le drapeau vert est cliqué »."); return; }
    const result = runProgram(flags);
    if (result.error === "too_long") { setStatus("Ton programme est trop long : il répète beaucoup trop de choses. Réduis les répétitions."); return; }
    if (result.error) { setStatus("Certains blocs ne sont pas encore reliés correctement."); return; }
    setX(Math.max(6, Math.min(94, result.state.x)));
    setAngle(result.state.angle);
    setSay(result.state.message);
    setStatus("Programme exécuté ! Observe la scène puis améliore tes blocs.");
  };
  return <section className="blockly-studio">
    <header className="blockly-top"><div><span><Puzzle size={24} /></span><div><small>GOOGLE BLOCKLY • ÉDITEUR DE BLOCS</small><h3>Mon projet Scratch Blocks</h3></div></div><div><button className="blockly-run" disabled={!ready} onClick={run} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Flag size={16} /> Exécuter</button><button onClick={clearWorkspace}>Nouveau</button></div></header>
    <div className="blockly-layout"><section className="blockly-editor"><div ref={blocklyHost} className="blockly-host" aria-label="Éditeur de programmation Blockly" /></section><aside className="blockly-side"><div className="blockly-stage"><header><b>Scène</b><button onClick={resetStage} title="Réinitialiser"><RotateCcw size={14} /></button></header><div>{say && <span>{say}</span>}<b style={{ left: `${x}%`, transform: `translateX(-50%) rotate(${angle}deg)` }}><Cat size={32} color="#0E4B3C" /></b></div><footer>x : {Math.round(x)} • direction : {90 + angle}°</footer></div><div className="blockly-code"><header><b>JavaScript généré</b><span>auto</span></header><pre>{code}</pre></div></aside></div>
    <div className="blockly-status"><span><Lightbulb size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} /> {status}</span><b>Mission : drapeau → avancer → dire Bonjour → répéter.</b></div>
  </section>
}
