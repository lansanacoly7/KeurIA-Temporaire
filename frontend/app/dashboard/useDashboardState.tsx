"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AgeKey, tracks, World, skillBadges, computeEarnedBadges } from "../lms-data";
import { dailyPlans, emptyDailyUsage, type DailyKind, type DailyUsage } from "../daily-plan";
import confetti from "canvas-confetti";
import { PalouEvent } from "../components/PalouGuide";
import { GAME_LEVELS, type GameLevel } from "./games-map-data";
import { isPlayable } from "./parcours79/content";
import { computeMap } from "./parcours79/logic";
import { getLevelTier } from "../level-tiers";
import { Lesson, Progress, Role, SchoolBrand, UnlockedBadge, getEventStorageKey, hasSeenEvent, markEventSeen, postProgressChecked, seenEventsCache } from "./dashboardShared";
import { randomInt, randomFloat } from "../utils/random";
import { isDevMode } from "../utils/devMode";

export function useDashboardState({ initialVisitor, signedIn, isAdmin, accountRole, isSchoolStudent = false, assignedAge, school, displayName, email = "", signInUrl, signOutUrl, activeTab = "aventure" }: { initialVisitor: { id: string | null; name: string | null }; signedIn: boolean; isAdmin: boolean; accountRole: string; isSchoolStudent?: boolean; assignedAge: AgeKey; school: SchoolBrand | null; displayName: string; email?: string; signInUrl: string; signOutUrl: string; activeTab?: "aventure" | "modules" | "jeux" | "programmation" | "badges" | "code" | "suivi" | "dictionnaire" | "overview" | "children" | "classes" | "missions" | "analytics" | "settings" | "classement" | "devoirs" | "profil" | "aujourdhui" | "parcours" | "classe" | "etoiles" | "libre" }) {
    // 'eleve' = école/enseignant, 'enfant' = inscrit par parent. Les deux accèdent au LMS.
  const isLearner = accountRole === "eleve" || accountRole === "enfant";
    const normalizedRole: Role = accountRole === "parent" || accountRole === "enseignant" ? accountRole : (accountRole === "eleve" ? "eleve" : "enfant");
    // Mode visiteur (parent qui consulte un enfant) : valeurs fournies par DashboardClient après l'hydratation,
  // jamais lues ici dans sessionStorage, pour que le premier rendu client soit identique à celui du serveur.
  const [visitorChildId, setVisitorChildId] = useState<string | null>(initialVisitor.id);
    const [visitorChildName, setVisitorChildName] = useState<string | null>(initialVisitor.name);
    const [role, setRole] = useState<Role>(initialVisitor.id ? "enfant" : ((normalizedRole as Role) || "eleve"));
    // Écriture seule : la sortie du mode visiteur efface elle-même les clés (bouton « Quitter »).
  useEffect(() => {
    if (visitorChildId) sessionStorage.setItem("visitorChildId", visitorChildId);
    if (visitorChildName) sessionStorage.setItem("visitorChildName", visitorChildName);
  }, [visitorChildId, visitorChildName]);
    useEffect(() => {
    if (role === "enseignant") {
      window.location.assign("/enseignant");
    }
  }, [role]);
    const [profileName, setProfileName] = useState<string | null>(null);
    const finalDisplayName = ((role === "enfant" || role === "eleve") && visitorChildName) ? visitorChildName : (profileName ?? displayName);
    const [adultTab, setAdultTab] = useState<string>(activeTab === "aventure" ? "overview" : activeTab);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("keria_sidebar_collapsed");
      if (saved === "true") {
        setSidebarCollapsed(true);
      }
    }
  }, []);
    const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("keria_sidebar_collapsed", next ? "true" : "false");
      }
      return next;
    });
  };
    const [age, setAge] = useState<AgeKey>(assignedAge);
    const devActive = isDevMode();
    const ageLocked = isLearner && !devActive;
    const selectAge = (next: AgeKey) => { if (!ageLocked || next === assignedAge || devActive) setAge(next) };
    const [activeWorld, setActiveWorld] = useState<World | null>(null);
    const [activeLesson, setActiveLesson] = useState<{ lesson: Lesson; module: World } | null>(null);
    const [isLoadingLesson, setIsLoadingLesson] = useState<{ lesson: Lesson; module: World } | null>(null);
    const [lessonAnswer, setLessonAnswer] = useState<number | null>(null);
    const [showTuto, setShowTuto] = useState(false);
    const allLessonIds = useMemo(() => Object.values(tracks).flatMap(t => t.worlds.flatMap(w => w.lessons.map(l => l.id))), []);
    const allGameIds = useMemo(() => GAME_LEVELS.map(l => l.id), []);
    const [progress, setProgress] = useState<Progress>(() => isAdmin ? { xp: 0, completed: [...allLessonIds, ...allGameIds], streak: 1 } : { xp: 0, completed: [], streak: 1 });
    const [progressLoaded, setProgressLoaded] = useState(!signedIn);
    // Dernière progression connue de CE compte, gardée dans le navigateur : au prochain lancement elle s'affiche tout de suite,
  // pendant que la version à jour arrive du serveur (jamais de compteurs à zéro). Pas de cache en mode visiteur (parent).
  const progressCacheKey = signedIn && !visitorChildId && email ? `keuria_progress_cache_v1:${email}` : null;
    const [shownFromCache, setShownFromCache] = useState(false);
   // « progressLoaded » reste réservé à la réponse du serveur (animations de récompense)
  useLayoutEffect(() => {
    if (!progressCacheKey || isAdmin) return;
    try {
      const raw = localStorage.getItem(progressCacheKey);
      const cached = raw ? (JSON.parse(raw) as Progress) : null;
      if (cached && typeof cached.xp === "number" && Array.isArray(cached.completed)) {
        setProgress(cached);
        setShownFromCache(true);
      }
    } catch { /* cache illisible : on attend simplement le serveur */ }
  }, [progressCacheKey, isAdmin]);
    // On mémorise chaque état confirmé par le serveur (et chaque leçon terminée ensuite).
  useEffect(() => {
    if (!progressCacheKey || !progressLoaded || isAdmin) return;
    try { localStorage.setItem(progressCacheKey, JSON.stringify(progress)); } catch { /* stockage plein ou indisponible : sans conséquence */ }
  }, [progressCacheKey, progressLoaded, isAdmin, progress]);
    const [avatarId, setAvatarId] = useState<string | null>(null);
    useEffect(() => {
    if (!signedIn || !(accountRole === "eleve" || accountRole === "enfant")) return;
    fetch("/api/profile").then(r => r.ok ? r.json() : null).then(d => setAvatarId(d?.profile?.avatar ?? null)).catch(() => {});
  }, [signedIn, accountRole]);
    const [chatOpen, setChatOpen] = useState(false);
    const [chat, setChat] = useState<{ from: "ker" | "me"; text: string }[]>([{ from: "ker", text: "Nanga def ! Je suis Palou. Dis-moi ce que tu veux comprendre et je te donnerai d’abord un indice." }]);
    const [message, setMessage] = useState("");
    const [palouBusy, setPalouBusy] = useState(false);
    const [dailyUsage, setDailyUsage] = useState<DailyUsage>(emptyDailyUsage);
    const [dailyNotice, setDailyNotice] = useState("");
    // Message visible quand une progression n'a pas pu être enregistrée (pause imposée, session expirée, connexion perdue).
  const [syncNotice, setSyncNotice] = useState("");
    useEffect(() => {
    if (!syncNotice) return;
    const timer = window.setTimeout(() => setSyncNotice(""), 9000);
    return () => window.clearTimeout(timer);
  }, [syncNotice]);
    const [palouEvent, setPalouEvent] = useState<PalouEvent>(null);
    const [isWalking, setIsWalking] = useState(false);
    const [playingLevel, setPlayingLevel] = useState<GameLevel | null>(null);
    const [levelWon, setLevelWon] = useState<{ stars: number } | null>(null);
    const [levelFeedback, setLevelFeedback] = useState<React.ReactNode | null>(null);
    const [replayCount, setReplayCount] = useState(0);
    const [confirmQuit, setConfirmQuit] = useState(false);
    const [showLevelIntro, setShowLevelIntro] = useState(false);
    const [unlockedBadge, setUnlockedBadge] = useState<UnlockedBadge | null>(null);
    const [levelProgress, setLevelProgress] = useState(0);
    const [showLevelModal, setShowLevelModal] = useState(false);
    const [easterEggFound, setEasterEggFound] = useState(false);
    const [checkedRules, setCheckedRules] = useState<Record<number, boolean>>({});
    useEffect(() => {
    if (!signedIn) return;
    fetch(visitorChildId ? `/api/charter?child_id=${encodeURIComponent(visitorChildId)}` : "/api/charter", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setCheckedRules(Array.isArray(d?.checked) ? Object.fromEntries(d.checked.map((id: number) => [id, true])) : {}); })
      .catch(() => { });
  }, [signedIn, visitorChildId]);
    // La charte cochée est enregistrée sur le compte ; en cas d'échec on revient à l'état précédent.
  const saveCheckedRules = async (next: Record<number, boolean>) => {
    if (visitorChildId) return; // mode visiteur : lecture seule
    const previous = checkedRules;
    setCheckedRules(next);
    if (!signedIn) return;
    try {
      const response = await fetch("/api/charter", { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ checked: Object.keys(next).filter(k => next[Number(k)]).map(Number) }) });
      if (!response.ok) setCheckedRules(previous);
    } catch { setCheckedRules(previous); }
  };
    // === ANIMATION QUEUE ===
  const [animationQueue, setAnimationQueue] = useState<{ type: "badge" | "level" | "tuto_club", id: string, name?: string, description?: string, icon?: string, rarity?: "bronze" | "silver" | "gold" }[]>([]);
    const userScope = finalDisplayName || "child";
    const recordError = () => {
    if (visitorChildId) return;
    try {
      const scopeKey = userScope.replace(/\s+/g, '_').toLowerCase();
      const storageKey = `keria_errors_${scopeKey}`;
      const count = (parseInt(localStorage.getItem(storageKey) || "0", 10) || 0) + 1;
      localStorage.setItem(storageKey, String(count));
      localStorage.setItem(`keria_perfect_streak_${scopeKey}`, "0");
      if (count >= 20 && !progress.badges?.includes("b_persist")) {
        unlockBadgeById("b_persist");
      }
    } catch { /* stockage local indisponible (navigation privée) : le suivi local est facultatif */ }

    if (signedIn) {
      try {
        fetch("/api/progress/record-activity", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "error" })
        }).catch(() => {});
      } catch { /* envoi de statistiques non essentiel : un échec ne doit jamais gêner l'enfant */ }
    }
  };
    const recordQuizResult = (isPerfect: boolean, errorsMade: number = 0) => {
    if (visitorChildId) return;
    try {
      const scopeKey = userScope.replace(/\s+/g, '_').toLowerCase();
      if (errorsMade > 0) {
        const storageKey = `keria_errors_${scopeKey}`;
        const count = (parseInt(localStorage.getItem(storageKey) || "0", 10) || 0) + errorsMade;
        localStorage.setItem(storageKey, String(count));
        if (count >= 20 && !progress.badges?.includes("b_persist")) {
          unlockBadgeById("b_persist");
        }
      }

      const streakKey = `keria_perfect_streak_${scopeKey}`;
      if (isPerfect) {
        const current = (parseInt(localStorage.getItem(streakKey) || "0", 10) || 0) + 1;
        localStorage.setItem(streakKey, String(current));
        if (current >= 3 && !progress.badges?.includes("b_detective")) {
          unlockBadgeById("b_detective");
        }
      } else {
        localStorage.setItem(streakKey, "0");
      }
    } catch { /* stockage local indisponible (navigation privée) : le suivi local est facultatif */ }

    if (signedIn) {
      try {
        fetch("/api/progress/record-activity", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "quiz_result", isPerfect, errors: errorsMade })
        }).catch(() => {});
      } catch { /* envoi de statistiques non essentiel : un échec ne doit jamais gêner l'enfant */ }
    }
  };
    const unlockBadgeById = (badgeId: string) => {
    setProgress(prev => {
      if (prev.badges?.includes(badgeId)) return prev;
      return {
        ...prev,
        badges: Array.from(new Set([...(prev.badges || []), badgeId]))
      };
    });

    if (!hasSeenEvent(`badge_anim_${badgeId}`, userScope)) {
      const badgeDef = skillBadges.find(b => b.id === badgeId);
      if (badgeDef) {
        setAnimationQueue(q => [
          ...q,
          {
            type: "badge",
            id: badgeId,
            name: badgeDef.name,
            description: badgeDef.description,
            icon: badgeDef.icon,
            rarity: badgeDef.rarity
          }
        ]);
        markEventSeen(`badge_anim_${badgeId}`, userScope);
      }
    }
  };
    useEffect(() => {
    if (!isLearner || !progressLoaded) return; // Only process animations once server progress and seenEvents are loaded

    const newQueue = [...animationQueue];
    const scopeKey = userScope.replace(/\s+/g, '_').toLowerCase();
    const perfectStreak = parseInt(localStorage.getItem(`keria_perfect_streak_${scopeKey}`) || "0", 10) || 0;
    const errorCount = parseInt(localStorage.getItem(`keria_errors_${scopeKey}`) || "0", 10) || 0;

    // 1. Badge animations (both skill badges and module diplomas)
    const skillEarned = computeEarnedBadges(progress.completed.length, progress.xp, progress.streak, {
      tutorialCompleted: progress.tutorialCompleted || hasSeenEvent("tuto_done", userScope),
      completedLessons: progress.completed,
      perfectStreak,
      errorCount,
      badges: progress.badges
    });
    const allEarnedBadges = Array.from(new Set([...skillEarned, ...(progress.badges || [])]));

    for (const badgeId of allEarnedBadges) {
      if (!hasSeenEvent(`badge_anim_${badgeId}`, userScope)) {
        let badgeDef = skillBadges.find((b) => b.id === badgeId);

        // If it's a module badge, construct the definition on the fly
        if (!badgeDef && badgeId.startsWith("b_module_")) {
           const moduleId = badgeId.replace("b_module_", "");
           const moduleDef = track.worlds.find(w => w.id === moduleId);
           if (moduleDef) {
           badgeDef = {
               id: badgeId,
               name: `Dipl��me : ${moduleDef.title}`,
               description: `Bravo ! Tu as terminǸ avec succ��s toutes les missions du module ${moduleDef.title} !`,
               icon: "graduation-cap",
               rarity: "gold"
             } as unknown as (typeof skillBadges)[number];
           }
        }

        if (badgeDef) {
          // Special case for tuto club (Bienvenu au club)
          if (badgeId === "b_tuto" && !hasSeenEvent("tuto_done", userScope) && !progress.tutorialCompleted) {
             continue; // Wait until tutorial is actually done
          }
          newQueue.push({
            type: "badge",
            id: badgeId,
            name: badgeDef.name,
            description: badgeDef.description,
            icon: badgeDef.icon,
            rarity: badgeDef.rarity
          });
          markEventSeen(`badge_anim_${badgeId}`, userScope);
        }
      }
    }

    // 2. Level up animations
    const currentLevelName = getLevelTier(progress.xp).name;
    // Une animation de montée de niveau n'a lieu qu'à un vrai palier (le palier de départ n'en a pas).
    if (getLevelTier(progress.xp).level > 1 && !hasSeenEvent(`level_anim_${currentLevelName}`, userScope)) {
      newQueue.push({ type: "level", id: currentLevelName, name: currentLevelName });
      markEventSeen(`level_anim_${currentLevelName}`, userScope);
    }

    if (newQueue.length > animationQueue.length) {
      setAnimationQueue(newQueue);
    }
  }, [progress.completed.length, progress.xp, progress.streak, progress.badges, progress.tutorialCompleted, isLearner, userScope, progressLoaded]);
    useEffect(() => {
    const handler = (e: any) => setLevelProgress(e.detail);
    window.addEventListener("levelProgress", handler);
    return () => window.removeEventListener("levelProgress", handler);
  }, []);
    const openLevel = (level: GameLevel | null) => {
    setPlayingLevel(level);
    setLevelWon(null);
    setLevelFeedback(null);
    setReplayCount(0);
    setLevelProgress(0);
    setConfirmQuit(false);
    setShowLevelIntro(!!level && level.kind !== "coffre");
  };
    useEffect(() => {
    if (levelWon) {
      if (levelWon.stars === 3) {
        // Confettis seulement pour 3 étoiles
        const duration = 2.5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };
        const randomInRange = (min: number, max: number) => randomFloat() * (max - min) + min;
        const interval: ReturnType<typeof setInterval> = setInterval(function () {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) {
            return clearInterval(interval);
          }
          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: randomFloat() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: randomFloat() - 0.2 } });
        }, 250);
      }

      try {
        const C = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!C) return;
        const ctx = new C();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        setTimeout(() => void ctx.close(), 500);
      } catch { /* l'audio est facultatif (navigateur sans AudioContext ou son bloqué) : on continue sans son */ }
    }
  }, [levelWon]);
    const [mapCompleted, setMapCompleted] = useState<string[]>(progress.completed);
    useEffect(() => { if (playingLevel === null) setMapCompleted(progress.completed); }, [playingLevel, progress.completed]);
    // Dynamic header state
  const [headerImg, setHeaderImg] = useState("Palou_Hero.png");
    const [headerTitle, setHeaderTitle] = useState("Jámm rekk");
    const [headerSubtitle, setHeaderSubtitle] = useState("Prêt·e pour une nouvelle mission avec Palou ?");
    useEffect(() => {
    const images = ["Palou_Hero.png", "Palou_Parfait.png", "Palou_Encouragement.png", "Palou_Content.png", "palou-wink.png"];
    const greetings = [
      { t: "Jámm rekk", s: "Prêt·e pour une nouvelle mission avec Palou ?" },
      { t: "Tu assures", s: "Continue sur ta lancée, tu apprends super vite !" },
      { t: "Bravo", s: "Chaque leçon te rend plus fort·e. On y retourne ?" },
      { t: "C'est parti", s: "Découvre les secrets de l'IA aujourd'hui !" },
      { t: "Coucou", s: "N'oublie pas : chaque erreur est une occasion d'apprendre." }
    ];

    const interval = setInterval(() => {
      setHeaderImg(images[randomInt(images.length)]);
      const g = greetings[randomInt(greetings.length)];
      setHeaderTitle(g.t);
      setHeaderSubtitle(g.s);
    }, 15000);
    return () => clearInterval(interval);
  }, []);
    // Greeting on mount
  useEffect(() => {
    const t = setTimeout(() => setPalouEvent("greet"), 800);
    return () => clearTimeout(t);
  }, []);
    // Jump on XP gain
  const prevXp = useRef(progress.xp);
    useEffect(() => {
    if (progress.xp > prevXp.current) {
      setPalouEvent("jump");
      prevXp.current = progress.xp;
    }
  }, [progress.xp]);
    // Walk during transitions
  const prevView = useRef(activeTab);
    useEffect(() => {
    if (activeTab !== prevView.current) {
      setIsWalking(true);
      const t = setTimeout(() => setIsWalking(false), 1200);
      prevView.current = activeTab;
      return () => clearTimeout(t);
    }
  }, [activeTab]);
    const isThinking = chatOpen || !!activeWorld;
    const track = tracks[age];
    const dailyPlan = dailyPlans[age];
    const limitsApply = isLearner && !isAdmin && !devActive;
    const timeToPause = !devActive && limitsApply && (dailyUsage.minutes >= dailyPlan.minutes || dailyUsage.lessons >= dailyPlan.lessons);
    const timeLimitReached = false;
    const lessonLimitReached = false;
    const totalLessons = track.worlds.reduce((n, w) => n + w.lessons.length, 0);
    const done = progress.completed.filter(x => x.startsWith(age === "10-12" ? "a" : age === "7-9" ? "p" : "c")).length;
    const percent = Math.round(done / totalLessons * 100);
    useEffect(() => {
    if (!signedIn) {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const raw = localStorage.getItem("keria_guest_streak");
        let guestStreak = 1;
        if (raw) {
          const parsed = JSON.parse(raw);
          const lastDate = parsed.lastDate;
          const prevStreak = Number(parsed.streak) || 1;
          const diffDays = Math.round((new Date(todayStr).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 0) {
            guestStreak = prevStreak;
          } else if (diffDays === 1) {
            guestStreak = prevStreak + 1;
            localStorage.setItem("keria_guest_streak", JSON.stringify({ lastDate: todayStr, streak: guestStreak }));
          } else {
            guestStreak = 1;
            localStorage.setItem("keria_guest_streak", JSON.stringify({ lastDate: todayStr, streak: 1 }));
          }
        } else {
          localStorage.setItem("keria_guest_streak", JSON.stringify({ lastDate: todayStr, streak: 1 }));
        }
        setProgress(p => ({ ...p, streak: guestStreak }));
      } catch { /* stockage local indisponible (navigation privée) : le suivi local est facultatif */ }
      return;
    }
    // En mode visiteur, un parent consulte la progression de son enfant (child_id), pas la sienne.
    fetch(visitorChildId ? `/api/progress?child_id=${encodeURIComponent(visitorChildId)}` : "/api/progress")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.progress) {
          const isTutoDone = Boolean(
            d.progress.tutorialCompleted ||
            (d.progress.completedLessons && d.progress.completedLessons.length > 0) ||
            (d.progress.xp && d.progress.xp > 0)
          );
          if (isTutoDone) {
            markEventSeen("tuto_done", userScope, false);
          }

          // Hydratation de tous les événements et récompenses déjà acquis/célébrés depuis le serveur
          if (Array.isArray(d.progress.seenEvents)) {
            const storageKey = getEventStorageKey(userScope);
            try {
              const store = JSON.parse(localStorage.getItem(storageKey) || "{}");
              for (const ev of d.progress.seenEvents) {
                store[ev] = true;
                seenEventsCache.add(ev);
              }
              localStorage.setItem(storageKey, JSON.stringify(store));
            } catch (e) {
              for (const ev of d.progress.seenEvents) {
                seenEventsCache.add(ev);
              }
            }
          }

          // Synchronisation des statistiques persistantes (erreurs et sans-faute)
          const scopeKey = userScope.replace(/\s+/g, '_').toLowerCase();
          if (d.progress.errorCount !== undefined) {
            try {
              localStorage.setItem(`keria_errors_${scopeKey}`, String(d.progress.errorCount));
            } catch { /* stockage local indisponible (navigation privée) : le suivi local est facultatif */ }
          }
          if (d.progress.perfectStreak !== undefined) {
            try {
              localStorage.setItem(`keria_perfect_streak_${scopeKey}`, String(d.progress.perfectStreak));
            } catch { /* stockage local indisponible (navigation privée) : le suivi local est facultatif */ }
          }

          setProgress({
            xp: d.progress.xp ?? 0,
            completed: isAdmin ? [...allLessonIds, ...allGameIds] : [...(d.progress.completedLessons ?? []), ...(d.progress.gamesUnlocked ?? [])],
            streak: d.progress.streak ?? 1,
            lessonStars: d.progress.lessonStars ?? {},
            badges: d.progress.badges ?? [],
            tutorialCompleted: isTutoDone
          });
          setProgressLoaded(true);
        } else {
          setProgressLoaded(true);
        }
      })
      .catch(() => { setProgressLoaded(true); });
  }, [signedIn, isAdmin, allLessonIds, allGameIds, visitorChildId, userScope]);
    useEffect(() => { if (!signedIn) return; fetch(`/api/daily-usage?age=${age}`).then(r => r.ok ? r.json() : null).then(d => { if (d?.usage) setDailyUsage(d.usage) }).catch(() => { }) }, [signedIn, age]);
    // Compteur de temps d'écran : un échec (réseau, réponse non JSON, limite) ne doit JAMAIS empêcher l'enfant d'avancer.
  const recordDaily = async (kind: DailyKind) => {
    if (!signedIn || !limitsApply) return;
    try {
      const response = await fetch("/api/daily-usage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ age, kind }) });
      const data = await response.json();
      if (response.ok && data.usage) setDailyUsage(data.usage);
    } catch { /* le compteur se resynchronisera à la prochaine activité */ }
  };
    useEffect(() => { if (!signedIn || !limitsApply || timeLimitReached) return; const timer = window.setInterval(() => { if (document.visibilityState === "visible") void recordDaily("minute") }, 60000); return () => window.clearInterval(timer) }, [signedIn, limitsApply, timeLimitReached, age]);
    useEffect(() => {
    const isDone = Boolean(
      progress.tutorialCompleted ||
      hasSeenEvent("tuto_done", userScope)
    );
    // Tant que la progression du serveur n'est pas chargée, on ne sait pas si l'élève a déjà fait la visite : on n'affiche rien.
    if (!progressLoaded) return;
    if (isLearner && !isAdmin && !isDone) {
      setShowTuto(true);
    } else if (isDone && showTuto) {
      setShowTuto(false);
    }
  }, [isLearner, isAdmin, progress.tutorialCompleted, showTuto, userScope, progressLoaded]);
    const nextLesson = useMemo(() => track.worlds.flatMap(w => w.lessons.map(l => ({ ...l, world: w }))).find(l => !progress.completed.includes(l.id)), [track, progress]);
    // Parcours 7-9 : la carte sait quelles leçons existent vraiment (jamais d'écran vide) ; on démarre une leçon directement, sans attente.
  const map79 = useMemo(() => (age === "7-9" ? computeMap(track.worlds, progress.completed, isPlayable, devActive) : null), [age, track, progress.completed, devActive]);
    // Niveaux de jeu déjà débloqués : ceux terminés et le prochain à jouer (même règle séquentielle que la carte des jeux).
  const firstOpenGame = GAME_LEVELS.findIndex(l => !progress.completed.includes(l.id));
    const gameUnlocked = (index: number) => devActive || (!!GAME_LEVELS[index] && (progress.completed.includes(GAME_LEVELS[index].id) || firstOpenGame === -1 || index <= firstOpenGame));
    const workshopsUnlocked = devActive || [3, 6, 5].some(gameUnlocked);
    const startLesson79 = (lessonId: string, worldId: string) => {
    const world = track.worlds.find(w => w.id === worldId);
    const lesson = world?.lessons.find(l => l.id === lessonId);
    if (world && lesson) { setLessonAnswer(null); setActiveLesson({ lesson, module: world }); }
  };
    const completeLesson = async (id: string, xp: number, score = 100, isPerfect = true, stars?: number) => {
    if (visitorChildId) return; // mode visiteur : lecture seule, rien n'est enregistré
    if (progress.completed.includes(id)) {
      // Rejouer une leçon ne redonne pas d'XP (le serveur ne la compte qu'une fois), mais de meilleures étoiles sont gardées.
      if (stars && stars > (progress.lessonStars?.[id] ?? 0)) {
        setProgress(p => ({ ...p, lessonStars: { ...(p.lessonStars ?? {}), [id]: stars } }));
        if (signedIn) {
          const outcome = await postProgressChecked(id, { age, score, stars });
          if (!outcome.reply) setSyncNotice(outcome.message);
        }
      }
      return;
    }
    if (lessonLimitReached) {
      setDailyNotice("Ta mission du jour est terminée. Repose-toi et reviens demain pour continuer !");
      return;
    }
    const isFirstLessonEver = progress.completed.length === 0;
    const isFirstLessonModule1 = id === "p1-1" || id === "a1-1" || id === "c1-1" || (id.endsWith("-1") && isFirstLessonEver);
    const nextCompleted = progress.completed.includes(id) ? progress.completed : [...progress.completed, id];
    const nextBadges = [...(progress.badges || [])];

    // Badge "En route" : dès les premiers XP
    if (progress.xp === 0 && xp > 0 && !nextBadges.includes("b_start")) {
      nextBadges.push("b_start");
      unlockBadgeById("b_start");
    }

    // Badge "Premier contact" : après avoir fini le cours 1 du module 1
    if (isFirstLessonModule1 && !nextBadges.includes("b_contact")) {
      nextBadges.push("b_contact");
      unlockBadgeById("b_contact");
    }

    // Badge "Détective Palou" : suivi des sans-faute
    recordQuizResult(isPerfect || score >= 100);

    const next = { ...progress, xp: progress.xp + xp, completed: nextCompleted, badges: nextBadges, lessonStars: stars ? { ...(progress.lessonStars ?? {}), [id]: stars } : progress.lessonStars };

    const currentModule = track.worlds.find(w => w.lessons.some(l => l.id === id));
    if (currentModule) {
      const wasComplete = currentModule.lessons.every(l => progress.completed.includes(l.id));
      const isComplete = currentModule.lessons.every(l => nextCompleted.includes(l.id));
      if (!wasComplete && isComplete) {
         const badgeId = `b_module_${currentModule.id}`;
         next.badges = [...(next.badges || []), badgeId];
         // N'afficher l'animation diplôme qu'une seule fois
         if (!hasSeenEvent(`reward_${badgeId}`, userScope)) {
           markEventSeen(`reward_${badgeId}`, userScope);
           const badgeToUnlock = {
             id: badgeId,
             name: `Diplôme : ${currentModule.title}`,
             description: `Bravo ! Tu as terminé avec succès toutes les missions du module ${currentModule.title} !`,
             icon: "graduation-cap",
             rarity: "gold" as const
           };
           setUnlockedBadge(badgeToUnlock);
         }
      }
    }
    const previousProgress = { ...progress, completed: [...progress.completed] }; // état d'avant, pour annuler si le serveur refuse
    setProgress(next);
    if (signedIn) {
      const outcome = await postProgressChecked(id, stars ? { age, score, stars } : { age, score });
      if (!outcome.reply) { setProgress(() => previousProgress); setSyncNotice(outcome.message); return; }
      const reply = outcome.reply;
      setProgress(p => ({ ...p, xp: reply.progress.xp })); // le serveur est la seule source de vérité de l'XP
    }
    await Promise.all([recordDaily("lesson"), recordDaily("quiz")]);
  };
    const completeGameLevel = async (id: string, xp: number, kind: "jeu" | "quiz" | "coffre" | "defi", stars: number = 3) => {
    if (visitorChildId) return; // mode visiteur : lecture seule, rien n'est enregistré
    if (progress.completed.includes(id)) {
      const currentStars = progress.lessonStars?.[id] || 0;
      if (stars <= currentStars) return;
    }
    const nextStars = { ...(progress.lessonStars || {}) };
    if (stars > (nextStars[id] || 0)) {
      nextStars[id] = stars;
    }

    // Badge "En route" dès les premiers XP
    if (progress.xp === 0 && xp > 0) {
      unlockBadgeById("b_start");
    }

    // Suivi Détective Palou si 3 étoiles
    if (stars === 3) {
      recordQuizResult(true);
    } else {
      recordQuizResult(false, 1);
    }

    // Rejouer pour gagner des étoiles n'octroie pas d'XP : le serveur ne la compte qu'une fois.
    const firstCompletion = !progress.completed.includes(id);
    const previousProgress = { ...progress, completed: [...progress.completed] };
    const next = { ...progress, xp: firstCompletion ? progress.xp + xp : progress.xp, completed: firstCompletion ? [...progress.completed, id] : progress.completed, lessonStars: nextStars };
    setProgress(next);
    if (signedIn) {
      const outcome = await postProgressChecked(id, { age: "7-9", score: 100, stars });
      if (!outcome.reply) { setProgress(() => previousProgress); setSyncNotice(outcome.message); return; }
      const reply = outcome.reply;
      setProgress(p => ({ ...p, xp: reply.progress.xp })); // le serveur est la seule source de vérité de l'XP
    }
    if (kind === "quiz") await recordDaily("quiz"); else if (kind !== "coffre") await recordDaily("game");
  };
    /** XP d'une activité hors parcours (jeux et quiz d'arcade, bonus) : décidée et enregistrée par le serveur. */
  const awardActivity = async (activityId: string) => {
    if (visitorChildId || !signedIn || progress.completed.includes(activityId)) return;
    const outcome = await postProgressChecked(activityId, { age });
    if (!outcome.reply) { setSyncNotice(outcome.message); return; }
    const reply = outcome.reply;
    setProgress(p => ({ ...p, xp: reply.progress.xp, completed: p.completed.includes(activityId) ? p.completed : [...p.completed, activityId] }));
  };
    const askKer = async () => {
    const q = message.trim();
    if (!q || palouBusy) return;
    setChat(c => [...c, { from: "me", text: q }]);
    setMessage("");
    setPalouBusy(true);
    let reply = "Palou n'est pas disponible pour le moment. Réessaie un peu plus tard !";
    try {
      const response = await fetch("/api/palou/chat", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: q, age })  /* la conversation est retenue par le serveur */ });
      const data = await response.json().catch(() => ({}));
      reply = response.ok && data.reply ? data.reply : (data.error || reply);
    } catch { /* réseau indisponible : message par défaut */ }
    setChat(c => [...c, { from: "ker", text: reply }]);
    setPalouBusy(false);
  };
    const shellClass = `lms-shell ${school ? "school-branded" : ""} ${age === "7-9" ? "kids-theme" : ""}`.trim();
    const getLevel = getLevelTier;
    const levelInfo = getLevel(progress.xp);
    const levelName = levelInfo.name;
    const playBadgeAudio = (text: string) => {
    // Désactivé suite à la demande explicite de l'utilisateur (pas de voix IA)
    return;
  };

  return { visitorChildId, setVisitorChildId, setVisitorChildName, role, setRole, setProfileName, finalDisplayName, adultTab, setAdultTab, sidebarCollapsed, toggleSidebar, age, ageLocked, selectAge, activeWorld, setActiveWorld, activeLesson, setActiveLesson, isLoadingLesson, setIsLoadingLesson, lessonAnswer, setLessonAnswer, showTuto, setShowTuto, progress, setProgress, progressLoaded, shownFromCache, avatarId, setAvatarId, chatOpen, setChatOpen, chat, message, setMessage, palouBusy, dailyUsage, dailyNotice, syncNotice, setSyncNotice, playingLevel, setPlayingLevel, levelWon, setLevelWon, levelFeedback, setLevelFeedback, replayCount, setReplayCount, confirmQuit, setConfirmQuit, showLevelIntro, setShowLevelIntro, unlockedBadge, setUnlockedBadge, levelProgress, showLevelModal, setShowLevelModal, easterEggFound, setEasterEggFound, checkedRules, saveCheckedRules, animationQueue, setAnimationQueue, userScope, unlockBadgeById, openLevel, mapCompleted, headerImg, headerTitle, headerSubtitle, track, dailyPlan, limitsApply, timeToPause, lessonLimitReached, totalLessons, done, percent, recordDaily, nextLesson, map79, gameUnlocked, workshopsUnlocked, startLesson79, completeLesson, completeGameLevel, awardActivity, askKer, shellClass, getLevel, levelName, playBadgeAudio };
}
