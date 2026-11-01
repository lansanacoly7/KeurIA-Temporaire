/**
 * Questions d'échange pour le dîner basées STRICTEMENT sur ce que l'enfant a appris.
 * Chaque question est reliée aux ateliers et notions réellement traversés par l'enfant.
 */

export interface DinnerTopic {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  concept: string;
  question: string;
  hint: string;
}

// ─── QUESTIONS PAR LEÇON / MODULE (7-9 ANS : PETITS EXPLORATEURS) ────────────

const LESSON_QUESTIONS: Record<string, DinnerTopic> = {
  // ── Module 1 : Bonjour, l’IA !
  "p1-1": {
    lessonId: "p1-1",
    lessonTitle: "C’est quoi une IA ?",
    moduleTitle: "Bonjour, l’IA !",
    concept: "Différence entre magie et outil numérique",
    question: "Palou t'a montré qu'un téléphone pouvait reconnaître une chanson. D'après toi, comment fait la machine pour savoir quelle musique passe sans avoir de vraies oreilles ?",
    hint: "La machine compare le son à des milliers d'exemples enregistrés par des humains. Félicitez votre enfant s'il mentionne la comparaison avec des exemples !"
  },
  "p1-2": {
    lessonId: "p1-2",
    lessonTitle: "Comment apprend une IA ?",
    moduleTitle: "Bonjour, l’IA !",
    concept: "Complémentarité Humain vs Machine",
    question: "Si Palou et toi deviez organiser une grande fête à la maison, quelle tâche confierais-tu à la machine et quelle tâche garderais-tu pour toi ?",
    hint: "La machine est très forte pour calculer et trier rapidement des listes, mais seul un humain ressent de la joie, choisit ce qui fait plaisir et prend des décisions bienveillantes."
  },
  "p1-3": {
    lessonId: "p1-3",
    lessonTitle: "IA ou pas IA ?",
    moduleTitle: "Bonjour, l’IA !",
    concept: "Repérer un usage réel de l'IA",
    question: "Dans le salon ou la cuisine, est-ce que notre réfrigérateur ou notre lampe sont des intelligences artificielles ? Quel est le bon indice pour le savoir ?",
    hint: "Un simple appareil électrique s'allume avec un bouton. Une IA a besoin de reconnaître (une voix, un visage), de recommander ou d'apprendre avec des données."
  },
  "p1-4": {
    lessonId: "p1-4",
    lessonTitle: "Ma chasse aux IA",
    moduleTitle: "Bonjour, l’IA !",
    concept: "Observation responsable et vie privée",
    question: "Quand tu as mené ton enquête sur les technologies avec Palou, pourquoi est-ce interdit de noter les mots de passe ou les adresses des personnes ?",
    hint: "Pour respecter la vie privée. On observe la fonction d'un outil utile, jamais les secrets ou la vie personnelle des gens."
  },

  // ── Module 2 : L'IA autour de moi
  "p2-1": {
    lessonId: "p2-1",
    lessonTitle: "Dans mon téléphone",
    moduleTitle: "L’IA autour de moi",
    concept: "Suggestions de mots et écriture",
    question: "Quand un téléphone devine le prochain mot que l'on veut écrire par message, comment sait-il ce qui va suivre ?",
    hint: "Il regarde les lettres déjà écrites et utilise des millions d'exemples de phrases fréquentes pour proposer la suite la plus probable."
  },
  "p2-2": {
    lessonId: "p2-2",
    lessonTitle: "À l’école",
    moduleTitle: "L’IA autour de moi",
    concept: "Accessibilité et outils utiles",
    question: "Comment un outil informatique peut-il aider un élève qui entend mal ou qui a du mal à lire sans faire le devoir à sa place ?",
    hint: "En lisant le texte à haute voix ou en sous-titrant les paroles. La machine facilite l'accès, mais c'est l'élève qui réfléchit."
  },
  "p2-3": {
    lessonId: "p2-3",
    lessonTitle: "Dans les transports",
    moduleTitle: "L’IA autour de moi",
    concept: "Estimation d'un trajet et circulation",
    question: "Quand une application GPS propose le meilleur chemin pour aller en ville, sur quoi se base-t-elle pour choisir la route ?",
    hint: "Elle compare les distances, l'heure et la circulation en temps réel signalée par d'autres véhicules. Elle calcule le chemin le plus fluide."
  },
  "p2-4": {
    lessonId: "p2-4",
    lessonTitle: "Bingo de l’IA",
    moduleTitle: "L’IA autour de moi",
    concept: "Repérage des technologies dans le quartier",
    question: "Quel objet ou application de notre quotidien t'a le plus surpris en découvrant qu'il pouvait utiliser une petite IA ?",
    hint: "Laissez votre enfant citer le GPS, la reconnaissance vocale ou les recommandations de vidéos, et demandez-lui pourquoi c'est utile."
  },

  // ── Module 3 : La grande famille des données
  "p3-1": {
    lessonId: "p3-1",
    lessonTitle: "À quoi servent les données ?",
    moduleTitle: "La grande famille des données",
    concept: "Notion de donnée utile",
    question: "Si tu devais donner des informations à Palou pour qu'il reconnaisse les mangues et les oranges, quelles données seraient utiles et lesquelles ne serviraient à rien ?",
    hint: "La couleur, la forme et la taille sont des données utiles. Le prénom du marchand ou le prix ne servent pas à reconnaître le fruit !"
  },
  "p3-2": {
    lessonId: "p3-2",
    lessonTitle: "Le panier de fruits",
    moduleTitle: "La grande famille des données",
    concept: "Critères de tri et de classement",
    question: "Si on devait trier tout ce qu'il y a sur la table ce soir comme une petite machine, quelle règle de classement choisirais-tu ?",
    hint: "Proposez de classer par matière (verre, métal, bois), par couleur ou par fonction (couverts, nourriture). Une donnée sert à ranger avec un critère clair."
  },
  "p3-3": {
    lessonId: "p3-3",
    lessonTitle: "Trouve l’intrus",
    moduleTitle: "La grande famille des données",
    concept: "Détection des anomalies",
    question: "Dans ton jeu aujourd'hui, une chaussette s'était glissée dans le panier de fruits de Palou. Pourquoi l'IA l'a-t-elle repérée comme un intrus ?",
    hint: "Parce qu'elle ne partage pas le critère du groupe : ce n'est pas un aliment comestible qui pousse sur un arbre."
  },
  "p3-4": {
    lessonId: "p3-4",
    lessonTitle: "Mon premier classement",
    moduleTitle: "La grande famille des données",
    concept: "Organisation de données",
    question: "Comment as-tu aidé Palou à ranger la bibliothèque de la classe aujourd'hui sans mélanger les histoires ?",
    hint: "En choisissant un critère comme le thème ou la taille des livres. Un bon classement annonce toujours son critère."
  },

  // ── Module 4 : Apprendre avec des exemples
  "p4-1": {
    lessonId: "p4-1",
    lessonTitle: "Montre-moi des exemples",
    moduleTitle: "Apprendre avec des exemples",
    concept: "L'apprentissage par l'exemple",
    question: "Est-ce qu'une IA apprend mieux si on lui montre un seul dessin de chat ou si on lui montre plein de chats différents ?",
    hint: "Avec plein d'exemples variés ! Un seul chat ne suffit pas car les chats ont des couleurs, des poils et des postures différentes."
  },
  "p4-2": {
    lessonId: "p4-2",
    lessonTitle: "Chat ou chien ?",
    moduleTitle: "Apprendre avec des exemples",
    concept: "Étiquettes et classification",
    question: "À quoi sert une « étiquette » quand on entraîne un robot comme Palou à reconnaître des animaux ?",
    hint: "L'étiquette donne le bon nom à chaque famille d'exemples pour que la machine associe les images au bon mot."
  },
  "p4-3": {
    lessonId: "p4-3",
    lessonTitle: "Quand Palou se trompe",
    moduleTitle: "Apprendre avec des exemples",
    concept: "Comprendre l'erreur d'un modèle",
    question: "Aujourd'hui, Palou s'est trompé devant une photo sombre d'animal. Pourquoi la machine a-t-elle fait une erreur ?",
    hint: "Parce que l'ombre cachait les indices visuels (les oreilles, la queue) ou parce qu'il n'avait jamais vu d'exemple dans le noir."
  },
  "p4-4": {
    lessonId: "p4-4",
    lessonTitle: "Entraîne ton mini-robot",
    moduleTitle: "Apprendre avec des exemples",
    concept: "Test et amélioration continue",
    question: "Comment as-tu appris à ton mini-robot à trier ce qui se recycle dans la classe ?",
    hint: "En lui montrant des bouteilles en plastique et des cartons propres, puis en vérifiant qu'il ne se trompait pas avec de nouveaux objets."
  },

  // ── Module 5 : L’IA qui regarde
  "p5-1": {
    lessonId: "p5-1",
    lessonTitle: "Que vois-tu ?",
    moduleTitle: "L’IA qui regarde",
    concept: "Les pixels d'une image",
    question: "Quand on zoome très fort sur une photo dans l'écran, que voit-on apparaître à la place du dessin ?",
    hint: "Des milliers de petits carrés colorés appelés des pixels. L'ordinateur ne voit pas un objet, il voit une grille de pixels."
  },
  "p5-2": {
    lessonId: "p5-2",
    lessonTitle: "Formes et couleurs",
    moduleTitle: "L’IA qui regarde",
    concept: "Indices visuels",
    question: "Quels indices visuels aident le plus Palou à reconnaître un ballon sans le confondre avec une assiette ?",
    hint: "La forme ronde, les motifs et la texture. Une machine cherche des contours et des contrastes."
  },
  "p5-3": {
    lessonId: "p5-3",
    lessonTitle: "Photo mystère",
    moduleTitle: "L’IA qui regarde",
    concept: "Qualité de l'image",
    question: "Si une photo est très floue ou trop sombre, pourquoi l'application de vision risque-t-elle de donner une mauvaise réponse ?",
    hint: "Parce que les indices importants sont cachés ou déformés. Une machine a besoin d'images claires pour bien décider."
  },
  "p5-4": {
    lessonId: "p5-4",
    lessonTitle: "Défi vision",
    moduleTitle: "L’IA qui regarde",
    concept: "Robustesse de la reconnaissance",
    question: "Quel dessin as-tu préparé pour tester la vision de Palou ? Est-ce qu'il a réussi à deviner du premier coup ?",
    hint: "Laissez votre enfant raconter son dessin et observez comment il explique la réaction de l'outil."
  },

  // ── Module 6 : L’IA qui parle
  "p6-1": {
    lessonId: "p6-1",
    lessonTitle: "Parler à une machine",
    moduleTitle: "L’IA qui parle",
    concept: "Reconnaissance vocale",
    question: "Pourquoi est-ce plus difficile pour un assistant vocal de comprendre ce qu'on dit quand il y a du bruit dans la cour de l'école ?",
    hint: "Parce que le micro mélange les bruits ambiants avec la voix. La machine a besoin d'un son clair pour distinguer les mots."
  },
  "p6-2": {
    lessonId: "p6-2",
    lessonTitle: "Les mots magiques",
    moduleTitle: "L’IA qui parle",
    concept: "Politesse et clarté",
    question: "Est-ce qu'une enceinte vocale a des sentiments si on lui parle méchamment ou gentiment ?",
    hint: "Non, elle ne ressent rien car c'est une machine. Mais parler avec politesse et clarté nous aide, nous les humains, à garder de bonnes habitudes !"
  },
  "p6-3": {
    lessonId: "p6-3",
    lessonTitle: "Question claire",
    moduleTitle: "L’IA qui parle",
    concept: "Importance du contexte",
    question: "Pourquoi dire « Quelle est la météo à Dakar demain ? » marche beaucoup mieux que de crier seulement « Météo » à l'assistant ?",
    hint: "Parce qu'on donne le lieu et le moment. C'est ce qu'on appelle donner du contexte pour éviter les erreurs."
  },
  "p6-4": {
    lessonId: "p6-4",
    lessonTitle: "Mon mini dialogue",
    moduleTitle: "L’IA qui parle",
    concept: "Limites des assistants vocaux",
    question: "Quelle information personnelle ne doit-on JAMAIS donner à un assistant vocal, même s'il nous la demande poliment ?",
    hint: "Son mot de passe, son adresse de maison ou des secrets de famille."
  },

  // ── Module 7 : Créer avec l’IA
  "p7-1": {
    lessonId: "p7-1",
    lessonTitle: "L’IA imagine avec moi",
    moduleTitle: "Créer avec l’IA",
    concept: "L'enfant reste le créateur",
    question: "Quand Palou te propose plusieurs idées d'histoire ou de dessin, qui est le véritable auteur de la création finale ?",
    hint: "C'est toi l'enfant ! L'IA propose des idées comme une boîte à outils, mais c'est l'humain qui choisit, transforme et valide."
  },
  "p7-2": {
    lessonId: "p7-2",
    lessonTitle: "Décris ton dessin",
    moduleTitle: "Créer avec l’IA",
    concept: "Précision d'une description",
    question: "Comment as-tu décrit ton dessin du baobab à Palou pour qu'il comprenne exactement ce que tu avais en tête ?",
    hint: "En donnant des détails précis : les couleurs du ciel, le coucher de soleil et les personnages. Plus la consigne est riche, meilleur est le résultat."
  },
  "p7-3": {
    lessonId: "p7-3",
    lessonTitle: "Une histoire à deux",
    moduleTitle: "Créer avec l’IA",
    concept: "Co-création responsable",
    question: "Quelle fin as-tu choisie pour l'histoire inventée avec Palou aujourd'hui ?",
    hint: "Écoutez votre enfant raconter son récit. Valorisez ses choix personnels par rapport aux suggestions de la machine."
  },
  "p7-4": {
    lessonId: "p7-4",
    lessonTitle: "Mon affiche créative",
    moduleTitle: "Créer avec l’IA",
    concept: "Message utile et responsable",
    question: "Quel message important pour l'école ou le quartier as-tu voulu transmettre avec ton affiche ?",
    hint: "Une création utile rassemble les gens et transmet un message vrai, sans fausse rumeur."
  },

  // ── Module 8 : Mon bouclier numérique
  "p8-1": {
    lessonId: "p8-1",
    lessonTitle: "Secret ou pas secret ?",
    moduleTitle: "Mon bouclier numérique",
    concept: "Informations privées vs publiques",
    question: "Quelle est la différence entre une information qu'on peut partager à tout le monde et une information qu'on garde dans son bouclier secret ?",
    hint: "Les mots de passe, adresses et photos de famille sont privés ou secrets. La météo ou sa couleur préférée sont partageables sans risque."
  },
  "p8-2": {
    lessonId: "p8-2",
    lessonTitle: "Je partage ou pas ?",
    moduleTitle: "Mon bouclier numérique",
    concept: "Droit à l'image et consentement",
    question: "Avant de publier ou d'envoyer la photo d'un camarade de classe à quelqu'un, que faut-il toujours faire ?",
    hint: "Lui demander son accord et l'accord d'un adulte responsable. C'est le respect du droit à l'image."
  },
  "p8-3": {
    lessonId: "p8-3",
    lessonTitle: "Un adulte de confiance",
    moduleTitle: "Mon bouclier numérique",
    concept: "Réflexe de protection",
    question: "Si tu reçois un message bizarre sur un écran ou qu'une application te demande ton adresse, qui sont les adultes vers qui tu peux te tourner ?",
    hint: "Les parents, l'enseignant ou un tuteur de confiance. Un enfant ne doit jamais rester seul face à une situation douteuse en ligne."
  },
  "p8-4": {
    lessonId: "p8-4",
    lessonTitle: "Mission bouclier",
    moduleTitle: "Mon bouclier numérique",
    concept: "Règles d'or de cybersécurité",
    question: "Quelles sont les 4 règles d'or de ton bouclier numérique de Petit Explorateur ?",
    hint: "1. Garder ses mots de passe secrets. 2. Réfléchir avant de cliquer. 3. Respecter les autres. 4. En parler à un adulte de confiance."
  },

  // ── Module 9 : Vrai, faux… vérifions !
  "p9-1": {
    lessonId: "p9-1",
    lessonTitle: "Palou peut se tromper",
    moduleTitle: "Vrai, faux… vérifions !",
    concept: "L'IA n'est pas infaillible",
    question: "Est-ce qu'une intelligence artificielle a toujours raison ? Si un robot t'affirme une bêtise avec beaucoup d'assurance, que dois-tu faire ?",
    hint: "Une IA peut se tromper ou inventer des réponses fausses (hallucinations). Il ne faut jamais la croire sur parole sans vérifier."
  },
  "p9-2": {
    lessonId: "p9-2",
    lessonTitle: "Je vérifie",
    moduleTitle: "Vrai, faux… vérifions !",
    concept: "Source et date d'une information",
    question: "Quand on voit une annonce extraordinaire sur Internet, quels sont les deux indices indispensables à vérifier avant d'y croire ?",
    hint: "La source (qui a écrit cela ?) et la date (est-ce récent ou ancien ?). Une source fiable a des preuves vérifiables."
  },
  "p9-3": {
    lessonId: "p9-3",
    lessonTitle: "Le détective des images",
    moduleTitle: "Vrai, faux… vérifions !",
    concept: "Images générées et deepfakes",
    question: "Si une photo a l'air très belle et nette sur un téléphone, est-ce que cela prouve qu'elle est vraie ?",
    hint: "Non ! Une image peut être créée de toutes pièces par une IA ou sortie de son contexte. On cherche d'autres indices pour vérifier."
  },
  "p9-4": {
    lessonId: "p9-4",
    lessonTitle: "Vrai ou faux ?",
    moduleTitle: "Vrai, faux… vérifions !",
    concept: "Méthode STOP-SOURCE-COMPARE",
    question: "Quel est ton réflexe de détective numérique avant de partager une histoire surprenante à tes amis ?",
    hint: "S'arrêter, respirer, chercher la source, comparer avec un site sérieux, puis décider. Ralentir évite de propager des fausses nouvelles."
  },

  // ── Module 10 : Une IA pour mon quartier
  "p10-1": {
    lessonId: "p10-1",
    lessonTitle: "Un problème autour de moi",
    moduleTitle: "Une IA pour mon quartier",
    concept: "Partir d'un vrai besoin",
    question: "Quel problème concret de ton école ou de ton quartier aimerais-tu aider à résoudre avec une technologie utile ?",
    hint: "La propreté de la cour, l'arrosage des plantes ou le partage des livres. Un bon projet part d'un vrai besoin humain."
  },
  "p10-2": {
    lessonId: "p10-2",
    lessonTitle: "Idées pour le Sénégal",
    moduleTitle: "Une IA pour mon quartier",
    concept: "Impact local en Afrique",
    question: "Comment une petite IA pourrait-elle aider les agriculteurs ou les pêcheurs au Sénégal dans leur travail quotidien ?",
    hint: "En prévoyant la météo, en observant l'état des feuilles de culture ou en signalant les périodes propices pour préserver la nature."
  },
  "p10-3": {
    lessonId: "p10-3",
    lessonTitle: "Dessine ta solution",
    moduleTitle: "Une IA pour mon quartier",
    concept: "Prototypage responsable",
    question: "Comment as-tu imaginé ton prototype pour aider sans filmer les gens ni prendre leurs données personnelles ?",
    hint: "Une solution responsable aide la communauté en respectant la liberté et la vie privée de chacun."
  },
  "p10-4": {
    lessonId: "p10-4",
    lessonTitle: "Grand projet Explorateur",
    moduleTitle: "Une IA pour mon quartier",
    concept: "Présentation et fierté d'apprentissage",
    question: "Quelle a été ta plus grande fierté dans ce parcours d'Explorateur avec Palou ?",
    hint: "Félicitez chaleureusement votre enfant pour sa curiosité, sa régularité et sa capacité à comprendre le numérique sans en être dépendant."
  }
};

