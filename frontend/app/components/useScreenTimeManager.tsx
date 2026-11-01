"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";

export interface ScreenTimeManagerProps {
  role?: string;
  displayName?: string;
  signedIn?: boolean;
  isAdmin?: boolean;
  isVisitor?: boolean;
}

export interface ParentalStatus {
  ok: boolean;
  childId?: number;
  childName?: string;
  role?: string;
  isLocked: boolean;
  lockReason: "bedtime" | "limit_exceeded" | null;
  bedtimeActive: boolean;
  limitReached: boolean;
  usageToday: {
    minutes: number;
    remainingMinutes: number | null;
  };
  limits: {
    strictTimeLimit: boolean;
    dailyLimitMinutes: number;
    bedtimeEnabled: boolean;
    bedtimeStart: string;
    bedtimeEnd: string;
  };
}

export function useScreenTimeManager({ 
  role: propRole, 
  displayName: propDisplayName, 
  signedIn: propSignedIn, 
  isAdmin: propIsAdmin, 
  isVisitor: propIsVisitor 
}: ScreenTimeManagerProps = {}) {
    const [status, setStatus] = useState<ParentalStatus | null>(null);
    const [persistedLock, setPersistedLock] = useState<{ isLocked: boolean; lockReason: "bedtime" | "limit_exceeded" | null; childId?: number; childName?: string } | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [parentPassword, setParentPassword] = useState("");
    const [unlockError, setUnlockError] = useState("");
    const [unlockSuccess, setUnlockSuccess] = useState("");
    const [requestSent, setRequestSent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dismissBanner, setDismissBanner] = useState(false);
    const isLoggingOutRef = useRef(false);
    // Restore persisted lock from sessionStorage on mount (if any)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("keria_screen_locked");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.isLocked) {
          setPersistedLock(parsed);
        }
      }
    } catch {
      // Ignorer
    }
  }, []);
    const checkStatus = useCallback(async () => {
    // Si déjà confirmé admin ou parent via props, ne rien faire
    if (propIsAdmin || propRole === "parent" || propRole === "enseignant") {
      setPersistedLock(null);
      try { sessionStorage.removeItem("keria_screen_locked"); } catch { /* stockage local indisponible (navigation privée) : le suivi local est facultatif */ }
      return;
    }

    try {
      const res = await fetch("/api/progress/parental-limits", { credentials: "same-origin" });
      if (res.ok) {
        const data: ParentalStatus = await res.json();
        if (data.ok && (data.role === "student" || data.role === "eleve" || data.role === "enfant" || !propRole)) {
          setStatus(data);

          if (data.isLocked) {
            const lockInfo = {
              isLocked: true,
              lockReason: data.lockReason,
              childId: data.childId,
              childName: data.childName
            };
            setPersistedLock(lockInfo);
            try {
              sessionStorage.setItem("keria_screen_locked", JSON.stringify(lockInfo));
            } catch { /* stockage local indisponible (navigation privée) : le suivi local est facultatif */ }
          } else {
            // Déverrouillage immédiat dès que le parent approuve ou désactive les limites
            setPersistedLock(null);
            setRequestSent(false);
            setShowPasswordModal(false);
            try {
              sessionStorage.removeItem("keria_screen_locked");
            } catch { /* stockage local indisponible (navigation privée) : le suivi local est facultatif */ }
          }
        }
      }
    } catch {
      // Ignorer les erreurs réseau temporaires
    }
  }, [propIsAdmin, propRole]);
    // Synchronisation instantanée temps réel (BroadcastChannel + Storage Event)
  useEffect(() => {
    checkStatus();

    // Polling rapide (2s si verrouillé ou requête en attente, 5s sinon)
    const isCurrentlyLocked = status?.isLocked || persistedLock?.isLocked || requestSent;
    const intervalMs = isCurrentlyLocked ? 2000 : 6000;
    const interval = setInterval(checkStatus, intervalMs);

    // Écoute des signaux directs envoyés par le compte parent (même machine/navigateur)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "keria_parental_sync") {
        checkStatus();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("keria_parental_sync");
        bc.onmessage = () => {
          checkStatus();
        };
      }
    } catch { /* la synchronisation entre onglets est facultative (BroadcastChannel absent) */ }

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
      if (bc) bc.close();
    };
  }, [checkStatus, status?.isLocked, persistedLock?.isLocked, requestSent]);
    const childDisplayName = propDisplayName || status?.childName || persistedLock?.childName || "Jeune Explorateur";
    const effectiveChildId = status?.childId || persistedLock?.childId;
    const handleRequestTime = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/progress/parental-limits/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "request_time", childId: effectiveChildId })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setRequestSent(true);
      }
    } catch {
      // Erreur
    } finally {
      setIsSubmitting(false);
    }
  };
    const handleParentUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError("");
    setUnlockSuccess("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/progress/parental-limits/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parentPassword, childId: effectiveChildId, action: "unlock" })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setUnlockSuccess(data.message || "Déverrouillage réussi !");
        setParentPassword("");
        try {
          sessionStorage.removeItem("keria_screen_locked");
        } catch { /* stockage local indisponible (navigation privée) : le suivi local est facultatif */ }

        setTimeout(() => {
          setShowPasswordModal(false);
          setUnlockSuccess("");
          setPersistedLock(null);
          // Rechargement fluide de la page pour restaurer la session active
          window.location.reload();
        }, 1000);
      } else {
        setUnlockError(data.error || "Mot de passe incorrect.");
      }
    } catch {
      setUnlockError("Erreur de communication avec le serveur.");
    } finally {
      setIsSubmitting(false);
    }
  };
    const handleSignOut = async () => {
    try {
      sessionStorage.removeItem("keria_screen_locked");
      sessionStorage.clear();
      localStorage.removeItem("keria_progress");
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  };
    const isLocked = status?.isLocked || persistedLock?.isLocked || false;
    const lockReason = status?.lockReason || persistedLock?.lockReason || null;
    const remaining = status?.usageToday?.remainingMinutes ?? null;
    useEffect(() => {
    if (typeof window !== "undefined") {
      if (isLocked) {
        document.body.classList.add("keria-screen-locked");
        window.dispatchEvent(new CustomEvent("keria-lock-state", { detail: { locked: true } }));
      } else {
        document.body.classList.remove("keria-screen-locked");
        window.dispatchEvent(new CustomEvent("keria-lock-state", { detail: { locked: false } }));
      }
    }
  }, [isLocked]);

  return { status, showPasswordModal, setShowPasswordModal, parentPassword, setParentPassword, unlockError, setUnlockError, unlockSuccess, requestSent, isSubmitting, dismissBanner, setDismissBanner, childDisplayName, handleRequestTime, handleParentUnlock, handleSignOut, isLocked, lockReason, remaining };
}
