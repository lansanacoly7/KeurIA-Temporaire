"use client";

import { useEffect, useRef, useState } from "react";
import { AgeKey, World } from "../lms-data";
import BadgeUnlockAnimation from "../components/BadgeUnlockAnimation";
import { randomInt, randomFloat } from "../utils/random";


// Vue affichée : "eleve" ou "enfant" = espace d'apprentissage (élève, enfant, ou admin en aperçu).
export type Role = "eleve" | "enfant" | "parent" | "enseignant";
export type Progress = { xp: number; completed: string[]; streak: number; lessonStars?: Record<string, number>; badges?: string[]; tutorialCompleted?: boolean };
export type UnlockedBadge = Parameters<typeof BadgeUnlockAnimation>[0]["badge"];
export type Lesson = World["lessons"][number];
export type SchoolBrand = { name: string; slug: string; primaryColor: string; secondaryColor: string; accentColor: string };

export function playQuizSound(isCorrect: boolean) {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass(); const now = context.currentTime;
    const frequencies = isCorrect ? [523.25, 659.25, 783.99] : [220, 165];
    frequencies.forEach((frequency, index) => { const oscillator = context.createOscillator(); const gain = context.createGain(); const start = now + index * (isCorrect ? .11 : .14); oscillator.type = isCorrect ? "sine" : "sawtooth"; oscillator.frequency.setValueAtTime(frequency, start); gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(isCorrect ? .18 : .1, start + .015); gain.gain.exponentialRampToValueAtTime(.0001, start + .17); oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + .18) });
    window.setTimeout(() => void context.close(), 650);
  } catch {/* Le quiz reste utilisable si le navigateur bloque l'audio. */ }
}

export function playCelebrationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass(); const now = context.currentTime;
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // Fanfare
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.12;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(.2, start + .02);
      gain.gain.exponentialRampToValueAtTime(.0001, start + (index === frequencies.length - 1 ? 0.6 : 0.2));
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + (index === frequencies.length - 1 ? 0.6 : 0.2));
    });
    window.setTimeout(() => void context.close(), 1500);
  } catch { /* l'audio est facultatif (navigateur sans AudioContext ou son bloqué) : on continue sans son */ }
}

export function CelebrationSound() {
  useEffect(() => { playCelebrationSound(); }, []);
  return null;
}

type ConfettiPiece = { left: number; width: number; height: number; color: string; duration: number; delay: number; rotation: number };
const CONFETTI_COLORS = ['#FFC107', '#E53935', '#4CAF50', '#03A9F4', '#9C27B0'];

