"use client";

import { useEffect, useState } from "react";

export type LevelInfo = { level: number; xpInLevel: number; xpPerLevel: number };

export type ChildTracking = {
  id: number;
  displayName: string;
  email: string;
  xp: number;
  level: LevelInfo;
  completedLessons: string[];
  lastLesson: string | null;
  timeSpent?: { todayMinutes: number };
  todayUsage: {
    minutes: number;
    lessons: number;
    quizzes: number;
    games: number;
  };
};

export function formatPreviewLogin(firstName: string, lastName: string) {
  const full = `${firstName.trim()} ${lastName.trim()}`.trim();
  const slugify = (s: string) => s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const words = full.split(/\s+/).map(slugify).filter(Boolean);
  let base = "identifiant";
  if (words.length >= 2) {
    base = `${words[0]}.${words.slice(1).join("-")}`;
  } else if (words.length === 1) {
    base = words[0];
  }
  return `${base}@keuria.sn`;
}

export function useParentDashboard({ userName }: { userName: string }) {
    const [children, setChildren] = useState<ChildTracking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddChild, setShowAddChild] = useState(false);
    const [showSynthesisModal, setShowSynthesisModal] = useState(false);
    const [newChildFirstName, setNewChildFirstName] = useState("");
    const [newChildLastName, setNewChildLastName] = useState("");
    const [newChildGender, setNewChildGender] = useState<"garcon" | "fille">("garcon");
    const [newChildPassword, setNewChildPassword] = useState("");
    const [newChildAge, setNewChildAge] = useState("");
    // De 7 à 15 ans, le parcours découle de l'âge (même règle que le serveur). Hors de cette tranche, le parent choisit.
  const parsedAge = /^\d{1,2}$/.test(newChildAge.trim()) ? Number(newChildAge.trim()) : NaN;
    const ageIsValid = parsedAge >= 3 && parsedAge <= 25;
    const autoTrack = parsedAge >= 7 && parsedAge <= 15;
    const [manualTrack, setManualTrack] = useState("");
    const newChildAgeGroup = autoTrack ? (parsedAge <= 9 ? "7-9" : parsedAge <= 12 ? "10-12" : "13-15") : (ageIsValid ? manualTrack : "");
    const [addError, setAddError] = useState("");
    const [loadError, setLoadError] = useState("");
    const [isConfirmingAddChild, setIsConfirmingAddChild] = useState(false);
    const [createdChildSuccess, setCreatedChildSuccess] = useState<{ displayName: string; login: string; password?: string } | null>(null);
    const fetchChildren = async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/progress/tracking", { credentials: "include" });
      if (!res.ok) {
        // Une erreur serveur ne doit jamais passer pour « aucun enfant inscrit ».
        setLoadError(res.status === 401 ? "Votre session a expiré. Reconnectez-vous." : "Impossible de charger le suivi de vos enfants pour le moment.");
        return;
      }
      const data = await res.json();
      setChildren(data.tracking || []);
    } catch {
      setLoadError("Connexion impossible. Vérifiez votre réseau puis réessayez.");
    } finally {
      setIsLoading(false);
    }
  };
    useEffect(() => {
    fetchChildren();
  }, []);
    const handleAddChild = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAddError("");

    const fullName = `${newChildFirstName.trim()} ${newChildLastName.trim()}`.trim();
    if (!newChildFirstName.trim()) {
      setAddError("Veuillez renseigner le prénom de l'enfant.");
      return;
    }
    if (!newChildLastName.trim()) {
      setAddError("Veuillez renseigner le nom de famille de l'enfant.");
      return;
    }

    if (!ageIsValid) {
      setAddError("Veuillez indiquer l'âge de votre enfant (entre 3 et 25 ans).");
      return;
    }
    if (!newChildAgeGroup) {
      setAddError(`À ${parsedAge} ans, choisissez vous-même le parcours de votre enfant.`);
      return;
    }

    if (!isConfirmingAddChild) {
      setIsConfirmingAddChild(true);
      return;
    }

    try {
      const res = await fetch("/api/parent/children/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          displayName: fullName,
          password: newChildPassword,
          age: parsedAge,
          ageGroup: newChildAgeGroup,
          gender: newChildGender,
        }),
      });
      
      let data;
      try {
        data = await res.json();
      } catch {
        setAddError("Une difficulté temporaire est survenue. Veuillez réessayer dans un instant.");
        return;
      }

      if (res.ok) {
        const savedLogin = data.child?.email || formatPreviewLogin(newChildFirstName, newChildLastName);
        const savedPass = newChildPassword;
        const savedName = fullName;
        setShowAddChild(false);
        setNewChildPassword("");
        setNewChildFirstName("");
        setNewChildLastName("");
        setNewChildGender("garcon");
        setNewChildAge("");
        setManualTrack("");
        setIsConfirmingAddChild(false);
        fetchChildren();
        setCreatedChildSuccess({ displayName: savedName, login: savedLogin, password: savedPass });
      } else {
        setAddError(data.error || "Une erreur est survenue.");
        setIsConfirmingAddChild(false);
      }
    } catch (e) {
      setAddError("Problème de connexion : " + (e instanceof Error ? e.message : "réseau indisponible"));
      setIsConfirmingAddChild(false);
    }
  };

  return { children, isLoading, setIsLoading, showAddChild, setShowAddChild, showSynthesisModal, setShowSynthesisModal, newChildFirstName, setNewChildFirstName, newChildLastName, setNewChildLastName, newChildGender, setNewChildGender, newChildPassword, setNewChildPassword, newChildAge, setNewChildAge, parsedAge, ageIsValid, autoTrack, setManualTrack, newChildAgeGroup, addError, loadError, isConfirmingAddChild, setIsConfirmingAddChild, createdChildSuccess, setCreatedChildSuccess, fetchChildren, handleAddChild };
}
