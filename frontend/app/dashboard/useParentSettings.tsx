"use client";

import { useState, useEffect } from "react";
import { disablePush, enablePush } from "./push-client";

export interface ChildOption {
  id: number;
  displayName: string;
  todayMinutes: number;
  schoolId?: number | null;
  isSchoolStudent?: boolean;
}

export function useParentSettings(options?: {
  initialDisplayName?: string;
  initialEmail?: string;
  onProfileUpdated?: (profile: { displayName: string; email: string }) => void;
}) {
    const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "security" | "limits">("limits");
    const [isHovered, setIsHovered] = useState<string | null>(null);
    // Form states
  const [toggles, setToggles] = useState({
    emailNotifs: true,
    pushNotifs: true,
    weeklyReport: true,
    twoFactor: false,
    strictTimeLimit: false,
    palouEnabled: false,
    bedtimeEnabled: false,
  });
    const [timeLimit, setTimeLimit] = useState("45 minutes");
    const [bedtimeStart, setBedtimeStart] = useState("20:00");
    const [bedtimeEnd, setBedtimeEnd] = useState("07:00");
    // Profile data
  // Initialisé avec les données courantes de l'utilisateur ou chargées depuis le serveur.
  const [displayName, setDisplayName] = useState(options?.initialDisplayName || "");
  const [email, setEmail] = useState(options?.initialEmail || "");
    const [loadError, setLoadError] = useState("");
    // Multi-child selection
  const [children, setChildren] = useState<ChildOption[]>([]);
    const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
    const [linkOpen, setLinkOpen] = useState(false);
    // Status & Feedback
  const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<"success" | "error">("success");
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: "parent" | "child", id?: string, name?: string, isSchool?: boolean } | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [deactivatePassword, setDeactivatePassword] = useState("");
    // La double authentification se règle pour le compte : la désactiver exige le mot de passe (côté serveur aussi).
  const [savedTwoFactor, setSavedTwoFactor] = useState(false);
    const [twoFactorPassword, setTwoFactorPassword] = useState("");
    // Mot de passe oublié d'un enfant : le parent en choisit un nouveau.
  const [resetChildId, setResetChildId] = useState<string>("");
    const [resetPassword, setResetPassword] = useState("");
    const [resetting, setResetting] = useState(false);
    const durationMap: Record<string, number> = {
    "30 minutes": 30,
    "45 minutes": 45,
    "1 heure": 60,
    "2 heures": 120,
    "Illimité": 0,
  };
    const reverseDurationMap: Record<number, string> = {
    30: "30 minutes",
    45: "45 minutes",
    60: "1 heure",
    120: "2 heures",
    0: "Illimité",
  };
    // 1. Fetch initial settings
  const loadSettings = async (childId: number | null = null) => {
    setLoadError("");
    try {
      // Profile
      const profRes = await fetch("/api/profile", { credentials: "same-origin" });
      if (profRes.ok) {
        const pData = await profRes.json();
        if (pData.profile) {
          if (pData.profile.displayName) setDisplayName(pData.profile.displayName);
          if (pData.profile.email) setEmail(pData.profile.email);
        }
      } else {
        setLoadError(profRes.status === 401 ? "Votre session a expiré. Reconnectez-vous." : "Impossible de charger votre profil.");
      }

      // Limits
      const url = childId 
        ? `/api/progress/parental-limits?childId=${childId}` 
        : `/api/progress/parental-limits`;
      const limRes = await fetch(url, { credentials: "same-origin" });
      if (limRes.ok) {
        const lData = await limRes.json();
        if (lData.ok && lData.limits) {
          setToggles({
            emailNotifs: lData.limits.emailNotifs ?? true,
            pushNotifs: lData.limits.pushNotifs ?? true,
            weeklyReport: lData.limits.weeklyReport ?? true,
            twoFactor: lData.limits.twoFactor ?? false,
            strictTimeLimit: lData.limits.strictTimeLimit ?? false,
            palouEnabled: lData.limits.palouEnabled ?? false,
            bedtimeEnabled: lData.limits.bedtimeEnabled ?? false,
          });
          setSavedTwoFactor(Boolean(lData.limits.twoFactor));
          const mins = lData.limits.dailyLimitMinutes ?? 45;
          setTimeLimit(reverseDurationMap[mins] || "45 minutes");
          setBedtimeStart(lData.limits.bedtimeStart || "20:00");
          setBedtimeEnd(lData.limits.bedtimeEnd || "07:00");
        }
        if (lData.children) {
          setChildren(lData.children);
        }
      } else {
        setLoadError(prev => prev || "Impossible de charger vos réglages (limites, notifications). Les valeurs affichées peuvent ne pas être à jour.");
      }
    } catch {
      setLoadError("Connexion impossible. Vérifiez votre réseau puis réessayez.");
    } finally {
      setLoading(false);
    }
  };
    useEffect(() => {
    loadSettings(selectedChildId);
  }, [selectedChildId]);
    const handleResetChildPassword = async () => {
    const target = children.find(c => c.id.toString() === (resetChildId || children[0]?.id.toString()));
    if (!target) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/parent/children/${target.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResetPassword("");
        showToast(`Nouveau mot de passe enregistré pour ${target.displayName}. Communiquez-le-lui.`);
      } else {
        showToast(data.error || "Impossible de changer le mot de passe.", "error");
      }
    } catch {
      showToast("Problème de connexion. Réessayez dans un instant.", "error");
    } finally {
      setResetting(false);
    }
  };
    const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };
    const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };
    // Le push demande l'autorisation du navigateur et enregistre l'appareil : l'interrupteur ne s'active
  // que si l'abonnement a réellement réussi.
  const handlePushToggle = async () => {
    if (toggles.pushNotifs) {
      await disablePush();
      setToggles(prev => ({ ...prev, pushNotifs: false }));
      return;
    }
    const problem = await enablePush();
    if (problem) {
      showToast(problem, "error");
      return;
    }
    setToggles(prev => ({ ...prev, pushNotifs: true }));
  };
    // 2. Save limits
  const handleSaveLimits = async () => {
    setSaving(true);
    try {
      const payload = {
        strictTimeLimit: toggles.strictTimeLimit,
        palouEnabled: toggles.palouEnabled,
        dailyLimitMinutes: durationMap[timeLimit] ?? 45,
        bedtimeEnabled: toggles.bedtimeEnabled,
        bedtimeStart: bedtimeStart,
        bedtimeEnd: bedtimeEnd,
        emailNotifs: toggles.emailNotifs,
        pushNotifs: toggles.pushNotifs,
        weeklyReport: toggles.weeklyReport,
        twoFactor: toggles.twoFactor,
        childId: selectedChildId,
        ...(savedTwoFactor && !toggles.twoFactor ? { currentPassword: twoFactorPassword } : {}),
      };

      const res = await fetch("/api/progress/parental-limits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSavedTwoFactor(toggles.twoFactor);
        setTwoFactorPassword("");
        // Déclencher le déverrouillage / mise à jour instantanée sur l'écran enfant
        try {
          localStorage.setItem("keria_parental_sync", Date.now().toString());
          if (typeof BroadcastChannel !== "undefined") {
            const bc = new BroadcastChannel("keria_parental_sync");
            bc.postMessage({ type: "limits_updated" });
            bc.close();
          }
        } catch { /* la synchronisation entre onglets est facultative (BroadcastChannel absent) */ }

        const targetName = selectedChildId 
          ? (children.find(c => c.id === selectedChildId)?.displayName || "cet enfant")
          : "tous les enfants du foyer";
        showToast(`Limites enregistrées avec succès pour ${targetName} !`);
      } else {
        if (data.passwordRequired) setActiveTab("security");
        showToast(data.error || "Erreur lors de l'enregistrement", "error");
      }
    } catch {
      showToast("Erreur de communication avec le serveur", "error");
    } finally {
      setSaving(false);
    }
  };
    // 3. Save profile
  const handleSaveProfile = async () => {
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedName.length < 2) {
      showToast("Le nom doit comporter au moins 2 caractères.", "error");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      showToast("Veuillez renseigner une adresse e-mail valide.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: trimmedName, email: trimmedEmail })
      });
      const data = await res.json();
      if (res.ok && data.profile) {
        setDisplayName(data.profile.displayName);
        setEmail(data.profile.email);
        showToast("Profil parent mis à jour avec succès !");
        if (options?.onProfileUpdated) {
          options.onProfileUpdated({
            displayName: data.profile.displayName,
            email: data.profile.email,
          });
        }
      } else {
        showToast(data.error || "Impossible d'enregistrer le profil", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    } finally {
      setSaving(false);
    }
  };
    const selectedChildObj = selectedChildId ? children.find(c => c.id === selectedChildId) : null;

  return { activeTab, setActiveTab, isHovered, setIsHovered, toggles, timeLimit, setTimeLimit, bedtimeStart, setBedtimeStart, bedtimeEnd, setBedtimeEnd, displayName, setDisplayName, email, setEmail, loadError, children, setChildren, selectedChildId, setSelectedChildId, linkOpen, setLinkOpen, loading, setLoading, saving, toastMessage, toastType, deleteConfirm, setDeleteConfirm, actionLoading, setActionLoading, deactivatePassword, setDeactivatePassword, savedTwoFactor, twoFactorPassword, setTwoFactorPassword, resetChildId, setResetChildId, resetPassword, setResetPassword, resetting, loadSettings, handleResetChildPassword, showToast, handleToggle, handlePushToggle, handleSaveLimits, handleSaveProfile, selectedChildObj };
}
