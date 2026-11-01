import { Backpack, HeartHandshake, Presentation, School, ShieldCheck, type LucideIcon } from "lucide-react";

/**
 * Profils proposés sur la page de connexion. Le choix ne sert qu'à adapter
 * les libellés et les aides : le serveur connaît le rôle de chaque compte et
 * c'est lui qui décide de l'espace ouvert après la connexion.
 */
export type LoginRole = "eleve" | "enseignant" | "ecole" | "parent" | "admin";
/** Profils proposés sur la page de connexion publique. L'administration de la plateforme n'y figure pas : elle a sa propre page. */
export type PublicLoginRole = Exclude<LoginRole, "admin">;

export type Story = { title: string; accent: string; text: string };

export type RoleConfig = {
  label: string;
  description: string;
  icon: LucideIcon;
  /** Panneau de gauche : `accent` termine le titre, en citron. */
  story: Story;
  identifier: { label: string; hint: string; placeholder: string; type: "text" | "email" };
  /** Phrase d'introduction sous le titre du formulaire de connexion. */
  intro: string;
  /** « email » : réinitialisation par code reçu par e-mail ; sinon, texte d'aide. */
  forgot: "email" | string;
};

export const ROLE_ORDER: PublicLoginRole[] = ["eleve", "enseignant", "ecole", "parent"];

export const ROLES: Record<LoginRole, RoleConfig> = {
  eleve: {
    label: "Élève",
    description: "J'apprends avec kEur IA",
    icon: Backpack,
    story: { title: "Prêt pour ta", accent: "mission ?", text: "Connecte-toi avec l'identifiant et le mot de passe que t'a donnés ton école ou ton parent." },
    identifier: {
      label: "Identifiant",
      hint: "Il est écrit sur la fiche remise par ton école (ou donné par ton parent).",
      placeholder: "prenom.nom@ecole.keuria.sn",
      type: "text",
    },
    intro: "Entre ton identifiant et ton mot de passe.",
    forgot: "Mot de passe oublié ? Demande à ton enseignant ou à ton parent : il peut t'en donner un nouveau.",
  },
  enseignant: {
    label: "Enseignant",
    description: "Je suis mes classes",
    icon: Presentation,
    story: { title: "Bonjour et", accent: "bonne classe !", text: "Retrouvez vos classes, les devoirs et la progression de vos élèves." },
    identifier: {
      label: "Adresse e-mail",
      hint: "Celle que la direction de votre école a enregistrée pour vous.",
      placeholder: "vous@exemple.com",
      type: "email",
    },
    intro: "Entrez votre adresse e-mail et votre mot de passe.",
    forgot: "email",
  },
  ecole: {
    label: "École",
    description: "Je gère mon école",
    icon: School,
    story: { title: "Votre espace de", accent: "gestion", text: "Gérez les classes, les enseignants, les élèves et les années scolaires de votre école." },
    identifier: {
      label: "Adresse e-mail",
      hint: "Celle de la direction de l'école.",
      placeholder: "vous@exemple.com",
      type: "email",
    },
    intro: "Entrez votre adresse e-mail et votre mot de passe.",
    forgot: "email",
  },
  // Page à part (/connexion/admin) : jamais proposée dans la liste des profils.
  admin: {
    label: "Administration",
    description: "Équipe kEur IA",
    icon: ShieldCheck,
    story: { title: "Espace de l'équipe", accent: "kEur IA", text: "Accès réservé aux administrateurs de la plateforme." },
    identifier: {
      label: "Adresse e-mail",
      hint: "Compte administrateur kEur IA.",
      placeholder: "vous@keuria.sn",
      type: "email",
    },
    intro: "Entrez votre adresse e-mail et votre mot de passe.",
    forgot: "email",
  },
  parent: {
    label: "Parent",
    description: "Je suis mon enfant",
    icon: HeartHandshake,
    story: { title: "Suivez les progrès de", accent: "votre enfant", text: "Connectez-vous pour voir où en est votre enfant, leçon après leçon." },
    identifier: {
      label: "Adresse e-mail",
      hint: "",
      placeholder: "vous@exemple.com",
      type: "email",
    },
    intro: "Entrez votre adresse e-mail et votre mot de passe.",
    forgot: "email",
  },
};

/**
 * Panneau de gauche hors connexion : écran de choix du profil, puis étapes
 * propres à l'inscription, à l'activation et au mot de passe oublié.
 */
export const STEP_STORIES = {
  choose: { title: "Content de te", accent: "revoir !", text: "Choisis ton profil pour te connecter à ton espace kEur IA." },
  register: { title: "Bienvenue dans la", accent: "famille kEur IA !", text: "Créez votre compte parent, puis reliez votre enfant avec le code remis par son école." },
  verify: { title: "Plus qu'une", accent: "étape !", text: "Confirmez votre adresse e-mail avec le code reçu pour activer votre compte." },
  pending: { title: "Votre demande est", accent: "bien reçue !", text: "L'équipe kEur IA vérifie chaque inscription de parent. Vous recevrez un e-mail dès qu'elle est acceptée : vous pourrez alors vous connecter." },
  twoFactor: { title: "Une dernière", accent: "vérification !", text: "Saisissez le code reçu par e-mail pour terminer votre connexion en toute sécurité." },
  reactivate: { title: "Bon retour", accent: "parmi nous !", text: "Saisissez le code reçu par e-mail pour réactiver votre compte parent." },
  recover: { title: "Un nouveau", accent: "mot de passe", text: "Recevez un code par e-mail pour choisir un nouveau mot de passe en toute sécurité." },
} satisfies Record<string, Story>;

const STORAGE_KEY = "keuria-login-role";

export function isLoginRole(value: unknown): value is PublicLoginRole {
  return typeof value === "string" && (ROLE_ORDER as string[]).includes(value);
}

/** Profil choisi lors de la dernière visite (commodité locale, jamais une autorisation). */
export function readSavedRole(): PublicLoginRole | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isLoginRole(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveRole(role: PublicLoginRole | null) {
  try {
    if (role) window.localStorage.setItem(STORAGE_KEY, role);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible (navigation privée…) : on redemandera le profil.
  }
}
