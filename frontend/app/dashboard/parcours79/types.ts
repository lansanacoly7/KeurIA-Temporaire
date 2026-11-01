/**
 * Modèle de données du parcours 7-9 ans « Palou à Dakar ».
 * Un chapitre (= un module) contient 4 leçons ; une leçon est une suite d'écrans.
 * Le contenu vit dans `frontend/content/parcours79/mXX.json` ; le catalogue serveur ne connaît que les identifiants et l'XP
 * (un test du serveur vérifie que les deux restent alignés). Voir Rapports/BIBLE_NARRATIVE_7-9.md.
 */

export type CastId = "palou" | "moussa" | "fatou" | "mme-diop" | "mame-awa" | "papa-ibou" | "tonton-cheikh" | "baye" | "mame-coumba";

/** Images de Palou disponibles dans /images/palou/Palou_<pose>.png */
export type Pose =
  | "Content" | "Surpris" | "Intelligent" | "Question" | "Reflexion" | "Celebration" | "Hero"
  | "Encouragement" | "Calme" | "Rire" | "Triste" | "Determine" | "Gentil" | "Parfait" | "trois_quart";

/** Un mot de wolof affiché dans une pastille ; jamais lu par la voix. */
export interface Wolof { mot: string; sens: string }

/** Mise en page d'un écran, choisie dans le studio. Absent ou incomplet : la mise en page actuelle (valeurs par défaut). */
export interface ScreenLayout {
  /** Place de l'image par rapport au texte. Défaut : "right". Écrans avec image seulement (histoire, découvre, et l'IA). */
  image?: "right" | "left" | "top" | "bottom";
  /** Taille de l'image. Défaut : "m". */
  imageSize?: "s" | "m" | "l";
  /** Taille du texte de Palou. Défaut : "md". */
  textSize?: "sm" | "md" | "lg" | "xl";
  /** Alignement du texte. Défaut : "left". */
  align?: "left" | "center";
}

interface ScreenBase {
  pose?: Pose;
  /** Texte affiché. Deux phrases au plus. `{prenom}` est remplacé par le prénom de l'enfant. */
  text: string;
  /** Texte lu à voix haute si différent (noms propres écrits phonétiquement). */
  dit?: string;
  /** Image de la leçon, relative à /images/parcours79/lecons/ ; à défaut, `emoji` sur dégradé. */
  image?: string;
  alt?: string;
  emoji?: string;
  wolof?: Wolof;
  /** Personnage qui parle (affiché en légende). */
  speaker?: CastId;
  /** Mise en page personnalisée choisie dans le studio (facultatif). */
  layout?: ScreenLayout;
}

/** Écran de texte : histoire, découverte, lien avec l'IA. */
export interface TextScreen extends ScreenBase {
  kind: "story" | "discover" | "ai";
  /** Le mot nouveau de la leçon (un seul). */
  word?: { terme: string; sens: string };
}

export interface Option {
  label: string;
  /** Identifiant du pictogramme (/images/parcours79/pictos/<pict>.webp) : l'enfant voit la réponse, le texte la nomme. */
  pict?: string;
  emoji?: string;
  correct?: boolean;
  /** Explication montrée si l'enfant touche cette mauvaise réponse. Obligatoire pour les mauvaises réponses. */
  explain?: string;
}

interface RoundBase { prompt: string; dit?: string; hint?: string; success: string }

/** Une seule bonne réponse. */
export interface ChooseRound extends RoundBase { type: "choose"; options: Option[] }
/** Toucher toutes les bonnes réponses (au moins deux). */
export interface MultiRound extends RoundBase { type: "multi"; options: Option[] }
/** Ranger chaque objet dans la bonne boîte. */
export interface SortRound extends RoundBase {
  type: "sort";
  bins: { id: string; label: string; pict?: string; emoji?: string }[];
  items: { id: string; label: string; pict?: string; emoji?: string; bin: string; explain?: string }[];
}
/**
 * « Qui est-ce ? avec Palou » : l'enfant décrit un objet avec des données (des étiquettes à toucher) ; Palou, qui ne voit pas
 * l'image mais lit les données, écarte un à un les objets qui ne correspondent pas. Plus l'enfant donne de données précises,
 * mieux Palou trouve : c'est ce que fait une IA qui cherche. Chaque étiquette juste réduit les possibilités ; une étiquette
 * fausse écarterait la bonne réponse, et son explication est lue.
 */
