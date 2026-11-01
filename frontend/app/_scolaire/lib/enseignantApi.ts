/*
 * Service de l'espace enseignant : appels à l'API Django (/api/enseignant/…).
 *
 * L'enseignant est celui de la session (jamais un identifiant envoyé par le
 * navigateur) : le serveur ne renvoie QUE ses classes, ses élèves et ses devoirs,
 * et refuse tout accès à une autre classe.
 */
import { api, query } from "./http";
import type { AgeTrack, Assignment, AssignmentCompletion, Classroom, Credentials, LeaderboardPeriod, Mission, School, SchoolLeaderboard, Student, Teacher } from "./types";
import type { ParentLinkInfo } from "./parentLinks";

/** Au-delà de ce nombre de jours sans connexion, un élève est signalé « inactif ». */
export const INACTIVE_AFTER_DAYS = 7;
export const MAX_INSTRUCTIONS_LENGTH = 500;
/** Sous ce score moyen, une catégorie est signalée « à retravailler ». */
export const WEAK_SCORE_THRESHOLD = 60;

export type TeacherClassSummary = {
  classroom: Classroom;
  studentCount: number;
  /** Élèves connectés au cours des 7 derniers jours. */
  activeThisWeek: number;
};

export type StudentToFollow = { student: Student; classroom: Classroom; reasons: string[] };

export type AssignmentSummary = {
  assignment: Assignment;
  mission: Mission;
  classroom: Classroom;
  completed: number;
  total: number;
};

export type TeacherOverview = {
  teacher: Teacher;
  classes: TeacherClassSummary[];
  students: number;
  activeThisWeek: number;
  studentsToFollow: StudentToFollow[];
  openAssignments: AssignmentSummary[];
};

