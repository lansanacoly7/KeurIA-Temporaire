"use client";

import { useState } from "react";
import Image from "next/image";
import { 
  Plus, User, BookOpen, CheckCircle2, X, 
  Lightbulb, Sparkles, MessageSquare, 
  Compass, ArrowRight, ShieldCheck, RefreshCw, ChevronRight,
  Smile, Eye
} from "lucide-react";
import { tracks } from "../lms-data";
import { useParentDashboard } from "./useParentDashboard";
import { getAllLearnedDinnerTopics } from "./dinnerQuestions";
import { AddChildWizardModal } from "./components/AddChildWizardModal";

// Questions pour engager le dialogue en famille
const DISCUSSION_TOPICS = [
  {
    question: "Comment une machine peut-elle distinguer un chat d'un chien sans avoir de vrais yeux ?",
    hint: "Elle compare des milliers d'exemples et cherche des caractéristiques récurrentes : forme des oreilles, moustaches, contour du museau."
  },
  {
    question: "Est-ce qu'une intelligence artificielle pense et ressent des émotions comme un être humain ?",
    hint: "Non. C'est un programme qui calcule des probabilités très rapidement, sans conscience, sans sentiment ni bon sens."
  },
  {
    question: "Pourquoi est-il important de ne pas partager son nom de famille ou son école sur une application ?",
    hint: "Pour préserver sa vie privée et éviter que des données personnelles soient enregistrées ou partagées à notre insu."
  },
  {
    question: "Quand un algorithme donne une réponse fausse ou injuste, qui en porte la responsabilité ?",
    hint: "Les concepteurs humains et la qualité des données utilisées pour entraîner la machine."
  },
  {
    question: "Si tu pouvais inventer une assistance numérique utile pour la maison ou la ville, que ferait-elle ?",
    hint: "Laissez votre enfant imaginer : tri automatique, arrosage écologique ou assistant de devoirs bienveillant."
  }
];

// Fiches d'accompagnement éducatives
const PARENT_TIPS = [
  {
    id: "recette",
    icon: BookOpen,
    title: "La métaphore de la recette : comprendre un algorithme",
    summary: "Une explication claire en quelques phrases simples sans jargon technique.",
    content: "Un algorithme s'apparente à une recette de cuisine : une suite ordonnée d'instructions précises. Si les étapes sont inversées, le résultat n'est pas celui attendu. En apprenant la programmation sur kEur IA, votre enfant structure son raisonnement logique pas à pas."
  },
  {
    id: "aide",
    icon: Lightbulb,
    title: "Accompagner sans faire à la place de l'enfant",
    summary: "Comment réagir de façon constructive face à une difficulté dans un atelier.",
    content: "L'erreur fait partie intégrante de l'apprentissage en informatique. Posez des questions ouvertes : 'Que cherchait à faire Palou ?', 'À quel moment le mouvement s'est-il arrêté ?'. Cette approche renforce l'autonomie et la satisfaction de réussir par soi-même."
  },
  {
    id: "ecran",
    icon: ShieldCheck,
    title: "Écrans actifs et rythme familial serein",
    summary: "Repères pratiques pour instaurer un usage apaisé des technologies.",
    content: "Privilégiez les temps d'écran actifs (création, réflexion, code) au détriment du défilement passif de vidéos. Définissez une règle simple à l'avance (ex. une mission par séance) et préservez l'heure qui précède le sommeil sans écran."
  }
];

function getChildAdventure(lastLessonId: string | null) {
  if (lastLessonId) {
    for (const ageKey in tracks) {
      for (const world of tracks[ageKey as keyof typeof tracks].worlds) {
        for (const lesson of world.lessons) {
          if (lesson.id === lastLessonId) {
            return {
              moduleId: world.id,
              worldTitle: world.title,
              lessonTitle: lesson.title,
              description: world.description,
              image: `/images/modules/${world.id}.png`,
              status: "Mission en cours"
            };
          }
        }
      }
    }
  }
  return {
    moduleId: "p1",
    worldTitle: "Bonjour, l'IA !",
    lessonTitle: "Premiers pas avec Palou",
    description: "Découverte des bases de l'intelligence artificielle et de la logique.",
    image: "/images/modules/p1.png",
    status: "Prêt à commencer"
  };
}