// ─── QUESTIONS PAR DÉFAUT PAR MODULE (SI L'ENFANT EST DANS UN MODULE AVANCÉ) ─

const MODULE_FALLBACKS: Record<string, DinnerTopic> = {
  // 10-12 ans
  "a1": {
    lessonId: "a1",
    lessonTitle: "Bienvenue dans l’IA",
    moduleTitle: "Bienvenue dans l’IA",
    concept: "Programme vs Apprentissage",
    question: "Quelle est la différence fondamentale entre une machine qui exécute un programme rigide et une IA qui apprend avec des données ?",
    hint: "Le programme classique suit des règles fixes prévues à l'avance. L'IA extrait elle-même des motifs statistiques à partir d'exemples."
  },
  "a2": {
    lessonId: "a2",
    lessonTitle: "L’IA dans mon quotidien",
    moduleTitle: "L’IA dans mon quotidien",
    concept: "Algorithmes de recommandation",
    question: "Quand une plateforme te propose une vidéo après une autre, comment sait-elle ce qui pourrait te plaire ?",
    hint: "Elle analyse ton historique, le temps passé sur chaque contenu et ce que des profils similaires au tien ont regardé."
  },
  "a3": {
    lessonId: "a3",
    lessonTitle: "Le pouvoir des données",
    moduleTitle: "Le pouvoir des données",
    concept: "Qualité des données",
    question: "Pourquoi les ingénieurs disent-ils que si les données d'entraînement sont mauvaises ou incomplètes, l'IA donnera des résultats trompeurs ?",
    hint: "C'est le principe : « mauvaises données en entrée, mauvaises décisions en sortie ». L'IA ne peut pas deviner ce qu'on ne lui a pas montré."
  },
  "a4": {
    lessonId: "a4",
    lessonTitle: "Comment une IA apprend ?",
    moduleTitle: "Comment une IA apprend ?",
    concept: "Entraînement et modèle",
    question: "Comment expliquerais-tu les trois étapes : le jeu de données (dataset), l'entraînement et la prédiction ?",
    hint: "Le dataset est le livre d'exemples, l'entraînement est le temps d'étude de la machine, et la prédiction est sa réponse face à un cas inédit."
  },
  "a5": {
    lessonId: "a5",
    lessonTitle: "Vision artificielle",
    moduleTitle: "Vision artificielle",
    concept: "Classification visuelle",
    question: "Comment une caméra intelligente peut-elle détecter un piéton ou un obstacle sur la route ?",
    hint: "En découpant l'image en contours et en formes caractéristiques comparées à des milliers de silhouettes de référence."
  },
  "a8": {
    lessonId: "a8",
    lessonTitle: "L’école des prompts",
    moduleTitle: "L’école des prompts",
    concept: "Méthode ROCF",
    question: "Tu as appris la recette d'un bon prompt (ROCF). Si tu devais demander à une IA de t'expliquer les étoiles, que lui préciserais-tu ?",
    hint: "Le Rôle (astronome bienveillant), l'Objectif (expliquer la naissance des étoiles), le Contexte (pour un élève de 11 ans) et le Format (en 5 points clairs)."
  },
  "a9": {
    lessonId: "a9",
    lessonTitle: "Biais & équité",
    moduleTitle: "Biais & équité",
    concept: "Justice algorithmique",
    question: "Si une IA médicale n'était entraînée que sur des patients d'un seul pays, pourquoi risquerait-elle d'être moins efficace au Sénégal ?",
    hint: "Parce que les maladies locales, les climats et les populations diffèrent. Les données doivent être représentatives de tous pour être équitables."
  },
  "a10": {
    lessonId: "a10",
    lessonTitle: "Deepfakes & info",
    moduleTitle: "Deepfakes & info",
    concept: "Détection des trucages",
    question: "Quels sont les indices qui peuvent trahir une fausse vidéo ou une voix imitée par une machine ?",
    hint: "Des mouvements de lèvres mal synchronisés, des reflets bizarres dans les yeux, un ton monocorde ou une absence de source vérifiable."
  },

  // 13-15 ans
  "c1": {
    lessonId: "c1",
    lessonTitle: "Fondamentaux de l’IA",
    moduleTitle: "Fondamentaux de l’IA",
    concept: "Architecture des systèmes intelligents",
    question: "Pourquoi est-il crucial de distinguer un modèle déterministe d'un modèle probabiliste quand on analyse une réponse d'IA ?",
    hint: "Un modèle probabiliste calcule ce qui a le plus de chances d'arriver ou d'être dit, sans jamais posséder de compréhension sémantique réelle."
  },
  "c6": {
    lessonId: "c6",
    lessonTitle: "IA générative & LLM",
    moduleTitle: "IA générative & LLM",
    concept: "Mécanique des grands modèles de langage",
    question: "Comment fonctionne la génération de texte dans un LLM : réfléchit-il avant d'écrire ou prédit-il le mot suivant ?",
    hint: "Il prédit le token (mot ou fragment) le plus probable selon le contexte des mots précédents, sans conscience ni intention."
  },
  "c8": {
    lessonId: "c8",
    lessonTitle: "Éthique, biais & société",
    moduleTitle: "Éthique, biais & société",
    concept: "Responsabilité sociétale",
    question: "Quand un algorithme prend une décision erronée qui pénalise un usager, qui doit être tenu juridiquement et moralement responsable ?",
    hint: "L'entité humaine qui a conçu, validé ou déployé le système. Une machine ne peut pas porter de responsabilité morale ou juridique."
  }
};

