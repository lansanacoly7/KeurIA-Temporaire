"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, ChevronUp, Clock, Compass, Copy, Monitor, Pencil, Plus, Search, Sparkles, Star, Trash2, Zap } from "lucide-react";
import { plural } from "@/app/_scolaire/lib/format";
import { deleteStudioLesson, duplicateStudioLesson, listStudioTracks, reorderStudioLesson, type StudioLesson, type StudioModule, type StudioTrack } from "@/app/_scolaire/lib/curriculumStudioApi";
import { Badge, ConfirmModal, EmptyState, ErrorMessage, Notice, PageHeader, Skeleton } from "@/app/_scolaire/ui/ui";
import { ModuleIcon } from "@/app/components/ModuleIcon";
import { LESSON_TYPES } from "./StudioShared";
import { ComputerPreviewModal } from "./StudioComputerPreview";
import { LessonEditorModal, ModuleModal } from "./StudioEditors";

/* ─── Vue Principale du Studio de Contenus ───────────────────────────────── */
export function StudioAdminView() {
  const [tracks, setTracks] = useState<StudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTrackKey, setSelectedTrackKey] = useState<string>("7-9");
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Recherche & Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [editingModule, setEditingModule] = useState<{ mode: "create" | "edit"; module?: StudioModule } | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | "new" | null>(null);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<StudioLesson | null>(null);

  const [notice, setNotice] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const data = await listStudioTracks();
      setTracks(data);
      if (data.length > 0) {
        const currentTrack = data.find(t => t.key === selectedTrackKey) || data[0];
        setSelectedTrackKey(currentTrack.key);
        if (currentTrack.worlds.length > 0 && !selectedModuleId) {
          setSelectedModuleId(currentTrack.worlds[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des parcours.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeTrack = tracks.find(t => t.key === selectedTrackKey) || tracks[0];
  const activeModule = activeTrack?.worlds.find(w => w.id === selectedModuleId) || activeTrack?.worlds[0];

  // Filtrage des leçons par recherche et format
  const filteredLessons = (activeModule?.lessons || []).filter(l => {
    const matchSearch = !searchQuery.trim() || 
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      l.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === "all" || l.type === typeFilter;
    return matchSearch && matchType;
  });

  async function handleDeleteLesson(lesson: StudioLesson) {
    try {
      await deleteStudioLesson(lesson.id);
      setNotice(`La leçon « ${lesson.title} » a été supprimée.`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setDeletingLesson(null);
    }
  }

  async function handleReorder(lesson: StudioLesson, direction: "up" | "down") {
    try {
      await reorderStudioLesson(lesson.id, direction);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de réordonner la leçon.");
    }
  }

  async function handleDuplicate(lesson: StudioLesson) {
    try {
      const clone = await duplicateStudioLesson(lesson.id);
      setNotice(`La leçon a été dupliquée avec succès : « ${clone.title} »`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de dupliquer la leçon.");
    }
  }

  return (
    <>
      <PageHeader
        title="Studio de Contenus Pédagogiques"
        subtitle="Moteur No-Code : concevez, enrichissez et prévisualisez les parcours, modules et leçons sans coder."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="ec-btn"
              onClick={() => setEditingModule({ mode: "create" })}
            >
              <Plus size={16} /> Nouveau Monde
            </button>
            <button
              type="button"
              className="ec-btn ec-btn--primary"
              disabled={!activeModule}
              onClick={() => setEditingLessonId("new")}
            >
              <Sparkles size={16} /> Nouvelle Leçon
            </button>
          </div>
        }
      />

      {/* Bandeau d'orientation vers le nouveau Studio 7-9 ans */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 18px",
        marginBottom: 20,
        background: "var(--ec-brand-soft, #e8f6f1)",
        border: "1.5px solid var(--ec-brand, #0d846e)",
        borderRadius: "var(--ec-radius, 12px)",
        color: "var(--ec-ink, #173e3c)",
        fontSize: 14,
        fontWeight: 500,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Sparkles size={18} color="var(--ec-brand, #0d846e)" aria-hidden="true" />
          <span><b>Nouveau Studio :</b> Les leçons des 7-9 ans se modifient maintenant ici.</span>
        </div>
        <Link href="/admin/studio79" className="ec-btn ec-btn--primary" style={{ padding: "6px 14px", fontSize: 13, textDecoration: "none" }}>
          Ouvrir le Studio 7-9 ans
        </Link>
      </div>

      {notice && <Notice>{notice}</Notice>}
      {error && <ErrorMessage message={error} onRetry={loadData} />}

      {/* Sélecteur de Parcours par tranche d'âge */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {tracks.map(t => {
          const isSelected = t.key === selectedTrackKey;
          const lessonsCount = t.worlds.reduce((acc, w) => acc + (w.lessons?.length || 0), 0);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setSelectedTrackKey(t.key);
                setSearchQuery("");
                setTypeFilter("all");
                if (t.worlds.length > 0) setSelectedModuleId(t.worlds[0].id);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 18px",
                borderRadius: 14,
                border: isSelected ? "2px solid var(--ec-brand)" : "1px solid var(--ec-border)",
                background: isSelected ? "var(--ec-brand-soft)" : "white",
                color: isSelected ? "var(--ec-brand)" : "var(--ec-text)",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              <Compass size={18} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14 }}>{t.label} · {t.name}</div>
                <small style={{ fontSize: 11, fontWeight: 600, color: "var(--ec-muted)" }}>
                  {plural(t.worlds.length, "monde", "mondes")} · {plural(lessonsCount, "leçon", "leçons")}
                </small>
              </div>
            </button>
          );
        })}
      </div>

      {loading ? (
        <Skeleton height={380} />
      ) : !activeTrack ? (
        <EmptyState icon={BookOpen} title="Aucun parcours" text="Initialisez les données pédagogiques." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 280px) 1fr", gap: 20, alignItems: "start" }}>
          {/* Colonne Gauche : Liste des Mondes / Modules du parcours */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
              <span style={{ fontWeight: 800, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ec-muted)" }}>
                Mondes pédagogiques ({activeTrack.worlds.length})
              </span>
              <button
                type="button"
                className="ec-btn"
                style={{ padding: "4px 8px", fontSize: 11 }}
                onClick={() => setEditingModule({ mode: "create" })}
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>

            {activeTrack.worlds.length === 0 ? (
              <EmptyState icon={Compass} title="Aucun monde" text="Créez le premier monde pour cette tranche d'âge." />
            ) : (
              activeTrack.worlds.map(w => {
                const isCurrent = w.id === activeModule?.id;
                const lessonsCount = w.lessons?.length || 0;
                return (
                  <div
                    key={w.id}
                    onClick={() => {
                      setSelectedModuleId(w.id);
                      setSearchQuery("");
                      setTypeFilter("all");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: 14,
                      borderRadius: 16,
                      border: isCurrent ? "2px solid var(--ec-brand)" : "1px solid var(--ec-border)",
                      background: isCurrent ? "#ffffff" : "var(--ec-bg)",
                      boxShadow: isCurrent ? "0 4px 14px rgba(13, 132, 110, 0.08)" : "none",
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--ec-bg, #f1f5f9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--ec-primary, #0d846e)" }}>
                        <ModuleIcon name={w.icon} size={18} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <b style={{ display: "block", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {w.title}
                        </b>
                        <small style={{ color: "var(--ec-muted)", fontSize: 12 }}>
                          {plural(lessonsCount, "leçon", "leçons")}
                        </small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ec-btn"
                      style={{ padding: "6px", border: "0", background: "transparent", color: "var(--ec-muted)" }}
                      title="Modifier ce monde"
                      onClick={e => {
                        e.stopPropagation();
                        setEditingModule({ mode: "edit", module: w });
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Colonne Droite : Leçons du Monde actif */}
          <div className="ec-card" style={{ padding: 20 }}>
            {activeModule ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, borderBottom: "1px solid var(--ec-border)", paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--ec-bg, #f1f5f9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--ec-primary, #0d846e)" }}>
                        <ModuleIcon name={activeModule.icon} size={22} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{activeModule.title}</h2>
                        <span style={{ fontSize: 13, color: "var(--ec-muted)" }}>{activeModule.description}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ec-btn ec-btn--primary"
                    style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                    onClick={() => setEditingLessonId("new")}
                  >
                    <Plus size={16} /> Ajouter une leçon
                  </button>
                </div>

                {/* Barre de Recherche et Filtres */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 12, marginBottom: 16 }}>
                  <div style={{ position: "relative" }}>
                    <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ec-muted)" }} />
                    <input
                      className="ec-input"
                      style={{ paddingLeft: 36 }}
                      placeholder="Rechercher une leçon par mot-clé ou identifiant..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select
                    className="ec-select"
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                  >
                    <option value="all">Tous les formats</option>
                    {LESSON_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {filteredLessons.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title={searchQuery || typeFilter !== "all" ? "Aucune leçon trouvée" : "Aucune leçon dans ce monde"}
                    text={searchQuery || typeFilter !== "all" ? "Modifiez votre recherche pour trouver d'autres leçons." : "Ajoutez la première leçon pour enrichir ce monde pédagogique."}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredLessons.map((lesson, lIndex) => (
                      <div
                        key={lesson.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "16px 18px",
                          borderRadius: 14,
                          border: "1px solid var(--ec-border)",
                          background: "white",
                          gap: 16,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: "1 1 300px", minWidth: 0 }}>
                          {/* Flèches pour réordonner */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 4 }}>
                            <button
                              type="button"
                              disabled={lIndex === 0}
                              onClick={() => handleReorder(lesson, "up")}
                              style={{ border: 0, background: "transparent", cursor: lIndex === 0 ? "default" : "pointer", opacity: lIndex === 0 ? 0.25 : 0.8, padding: 0 }}
                              title="Monter"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              disabled={lIndex === filteredLessons.length - 1}
                              onClick={() => handleReorder(lesson, "down")}
                              style={{ border: 0, background: "transparent", cursor: lIndex === filteredLessons.length - 1 ? "default" : "pointer", opacity: lIndex === filteredLessons.length - 1 ? 0.25 : 0.8, padding: 0 }}
                              title="Descendre"
                            >
                              <ChevronDown size={16} />
                            </button>
                          </div>

                          <span
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 10,
                              background: "var(--ec-brand-soft)",
                              color: "var(--ec-brand)",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 900,
                              fontSize: 13,
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            {lesson.order}
                          </span>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                              <b style={{ fontSize: 15, color: "var(--ec-text)", lineHeight: 1.35 }}>{lesson.title}</b>
                              <span style={{ fontSize: 11, color: "var(--ec-muted)", whiteSpace: "nowrap" }}>#{lesson.id}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap", fontSize: 12, color: "var(--ec-muted)" }}>
                              <Badge tone="neutral">{lesson.type}</Badge>
                              <span style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <Clock size={13} /> {lesson.minutes} min
                              </span>
                              <span style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4, color: "#b45309", fontWeight: 700 }}>
                                <Zap size={13} style={{ fill: "#f59e0b" }} /> {lesson.xp} XP
                              </span>
                              <span style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4, color: "#b45309", fontWeight: 700 }}>
                                <Star size={13} style={{ fill: "#f59e0b" }} /> {lesson.stars} étoiles
                              </span>
                              {lesson.has_content && (
                                <span style={{ whiteSpace: "nowrap", fontSize: 11, fontWeight: 700, color: "#0d846e", background: "#e8f6f1", padding: "2px 8px", borderRadius: 999 }}>
                                  Contenu enrichi
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: "auto" }}>
                          <button
                            type="button"
                            className="ec-btn"
                            title="Aperçu sur grand écran d'ordinateur Dashboard"
                            style={{ background: "#e8f6f1", color: "var(--ec-brand)", borderColor: "#a7f3d0", fontWeight: 800, whiteSpace: "nowrap" }}
                            onClick={() => setPreviewLessonId(lesson.id)}
                          >
                            <Monitor size={15} /> Aperçu
                          </button>
                          <button
                            type="button"
                            className="ec-btn"
                            title="Éditer le contenu pédagogique et les quiz"
                            style={{ whiteSpace: "nowrap" }}
                            onClick={() => setEditingLessonId(lesson.id)}
                          >
                            <Pencil size={14} /> Éditer
                          </button>
                          <button
                            type="button"
                            className="ec-btn"
                            title="Dupliquer cette leçon"
                            style={{ padding: "8px 10px" }}
                            onClick={() => handleDuplicate(lesson)}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            className="ec-btn ec-btn--caution"
                            title="Supprimer la leçon"
                            style={{ padding: "8px 10px" }}
                            onClick={() => setDeletingLesson(lesson)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyState icon={Compass} title="Sélectionnez un monde" text="Choisissez un monde à gauche pour afficher ses leçons." />
            )}
          </div>
        </div>
      )}

      {/* Modal Aperçu Apprenant en Ordinateur / Dashboard Desktop */}
      {previewLessonId && (
        <ComputerPreviewModal
          lessonId={previewLessonId}
          onClose={() => setPreviewLessonId(null)}
          onEdit={() => {
            const id = previewLessonId;
            setPreviewLessonId(null);
            setEditingLessonId(id);
          }}
        />
      )}

      {/* Modal Monde */}
      {editingModule && (
        <ModuleModal
          trackKey={selectedTrackKey}
          module={editingModule.mode === "edit" ? editingModule.module : undefined}
          onClose={() => setEditingModule(null)}
          onSaved={msg => {
            setEditingModule(null);
            setNotice(msg);
            loadData();
          }}
        />
      )}

      {/* Modal Leçon No-Code */}
      {editingLessonId && activeModule && (
        <LessonEditorModal
          moduleId={activeModule.id}
          moduleTitle={activeModule.title}
          lessonId={editingLessonId === "new" ? undefined : editingLessonId}
          onClose={() => setEditingLessonId(null)}
          onSaved={msg => {
            setEditingLessonId(null);
            setNotice(msg);
            loadData();
          }}
        />
      )}

      {/* Confirmation de suppression */}
      {deletingLesson && (
        <ConfirmModal
          title={`Supprimer la leçon « ${deletingLesson.title} » ?`}
          consequences={["Cette leçon sera retirée du parcours des élèves."]}
          unchanged="Les statistiques historiques des élèves ayant déjà complété cette leçon restent enregistrées."
          reversibility="Cette action est irréversible."
          confirmLabel="Supprimer définitivement"
          danger
          onConfirm={() => handleDeleteLesson(deletingLesson)}
          onClose={() => setDeletingLesson(null)}
        />
      )}
    </>
  );
}
