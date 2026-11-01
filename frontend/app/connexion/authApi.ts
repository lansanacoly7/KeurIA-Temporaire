/** Appels aux routes /api/auth/* de la page de connexion (réponses JSON { error } en cas d'échec). */
export type AuthResponse = {
  ok: boolean;
  status: number;
  data: {
    error?: string;
    message?: string;
    role?: string;
    email?: string;
    displayName?: string;
    verificationRequired?: boolean;
    accountDeactivated?: boolean;
    twoFactorRequired?: boolean;
    /** Inscription d'un parent en attente de l'accord de l'équipe kEur IA, ou refusée : aucune session n'est ouverte. */
    pendingApproval?: boolean;
    registrationRejected?: boolean;
  };
};

export async function postAuth(path: string, body: Record<string, unknown>): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
  } catch {
    return { ok: false, status: 0, data: { error: "Serveur injoignable. Vérifiez votre connexion et réessayez." } };
  }
  try {
    const data = await response.json();
    if (!response.ok && !data.error) {
      data.error = "Une difficulté temporaire est survenue. Veuillez réessayer dans un instant.";
    }
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: response.status, data: { error: "Une difficulté temporaire est survenue. Veuillez réessayer dans un instant." } };
  }
}

/** Même règle que le serveur : 8 caractères minimum, avec lettres et chiffres. */
export function passwordProblem(password: string) {
  if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (!/[a-zA-Z]/.test(password)) return "Le mot de passe doit contenir au moins une lettre.";
  if (!/[0-9]/.test(password)) return "Le mot de passe doit contenir au moins un chiffre.";
  return null;
}

/** Même règle que le serveur (accounts.serializers.phone_problem). */
export function phoneProblem(phone: string) {
  const value = phone.trim();
  if (!value) return "Le téléphone est obligatoire.";
  const digits = value.replace(/\D/g, "").length;
  if (!/^\+?[\d\s.-]+$/.test(value) || digits < 9 || digits > 15) return "Le numéro de téléphone n'est pas valide (ex. 77 123 45 67).";
  return null;
}