export interface WhoisRound extends RoundBase {
  type: "whois";
  /** Identifiant de l'objet à trouver (un des `items`). */
  target: string;
  /** Les objets que Palou regarde ; `tags` liste les étiquettes (identifiants) qui les décrivent. */
  items: { id: string; label: string; pict?: string; tags: string[] }[];
  /** Les données proposées : une étiquette est juste si l'objet à trouver la possède, sinon elle doit avoir une `explain`. */
  tags: { id: string; label: string; explain?: string }[];
}
/**
 * « La machine à trier » : l'enfant choisit une règle (par nom, par couleur, au hasard…) et la machine de Palou range tous les objets
 * d'un coup selon cette règle. Une IA trie avec une règle : en changeant la règle, tout change. La bonne règle est celle qui
 * range comme le demande l'histoire ; les autres montrent quand même leur résultat, puis une explication.
 */
export interface RuleSortRound extends RoundBase {
  type: "rulesort";
  items: { id: string; label: string; pict?: string; props: Record<string, string> }[];
  rules: {
    id: string;
    label: string;
    pict?: string;
    /** Propriété des objets que la règle regarde (clé de `props`). */
    prop: string;
    correct?: boolean;
    /** Nom affiché de chaque groupe, pour chaque valeur possible de la propriété. */
    groups: Record<string, string>;
    /** Explication lue quand l'enfant touche cette mauvaise règle. */
    explain?: string;
  }[];
}
/**
 * « Données propres, IA contente » : une liste de données dont certaines sont fausses (les intrus). Palou compte avec ce qu'il a :
 * tant que les intrus restent, son compte est faux ; l'enfant les touche pour les retirer et voit le compte de Palou se corriger.
 * Des données fausses font se tromper l'IA. Toucher une bonne donnée est une erreur expliquée.
 */
export interface CleanupRound extends RoundBase {
  type: "cleanup";
  /** Ce que Palou compte, au pluriel (« contes ») : « Palou compte : 4 contes ». */
  counts: string;
  rows: { id: string; label: string; pict?: string; intruder?: boolean; explain?: string }[];
}
/**
 * « L'entraînement de Palou » : la mémoire de Palou est vide et il ne reconnaît pas la photo d'essai. L'enfant lui montre de vrais
 * exemples (de bons exemples du poisson à apprendre) ; une jauge se remplit et Palou finit par reconnaître. Plus il a
 * d'exemples, mieux il reconnaît : c'est l'entraînement d'une IA. Un mauvais exemple est refusé avec une explication.
 */
export interface TrainRound extends RoundBase {
  type: "train";
  /** Ce que Palou apprend (« thiof »). */
  learns: string;
  /** La photo d'essai que Palou doit reconnaître à la fin. */
  test: { label: string; pict?: string };
  /** Ce que Palou dit selon le nombre d'exemples reçus (0 à `need` − 1) ; au dernier, c'est `success`. */
  says: string[];
  examples: { id: string; label: string; pict?: string; good?: boolean; explain?: string }[];
}
/**
 * « Corrige l'étiquette » : Palou a appris avec des photos étiquetées, dont une avec une fausse étiquette ; devant la photo d'essai
 * il se trompe. L'enfant touche la photo à la mauvaise étiquette pour la corriger, et Palou répond juste. Une mauvaise
 * étiquette apprend une erreur à une IA.
 */
