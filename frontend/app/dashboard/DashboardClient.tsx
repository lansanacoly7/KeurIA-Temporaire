"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { AgeKey, tracks, skillBadges, computeEarnedBadges, badgeImage } from "../lms-data";
import confetti from "canvas-confetti";
import BadgeGrid from "../components/BadgeGrid";
import { signOut } from "../sign-out-client";
import PalouTutorial from "../components/PalouTutorial";
import BadgeUnlockAnimation from "../components/BadgeUnlockAnimation";
import dynamic from "next/dynamic";

// Vues secondaires et ateliers lourds chargés à la demande par onglet : allège le premier affichage
const ProgrammingAtelier = dynamic(() => import("./programmation/ProgrammingAtelier"), { ssr: false });
const DictionaryView = dynamic(() => import("./DictionaryView").then(m => m.DictionaryView), { ssr: false });
const StudentAssignmentsView = dynamic(() => import("./StudentAssignmentsView").then(m => m.StudentAssignmentsView), { ssr: false });
const AdultLayout = dynamic(() => import("./AdultLayout").then(m => m.AdultLayout), { ssr: false });
const ParentChildrenView = dynamic(() => import("./ParentChildrenView").then(m => m.ParentChildrenView), { ssr: false });
const ParentSettingsView = dynamic(() => import("./ParentSettingsView").then(m => m.ParentSettingsView), { ssr: false });
const ParentDashboardView = dynamic(() => import("./ParentDashboardView").then(m => m.ParentDashboardView), { ssr: false });
const WeeklyLeaderboardView = dynamic(() => import("./WeeklyLeaderboardView").then(m => m.WeeklyLeaderboardView), { ssr: false });
const AujourdHuiView = dynamic(() => import("./cahier/AujourdHuiView").then(m => m.AujourdHuiView), { ssr: false });
const MaClasseView = dynamic(() => import("./cahier/MaClasseView").then(m => m.MaClasseView), { ssr: false });
const LibreView = dynamic(() => import("./cahier/LibreView").then(m => m.LibreView), { ssr: false });

import { JeuxDefisDashboardView } from "./JeuxDefisDashboardView";
import { ModuleMap79 } from "./parcours79/ModuleMap79";
import { archipelFinish } from "./parcours79/Archipel79";
import { LessonTransition79, TRANSITION_MS } from "./parcours79/LessonTransition79";
import { playPop } from "../utils/sounds";
import LevelUpAnimation from "../components/LevelUpAnimation";
import FamilyChatWidget from "../components/FamilyChatWidget";
import LevelDetailsModal from "../components/LevelDetailsModal";
import { Check, Download, GraduationCap, Lock, School, Send, ShieldCheck, Star, Sunrise, Trophy } from "lucide-react";
import ChildProfileView from "./components/ChildProfileView";
import { ScrollDownHint } from "./components/ScrollDownHint";
import { LessonSkeleton } from "../components/SkeletonLoader";
import { SchoolBrand, downloadPersonalizedBadge, hasSeenEvent, markEventSeen, playCelebrationSound, playQuizSound } from "./dashboardShared";
import { LessonPlayer, ScratchView } from "./DashboardActivities";
import { ParentLinkBanner, DashboardSidebar, DashboardTopBar, AventureView } from "./sections";
import { useDashboardState } from "./useDashboardState";
import { LevelPlayOverlay, ChestOverlay, AgeJourneyPanel } from "./DashboardOverlays";
import { isDevMode } from "../utils/devMode";

