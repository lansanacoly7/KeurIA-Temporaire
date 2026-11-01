/*
 * Modèle de données de l'espace « Gestion de l'école ».
 *
 * Ces types sont le contrat entre les écrans et l'API Django (`ecoleApi`,
 * `enseignantApi`, `superadminApi`) : toutes les données viennent du serveur.
 */

/** Niveaux scolaires sénégalais : élémentaire (CI → CM2) puis moyen (6e → 3e). */
export type LevelCode = "CI" | "CP" | "CE1" | "CE2" | "CM1" | "CM2" | "6e" | "5e" | "4e" | "3e";

/** Parcours kEur IA associé à un niveau. */
export type AgeTrack = "7-9" | "10-12" | "13-15";

export type Cycle = "Élémentaire" | "Moyen";

export type Sexe = "F" | "M";

/** jamais_connecte : compte créé mais identifiants pas encore utilisés. */
export type AccountStatus = "actif" | "jamais_connecte" | "desactive";

export type School = {
  id: string;
  name: string;
  /** Sert à construire les identifiants élèves : prenom.nom@<slug>.keuria.sn */
  slug: string;
  city: string;
  logoUrl?: string | null;
  website?: string;
  academicYear: string;
  primaryColor: string;
  accentColor: string;
  admin: { firstName: string; lastName: string; email: string; title: string };
};

export type Classroom = {
  id: string;
  level: LevelCode;
  /** Lettre de la classe dans le niveau : « A » pour CE1 A. */
  section: string;
  teacherId: string | null;
  academicYear: string;
  archived: boolean;
  /** Élèves de la classe au moment de l'archivage (consultation des années passées). */
  archivedStudentIds?: string[];
};

export type Teacher = {
  id: string;
  firstName: string;
  lastName: string;
  /** Adresse personnelle de l'enseignant : sert aussi d'identifiant de connexion. */
  email: string;
  phone: string;
  status: AccountStatus;
  lastLoginAt: string | null;
  createdAt: string;
};

export type Student = {
  id: string;
  /** Numéro de matricule attribué par l'école. */
  matricule: string;
  firstName: string;
  lastName: string;
  sexe: Sexe;
  /** Date au format ISO AAAA-MM-JJ. */
  birthDate: string;
  classId: string | null;
  /** Identifiant kEur IA généré (pas une vraie boîte mail). */
  login: string;
  status: AccountStatus;
  lastLoginAt: string | null;
  xp: number;
  lessonsCompleted: number;
  parentId: string | null;
  /** Numéro de téléphone du parent ou tuteur (WhatsApp). */
  parentPhone?: string;
  createdAt: string;
  /** Année scolaire à la fin de laquelle l'élève a quitté l'école (fin de 3e, départ). */
  leftInYear?: string;
  /** Date à laquelle un parent s'est relié à l'élève avec un code de liaison. */
  parentLinkedAt?: string;
  /** Parcours imposé par l'enseignant (exception au niveau de la classe) ; absent ou null = parcours par défaut. */
  trackOverride?: AgeTrack | null;
};

/**
 * Code de liaison parent : remis par l'école (fiche de connexion ou fiche
 * élève), saisi par le parent dans son espace. Usage unique, durée limitée.
 */
export type ParentLinkCode = {
  /** Sans tiret, en majuscules (« K7P4Q2 ») ; affiché « K7P-4Q2 ». */
  code: string;
  studentId: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  /** Remplacé par un code plus récent ou lien retiré. */
  revokedAt: string | null;
};

export type Parent = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type ActivityKind = "classe_creee" | "eleves_importes" | "enseignant_ajoute" | "eleve_deplace" | "mdp_reinitialise" | "annee_cloturee" | "cloture_annulee" | "parent_relie" | "parent_retire";

export type Activity = {
  id: string;
  kind: ActivityKind;
  label: string;
  at: string;
};

/** Identifiant et mot de passe provisoire affichés une seule fois (fiche de connexion). */
export type Credentials = {
  login: string;
  temporaryPassword: string;
  parentPhone?: string;
  /** Code parent imprimé sur la fiche (élèves sans parent relié). */
  parentCode?: string;
  parentCodeExpiresAt?: string;
};

export type StudentInput = Pick<Student, "matricule" | "firstName" | "lastName" | "sexe" | "birthDate" | "classId"> & {
  parentPhone?: string;
};

export type TeacherInput = Pick<Teacher, "firstName" | "lastName" | "email" | "phone"> & { classIds: string[] };

export type ClassroomInput = Pick<Classroom, "level" | "section" | "teacherId">;

// ─── Années scolaires ────────────────────────────────────────────────────────

