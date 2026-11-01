"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  FileCode2,
  GraduationCap,
  HelpCircle,
  Info,
  Lightbulb,
  Printer,
  Rocket,
  Send,
  Sparkles,
  Target,
  ThumbsUp,
  Trophy,
} from "lucide-react";
import { getLessonSheet } from "@/app/_scolaire/lib/programmeApi";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { Badge, ErrorMessage, Skeleton } from "@/app/_scolaire/ui/ui";
import { useCallback, useState } from "react";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function LessonSheetPage() {
  const { lessonId } = useParams() as { lessonId: string };
  const load = useCallback(() => getLessonSheet(lessonId), [lessonId]);
  const { data: sheet, error } = useApi(load);
  const [feedback, setFeedback] = useState<string | null>(() => {
    if (typeof window !== "undefined" && lessonId) {
      try {
        return localStorage.getItem(`keuria_feedback_${lessonId}`);
      } catch {
        return null;
      }
    }
    return null;
  });

  const handleFeedback = (type: "helped" | "unclear") => {
    setFeedback(type);
    if (typeof window !== "undefined" && lessonId) {
      try {
        localStorage.setItem(`keuria_feedback_${lessonId}`, type);
      } catch { /* stockage local indisponible (navigation privée) : le suivi local est facultatif */ }
    }
  };

  if (error) return (
    <>
      <Link href="/enseignant/programme" className="ec-back ec-prog-hide-print">
        <ArrowLeft size={16} aria-hidden="true" /> Programme
      </Link>
      <ErrorMessage message={error} />
    </>
  );

  if (!sheet) return (
    <>
      <Link href="/enseignant/programme" className="ec-back ec-prog-hide-print">
        <ArrowLeft size={16} aria-hidden="true" /> Programme
      </Link>
      <Skeleton height={600} />
    </>
  );

  return (
    <div className="ec-prog-sheet">
      {/* ─── EN-TÊTE ÉPURÉ ET ACTIONS ─── */}
      <div className="ec-prog-hide-print">
        <Link href="/enseignant/programme" className="ec-back" style={{ marginBottom: 12 }}>
          <ArrowLeft size={16} aria-hidden="true" /> Retour au programme
        </Link>

        <div className="ec-prog-sheet-hero">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                <Badge tone="info">{sheet.track.label}</Badge>
                <span style={{ color: "var(--ec-muted)", fontSize: 13 }}>
                  Module {sheet.module.order} : {sheet.module.title}
                </span>
                <span style={{ background: "var(--ec-brand-soft)", color: "var(--ec-brand)", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                  Leçon {sheet.order}
                </span>
              </div>
              <h1 style={{ margin: "0 0 14px", fontSize: 24, fontWeight: 800, color: "var(--ec-ink-deep)", lineHeight: 1.3 }}>
                {sheet.title}
              </h1>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {sheet.homework.lessonMissionId && (
                  <Link
                    href={`/enseignant/missions?mission=${sheet.homework.lessonMissionId}`}
                    className="ec-btn ec-btn--primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    <Send size={16} aria-hidden="true" /> Donner le devoir de cette leçon
                  </Link>
                )}
                {sheet.homework.reviewMissionId && (
                  <Link
                    href={`/enseignant/missions?mission=${sheet.homework.reviewMissionId}`}
                    className="ec-btn"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    <Award size={16} aria-hidden="true" /> Donner le bilan du module
                  </Link>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="ec-btn"
                onClick={() => window.print()}
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <Printer size={16} aria-hidden="true" /> Imprimer la fiche
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 1 : AVANT LE COURS (PRÉPARATION PÉDAGOGIQUE) ─── */}
      <section className="ec-prog-sheet-section" aria-labelledby="section-avant-cours">
        <div className="ec-prog-sheet-section-title">
          <div className="ec-prog-section-header-left">
            <div className="ec-prog-section-icon">
              <GraduationCap size={18} aria-hidden="true" />
            </div>
            <h2 id="section-avant-cours" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ec-ink)" }}>
              1. Avant le cours
            </h2>
          </div>
          <Badge tone="neutral">Préparation enseignant</Badge>
        </div>

        {/* Essentiel à retenir */}
        <div className="ec-prog-block-card">
          <h4>
            <CheckCircle2 size={16} aria-hidden="true" style={{ color: "var(--ec-brand)" }} />
            L&apos;essentiel à retenir
          </h4>
          <ul>
            {sheet.guide.essential.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Comment l'expliquer simplement */}
        {sheet.guide.source !== "auto" && sheet.guide.explain && (
          <div className="ec-prog-block-card">
            <h4>
              <Lightbulb size={16} aria-hidden="true" style={{ color: "var(--ec-brand)" }} />
              Comment l&apos;expliquer simplement
            </h4>
            <p>{sheet.guide.explain}</p>
          </div>
        )}

        {/* Activité débranchée (sans écran) */}
        {sheet.guide.unplugged && (
          <div className="ec-prog-block-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <h4 style={{ margin: 0 }}>
                <Clock size={16} aria-hidden="true" style={{ color: "var(--ec-brand)" }} />
                Activité sans ordinateur : {sheet.guide.unplugged.title} ({sheet.guide.unplugged.minutes} min)
              </h4>
              <Badge tone="info">Débranchée</Badge>
            </div>

            {sheet.guide.unplugged.materials.length > 0 && (
              <div style={{ marginBottom: 10, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <strong style={{ fontSize: 13, color: "var(--ec-muted)", marginRight: 4 }}>Matériel :</strong>
                {sheet.guide.unplugged.materials.map((mat, i) => (
                  <span key={i} style={{ background: "var(--ec-bg)", border: "1px solid var(--ec-line)", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                    {mat}
                  </span>
                ))}
              </div>
            )}

            <ol>
              {sheet.guide.unplugged.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Questions à poser aux élèves */}
        {sheet.guide.askThem.length > 0 && (
          <div className="ec-prog-block-card">
            <h4>
              <HelpCircle size={16} aria-hidden="true" style={{ color: "var(--ec-brand)" }} />
              Questions stimulantes à poser aux élèves
            </h4>
            <ul>
              {sheet.guide.askThem.map((q, i) => (
                <li key={i}>« {q} »</li>
              ))}
            </ul>
          </div>
        )}

        {/* Erreurs fréquentes (gardé en ambre doux fonctionnel) */}
        {sheet.guide.commonMistakes.length > 0 && (
          <div className="ec-prog-card-mistakes">
            <h4>
              <AlertTriangle size={16} aria-hidden="true" style={{ color: "#d97706" }} />
              Erreurs fréquentes à anticiper
            </h4>
            <ul>
              {sheet.guide.commonMistakes.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ─── SECTION 2 : CE QUE LES ÉLÈVES VOIENT (CONTENU DU COURS) ─── */}
      <section className="ec-prog-sheet-section" aria-labelledby="section-eleves-voient">
        <div className="ec-prog-sheet-section-title">
          <div className="ec-prog-section-header-left">
            <div className="ec-prog-section-icon">
              <Compass size={18} aria-hidden="true" />
            </div>
            <h2 id="section-eleves-voient" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ec-ink)" }}>
              2. Ce que les élèves voient
            </h2>
          </div>
          <Badge tone="neutral">Immersion élève</Badge>
        </div>

        {/* Bannière Mission claire */}
        <div className="ec-prog-card-mission">
          <div className="ec-prog-card-mission-tag">
            <Rocket size={12} aria-hidden="true" /> Mission élève
          </div>
          <p>{sheet.sheet.mission}</p>
        </div>

        {/* Objectifs */}
        <div className="ec-prog-block-card">
          <h4>
            <Target size={16} aria-hidden="true" style={{ color: "var(--ec-brand)" }} />
            Objectifs d&apos;apprentissage
          </h4>
          <ul>
            {sheet.sheet.objectives.map((obj, i) => (
              <li key={i}>{obj}</li>
            ))}
          </ul>
        </div>

        {/* Découverte & Exemple en 2 colonnes */}
        <div className="ec-prog-grid-2">
          <div className="ec-prog-block-card" style={{ marginBottom: 0 }}>
            <h4>
              <Sparkles size={16} aria-hidden="true" style={{ color: "var(--ec-brand)" }} />
              Découverte
            </h4>
            <p>{sheet.sheet.discover}</p>
          </div>

          <div className="ec-prog-block-card" style={{ marginBottom: 0 }}>
            <h4>
              <FileCode2 size={16} aria-hidden="true" style={{ color: "var(--ec-brand)" }} />
              Exemple concret
            </h4>
            <p>{sheet.sheet.example}</p>
          </div>
        </div>

        {/* À retenir */}
        <div className="ec-prog-block-card">
          <h4>
            <Bookmark size={16} aria-hidden="true" style={{ color: "var(--ec-brand)" }} />
            À retenir
          </h4>
          <ul>
            {sheet.sheet.remember.map((rem, i) => (
              <li key={i}>{rem}</li>
            ))}
          </ul>
        </div>

        {/* Vocabulaire clé */}
        {sheet.sheet.vocabulary.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, margin: "0 0 10px", color: "var(--ec-ink)" }}>
              <BookOpen size={16} aria-hidden="true" style={{ color: "var(--ec-brand)" }} />
              Vocabulaire clé ({sheet.sheet.vocabulary.length} termes)
            </h4>
            <div className="ec-prog-vocab">
              {sheet.sheet.vocabulary.map((v, i) => (
                <div key={i} className="ec-prog-vocab-item">
                  <strong>{v.term}</strong>
                  <span>{v.definition}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leur défi */}
        <div className="ec-prog-block-card" style={{ borderLeft: "3px solid var(--ec-brand)" }}>
          <h4>
            <Trophy size={16} aria-hidden="true" style={{ color: "var(--ec-brand)" }} />
            Leur défi
          </h4>
          <p>{sheet.sheet.challenge}</p>
        </div>
      </section>

      {/* ─── SECTION 3 : CORRECTION ET QUIZ ─── */}
      <section className="ec-prog-sheet-section" aria-labelledby="section-correction">
        <div className="ec-prog-sheet-section-title">
          <div className="ec-prog-section-header-left">
            <div className="ec-prog-section-icon">
              <CheckCircle2 size={18} aria-hidden="true" />
            </div>
            <h2 id="section-correction" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ec-ink)" }}>
              3. Correction &amp; Questions du quiz
            </h2>
          </div>
          <Badge tone="ok">{sheet.sheet.questions.length} questions avec corrigé</Badge>
        </div>

        {sheet.sheet.questions.map((q, i) => (
          <div key={i} className="ec-prog-question">
            <div className="ec-prog-question-header">
              <span className="ec-prog-q-badge">Question {i + 1}</span>
              <p className="ec-prog-q-title">{q.question}</p>
            </div>

            <div className="ec-prog-options-list">
              {q.options.map((opt, j) => {
                const isCorrect = j === q.correct;
                const letter = OPTION_LETTERS[j] || `${j + 1}`;
                return (
                  <div key={j} className={`ec-prog-option ${isCorrect ? "is-correct" : ""}`}>
                    <div className="ec-prog-option-left">
                      <span className="ec-prog-opt-letter">{letter}</span>
                      <span className="ec-prog-opt-text">{opt}</span>
                    </div>
                    {isCorrect && (
                      <span className="ec-prog-correct-badge">
                        <CheckCircle2 size={14} aria-hidden="true" /> Bonne réponse
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {q.explain && (
              <div className="ec-prog-explain">
                <Info size={16} className="ec-prog-explain-icon" aria-hidden="true" />
                <div>
                  <strong style={{ display: "block", marginBottom: 2 }}>Explication pédagogique :</strong>
                  <span>{q.explain}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* ─── RETOUR D'EXPÉRIENCE ─── */}
      <div className="ec-prog-sheet-section ec-prog-hide-print" style={{ textAlign: "center", padding: "20px 16px" }}>
        <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 15, color: "var(--ec-ink)" }}>
          Cette fiche vous a-t-elle été utile pour préparer votre cours ?
        </p>
        {feedback ? (
          <div style={{ color: "var(--ec-brand)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14 }}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>Merci pour votre retour ! Votre avis nous aide à améliorer les fiches de cours.</span>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="ec-btn"
              onClick={() => handleFeedback("helped")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <ThumbsUp size={16} aria-hidden="true" /> Cette fiche m&apos;a aidé
            </button>
            <button
              type="button"
              className="ec-btn"
              onClick={() => handleFeedback("unclear")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <HelpCircle size={16} aria-hidden="true" /> Cette fiche n&apos;est pas claire
            </button>
          </div>
        )}
      </div>

      {/* ─── NAVIGATION LEÇON PRÉCÉDENTE / SUIVANTE ─── */}
      <div className="ec-prog-hide-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginTop: 4 }}>
        {sheet.previous ? (
          <Link
            href={`/enseignant/programme/${sheet.previous.id}`}
            className="ec-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span>Leçon précédente : <strong>{sheet.previous.title}</strong></span>
          </Link>
        ) : <div />}
        {sheet.next ? (
          <Link
            href={`/enseignant/programme/${sheet.next.id}`}
            className="ec-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <span>Leçon suivante : <strong>{sheet.next.title}</strong></span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : <div />}
      </div>
    </div>
  );
}