function DashboardView({ initialVisitor, signedIn, isAdmin, accountRole, isSchoolStudent = false, assignedAge, school, displayName, email = "", signInUrl, signOutUrl, activeTab = "aventure" }: { initialVisitor: { id: string | null; name: string | null }; signedIn: boolean; isAdmin: boolean; accountRole: string; isSchoolStudent?: boolean; assignedAge: AgeKey; school: SchoolBrand | null; displayName: string; email?: string; signInUrl: string; signOutUrl: string; activeTab?: "aventure" | "modules" | "jeux" | "programmation" | "badges" | "code" | "suivi" | "dictionnaire" | "overview" | "children" | "classes" | "missions" | "analytics" | "settings" | "classement" | "devoirs" | "profil" | "aujourdhui" | "parcours" | "classe" | "etoiles" | "libre" }) {
  const s = useDashboardState({ initialVisitor, signedIn, isAdmin, accountRole, isSchoolStudent, assignedAge, school, displayName, email, signInUrl, signOutUrl, activeTab });
  const router = useRouter();
  const [replayKey, setReplayKey] = useState(0); // change à chaque « Refaire » : le lecteur repart de zéro sur la même leçon
  const [transition, setTransition] = useState<{ kind: "next" | "replay"; title: string } | null>(null); // écran de chargement entre deux leçons
  const [currentDisplayName, setCurrentDisplayName] = useState(displayName);
  const [currentEmail, setCurrentEmail] = useState(email);

  useEffect(() => {
    setCurrentDisplayName(displayName);
  }, [displayName]);

  useEffect(() => {
    setCurrentEmail(email);
  }, [email]);

  const { visitorChildId, setVisitorChildId, setVisitorChildName, role, setRole, setProfileName, finalDisplayName, adultTab, setAdultTab, sidebarCollapsed, toggleSidebar, age, ageLocked, selectAge, activeWorld, setActiveWorld, activeLesson, setActiveLesson, isLoadingLesson, setIsLoadingLesson, lessonAnswer, setLessonAnswer, showTuto, setShowTuto, progress, setProgress, progressLoaded, shownFromCache, avatarId, setAvatarId, chatOpen, setChatOpen, chat, message, setMessage, palouBusy, dailyUsage, dailyNotice, syncNotice, setSyncNotice, unlockedBadge, setUnlockedBadge, showLevelModal, setShowLevelModal, easterEggFound, setEasterEggFound, checkedRules, saveCheckedRules, animationQueue, setAnimationQueue, userScope, unlockBadgeById, openLevel, mapCompleted, headerImg, headerTitle, headerSubtitle, track, dailyPlan, limitsApply, timeToPause, lessonLimitReached, totalLessons, done, percent, recordDaily, nextLesson, map79, gameUnlocked, workshopsUnlocked, startLesson79, completeLesson, completeGameLevel, awardActivity, askKer, shellClass, getLevel, levelName, playBadgeAudio } = s;


  if (role === "enseignant") {
    return (
      <div style={{
        minHeight: "calc(100vh / var(--app-zoom, 1))", display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "#f4f7f6", fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 20
      }}>
        <div style={{
          background: "white", padding: 40, borderRadius: 20, textAlign: "center", maxWidth: 500,
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0"
        }}>
          <School size={50} color="#0f755f" />
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#173e3c", marginTop: 16 }}>Espace Enseignant</h2>
          <p style={{ color: "#64748b", margin: "12px 0 24px" }}>
            Redirection vers votre nouvel espace enseignant Kër IA...
          </p>
          <a
            href="/enseignant"
            style={{
              display: "inline-block", background: "#0d846e", color: "white", padding: "12px 28px",
              borderRadius: 12, fontWeight: 700, textDecoration: "none", fontSize: 15
            }}
          >
            Accéder à l'espace enseignant →
          </a>
        </div>
      </div>
    );
  }

  if (role === "parent") {
    return (
      <AdultLayout
        role="parent"
        userName={currentDisplayName}
        userEmail={currentEmail}
        activeTab={adultTab}
        onTabChange={setAdultTab}
      >
        {adultTab === "overview" && (
          <ParentDashboardView
            userName={currentDisplayName}
            onNavigateTab={(tab) => setAdultTab(tab)}
            onVisitChild={(id, name) => {
              setVisitorChildId(String(id));
              setVisitorChildName(name);
              setRole("enfant");
            }}
          />
        )}
        {adultTab === "children" && (
          <ParentChildrenView onVisitChild={(id, name) => {
            setVisitorChildId(String(id));
            setVisitorChildName(name);
            setRole("enfant");
          }} />
        )}
        {adultTab === "settings" && (
          <ParentSettingsView
            initialDisplayName={currentDisplayName}
            initialEmail={currentEmail}
            onProfileUpdated={(p) => {
              setCurrentDisplayName(p.displayName);
              setCurrentEmail(p.email);
              setProfileName(p.displayName);
              router.refresh();
            }}
          />
        )}
        <FamilyChatWidget viewerRole="parent" />
      </AdultLayout>
    );
  }
  // Tant que ni le serveur ni le cache n'ont donné la progression, on n'affiche pas de compteurs à zéro : un écran d'accueil à la place.
  if (signedIn && !progressLoaded && !shownFromCache) {
    return (
      <div role="status" aria-live="polite" style={{ minHeight: "calc(100vh / var(--app-zoom, 1))", display: "grid", placeItems: "center", background: "#f6f8f2", padding: 24 }}>
        <div style={{ textAlign: "center", color: "#173e3c", fontFamily: "'Fredoka', 'Baloo 2', sans-serif" }}>
          <img src="/images/palou/Palou_Content.png" alt="" width={140} height={140} style={{ objectFit: "contain", animation: "palouFloat 3s infinite ease-in-out" }} />
          <p style={{ fontSize: 24, fontWeight: 700, margin: "12px 0 4px" }}>Palou prépare ton espace…</p>
          <p style={{ fontSize: 17, margin: 0, color: "#4b635c" }}>On retrouve ta progression.</p>
        </div>
      </div>
    );
  }
  return <div className={shellClass} style={school ? { "--school-primary": school.primaryColor, "--school-secondary": school.secondaryColor, "--school-accent": school.accentColor } as React.CSSProperties : undefined}>
    <ParentLinkBanner
      school={null}
      visitorChildId={visitorChildId}
      onExitVisitor={() => {
        setVisitorChildId(null);
        setVisitorChildName(null);
        setRole("parent");
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("visitorChildId");
          sessionStorage.removeItem("visitorChildName");
        }
      }}
    />
    {visitorChildId && (
      <style dangerouslySetInnerHTML={{__html: `
        .lms-main button:not(.lms-top button),
          .lms-main a:not(.lms-top a),
          .lms-main .course-card,
          .lms-main .earned,
          .lms-main .locked,
          .lms-main .skill {
           pointer-events: none !important;
           opacity: 0.85;
        }
        .lms-main {
           cursor: not-allowed !important;
        }
      `}} />
    )}
    
      <AgeJourneyPanel s={s} />
    <div style={{ display: activeLesson ? 'none' : 'contents' }}>
      {showTuto && !isSchoolStudent && (
        <PalouTutorial
          activeTab={activeTab}
          onComplete={async () => {
            markEventSeen("tuto_done", userScope);
            setShowTuto(false);
            setProgress(p => ({
              ...p,
              tutorialCompleted: true,
              badges: Array.from(new Set([...(p.badges || []), "b_tuto"]))
            }));
            unlockBadgeById("b_tuto");
            if (signedIn) {
              try {
                await fetch("/api/progress/tutorial-complete", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({})
                });
              } catch (e) {
                console.error("Erreur sauvegarde tutoriel:", e);
              }
            }
          }}
            onStartCourse={async () => {
            markEventSeen("tuto_done", userScope);
            setShowTuto(false);
            setProgress(p => ({
              ...p,
              tutorialCompleted: true,
              badges: Array.from(new Set([...(p.badges || []), "b_tuto"]))
            }));
            unlockBadgeById("b_tuto");
            if (signedIn) {
              try {
                await fetch("/api/progress/tutorial-complete", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({})
                });
              } catch (e) {
                console.error("Erreur sauvegarde tutoriel:", e);
              }
            }
            if (track.worlds[0]?.lessons[0]) {
              setActiveLesson({ lesson: track.worlds[0].lessons[0], module: track.worlds[0] });
            }
          }}
        />
      )}
           {animationQueue.length > 0 && animationQueue[0].type === "badge" && (
        <BadgeUnlockAnimation
          badge={{
            id: animationQueue[0].id,
            name: animationQueue[0].name || "",
            description: animationQueue[0].description || "",
            icon: animationQueue[0].icon || "",
            rarity: animationQueue[0].rarity || "bronze"
          }}
            onClose={() => setAnimationQueue(q => q.slice(1))}
            />
      )}

      {animationQueue.length > 0 && animationQueue[0].type === "level" && (
        <LevelUpAnimation
          levelName={animationQueue[0].name || ""}
          levelImage={getLevel(progress.xp).image}
          onClose={() => setAnimationQueue(q => q.slice(1))}
            />
      )}
      {showLevelModal && (
        <LevelDetailsModal
          currentXp={progress.xp}
          onClose={() => setShowLevelModal(false)}
        />
      )}
      <DashboardSidebar
        sidebarCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
        activeTab={activeTab}
        role={role}
        accountRole={accountRole}
        signedIn={signedIn}
        isAdmin={isAdmin}
        isSchoolStudent={isSchoolStudent}
        school={school}
        visitorChildId={visitorChildId}
        avatarId={avatarId}
        onOpenChat={() => setChatOpen(true)}
      />
      <main className={`lms-main ${sidebarCollapsed ? "sidebar-collapsed" : ""}${isSchoolStudent ? " cahier-main" : ""}`}>
        <ParentLinkBanner
          school={school}
          visitorChildId={null}
          onExitVisitor={() => {}}
        />
        <DashboardTopBar
          activeTab={activeTab}
          role={role}
          accountRole={accountRole}
          signedIn={signedIn}
          visitorChildId={visitorChildId}
          avatarId={avatarId}
          finalDisplayName={finalDisplayName}
          progress={{ streak: progress.streak, xp: progress.xp }}
          levelName={levelName}
          signInUrl={signInUrl}
          onOpenLevelModal={() => setShowLevelModal(true)}
          onSignOut={() => signOut()}
        />

        {(role === "enfant" || role === "eleve") && activeTab === "jeux" && (
          <JeuxDefisDashboardView
            age={age}
            ageLocked={ageLocked}
            selectAge={selectAge}
            progress={progress}
            track={track}
            tracks={tracks}
            mapCompleted={mapCompleted}
            completeGameLevel={completeGameLevel}
            openLevel={openLevel}
            awardActivity={awardActivity}
            progressLoaded={progressLoaded}
            dailyUsage={dailyUsage}
            dailyPlan={dailyPlan}
            limitsApply={limitsApply}
            recordDaily={recordDaily}
          />
        )}
        {(role === "enfant" || role === "eleve") && (activeTab === "programmation" || activeTab === "code") && (age === "7-9" ? <ProgrammingAtelier scope={userScope} /> :<ScratchView age={age} ageLocked={ageLocked} setAge={selectAge} />)}


        {(role === "enfant" || role === "eleve") && activeTab === "aventure" && (
          <AventureView
            headerImg={headerImg}
            headerTitle={headerTitle}
            headerSubtitle={headerSubtitle}
            signedIn={signedIn}
            finalDisplayName={finalDisplayName}
            progress={progress}
            track={track}
            percent={percent}
            done={done}
            totalLessons={totalLessons}
            map79={map79}
            nextLesson={nextLesson}
            lessonLimitReached={lessonLimitReached}
            age={age}
            easterEggFound={easterEggFound}
            onEasterEggClick={() => {
              setEasterEggFound(true);
              void awardActivity("bonus-easter-egg");
              playPop();
            }}
            onStartLesson79={startLesson79}
            onOpenWorld={(w) => setActiveWorld(w)}
            quotidienProps={{
              age,
              userScope,
              signedIn,
              visitorChildId,
              dailyUsage,
              dailyPlan,
              timeToPause,
              limitsApply,
              dailyNotice,
              workshopsUnlocked,
              gameUnlocked,
              onOpenLevel: (lvl) => {
                playPop();
                openLevel(lvl);
              },
              onChallengeResult: (correct, _xpGained, totalXp) => {
                if (!correct) {
                  playQuizSound(false);
                  return;
                }
                if (typeof totalXp === "number") setProgress((p) => ({ ...p, xp: totalXp }));
                playQuizSound(true);
                playCelebrationSound();
                confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
              },
              checkedRules,
              onToggleRule: (ruleId) => {
                playPop();
                const next = { ...checkedRules, [ruleId]: !checkedRules[ruleId] };
                void saveCheckedRules(next);
                if (!checkedRules[ruleId] && Object.values(next).filter(Boolean).length === 3) {
                  playCelebrationSound();
                  confetti({ particleCount: 50, spread: 60 });
                }
              },
            }}
          />
        )}

        {(role === "enfant" || role === "eleve") && (activeTab === "modules" || (isSchoolStudent && activeTab === "parcours")) && age === "7-9" && <div className="dash-content">
          <ModuleMap79 worlds={track.worlds} completed={progress.completed} lessonStars={progress.lessonStars ?? {}} onStartLesson={startLesson79} scope={userScope} />
        </div>}

        {(role === "enfant" || role === "eleve") && (activeTab === "modules" || (isSchoolStudent && activeTab === "parcours")) && age !== "7-9" && <div className="dash-content">
          <div className="dash-title lms-anchor" id="lms-modules"><div><span>MON ESPACE LMS • PARCOURS GUIDÉ</span><h2>Mes modules, étape par étape</h2></div><b>{track.worlds.length} modules • {totalLessons} leçons</b></div>
          <section className="lms-sequence-note"><div><b>Progression obligatoire</b><p>Module → cours → parcours guidé → quiz → validation. Termine chaque étape pour débloquer la suivante.</p></div></section>
          <section className="course-grid">{track.worlds.map((w, wi) => { const devActive = isDevMode(); const wd = w.lessons.filter(l => progress.completed.includes(l.id)).length; const complete = wd === w.lessons.length; const unlocked = devActive || complete || wi === 0 || track.worlds[wi - 1].lessons.every(l => progress.completed.includes(l.id)); const dailyLocked = !devActive && lessonLimitReached && !complete; return <button className={`course-card ${w.color} ${unlocked && !dailyLocked ? "" : "module-locked"}`} key={w.id} disabled={!unlocked || dailyLocked} onClick={() => unlocked && !dailyLocked && setActiveWorld(w)}><div className="course-art"><img src={`/images/modules/${w.id}.png`} alt={`Illustration du module ${wi + 1} : ${w.title}`} />{(!unlocked || dailyLocked) && <span className="module-lock-overlay" aria-hidden="true"><Lock size={22} /></span>}<i>{wi + 1}</i></div><small>MODULE {wi + 1}</small><h3>{w.title}</h3><p>{dailyLocked ? "Programme du jour terminé. Reviens demain !" : unlocked ? w.description : `Termine le module ${wi} pour continuer.`}</p><div><i><b style={{ width: `${wd / w.lessons.length * 100}%` }} /></i><span>{complete ? <><Check size={13} style={{ verticalAlign: "middle" }} /> Terminé</> : dailyLocked ? <><Sunrise size={13} style={{ verticalAlign: "middle" }} /> Pause</> : unlocked ? `${wd}/${w.lessons.length}` : <><Lock size={13} style={{ verticalAlign: "middle" }} /> Verrouillé</>}</span></div></button> })}</section>
        </div>}

        {(role === "enfant" || role === "eleve") && (activeTab === "badges" || (isSchoolStudent && activeTab === "etoiles")) && <div className="dash-content">
          <div className="dash-title lms-anchor" id="lms-badges">
            <div>
              <span style={{ fontSize: '2.5rem', fontWeight: '900', display: 'block', marginBottom: '10px', color: '#173e3c', fontFamily: "'Fredoka One', 'Fredoka', cursive" }}><Trophy size={36} color="#ca8a04" style={{ verticalAlign: "middle", marginRight: 10 }} />COLLECTION</span>
              <h2>Mes badges de réussite</h2>
              <p className="badge-intro">Retrouve ici tous les pouvoirs que tu as débloqués avec Palou ! (Survole-les pour les retourner)</p>
            </div>
            <b>{(() => {
              const scopeKey = userScope.replace(/\s+/g, '_').toLowerCase();
              const perfectStreak = parseInt(localStorage.getItem(`keria_perfect_streak_${scopeKey}`) || "0", 10) || 0;
              const errorCount = parseInt(localStorage.getItem(`keria_errors_${scopeKey}`) || "0", 10) || 0;
              return computeEarnedBadges(progress.completed.length, progress.xp, progress.streak, {
                tutorialCompleted: progress.tutorialCompleted || hasSeenEvent("tuto_done", userScope),
                completedLessons: progress.completed,
                perfectStreak,
                errorCount,
                badges: progress.badges
              }).length;
            })()} badges débloqués</b>
          </div>

          {/* --- NOUVEAUX BADGES 3D FLIP --- */}
          <BadgeGrid
            badges={skillBadges.map((badge, i) => {
              const scopeKey = userScope.replace(/\s+/g, '_').toLowerCase();
              const perfectStreak = parseInt(localStorage.getItem(`keria_perfect_streak_${scopeKey}`) || "0", 10) || 0;
              const errorCount = parseInt(localStorage.getItem(`keria_errors_${scopeKey}`) || "0", 10) || 0;
              const earnedList = computeEarnedBadges(progress.completed.length, progress.xp, progress.streak, {
                tutorialCompleted: progress.tutorialCompleted || hasSeenEvent("tuto_done", userScope),
                completedLessons: progress.completed,
                perfectStreak,
                errorCount,
                badges: progress.badges
              });
              return {
                id: badge.id,
                emoji: badge.icon,
                image: badgeImage(badge.id),
                label: badge.name,
                description: badge.description,
                earned: earnedList.includes(badge.id) || (progress.badges || []).includes(badge.id)
              };
            })}
              onBadgeClick={(b) => { playPop(); playBadgeAudio(b.label + ". " + b.description); }}
              />

          <div className="dash-title" style={{ marginTop: '60px' }}>
            <div>
              <span style={{ fontSize: '2.5rem', fontWeight: '900', display: 'block', marginBottom: '10px', color: '#173e3c', fontFamily: "'Fredoka One', 'Fredoka', cursive" }}><GraduationCap size={36} color="#475569" style={{ verticalAlign: "middle", marginRight: 10 }} />DIPLÔMES</span>
              <h2>Badges de modules</h2>
              <p>Valide toutes les leçons d'un module pour obtenir son diplôme.</p>
            </div>
          </div>
          <section className="badge-row">
            {track.worlds.map((module, i) => {
              const earned = module.lessons.every(lesson => progress.completed.includes(lesson.id));
              return (
                <article className={earned ? "earned" : "locked"} key={module.id} data-kid-tooltip={earned ? `Diplôme Module ${i+1} (${module.title}) : Gagné ! Clique pour télécharger.` : `Diplôme Module ${i+1} : Valide toutes les leçons pour l'obtenir.`}>
                  <div className="badge-medal">
                    <img src={`/images/badges/badge-${i+1}.png`} alt={`Badge du module ${module.title}`}/>
                    {!earned && <span aria-hidden="true"><Lock size={18} /></span>}
                  </div>
                  <b>Module {i+1} • {module.title}</b>
                  <small>{earned ? <><Check size={13} style={{ verticalAlign: "middle", marginRight: 3 }} /> Décerné à {displayName}</> : "À débloquer"}</small>
                  {earned ? (
                    <button className="badge-download" onClick={() => void downloadPersonalizedBadge({badgeIndex: i, learner: displayName, moduleTitle: module.title, trackLabel: track.label})} aria-label={`Télécharger le badge du module ${module.title}`}>
                      <Download size={16} style={{ verticalAlign: "middle" }} /> Télécharger mon badge
                    </button>
                  ) : (
                    <span className="badge-locked-label">Valide toutes les leçons du module</span>
                  )}
                </article>
              );
            })}
          </section>
        </div>}

        {(role === "enfant" || role === "eleve") && activeTab === "classement" && <WeeklyLeaderboardView />}


        {(role === "enfant" || role === "eleve") && activeTab === "profil" && !visitorChildId && (
          <ChildProfileView
            authName={finalDisplayName}
            schoolName={school?.name ?? null}
            assignedAge={age}
            onUpdateProfile={(name, avatar) => { setProfileName(name); setAvatarId(avatar); }}
          />
        )}

        {(role === "enfant" || role === "eleve") && activeTab === "dictionnaire" && <DictionaryView />}

        {(isSchoolStudent || Boolean(school)) && activeTab === "devoirs" && <StudentAssignmentsView onReward={xp => setProgress(p => ({ ...p, xp: p.xp + xp }))} />}

        {/* Cahier de classe de l'élève d'école : accueil du jour, classe et espace libre (T9). */}
        {isSchoolStudent && activeTab === "aujourdhui" && <AujourdHuiView />}
        {isSchoolStudent && activeTab === "classe" && <MaClasseView />}
        {isSchoolStudent && activeTab === "libre" && <LibreView />}

        {syncNotice && (
          <div role="status" aria-live="polite" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 10050, maxWidth: "min(560px, calc(100vw - 32px))", background: "#fff7ed", border: "2px solid #f59e0b", color: "#7c2d12", borderRadius: 18, padding: "14px 18px", boxShadow: "0 12px 30px rgba(0,0,0,.2)", fontWeight: 700, fontSize: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ flex: 1 }}>{syncNotice}</span>
            <button type="button" onClick={() => setSyncNotice("")} style={{ border: 0, background: "#f59e0b", color: "#fff", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 15 }}>OK</button>
          </div>
        )}
      </main>

      {activeWorld && <div role="presentation" className="modal-bg" onClick={() => setActiveWorld(null)}><section className="world-modal module-guide" onClick={e => e.stopPropagation()}><button className="modal-x" onClick={() => setActiveWorld(null)}>×</button><div role="presentation" className={`modal-banner ${activeWorld.color}`}><img src={`/images/modules/${activeWorld.id}.png`} alt={`Illustration du module : ${activeWorld.title}`} /><div role="presentation"><small>MODULE • PARCOURS GUIDÉ</small><h2>{activeWorld.title}</h2><p>{activeWorld.description}</p></div></div>{(() => {
        const devActive = isDevMode(); const firstIncomplete = activeWorld.lessons.findIndex(l => !progress.completed.includes(l.id)); const nextIndex = firstIncomplete < 0 ? activeWorld.lessons.length - 1 : firstIncomplete; return <div className="lesson-list guided">{activeWorld.lessons.map((l, i) => {
          const complete = progress.completed.includes(l.id); const available = devActive || complete || i === nextIndex; const dailyLocked = !devActive && lessonLimitReached && !complete; return <div key={l.id} className={complete ? "done" : available && !dailyLocked ? "current" : "locked"}><span>{complete ? <Check size={16} /> : available && !dailyLocked ? i + 1 : <Lock size={16} />}</span><div><small>COURS {i + 1} • {l.type.toUpperCase()} • {l.minutes} MIN</small><h3>{l.title}</h3><p>{dailyLocked ? "Limite du jour atteinte" : complete ? "Cours validé" : available ? "Cours actif : parcours guidé en 7 étapes" : "Termine le cours précédent"}</p></div><b><Star size={14} color="#f59e0b" fill="#f59e0b" style={{ verticalAlign: "middle" }} /> {l.xp} XP</b><button disabled={!available || dailyLocked} onClick={() => {
            setIsLoadingLesson({ lesson: l, module: activeWorld });
            setTimeout(() => {
              setActiveLesson({ lesson: l, module: activeWorld });
              setLessonAnswer(null);
              setIsLoadingLesson(null);
            }, 350);
          }}>{complete ? "Revoir" : dailyLocked ? "Reviens demain" : available ? "Commencer le parcours guidé" : "Verrouillé"}</button></div>
        })}</div>
      })()}</section></div>}


    </div>

    {activeLesson && (
      <LessonPlayer
        age={age}
        item={activeLesson}
        learnerName={(finalDisplayName || "").trim().split(" ")[0]}
        answer={lessonAnswer}
        setAnswer={setLessonAnswer}
        onClose={() => setActiveLesson(null)}
        key={`${activeLesson.lesson.id}-${replayKey}`}
        onComplete={async (score = 100, stars?: number, then?: "map" | "next" | "replay") => {
          // Les nouvelles leçons 7-9 donnent de vraies étoiles ; les anciennes n'en donnent pas (sans-faute par défaut, comme avant).
          try {
            await completeLesson(activeLesson.lesson.id, activeLesson.lesson.xp, score, stars === undefined ? true : stars >= 3, stars);
          } finally {
            // Après l'enregistrement : « Refaire » rejoue la même leçon, « Cours suivant » ouvre la suivante du module, sinon retour à la carte.
            // Quoi qu'il arrive à l'enregistrement, l'enfant n'est jamais bloqué sur l'écran de fin.
            const lessons = activeLesson.module.lessons;
            const following = lessons[lessons.findIndex(l => l.id === activeLesson.lesson.id) + 1];
            if (age === "7-9" && then === "map") {
              // Parcours 7-9, fin d'un module : on ressort de l'île et le saut vers l'île suivante se joue tout seul sur l'archipel.
              // (« Cours suivant », et les 10 secondes de la page finale, ouvrent directement le cours suivant : voir plus bas.)
              archipelFinish(userScope);
              setActiveLesson(null);
              setLessonAnswer(null);
              if (activeTab !== "modules") router.push("/dashboard/modules");
            } else if (then === "replay" || (then === "next" && following)) {
              // Petit écran de chargement entre les deux leçons : sans lui, la suivante apparaît d'un coup, trop vite.
              setTransition({ kind: then, title: then === "replay" ? activeLesson.lesson.title : following.title });
              await new Promise(resolve => setTimeout(resolve, TRANSITION_MS));
              if (then === "replay") setReplayKey(k => k + 1);
              else setActiveLesson({ lesson: following, module: activeLesson.module });
              setLessonAnswer(null);
              setTransition(null);
            } else setActiveLesson(null);
          }
        }}
      />
    )}

    
      <ChestOverlay s={s} />
    
      <LevelPlayOverlay s={s} />

    {chatOpen && <div className="chat-panel"><header><div><b>Palou • Ami IA</b><small>{palouBusy ? "Palou réfléchit…" : "Prêt à t’aider"}</small></div><button onClick={() => setChatOpen(false)}>×</button></header><div className="chat-safety"><ShieldCheck size={15} color="#0f755f" style={{ verticalAlign: "middle", marginRight: 4 }} />Ne partage jamais ton nom complet, adresse, mot de passe ou photo privée.</div><div className="messages">{chat.map((m, i) => <div key={i} className={m.from}><p>{m.text}</p></div>)}</div><div className="chat-input"><input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && askKer()} maxLength={500} disabled={palouBusy} placeholder="Pose une question à Palou…" /><button onClick={askKer} disabled={palouBusy} aria-label="Envoyer"><Send size={16} /></button></div></div>}

    {isLoadingLesson && <LessonSkeleton />}

    {transition && <LessonTransition79 kind={transition.kind} title={transition.title} />}


    {unlockedBadge && (
      <div style={{ position: 'fixed', zIndex: 100000, inset: 0 }}>
        <BadgeUnlockAnimation badge={unlockedBadge} onClose={() => setUnlockedBadge(null)} />
      </div>
    )}
       {!activeLesson && !s.playingLevel && !isSchoolStudent && activeTab !== "programmation" && activeTab !== "code" && (
      <FamilyChatWidget viewerRole={visitorChildId ? "parent" : "enfant"} />
    )}
  </div>
}

/**
 * Lit le mode visiteur dans sessionStorage APRÈS l'hydratation (le serveur ne le connaît pas) puis, seulement si un enfant
 * est consulté, remonte la vue avec ces valeurs. Un élève ou un parent classique ne remonte jamais : même clé.
 */
export default function DashboardClient(props: Omit<ComponentProps<typeof DashboardView>, "initialVisitor">) {
  const [visitor, setVisitor] = useState<{ id: string | null; name: string | null }>({ id: null, name: null });
  useEffect(() => {
    const id = sessionStorage.getItem("visitorChildId");
    if (id) setVisitor({ id, name: sessionStorage.getItem("visitorChildName") });
  }, []);
  return <DashboardView key={visitor.id ? `visiteur-${visitor.id}` : "base"} initialVisitor={visitor} {...props} />;
}