export function ConfettiOverlay() {
  // Tirés une seule fois : un tirage dans le rendu changerait à chaque rafraîchissement et ferait scintiller les confettis.
  const [pieces] = useState<ConfettiPiece[]>(() => Array.from({ length: 100 }, () => ({
    left: randomFloat() * 100,
    width: 8 + randomFloat() * 6,
    height: 16 + randomFloat() * 10,
    color: CONFETTI_COLORS[randomInt(CONFETTI_COLORS.length)],
    duration: 2 + randomFloat() * 3,
    delay: randomFloat() * 1.5,
    rotation: randomFloat() * 360,
  })));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
      {pieces.map((piece, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${piece.left}%`,
          top: `-10%`,
          width: piece.width,
          height: piece.height,
          backgroundColor: piece.color,
          animation: `kiFall ${piece.duration}s linear forwards`,
          animationDelay: `${piece.delay}s`,
          transform: `rotate(${piece.rotation}deg)`,
          opacity: 0.9
        }} />
      ))}
      <style>{`
        @keyframes kiFall {
          0% { transform: translateY(0vh) rotate(0deg); }
          100% { transform: translateY(110vh) rotate(720deg); }
        }
        @media (prefers-reduced-motion: reduce) { [style*="kiFall"] { animation: none !important; display: none; } }
      `}</style>
    </div>
  );
}
export function GameShell({ children, bgImage, hideSpeechBubbleInGame }: { children: React.ReactNode, bgImage?: string, hideSpeechBubbleInGame?: boolean }) {
  return (
    <div className={`p11-full-screen ${hideSpeechBubbleInGame ? 'hide-speech-bubble' : ''}`} style={{
      background: bgImage ? `url(${bgImage}) center/cover no-repeat` : "#F8FAFC",
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: 99999,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      {children}
    </div>
  );
}

export function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let line = "";
  for (const word of words) { const test = line ? `${line} ${word}` : word; if (context.measureText(test).width > maxWidth && line) { lines.push(line); line = word } else line = test }
  if (line) lines.push(line); return lines;
}

export async function downloadPersonalizedBadge({ badgeIndex, learner, moduleTitle, trackLabel }: { badgeIndex: number; learner: string; moduleTitle: string; trackLabel: string }) {
  const badgeImage = new Image(); const logoImage = new Image(); badgeImage.src = `/images/badges/badge-${badgeIndex + 1}.png`; logoImage.src = "/images/keur-ia-logo.png"; await Promise.all([badgeImage.decode(), logoImage.decode()]);
  const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 1400; const context = canvas.getContext("2d"); if (!context) return;
  const background = context.createLinearGradient(0, 0, 1200, 1400); background.addColorStop(0, "#fffaf0"); background.addColorStop(1, "#eaf5df"); context.fillStyle = background; context.fillRect(0, 0, 1200, 1400);
  context.strokeStyle = "#174e49"; context.lineWidth = 22; context.strokeRect(32, 32, 1136, 1336); context.strokeStyle = "#d9ef59"; context.lineWidth = 8; context.strokeRect(56, 56, 1088, 1288);
  context.textAlign = "center"; context.drawImage(logoImage, 250, 65, 700, 233); context.fillStyle = "#174e49"; context.font = "900 31px Arial"; context.fillText("BADGE DE RÉUSSITE", 600, 335);
  context.drawImage(badgeImage, 400, 350, 400, 400);
  context.fillStyle = "#0d846e"; context.font = "900 28px Arial"; context.fillText(`PARCOURS ${trackLabel.toUpperCase()}`, 600, 790);
  context.fillStyle = "#173e3c"; context.font = "900 50px Arial"; const moduleLines = wrapCanvasText(context, moduleTitle, 960); moduleLines.slice(0, 2).forEach((line, index) => context.fillText(line, 600, 855 + index * 58));
  const infoTop = moduleLines.length > 1 ? 990 : 930; context.fillStyle = "#ffffff"; context.fillRect(125, infoTop, 950, 300); context.strokeStyle = "#d6e2cc"; context.lineWidth = 4; context.strokeRect(125, infoTop, 950, 300);
  context.fillStyle = "#6a7d76"; context.font = "800 25px Arial"; context.fillText("DÉCERNÉ À", 600, infoTop + 62); context.fillStyle = "#173e3c"; context.font = "900 48px Arial"; wrapCanvasText(context, learner, 850).slice(0, 2).forEach((line, index) => context.fillText(line, 600, infoTop + 125 + index * 54));
  context.fillStyle = "#6a7d76"; context.font = "800 24px Arial"; context.fillText("POUR AVOIR VALIDÉ CE MODULE", 600, infoTop + 245);
  context.fillStyle = "#174e49"; context.font = "800 25px Arial"; context.fillText("Comprendre • Questionner • Créer • Se protéger", 600, 1320);
  const safeName = learner.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "apprenant";
  const link = document.createElement("a"); link.download = `keur-ia-badge-${safeName}-module-${badgeIndex + 1}.png`; link.href = canvas.toDataURL("image/png"); link.click();
}

export type ProgressReply = { xp_gained: number; already_completed?: boolean; progress: { xp: number; levelUp: { level: number; name: string } | null } };

/**
 * Enregistre une activité terminée. L'XP est décidée par le serveur (catalogue) : le navigateur
 * n'envoie jamais de montant et affiche le total renvoyé. Renvoie null si l'enregistrement échoue.
 */
/** Résultat d'un enregistrement : la réponse du serveur, ou une phrase à montrer à l'enfant quand ça n'a pas marché. */
export type ProgressOutcome = { reply: ProgressReply; message?: undefined } | { reply: null; message: string };

/** Phrase adaptée à la cause de l'échec : jamais un échec silencieux (l'enfant croirait que sa leçon est comptée). */
export function progressFailureMessage(status: number | null, serverMessage?: string): string {
  if (status === 423) return serverMessage || "C’est l’heure de la pause : ta leçon n’a pas été comptée. Demande à ton parent pour continuer.";
  if (status === 401) return "Ta session a expiré : reconnecte-toi pour que ta progression soit enregistrée.";
  if (status === 429) return "Trop de demandes d’un coup. Attends un instant, puis recommence.";
  if (status !== null && status >= 400 && status < 500 && serverMessage) return serverMessage;
  return "Pas de connexion : ta progression n’a pas pu être enregistrée. Réessaie dans un instant.";
}

export async function postProgressChecked(lessonId: string, body: { age: AgeKey; score?: number; stars?: number }): Promise<ProgressOutcome> {
  try {
    const response = await fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId, ...body }) });
    if (response.ok) return { reply: (await response.json()) as ProgressReply };
    const data = await response.json().catch(() => ({} as { error?: string }));
    return { reply: null, message: progressFailureMessage(response.status, typeof data.error === "string" ? data.error : undefined) };
  } catch {
    return { reply: null, message: progressFailureMessage(null) };
  }
}

export async function postProgress(lessonId: string, body: { age: AgeKey; score?: number; stars?: number }): Promise<ProgressReply | null> {
  return (await postProgressChecked(lessonId, body)).reply;
}

/** Identifiant serveur d'un jeu ou d'un quiz d'arcade (voir le catalogue d'activités du backend). */
export const arcadeActivityId = (kind: "game" | "quiz", index: number) => `arcade-${kind}-${String(index + 1).padStart(2, "0")}`;

export const gameChallenges = [
  { level: "Débutant", minutes: 3, xp: 20, question: "Une application te recommande des vidéos à partir de ce que tu regardes. Est-ce un usage possible de l'IA ?", options: ["Oui, elle peut apprendre de mes préférences", "Non, une IA ne peut jamais recommander", "C'est forcément un simple chronomètre"], correct: 0, tip: "Une IA peut repérer des habitudes dans des données pour faire des recommandations." },
  { level: "Débutant", minutes: 4, xp: 25, question: "Pour apprendre à reconnaître une mangue mûre, quelles données sont les plus utiles ?", options: ["Des photos variées de mangues mûres et non mûres, bien classées", "Uniquement le nom de ton école", "Un seul dessin de mangue"], correct: 0, tip: "Des exemples variés et correctement étiquetés aident le modèle à apprendre." },
  { level: "Explorateur", minutes: 4, xp: 30, question: "Tu veux entraîner une IA à distinguer chats et chiens. Quel est le meilleur départ ?", options: ["Lui montrer beaucoup d'exemples étiquetés chat ou chien", "Lui donner ton mot de passe", "Lui montrer uniquement une photo"], correct: 0, tip: "La classification apprend à partir d'exemples appartenant à des catégories connues." },
  { level: "Explorateur", minutes: 5, xp: 35, question: "Quel prompt est le plus clair pour demander une explication ?", options: ["Parle-moi de l'IA", "Explique l'IA", "Explique en 5 phrases à un élève de 11 ans ce qu'est l'IA, avec un exemple au Sénégal"], correct: 2, tip: "Un bon prompt précise l'objectif, le public, le format et le contexte." },
  { level: "Détective", minutes: 5, xp: 40, question: "Tu reçois une vidéo spectaculaire d'une personnalité. Quel est ton premier bon réflexe ?", options: ["La partager tout de suite", "Chercher la source originale, la date et d'autres sources fiables", "Croire la vidéo si elle est très nette"], correct: 1, tip: "Une image ou una voix réaliste peut être générée. On vérifie avant de partager." },
  { level: "Défenseur", minutes: 4, xp: 35, question: "Quelle information ne dois-tu jamais donner à un assistant IA pour faire tes devoirs ?", options: ["Le sujet de l'exercice", "Ton mot de passe personnel", "La matière que tu étudies"], correct: 1, tip: "Mots de passe, adresse précise et documents privés restent secrets." },
  { level: "Expert", minutes: 6, xp: 45, question: "Une IA de reconnaissance apprend avec 95 photos d'un groupe et 5 d'un autre. Quel risque vois-tu ?", options: ["Les données sont peut-être déséquilibrées et le résultat peut être moins juste", "Il n'y a aucun risque", "Plus un groupe est petit, mieux l'IA apprend"], correct: 0, tip: "Un jeu de données déséquilibré peut produire des performances inégales." },
  { level: "Expert", minutes: 5, xp: 45, question: "Tu veux estimer le temps d'un trajet à partir du trafic et de la distance. Quel outil est le plus adapté ?", options: ["Un modèle de prédiction entraîné sur des trajets", "Un générateur d'images", "Un mot de passe plus long"], correct: 0, tip: "On choisit le type de modèle selon le problème à résoudre et les données disponibles." },
  { level: "Détective", minutes: 5, xp: 40, question: "Une IA affirme un chiffre surprenant sur le Sénégal. Comment le vérifier ?", options: ["Demander à la même IA de répéter", "Comparer avec une source officielle ou plusieurs sources fiables", "Le publier si le chiffre semble précis"], correct: 1, tip: "Une réponse précise n'est pas une preuve. Remonte toujours à des sources vérifiables." },
  { level: "Créateur", minutes: 7, xp: 50, question: "Quel projet ressemble le plus à une IA utile et responsable pour un quartier ?", options: ["Aider à repérer les zones avec beaucoup de déchets, avec des données non sensibles et l'avis des habitants", "Filmer tout le monde sans autorisation", "Collecter tous les mots de passe pour faire des statistiques"], correct: 0, tip: "Une bonne solution part d'un besoin réel, minimise les données sensibles et implique les personnes concernées." }
] as const;

export function lessonExtras(q: string, title: string, age: AgeKey) {
  const young = age === "7-9"; const defaultExtras = {
    story: `Palou reçoit une nouvelle mission : comprendre « ${title} » pour aider les élèves de son école. Il observe, pose des questions et teste plusieurs idées avant de choisir une réponse.`,
    steps: ["J’observe la situation et je repère les indices utiles.", "Je formule une idée, puis je la teste avec un exemple.", "J’explique mon résultat et je vérifie ses limites."],
    vocabulary: [["IA", "Outil capable de réaliser certaines tâches à partir de données."], ["Indice", "Information utile pour comprendre ou décider."], ["Vérifier", "Chercher des preuves avant de conclure."]],
    didYouKnow: "Une IA peut donner deux réponses différentes à des questions presque identiques. Les mots choisis et le contexte comptent beaucoup.",
    project: `Crée une mini-affiche intitulée « ${title} ». Ajoute une définition, un exemple au Sénégal et une règle de prudence.`,
    discussion: "Dans cette situation, qu’est-ce qu’un humain doit décider lui-même ? Explique ton avis à un camarade.",
    quiz: { question: `Pour bien apprendre « ${title} », quelle méthode est la plus efficace ?`, options: ["Observer, tester puis expliquer", "Mémoriser sans essayer", "Copier une réponse sans la lire"], correct: 0, tip: "Apprendre devient plus solide quand on manipule une idée et qu’on l’explique avec ses propres mots." }
  };
  if (/donnée|dataset|data|label|variable|caractéristique|nettoyage/.test(q)) return { ...defaultExtras, story: "Au marché, Palou veut aider à classer des fruits. Il note la couleur, la taille et l’état de chaque fruit, mais refuse de collecter le nom ou l’adresse des vendeurs : ces informations ne sont pas utiles à sa mission.", steps: ["Choisir uniquement les données utiles.", "Vérifier qu’elles sont variées et correctement classées.", "Tester si elles permettent une décision juste."], vocabulary: [["Donnée", "Information observée ou mesurée."], ["Étiquette", "Nom donné à une catégorie d’exemples."], ["Qualité", "Niveau de fiabilité et de diversité des données."]], didYouKnow: "Une petite erreur répétée dans les données peut devenir une grande erreur lorsque le modèle apprend.", project: "Construis un petit jeu de 12 données sur les fruits, la météo ou les déchets. Classe-les, puis explique quelles informations tu as volontairement exclues.", quiz: { question: "Quel jeu de données aidera le mieux une IA à reconnaître des mangues mûres ?", options: ["Des photos variées et bien étiquetées", "Une seule photo floue", "Les mots de passe des vendeurs"], correct: 0, tip: "Des exemples variés, utiles et correctement étiquetés améliorent l’apprentissage." } };
  if (/prompt|rocf|few-shot/.test(q)) return { ...defaultExtras, story: "Ndeye demande à Palou : « Fais une affiche ». Le résultat est trop vague. Elle précise alors le public, le sujet, les couleurs, le nombre de phrases et le format. Cette fois, la proposition devient vraiment utile.", steps: ["Dire le rôle et l’objectif attendu.", "Ajouter le contexte, le public et les contraintes.", "Lire le résultat, corriger puis améliorer le prompt."], vocabulary: [["Prompt", "Consigne donnée à une IA générative."], ["Contexte", "Informations qui précisent la situation."], ["Format", "Forme attendue : liste, tableau, histoire…"]], didYouKnow: "Un bon prompt ne garantit pas une réponse vraie : même une consigne parfaite doit être vérifiée.", project: "Écris trois versions du même prompt : vague, améliorée et experte. Compare les résultats attendus et surligne ce qui rend chaque version plus précise.", quiz: { question: "Quelle consigne aidera le mieux un élève de 11 ans ?", options: ["Parle de l’IA", "Écris tout ce que tu sais", "Explique l’IA en 5 phrases simples avec un exemple au Sénégal"], correct: 2, tip: "Une consigne efficace précise le public, l’objectif, le contexte et le format." } };
  if (/biais|équité|juste|responsable|éthique/.test(q)) return { ...defaultExtras, story: "Une application choisit les élèves pour un atelier, mais elle a surtout appris avec les résultats d’un seul groupe. Palou remarque que d’autres élèves talentueux sont oubliés et demande de revoir les données et les critères.", steps: ["Repérer qui est représenté ou oublié.", "Questionner les données et les critères de décision.", "Proposer un test plus juste et demander un contrôle humain."], vocabulary: [["Biais", "Décalage qui peut produire un résultat injuste."], ["Équité", "Recherche d’un traitement juste pour chacun."], ["Transparence", "Capacité à expliquer comment une décision est prise."]], didYouKnow: "Une règle identique pour tout le monde n’est pas toujours équitable si les situations de départ sont différentes.", project: "Invente une grille de contrôle en cinq questions pour vérifier qu’une application scolaire respecte tous les élèves.", quiz: { question: "Une IA semble défavoriser certains élèves. Quel est le meilleur réflexe ?", options: ["Ignorer le problème", "Examiner les données, les critères et faire contrôler la décision", "Supprimer tous les résultats sans comprendre"], correct: 1, tip: "On cherche la source du biais, on teste et on garde une responsabilité humaine." } };
  if (/deepfake|vrai|faux|vérif|source|preuve|fact-check|détective|image vraie/.test(q)) return { ...defaultExtras, story: "Une vidéo spectaculaire circule dans le groupe de classe. Avant de la partager, Moussa et Palou retrouvent la source originale, vérifient la date, observent les détails et comparent avec plusieurs médias fiables.", steps: ["S’arrêter avant de partager.", "Chercher la source, l’auteur, la date et le contexte.", "Comparer plusieurs preuves indépendantes."], vocabulary: [["Source", "Origine d’une information."], ["Deepfake", "Média artificiel imitant une personne ou une scène."], ["Preuve", "Élément vérifiable qui soutient une affirmation."]], didYouKnow: "Une image très nette peut être fausse, et une image floue peut être vraie. La qualité visuelle ne suffit jamais comme preuve.", project: "Crée une fiche « Détective de l’info » avec cinq contrôles à effectuer avant de partager un contenu étonnant.", quiz: { question: "Quelle action vient en premier devant une vidéo surprenante ?", options: ["Retrouver la source originale et vérifier le contexte", "La transférer rapidement", "Croire la vidéo si elle est réaliste"], correct: 0, tip: "On ralentit, on cherche l’origine et on compare avant de partager." } };
  if (/privé|vie privée|secret|partage|sécurité|menace|bouclier/.test(q)) return { ...defaultExtras, story: "Pour obtenir de l’aide sur un devoir, Fatou allait envoyer une photo de sa carte scolaire. Palou lui montre comment recopier uniquement la question et masquer toutes les informations personnelles inutiles.", steps: ["Identifier les informations personnelles ou sensibles.", "Retirer tout ce qui n’est pas nécessaire à la mission.", "Demander l’avis d’un adulte en cas de doute."], vocabulary: [["Donnée personnelle", "Information liée à une personne."], ["Mot de passe", "Secret qui protège un compte."], ["Consentement", "Accord donné de façon claire et libre."]], didYouKnow: "Une information partagée en ligne peut être copiée ou enregistrée, même si tu la supprimes ensuite.", project: "Dessine un bouclier numérique en quatre zones : secrets, informations privées, informations publiques et personnes de confiance.", quiz: { question: "Que peux-tu envoyer à une IA pour demander de l’aide en maths ?", options: ["Ton mot de passe", "Ta carte scolaire complète", "La consigne de l’exercice sans donnée privée"], correct: 2, tip: "On partage seulement les informations nécessaires et jamais ses secrets." } };
  if (/apprend|entraî|modèle|préd|machine learning|train|classification|régression/.test(q)) return { ...defaultExtras, story: "Palou apprend à distinguer mil, maïs et riz à partir d’exemples. Après l’entraînement, Ndeye lui montre des graines qu’il n’a jamais vues pour vérifier s’il a vraiment appris et pas seulement mémorisé.", steps: ["Préparer des exemples d’entraînement variés.", "Construire un modèle qui repère des régularités.", "Tester le modèle sur de nouveaux exemples et mesurer ses erreurs."], vocabulary: [["Entraînement", "Étape où le modèle apprend avec des exemples."], ["Modèle", "Système construit à partir des données."], ["Prédiction", "Résultat estimé pour une nouvelle situation."]], didYouKnow: "Un modèle excellent sur ses exemples d’entraînement peut échouer sur de nouvelles situations : il faut toujours un jeu de test séparé.", project: "Invente un classificateur à deux catégories. Dessine six exemples d’entraînement, deux exemples de test et une erreur possible.", quiz: { question: "Comment vérifier qu’un modèle a vraiment appris ?", options: ["Lui demander son mot de passe", "Le tester avec de nouveaux exemples", "Lui remontrer uniquement les mêmes exemples"], correct: 1, tip: "Un bon test utilise des exemples que le modèle n’a pas vus pendant l’entraînement." } };
  if (/vision|image|pixel|photo|objet/.test(q)) return { ...defaultExtras, story: "Dans un jardin scolaire, Palou analyse des photos de feuilles. Une ombre lui fait confondre deux plantes. Les élèves reprennent des photos sous plusieurs lumières et découvrent pourquoi la qualité des images compte.", steps: ["Observer les pixels, formes, couleurs et textures.", "Comparer des images prises dans des conditions variées.", "Tester la reconnaissance et analyser les erreurs."], vocabulary: [["Pixel", "Petit point numérique qui compose une image."], ["Classification", "Attribution d’une image à une catégorie."], ["Détection", "Repérage d’un objet et de sa position."]], didYouKnow: "Pour une machine, une photo commence comme une grille de nombres : elle ne “voit” pas comme un humain.", project: "Photographie ou dessine le même objet sous trois angles. Liste les indices visuels qui restent utiles malgré les changements.", quiz: { question: "Pourquoi faut-il des photos prises sous plusieurs lumières ?", options: ["Pour aider le modèle à reconnaître l’objet dans des situations variées", "Pour remplir la mémoire", "Pour connaître l’adresse du photographe"], correct: 0, tip: "La diversité des images rend la reconnaissance plus robuste." } };
  if (/chatbot|langage|mot|llm|token|dialogue|intention/.test(q)) return { ...defaultExtras, story: "Mariama pose deux questions presque identiques à un chatbot et reçoit deux réponses différentes. Avec Palou, elle repère les mots qui changent le contexte et cherche ensuite une source pour vérifier les affirmations.", steps: ["Donner un contexte clair au modèle de langage.", "Lire la réponse en repérant faits, opinions et incertitudes.", "Vérifier les informations importantes dans une source fiable."], vocabulary: [["Token", "Petite unité de texte traitée par le modèle."], ["Contexte", "Texte utilisé pour comprendre la demande."], ["Hallucination", "Information inventée mais présentée avec assurance."]], didYouKnow: "Un modèle de langage prédit des suites de mots plausibles ; il ne consulte pas automatiquement une vérité parfaite.", project: "Crée un dialogue de cinq messages avec un chatbot : demande une explication, un exemple, une reformulation, une limite et une source à vérifier.", quiz: { question: "Un chatbot donne un chiffre précis. Que faut-il faire ?", options: ["Le croire parce qu’il est précis", "Le partager sans le lire", "Le comparer à une source officielle ou fiable"], correct: 2, tip: "Une phrase convaincante ou précise n’est pas automatiquement vraie." } };
  if (/génér|hallucination|créer|créatif|histoire|dessin/.test(q)) return { ...defaultExtras, story: "Pour une affiche sur le tri des déchets, Palou propose plusieurs idées. Les élèves choisissent, corrigent les erreurs, ajoutent leur expérience du quartier et signent la création finale : l’IA reste un outil, pas l’auteur unique.", steps: ["Définir une intention créative et demander plusieurs pistes.", "Sélectionner, transformer et enrichir les propositions.", "Vérifier les faits, respecter les droits et assumer le résultat final."], vocabulary: [["Génération", "Création d’un nouveau contenu par un modèle."], ["Itération", "Amélioration progressive par plusieurs essais."], ["Auteur", "Personne qui porte l’intention et la responsabilité d’une création."]], didYouKnow: "Deux personnes utilisant le même outil d’IA peuvent produire des créations très différentes grâce à leurs choix, corrections et idées personnelles.", project: "Imagine une campagne utile à ton école. Demande trois idées à une IA fictive, puis combine-les et ajoute une idée que toi seul peux apporter.", quiz: { question: "Qui reste responsable d’une création réalisée avec une IA ?", options: ["Personne", "La personne qui choisit, vérifie et publie le résultat", "Uniquement la machine"], correct: 1, tip: "L’humain garde l’intention, les choix, la vérification et la responsabilité." } };
  return young ? { ...defaultExtras, didYouKnow: "Palou apprend mieux quand tu lui montres plusieurs exemples et que tu lui expliques ses erreurs." } : defaultExtras;
}

export function learningCopy(title: string, moduleDescription: string, age: AgeKey) {
  const q = title.toLowerCase();
  const young = age === "7-9";
  const extras = lessonExtras(q, title, age);
  const base = {
    ...extras,
    concept: `Dans cette leçon, tu vas explorer « ${title} ». ${moduleDescription} L’objectif est de comprendre l’idée avec des exemples, puis de l’utiliser toi-même.`,
    example: young ? "Imagine Palou comme un camarade très rapide : il a besoin de bons exemples et de consignes claires pour réussir sa mission." : "Imagine une application que tu utilises chaque jour. Demande-toi quelles informations elle reçoit, ce qu’elle doit produire et comment tu pourrais vérifier son résultat.",
    remember: "Une IA est un outil : elle peut aider, mais son résultat doit rester compréhensible, vérifiable et utilisé de façon responsable.",
    challenge: `Explique « ${title} » avec tes propres mots à un camarade, puis invente un exemple lié à ton école, ton quartier ou au Sénégal.`
  };
  if (/donnée|dataset|data|label|variable|caractéristique|nettoyage/.test(q)) return { ...base, concept: "Les données sont les informations utilisées pour observer, comparer ou entraîner un système d’IA. Leur qualité compte : des données fausses, incomplètes ou déséquilibrées peuvent conduire à de mauvais résultats.", example: "Pour apprendre à reconnaître des mangues mûres, on peut montrer beaucoup de photos bien classées : mûre / pas mûre. Si toutes les photos sont prises sous la même lumière, l’IA risque de moins bien réussir ailleurs.", remember: "Bonnes données = pertinentes, suffisamment variées, correctement décrites et respectueuses de la vie privée.", challenge: "Choisis 10 objets autour de toi. Imagine trois caractéristiques utiles pour les classer sans utiliser le nom de l’objet." };
  if (/prompt|rocf|few-shot/.test(q)) return { ...base, concept: "Un prompt est une consigne donnée à une IA générative. Une bonne consigne précise le rôle, l’objectif, le contexte, les contraintes et le format attendu.", example: "Au lieu de « parle-moi du climat », essaie : « Tu es vulgarisateur. Explique à un élève de mon âge, en 5 phrases, deux effets du changement climatique au Sénégal et termine par une question. »", remember: "Rôle + Objectif + Contexte + Contraintes + Format : une recette simple pour améliorer un prompt.", challenge: "Transforme la consigne « Explique l’IA » en un prompt précis pour un élève de ton âge." };
  if (/biais|équité|juste|responsable|éthique/.test(q)) return { ...base, concept: "Un biais apparaît lorsqu’un système favorise ou défavorise certains cas, souvent à cause des données, des choix de conception ou de la façon dont on interprète les résultats.", example: "Si une IA apprend à reconnaître des plantes uniquement avec des photos prises pendant la saison sèche, ses prédictions peuvent être moins bonnes pendant la saison des pluies.", remember: "Avant de faire confiance à une IA, demande : qui est représenté dans les données, qui pourrait être oublié et qui contrôle la décision ?", challenge: "Imagine un système qui choisit des élèves pour une activité. Cite deux informations qu’il ne devrait pas utiliser pour prendre une décision injuste." };
  if (/deepfake|vrai|faux|vérif|source|preuve|fact-check|détective|image vraie/.test(q)) return { ...base, concept: "Une image, une voix ou un texte convaincant n’est pas forcément vrai. L’IA générative peut produire des contenus réalistes mais faux : il faut donc rechercher des preuves avant de croire ou partager.", example: "Tu reçois une vidéo étonnante attribuée à une personnalité. Ne la partage pas immédiatement : recherche la source originale, la date, le contexte et vérifie si des médias fiables confirment l’information.", remember: "STOP → QUESTIONNE → VÉRIFIE LA SOURCE → COMPARE → DÉCIDE.", challenge: "Imagine une publication surprenante. Écris les trois vérifications que tu ferais avant de la partager." };
  if (/privé|vie privée|secret|partage|sécurité|menace|bouclier/.test(q)) return { ...base, concept: "Les données personnelles permettent de t’identifier ou parlent de ta vie privée. Une IA n’a pas besoin de connaître ton mot de passe, ton adresse précise, tes documents privés ou les secrets de ta famille pour t’aider à apprendre.", example: "Pour demander de l’aide en maths, écris l’exercice sans ajouter ton nom complet, ton numéro de téléphone, ton adresse ou une photo de ta carte scolaire.", remember: "Si une information est privée, sensible ou inutile pour la question, ne la partage pas. En cas de doute, demande à un adulte de confiance.", challenge: "Fais deux colonnes : « je peux partager » et « je garde privé ». Classe cinq informations de ton choix." };
  if (/apprend|entraî|modèle|préd|machine learning|train|classification|régression/.test(q)) return { ...base, concept: "En apprentissage automatique, on montre des exemples à un algorithme pour construire un modèle. Le modèle repère des régularités, puis produit une prédiction sur de nouvelles données.", example: "On entraîne un modèle avec des exemples de fruits décrits par leur couleur, leur taille et leur forme. Face à un nouveau fruit, il estime ensuite sa catégorie. Une estimation peut être fausse.", remember: "Données → Entraînement → Modèle → Nouvelle donnée → Prédiction. Tester sur de nouveaux exemples permet de mesurer la qualité du modèle.", challenge: "Invente un problème de classification à deux catégories. Quelles données donnerais-tu au modèle pour apprendre ?" };
  if (/vision|image|pixel|photo|objet/.test(q)) return { ...base, concept: "Pour une machine, une image est composée de valeurs numériques organisées en pixels. Un modèle de vision apprend des motifs utiles pour classer une image ou repérer des objets.", example: "Une application agricole peut analyser la photo d’une feuille et estimer si elle présente certains signes visibles. La photo, l’éclairage et les données d’entraînement influencent le résultat.", remember: "Reconnaître une image n’est pas « voir » comme un humain : le modèle calcule une prédiction à partir de motifs appris.", challenge: "Observe deux objets de la même catégorie. Note trois indices visuels qui les rapprochent et un qui les différencie." };
  if (/chatbot|langage|mot|llm|token|dialogue|intention/.test(q)) return { ...base, concept: "Les modèles de langage travaillent avec des unités de texte et des relations statistiques apprises sur de nombreux exemples. Ils utilisent le contexte pour générer une suite de mots plausible.", example: "Si tu écris « À Dakar, pendant l’hivernage… », le contexte aide le modèle à proposer une suite liée à la saison des pluies. Une suite plausible n’est cependant pas automatiquement vraie.", remember: "Un modèle de langage génère du texte à partir de probabilités et du contexte ; il ne garantit pas la vérité de chaque phrase.", challenge: "Écris deux questions sur le même sujet : une très vague et une très précise. Compare les réponses que tu attendrais." };
  if (/génér|hallucination|créer|créatif|histoire|dessin/.test(q)) return { ...base, concept: "L’IA générative fabrique de nouveaux contenus — texte, image, son ou code — à partir de motifs appris. Elle peut être créative, mais aussi inventer une information avec assurance : on parle alors d’hallucination.", example: "Tu peux demander une idée d’affiche sur le tri des déchets, puis choisir, corriger et enrichir la proposition. Pour un chiffre ou un fait important, vérifie ensuite une source fiable.", remember: "Utilise l’IA comme partenaire de création, pas comme source infaillible. Tu restes responsable du résultat final.", challenge: "Imagine une création où l’IA propose trois idées et où toi, tu gardes le rôle de directeur ou directrice du projet." };
  return base;
}

// Registre des événements « à n'afficher qu'une fois » (tutoriel, récompenses, badges).
export const seenEventsCache = new Set<string>();

export function getEventStorageKey(userScope?: string): string {
  return userScope ? `keria_seen_events_${userScope.replace(/\s+/g, '_').toLowerCase()}` : "keria_seen_events";
}

export function hasSeenEvent(key: string, userScope?: string): boolean {
  if (seenEventsCache.has(key)) return true;
  if (typeof window === "undefined") return true;
  try {
    const storageKey = getEventStorageKey(userScope);
    const store = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return !!store[key];
  } catch { return false; }
}

export function markEventSeen(key: string, userScope?: string, sendToServer = true) {
  seenEventsCache.add(key);
  if (typeof window === "undefined") return;
  try {
    const storageKey = getEventStorageKey(userScope);
    const store = JSON.parse(localStorage.getItem(storageKey) || "{}");
    store[key] = true;
    localStorage.setItem(storageKey, JSON.stringify(store));
    if (key === "tutorial" || key === "tuto_done") {
      localStorage.setItem("keria_tutorial_completed", "true");
    }
  } catch { /* stockage local indisponible (navigation privée) : le suivi local est facultatif */ }

  if (sendToServer) {
    try {
      fetch("/api/progress/mark-event-seen", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: key })
      }).catch(() => {});
    } catch { /* envoi de statistiques non essentiel : un échec ne doit jamais gêner l'enfant */ }
  }
}
