"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { SpaceSkeleton } from "../_space/SpaceSkeleton";
import { destinationFor, rememberSpaceRole, spaceKindFor, type SpaceKind } from "../space-home";
import { passwordProblem, phoneProblem, postAuth } from "./authApi";
import { LoginForm, type Fields } from "./LoginForm";
import { ParentRegisterForm } from "./ParentRegisterForm";
import { PendingApproval } from "./PendingApproval";
import { CodeForm, ForgotForm } from "./RecoveryForms";
import { RoleSelector } from "./RoleSelector";
import { readSavedRole, ROLES, saveRole, STEP_STORIES, type LoginRole, type PublicLoginRole } from "./roles";

type View = "login" | "register" | "forgot" | "reset" | "verify" | "reactivate" | "pending";
type Notice = { kind: "error" | "success"; text: string } | null;

const TITLES: Record<Exclude<View, "login">, string> = {
  register: "Créer un compte parent",
  forgot: "Mot de passe oublié",
  reset: "Nouveau mot de passe",
  verify: "Vérifiez votre adresse e-mail",
  reactivate: "Réactiver mon compte",
  pending: "Inscription en cours d'examen",
};

const noSubscribe = () => () => {};

/**
 * `adminMode` : page de connexion de l'équipe kEur IA (/connexion/admin). Elle est à part de celle des utilisateurs :
 * pas de choix de profil, pas d'inscription, et le serveur n'y ouvre que les comptes administrateurs.
 */