// ─── FONCTION PRINCIPALE : DÉTERMINER LA QUESTION DU DÎNER ───────────────────

export function getChildDinnerDiscussion(child: {
  displayName: string;
  totalLessons: number;
  lastLesson: string | null;
  completedLessons?: string[];
}): DinnerTopic {
  // 1. Si l'enfant n'a encore validé aucune leçon (débutant / accueil)
  if (!child.totalLessons || child.totalLessons === 0) {
    return {
      lessonId: "start",
      lessonTitle: "Première découverte avec Palou",
      moduleTitle: "En route vers le monde numérique",
      concept: "Première rencontre avec le compagnon d'apprentissage",
      question: `« Tu as rencontré Palou aujourd'hui ! D'après toi, c'est quoi exactement Palou : un animal magique, un vrai robot ou un compagnon programmé sur l'ordinateur ? »`,
      hint: "Laissez votre enfant exprimer son imagination, puis guidez-le avec douceur pour lui faire comprendre que Palou est un outil virtuel créé par des humains pour lui apprendre la logique."
    };
  }

  // 2. Chercher d'abord sur la dernière leçon précise (lastLesson ou dernière leçon terminée)
  const candidateLessons = [
    child.lastLesson,
    ...(child.completedLessons ? [...child.completedLessons].reverse() : [])
  ].filter(Boolean) as string[];

  for (const id of candidateLessons) {
    // Correspondance exacte de leçon (ex: "p1-2")
    if (LESSON_QUESTIONS[id]) {
      return LESSON_QUESTIONS[id];
    }
    // Correspondance de module (ex: "p1" ou "a2")
    const moduleId = id.split("-")[0];
    if (MODULE_FALLBACKS[moduleId]) {
      return MODULE_FALLBACKS[moduleId];
    }
  }

  // 3. Fallback intelligent basé sur le nombre de leçons validées
  if (child.totalLessons === 1) {
    return LESSON_QUESTIONS["p1-1"];
  }
  if (child.totalLessons === 2) {
    return LESSON_QUESTIONS["p1-2"];
  }
  if (child.totalLessons === 3) {
    return LESSON_QUESTIONS["p1-3"];
  }
  if (child.totalLessons <= 5) {
    return LESSON_QUESTIONS["p1-4"];
  }

  // 4. Par défaut si l'enfant a déjà bien avancé
  return LESSON_QUESTIONS["p1-2"];
}

/**
 * Récupère TOUTES les questions correspondant aux leçons effectivement terminées par l'enfant.
 * Permet aux parents de naviguer entre les différents sujets appris.
 */
export function getAllLearnedDinnerTopics(child: {
  displayName: string;
  totalLessons: number;
  lastLesson: string | null;
  completedLessons?: string[];
}): DinnerTopic[] {
  const topics: DinnerTopic[] = [];
  const seenLessons = new Set<string>();

  const list = [
    child.lastLesson,
    ...(child.completedLessons || [])
  ].filter(Boolean) as string[];

  for (const id of list) {
    if (LESSON_QUESTIONS[id] && !seenLessons.has(id)) {
      seenLessons.add(id);
      topics.push(LESSON_QUESTIONS[id]);
    }
  }

  // Si aucune correspondance précise trouvée, retourner au moins le sujet calculé
  if (topics.length === 0) {
    topics.push(getChildDinnerDiscussion(child));
  }

  return topics;
}
