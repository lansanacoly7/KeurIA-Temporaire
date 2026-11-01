// Données de la carte des niveaux "Jeux & défis" (7-9 ans uniquement).
// Chaque jeu ou défi est intimement lié à la complétion du module correspondant du parcours (p1 à p10).
// Il faut obligatoirement terminer le Module 1 pour déverrouiller le Jeu 1, puis chaque module pour le défi suivant.

export type LevelKind = "quiz" | "jeu" | "coffre" | "defi";

export type GameLevel = {
  /** Identifiant persistant, envoyé comme lessonId à /api/progress. */
  id: string;
  /** Index du monde (0, 1 ou 2). */
  world: 0 | 1 | 2;
  /** Position sur le chemin SVG du monde (coordonnées du prototype, viewBox 780x980). */
  x: number;
  y: number;
  kind: LevelKind;
  title: string;
  tag: string;
  xp: number;
  meta: string;
  desc: string;
  /** Index dans `realGames` (DashboardActivities.tsx) — présent pour kind="jeu" ou "defi". */
  gameIndex?: number;
  /** Index dans `games` / `gameChallenges` — présent seulement pour kind="quiz". */
  quizIndex?: number;
  /** Module ID requis pour débloquer le jeu (ex: 'p1') */
  moduleId: string;
  /** Titre lisible du module associé */
  moduleTitle: string;
  /** Numéro du module (1 à 10) */
  moduleNumber: number;
};

export type GameWorld = {
  title: string;
  kicker: string;
  /** Image Palou "gardien du monde", affichée à côté du bandeau de titre. */
  guardianSrc: string;
  levelRange: [number, number];
};

export const GAME_WORLDS: GameWorld[] = [
  {
    title: "Les fondations de l'IA",
    kicker: "MONDE 1 · MODULES 1 À 3",
    guardianSrc: "/images/palou/game-palou-reflexion.png",
    levelRange: [1, 3],
  },
  {
    title: "La plaine des données & vision",
    kicker: "MONDE 2 · MODULES 4 À 6",
    guardianSrc: "/images/palou/game-palou-surprise.png",
    levelRange: [4, 6],
  },
  {
    title: "Le rocher de la création & citoyenneté",
    kicker: "MONDE 3 · MODULES 7 À 10",
    guardianSrc: "/images/palou/game-palou-main.png",
    levelRange: [7, 10],
  },
];

const levelId = (n: number) => `jeux7-9-${String(n).padStart(2, "0")}`;

export const GAME_LEVELS: GameLevel[] = [
  // ---- Monde 1 : Les fondations de l'IA (Modules 1 à 3) ----
  {
    id: levelId(1),
    world: 0,
    x: 400,
    y: 200,
    kind: "jeu",
    title: "C'est quoi l'IA ?",
    tag: "Module 1",
    xp: 30,
    meta: "Débutant",
    desc: "Associe chaque symbole à la bonne idée pour prouver que tu as compris ce qu'est une IA !",
    gameIndex: 1,
    moduleId: "p1",
    moduleTitle: "Bonjour, l’IA !",
    moduleNumber: 1
  },
  {
    id: levelId(2),
    world: 0,
    x: 320,
    y: 320,
    kind: "jeu",
    title: "Détective IA",
    tag: "Module 2",
    xp: 40,
    meta: "Débutant",
    desc: "Trie les objets du quotidien : qui utilise l'IA et qui est une simple machine ?",
    gameIndex: 2,
    moduleId: "p2",
    moduleTitle: "L’IA autour de moi",
    moduleNumber: 2
  },
  {
    id: levelId(3),
    world: 0,
    x: 380,
    y: 480,
    kind: "jeu",
    title: "Le grand tri des données",
    tag: "Module 3",
    xp: 50,
    meta: "Explorateur",
    desc: "Range les données et les images dans la bonne famille pour préparer l'IA !",
    gameIndex: 12,
    moduleId: "p3",
    moduleTitle: "La grande famille des données",
    moduleNumber: 3
  },

  // ---- Monde 2 : La plaine des données & vision (Modules 4 à 6) ----
  {
    id: levelId(4),
    world: 1,
    x: 570,
    y: 220,
    kind: "jeu",
    title: "Entraînement Express",
    tag: "Module 4",
    xp: 40,
    meta: "Débutant",
    desc: "Entraîne l'IA en lui montrant les bons exemples de chats et de chiens !",
    gameIndex: 3,
    moduleId: "p4",
    moduleTitle: "Apprendre avec des exemples",
    moduleNumber: 4
  },
  {
    id: levelId(5),
    world: 1,
    x: 310,
    y: 350,
    kind: "jeu",
    title: "L'IA qui regarde",
    tag: "Module 5",
    xp: 50,
    meta: "Défenseur",
    desc: "Découvre la vision par ordinateur en apprenant à l'IA à reconnaître tes gestes !",
    gameIndex: 13,
    moduleId: "p5",
    moduleTitle: "L’IA qui regarde",
    moduleNumber: 5
  },
  {
    id: levelId(6),
    world: 1,
    x: 385,
    y: 480,
    kind: "jeu",
    title: "L'IA qui parle",
    tag: "Module 6",
    xp: 50,
    meta: "Défenseur",
    desc: "Interagis avec l'assistant vocal en lui donnant le contexte parfait !",
    gameIndex: 19,
    moduleId: "p6",
    moduleTitle: "L’IA qui parle",
    moduleNumber: 6
  },

  // ---- Monde 3 : Le rocher de la création & citoyenneté (Modules 7 à 10) ----
  {
    id: levelId(7),
    world: 2,
    x: 450,
    y: 150,
    kind: "jeu",
    title: "Dessine pour l'IA",
    tag: "Module 7",
    xp: 45,
    meta: "Défenseur",
    desc: "Dessine des objets à l'écran et regarde Palou deviner en temps réel ce que tu représentes !",
    gameIndex: 14,
    moduleId: "p7",
    moduleTitle: "Créer avec l’IA",
    moduleNumber: 7
  },
  {
    id: levelId(8),
    world: 2,
    x: 230,
    y: 270,
    kind: "jeu",
    title: "Mon Bouclier Numérique",
    tag: "Module 8",
    xp: 45,
    meta: "Explorateur",
    desc: "Active tes réflexes de sécurité et protège tes informations personnelles !",
    gameIndex: 7,
    moduleId: "p8",
    moduleTitle: "Mon bouclier numérique",
    moduleNumber: 8
  },
  {
    id: levelId(9),
    world: 2,
    x: 250,
    y: 390,
    kind: "jeu",
    title: "Détective des Fausses Images",
    tag: "Module 9",
    xp: 45,
    meta: "Explorateur",
    desc: "Ouvre l'œil ! Détecte les anomalies et les détails bizarres des images générées par IA !",
    gameIndex: 6,
    moduleId: "p9",
    moduleTitle: "Vrai, faux… vérifions !",
    moduleNumber: 9
  },
  {
    id: levelId(10),
    world: 2,
    x: 450,
    y: 425,
    kind: "defi",
    title: "Grand Défi du Quartier",
    tag: "Module 10",
    xp: 60,
    meta: "Grand Explorateur",
    desc: "Mets tout ce que tu as appris au service de ton quartier et relève le grand défi final !",
    gameIndex: 18,
    moduleId: "p10",
    moduleTitle: "Une IA pour mon quartier",
    moduleNumber: 10
  },
];

export const TOTAL_LEVELS = GAME_LEVELS.length;
