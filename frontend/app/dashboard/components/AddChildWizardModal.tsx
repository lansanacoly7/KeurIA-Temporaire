"use client";

import { useEffect, useState } from "react";
import { 
  X, Check, ChevronRight, ChevronLeft, 
  Eye, EyeOff, User, Wand2, RefreshCw, CheckCircle,
  BookOpen, AlertTriangle
} from "lucide-react";
import { formatPreviewLogin } from "../useParentDashboard";
import "./AddChildWizardModal.css";

interface AddChildWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (child: { displayName: string; login: string; password?: string }) => void;
  onChildAdded: () => void;
}

const TRACKS = [
  {
    id: "7-9" as const,
    ageLabel: "7–9 ans",
    title: "Petits Explorateurs",
    desc: "Histoires illustrées et observation avec Palou.",
  },
  {
    id: "10-12" as const,
    ageLabel: "10–12 ans",
    title: "Jeunes Aventuriers",
    desc: "Découverte de l'IA, logique et esprit critique.",
  },
  {
    id: "13-15" as const,
    ageLabel: "13–15 ans",
    title: "Jeunes Créateurs",
    desc: "Algorithmes, fabrication de projets et éthique numérique.",
  },
];

export function AddChildWizardModal({ isOpen, onClose, onSuccess, onChildAdded }: AddChildWizardModalProps) {
  // 3 étapes simples : 1. Identité, 2. Connexion, 3. Passeport
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Étape 1 : Identité & Sexe
  const [gender, setGender] = useState<"garcon" | "fille">("garcon");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("9");

  // Étape 2 : Connexion
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // État général
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Calcul automatique du parcours selon l'âge
  const parsedAge = parseInt(age.trim(), 10);
  const ageIsValid = !isNaN(parsedAge) && parsedAge >= 3 && parsedAge <= 25;

  const autoTrackId: "7-9" | "10-12" | "13-15" = 
    !ageIsValid || parsedAge <= 9 ? "7-9" : parsedAge <= 12 ? "10-12" : "13-15";

  const currentTrack = TRACKS.find((t) => t.id === autoTrackId) || TRACKS[0];

  // Données déjà commencées à être saisies ?
  const hasEnteredData = firstName.trim().length > 0 || lastName.trim().length > 0 || password.length > 0 || step > 1;

  const handleRequestClose = () => {
    if (isSubmitting) return;
    if (hasEnteredData) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  // Réinitialisation lors de l'ouverture
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setIsSubmitting(false);
      setShowExitConfirm(false);
    }
  }, [isOpen]);

  // Fermeture avec Échap avec confirmation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        if (showExitConfirm) {
          setShowExitConfirm(false);
        } else {
          handleRequestClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, hasEnteredData, showExitConfirm]);

  if (!isOpen) return null;

  const previewLogin = formatPreviewLogin(firstName || "enfant", lastName || "famille");
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  // Générateur de mot de passe simple pour enfant
  const generateEasyPassword = () => {
    const prefixes = ["palou", "safari", "etoile", "baobab", "lionceau", "curieux"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(10 + Math.random() * 89);
    setPassword(`${randomPrefix}${randomNum}!`);
    setShowPassword(true);
  };

  // Validation des étapes
  const canProceedStep1 = firstName.trim().length >= 2 && lastName.trim().length >= 2 && ageIsValid;
  const canProceedStep2 = password.length >= 8;

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!canProceedStep1) {
        setError("Veuillez renseigner le prénom, le nom et un âge valide (3 à 25 ans).");
        return;
      }
      if (!password) {
        generateEasyPassword();
      }
      setStep(2);
    } else if (step === 2) {
      if (!canProceedStep2) {
        setError("Le mot de passe doit comporter au moins 8 caractères.");
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  // Soumission finale de l'inscription
  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/parent/children/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          displayName: fullName,
          password: password,
          gender: gender,
          age: parsedAge,
          ageGroup: autoTrackId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          setError("Votre session a expiré. Veuillez vous reconnecter.");
        } else {
          setError(data.error || "Une difficulté est survenue lors de l'inscription.");
        }
        setIsSubmitting(false);
        return;
      }

      const createdLogin = data.child?.email || previewLogin;
      onChildAdded();
      onSuccess({
        displayName: fullName,
        login: createdLogin,
        password: password,
      });
      onClose();
    } catch {
      setError("Erreur de connexion. Vérifiez votre accès internet.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(14, 45, 38, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="acw-sheet"
        style={{
          maxWidth: 640,
          width: "100%",
          padding: "26px 30px",
          borderRadius: 20,
          background: "white",
          boxShadow: "0 20px 50px rgba(14, 45, 38, 0.2)",
          position: "relative",
          maxHeight: "92vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          boxSizing: "border-box",
        }}
      >
        {/* Modal d'avertissement avant d'abandonner l'inscription */}
        {showExitConfirm && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255, 255, 255, 0.96)",
              backdropFilter: "blur(3px)",
              borderRadius: 20,
              zIndex: 60,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              textAlign: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#FEF3C7",
                color: "#D97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={22} />
            </div>

            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#143C37" }}>
                Abandonner l&apos;inscription ?
              </h3>
              <p style={{ margin: 0, fontSize: 12.5, color: "#64748B", maxWidth: 320, lineHeight: 1.45 }}>
                Les informations déjà saisies pour cet enfant seront perdues si vous quittez maintenant.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 320, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                style={{
                  flex: 1,
                  padding: "9px 14px",
                  borderRadius: 10,
                  background: "#0F766E",
                  border: "none",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(15, 118, 110, 0.2)",
                }}
              >
                Continuer l&apos;inscription
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  onClose();
                }}
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  background: "white",
                  border: "1px solid #CBD5E1",
                  color: "#991B1B",
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                Quitter
              </button>
            </div>
          </div>
        )}

        {/* Bouton fermeture avec confirmation */}
        <button
          type="button"
          onClick={handleRequestClose}
          disabled={isSubmitting}
          aria-label="Fermer"
          className="acw-close"
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "#F1F5F3",
            border: "none",
            width: 28,
            height: 28,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <X size={15} />
        </button>

        {/* ── EN-TÊTE DU WIZARD ── */}
        <div className="acw-head">
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              color: "#0F766E",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              display: "block",
              marginBottom: 3,
            }}
          >
            Espace Famille • Nouvel Explorateur
          </span>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#143C37" }}>
            Inscrire un enfant
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>
            Créez son compte d&apos;apprentissage autonome en quelques étapes rapides.
          </p>
        </div>

        {/* ── STEPPER ÉLÉGANT & AÉRÉ (3 ÉTAPES) ── */}
        <div className="acw-stepper" style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
          {[
            { num: 1, label: "Identité de l'enfant" },
            { num: 2, label: "Connexion sécurisée" },
            { num: 3, label: "Passeport officiel" },
          ].map((s, idx, arr) => {
            const isDone = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} style={{ display: "flex", alignItems: "center", flex: idx === arr.length - 1 ? "none" : 1, gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: isCurrent ? "#0F766E" : isDone ? "#166534" : "#94A3B8",
                    fontWeight: isCurrent ? 800 : 600,
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isCurrent ? "#0F766E" : isDone ? "#DCFCE7" : "#F1F5F9",
                      color: isCurrent ? "white" : isDone ? "#166534" : "#94A3B8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {isDone ? <Check size={12} strokeWidth={3} /> : s.num}
                  </div>
                  <span className={`acw-step-label${isCurrent ? " is-current" : ""}`}>{s.label}</span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: isDone ? "#86EFAC" : "#E2E8F0",
                      borderRadius: 2,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── BANDEAU ERREUR ── */}
        {error && (
          <div
            style={{
              padding: "7px 10px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#991B1B",
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* ── CONTENU DES ÉTAPES (COMPACT ET AÉRÉ) ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          
          {/* ══════════ ÉTAPE 1 : IDENTITÉ & ÂGE ══════════ */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {/* Sexe : Garçon / Fille */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#546E6A", marginBottom: 5 }}>
                  Sexe de l&apos;enfant :
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(["garcon", "fille"] as const).map((g) => {
                    const isSel = gender === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: `1.5px solid ${isSel ? "#0F766E" : "#CBD5E1"}`,
                          background: isSel ? "#F0FDF4" : "white",
                          color: isSel ? "#0F766E" : "#475569",
                          fontWeight: isSel ? 800 : 600,
                          fontSize: 12,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <User size={14} />
                        <span>{g === "garcon" ? "Garçon" : "Fille"}</span>
                        {isSel && <Check size={13} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prénom et Nom */}
              <div className="acw-names" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#546E6A", marginBottom: 3 }}>
                    Prénom <span style={{ color: "#0F766E" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex : Aminata"
                    className="acw-input"
                    required
                    style={{
                      width: "100%",
                      padding: "7px 9px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 12,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#546E6A", marginBottom: 3 }}>
                    Nom <span style={{ color: "#0F766E" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex : Diallo"
                    className="acw-input"
                    required
                    style={{
                      width: "100%",
                      padding: "7px 9px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 12,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* ── SECTION MISE EN VALEUR : ÂGE & PARCOURS ADAPTÉ ── */}
              <div
                style={{
                  background: "#F8FAF8",
                  border: "1.5px solid #D1E5DB",
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div className="acw-age-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 800, color: "#143C37", marginBottom: 2 }}>
                      Âge de l&apos;enfant <span style={{ color: "#0F766E" }}>*</span>
                    </label>
                    <span style={{ fontSize: 10.5, color: "#64748B", display: "block" }}>
                      Clé pédagogique : adapte instantanément le parcours, le vocabulaire et les défis.
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#0F766E",
                      background: "#E6F4EA",
                      padding: "3px 8px",
                      borderRadius: 99,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Adaptation auto
                  </span>
                </div>

                {/* Saisie simple de l'âge + aperçu du parcours auto */}
                <div className="acw-age-row" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "white",
                      border: "1.5px solid #CBD5E1",
                      borderRadius: 10,
                      padding: "8px 12px",
                      flexShrink: 0,
                    }}
                  >
                    <input
                      type="number"
                      min={3}
                      max={25}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Ex : 9"
                      required
                      style={{
                        width: 48,
                        border: "none",
                        outline: "none",
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#143C37",
                        textAlign: "center",
                        padding: 0,
                        background: "transparent",
                      }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>ans</span>
                  </div>

                  {/* Carte dynamique du parcours attribué */}
                  <div
                    className="acw-track"
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      borderRadius: 10,
                      background: currentTrack.id === "7-9" ? "#F0FDF4" : currentTrack.id === "10-12" ? "#EFF6FF" : "#FAF5FF",
                      border: `1px solid ${currentTrack.id === "7-9" ? "#BBF7D0" : currentTrack.id === "10-12" ? "#BFDBFE" : "#E9D5FF"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <BookOpen
                        size={16}
                        color={currentTrack.id === "7-9" ? "#0F766E" : currentTrack.id === "10-12" ? "#1D4ED8" : "#7E22CE"}
                        style={{ flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <strong style={{ fontSize: 12, color: "#143C37" }}>
                            {currentTrack.title}
                          </strong>
                          <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>
                            ({currentTrack.ageLabel})
                          </span>
                        </div>
                        <p className="acw-track-desc" style={{ margin: 0, fontSize: 11, color: "#64748B", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {currentTrack.desc}
                        </p>
                      </div>
                    </div>
                    <span
                      className="acw-track-badge"
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        color: currentTrack.id === "7-9" ? "#15803D" : currentTrack.id === "10-12" ? "#1D4ED8" : "#7E22CE",
                        background: "white",
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: "1px solid rgba(0,0,0,0.06)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      Niveau {currentTrack.ageLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ ÉTAPE 2 : CONNEXION & MOT DE PASSE ══════════ */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {/* Identifiant auto-généré */}
              <p style={{ margin: 0, fontSize: 12.5, color: "#64748B", overflowWrap: "anywhere" }}>
                Son identifiant : <strong style={{ color: "#0F766E", fontFamily: "monospace" }}>{previewLogin}</strong>
              </p>

              {/* Mot de passe de l'enfant */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#546E6A", marginBottom: 5 }}>
                  Mot de passe de l&apos;enfant <span style={{ color: "#0F766E" }}>*</span>
                </label>

                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    className="acw-input"
                    minLength={8}
                    required
                    style={{
                      width: "100%",
                      padding: "7px 32px 7px 9px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 12,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Masquer" : "Afficher"}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#64748B",
                      display: "flex",
                      alignItems: "center",
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  <small style={{ fontSize: 11, color: password.length >= 8 ? "#166534" : "#64748B" }}>
                    {password.length >= 8 ? "✓ Mot de passe valide" : "8 caractères minimum"}
                  </small>
                  <button
                    type="button"
                    onClick={generateEasyPassword}
                    style={{
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      borderRadius: 8,
                      color: "#0F766E",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 10px",
                    }}
                  >
                    <Wand2 size={13} /> Générer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ ÉTAPE 3 : PASSEPORT & CONFIRMATION ══════════ */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Carte Passeport récapitulative compacte */}
              <div
                style={{
                  background: "#F8FAF7",
                  border: "1.5px solid #0F766E",
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "#0F766E",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {firstName.trim() ? firstName.trim().charAt(0).toUpperCase() : <User size={18} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#143C37", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {fullName || "Nouvel explorateur"}
                    </h4>
                    <span style={{ fontSize: 11, color: "#0F766E", fontWeight: 700 }}>
                      {gender === "fille" ? "Fille" : "Garçon"} • {parsedAge} ans
                    </span>
                  </div>
                </div>

                <div style={{ height: 1, background: "#E2ECE5" }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                  <div>
                    <span style={{ color: "#64748B", fontWeight: 600, display: "block", fontSize: 10 }}>Parcours auto :</span>
                    <strong style={{ color: "#143C37" }}>{currentTrack.title}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontWeight: 600, display: "block", fontSize: 10 }}>Identifiant :</span>
                    <strong style={{ color: "#0F766E", fontFamily: "monospace" }}>{previewLogin}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── ACTIONS DU BAS (BOUTONS COMPACTS ET AÉRÉS) ── */}
        <div
          className="acw-actions"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            paddingTop: 8,
            borderTop: "1px solid #F1F5F9",
          }}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="acw-btn acw-back"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 12px",
                borderRadius: 8,
                background: "white",
                border: "1px solid #CBD5E1",
                color: "#475569",
                fontWeight: 600,
                fontSize: 11.5,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <ChevronLeft size={14} /> Précédent
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="acw-btn"
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "7px 16px",
                borderRadius: 8,
                background: "#0F766E",
                border: "none",
                color: "white",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(15, 118, 110, 0.2)",
                transition: "all 0.15s ease",
              }}
            >
              Suivant <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="acw-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                borderRadius: 8,
                background: "#0F766E",
                border: "none",
                color: "white",
                fontWeight: 800,
                fontSize: 12,
                cursor: isSubmitting ? "wait" : "pointer",
                boxShadow: "0 2px 8px rgba(15, 118, 110, 0.25)",
                transition: "all 0.15s ease",
              }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> Inscription…
                </>
              ) : (
                <>
                  <CheckCircle size={14} /> Confirmer l&apos;inscription
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