interface ParentDashboardViewProps {
  userName: string;
  onNavigateTab?: (tab: string) => void;
  onVisitChild?: (id: number, name: string) => void;
}

export function ParentDashboardView({ userName, onNavigateTab, onVisitChild }: ParentDashboardViewProps) {
  const { 
    children, isLoading, setIsLoading, showAddChild, setShowAddChild, 
    showSynthesisModal, setShowSynthesisModal,
    loadError,
    createdChildSuccess, setCreatedChildSuccess, fetchChildren 
  } = useParentDashboard({ userName });

  // Sujets d'échange du soir basés STRICTEMENT sur les leçons apprises par les enfants
  const learnedTopics = children.length > 0
    ? children.flatMap((c) => 
        getAllLearnedDinnerTopics({
          displayName: c.displayName,
          totalLessons: c.todayUsage?.lessons || c.completedLessons?.length || 0,
          lastLesson: c.lastLesson,
          completedLessons: c.completedLessons
        }).map(t => ({ ...t, childName: c.displayName }))
      )
    : [
        {
          lessonId: "start",
          lessonTitle: "Première découverte",
          moduleTitle: "En route vers le monde numérique",
          concept: "Premiers pas avec Palou",
          childName: "Votre enfant",
          question: "Aujourd'hui, tu as fait la rencontre de Palou ! À ton avis, c'est quoi exactement : un vrai robot, un animal magique ou un outil programmé par des humains ?",
          hint: "L'aider à comprendre que les personnages et IA à l'écran sont créés par des humains pour lui apprendre la logique."
        }
      ];

  const [topicIndex, setTopicIndex] = useState(0);
  const [selectedTip, setSelectedTip] = useState<typeof PARENT_TIPS[0] | null>(null);

  const nextTopic = () => {
    setTopicIndex((prev) => (prev + 1) % learnedTopics.length);
  };

  const currentTopic = learnedTopics[topicIndex % learnedTopics.length];

  return (
    <div style={{ padding: "0", color: "#173E3C", maxWidth: 1040, margin: "0 auto", fontSize: 13, boxSizing: "border-box" }}>
      <style>{`
        .p-hero {
          background: linear-gradient(135deg, #0e3d32 0%, #165646 60%, #1a6351 100%);
          border-radius: 20px;
          padding: 22px 28px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 28px;
          box-shadow: 0 6px 20px rgba(14, 61, 50, 0.12);
        }
        .p-btn-pri {
          background: #D9EF59;
          color: #0E3B33;
          border: none;
          border-radius: 99px;
          padding: 8px 16px;
          font-weight: 800;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: transform 0.15s, background 0.15s;
          white-space: nowrap;
          height: 36px;
          box-sizing: border-box;
        }
        .p-btn-pri:hover {
          background: #e4f578;
          transform: translateY(-1px);
        }
        .p-btn-sec {
          background: rgba(255, 255, 255, 0.14);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 99px;
          padding: 8px 15px;
          font-weight: 700;
          font-size: 12.5px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          white-space: nowrap;
          height: 36px;
          box-sizing: border-box;
          transition: background 0.15s;
        }
        .p-btn-sec:hover {
          background: rgba(255, 255, 255, 0.22);
        }
        .p-card {
          background: white;
          border-radius: 18px;
          border: 1px solid #E5EBE5;
          box-shadow: 0 2px 10px rgba(15, 62, 54, 0.03);
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .p-card:hover {
          border-color: #CBD8CE;
          box-shadow: 0 6px 20px rgba(15, 62, 54, 0.06);
        }
        .p-passport-card {
          background: white;
          border-radius: 20px;
          border: 1px solid #E2EAE3;
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
          box-shadow: 0 3px 12px rgba(23, 62, 60, 0.04);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .p-passport-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(23, 62, 60, 0.08);
          border-color: #CBD8CE;
        }
        .p-action-btn {
          height: 38px;
          width: 100%;
          border-radius: 10px;
          background: #0F766E;
          color: white;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
          white-space: nowrap;
          box-sizing: border-box;
        }
        .p-action-btn:hover {
          background: #0d655e;
          transform: translateY(-1px);
        }
        @media (max-width: 820px) {
          .p-hero { flex-direction: column; align-items: stretch; padding: 20px 18px; gap: 14px; margin-bottom: 20px; }
          .p-hero-art { display: none !important; }
          .p-grid-2col { grid-template-columns: 1fr !important; gap: 18px !important; margin-bottom: 24px !important; }
          .p-child-grid { grid-template-columns: 1fr !important; gap: 18px !important; }
          .p-tips-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
          .p-passport-card { padding: 20px 18px !important; }
          .p-card { padding: 20px 18px !important; }
        }
      `}</style>

      {/* ─── BANDEAU D'ACCUEIL SOBRE ET AÉRÉ ─────────────────────────────── */}
      <section className="p-hero">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#D9EF59", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
            <Compass size={13} /> Espace Famille
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em", color: "white" }}>
            Bonjour {userName}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#D1E2D7", lineHeight: 1.5, maxWidth: 540 }}>
            Retrouvez le parcours de vos enfants, les notions découvertes et des pistes simples pour échanger avec eux au quotidien.
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button 
              onClick={() => setShowAddChild(true)}
              className="p-btn-pri"
            >
              <Plus size={15} /> Inscrire un enfant
            </button>
            {children.length > 0 && (
              <button 
                onClick={() => setShowSynthesisModal(true)}
                className="p-btn-sec"
              >
                <Sparkles size={14} color="#D9EF59" /> Le Mot de Palou
              </button>
            )}
          </div>
        </div>

        <div className="p-hero-art" style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img 
            src="/images/palou/Palou_Gentil.png" 
            alt="Palou" 
            style={{ width: 92, height: 92, objectFit: "contain", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.22))" }}
          />
        </div>
      </section>

      {/* ─── ÉTAT : CHARGEMENT OU ERREUR ────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "#6A827E" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #E2ECE5", borderTopColor: "#0F766E", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>Chargement des données du foyer…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : loadError ? (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 16, padding: "20px", color: "#991B1B", textAlign: "center", marginBottom: 28 }}>
          <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 13 }}>{loadError}</p>
          <button
            type="button"
            onClick={() => { setIsLoading(true); void fetchChildren(); }}
            className="p-btn-pri"
            style={{ background: "#991B1B", color: "white", margin: "0 auto" }}
          >
            Réessayer
          </button>
        </div>
      ) : children.length === 0 ? (
        /* ÉTAT VIDE */
        <div className="p-card" style={{ padding: "48px 24px", textAlign: "center", margin: "16px 0" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EEF7F2", color: "#0F766E", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Smile size={28} />
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "#143C37" }}>
            Aucun enfant inscrit pour le moment
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#546E6A", maxWidth: 420, marginInline: "auto", lineHeight: 1.5 }}>
            Créez un profil pour votre enfant en quelques clics pour lui donner accès à son parcours éducatif sans publicité.
          </p>
          <button 
            onClick={() => setShowAddChild(true)}
            className="p-btn-pri"
          >
            <Plus size={16} /> Inscrire mon enfant
          </button>
        </div>
      ) : (
        /* CONTENU DU FOYER */
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

          {/* ─── 1. SECTION VIVANTE : LES CARNETS D'EXPLORATION PAR ENFANT ──── */}
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#143C37", display: "flex", alignItems: "center", gap: 8 }}>
                  <Compass size={18} color="#0F766E" /> Explorateurs du foyer ({children.length})
                </h2>
              </div>
              <button 
                onClick={() => setShowAddChild(true)}
                style={{ background: "transparent", border: "1px dashed #A8C4B5", color: "#0F766E", borderRadius: 99, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
              >
                <Plus size={14} /> Ajouter un enfant
              </button>
            </div>

            <div className="p-child-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: 22 }}>
              {children.map((child, idx) => {
                const adv = getChildAdventure(child.lastLesson);
                const colors = [
                  { accent: "#0F766E", bgLight: "#F0F8F4", border: "#CFE3D8" },
                  { accent: "#1D4ED8", bgLight: "#F0F5FF", border: "#D0DFFE" },
                  { accent: "#7E22CE", bgLight: "#FAF5FF", border: "#E9D5FF" },
                ];
                const theme = colors[idx % colors.length];

                return (
                  <div key={child.id} className="p-passport-card">
                    
                    {/* HAUT DE CARTE : IDENTITÉ & NIVEAU */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: theme.bgLight, color: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, border: `1.5px solid ${theme.border}`, flexShrink: 0 }}>
                          {child.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#143C37", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {child.displayName}
                          </h3>
                          <span style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600, display: "block", marginTop: 2 }}>
                            Niveau {child.level.level} • {child.completedLessons.length} activités
                          </span>
                        </div>
                      </div>

                      <span style={{ background: theme.bgLight, color: theme.accent, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 800, border: `1px solid ${theme.border}`, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {adv.status}
                      </span>
                    </div>

                    {/* VIGNETTE DU MONDE EN COURS AVEC IMAGE OFFICIELLE ET VRAI ESPACEMENT */}
                    <div style={{ display: "flex", gap: 14, alignItems: "center", background: "#FAFBF9", padding: "14px 16px", borderRadius: 14, border: "1px solid #E8EFE8", boxSizing: "border-box", margin: "4px 0" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", background: "#E2ECE5", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img 
                          src={adv.image} 
                          alt={adv.worldTitle}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/images/modules/p1.png";
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
                          MODULE EN COURS
                        </span>
                        <p style={{ margin: "2px 0 2px", fontSize: 14, fontWeight: 800, color: "#143C37", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {adv.worldTitle}
                        </p>
                        {adv.lessonTitle && adv.lessonTitle !== adv.worldTitle && (
                          <p style={{ margin: 0, fontSize: 11.5, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {adv.lessonTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* NOTIONS TRAVAILLÉES (TAGS ÉPURÉS ET DISCRETS) */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", margin: "2px 0 6px" }}>
                      <span style={{ fontSize: 11, color: "#64748B", fontWeight: 700, marginRight: 2 }}>Notions :</span>
                      <span style={{ background: "#F1F6F3", color: "#1B4D45", border: "1px solid #D8E7DF", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                        Logique
                      </span>
                      <span style={{ background: "#F1F6F3", color: "#1B4D45", border: "1px solid #D8E7DF", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                        Curiosité IA
                      </span>
                      <span style={{ background: "#F1F6F3", color: "#1B4D45", border: "1px solid #D8E7DF", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                        Esprit critique
                      </span>
                    </div>

                    {/* ACTIONS ÉLÉGANTES ET BIEN PROPORTIONNÉES (FIN DES BLOCS DÉFORMÉS) */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 6, borderTop: "1px solid #F1F5F9" }}>
                      {onVisitChild && (
                        <button 
                          onClick={() => onVisitChild(child.id, child.displayName)}
                          className="p-action-btn"
                        >
                          <Eye size={15} /> Consulter son univers
                        </button>
                      )}

                      {onNavigateTab && (
                        <button 
                          onClick={() => onNavigateTab("children")}
                          style={{
                            background: "transparent",
                            color: "#0F766E",
                            border: "none",
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: "4px 8px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                            transition: "color 0.15s"
                          }}
                        >
                          Voir la fiche détaillée <ArrowRight size={13} />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </section>

          {/* ─── 2. DIALOGUE EN FAMILLE & CONSEIL DE PALOU ─────────────────────── */}
          <section className="p-grid-2col" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 22, alignItems: "stretch" }}>
            
            {/* CARTE : SUJET DE DISCUSSION DU SOIR (BASÉ SUR LES LEÇONS APPRISES) */}
            <div className="p-card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#0F766E", background: "#D1FAE5", padding: "3px 10px", borderRadius: 99 }}>
                    <CheckCircle2 size={13} color="#059669" /> {currentTopic.childName ? `${currentTopic.childName} • ` : ""}Atelier : {currentTopic.lessonTitle}
                  </span>
                  {learnedTopics.length > 1 && (
                    <button 
                      onClick={nextTopic}
                      type="button"
                      style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", color: "#1E293B", borderRadius: 8, padding: "4px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
                    >
                      <RefreshCw size={11} /> Autre sujet ({topicIndex + 1}/{learnedTopics.length})
                    </button>
                  )}
                </div>

                <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#143C37", lineHeight: 1.45 }}>
                  « {currentTopic.question} »
                </p>

                <p style={{ margin: 0, fontSize: 12.5, color: "#546E6A", lineHeight: 1.55 }}>
                  <b style={{ color: "#0F766E" }}>Repère pour échanger : </b>
                  {currentTopic.hint}
                </p>
              </div>

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dashed #E5EDE7", fontSize: 11, color: "#7A928D", display: "flex", justifyContent: "space-between" }}>
                <span>Inspiré des découvertes réelles avec Palou</span>
                <span>{topicIndex + 1} / {learnedTopics.length}</span>
              </div>
            </div>

            {/* CARTE : LE BILLET DE PALOU (SANS STATISTIQUES LOURDES) */}
            <div className="p-card" style={{ padding: "24px 26px", display: "flex", gap: 16, alignItems: "flex-start", background: "#FAFBF8" }}>
              <img 
                src="/images/palou/Palou_Intelligent.png" 
                alt="Palou conseil" 
                style={{ width: 58, height: 58, objectFit: "contain", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
                  Le Billet de Palou
                </span>
                <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#143C37", lineHeight: 1.4 }}>
                  Encouragez les initiatives créatives de vos enfants !
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#5A726D", lineHeight: 1.5 }}>
                  Dans l'atelier de code, tester une hypothèse et se tromper est la clé de la méthode scientifique. Félicitez leur persévérance lorsqu'ils trouvent la solution par eux-mêmes.
                </p>
              </div>
            </div>

          </section>

          {/* ─── 3. FICHES PRATIQUES : COMPRENDRE L'IA EN 2 MINUTES ───────────── */}
          <section>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#143C37", display: "flex", alignItems: "center", gap: 7 }}>
                <Lightbulb size={17} color="#0F766E" /> Repères éducatifs pour les parents
              </h2>
            </div>

            <div className="p-tips-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 18 }}>
              {PARENT_TIPS.map((tip) => {
                const IconComponent = tip.icon;
                return (
                  <div 
                    key={tip.id}
                    onClick={() => setSelectedTip(tip)}
                    className="p-card"
                    style={{ padding: "18px 20px", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                  >
                    <div>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "#EEF7F2", color: "#0F766E", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                        <IconComponent size={16} />
                      </div>
                      <h3 style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 800, color: "#143C37", lineHeight: 1.35 }}>
                        {tip.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: 12, color: "#64748B", lineHeight: 1.45 }}>
                        {tip.summary}
                      </p>
                    </div>

                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#0F766E", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 14 }}>
                      Lire la fiche <ChevronRight size={13} />
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      )}

      {/* ─── MODAL : LECTURE D'UNE FICHE CONSEIL ─────────────────────────────── */}
      {selectedTip && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(14, 45, 38, 0.45)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="p-card" style={{ maxWidth: 480, width: "100%", padding: "26px 28px", position: "relative", borderRadius: 20 }}>
            <button 
              onClick={() => setSelectedTip(null)}
              aria-label="Fermer"
              style={{ position: "absolute", top: 16, right: 16, background: "#EEF5F1", border: "none", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#173E3C" }}
            >
              <X size={15} />
            </button>
            <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800, color: "#143C37", lineHeight: 1.3 }}>
              {selectedTip.title}
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "#3B5551", lineHeight: 1.6 }}>
              {selectedTip.content}
            </p>
            <button
              onClick={() => setSelectedTip(null)}
              className="p-btn-pri"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Compris
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL : SYNTHÈSE / LE MOT DE PALOU ──────────────────────────────── */}
      {showSynthesisModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(14, 45, 38, 0.5)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="p-card" style={{ maxWidth: 520, width: "100%", padding: "28px", position: "relative", borderRadius: 22, maxHeight: "90vh", overflowY: "auto" }}>
            <button 
              onClick={() => setShowSynthesisModal(false)}
              aria-label="Fermer"
              style={{ position: "absolute", top: 16, right: 16, background: "#EEF5F1", border: "none", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#173E3C" }}
            >
              <X size={15} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <img src="/images/palou/Palou_Celebration.png" alt="Palou félicitations" style={{ width: 50, height: 50, objectFit: "contain" }} />
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#143C37" }}>
                  Le Mot de Palou
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#647E79" }}>
                  Les réussites de vos enfants sur kEur IA
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {children.map((child) => (
                <div key={child.id} style={{ background: "#F9FAF7", border: "1px solid #E5EBE5", borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#143C37" }}>{child.displayName}</span>
                    <span style={{ background: "#DCFCE7", color: "#166534", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
                      Niveau {child.level.level}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#4E6964", lineHeight: 1.45 }}>
                    {child.completedLessons.length > 0 
                      ? `${child.displayName} a validé ${child.completedLessons.length} leçons avec brio. Son parcours progresse régulièrement.`
                      : `${child.displayName} est prêt à démarrer sa première découverte de l'IA avec Palou.`}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowSynthesisModal(false)}
              className="p-btn-pri"
              style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL : INSCRIRE UN ENFANT (WIZARD MULTI-ÉTAPES) ───────────────── */}
      <AddChildWizardModal
        isOpen={showAddChild}
        onClose={() => setShowAddChild(false)}
        onSuccess={(child) => setCreatedChildSuccess(child)}
        onChildAdded={fetchChildren}
      />

      {/* ─── MODAL SUCCÈS IDENTIFIANTS ────────────────────────────────────────── */}
      {createdChildSuccess && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(14, 45, 38, 0.55)", backdropFilter: "blur(4px)", padding: 16 }}>
          <div className="p-card" style={{ maxWidth: 440, width: "100%", padding: "26px", textAlign: "center", borderRadius: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#DCFCE7", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <CheckCircle2 size={30} />
            </div>
            
            <h3 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 900, color: "#143C37" }}>
              Compte créé pour {createdChildSuccess.displayName}
            </h3>
            
            <p style={{ margin: "0 0 16px", color: "#546E6A", fontSize: 12.5, lineHeight: 1.45 }}>
              Voici les identifiants pour connecter votre enfant à son espace :
            </p>

            <div style={{ background: "#F8FAF7", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px", textAlign: "left", marginBottom: 18 }}>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Identifiant :</span>
                <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 800, color: "#0F766E", fontFamily: "monospace" }}>
                  {createdChildSuccess.login}
                </p>
              </div>
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Mot de passe :</span>
                <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 800, color: "#143C37", fontFamily: "monospace" }}>
                  {createdChildSuccess.password}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCreatedChildSuccess(null)}
              className="p-btn-pri"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
