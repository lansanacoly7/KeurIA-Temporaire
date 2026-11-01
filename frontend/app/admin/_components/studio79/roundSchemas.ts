/*
 * Description des 17 types d'activités du parcours 7-9 sous forme de champs : le formulaire du studio (SchemaForm) s'en sert
 * pour éditer chaque activité sans éditeur écrit à la main. Les noms de champs sont ceux de `parcours79/types.ts` (le lecteur
 * de l'enfant les lit tels quels) ; le serveur contrôle la structure à chaque enregistrement.
 */
import type { Round } from "@/app/dashboard/parcours79/types";

export type Rec = Record<string, unknown>;

export type FieldDef =
  | { kind: "text"; key: string; label: string; hint?: string; multiline?: boolean; placeholder?: string }
  | { kind: "number"; key: string; label: string; hint?: string; min?: number; max?: number }
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: "bool"; key: string; label: string; hint?: string; exclusive?: boolean }
  | { kind: "pict"; key: string; label: string }
  /** Liste de textes courts (« Ce que dit Palou à chaque étape »). */
  | { kind: "strings"; key: string; label: string; hint?: string; addLabel?: string }
  /** Liste de groupes de mots (chaque groupe : alternatives séparées par des virgules). */
  | { kind: "groups"; key: string; label: string; hint?: string }
  /** Paires clé / valeur (propriétés d'un objet, noms des groupes d'une règle). */
  | { kind: "record"; key: string; label: string; hint?: string; keyLabel: string; valueLabel: string }
  /** Choix d'un élément d'une autre liste de l'activité (par son identifiant). */
  | { kind: "ref"; key: string; label: string; from: string }
  /** Choix de plusieurs éléments d'une autre liste de l'activité. */
  | { kind: "multiref"; key: string; label: string; from: string }
  | { kind: "object"; key: string; label: string; fields: FieldDef[]; optional?: boolean; blank?: () => Rec }
  | { kind: "list"; key: string; label: string; itemLabel: string; fields: FieldDef[]; blank: () => Rec; min?: number; max?: number; hint?: string; summary?: string };

export const uid = (prefix = "x") => `${prefix}${Math.random().toString(36).slice(2, 6)}`;

const common: FieldDef[] = [
  { kind: "text", key: "prompt", label: "Consigne", multiline: true, hint: "Ce que l'enfant doit faire (trois phrases au plus)." },
  { kind: "text", key: "hint", label: "Indice", hint: "Montré si l'enfant hésite." },
  { kind: "text", key: "success", label: "Message de réussite", hint: "Dit par Palou quand l'enfant a réussi." },
  { kind: "text", key: "dit", label: "Texte lu à voix haute (si différent)", hint: "Seulement si la consigne s'écrit autrement qu'elle se prononce." },
];

const option = (): FieldDef[] => [
  { kind: "text", key: "label", label: "Texte" },
  { kind: "pict", key: "pict", label: "Image" },
  { kind: "bool", key: "correct", label: "Bonne réponse", exclusive: true },
  { kind: "text", key: "explain", label: "Explication si l'enfant se trompe", multiline: true },
];

const blankOption = (): Rec => ({ label: "", correct: false, explain: "" });

export type RoundType = Round["type"];