export interface RelabelRound extends RoundBase {
  type: "relabel";
  test: { label: string; pict?: string };
  /** Ce que Palou répond à la photo d'essai avant la correction (la bonne réponse après est `success`). */
  says: string;
  /** Les photos de la mémoire de Palou : `tag` est l'étiquette affichée ; la photo à corriger a `fix` (la bonne étiquette). */
  cards: { id: string; label: string; pict?: string; tag: string; fix?: string; explain?: string }[];
}
/**
 * « Le test de Palou » : Palou devine plusieurs photos, et se trompe sur une (photo floue). L'enfant touche l'erreur, puis choisit
 * le meilleur exemple à lui donner pour qu'il s'améliore. Quand une IA se trompe, on lui montre de meilleurs exemples.
 */
export interface ProbeRound extends RoundBase {
  type: "probe";
  photos: { id: string; label: string; pict?: string; guess: string; wrong?: boolean; explain?: string }[];
  /** Dit quand l'enfant a trouvé l'erreur, et pose la question du meilleur exemple. */
  found: string;
  fix: { options: Option[] };
}
/**
 * « Les yeux de Palou » : une photo et des boutons « plus net / moins net ». À chaque cran, Palou dit ce qu'il voit : une machine
 * ne reconnaît qu'avec assez de détails. La manche est réussie quand l'enfant amène la photo au cran `enough`, où Palou reconnaît.
 * `effect` choisit ce qui change : « pixels » (gros carrés), « blur » (flou) ou « dark » (photo trop sombre, qu'on éclaire).
 */
export interface FocusRound extends RoundBase {
  type: "focus";
  effect: "pixels" | "blur" | "dark";
  photo: { label: string; pict: string };
  /** Un cran par entrée, du moins net au plus net ; `says` est ce que Palou dit à ce cran. */
  levels: { says: string }[];
  /** Premier cran où Palou reconnaît la photo (0 = le moins net). */
  enough: number;
  /** Texte des deux boutons (« Plus net » / « Moins net » par défaut). */
  more?: string;
  less?: string;
}
/**
 * « Regarde comme Palou » : l'enfant choisit ce que Palou regarde sur la photo (la forme seule, la couleur seule, les taches…).
 * La photo s'affiche comme Palou la voit avec ce regard, et Palou dit ce qu'il en tire. Une IA ne reconnaît qu'avec les bonnes
 * caractéristiques : un seul regard permet de voir que la feuille est malade.
 */
export interface LensRound extends RoundBase {
  type: "lens";
  photo: { label: string; pict: string };
  lenses: {
    id: string;
    label: string;
    pict?: string;
    /** Comment la photo apparaît : « shape » (silhouette noire), « colors » (couleurs floues), « sharp » (tous les détails). */
    view: "shape" | "colors" | "sharp";
    /** Ce que Palou dit avec ce regard. */
    says: string;
    correct?: boolean;
    explain?: string;
  }[];
}
/**
 * « Parle à Palou » : l'enfant construit une phrase en touchant des cartes de mots, comme s'il la disait. Aucun micro : la voix de
 * l'enfant n'est jamais captée (choix de confidentialité). Palou écrit ce qu'il a « entendu », repère les mots importants et
 * répond par une phrase préparée.
 */
export interface SpeakRound extends RoundBase {
  type: "speak";
  /** Ce que l'enfant doit dire, en une phrase (« Demande l'heure de la fête »). */
  say: string;
  /** Groupes de mots attendus : il faut au moins un mot de chaque groupe (les alternatives sont des synonymes). */
  need: string[][];
  /** Mots qui rendent la phrase vague (« truc ») : s'ils sont dits, Palou répond `vague`. */
  avoid?: string[];
  /** Cartes de mots pour construire la phrase au doigt. */
  cards: string[];
  /** Réponse de Palou quand un mot important manque (ou qu'il n'a rien compris). */
  missing: string;
  /** Réponse de Palou quand un mot à éviter est dit. Obligatoire si `avoid` existe. */
  vague?: string;
}
/**
 * « Décris, Palou dessine » : l'enfant ajoute des couches (des cartes) au dessin de Palou, une à une. Chaque bonne carte apparaît
 * dans le dessin et Palou le commente ; une carte hors sujet y apparaît aussi un instant, de travers, avec son explication. Plus la
 * description est précise, plus le dessin ressemble à l'idée de départ : l'IA ne fait que ce qu'on lui décrit, et l'auteur choisit.
 */
