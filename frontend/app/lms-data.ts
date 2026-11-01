export type AgeKey = "7-9" | "10-12" | "13-15";

export type Lesson = { id: string; title: string; type: "histoire"|"jeu"|"quiz"|"projet"|"atelier"; minutes: number; xp: number; stars: number };

export type World = {
  id: string; 
  icon: string; 
  title: string; 
  description: string; 
  color: string;
  lessons: Lesson[];
};

const W = (id:string,icon:string,title:string,description:string,color:string,lessons:string[]):World => ({
  id,icon,title,description,color,
  lessons: lessons.map((title,i)=>({id:`${id}-${i+1}`,title,type:(["histoire","jeu","quiz","atelier","projet"] as const)[i%5],minutes:5+i*2,xp:20+i*10, stars: 3}))
});

export const tracks: Record<AgeKey,{label:string,name:string,tagline:string,accent:string,worlds:World[]}> = {
  "7-9": {label:"7–9 ans",name:"Petits Explorateurs",tagline:"Je découvre l’IA avec des histoires, des images et des jeux.",accent:"#f4b942",worlds:[
    W("p1","bot","Bonjour, l’IA !","Rencontre Palou et découvre ce qu’une IA peut faire.","sun",["C’est quoi une IA ?","Comment apprend une IA ?","IA ou pas IA ?","Ma chasse aux IA"]),
    W("p2","eye","L’IA autour de moi","Repère l’IA à la maison, à l’école et dans la ville.","mint",["Dans mon téléphone","À l’école","Dans les transports","Bingo de l’IA"]),
    W("p3","basket","La grande famille des données","Trie, classe et compare comme une petite IA.","coral",["À quoi servent les données ?","Le panier de fruits","Trouve l’intrus","Mon premier classement"]),
    W("p4","paw","Apprendre avec des exemples","Entraîne Palou à reconnaître des animaux et des objets.","blue",["Montre-moi des exemples","Chat ou chien ?","Quand Palou se trompe","Entraîne ton mini-robot"]),
    W("p5","image","L’IA qui regarde","Découvre comment une machine peut reconnaître une image.","purple",["Que vois-tu ?","Formes et couleurs","Photo mystère","Défi vision"]),
    W("p6","message","L’IA qui parle","Joue avec les mots, la voix et les assistants.","mint",["Parler à une machine","Les mots magiques","Question claire","Mon mini dialogue"]),
    W("p7","palette","Créer avec l’IA","Imagine des histoires et des images en restant le créateur.","sun",["L’IA imagine avec moi","Décris ton dessin","Une histoire à deux","Mon affiche créative"]),
    W("p8","shield","Mon bouclier numérique","Apprends ce qu’il faut garder privé.","coral",["Secret ou pas secret ?","Je partage ou pas ?","Un adulte de confiance","Mission bouclier"]),
    W("p9","search","Vrai, faux… vérifions !","Découvre qu’une IA peut parfois se tromper.","blue",["Palou peut se tromper","Je vérifie","Le détective des images","Vrai ou faux ?"]),
    W("p10","globe","Une IA pour mon quartier","Imagine une IA utile aux gens et à la planète.","green",["Un problème autour de moi","Idées pour le Sénégal","Dessine ta solution","Grand projet Explorateur"]),
  ]},
  "10-12": {label:"10–12 ans",name:"Jeunes Aventuriers",tagline:"Je comprends comment l’IA apprend et je relève des défis.",accent:"#0d846e",worlds:[
    W("a1","compass","Bienvenue dans l’IA","Distingue programmes, robots et intelligence artificielle.","mint",["IA ou simple programme ?","Robot = IA ?","Les super-pouvoirs de l’IA","Mission détective"]),
    W("a2","smartphone","L’IA dans mon quotidien","Explore recommandations, GPS, jeux et assistants.","sun",["Dans mon smartphone","Qui choisit ma vidéo ?","GPS et prédictions","Cartographie ton quotidien"]),
    W("a3","puzzle","Le pouvoir des données","Collecte, trie et questionne les données.","blue",["Une donnée, c’est quoi ?","Bonnes et mauvaises données","Classe comme une IA","Défi dataset"]),
    W("a4","brain","Comment une IA apprend ?","Comprends entraînement, modèle et prédiction.","purple",["Entraîner avec des exemples","Du dataset au modèle","Prédire sans magie","Entraîne Palou"]),
    W("a5","camera","Vision artificielle","Découvre classification et reconnaissance d’images.","coral",["Pixels et indices","Classer une image","Quand la vision se trompe","Défi classification"]),
    W("a6","message","Langage & chatbots","Comprends comment l’IA travaille avec nos mots.","mint",["Des mots aux nombres","Un chatbot, comment ça marche ?","Contexte et intention","Crée un dialogue"]),
    W("a7","sparkles","IA générative","Explore texte, image, son et leurs limites.","sun",["Créer ou copier ?","Texte et images","Hallucinations","Studio créatif"]),
    W("a8","wand","L’école des prompts","Apprends rôle, objectif, contexte et format.","green",["Un prompt précis","ROCF : la recette","Répare le prompt","Battle de prompts"]),
    W("a9","scale","Biais & équité","Découvre pourquoi des données peuvent produire une réponse injuste.","purple",["D’où vient le biais ?","Échantillon équilibré","Décision juste ?","Juge les données"]),
    W("a10","search","Deepfakes & info","Développe tes réflexes de vérification.","coral",["Image vraie ou générée ?","Voix et vidéos","STOP–VÉRIFIE–COMPARE","Détective du web"]),
    W("a11","lock","IA responsable","Protège tes données et questionne les usages.","blue",["Données personnelles","Ce que je ne partage pas","Choix responsables","Charte kEur IA"]),
    W("a12","flag","IA pour le Sénégal","Conçois une solution pour un défi local.","green",["Agriculture et climat","Santé et éducation","Déchets et mobilité","Grand projet Aventurier"]),
  ]},
  "13-15": {label:"13–15 ans",name:"Jeunes Créateurs",tagline:"J’expérimente, je développe mon esprit critique et je crée des projets.",accent:"#6b59a5",worlds:[
    W("c1","brain","Fondamentaux de l’IA","Modèles, algorithmes, données et limites.","purple",["IA : définitions utiles","Règles vs apprentissage","Anatomie d’un système IA","Audit d’un usage"]),
    W("c2","chart","Data Lab","Explore qualité, variables, labels et jeux de données.","blue",["Construire un dataset","Nettoyage et qualité","Labels et caractéristiques","Mini data lab"]),
    W("c3","settings","Machine Learning","Classification, régression et cycle d’entraînement.","mint",["Du problème au modèle","Train & test","Mesurer une prédiction","Simulateur ML"]),
    W("c4","eye","Computer Vision","Explore pixels, classification et détection.","coral",["Images comme données","Classification","Détection d’objets","Projet vision"]),
    W("c5","message","NLP & langage","Tokens, contexte, intentions et génération.","sun",["Découper le langage","Comprendre une intention","Générer du texte","Mini chatbot"]),
    W("c6","dna","IA générative & LLM","Comprends modèles génératifs et grands modèles de langage.","purple",["Prédire le prochain token","LLM et contexte","Hallucinations","Comparer des réponses"]),
    W("c7","keyboard","Prompt Engineering","Structure des prompts et évaluation des résultats.","green",["Rôle + objectif + contexte","Contraintes et format","Few-shot","Prompt challenge"]),
    W("c8","scale","Éthique, biais & société","Analyse équité, transparence et responsabilité.","coral",["Mesurer un biais","Cas de décision automatisée","Qui est responsable ?","Débat éthique"]),
    W("c9","search","Esprit critique & médias","Détecte manipulations, deepfakes et fausses certitudes.","blue",["Sources et preuves","Deepfakes","Fact-checking","Enquête numérique"]),
    W("c10","lock","Sécurité & vie privée","Comprends traces numériques et données sensibles.","mint",["Menaces et données","Prompt injection : idée générale","Vie privée","Audit de sécurité"]),
    W("c11","globe","IA en Afrique","Étudie agriculture, langues, santé, climat et mobilité.","sun",["Cas d’usage locaux","Langues nationales","Données et inclusion","Étude d’impact"]),
    W("c12","rocket","AI Maker Lab","Passe de l’idée au prototype responsable.","green",["Définir le problème","Prototyper","Tester et améliorer","Demo Day kEur IA"]),
  ]}
};