export const ROUND_TYPES: Record<RoundType, { label: string; description: string; fields: FieldDef[]; blank: () => Rec }> = {
  choose: {
    label: "Une bonne réponse",
    description: "L'enfant touche la seule bonne réponse.",
    fields: [...common, { kind: "list", key: "options", label: "Réponses", itemLabel: "Réponse", min: 2, max: 4, summary: "label", fields: option(), blank: blankOption }],
    blank: () => ({ type: "choose", prompt: "", hint: "", success: "", options: [{ ...blankOption(), correct: true }, blankOption()] }),
  },
  multi: {
    label: "Plusieurs bonnes réponses",
    description: "L'enfant touche toutes les bonnes réponses (au moins deux).",
    fields: [...common, { kind: "list", key: "options", label: "Réponses", itemLabel: "Réponse", min: 3, max: 4, summary: "label", fields: option().map(f => (f.kind === "bool" ? { ...f, exclusive: false } : f)), blank: blankOption }],
    blank: () => ({ type: "multi", prompt: "", hint: "", success: "", options: [{ ...blankOption(), correct: true }, { ...blankOption(), correct: true }, blankOption()] }),
  },
  sort: {
    label: "Ranger dans des boîtes",
    description: "L'enfant range chaque objet dans la bonne boîte.",
    fields: [
      ...common,
      { kind: "list", key: "bins", label: "Boîtes", itemLabel: "Boîte", min: 2, max: 4, summary: "label", blank: () => ({ id: uid("b"), label: "" }),
        fields: [{ kind: "text", key: "label", label: "Nom de la boîte" }, { kind: "pict", key: "pict", label: "Image" }] },
      { kind: "list", key: "items", label: "Objets à ranger", itemLabel: "Objet", min: 3, max: 8, summary: "label", blank: () => ({ id: uid("o"), label: "", bin: "", explain: "" }),
        fields: [{ kind: "text", key: "label", label: "Nom de l'objet" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "ref", key: "bin", label: "Va dans la boîte", from: "bins" }, { kind: "text", key: "explain", label: "Explication", multiline: true }] },
    ],
    blank: () => ({ type: "sort", prompt: "", hint: "", success: "", bins: [{ id: "b1", label: "" }, { id: "b2", label: "" }], items: [{ id: "o1", label: "", bin: "b1", explain: "" }, { id: "o2", label: "", bin: "b2", explain: "" }, { id: "o3", label: "", bin: "b1", explain: "" }] }),
  },
  whois: {
    label: "Qui est-ce ? avec Palou",
    description: "L'enfant décrit un objet avec des étiquettes ; Palou écarte ceux qui ne correspondent pas.",
    fields: [
      ...common,
      { kind: "ref", key: "target", label: "Objet à trouver", from: "items" },
      { kind: "list", key: "items", label: "Objets que Palou regarde", itemLabel: "Objet", min: 3, summary: "label", blank: () => ({ id: uid("o"), label: "", tags: [] }),
        fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "multiref", key: "tags", label: "Étiquettes qui le décrivent", from: "tags" }] },
      { kind: "list", key: "tags", label: "Étiquettes proposées", itemLabel: "Étiquette", min: 2, summary: "label", blank: () => ({ id: uid("t"), label: "" }),
        fields: [{ kind: "text", key: "label", label: "Texte de l'étiquette" }, { kind: "text", key: "explain", label: "Explication si elle est fausse", multiline: true }] },
    ],
    blank: () => ({ type: "whois", prompt: "", hint: "", success: "", target: "o1", items: [{ id: "o1", label: "", tags: [] }, { id: "o2", label: "", tags: [] }, { id: "o3", label: "", tags: [] }], tags: [{ id: "t1", label: "" }, { id: "t2", label: "" }] }),
  },
  rulesort: {
    label: "La machine à trier",
    description: "L'enfant choisit une règle ; la machine range tous les objets d'un coup.",
    fields: [
      ...common,
      { kind: "list", key: "items", label: "Objets", itemLabel: "Objet", min: 3, summary: "label", blank: () => ({ id: uid("o"), label: "", props: {} }),
        fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "record", key: "props", label: "Propriétés", keyLabel: "Propriété", valueLabel: "Valeur", hint: "Ex. couleur → rouge." }] },
      { kind: "list", key: "rules", label: "Règles de tri", itemLabel: "Règle", min: 2, summary: "label", blank: () => ({ id: uid("r"), label: "", prop: "", groups: {} }),
        fields: [{ kind: "text", key: "label", label: "Nom de la règle" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "text", key: "prop", label: "Propriété regardée", hint: "Le nom exact d'une propriété des objets." },
          { kind: "bool", key: "correct", label: "Bonne règle", exclusive: true }, { kind: "record", key: "groups", label: "Nom de chaque groupe", keyLabel: "Valeur", valueLabel: "Nom du groupe" },
          { kind: "text", key: "explain", label: "Explication si ce n'est pas la bonne règle", multiline: true }] },
    ],
    blank: () => ({ type: "rulesort", prompt: "", hint: "", success: "", items: [{ id: "o1", label: "", props: {} }, { id: "o2", label: "", props: {} }, { id: "o3", label: "", props: {} }], rules: [{ id: "r1", label: "", prop: "", correct: true, groups: {} }, { id: "r2", label: "", prop: "", groups: {} }] }),
  },
  cleanup: {
    label: "Données propres, IA contente",
    description: "L'enfant retire les données fausses ; le compte de Palou se corrige.",
    fields: [
      ...common,
      { kind: "text", key: "counts", label: "Ce que Palou compte (au pluriel)", hint: "Ex. « contes » → « Palou compte : 4 contes »." },
      { kind: "list", key: "rows", label: "Données", itemLabel: "Donnée", min: 4, summary: "label", blank: () => ({ id: uid("d"), label: "" }),
        fields: [{ kind: "text", key: "label", label: "Texte" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "bool", key: "intruder", label: "Donnée fausse (à retirer)" }, { kind: "text", key: "explain", label: "Explication", multiline: true }] },
    ],
    blank: () => ({ type: "cleanup", prompt: "", hint: "", success: "", counts: "", rows: [{ id: "d1", label: "" }, { id: "d2", label: "" }, { id: "d3", label: "" }, { id: "d4", label: "", intruder: true, explain: "" }] }),
  },
  train: {
    label: "L'entraînement de Palou",
    description: "L'enfant donne de bons exemples ; Palou finit par reconnaître.",
    fields: [
      ...common,
      { kind: "text", key: "learns", label: "Ce que Palou apprend" },
      { kind: "object", key: "test", label: "Photo d'essai", fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" }] },
      { kind: "strings", key: "says", label: "Ce que dit Palou à chaque exemple reçu", addLabel: "Ajouter une phrase" },
      { kind: "list", key: "examples", label: "Exemples", itemLabel: "Exemple", min: 3, summary: "label", blank: () => ({ id: uid("e"), label: "" }),
        fields: [{ kind: "text", key: "label", label: "Texte" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "bool", key: "good", label: "Bon exemple" }, { kind: "text", key: "explain", label: "Explication si c'est un mauvais exemple", multiline: true }] },
    ],
    blank: () => ({ type: "train", prompt: "", hint: "", success: "", learns: "", test: { label: "" }, says: [""], examples: [{ id: "e1", label: "", good: true }, { id: "e2", label: "", good: true }, { id: "e3", label: "", explain: "" }] }),
  },
  relabel: {
    label: "Corrige l'étiquette",
    description: "L'enfant corrige la photo qui a une fausse étiquette.",
    fields: [
      ...common,
      { kind: "object", key: "test", label: "Photo d'essai", fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" }] },
      { kind: "text", key: "says", label: "Ce que répond Palou avant la correction" },
      { kind: "list", key: "cards", label: "Photos de la mémoire de Palou", itemLabel: "Photo", min: 3, summary: "label", blank: () => ({ id: uid("c"), label: "", tag: "" }),
        fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "text", key: "tag", label: "Étiquette affichée" }, { kind: "text", key: "fix", label: "Bonne étiquette (seulement pour la photo à corriger)" }, { kind: "text", key: "explain", label: "Explication", multiline: true }] },
    ],
    blank: () => ({ type: "relabel", prompt: "", hint: "", success: "", test: { label: "" }, says: "", cards: [{ id: "c1", label: "", tag: "" }, { id: "c2", label: "", tag: "" }, { id: "c3", label: "", tag: "", fix: "", explain: "" }] }),
  },
  probe: {
    label: "Le test de Palou",
    description: "Palou se trompe sur une photo ; l'enfant trouve l'erreur puis le meilleur exemple.",
    fields: [
      ...common,
      { kind: "list", key: "photos", label: "Photos devinées par Palou", itemLabel: "Photo", min: 3, summary: "label", blank: () => ({ id: uid("p"), label: "", guess: "" }),
        fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "text", key: "guess", label: "Ce que devine Palou" }, { kind: "bool", key: "wrong", label: "Palou se trompe ici", exclusive: true }, { kind: "text", key: "explain", label: "Explication", multiline: true }] },
      { kind: "text", key: "found", label: "Ce que dit Palou quand l'erreur est trouvée", multiline: true },
      { kind: "object", key: "fix", label: "Meilleur exemple à donner", fields: [{ kind: "list", key: "options", label: "Exemples proposés", itemLabel: "Exemple", min: 2, max: 4, summary: "label", fields: option(), blank: blankOption }] },
    ],
    blank: () => ({ type: "probe", prompt: "", hint: "", success: "", photos: [{ id: "p1", label: "", guess: "" }, { id: "p2", label: "", guess: "" }, { id: "p3", label: "", guess: "", wrong: true, explain: "" }], found: "", fix: { options: [{ ...blankOption(), correct: true }, blankOption()] } }),
  },
  focus: {
    label: "Les yeux de Palou",
    description: "Des boutons « plus net / moins net » : Palou reconnaît quand il y a assez de détails.",
    fields: [
      ...common,
      { kind: "select", key: "effect", label: "Ce qui change", options: [{ value: "pixels", label: "Gros carrés (pixels)" }, { value: "blur", label: "Flou" }, { value: "dark", label: "Photo trop sombre" }] },
      { kind: "object", key: "photo", label: "Photo", fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" }] },
      { kind: "list", key: "levels", label: "Crans, du moins net au plus net", itemLabel: "Cran", min: 3, summary: "says", blank: () => ({ says: "" }), fields: [{ kind: "text", key: "says", label: "Ce que dit Palou", multiline: true }] },
      { kind: "number", key: "enough", label: "Premier cran où Palou reconnaît", min: 0, hint: "0 = le moins net." },
      { kind: "text", key: "more", label: "Texte du bouton « plus net »" },
      { kind: "text", key: "less", label: "Texte du bouton « moins net »" },
    ],
    blank: () => ({ type: "focus", prompt: "", hint: "", success: "", effect: "pixels", photo: { label: "", pict: "" }, levels: [{ says: "" }, { says: "" }, { says: "" }], enough: 2 }),
  },
  lens: {
    label: "Regarde comme Palou",
    description: "L'enfant choisit ce que Palou regarde sur la photo (forme, couleur, détails).",
    fields: [
      ...common,
      { kind: "object", key: "photo", label: "Photo", fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" }] },
      { kind: "list", key: "lenses", label: "Regards possibles", itemLabel: "Regard", min: 2, summary: "label", blank: () => ({ id: uid("l"), label: "", view: "shape", says: "" }),
        fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" },
          { kind: "select", key: "view", label: "Comment la photo apparaît", options: [{ value: "shape", label: "Silhouette noire" }, { value: "colors", label: "Couleurs floues" }, { value: "sharp", label: "Tous les détails" }] },
          { kind: "text", key: "says", label: "Ce que dit Palou", multiline: true }, { kind: "bool", key: "correct", label: "Bon regard", exclusive: true }, { kind: "text", key: "explain", label: "Explication", multiline: true }] },
    ],
    blank: () => ({ type: "lens", prompt: "", hint: "", success: "", photo: { label: "", pict: "" }, lenses: [{ id: "l1", label: "", view: "shape", says: "" }, { id: "l2", label: "", view: "sharp", says: "", correct: true }] }),
  },
  speak: {
    label: "Parle à Palou",
    description: "L'enfant construit une phrase avec des cartes de mots (aucun micro).",
    fields: [
      ...common,
      { kind: "text", key: "say", label: "Ce que l'enfant doit dire", hint: "Une phrase (« Demande l'heure de la fête »)." },
      { kind: "groups", key: "need", label: "Mots attendus", hint: "Chaque ligne est un groupe : il faut au moins un mot de chaque groupe. Séparez les synonymes par des virgules." },
      { kind: "strings", key: "avoid", label: "Mots à éviter (rendent la phrase vague)", addLabel: "Ajouter un mot" },
      { kind: "strings", key: "cards", label: "Cartes de mots", addLabel: "Ajouter une carte" },
      { kind: "text", key: "missing", label: "Réponse de Palou si un mot important manque", multiline: true },
      { kind: "text", key: "vague", label: "Réponse de Palou si un mot à éviter est dit", multiline: true },
    ],
    blank: () => ({ type: "speak", prompt: "", hint: "", success: "", say: "", need: [[""]], cards: ["", ""], missing: "" }),
  },
  layers: {
    label: "Décris, Palou dessine",
    description: "L'enfant ajoute des cartes qui apparaissent dans le dessin de Palou.",
    fields: [
      ...common,
      { kind: "object", key: "goal", label: "Idée de départ", fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" }] },
      { kind: "number", key: "need", label: "Nombre de bonnes cartes à placer", min: 1 },
      { kind: "strings", key: "says", label: "Ce que dit Palou selon les cartes placées", addLabel: "Ajouter une phrase" },
      { kind: "list", key: "cards", label: "Cartes", itemLabel: "Carte", min: 3, summary: "label", blank: () => ({ id: uid("c"), label: "" }),
        fields: [{ kind: "text", key: "label", label: "Texte" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "bool", key: "good", label: "Bonne carte" }, { kind: "text", key: "explain", label: "Explication si hors sujet", multiline: true }] },
    ],
    blank: () => ({ type: "layers", prompt: "", hint: "", success: "", goal: { label: "" }, need: 2, says: [""], cards: [{ id: "c1", label: "", good: true }, { id: "c2", label: "", good: true }, { id: "c3", label: "", explain: "" }] }),
  },
  verify: {
    label: "Enquête",
    description: "L'enfant vérifie une affirmation avec des indices, puis pose un tampon.",
    fields: [
      ...common,
      { kind: "object", key: "claim", label: "Affirmation à vérifier", fields: [{ kind: "text", key: "text", label: "Texte", multiline: true }, { kind: "pict", key: "pict", label: "Image" }] },
      { kind: "object", key: "meter", label: "Jauge de confiance", optional: true, blank: () => ({ label: "", start: 90, end: 20 }),
        fields: [{ kind: "text", key: "label", label: "Titre" }, { kind: "number", key: "start", label: "Au départ (%)", min: 0, max: 100 }, { kind: "number", key: "end", label: "À la fin (%)", min: 0, max: 100 }] },
      { kind: "list", key: "checks", label: "Boutons de vérification", itemLabel: "Bouton", min: 3, summary: "label", blank: () => ({ id: uid("k"), label: "", reveal: "" }),
        fields: [{ kind: "text", key: "label", label: "Texte du bouton" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "bool", key: "useful", label: "Révèle un indice utile" }, { kind: "text", key: "reveal", label: "Indice révélé", multiline: true }, { kind: "text", key: "explain", label: "Explication si le bouton n'apprend rien", multiline: true }] },
      { kind: "number", key: "need", label: "Indices utiles à trouver", min: 1 },
      { kind: "text", key: "ask", label: "Phrase qui demande le tampon", multiline: true },
      { kind: "list", key: "stamps", label: "Tampons", itemLabel: "Tampon", min: 2, summary: "label", blank: () => ({ id: uid("s"), label: "" }),
        fields: [{ kind: "text", key: "label", label: "Texte" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "bool", key: "correct", label: "Bon tampon", exclusive: true }, { kind: "text", key: "explain", label: "Explication", multiline: true }] },
    ],
    blank: () => ({ type: "verify", prompt: "", hint: "", success: "", claim: { text: "" }, checks: [{ id: "k1", label: "", reveal: "", useful: true }, { id: "k2", label: "", reveal: "", useful: true }, { id: "k3", label: "", reveal: "", explain: "" }], need: 2, ask: "", stamps: [{ id: "s1", label: "", correct: true }, { id: "s2", label: "" }] }),
  },
  loupe: {
    label: "La loupe",
    description: "L'enfant déplace une loupe sur des zones pour repérer les indices.",
    fields: [
      ...common,
      { kind: "object", key: "photo", label: "Image", fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" }] },
      { kind: "list", key: "spots", label: "Zones", itemLabel: "Zone", min: 3, summary: "label", blank: () => ({ id: uid("z"), label: "", x: 50, y: 50, says: "" }),
        fields: [{ kind: "text", key: "label", label: "Nom du bouton" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "number", key: "x", label: "Position horizontale (%)", min: 0, max: 100 }, { kind: "number", key: "y", label: "Position verticale (%)", min: 0, max: 100 },
          { kind: "text", key: "says", label: "Ce que dit Palou", multiline: true }, { kind: "bool", key: "clue", label: "Zone qui prouve le truquage" }, { kind: "text", key: "explain", label: "Explication", multiline: true }] },
      { kind: "number", key: "need", label: "Indices à repérer", min: 1 },
    ],
    blank: () => ({ type: "loupe", prompt: "", hint: "", success: "", photo: { label: "", pict: "" }, spots: [{ id: "z1", label: "", x: 30, y: 30, says: "", clue: true }, { id: "z2", label: "", x: 70, y: 40, says: "", clue: true }, { id: "z3", label: "", x: 50, y: 75, says: "" }], need: 2 }),
  },
  machine: {
    label: "Construis ton IA",
    description: "L'enfant remplit trois cases (ce qu'elle regarde, apprend, fait) puis essaie sa machine.",
    fields: [
      ...common,
      { kind: "object", key: "goal", label: "But de la machine", fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" }] },
      { kind: "list", key: "slots", label: "Les 3 cases", itemLabel: "Case", min: 3, max: 3, summary: "label", blank: () => ({ id: uid("s"), label: "", question: "", options: [{ ...blankOption(), correct: true }, blankOption()] }),
        fields: [{ kind: "text", key: "label", label: "Titre de la case" }, { kind: "text", key: "question", label: "Question posée à l'enfant", multiline: true },
          { kind: "list", key: "options", label: "Choix", itemLabel: "Choix", min: 2, max: 4, summary: "label", fields: option(), blank: blankOption }] },
      { kind: "object", key: "demo", label: "Essai de la machine", fields: [
        { kind: "text", key: "prompt", label: "Phrase lue quand la machine est prête", multiline: true },
        { kind: "number", key: "need", label: "Cas à essayer pour finir", min: 1 },
        { kind: "list", key: "cases", label: "Cas à présenter", itemLabel: "Cas", min: 2, summary: "label", blank: () => ({ id: uid("c"), label: "", result: "" }),
          fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "text", key: "result", label: "Ce que répond la machine", multiline: true }] },
      ] },
    ],
    blank: () => ({ type: "machine", prompt: "", hint: "", success: "", goal: { label: "" },
      slots: [0, 1, 2].map(i => ({ id: `s${i + 1}`, label: "", question: "", options: [{ ...blankOption(), correct: true }, blankOption()] })),
      demo: { prompt: "", need: 2, cases: [{ id: "c1", label: "", result: "" }, { id: "c2", label: "", result: "" }] } }),
  },
  shield: {
    label: "Cache pour protéger",
    description: "L'enfant cache les informations secrètes sous un flou.",
    fields: [
      ...common,
      { kind: "object", key: "scene", label: "Image ou message à protéger", fields: [{ kind: "text", key: "label", label: "Titre" }, { kind: "pict", key: "pict", label: "Image" }] },
      { kind: "list", key: "items", label: "Informations visibles", itemLabel: "Information", min: 3, summary: "label", blank: () => ({ id: uid("i"), label: "" }),
        fields: [{ kind: "text", key: "label", label: "Texte" }, { kind: "pict", key: "pict", label: "Image" }, { kind: "bool", key: "secret", label: "Information secrète (à cacher)" }, { kind: "text", key: "explain", label: "Explication", multiline: true }] },
    ],
    blank: () => ({ type: "shield", prompt: "", hint: "", success: "", scene: { label: "" }, items: [{ id: "i1", label: "", secret: true }, { id: "i2", label: "", secret: true }, { id: "i3", label: "", explain: "" }] }),
  },
};

export const ROUND_TYPE_ORDER = Object.keys(ROUND_TYPES) as RoundType[];

export function newRound(type: RoundType): Round {
  return ROUND_TYPES[type].blank() as unknown as Round;
}
