/**
 * Les conseils du jour du parcours 7-9 ans : un par jour, tirés des thèmes des dix chapitres (pas seulement la sécurité).
 * Phrases courtes, comme dans les leçons.
 */
export interface Tip79 {
  /** Le chapitre dont vient le conseil. */
  theme: string;
  title: string;
  /** Une ou deux phrases courtes. */
  text: string;
}

export const TIPS_79: Tip79[] = [
  { theme: "Bonjour, l’IA !", title: "Une IA n’est pas vivante", text: "Une IA est un programme. Elle ne respire pas et n’a pas de cœur." },
  { theme: "Bonjour, l’IA !", title: "Elle ne sait pas tout", text: "Une IA peut se tromper. Si tu hésites, demande à un adulte." },
  { theme: "L’IA autour de moi", title: "Elle est dans ton téléphone", text: "Quand ton téléphone reconnaît une chanson, une IA l’aide à écouter." },
  { theme: "L’IA autour de moi", title: "Un GPS qui réfléchit", text: "Un GPS compare plusieurs routes. Il choisit la plus rapide pour toi." },
  { theme: "La grande famille des données", title: "Les données, ce sont des exemples", text: "Photos, mots, sons : c’est ce que l’IA regarde pour apprendre." },
  { theme: "La grande famille des données", title: "Ranger par famille", text: "Quand on range les choses par famille, on les retrouve plus vite." },
  { theme: "Apprendre avec des exemples", title: "Plus d’exemples, c’est mieux", text: "Une IA qui voit dix poissons apprend mieux qu’avec un seul." },
  { theme: "Apprendre avec des exemples", title: "Des exemples variés", text: "Montre-lui des poissons grands, petits, de toutes les couleurs." },
  { theme: "L’IA qui regarde", title: "Une photo floue, c’est difficile", text: "Pour bien voir, l’IA a besoin d’une photo nette et bien éclairée." },
  { theme: "L’IA qui regarde", title: "Elle regarde les détails", text: "Elle repère les formes, les couleurs et les taches d’une feuille." },
  { theme: "L’IA qui parle", title: "Parle doucement et clairement", text: "Une IA comprend mieux quand tu parles lentement, sans bruit autour." },
  { theme: "L’IA qui parle", title: "Pose une question précise", text: "Plus ta question est claire, plus la réponse sera utile." },
  { theme: "Créer avec l’IA", title: "C’est toi le chef", text: "Tu choisis l’idée. L’IA peut seulement t’aider à la dessiner." },
  { theme: "Créer avec l’IA", title: "Signe ta création", text: "Dis que tu as été aidé par une IA. C’est honnête." },
  { theme: "Mon bouclier numérique", title: "Ton mot de passe est un secret", text: "Ne le dis qu’à tes parents. Pas à un ami, pas à un robot." },
  { theme: "Mon bouclier numérique", title: "Pas de photo à un inconnu", text: "Si on te la demande, dis non et parles-en à un adulte." },
  { theme: "Mon bouclier numérique", title: "Garde ton adresse pour toi", text: "Ton adresse et ton école restent privées sur internet." },
  { theme: "Vrai, faux… vérifions !", title: "Vérifie avant de croire", text: "Une image peut être fausse. Cherche d’où elle vient." },
  { theme: "Vrai, faux… vérifions !", title: "Ne partage pas trop vite", text: "Si tu doutes, demande à un adulte avant d’envoyer un message." },
  { theme: "Une IA pour mon quartier", title: "Une IA peut aider le quartier", text: "Elle peut aider à trier les déchets, mais c’est ensemble qu’on agit." },
  { theme: "Une IA pour mon quartier", title: "Écoute tes voisins", text: "Une bonne idée naît quand on demande l’avis des autres." },
];

/** Numéro du jour (heure locale) : le conseil change à minuit. */
export function dayNumber(date: Date = new Date()): number {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
}

/** Date locale au format AAAA-MM-JJ, pour mémoriser le jour où le conseil a été validé. */
export function dayKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function tipOfTheDay(date: Date = new Date()): Tip79 {
  return TIPS_79[dayNumber(date) % TIPS_79.length];
}