export const games = [
  ["target","IA ou pas IA ?","Reconnais les vrais usages de l’IA"], ["basket","Data Basket","Classe les données au bon endroit"],
  ["paw","Classif’ Express","Entraîne un classificateur visuel"], ["wand","Prompt Fixer","Répare des prompts trop vagues"],
  ["search","Deepfake Détective","Repère les indices suspects"], ["shield","Privacy Hero","Protège les données personnelles"],
  ["scale","Bias Buster","Repère les jeux de données déséquilibrés"], ["brain","Model Match","Associe un problème à une solution IA"],
  ["check","Fact-check Sprint","Choisis la meilleure méthode de vérification"], ["globe","Impact Lab","Imagine une IA utile au Sénégal"]
] as const;

export const skillBadges = [
  // Accueil & Début de parcours
  { id: "b_tuto", icon: "award", name: "Bienvenu au club", description: "A terminé le tutoriel d'accueil avec Palou !", rarity: "bronze" },
  { id: "b_start", icon: "rocket", name: "En route", description: "A obtenu ses premiers XP : son parcours a commencé !", rarity: "bronze" },
  { id: "b_contact", icon: "bot", name: "Premier contact", description: "A terminé son premier cours (cours 1 du module 1) !", rarity: "bronze" },

  // Défi & Déduction
  { id: "b_detective", icon: "search", name: "Détective Palou", description: "A trouvé toutes les bonnes réponses 3 fois d'affilée !", rarity: "gold" },
  { id: "b_sort", icon: "puzzle", name: "Expert du tri", description: "A réussi plusieurs activités de classement.", rarity: "silver" },
  { id: "b_lynx", icon: "eye", name: "Œil de Lynx", description: "A repéré les différences et les erreurs.", rarity: "silver" },

  // Sécurité & Données
  { id: "b_guard", icon: "shield", name: "Petit Gardien", description: "A appris à protéger ses informations.", rarity: "bronze" },
  { id: "b_secret", icon: "lock", name: "Mes infos, mes secrets", description: "A compris quelles informations doivent rester privées.", rarity: "silver" },

  // Persévérance & Fidélité
  { id: "b_persist", icon: "zap", name: "Je n'abandonne pas", description: "A continué après 20 erreurs sans abandonner !", rarity: "gold" },
  { id: "b_hidden_friend", icon: "star", name: "Ami de Palou", description: "S'est connecté 7 jours d'affilée avec Palou !", rarity: "gold" },

  // Compréhension IA
  { id: "b_eye", icon: "eye", name: "L'Œil Curieux", description: "A découvert sa première IA.", rarity: "bronze" },
  { id: "b_brain", icon: "brain", name: "Petit Apprenti", description: "A compris comment une IA apprend avec des exemples.", rarity: "silver" },
] as const;