export type AcademicYear = {
  /** « 2026-2027 » */
  label: string;
  /** Rentrée et fin d'année, AAAA-MM-JJ. */
  startDate: string;
  endDate: string;
  status: "en_cours" | "cloturee";
  closedAt: string | null;
  summary: YearClosingSummary | null;
};

export type YearClosingSummary = {
  classesArchived: number;
  classesCreated: number;
  promoted: number;
  repeating: number;
  leaving: number;
};

/** Décision de fin d'année pour un élève. */
export type StudentDecision = "passe" | "redouble" | "sortant";

export type ClassLeaderboardItem = {
  id: string;
  name: string;
  level: string;
  studentsCount: number;
  weeklyLessons: number;
  totalLessons: number;
  rank: number;
};

export type SchoolLeaderboardItem = {
  id: string;
  name: string;
  city: string;
  weeklyLessons: number;
  totalLessons: number;
  studentsCount: number;
  isCurrent: boolean;
  rank: number;
};

export type SchoolLeaderboardSummary = {
  currentRank: number;
  totalSchools: number;
  weeklyLessons: number;
  topSchools: SchoolLeaderboardItem[];
};

export type DashboardSummary = {
  teachers: number;
  classes: number;
  students: number;
  neverLoggedIn: number;
  activeThisWeek?: number;
  totalLessonsCompleted?: number;
  classroomLeaderboard?: ClassLeaderboardItem[];
  schoolLeaderboard?: SchoolLeaderboardSummary;
  classesWithoutTeacher: Classroom[];
  studentsWithoutClass: number;
  recentActivity: Activity[];
  school?: {
    name: string;
    slug: string;
    city: string;
    logoUrl: string | null;
    website: string;
  };
};

// ─── Espace enseignant : missions et devoirs ─────────────────────────────────

export type MissionCategory = "Sécurité" | "IA Générative" | "Données" | "Programmation";
export type MissionDifficulty = "Débutant" | "Intermédiaire" | "Avancé";

/**
 * Devoir de la bibliothèque que l'enseignant peut donner.
 * Les devoirs du programme (`kind` « lecon » : une leçon ; « bilan » : un module) sont écrits pour un parcours d'âge
 * (`track`) et situés dans le programme (module, leçon). Une mission « libre » n'a ni parcours ni module : tous les âges.
 */
export type Mission = {
  id: string;
  title: string;
  description: string;
  /** Pour un devoir du programme : le titre du module (« notion » dans les statistiques). */
  category: string;
  difficulty: MissionDifficulty;
  durationMinutes: number;
  xp: number;
  /** Parcours d'âge ("" = tous les âges). */
  track: AgeTrack | "";
  kind: "libre" | "lecon" | "bilan";
  questionCount: number;
  moduleId?: string | null;
  moduleTitle?: string | null;
  moduleOrder?: number | null;
  lessonId?: string | null;
  lessonTitle?: string | null;
  lessonOrder?: number | null;
};

/** Mission donnée à une classe, avec une date limite. */
export type Assignment = {
  id: string;
  missionId: string;
  classId: string;
  teacherId: string;
  /** Date limite AAAA-MM-JJ (incluse), ou null : sans date limite, jamais « en retard ». */
  dueDate: string | null;
  instructions: string;
  createdAt: string;
};

/** Réalisation d'un devoir par un élève (absente = pas encore fait). */
export type AssignmentCompletion = {
  assignmentId: string;
  studentId: string;
  completedAt: string;
  /** Score de 0 à 100. */
  score: number;
};

// ─── Classement de l'établissement ────────────────────────────────────────────

export type LeaderboardPeriod = "weekly" | "monthly" | "all_time";

export type RankBadge = { id: string; label: string; emoji: string; tier: string; color: string; bg: string; border: string };

export type SchoolLeaderboardEntry = {
  /** À XP égale, deux élèves partagent le même rang. */
  rank: number;
  student: { id: string; firstName: string; lastName: string };
  classroom: Classroom | null;
  xp: number;
  lessons: number;
  badge: RankBadge;
};

/** Classement des seuls élèves de l'école (jamais d'élève d'un autre établissement). */
export type SchoolLeaderboard = {
  period: LeaderboardPeriod;
  periodLabel: string;
  /** Élèves actifs de l'école concernés (classés ou non). */
  totalStudents: number;
  /** Élèves ayant gagné de l'XP sur la période : les seuls classés. */
  participants: number;
  totalXp: number;
  /** Classes proposées dans le filtre. */
  classrooms: Classroom[];
  entries: SchoolLeaderboardEntry[];
};