export interface LayersRound extends RoundBase {
  type: "layers";
  /** L'idée de départ, montrée à côté du dessin. */
  goal: { label: string; pict?: string };
  /** Nombre de bonnes cartes à placer (au plus le nombre de cartes `good`). */
  need: number;
  /** Ce que Palou dit selon le nombre de cartes placées (0 à `need` − 1) ; au dernier, c'est `success`. */
  says: string[];
  cards: { id: string; label: string; pict?: string; good?: boolean; explain?: string }[];
}
/**
 * « Enquête » : une affirmation (une rumeur, ce que dit Palou) et des boutons de vérification (« Qui l'a dit ? », « Où est la preuve ? »).
 * Chaque bouton utile révèle un indice et fait baisser la confiance dans l'affirmation ; un bouton inutile (« Tu es sûr ? »)
 * n'apprend rien. Quand l'enfant a assez d'indices, il pose un tampon (vrai, faux, pas encore prouvé). Être sûr de soi ne prouve rien.
 */
export interface VerifyRound extends RoundBase {
  type: "verify";
  claim: { text: string; pict?: string };
  /** Jauge facultative : elle passe de `start` à `end` (en %) à mesure que les indices utiles sont trouvés. */
  meter?: { label: string; start: number; end: number };
  /** `useful` : le bouton révèle un indice (`reveal`) ; sinon il n'apprend rien et `explain` est lu. */
  checks: { id: string; label: string; pict?: string; reveal: string; useful?: boolean; explain?: string }[];
  /** Nombre d'indices utiles à trouver avant de pouvoir poser le tampon. */
  need: number;
  /** Phrase qui demande le tampon, lue quand les indices sont trouvés. */
  ask: string;
  stamps: { id: string; label: string; pict?: string; correct?: boolean; explain?: string }[];
}
/**
 * « La loupe » : une image et une loupe que l'enfant déplace sur des zones (boutons « Le ciel », « L'eau »…). La loupe agrandit la zone ;
 * Palou dit ce qu'elle montre. Les zones à indice (`clue`) prouvent que l'image est truquée ; les autres sont normales (expliquées).
 */
export interface LoupeRound extends RoundBase {
  type: "loupe";
  photo: { label: string; pict: string };
  /** `x` et `y` : centre de la zone, en % de l'image. */
  spots: { id: string; label: string; pict?: string; x: number; y: number; says: string; clue?: boolean; explain?: string }[];
  /** Nombre d'indices à repérer. */
  need: number;
}
/**
 * « Construis ton IA » : l'enfant monte sa petite IA en remplissant 3 cases, dans l'ordre : ce qu'elle regarde (les données), ce qu'elle
 * apprend (l'entraînement), ce qu'elle fait (la réponse). Dans chaque case, une seule option est bonne ; les autres sont expliquées.
 * Quand les 3 cases sont pleines, la machine se met en marche : l'enfant lui présente des cas et lit ce qu'elle répond.
 */
export interface MachineRound extends RoundBase {
  type: "machine";
  goal: { label: string; pict?: string };
  /** Exactement 3 cases. `label` est le titre de la case (« Elle regarde »), `question` ce que l'enfant doit choisir. */
  slots: { id: string; label: string; question: string; options: { label: string; pict?: string; correct?: boolean; explain?: string }[] }[];
  demo: {
    /** Phrase lue quand la machine est prête. */
    prompt: string;
    /** Les cas à présenter à la machine ; `result` est ce qu'elle répond. */
    cases: { id: string; label: string; pict?: string; result: string }[];
    /** Nombre de cas à essayer pour finir. */
    need: number;
  };
}
/**
 * « Cache pour protéger » : un message ou une photo montre plusieurs informations. L'enfant touche celles qui doivent rester secrètes
 * (adresse, numéro, visage) : elles se cachent sous un flou. Un panneau montre ce qu'un inconnu pourrait encore lire. Cacher une
 * information sans danger est expliqué (elle peut rester visible).
 */
