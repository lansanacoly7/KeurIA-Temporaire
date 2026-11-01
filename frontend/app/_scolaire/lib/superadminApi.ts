/*
 * Espace super admin (équipe kEur IA) : appels à /api/superadmin/…
 * Toutes les règles (rôle admin, suspension plutôt que suppression, comptes
 * gérés par leur école, journal) sont appliquées par le serveur.
 */
import { api, query } from "./http";
import type { ClassroomDetail, ClassroomRow, ParentRow, StudentFilter, StudentRow, TeacherRow } from "./ecoleApi";
import type { AccountStatus, Credentials, DashboardSummary, Mission, MissionCategory, MissionDifficulty, Parent, SchoolLeaderboardItem } from "./types";

export type Paged<T> = { results: T[]; total: number; page: number; pageSize: number };

// ─── Tableau de bord et apprenants ────────────────────────────────────────────

export type TrackProgress = {
  key: string;
  label: string;
  name: string;
  tagline: string;
  tone: string;
  fill: string;
  completed: number;
  share: number;
};

export type LearnerAchievement = {
  id: string;
  studentName: string;
  school: string | null;
  lessonId: string;
  ageTrack: string;
  xp: number;
  completedAt: string;
};

export type PlatformDashboard = {
  kpis: {
    schools: number;
    suspendedSchools: number;
    students: number;
    teachers: number;
    parents: number;
    connectedToday: number;
    activeWeek: number;
    totalLessonsCompleted?: number;
  };
  roles: Record<string, number>;
  toHandle: { key: string; text: string; href: string; cta: string }[];
  tracksProgress?: TrackProgress[];
  schoolsLeaderboard?: SchoolLeaderboardItem[];
  recentAchievements?: LearnerAchievement[];
  recentActivity: { id: string; school: string; label: string; at: string }[];
  recentConnections: { id: string; displayName: string; email: string; role: string; school: string | null; lastSeenAt: string }[];
  audit: AuditEntry[];
};

export function getPlatformDashboard(): Promise<PlatformDashboard> {
  return api.get("superadmin/dashboard");
}

export type LearnerRow = {
  id: number;
  email: string;
  displayName: string;
  ageTrack: string;
  completed: number;
  total: number;
  percent: number;
  xp: number;
  lastActivity: string | null;
  inactiveDays: number;
  status: "actif" | "alerte" | "à démarrer";
  school: string | null;
};

export async function listLearners(): Promise<LearnerRow[]> {
  return (await api.get<{ learners: LearnerRow[] }>("superadmin/learners")).learners;
}

// ─── Écoles ───────────────────────────────────────────────────────────────────

export type SchoolAdmin = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  status: AccountStatus;
  lastLoginAt: string | null;
};

export type PlatformSchool = {
  id: string;
  name: string;
  slug: string;
  city: string;
  primaryColor: string;
  accentColor: string;
  suspended: boolean;
  suspendedAt: string | null;
  createdAt: string;
  academicYear: string;
  classes: number;
  students: number;
  teachers: number;
  admins: SchoolAdmin[];
  /** Indicateurs de santé : élèves connectés ces 7 derniers jours, classes sans enseignant, dernière connexion de la direction. */
  activeStudentsWeek: number;
  classesWithoutTeacher: number;
  directionLastSeen: string | null;
};

export type PlatformSchoolDetail = PlatformSchool & { recentActivity: { id: string; label: string; at: string }[] };

export type DirectionInput = { firstName: string; lastName: string; email: string; title: string };
export type SchoolInput = { name: string; city: string; slug?: string; primaryColor: string; accentColor: string };

export function listPlatformSchools(): Promise<PlatformSchool[]> {
  return api.get("superadmin/schools");
}

export function getPlatformSchool(id: string): Promise<PlatformSchoolDetail> {
  return api.get(`superadmin/schools/${encodeURIComponent(id)}`);
}

/** Crée l'école, son année en cours et le compte de sa direction (mot de passe provisoire renvoyé une fois). */
export function createPlatformSchool(input: SchoolInput & { admin: DirectionInput }): Promise<{ school: PlatformSchool; credentials: Credentials }> {
  return api.post("superadmin/schools", input);
}

/** Nom, ville et thème ; l'adresse (slug) ne change jamais. */
export function updatePlatformSchool(id: string, input: SchoolInput): Promise<PlatformSchool> {
  return api.patch(`superadmin/schools/${encodeURIComponent(id)}`, input);
}

export function suspendSchool(id: string, confirmation: string): Promise<PlatformSchool> {
  return api.post(`superadmin/schools/${encodeURIComponent(id)}/suspend`, { confirmation });
}

export function reactivateSchool(id: string): Promise<PlatformSchool> {
  return api.post(`superadmin/schools/${encodeURIComponent(id)}/reactivate`);
}

export function addSchoolAdmin(schoolId: string, input: DirectionInput): Promise<{ admin: SchoolAdmin; credentials: Credentials }> {
  return api.post(`superadmin/schools/${encodeURIComponent(schoolId)}/admins`, input);
}

export function resetSchoolAdminPassword(schoolId: string, adminId: string): Promise<Credentials> {
  return api.post(`superadmin/schools/${encodeURIComponent(schoolId)}/admins/${encodeURIComponent(adminId)}/password`);
}

export function setSchoolAdminStatus(schoolId: string, adminId: string, status: AccountStatus): Promise<SchoolAdmin> {
  return api.post(`superadmin/schools/${encodeURIComponent(schoolId)}/admins/${encodeURIComponent(adminId)}/status`, { status });
}

// ─── Comptes ──────────────────────────────────────────────────────────────────

