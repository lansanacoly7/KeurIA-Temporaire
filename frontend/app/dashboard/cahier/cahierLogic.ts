/*
 * Logique pure du « cahier de classe » (T9) : menu réduit de l'élève d'école,
 * cartes de la page « Libre », phrases des devoirs, temps restant de la séance.
 * Aucune dépendance (même pas d'import) : les tests la transplilent telle quelle
 * — voir frontend/tests/cahier-eleve.test.mjs.
 */

export type RestrictionBy = "school" | "class" | "parent" | null;

export type RuleGate = { allowed: boolean; by: RestrictionBy };

export type Restrictions = {
  context: "class_session" | "home";
  serverTime: string;
  palou: RuleGate;
  games: RuleGate;
  scratch: RuleGate;
  free_path: RuleGate;
  leaderboard: RuleGate;
  dailyLimitMinutes: { value: number | null; by: RestrictionBy };
  access: { allowedNow: boolean; by: RestrictionBy };
  /** Phrases déjà écrites par /api/eleve/restrictions (« Les jeux et défis : coupé par ton enseignant. »). */
  messages?: string[];
};

export type TodaySession = {
  id: number;
  title: string;
  lessonId: string | null;
  startedAt: string;
  endsAt: string;
  remainingSeconds: number;
} | null;

export type TodayAnnouncement = {
  id: number;
  kind: "text" | "poll";
  title: string | null;
  text: string;
  options: string[];
  createdAt: string;
  endsAt: string;
  closed: string | null;
  active: boolean;
  /** Sondage : le choix de l'élève (null = pas encore répondu) ; les décomptes ne viennent qu'après réponse. */
  myChoice?: number | null;
  counts?: number[] | null;
};

export type Today = {
  session: TodaySession;
  announcements: TodayAnnouncement[];
  track: string;
  restrictions: Restrictions;
};

export type AssignmentStatus = "en_retard" | "a_faire" | "termine";

export type SchoolAssignment = {
  id: number;
  mission: { id: number; title: string; description: string; category: string; difficulty: string; durationMinutes: number; xp: number };
  teacherName: string;
  dueDate: string | null;
  instructions: string | null;
  createdAt: string;
  status: AssignmentStatus;
  completion: { score: number; completedAt: string } | null;
};

export type AssignmentsPayload = {
  isSchoolStudent: boolean;
  classroom: { id: number; level: string; section: string } | null;
  assignments: SchoolAssignment[];
};

/* ── Classement de la classe (T14, GET /api/eleve/classement) ── */

export type ClassBoardEntry = { rank: number; displayName: string; xp: number; lessons: number; isMe: boolean };

export type ClassBoard = {
  scopeLabel: string;
  classroom: string;
  period: { label: string; range: string; timezone: string; start: string; end: string };
  classSize: number;
  participants: number;
  entries: ClassBoardEntry[];
  me: { rank: number; xp: number; lessons: number } | null;
};

/** Ce que l'écran affiche : le tableau, ou pourquoi il n'y en a pas (jamais un écran blanc). */
export type ClassBoardResult =
  | { kind: "ok"; board: ClassBoard }
  | { kind: "closed"; message: string; by: RestrictionBy }
  | { kind: "no_class"; message: string }
  | { kind: "error" };

/** Réponse HTTP → état de l'écran. Un 403 sans raison connue est traité comme une erreur (on peut réessayer). */
export function classBoardResult(status: number, body: unknown): ClassBoardResult {
  const data = (body ?? {}) as Partial<ClassBoard> & { error?: string; reason?: string; by?: RestrictionBy };
  if (status === 200 && Array.isArray(data.entries)) return { kind: "ok", board: data as ClassBoard };
  if (status === 403 && data.reason === "closed") {
    return { kind: "closed", message: data.error || `Le classement : coupé par ${whoLabel(data.by ?? null)}.`, by: data.by ?? null };
  }
  if (status === 403 && data.reason === "no_class") return { kind: "no_class", message: data.error || "Tu n’es inscrit dans aucune classe." };
  return { kind: "error" };
}