function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Date limite passée (un devoir sans date limite ne l'est jamais). */
export function isPastDue(assignment: Pick<Assignment, "dueDate">, today = todayIso()): boolean {
  return assignment.dueDate !== null && assignment.dueDate < today;
}

/** École de l'enseignant (nom, ville, année, direction). */
export function getTeacherSchool(): Promise<School> {
  return api.get("enseignant/school");
}

/** Enseignant connecté. */
export function getCurrentTeacher(): Promise<Teacher> {
  return api.get("enseignant/me");
}

export function getTeacherOverview(): Promise<TeacherOverview> {
  return api.get("enseignant/overview");
}

// ─── Mes classes ──────────────────────────────────────────────────────────────

export type TeacherClassRow = TeacherClassSummary & {
  openAssignments: number;
  /** Élèves n'ayant pas rendu au moins un devoir dont la date limite est passée. */
  lateStudents: number;
};

export type StudentProgressRow = {
  student: Student;
  /** Devoirs dont la date limite est passée. */
  due: number;
  /** Parmi eux, ceux rendus au plus tard à la date limite. */
  doneOnTime: number;
  /** Parmi eux, ceux qui n'ont pas été rendus du tout (« en retard »). */
  late: number;
};

export type TeacherClassDetail = {
  classroom: Classroom;
  activeThisWeek: number;
  students: StudentProgressRow[];
  assignments: AssignmentSummary[];
};

export type AssignmentStatus = "termine" | "en_retard" | "a_faire";

export type StudentAssignmentRow = {
  assignment: Assignment;
  mission: Mission;
  status: AssignmentStatus;
  completion: AssignmentCompletion | null;
};

export type TeacherStudentDetail = {
  student: Student;
  classroom: Classroom;
  assignments: StudentAssignmentRow[];
};

export function listTeacherClasses(): Promise<TeacherClassRow[]> {
  return api.get("enseignant/classes");
}

export function getTeacherClass(classId: string): Promise<TeacherClassDetail> {
  return api.get(`enseignant/classes/${encodeURIComponent(classId)}`);
}

export function getTeacherStudent(studentId: string): Promise<TeacherStudentDetail> {
  return api.get(`enseignant/students/${encodeURIComponent(studentId)}`);
}

/** L'enseignant réinitialise le mot de passe de SES élèves (jamais par e-mail). */
export function resetStudentPasswordAsTeacher(studentId: string): Promise<Credentials> {
  return api.post(`enseignant/students/${encodeURIComponent(studentId)}/password`);
}

/** Fiches de connexion pour des élèves d'UNE classe de l'enseignant (nouveaux mots de passe). */
export function issueCredentialsAsTeacher(classId: string, studentIds: string[]): Promise<{ student: Student; credentials: Credentials }[]> {
  return api.post(`enseignant/classes/${encodeURIComponent(classId)}/credentials`, { studentIds });
}

// ─── Missions & devoirs ───────────────────────────────────────────────────────

export type AssignInput = {
  missionId: string;
  /** Une ou plusieurs classes de l'enseignant. */
  classIds: string[];
  /** AAAA-MM-JJ, ou null pour « sans date limite ». */
  dueDate: string | null;
  instructions: string;
};

export type AssignmentDetail = {
  summary: AssignmentSummary;
  done: { student: Student; completion: AssignmentCompletion }[];
  pending: { student: Student; late: boolean }[];
  /** Moyenne des scores des élèves ayant terminé, ou null. */
  averageScore: number | null;
};

export function listMissions(): Promise<Mission[]> {
  return api.get("enseignant/missions");
}

export function listTeacherAssignments(): Promise<AssignmentSummary[]> {
  return api.get("enseignant/assignments");
}

/** Donne une mission en devoir à une ou plusieurs classes de l'enseignant (tout ou rien). */
export function assignMission(input: AssignInput): Promise<AssignmentSummary[]> {
  return api.post("enseignant/assignments", input);
}

export function getAssignmentDetail(assignmentId: string): Promise<AssignmentDetail> {
  return api.get(`enseignant/assignments/${encodeURIComponent(assignmentId)}`);
}

/** Retire un devoir donné par erreur, tant qu'aucun élève ne l'a rendu. */
export async function deleteAssignment(assignmentId: string): Promise<void> {
  await api.delete(`enseignant/assignments/${encodeURIComponent(assignmentId)}`);
}

// ─── Analytiques ──────────────────────────────────────────────────────────────

export type CategoryResult = {
  category: string;
  /** Score moyen des devoirs rendus de cette catégorie, ou null sans données. */
  averageScore: number | null;
  completions: number;
  assignments: number;
};

export type ClassAnalytics = {
  classroom: Classroom;
  studentCount: number;
  /** Part des devoirs à date limite passée qui ont été rendus à temps (0 à 100), ou null s'il n'y en a pas. */
  onTimeRate: number | null;
  averageScore: number | null;
  /** Élèves avec un devoir non rendu à date limite passée, ou un score moyen sous 50 %. */
  studentsNeedingHelp: number;
  categories: CategoryResult[];
  progress: { label: string; count: number }[];
};

export function getClassAnalytics(classId: string): Promise<ClassAnalytics> {
  return api.get(`enseignant/classes/${encodeURIComponent(classId)}/analytics`);
}

export type BlockedStudent = {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
};

export type ClassBlockingLesson = {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string | null;
  completed: number;
  total: number;
  averageStars: number | null;
  difficult: BlockedStudent[];
  stopped: BlockedStudent[];
};

export type ClassBlockings = {
  classroom: Classroom;
  studentCount: number;
  lessons: ClassBlockingLesson[];
  message: string | null;
};

export function getTeacherClassBlockings(classId: string): Promise<ClassBlockings> {
  return api.get(`enseignant/classes/${encodeURIComponent(classId)}/blocages`);
}

// ─── Paramètres et code parent ────────────────────────────────────────────────

export type TeacherSettings = {
  teacher: Teacher;
  classes: { classroom: Classroom; studentCount: number }[];
};

/** Informations de l'enseignant connecté, en lecture seule (gérées par la direction). */
export function getTeacherSettings(): Promise<TeacherSettings> {
  return api.get("enseignant/settings");
}

export function getParentLinkAsTeacher(studentId: string): Promise<ParentLinkInfo> {
  return api.get(`enseignant/students/${encodeURIComponent(studentId)}/parent-link`);
}

export function generateParentLinkCodeAsTeacher(studentId: string): Promise<ParentLinkInfo> {
  return api.post(`enseignant/students/${encodeURIComponent(studentId)}/parent-link`);
}

/** Classement des élèves de mes classes (jamais ceux des autres enseignants). */
export function getTeacherLeaderboard(period: LeaderboardPeriod, classId?: string): Promise<SchoolLeaderboard> {
  return api.get(`enseignant/leaderboard${query({ period, classId })}`);
}

export type ClassRules = {
  rules: Record<string, unknown>;
  schoolRules: Record<string, unknown>;
  catalogue: Record<string, string>;
};

export function getClassRules(classId: string): Promise<ClassRules> { return api.get(`enseignant/classes/${encodeURIComponent(classId)}/restrictions`); }
export function saveClassRules(classId: string, rules: Record<string, unknown>): Promise<ClassRules> { return api.put(`enseignant/classes/${encodeURIComponent(classId)}/restrictions`, { rules }); }

// ————— Séances, annonces et sondages, parcours d'un élève (T10) ─────────────

export type ClassSession = {
  id: string;
  title: string;
  lessonId: string;
  startedAt: string;
  endsAt: string;
  /** Secondes restantes au moment de la réponse (le compte à rebours continue côté client). */
  remainingSeconds: number;
};

export type SessionState = { session: ClassSession | null };

export type SessionInput = { title: string; lessonId?: string; minutes: number };

/** Séance en cours de la classe (null = aucune séance ou séance terminée). */
export function getClassSession(classId: string): Promise<SessionState> {
  return api.get(`enseignant/classes/${encodeURIComponent(classId)}/seance`);
}

/** Ouvre une séance : ferme au passage toute séance précédente de la classe. */
export function openClassSession(classId: string, input: SessionInput): Promise<SessionState> {
  return api.post(`enseignant/classes/${encodeURIComponent(classId)}/seance`, input);
}

/** Termine la séance en cours. */
export function endClassSession(classId: string): Promise<SessionState> {
  return api.delete(`enseignant/classes/${encodeURIComponent(classId)}/seance`);
}

export type AnnouncementKind = "text" | "poll";

export type AnnouncementRow = {
  id: string;
  kind: AnnouncementKind;
  title: string;
  text: string;
  /** Sondage : 2 à 5 réponses. */
  options: string[];
  createdAt: string;
  endsAt: string;
  closed: boolean;
  active: boolean;
};

export type AnnouncementList = { announcements: AnnouncementRow[]; maxActive: number };

export type AnnouncementInput = {
  kind: AnnouncementKind;
  title?: string;
  text: string;
  options?: string[];
  endsInDays?: number;
};

/** Les 30 dernières annonces de la classe, plus la limite d'annonces actives. */
export function listClassAnnouncements(classId: string): Promise<AnnouncementList> {
  return api.get(`enseignant/classes/${encodeURIComponent(classId)}/annonces`);
}

export function createClassAnnouncement(classId: string, input: AnnouncementInput): Promise<{ announcement: AnnouncementRow }> {
  return api.post(`enseignant/classes/${encodeURIComponent(classId)}/annonces`, input);
}

export type AnnouncementResults = {
  announcement: AnnouncementRow;
  /** Nombre de réponses par option (dans l'ordre de `options`). */
  counts: number[];
  answered: { studentId: string; name: string; choice: number }[];
  notAnswered: { studentId: string; name: string }[];
};

/** Résultats d'une annonce : compteurs du sondage, qui a répondu, qui n'a pas répondu. */
export function getAnnouncementResults(id: string): Promise<AnnouncementResults> {
  return api.get(`enseignant/annonces/${encodeURIComponent(id)}`);
}

/** Clôture une annonce : elle disparaît des élèves. */
export function closeClassAnnouncement(id: string): Promise<{ announcement: AnnouncementRow }> {
  return api.delete(`enseignant/annonces/${encodeURIComponent(id)}`);
}

export type TrackResult = { studentId: string; trackOverride: AgeTrack | null };

/** Parcours imposé à un élève ("" = retour au parcours par défaut du niveau de sa classe). */
export function setStudentTrack(studentId: string, track: AgeTrack | ""): Promise<TrackResult> {
  return api.put(`enseignant/students/${encodeURIComponent(studentId)}/parcours`, { track });
}
