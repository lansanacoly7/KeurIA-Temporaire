/*
 * Service de l'espace « Gestion de l'école » : appels à l'API Django (/api/ecole/…).
 *
 * Les signatures sont le contrat utilisé par les écrans. Toutes les règles
 * (droits, unicité, validations, transactions) sont appliquées par le serveur,
 * qui ne renvoie que les données de l'école de l'admin connecté.
 */
import { api, EcoleApiError, query } from "./http";
import type { RawRecord, StudentField, TeacherField } from "./importing";
import type {
  AccountStatus, Classroom, ClassroomInput, Credentials, DashboardSummary, LeaderboardPeriod, SchoolLeaderboard,
  Parent, School, Student, StudentInput, Teacher, TeacherInput,
} from "./types";

export { EcoleApiError };

export type ClassroomRow = { classroom: Classroom; teacher: Teacher | null; studentCount: number };
export type ClassroomDetail = ClassroomRow & { students: Student[] };
export type TeacherRow = { teacher: Teacher; classrooms: Classroom[] };
export type StudentRow = { student: Student; classroom: Classroom | null };
export type StudentFilter = { classId?: string | "none"; status?: AccountStatus; query?: string };
export type ParentRow = { parent: Parent; children: Student[] };

// ─── École ────────────────────────────────────────────────────────────────────

export function getSchool(): Promise<School> {
  return api.get("ecole/school");
}

export type SchoolSettingsInput = Pick<School, "name" | "city" | "primaryColor" | "accentColor"> & {
  website?: string;
  logo?: string | null;
  removeLogo?: boolean;
};

/** Nom, ville et thème (le serveur n'accepte que les thèmes proposés). */
export function updateSchool(input: SchoolSettingsInput): Promise<School> {
  return api.patch("ecole/school", input);
}

export function getDashboard(): Promise<DashboardSummary> {
  return api.get("ecole/dashboard");
}

// ─── Classes ──────────────────────────────────────────────────────────────────

export function listClassrooms({ includeArchived = false } = {}): Promise<ClassroomRow[]> {
  return api.get(`ecole/classes${query({ includeArchived: includeArchived ? 1 : null })}`);
}

export function getClassroom(id: string): Promise<ClassroomDetail> {
  return api.get(`ecole/classes/${encodeURIComponent(id)}`);
}

export function createClassroom(input: ClassroomInput): Promise<Classroom> {
  return api.post("ecole/classes", input);
}

export function updateClassroom(id: string, input: ClassroomInput): Promise<Classroom> {
  return api.patch(`ecole/classes/${encodeURIComponent(id)}`, input);
}

export function deleteClassroom(id: string): Promise<{ deleted: boolean }> {
  return api.delete(`ecole/classes/${encodeURIComponent(id)}`);
}

/** Archiver ne supprime rien : les élèves gardent leur compte et leur progression. */
export function archiveClassroom(id: string): Promise<Classroom> {
  return api.post(`ecole/classes/${encodeURIComponent(id)}/archive`);
}

// ─── Enseignants ──────────────────────────────────────────────────────────────

export function listTeachers(): Promise<TeacherRow[]> {
  return api.get("ecole/teachers");
}

export function getTeacher(id: string): Promise<TeacherRow> {
  return api.get(`ecole/teachers/${encodeURIComponent(id)}`);
}

/** Les enseignants se connectent avec leur propre adresse e-mail. */
export function createTeacher(input: TeacherInput): Promise<{ teacher: Teacher; credentials: Credentials }> {
  return api.post("ecole/teachers", input);
}

export function updateTeacher(id: string, input: TeacherInput): Promise<Teacher> {
  return api.patch(`ecole/teachers/${encodeURIComponent(id)}`, input);
}

export function setTeacherStatus(id: string, status: AccountStatus): Promise<Teacher> {
  return api.post(`ecole/teachers/${encodeURIComponent(id)}/status`, { status });
}

export function resetTeacherPassword(id: string): Promise<Credentials> {
  return api.post(`ecole/teachers/${encodeURIComponent(id)}/password`);
}

/** Création en masse, tout ou rien (une ligne invalide annule tout). */
export function createTeachers(inputs: TeacherInput[]): Promise<{ teacher: Teacher; credentials: Credentials }[]> {
  return api.post("ecole/teachers/bulk", { teachers: inputs });
}

// ─── Élèves ───────────────────────────────────────────────────────────────────

export function listStudents(filter: StudentFilter = {}): Promise<StudentRow[]> {
  return api.get(`ecole/students${query({ classId: filter.classId, status: filter.status, query: filter.query?.trim() })}`);
}

export function getStudent(id: string): Promise<StudentRow & { parent: Parent | null }> {
  return api.get(`ecole/students/${encodeURIComponent(id)}`);
}

/** Prochain matricule libre au format de l'école, par exemple LB-2026-0204. */
export async function suggestMatricule(): Promise<string> {
  return (await api.get<{ matricule: string }>("ecole/students/next-matricule")).matricule;
}