export type SkillBadgeId = typeof skillBadges[number]["id"];

// Illustrations des badges (images validées par l'équipe, public/images/badges).
// « L'Œil Curieux » n'a pas encore d'illustration : on garde l'ancienne image.
const BADGE_IMAGES: Record<string, string> = {
  b_eye: "b_eye.jpg",
  b_contact: "Premier_Contact.jpg",
  b_brain: "Petit_Apprenti.jpg",
  b_detective: "Détective_Palou.jpg",
  b_sort: "Expert_du_tri.jpg",
  b_lynx: "Œil_de_Lynx.jpg",
  b_guard: "Petit_Gardien.jpg",
  b_secret: "Mes_infos_mes_secrets.jpg",
  b_persist: "Je_n_abandonne_pas.jpg",
  b_start: "En_Route.jpg",
  b_tuto: "bienvenue_au_club.jpg",
  b_hidden_friend: "Ami_de_Palou.jpg",
};

/** Chemin de l'image d'un badge de compétence (accents encodés pour l'URL). */
export function badgeImage(id: string) {
  return encodeURI(`/images/badges/${BADGE_IMAGES[id] ?? `${id}.jpg`}`);
}

export function computeEarnedBadges(
  completedCount: number,
  xp: number,
  streak: number,
  options?: {
    tutorialCompleted?: boolean;
    completedLessons?: string[];
    perfectStreak?: number;
    errorCount?: number;
    badges?: string[];
  }
): string[] {
  const earned: string[] = [];

  // 1. "Bienvenu au club" (b_tuto) : Reçu après avoir fini le tutoriel
  if (options?.tutorialCompleted || options?.badges?.includes("b_tuto")) {
    earned.push("b_tuto");
  }

  // 2. "En route" (b_start) : Obtenu dès ses premiers XP (parcours commencé)
  if (xp > 0 || options?.badges?.includes("b_start")) {
    earned.push("b_start");
  }

  // 3. "Premier contact" (b_contact) : Décerné après avoir fini le cours 1 du module 1
  const hasFinishedLesson1 = options?.completedLessons?.some(id =>
    id === "p1-1" || id === "a1-1" || id === "c1-1" || id.endsWith("-1")
  ) || completedCount >= 1;
  if (hasFinishedLesson1 || options?.badges?.includes("b_contact")) {
    earned.push("b_contact");
  }

  // 4. "Détective Palou" (b_detective) : Reçu après 3 sans-faute consécutifs
  if ((options?.perfectStreak !== undefined && options.perfectStreak >= 3) || options?.badges?.includes("b_detective")) {
    earned.push("b_detective");
  }

  // 5. "Ami de Palou" (b_hidden_friend) : Connexion de 7 jours d'affilée
  if (streak >= 7 || options?.badges?.includes("b_hidden_friend")) {
    earned.push("b_hidden_friend");
  }

  // 6. "Je n'abandonne pas" (b_persist) : Reçu après 20 erreurs sans abandonner
  if ((options?.errorCount !== undefined && options.errorCount >= 20) || options?.badges?.includes("b_persist")) {
    earned.push("b_persist");
  }

  // Autres badges de progression générale
  if (completedCount >= 2) earned.push("b_eye");
  if (completedCount >= 4) earned.push("b_brain");
  if (completedCount >= 6) earned.push("b_sort");
  if (completedCount >= 8) earned.push("b_guard");
  if (xp >= 150) earned.push("b_lynx");
  if (xp >= 300) earned.push("b_secret");

  return Array.from(new Set(earned));
}