export interface ShieldRound extends RoundBase {
  type: "shield";
  /** Titre de l'image ou du message à protéger. */
  scene: { label: string; pict?: string };
  items: { id: string; label: string; pict?: string; secret?: boolean; explain?: string }[];
}
export type Round = ChooseRound | MultiRound | SortRound | WhoisRound | RuleSortRound | CleanupRound | TrainRound | RelabelRound | ProbeRound | FocusRound | LensRound | SpeakRound | LayersRound | VerifyRound | LoupeRound | MachineRound | ShieldRound;

/** Écran d'activité : « Essaie » (variant play) ou « Pourquoi ? » (variant why). */
export interface ActivityScreen extends Omit<ScreenBase, "text"> {
  kind: "play" | "why";
  text: string;
  rounds: Round[];
}

/** « Crée » : des choix à toucher, jamais un dessin imposé ; le résultat est gardé dans le carnet. */
export interface TrayItem { id: string; label: string; pict?: string; emoji?: string }

export interface CreateScreen extends ScreenBase {
  kind: "create";
  /** Étapes successives ; chacune propose son propre plateau d'objets à toucher. */
  steps: { prompt: string; count: number; tray: TrayItem[] }[];
  /** Titre de la création dans le carnet. */
  carnet: string;
}

export interface BravoScreen extends ScreenBase {
  kind: "bravo";
  /** « Ce que j'ai appris » : une seule phrase. */
  learned: string;
  /** Identifiant d'autocollant (ex. « m01 ») donné à la fin du module ; seulement sur la dernière leçon. */
  sticker?: string;
}

export interface MediaAction {
  label: string;
  kind: "lesson" | "external";
  target: string; // "p1-2" ou "https://..."
}

export interface MediaBlock {
  type: "video-link" | "video-file" | "image";
  url?: string;     // URL en https:// (YouTube ou Vimeo)
  ref?: string;     // media:<id>.<empreinte>
  caption?: string; // Légende facultative
}

export interface MediaScreen extends ScreenBase {
  kind: "media";
  media: MediaBlock;
  actions?: MediaAction[];
}

export type Screen = TextScreen | ActivityScreen | CreateScreen | BravoScreen | MediaScreen;

export interface LessonContent {
  id: string;            // ex. « p1-1 » : même identifiant que le catalogue serveur
  title: string;
  scene: { id: string; label: string };
  cast: CastId[];
  /** « Le problème : … » de l'histoire. */
  problem: string;
  /** Rappel d'un épisode précédent ; obligatoire sauf pour la première leçon d'un chapitre. */
  callback?: string;
  /**
   * Passages (clés de fichiers audio : « e03 », « e04-m1-q »…) dont le texte a été modifié depuis l'enregistrement de la voix officielle.
   * Écrit par le studio à la publication : ces passages restent muets (Palou n'a pas de voix de secours), au lieu de lire l'ancien texte.
   */
  voiceOff?: string[];
  screens: Screen[];
}

export interface ChapterContent {
  module: {
    id: string;          // ex. « p1 »
    chapter: number;
    title: string;
    place: string;
    /** Ancien pictogramme : plus affiché (l'interface n'utilise plus d'emoji). */
    emoji?: string;
    intro: string;      // une ou deux phrases de Palou pour ouvrir le chapitre
  };
  lessons: LessonContent[];
}

/* ── Carte des modules ──────────────────────────────────────────────────── */

export type LessonState = "done" | "now" | "next" | "soon" | "lock";
export type ModuleState = "done" | "now" | "soon" | "lock";

export interface MapLesson { id: string; state: LessonState }
export interface MapModule { id: string; state: ModuleState; doneCount: number; total: number; lessons: MapLesson[] }
export interface MapModel {
  modules: MapModule[];
  /** Première leçon jouable non terminée, ou null s'il n'y en a pas. */
  current: { moduleId: string; lessonId: string } | null;
  /** Vrai quand l'enfant a tout ce qui existe et que la suite reste à écrire. */
  waitingForContent: boolean;
  /** Indice du module où Palou se tient. */
  palouAt: number;
}