/** Le matricule est-il libre dans l'école ? (`ignoreId` : l'élève en cours de modification.) */
export function checkMatricule(matricule: string, ignoreId?: string): Promise<{ matricule: string; available: boolean; problem: string | null }> {
  return api.get(`ecole/students/matricule-check${query({ matricule, ignore: ignoreId })}`);
}

export function createStudent(input: StudentInput): Promise<{ student: Student; credentials: Credentials }> {
  return api.post("ecole/students", input);
}

/** Import en masse, tout ou rien : l'erreur indique la ligne concernée. */
export function createStudents(inputs: StudentInput[]): Promise<{ student: Student; credentials: Credentials }[]> {
  return api.post("ecole/students/bulk", { students: inputs });
}

/** Identité seulement : la classe ne change que par moveStudent (avec confirmation). */
export function updateStudent(id: string, input: StudentInput): Promise<Student> {
  return api.patch(`ecole/students/${encodeURIComponent(id)}`, input);
}

export const MOVE_REASONS = ["Erreur d'inscription", "Changement de section", "Demande des parents", "Autre"] as const;
export type MoveReason = (typeof MOVE_REASONS)[number];

/** Ce que le déplacement va changer, affiché à l'admin avant qu'il confirme. */
export type StudentMovePreview = {
  student: Student;
  from: Classroom | null;
  to: Classroom | null;
  fromTeacher: Teacher | null;
  toTeacher: Teacher | null;
  levelChanged: boolean;
  /** Parcours d'âge avant / après, s'il change (7-9 → 10-12…). */
  trackChange: { from: string; to: string } | null;
  /** Devoirs de l'ancienne classe pas encore rendus : ils ne lui seront plus demandés. */
  pendingLeft: number;
  /** Devoirs en cours dans la nouvelle classe : il les recevra. */
  openReceived: number;
};

export function previewStudentMove(id: string, classId: string | null): Promise<StudentMovePreview> {
  return api.get(`ecole/students/${encodeURIComponent(id)}/move-preview${query({ classId })}`);
}

/** Compte, identifiant, matricule et progression conservés ; renvoie l'ancienne classe (annulation). */
export function moveStudent(id: string, classId: string | null, reason?: string): Promise<{ student: Student; previousClassId: string | null }> {
  return api.post(`ecole/students/${encodeURIComponent(id)}/move`, { classId, reason: reason ?? "" });
}

export function setStudentStatus(id: string, status: AccountStatus): Promise<Student> {
  return api.post(`ecole/students/${encodeURIComponent(id)}/status`, { status });
}

export function resetStudentPassword(id: string): Promise<Credentials> {
  return api.post(`ecole/students/${encodeURIComponent(id)}/password`);
}

// ─── Import de fichiers (aperçu, puis création tout ou rien) ─────────────────

export type PreviewRow<F extends string, I> = {
  line: number;
  values: Record<F, string>;
  /** Données prêtes à créer, ou null si la ligne a au moins une erreur. */
  input: I | null;
  errors: Partial<Record<F, string>>;
  /** Remarques non bloquantes (âge inhabituel, classe retirée à un autre enseignant). */
  warnings: Partial<Record<F, string>>;
};

/** Contrôle toutes les lignes sans rien créer : chaque erreur est rattachée à sa colonne. */
export function previewStudentImport(records: RawRecord<StudentField>[], defaultClassId: string | null): Promise<PreviewRow<StudentField, StudentInput>[]> {
  return api.post("ecole/import/preview", { kind: "eleves", records, defaultClassId });
}

export function previewTeacherImport(records: RawRecord<TeacherField>[]): Promise<PreviewRow<TeacherField, TeacherInput>[]> {
  return api.post("ecole/import/preview", { kind: "enseignants", records });
}

/** Lit un fichier Excel (.xlsx) côté serveur : première feuille, sous forme de tableau de textes. */
export async function readExcelFile(file: File): Promise<string[][]> {
  const form = new FormData();
  form.append("file", file);
  return (await api.post<{ table: string[][] }>("ecole/import/read", form)).table;
}

export type IssuedCredentials = { student: Student; classroom: Classroom | null; credentials: Credentials };

/**
 * Fiches de connexion : les mots de passe n'étant jamais conservés en clair,
 * imprimer une fiche = générer un NOUVEAU mot de passe pour chaque élève choisi.
 */
export function issueStudentCredentials(studentIds: string[]): Promise<IssuedCredentials[]> {
  return api.post("ecole/credentials", { studentIds });
}

// ─── Parents ──────────────────────────────────────────────────────────────────

export function listParents(): Promise<ParentRow[]> {
  return api.get("ecole/parents");
}

// ─── Classement ───────────────────────────────────────────────────────────────

export function getLeaderboard(period: LeaderboardPeriod, classId?: string): Promise<SchoolLeaderboard> {
  return api.get(`ecole/leaderboard${query({ period, classId })}`);
}

export type SchoolRules = {
  rules: Record<string, unknown>;
  catalogue: Record<string, string>;
};

export function getSchoolRules(): Promise<SchoolRules> { return api.get("ecole/restrictions"); }
export function saveSchoolRules(rules: Record<string, unknown>): Promise<SchoolRules> { return api.put("ecole/restrictions", { rules }); }