export type PlatformAccount = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  schoolId: string | null;
  schoolName: string | null;
  status: AccountStatus;
  lastSeenAt: string | null;
  createdAt: string;
  isSelf: boolean;
  /** Direction, enseignant ou élève d'une école : géré par son école. */
  managedBySchool: boolean;
};

export type AccountFilter = { role?: string; schoolId?: string; status?: string; query?: string; page?: number };

export function listAccounts(filter: AccountFilter): Promise<Paged<PlatformAccount>> {
  return api.get(`superadmin/accounts${query(filter)}`);
}

/** Rôles des comptes hors école que l'équipe kEur IA peut créer. */
export const FREE_ROLES = ["admin", "parent", "enseignant"] as const;

export function createAccount(input: { email: string; displayName: string; role: string }): Promise<{ account: PlatformAccount; credentials: Credentials | null }> {
  return api.post("superadmin/accounts", input);
}

export function updateAccount(id: string, input: { displayName?: string; role?: string }): Promise<PlatformAccount> {
  return api.patch(`superadmin/accounts/${encodeURIComponent(id)}`, input);
}

export function setAccountStatus(id: string, status: AccountStatus): Promise<PlatformAccount> {
  return api.post(`superadmin/accounts/${encodeURIComponent(id)}/status`, { status });
}

export async function deleteAccount(id: string): Promise<void> {
  await api.delete(`superadmin/accounts/${encodeURIComponent(id)}`);
}

// ─── Missions ─────────────────────────────────────────────────────────────────

export type LibraryMission = Mission & { active: boolean; assignments: number };
/** Mission libre (créée à la main) : les devoirs du programme, eux, suivent les leçons et ne se modifient pas ici. */
export type MissionInput = Pick<Mission, "title" | "description" | "difficulty" | "durationMinutes" | "xp"> & { category: MissionCategory };

export const MISSION_CATEGORIES: MissionCategory[] = ["Sécurité", "IA Générative", "Données", "Programmation"];
export const MISSION_DIFFICULTIES: MissionDifficulty[] = ["Débutant", "Intermédiaire", "Avancé"];

export function listLibraryMissions(): Promise<LibraryMission[]> {
  return api.get("superadmin/missions");
}

export function createMission(input: MissionInput): Promise<LibraryMission> {
  return api.post("superadmin/missions", input);
}

export function updateMission(id: string, input: MissionInput): Promise<LibraryMission> {
  return api.patch(`superadmin/missions/${encodeURIComponent(id)}`, input);
}

/** Retirer (false) ou remettre (true) une mission dans la bibliothèque. */
export function setMissionActive(id: string, active: boolean): Promise<LibraryMission> {
  return api.post(`superadmin/missions/${encodeURIComponent(id)}/status`, { active });
}

// ─── Journal ──────────────────────────────────────────────────────────────────

export type AuditEntry = { id: string; actor: string; action: string; label: string; at: string };

export function listAudit(page: number): Promise<Paged<AuditEntry>> {
  return api.get(`superadmin/audit${query({ page })}`);
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Équipe kEur IA",
  admin_ecole: "Direction d'école",
  enseignant: "Enseignant·e",
  eleve: "Élève",
  parent: "Parent",
};

// ─── Espace d'une école (consultation seulement) ─────────────────────────────
// Mêmes données que l'espace de la direction, lues par l'équipe kEur IA :
// aucune fonction ici ne modifie quoi que ce soit dans l'école.

export type SchoolOverview = { school: PlatformSchool; dashboard: DashboardSummary; linkedStudents: number };
export type SchoolEvent = { id: string; source: "ecole" | "keuria"; label: string; actor: string | null; at: string };

const schoolPath = (id: string, rest = "") => `superadmin/schools/${encodeURIComponent(id)}${rest}`;

export function getSchoolOverview(id: string): Promise<SchoolOverview> {
  return api.get(schoolPath(id, "/overview"));
}

export function listSchoolTeachers(id: string): Promise<TeacherRow[]> {
  return api.get(schoolPath(id, "/teachers"));
}

export function listSchoolClasses(id: string): Promise<ClassroomRow[]> {
  return api.get(schoolPath(id, "/classes"));
}

export function getSchoolClass(id: string, classId: string): Promise<ClassroomDetail> {
  return api.get(schoolPath(id, `/classes/${encodeURIComponent(classId)}`));
}

export function listSchoolStudents(id: string, filter: StudentFilter = {}): Promise<StudentRow[]> {
  return api.get(schoolPath(id, `/students${query({ classId: filter.classId, status: filter.status, query: filter.query?.trim() })}`));
}

export function getSchoolStudent(id: string, studentId: string): Promise<StudentRow & { parent: Parent | null }> {
  return api.get(schoolPath(id, `/students/${encodeURIComponent(studentId)}`));
}

export function listSchoolParents(id: string): Promise<ParentRow[]> {
  return api.get(schoolPath(id, "/parents"));
}

export function listSchoolActivity(id: string, page = 1): Promise<Paged<SchoolEvent>> {
  return api.get(schoolPath(id, `/activity${query({ page: String(page) })}`));
}

// ─── Recherche générale ──────────────────────────────────────────────────────

export type SearchHit = {
  kind: "ecole" | "eleve" | "enseignant" | "direction" | "parent" | "compte";
  label: string;
  sub: string;
  schoolId: string | null;
  schoolName: string | null;
  target: { tab?: string; id?: string; account?: string } | null;
};

export function searchPlatform(text: string): Promise<{ query: string; results: SearchHit[] }> {
  return api.get(`superadmin/search${query({ query: text.trim() })}`);
}