export default function ConnexionClient({ returnTo, forceChoose = false, expired = false, adminMode = false }: { returnTo: string; forceChoose?: boolean; expired?: boolean; adminMode?: boolean }) {
  // Profil de la dernière visite (lu côté navigateur seulement), remplacé dès qu'on en choisit un.
  const savedRole = useSyncExternalStore(noSubscribe, readSavedRole, () => null);
  const [pickedRole, setPickedRole] = useState<PublicLoginRole | null | undefined>(forceChoose ? null : undefined);
  const publicRole = forceChoose && pickedRole === undefined ? null : (pickedRole === undefined ? savedRole : pickedRole);
  const role: LoginRole | null = adminMode ? "admin" : publicRole;

  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [deactivatedName, setDeactivatedName] = useState("");
  const [isReactivating, setIsReactivating] = useState(false);
  // Arrivée après une déconnexion pour inactivité : on explique pourquoi la session s'est fermée.
  const [notice, setNotice] = useState<Notice>(expired ? { kind: "error", text: "Votre session s'est fermée après une longue période d'inactivité. Reconnectez-vous pour continuer." } : null);
  const [busy, setBusy] = useState(false);
  // Étape « code » : vérification d'adresse (inscription) ou second facteur de connexion (double authentification).
  const [twoFactor, setTwoFactor] = useState(false);
  // Connexion acceptée : skeleton de l'espace de destination pendant son chargement.
  const [leaving, setLeaving] = useState<SpaceKind | null>(null);
  // Inscription d'un parent en attente de l'accord de l'équipe kEur IA (ou refusée) : aucune session n'est ouverte.
  const [waiting, setWaiting] = useState<{ text: string; declined: boolean } | null>(null);

  function showWaiting(text: string | undefined, declined: boolean) {
    setWaiting({ text: text || (declined ? "Votre demande d'inscription n'a pas été acceptée." : "Votre demande d'inscription est en cours d'examen par l'équipe kEur IA."), declined });
    go("pending");
  }

  function enterSpace(accountRole: string | undefined) {
    setPendingPassword("");
    const destination = destinationFor(accountRole, returnTo);
    rememberSpaceRole(accountRole);
    setLeaving(spaceKindFor(destination, accountRole));
    window.location.assign(destination);
  }

  function go(next: View, message: Notice = null) {
    if (next !== "verify" && next !== "reactivate") {
      setIsReactivating(false);
      setPendingPassword("");
    }
    setView(next);
    setNotice(message);
  }

  function chooseRole(next: PublicLoginRole | null) {
    setPendingPassword("");
    saveRole(next);
    setPickedRole(next);
    go("login");
  }

  async function call(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setNotice(null);
    const result = await postAuth(path, body);
    setBusy(false);
    return result;
  }

  function askForCode(address: string, text: string, isTwoFactor = false) {
    setTwoFactor(isTwoFactor);
    setEmail(address);
    go("verify", { kind: "success", text });
  }

  async function login(fields: Fields) {
    const payload = role ? { ...fields, expectedRole: role } : fields;
    const { ok, data } = await call("login", payload);
    // Double authentification : le mot de passe est bon (réponse 202) mais aucune session n'est ouverte avant le code.
    if (ok && data.twoFactorRequired) {
      return askForCode(data.email || fields.email, data.message || "Un code de connexion vous a été envoyé par e-mail.", true);
    }
    // Le serveur refuse déjà (403) un profil qui ne correspond pas au compte : il ne reste qu'à entrer.
    if (ok) return enterSpace(data.role);
    if (data.verificationRequired) return askForCode(data.email || fields.email, "Votre compte n'est pas encore activé : saisissez le code reçu par e-mail.");
    // Un parent a son écran d'attente ; un enfant du foyer (pas d'e-mail dans la réponse) reçoit seulement le message.
    if ((data.pendingApproval || data.registrationRejected) && data.email) return showWaiting(data.error, Boolean(data.registrationRejected));
    if (data.accountDeactivated) {
      setEmail(data.email || fields.email);
      setPendingPassword(fields.password || "");
      setDeactivatedName(data.displayName || "");
      go("reactivate");
      return;
    }
    setNotice({ kind: "error", text: data.error || "Connexion impossible." });
  }

  async function register(fields: Fields) {
    const problem = phoneProblem(fields.phone) || passwordProblem(fields.password)
      || (fields.password !== fields.passwordConfirm ? "Les mots de passe ne correspondent pas." : null);
    if (problem) return setNotice({ kind: "error", text: problem });
    const { ok, data } = await call("register", fields);
    if (!ok) return setNotice({ kind: "error", text: data.error || "Inscription impossible." });
    askForCode(data.email || fields.email, data.message || "Un code de vérification vous a été envoyé par e-mail.");
  }

  async function requestReactivationCode() {
    const { ok, data } = await call("request-reactivation", { email, password: pendingPassword });
    if (!ok) {
      return setNotice({ kind: "error", text: data.error || "Impossible d'envoyer le code de réactivation." });
    }
    setIsReactivating(true);
    askForCode(email, data.message || "Un code de réactivation vous a été envoyé par e-mail.");
  }

  async function verify(fields: Fields) {
    if (isReactivating) {
      const { ok, data } = await call("reactivate", { email, code: fields.code });
      if (ok) {
        setPendingPassword("");
        return enterSpace(data.role);
      }
      return setNotice({ kind: "error", text: data.error || "Code invalide ou expiré." });
    }
    const { ok, data } = await call(twoFactor ? "login-2fa" : "verify-email", fields);
    // Adresse confirmée, mais la demande attend l'accord de l'équipe kEur IA : pas d'accès à l'espace pour l'instant.
    if (ok && (data.pendingApproval || data.registrationRejected)) return showWaiting(data.message, Boolean(data.registrationRejected));
    if (ok) return enterSpace(data.role);
    setNotice({ kind: "error", text: data.error || "Code invalide." });
  }

  async function resend() {
    if (isReactivating) {
      const { ok, data } = await call("request-reactivation", { email, password: pendingPassword });
      return setNotice(ok ? { kind: "success", text: data.message || "Un nouveau code a été envoyé." } : { kind: "error", text: data.error || "Impossible de renvoyer le code." });
    }
    // Un nouveau code de connexion n'est émis qu'après une nouvelle saisie du mot de passe.
    if (twoFactor) return go("login", { kind: "success", text: "Saisissez de nouveau votre mot de passe pour recevoir un nouveau code." });
    const { ok, data } = await call("resend-verification", { email });
    setNotice(ok ? { kind: "success", text: data.message || "Un nouveau code a été envoyé." } : { kind: "error", text: data.error || "Impossible de renvoyer le code." });
  }

  async function forgot(fields: Fields) {
    const { ok, data } = await call("forgot-password", fields);
    if (!ok) return setNotice({ kind: "error", text: data.error || "Envoi impossible." });
    setEmail(fields.email);
    go("reset", { kind: "success", text: data.message || "Si un compte existe, un code a été envoyé." });
  }

  async function reset(fields: Fields) {
    const problem = passwordProblem(fields.password);
    if (problem) return setNotice({ kind: "error", text: problem });
    const { ok, data } = await call("reset-password", fields);
    if (!ok) return setNotice({ kind: "error", text: data.error || "Réinitialisation impossible." });
    go("login", { kind: "success", text: data.message || "Mot de passe changé : vous pouvez vous connecter." });
  }

  const config = role ? ROLES[role] : null;
  const title = !config ? "Qui se connecte ?" : view === "login" ? `Connexion ${config.label.toLowerCase()}` : view === "verify" && twoFactor ? "Code de sécurité" : view === "verify" && isReactivating ? "Réactivation du compte" : TITLES[view];
  const intro = !config ? null
    : view === "login" ? config.intro
    : view === "register" ? "Quelques informations pour suivre votre enfant. Votre inscription sera validée par l'équipe kEur IA avant l'accès à votre espace."
    : view === "pending" ? null
    : view === "forgot" ? "Nous vous enverrons un code pour choisir un nouveau mot de passe."
    : view === "reset" ? `Saisissez le code envoyé à ${email} et votre nouveau mot de passe.`
    : view === "reactivate" ? "Votre compte parent est actuellement désactivé."
    : `Saisissez le code à 6 chiffres envoyé à ${email}.`;
  // Même mise en forme qu'avant ; seule la phrase change selon l'étape.
  const story = !config ? STEP_STORIES.choose
    : view === "login" ? config.story
    : view === "register" ? STEP_STORIES.register
    : view === "verify" ? (twoFactor ? STEP_STORIES.twoFactor : isReactivating ? STEP_STORIES.reactivate : STEP_STORIES.verify)
    : view === "pending" ? STEP_STORIES.pending
    : STEP_STORIES.recover;

  if (leaving) return <SpaceSkeleton kind={leaving} />;

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="Bienvenue sur kEur IA">
        <Link className="login-brand" href="/" title="Retour à l’accueil" aria-label="kEur IA — Retour à l’accueil">
          <img src="/images/keur-ia-logo.png" alt="kEur IA — Apprendre, jouer, créer" width={120} height={40} />
        </Link>
        <p className="login-kicker">ESPACE D&apos;APPRENTISSAGE SÉCURISÉ</p>
        <h1>{story.title} {story.accent}</h1>
        <p>{story.text}</p>
        <ul>
          <li><Check size={16} aria-hidden="true" style={{ color: "var(--brand, #0d846e)", flexShrink: 0 }} /> Apprentissage de l’IA guidé par Palou</li>
          <li><Check size={16} aria-hidden="true" style={{ color: "var(--brand, #0d846e)", flexShrink: 0 }} /> Mot de passe protégé et session sécurisée</li>
          <li><Check size={16} aria-hidden="true" style={{ color: "var(--brand, #0d846e)", flexShrink: 0 }} /> Parcours adapté à chaque profil</li>
        </ul>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <div style={{ display: "flex", flexWrap: "wrap", columnGap: 8 }}>
            <Link className="auth-back" href="/" style={{ textDecoration: "none" }}>
              <ArrowLeft size={16} aria-hidden="true" />
              Retour à l’accueil
            </Link>
            {config && !(adminMode && view === "login") && (
              <button type="button" className="auth-back"
                onClick={() => (view === "login" || view === "register" ? chooseRole(null) : go("login"))}>
                <ArrowLeft size={16} aria-hidden="true" />
                {view === "login" || view === "register" ? "Changer de profil" : "Retour à la connexion"}
              </button>
            )}
          </div>
          {!config && <p className="login-eyebrow">BIENVENUE SUR KEUR IA</p>}
          <h2 id="login-title">{title}</h2>
          {intro && <p className="auth-intro">{intro}</p>}

          {role === "parent" && (view === "login" || view === "register") && (
            <div className="auth-tabs" role="tablist" aria-label="Compte parent">
              <button type="button" role="tab" aria-selected={view === "login"} className={view === "login" ? "active" : ""} onClick={() => go("login")}>J&apos;ai un compte</button>
              <button type="button" role="tab" aria-selected={view === "register"} className={view === "register" ? "active" : ""} onClick={() => go("register")}>Créer mon compte</button>
            </div>
          )}

          {notice && <p className={notice.kind === "error" ? "auth-error" : "auth-success"} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</p>}

          {!config ? <RoleSelector onSelect={chooseRole} />
            : view === "login" ? <LoginForm key={role} config={config} busy={busy} onSubmit={login} onForgot={() => go("forgot")} />
            : view === "register" ? <ParentRegisterForm busy={busy} onSubmit={register} />
            : view === "forgot" ? <ForgotForm busy={busy} onSubmit={forgot} />
            : view === "pending" ? (waiting && <PendingApproval declined={waiting.declined} text={waiting.text} onBack={() => go("login")} />)
            : view === "reactivate" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center", padding: "10px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0FDF4", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", boxShadow: "0 4px 12px rgba(22, 163, 74, 0.15)" }}>
                  <Sparkles size={32} />
                </div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0F172A" }}>
                  Bon retour {deactivatedName ? `parmi nous, ${deactivatedName}` : "sur kEur IA"} !
                </h3>
                <p style={{ margin: 0, fontSize: 15, color: "#64748B", lineHeight: 1.6 }}>
                  Votre compte parent est actuellement suspendu. Vos enfants enregistrés et vos données sont intacts.
                  Pour des raisons de sécurité, nous allons vous envoyer un code de vérification à 6 chiffres par e-mail.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={requestReactivationCode}
                  className="auth-submit"
                  style={{ marginTop: 12, padding: "16px", fontSize: 16, fontWeight: 800, borderRadius: 16 }}
                >
                  {busy ? "Envoi du code OTP..." : "Recevoir mon code par e-mail et réactiver"}
                </button>
              </div>
            )
            : <CodeForm key={view} kind={view} email={email} busy={busy} onSubmit={view === "verify" ? verify : reset} onResend={view === "verify" ? resend : undefined} submitLabel={view === "verify" ? (twoFactor ? "Me connecter" : isReactivating ? "Réactiver mon compte" : undefined) : undefined} />}

          <p className="login-help">
            {role === "eleve" || role === "enseignant"
              ? "Les comptes élèves et enseignants sont créés par l'école."
              : role === "ecole"
                ? "Les comptes des directions d'école sont créés par l'équipe kEur IA."
                : role === "admin"
                  ? "Accès réservé à l'équipe kEur IA."
                  : "Les comptes sont entièrement gérés par kEur IA."}
          </p>
        </div>
      </section>
    </main>
  );
}