/** La phrase sous le tableau : où se trouve l'élève, sans jamais le gronder. */
export function myStandingPhrase(board: ClassBoard): string {
  if (!board.me) return "Tu n’as pas encore de points cette semaine : termine une leçon pour entrer dans le classement.";
  const points = `${board.me.xp} point${board.me.xp > 1 ? "s" : ""}`;
  return board.me.rank === 1 ? `Tu es premier de la classe cette semaine avec ${points} !` : `Tu es ${board.me.rank}e cette semaine avec ${points}.`;
}

/* ── Menu réduit (§8.1 de la conception : l'élève d'école n'a pas le menu famille) ── */

export type CahierTab = { id: string; label: string; href: string };

export const SCHOOL_TABS: CahierTab[] = [
  { id: "aujourdhui", label: "Aujourd’hui", href: "/dashboard/aujourdhui" },
  { id: "devoirs", label: "Mes devoirs", href: "/dashboard/devoirs" },
  { id: "parcours", label: "Mon parcours", href: "/dashboard/parcours" },
  { id: "classe", label: "Ma classe", href: "/dashboard/classe" },
  { id: "etoiles", label: "Mes étoiles", href: "/dashboard/etoiles" },
  { id: "libre", label: "Libre", href: "/dashboard/libre" },
];

/* ── Qui a posé une restriction : les mêmes mots que le serveur (regles._who) ── */

export function whoLabel(by: RestrictionBy): string {
  if (by === "class") return "ton enseignant";
  if (by === "parent") return "ton parent";
  return "la direction de l'école";
}

/** Les phrases écrites par le serveur, jamais réinventées côté client. */
export function rulesMessages(restrictions: Restrictions | null | undefined): string[] {
  return restrictions?.messages ?? [];
}

/** Vrai quand les créneaux horaires interdisent l'accès maintenant. */
export function accessClosed(restrictions: Restrictions | null | undefined): boolean {
  return Boolean(restrictions && !restrictions.access.allowedNow);
}

/* ── Temps restant d'une séance (MM:SS, puis H:MM:SS à partir d'une heure ; jamais négatif) ── */

export function remainingLabel(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

/* ── Devoirs : la phrase courte affichée sous chaque devoir ── */

const DAY_MS = 86_400_000;

export function duePhrase(assignment: Pick<SchoolAssignment, "status" | "dueDate">): string {
  if (assignment.status === "termine") return "Terminé";
  if (assignment.status === "en_retard") return "En retard";
  if (!assignment.dueDate) return "Pas de date";
  const due = new Date(`${assignment.dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return "Pas de date";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / DAY_MS);
  if (days <= 0) return "À rendre aujourd’hui";
  if (days === 1) return "À rendre demain";
  return `À rendre avant le ${due.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
}

/* ── Page « Libre » : trois cartes, chacune ouverte ou fermée avec la raison ── */

export type LibreCardKey = "jeux" | "scratch" | "defis";

export type LibreCard = {
  key: LibreCardKey;
  title: string;
  blurb: string;
  href: string;
  closed: boolean;
  /** Phrase d'un enfant : null = carte ouverte. */
  reason: string | null;
};

export function libreCards(restrictions: Restrictions | null | undefined): LibreCard[] {
  const nowOpen = Boolean(restrictions?.access.allowedNow ?? true);
  const cards: { key: LibreCardKey; title: string; blurb: string; href: string; gate: RuleGate | undefined }[] = [
    { key: "jeux", title: "Mini-jeux IA", blurb: "Joue avec Palou pour t’entraîner.", href: "/dashboard/jeux", gate: restrictions?.games },
    { key: "scratch", title: "Studio Scratch", blurb: "Crée tes propres animations.", href: "/dashboard/programmation", gate: restrictions?.scratch },
    { key: "defis", title: "Les défis de Palou", blurb: "Le défi rapide du jour.", href: "/dashboard/jeux", gate: restrictions?.games },
  ];
  return cards.map(({ key, title, blurb, href, gate }) => {
    if (!nowOpen) return { key, title, blurb, href, closed: true, reason: "Ce n’est pas l’heure." };
    if (gate && !gate.allowed) return { key, title, blurb, href, closed: true, reason: `Fermé par ${whoLabel(gate.by)}.` };
    return { key, title, blurb, href, closed: false, reason: null };
  });
}
