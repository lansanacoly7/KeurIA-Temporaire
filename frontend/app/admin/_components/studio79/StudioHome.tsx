"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Film,
  HardDrive,
  Image as ImageIcon,
  Layers,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Wand2,
  X,
  Award,
  BookOpen,
  HelpCircle,
  Zap,
} from "lucide-react";
import { formatRelative } from "@/app/_scolaire/lib/format";
import {
  cancelCatalogPublication,
  createCatalogLesson,
  createCatalogModule,
  createStudioItem,
  deleteCatalogLesson,
  deleteMedia,
  discardCatalogDraft,
  duplicateCatalogLesson,
  getCatalogOverview,
  getStudioOverview,
  listMedia,
  listStudioItems,
  publishCatalog,
  reorderCatalogLessons,
  reorderCatalogModules,
  toggleActiveStudioItem,
  toggleHideCatalogLesson,
  updateMediaMetadata,
  type CatalogOverview,
  type LessonSummary,
  type MediaItem,
  type MediaStorageStats,
  type MediaUsage,
  type StudioItemKind,
  type StudioItemSummary,
  type StudioOverview,
} from "@/app/_scolaire/lib/studio79Api";
import { Badge, EmptyState, ErrorMessage, PageHeader, Skeleton } from "@/app/_scolaire/ui/ui";
import { MediaPicker } from "./MediaPicker";
import { StudioItemModal } from "./StudioItemModal";
import "./studio79.css";

const MODULE_PALETTES = [
  { bg: "#e8f6f1", border: "#a5d6c9", text: "#0d846e" },
  { bg: "#f8fad7", border: "#d9ef59", text: "#4c590a" },
  { bg: "#e6f1fb", border: "#b8d9f8", text: "#185fa5" },
  { bg: "#eeedfe", border: "#cac7fc", text: "#534ab7" },
  { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" },
  { bg: "#fde8ed", border: "#f9b7c6", text: "#9f1239" },
  { bg: "#e0f2fe", border: "#93c5fd", text: "#0369a1" },
  { bg: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9" },
  { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857" },
  { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
];

type FilterType = "all" | "draft" | "pending" | "modified" | "hidden";

function formatPendingClock(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function StudioHome() {
  const [data, setData] = useState<StudioOverview | null>(null);
  const [catalog, setCatalog] = useState<CatalogOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [showMedia, setShowMedia] = useState(false);

  // Modales
  const [showNewModuleModal, setShowNewModuleModal] = useState(false);
  const [newModTitle, setNewModTitle] = useState("");
  const [newModDesc, setNewModDesc] = useState("");
  const [newModColor, setNewModColor] = useState("mint");
  const [newModIcon, setNewModIcon] = useState("🌟");

  const [newLessonModule, setNewLessonModule] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");

  const [lessonToDelete, setLessonToDelete] = useState<LessonSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showPublishCatalogModal, setShowPublishCatalogModal] = useState(false);
  const [publishImmediate, setPublishImmediate] = useState(true);
  const [publishNote, setPublishNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Onglets Studio (T22: Leçons, Énigmes, Défis, Devoirs, Activités — T23: Médias)
  const [activeTab, setActiveTab] = useState<"lessons" | StudioItemKind | "media">("lessons");
  const [itemsData, setItemsData] = useState<StudioItemSummary[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItemModal, setSelectedItemModal] = useState<{ kind: StudioItemKind; key: string } | null>(null);

  // État Médiathèque (T23)
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [mediaStorage, setMediaStorage] = useState<MediaStorageStats | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaKindFilter, setMediaKindFilter] = useState<"all" | "image" | "video">("all");
  const [mediaUsageFilter, setMediaUsageFilter] = useState<"all" | "used" | "unused">("all");
  const [mediaDeleting, setMediaDeleting] = useState<MediaItem | null>(null);
  const [mediaEditing, setMediaEditing] = useState<MediaItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [selectedUsagesMedia, setSelectedUsagesMedia] = useState<MediaItem | null>(null);

  const loadMediaList = useCallback(async () => {
    setMediaLoading(true);
    try {
      const res = await listMedia({
        kind: mediaKindFilter === "all" ? undefined : mediaKindFilter,
        q: mediaSearch.trim() || undefined,
        usage: mediaUsageFilter === "all" ? undefined : mediaUsageFilter,
        pageSize: 40,
      });
      setMediaList(res.results);
      setMediaStorage(res.storage);
    } catch (err) {
      console.error(err);
    } finally {
      setMediaLoading(false);
    }
  }, [mediaKindFilter, mediaSearch, mediaUsageFilter]);

  useEffect(() => {
    if (activeTab === "media") {
      void loadMediaList();
    }
  }, [activeTab, loadMediaList]);

  const handleOpenEditMedia = (item: MediaItem) => {
    setMediaEditing(item);
    setEditName(item.name);
    setEditAlt(item.alt || "");
  };

  const handleSaveMediaMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaEditing) return;
    try {
      await updateMediaMetadata(mediaEditing.id, {
        name: editName.trim() || undefined,
        alt: editAlt.trim(),
      });
      setMediaEditing(null);
      setActionSuccess("Métadonnées du média mises à jour.");
      await loadMediaList();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur de mise à jour.");
    }
  };

  const handleDeleteMedia = async () => {
    if (!mediaDeleting) return;
    try {
      await deleteMedia(mediaDeleting.id);
      setMediaDeleting(null);
      setActionSuccess("Média supprimé avec succès.");
      await loadMediaList();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Impossible de supprimer ce média.");
    }
  };

  const loadItems = useCallback(async (k: StudioItemKind) => {
    setItemsLoading(true);
    try {
      const res = await listStudioItems(k);
      setItemsData(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  const handleCreateNewItem = async (k: StudioItemKind) => {
    try {
      const res = await createStudioItem(k);
      await loadItems(k);
      setSelectedItemModal({ kind: k, key: res.id });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la création.");
    }
  };

  const handleToggleActiveItem = async (k: StudioItemKind, key: string) => {
    try {
      await toggleActiveStudioItem(k, key);
      await loadItems(k);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors du changement de statut.");
    }
  };

  const filteredItems = useMemo(() => {
    return itemsData.filter(item => {
      const q = itemSearch.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.tag && item.tag.toLowerCase().includes(q))
      );
    });
  }, [itemsData, itemSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, catRes] = await Promise.all([
        getStudioOverview(),
        getCatalogOverview().catch(() => null),
      ]);
      setData(overviewRes);
      setCatalog(catRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement du studio.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Toast éphémère de confirmation
  useEffect(() => {
    if (!actionSuccess) return;
    const t = setTimeout(() => setActionSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [actionSuccess]);

  // Statistiques
  const stats = useMemo(() => {
    if (!data) return { modified: 0, drafts: 0, pending: 0, hidden: 0 };
    return {
      modified: data.lessons.filter(l => l.modified).length,
      drafts: data.lessons.filter(l => l.hasDraft).length,
      pending: data.lessons.filter(l => Boolean(l.pendingAt)).length,
      hidden: data.lessons.filter(l => Boolean(l.hidden)).length,
    };
  }, [data]);

  // Filtrage des leçons
  const filteredLessons = useMemo(() => {
    if (!data) return [];
    return data.lessons.filter(lesson => {
      if (filter === "draft" && !lesson.hasDraft) return false;
      if (filter === "pending" && !lesson.pendingAt) return false;
      if (filter === "modified" && !lesson.modified) return false;
      if (filter === "hidden" && !lesson.hidden) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = lesson.title.toLowerCase().includes(q);
        const matchId = lesson.id.toLowerCase().includes(q);
        const mod = data.modules.find(m => m.id === lesson.moduleId);
        const matchModule = mod?.title.toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchModule) return false;
      }

      return true;
    });
  }, [data, filter, search]);

  // Regroupement par module
  const modulesWithLessons = useMemo(() => {
    if (!data) return [];
    return data.modules.map(mod => {
      const lessons = filteredLessons.filter(l => l.moduleId === mod.id);
      return { ...mod, lessons };
    });
  }, [data, filteredLessons]);

  // Actions Catalogue
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await createCatalogModule({
        title: newModTitle.trim(),
        description: newModDesc.trim(),
        color: newModColor,
        icon: newModIcon || "🌟",
      });
      setShowNewModuleModal(false);
      setNewModTitle("");
      setNewModDesc("");
      setActionSuccess("Nouveau module et première leçon créés avec succès !");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la création du module.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonModule || !newLessonTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await createCatalogLesson(newLessonModule, newLessonTitle.trim());
      setNewLessonModule(null);
      setNewLessonTitle("");
      setActionSuccess("Nouvelle leçon ajoutée avec succès !");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la création de la leçon.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateLesson = async (lessonId: string) => {
    try {
      await duplicateCatalogLesson(lessonId);
      setActionSuccess(`La leçon ${lessonId} a été dupliquée !`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la duplication.");
    }
  };

  const handleToggleHide = async (lessonId: string) => {
    try {
      const res = await toggleHideCatalogLesson(lessonId);
      setActionSuccess(`La leçon ${lessonId} est maintenant ${res.hidden ? "masquée" : "visible"}.`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors du changement de statut.");
    }
  };

  const handleDeleteLesson = async () => {
    if (!lessonToDelete) return;
    setDeleteError(null);
    setIsSubmitting(true);
    try {
      await deleteCatalogLesson(lessonToDelete.id);
      setLessonToDelete(null);
      setActionSuccess(`La leçon ${lessonToDelete.id} a été supprimée.`);
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de suppression.";
      setDeleteError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveLesson = async (moduleId: string, lessonId: string, delta: number) => {
    if (!data) return;
    const modLessons = data.lessons.filter(l => l.moduleId === moduleId);
    const idx = modLessons.findIndex(l => l.id === lessonId);
    if (idx < 0) return;
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= modLessons.length) return;

    const newOrder = [...modLessons];
    const [moved] = newOrder.splice(idx, 1);
    newOrder.splice(targetIdx, 0, moved);

    try {
      await reorderCatalogLessons(moduleId, newOrder.map(l => l.id));
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors du réordonnancement.");
    }
  };

  const handleMoveModule = async (moduleId: string, delta: number) => {
    if (!data) return;
    const idx = data.modules.findIndex(m => m.id === moduleId);
    if (idx < 0) return;
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= data.modules.length) return;

    const newModules = [...data.modules];
    const [moved] = newModules.splice(idx, 1);
    newModules.splice(targetIdx, 0, moved);

    try {
      await reorderCatalogModules(newModules.map(m => m.id));
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors du déplacement du module.");
    }
  };

  const handlePublishCatalog = async () => {
    setIsSubmitting(true);
    try {
      await publishCatalog({
        note: publishNote.trim() || undefined,
        immediate: publishImmediate,
      });
      setShowPublishCatalogModal(false);
      setActionSuccess(publishImmediate ? "Catalogue mis en ligne immédiatement !" : "Publication du catalogue programmée (15 min).");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur de publication du catalogue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCatalog = async () => {
    if (!confirm("Annuler la publication en attente du catalogue ?")) return;
    try {
      await cancelCatalogPublication();
      setActionSuccess("Publication du catalogue annulée.");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur d'annulation.");
    }
  };

  const handleDiscardCatalog = async () => {
    if (!confirm("Écarter les modifications du brouillon de catalogue ?")) return;
    try {
      await discardCatalogDraft();
      setActionSuccess("Brouillon de catalogue écarté.");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'écartement.");
    }
  };

  return (
    <div className="sx-home">
      <PageHeader
        title="Studio des Leçons & Catalogue (7-9 ans)"
        subtitle="Conception visuelle No-Code des leçons, quiz et réorganisation dynamique du parcours de Palou."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <button
              id="btn-new-module"
              type="button"
              className="ec-btn ec-btn-primary"
              onClick={() => setShowNewModuleModal(true)}
            >
              <Plus size={16} aria-hidden="true" /> Nouveau module
            </button>
            <button
              type="button"
              className="ec-btn"
              onClick={() => setShowMedia(true)}
            >
              <ImageIcon size={16} aria-hidden="true" /> Médiathèque
            </button>
          </div>
        }
      />

      {error && <ErrorMessage message={error} onRetry={load} />}

      {actionSuccess && (
        <div className="sx-toast-success" role="status" style={{
          display: "flex", alignItems: "center", gap: 10, background: "#ecfdf5", border: "1px solid #a7f3d0",
          color: "#047857", padding: "10px 16px", borderRadius: "var(--sx-radius)", marginBottom: 16, fontSize: 13, fontWeight: 600
        }}>
          <CheckCircle2 size={18} /> {actionSuccess}
        </div>
      )}

      {/* ── Onglets Studio (T22 : Leçons, Énigmes, Défis, Devoirs, Activités) ── */}
      <nav className="sx-tabs-nav" aria-label="Sections du studio">
        <button
          type="button"
          className={`sx-tab-btn ${activeTab === "lessons" ? "active" : ""}`}
          onClick={() => setActiveTab("lessons")}
        >
          <Layers size={16} /> Leçons & Catalogue
        </button>
        <button
          type="button"
          className={`sx-tab-btn ${activeTab === "riddle" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("riddle");
            void loadItems("riddle");
          }}
        >
          <HelpCircle size={16} /> Énigmes (7-9 ans)
        </button>
        <button
          type="button"
          className={`sx-tab-btn ${activeTab === "daily_challenge" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("daily_challenge");
            void loadItems("daily_challenge");
          }}
        >
          <Zap size={16} /> Défis du jour
        </button>
        <button
          type="button"
          className={`sx-tab-btn ${activeTab === "mission" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("mission");
            void loadItems("mission");
          }}
        >
          <BookOpen size={16} /> Devoirs (Missions)
        </button>
        <button
          type="button"
          className={`sx-tab-btn ${activeTab === "activity" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("activity");
            void loadItems("activity");
          }}
        >
          <Award size={16} /> Jeux & Activités
        </button>
        <button
          type="button"
          className={`sx-tab-btn ${activeTab === "media" ? "active" : ""}`}
          onClick={() => setActiveTab("media")}
        >
          <ImageIcon size={16} /> Médiathèque
        </button>
      </nav>

      {activeTab === "lessons" ? (
        <>
          {/* ── Bandeau Catalogue si brouillon ou attente ─────────────────────── */}
          {catalog?.hasDraft && (
        <div className="sx-catalog-banner">
          <div className="sx-catalog-banner-info">
            <Edit3 size={20} className="sx-icon-warn" />
            <div>
              <b>Structure du catalogue modifiée (brouillon en cours)</b>
              <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.85 }}>
                Des modules ou leçons ont été créés, réordonnés ou masqués. Publiez pour les propager aux élèves.
              </p>
            </div>
          </div>
          <div className="sx-catalog-banner-actions">
            <button
              type="button"
              className="ec-btn ec-btn-sm"
              onClick={handleDiscardCatalog}
              title="Écarter le brouillon"
            >
              <RotateCcw size={14} /> Écarter
            </button>
            <button
              type="button"
              className="ec-btn ec-btn-primary ec-btn-sm"
              onClick={() => setShowPublishCatalogModal(true)}
            >
              <Send size={14} /> Publier le catalogue
            </button>
          </div>
        </div>
      )}

      {catalog?.pending && (
        <div className="sx-catalog-banner pending">
          <div className="sx-catalog-banner-info">
            <Clock size={20} style={{ color: "#4c590a" }} />
            <div>
              <b>Publication du catalogue programmée</b>
              <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.85 }}>
                Mise en ligne automatique à {formatPendingClock(catalog.pending.publishAt || "")}.
              </p>
            </div>
          </div>
          <div className="sx-catalog-banner-actions">
            <button
              type="button"
              className="ec-btn ec-btn-sm"
              onClick={handleCancelCatalog}
            >
              Annuler la publication
            </button>
          </div>
        </div>
      )}

      {/* ── 4 Chiffres clés ──────────────────────────────────────────────── */}
      <div className="sx-home-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="sx-stat-card">
          <div className="sx-stat-icon" style={{ background: "var(--sx-brand-soft)", color: "var(--sx-brand)" }}>
            <Layers size={24} aria-hidden="true" />
          </div>
          <div className="sx-stat-info">
            <b>{loading ? "…" : stats.modified}</b>
            <span>Leçon{stats.modified > 1 ? "s" : ""} modifiée{stats.modified > 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="sx-stat-card">
          <div className="sx-stat-icon" style={{ background: "#fef3c7", color: "#b45309" }}>
            <Edit3 size={24} aria-hidden="true" />
          </div>
          <div className="sx-stat-info">
            <b>{loading ? "…" : stats.drafts}</b>
            <span>Brouillon{stats.drafts > 1 ? "s" : ""} en cours</span>
          </div>
        </div>

        <div className="sx-stat-card">
          <div className="sx-stat-icon" style={{ background: "#f8fad7", color: "#4c590a" }}>
            <Clock size={24} aria-hidden="true" />
          </div>
          <div className="sx-stat-info">
            <b>{loading ? "…" : stats.pending}</b>
            <span>Publication{stats.pending > 1 ? "s" : ""} en attente</span>
          </div>
        </div>

        <div className="sx-stat-card">
          <div className="sx-stat-icon" style={{ background: "#f3f4f6", color: "#6b7280" }}>
            <EyeOff size={24} aria-hidden="true" />
          </div>
          <div className="sx-stat-info">
            <b>{loading ? "…" : stats.hidden}</b>
            <span>Leçon{stats.hidden > 1 ? "s" : ""} masquée{stats.hidden > 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* ── Barre d'outils (Recherche & Filtres) ─────────────────────────── */}
      <div className="sx-home-toolbar">
        <div className="sx-home-filters" role="tablist" aria-label="Filtrer les leçons">
          <button
            type="button"
            role="tab"
            aria-selected={filter === "all"}
            className="sx-filter-chip"
            data-active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            Tout ({data?.lessons.length ?? 0})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "draft"}
            className="sx-filter-chip"
            data-active={filter === "draft"}
            onClick={() => setFilter("draft")}
          >
            Brouillons ({stats.drafts})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "pending"}
            className="sx-filter-chip"
            data-active={filter === "pending"}
            onClick={() => setFilter("pending")}
          >
            En attente ({stats.pending})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "modified"}
            className="sx-filter-chip"
            data-active={filter === "modified"}
            onClick={() => setFilter("modified")}
          >
            Modifiées ({stats.modified})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "hidden"}
            className="sx-filter-chip"
            data-active={filter === "hidden"}
            onClick={() => setFilter("hidden")}
          >
            Masquées ({stats.hidden})
          </button>
        </div>

        <div className="sx-home-search">
          <Search size={16} aria-hidden="true" />
          <input
            className="sx-input"
            placeholder="Rechercher une leçon ou un module…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Rechercher une leçon"
          />
        </div>
      </div>

      {/* ── Chargement squelette ────────────────────────────────────────── */}
      {loading && (
        <div className="sx-modules-list">
          {[1, 2, 3].map(n => (
            <div key={n} className="sx-module-block" style={{ padding: 20 }}>
              <Skeleton width={200} height={24} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 16 }}>
                {[1, 2, 3, 4].map(k => (
                  <Skeleton key={k} height={110} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Aucun résultat ──────────────────────────────────────────────── */}
      {!loading && modulesWithLessons.every(m => m.lessons.length === 0) && (
        <EmptyState
          icon={Search}
          title="Aucune leçon ne correspond"
          text={
            search
              ? `Aucune leçon trouvée pour « ${search} ». Essayez d'effacer la recherche.`
              : "Aucune leçon pour ce filtre pour l'instant."
          }
          action={
            search || filter !== "all" ? (
              <button
                type="button"
                className="ec-btn"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Réinitialiser les filtres
              </button>
            ) : undefined
          }
        />
      )}

      {/* ── Modules et Leçons ────────────────────────────────────────────── */}
      {!loading && (
        <div className="sx-modules-list">
          {modulesWithLessons.map((mod, modIdx) => {
            const palette = MODULE_PALETTES[modIdx % MODULE_PALETTES.length];
            return (
              <section key={mod.id} className="sx-module-block" aria-labelledby={`mod-title-${mod.id}`}>
                <header className="sx-module-header">
                  <div className="sx-module-header-title">
                    <span
                      className="sx-module-badge"
                      style={{ background: palette.bg, color: palette.text, border: `1px solid ${palette.border}` }}
                    >
                      Module {modIdx + 1} ({mod.id})
                    </span>
                    <h2 id={`mod-title-${mod.id}`}>{mod.title}</h2>
                  </div>

                  <div className="sx-module-header-actions">
                    <button
                      type="button"
                      className="sx-btn-catalog-action"
                      disabled={modIdx === 0}
                      onClick={() => handleMoveModule(mod.id, -1)}
                      title="Monter le module"
                      aria-label="Monter le module"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="sx-btn-catalog-action"
                      disabled={modIdx === modulesWithLessons.length - 1}
                      onClick={() => handleMoveModule(mod.id, 1)}
                      title="Descendre le module"
                      aria-label="Descendre le module"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="ec-btn ec-btn-sm"
                      onClick={() => {
                        setNewLessonModule(mod.id);
                        setNewLessonTitle("");
                      }}
                      title="Ajouter une leçon dans ce module"
                    >
                      <Plus size={14} /> Nouvelle leçon
                    </button>
                  </div>
                </header>

                <div className="sx-lessons-grid">
                  {mod.lessons.map((lesson, lesIdx) => (
                    <article
                      key={lesson.id}
                      className="sx-lesson-card"
                      style={{ opacity: lesson.hidden ? 0.75 : 1 }}
                    >
                      <div className="sx-lesson-card-top">
                        <div className="sx-lesson-badges">
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sx-muted)" }}>
                            {lesson.id}
                          </span>
                          {lesson.hidden && (
                            <span className="sx-lesson-hidden-badge">
                              <EyeOff size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                              Masquée
                            </span>
                          )}
                          {lesson.pendingAt && (
                            <Badge tone="warn">
                              En attente {formatPendingClock(lesson.pendingAt)}
                            </Badge>
                          )}
                          {lesson.hasDraft && <Badge tone="info">Brouillon</Badge>}
                          {lesson.modified && !lesson.pendingAt && !lesson.hasDraft && (
                            <Badge tone="ok">Modifiée</Badge>
                          )}
                        </div>
                        <h3>{lesson.title}</h3>
                      </div>

                      <div className="sx-lesson-card-bottom">
                        <div className="sx-lesson-actions">
                          <button
                            type="button"
                            className="sx-btn-catalog-action"
                            disabled={lesIdx === 0}
                            onClick={() => handleMoveLesson(mod.id, lesson.id, -1)}
                            title="Monter la leçon"
                            aria-label="Monter la leçon"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            className="sx-btn-catalog-action"
                            disabled={lesIdx === mod.lessons.length - 1}
                            onClick={() => handleMoveLesson(mod.id, lesson.id, 1)}
                            title="Descendre la leçon"
                            aria-label="Descendre la leçon"
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            className="sx-btn-catalog-action"
                            onClick={() => handleDuplicateLesson(lesson.id)}
                            title="Dupliquer la leçon"
                            aria-label="Dupliquer la leçon"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            className="sx-btn-catalog-action"
                            onClick={() => handleToggleHide(lesson.id)}
                            title={lesson.hidden ? "Afficher aux élèves" : "Masquer aux élèves"}
                            aria-label={lesson.hidden ? "Afficher aux élèves" : "Masquer aux élèves"}
                          >
                            {lesson.hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                          <button
                            type="button"
                            className="sx-btn-catalog-action danger"
                            onClick={() => {
                              setDeleteError(null);
                              setLessonToDelete(lesson);
                            }}
                            title="Supprimer la leçon"
                            aria-label="Supprimer la leçon"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <Link
                          href={`/admin/studio79/${encodeURIComponent(lesson.id)}`}
                          className="sx-btn-open-lesson"
                        >
                          <Wand2 size={14} aria-hidden="true" /> Ouvrir
                        </Link>
                      </div>
                    </article>
                  ))}
                  {mod.lessons.length === 0 && (
                    <div style={{ padding: 24, gridColumn: "1 / -1", textAlign: "center", color: "var(--sx-muted)", fontStyle: "italic", fontSize: 13 }}>
                      Aucune leçon dans ce module. Cliquez sur « Nouvelle leçon » pour en ajouter une.
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
        </>
      ) : activeTab === "media" ? (
        <div className="sx-media-manager">
          {/* ── Quota & Jauge de Stockage ─────────────────────────────────── */}
          {mediaStorage && (
            <div className="sx-storage-card">
              <div className="sx-storage-header">
                <div className="sx-storage-title">
                  <HardDrive size={18} aria-hidden="true" />
                  <span>Stockage médiathèque (base de données)</span>
                </div>
                <div className="sx-storage-figures">
                  <strong>{(mediaStorage.totalBytes / 1024 / 1024).toFixed(1)} Mo</strong> / {mediaStorage.maxMb} Mo ({mediaStorage.percentUsed}%) · {mediaStorage.assetCount} fichier(s)
                </div>
              </div>
              <div className="sx-storage-bar-track">
                <div
                  className="sx-storage-bar-fill"
                  style={{
                    width: `${Math.min(100, Math.max(1, mediaStorage.percentUsed))}%`,
                    background: mediaStorage.isWarning
                      ? "var(--sx-danger, #ef4444)"
                      : mediaStorage.percentUsed > 60
                      ? "var(--sx-warn, #f59e0b)"
                      : "var(--ec-tint-mint-ink, #059669)",
                  }}
                />
              </div>
              {mediaStorage.isWarning && mediaStorage.warningMessage && (
                <div className="sx-storage-alert">
                  <AlertTriangle size={18} aria-hidden="true" />
                  <span>{mediaStorage.warningMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Barre d'outils & Filtres ───────────────────────────────────── */}
          <div className="sx-media-controls">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flex: 1 }}>
              <div className="sx-search-box" style={{ flex: 1, minWidth: 260, maxWidth: 380 }}>
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  className="sx-input"
                  placeholder="Rechercher par nom de fichier ou alt text..."
                  value={mediaSearch}
                  onChange={e => setMediaSearch(e.target.value)}
                />
              </div>

              <div className="sx-media-filters">
                <button
                  type="button"
                  className={`sx-filter-pill ${mediaKindFilter === "all" ? "active" : ""}`}
                  onClick={() => setMediaKindFilter("all")}
                >
                  Tous types
                </button>
                <button
                  type="button"
                  className={`sx-filter-pill ${mediaKindFilter === "image" ? "active" : ""}`}
                  onClick={() => setMediaKindFilter("image")}
                >
                  Images
                </button>
                <button
                  type="button"
                  className={`sx-filter-pill ${mediaKindFilter === "video" ? "active" : ""}`}
                  onClick={() => setMediaKindFilter("video")}
                >
                  Vidéos
                </button>
              </div>

              <div className="sx-media-filters">
                <button
                  type="button"
                  className={`sx-filter-pill ${mediaUsageFilter === "all" ? "active" : ""}`}
                  onClick={() => setMediaUsageFilter("all")}
                >
                  Tous statuts
                </button>
                <button
                  type="button"
                  className={`sx-filter-pill ${mediaUsageFilter === "used" ? "active" : ""}`}
                  onClick={() => setMediaUsageFilter("used")}
                >
                  Utilisés
                </button>
                <button
                  type="button"
                  className={`sx-filter-pill ${mediaUsageFilter === "unused" ? "active" : ""}`}
                  onClick={() => setMediaUsageFilter("unused")}
                >
                  Inutilisés (libres)
                </button>
              </div>
            </div>

            <button
              type="button"
              className="ec-btn ec-btn-primary"
              onClick={() => setShowMedia(true)}
            >
              <Plus size={16} /> Envoyer un média
            </button>
          </div>

          {/* ── Grille des Médias ─────────────────────────────────────────── */}
          {mediaLoading ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--sx-muted)" }}>
              Chargement de la médiathèque...
            </div>
          ) : mediaList.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--sx-muted)", fontStyle: "italic" }}>
              Aucun média trouvé pour ces critères de recherche.
            </div>
          ) : (
            <div className="sx-media-card-grid">
              {mediaList.map(item => (
                <div key={item.id} className="sx-media-card">
                  <div className="sx-media-preview-box">
                    {item.kind === "image" ? (
                      <img src={item.url} alt={item.alt || item.name} className="sx-media-preview-img" loading="lazy" />
                    ) : (
                      <div className="sx-media-preview-video">
                        <Film size={40} />
                        <span>Vidéo MP4</span>
                      </div>
                    )}
                  </div>

                  <div className="sx-media-card-body">
                    <div className="sx-media-card-name" title={item.name}>
                      {item.name || `Média #${item.id}`}
                    </div>
                    <div className="sx-media-card-alt" title={item.alt}>
                      {item.alt ? `« ${item.alt} »` : <span style={{ opacity: 0.6 }}>Aucun texte alternatif</span>}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                      {item.usageCount !== undefined && item.usageCount > 0 ? (
                        <button
                          type="button"
                          className="sx-media-usage-pill used"
                          onClick={() => setSelectedUsagesMedia(item)}
                          title="Cliquez pour voir les contenus qui utilisent ce média"
                        >
                          <CheckCircle2 size={12} /> Utilisé ({item.usageCount})
                        </button>
                      ) : (
                        <span className="sx-media-usage-pill unused">
                          Non utilisé
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "var(--sx-muted)" }}>
                        {item.size >= 1024 * 1024 ? `${(item.size / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(item.size / 1024)} Ko`}
                      </span>
                    </div>

                    <div className="sx-media-card-meta">
                      <span>{formatRelative(item.createdAt)}</span>
                      <code>{item.ref}</code>
                    </div>
                  </div>

                  <div className="sx-media-card-actions">
                    <button
                      type="button"
                      className="sx-media-action-btn"
                      onClick={() => handleOpenEditMedia(item)}
                      title="Modifier les métadonnées (nom, texte alternatif)"
                    >
                      <Edit3 size={15} /> <span style={{ fontSize: 12, marginLeft: 4 }}>Modifier</span>
                    </button>
                    <button
                      type="button"
                      className="sx-media-action-btn danger"
                      onClick={() => setMediaDeleting(item)}
                      disabled={item.usageCount !== undefined && item.usageCount > 0}
                      title={
                        item.usageCount !== undefined && item.usageCount > 0
                          ? `Ce média est utilisé dans ${item.usageCount} contenu(s) et ne peut pas être supprimé (409 Conflict)`
                          : "Supprimer ce média inutilisé"
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="sx-items-view">
          <div className="sx-home-toolbar" style={{ marginTop: 0 }}>
            <div className="sx-search-box" style={{ flex: 1, maxWidth: 400 }}>
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                className="sx-input"
                placeholder={
                  activeTab === "riddle"
                    ? "Rechercher une énigme par question, leçon..."
                    : activeTab === "daily_challenge"
                    ? "Rechercher un défi par thème, question..."
                    : activeTab === "mission"
                    ? "Rechercher un devoir par titre, catégorie..."
                    : "Rechercher une activité..."
                }
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="ec-btn ec-btn-primary"
              onClick={() => handleCreateNewItem(activeTab)}
            >
              <Plus size={16} />
              {activeTab === "riddle"
                ? "Nouvelle énigme"
                : activeTab === "daily_challenge"
                ? "Nouveau défi"
                : activeTab === "mission"
                ? "Nouveau devoir"
                : "Nouvelle activité"}
            </button>
          </div>

          {itemsLoading ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--sx-muted)" }}>
              Chargement des éléments...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--sx-muted)", fontStyle: "italic" }}>
              Aucun élément trouvé.
            </div>
          ) : (
            <div className="sx-items-grid">
              {filteredItems.map(item => (
                <div key={item.id} className="sx-item-card">
                  <div>
                    <div className="sx-item-card-header">
                      <span className="sx-badge" style={{ background: "var(--sx-brand-soft)", color: "var(--sx-brand)", fontWeight: 700 }}>
                        {item.tag || item.kind}
                      </span>
                      <span
                        className="sx-badge"
                        style={{
                          background: item.isActive ? "var(--ec-tint-mint)" : "var(--sx-line)",
                          color: item.isActive ? "var(--ec-tint-mint-ink)" : "var(--sx-muted)",
                        }}
                      >
                        {item.isActive ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    <h3 className="sx-item-card-title">{item.title}</h3>
                    <p className="sx-item-card-sub">{item.subtitle}</p>

                    <div className="sx-item-card-meta">
                      {item.modified && (
                        <span className="sx-badge" style={{ background: "var(--ec-tint-lemon)", color: "var(--ec-tint-lemon-ink)" }}>
                          Modifié
                        </span>
                      )}
                      {item.liveNumber && (
                        <span className="sx-badge" style={{ background: "var(--ec-tint-mint)", color: "var(--ec-tint-mint-ink)" }}>
                          v{item.liveNumber}
                        </span>
                      )}
                      {item.hasDraft && (
                        <span className="sx-badge" style={{ background: "var(--sx-warn-bg)", color: "var(--sx-warn)" }}>
                          Brouillon
                        </span>
                      )}
                      {item.pendingAt && (
                        <span className="sx-badge" style={{ background: "var(--ec-tint-rose)", color: "var(--ec-tint-rose-ink)" }}>
                          En attente 15 min
                        </span>
                      )}
                      {item.lastEditedAt && (
                        <span style={{ fontSize: 11, color: "var(--sx-muted)", marginLeft: "auto" }}>
                          Édité {formatRelative(item.lastEditedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="sx-item-card-actions">
                    <button
                      type="button"
                      className="ec-btn ec-btn-sm ec-btn-primary"
                      style={{ flex: 1 }}
                      onClick={() => setSelectedItemModal({ kind: item.kind, key: item.id })}
                    >
                      <Edit3 size={14} /> Éditer
                    </button>
                    <button
                      type="button"
                      className="ec-btn ec-btn-sm"
                      onClick={() => handleToggleActiveItem(item.kind, item.id)}
                      title={item.isActive ? "Désactiver" : "Activer"}
                    >
                      {item.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal Modification Métadonnées Média (T23) ────────────────── */}
      {mediaEditing && (
        <div className="sx-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-edit-media-title">
          <div className="sx-modal" style={{ maxWidth: 460 }}>
            <div className="sx-modal-head">
              <h3 id="modal-edit-media-title">Modifier le média #{mediaEditing.id}</h3>
              <button
                type="button"
                className="sx-btn-ghost"
                onClick={() => setMediaEditing(null)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMediaMetadata}>
              <div className="sx-modal-body">
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  {mediaEditing.kind === "image" ? (
                    <img
                      src={mediaEditing.url}
                      alt={mediaEditing.alt || mediaEditing.name}
                      style={{ maxHeight: 120, maxWidth: "100%", borderRadius: "var(--sx-radius-sm)", border: "1px solid var(--sx-line)" }}
                    />
                  ) : (
                    <Film size={48} style={{ color: "var(--sx-muted)" }} />
                  )}
                  <p style={{ fontSize: 11, color: "var(--sx-muted)", marginTop: 4 }}>
                    Référence : <code>{mediaEditing.ref}</code>
                  </p>
                </div>

                <div className="sx-field">
                  <label className="sx-label" htmlFor="edit-media-name">Nom du fichier</label>
                  <input
                    id="edit-media-name"
                    className="sx-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div className="sx-field">
                  <label className="sx-label" htmlFor="edit-media-alt">Texte alternatif (accessibilité)</label>
                  <textarea
                    id="edit-media-alt"
                    className="sx-input"
                    style={{ minHeight: 70, resize: "vertical" }}
                    placeholder="Décrivez précisément ce que montre l'image pour les enfants malvoyants et lecteurs d'écran..."
                    value={editAlt}
                    onChange={e => setEditAlt(e.target.value)}
                    maxLength={300}
                  />
                  <small style={{ fontSize: 11, color: "var(--sx-muted)" }}>
                    {editAlt.length}/300 caractères
                  </small>
                </div>
              </div>

              <div className="sx-modal-foot">
                <button
                  type="button"
                  className="ec-btn"
                  onClick={() => setMediaEditing(null)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="ec-btn ec-btn-primary"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Suppression Média (T23) ───────────────────────────────── */}
      {mediaDeleting && (
        <div className="sx-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-del-media-title">
          <div className="sx-modal" style={{ maxWidth: 440 }}>
            <div className="sx-modal-head">
              <h3 id="modal-del-media-title" style={{ color: "var(--sx-danger, #ef4444)" }}>
                Supprimer le média #{mediaDeleting.id} ?
              </h3>
              <button
                type="button"
                className="sx-btn-ghost"
                onClick={() => setMediaDeleting(null)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="sx-modal-body">
              <p style={{ margin: "0 0 12px", fontSize: 14 }}>
                Êtes-vous sûr de vouloir supprimer définitivement le média <b>{mediaDeleting.name}</b> ?
              </p>
              <p style={{ fontSize: 12, color: "var(--sx-muted)", margin: "0 0 12px" }}>
                Ce média n&apos;étant utilisé dans aucun contenu, sa suppression de la base de données est sécurisée et permettra de libérer de l&apos;espace de stockage.
              </p>
            </div>

            <div className="sx-modal-foot">
              <button
                type="button"
                className="ec-btn"
                onClick={() => setMediaDeleting(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="ec-btn"
                style={{ background: "#dc2626", color: "#fff", borderColor: "#dc2626" }}
                onClick={handleDeleteMedia}
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Liste des Utilisations Média (T23) ───────────────────── */}
      {selectedUsagesMedia && (
        <div className="sx-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-usages-title">
          <div className="sx-modal" style={{ maxWidth: 500 }}>
            <div className="sx-modal-head">
              <h3 id="modal-usages-title">Utilisations de « {selectedUsagesMedia.name} »</h3>
              <button
                type="button"
                className="sx-btn-ghost"
                onClick={() => setSelectedUsagesMedia(null)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="sx-modal-body">
              <p style={{ fontSize: 13, margin: "0 0 12px", color: "var(--sx-muted)" }}>
                Ce média est référencé dans les contenus suivants. Pour le supprimer, retirez d&apos;abord sa référence de ces contenus.
              </p>

              <ul className="sx-usage-dialog-list">
                {selectedUsagesMedia.usages && selectedUsagesMedia.usages.length > 0 ? (
                  selectedUsagesMedia.usages.map((u, i) => (
                    <li key={i} className="sx-usage-dialog-item">
                      <span className="sx-badge" style={{ background: "var(--sx-brand-soft)", color: "var(--sx-brand)", fontSize: 11 }}>
                        {u.kind}
                      </span>
                      <span style={{ fontWeight: 600 }}>{u.description}</span>
                    </li>
                  ))
                ) : (
                  <li className="sx-usage-dialog-item">Aucune utilisation détaillée trouvée.</li>
                )}
              </ul>
            </div>

            <div className="sx-modal-foot">
              <button
                type="button"
                className="ec-btn"
                onClick={() => setSelectedUsagesMedia(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Nouveau Module ─────────────────────────────────────────── */}
      {showNewModuleModal && (
        <div className="sx-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-new-mod-title">
          <div className="sx-modal" style={{ maxWidth: 460 }}>
            <div className="sx-modal-head">
              <h3 id="modal-new-mod-title">Nouveau module (parcours 7-9)</h3>
              <button
                type="button"
                className="sx-btn-ghost"
                onClick={() => setShowNewModuleModal(false)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateModule}>
              <div className="sx-modal-body">
                <div className="sx-field">
                  <label className="sx-label" htmlFor="new-mod-title">Titre du module *</label>
                  <input
                    id="new-mod-title"
                    className="sx-input"
                    placeholder="Ex: L'éthique et les règles de l'IA"
                    value={newModTitle}
                    onChange={e => setNewModTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="sx-field">
                  <label className="sx-label" htmlFor="new-mod-desc">Description</label>
                  <input
                    id="new-mod-desc"
                    className="sx-input"
                    placeholder="Ex: Apprendre à utiliser l'IA de manière responsable."
                    value={newModDesc}
                    onChange={e => setNewModDesc(e.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="sx-field">
                    <label className="sx-label" htmlFor="new-mod-icon">Icône / Émoji</label>
                    <input
                      id="new-mod-icon"
                      className="sx-input"
                      value={newModIcon}
                      onChange={e => setNewModIcon(e.target.value)}
                      maxLength={4}
                    />
                  </div>
                  <div className="sx-field">
                    <label className="sx-label" htmlFor="new-mod-color">Couleur</label>
                    <select
                      id="new-mod-color"
                      className="sx-input"
                      value={newModColor}
                      onChange={e => setNewModColor(e.target.value)}
                    >
                      <option value="mint">Menthe (Vert)</option>
                      <option value="lemon">Citron (Jaune)</option>
                      <option value="sky">Ciel (Bleu)</option>
                      <option value="lavender">Lavande (Violet)</option>
                      <option value="coral">Corail (Orange)</option>
                      <option value="rose">Rose</option>
                    </select>
                  </div>
                </div>

                <p style={{ fontSize: 12, color: "var(--sx-muted)", marginTop: 8 }}>
                  💡 Le nouveau module recevra automatiquement l'identifiant suivant (ex: <code>p11</code>) et une première leçon modèle valide.
                </p>
              </div>

              <div className="sx-modal-foot">
                <button
                  type="button"
                  className="ec-btn"
                  onClick={() => setShowNewModuleModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="ec-btn ec-btn-primary"
                  disabled={isSubmitting || !newModTitle.trim()}
                >
                  {isSubmitting ? "Création…" : "Créer le module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Nouvelle Leçon ─────────────────────────────────────────── */}
      {newLessonModule && (
        <div className="sx-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-new-les-title">
          <div className="sx-modal" style={{ maxWidth: 440 }}>
            <div className="sx-modal-head">
              <h3 id="modal-new-les-title">Nouvelle leçon dans {newLessonModule}</h3>
              <button
                type="button"
                className="sx-btn-ghost"
                onClick={() => setNewLessonModule(null)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateLesson}>
              <div className="sx-modal-body">
                <div className="sx-field">
                  <label className="sx-label" htmlFor="new-les-title">Titre de la leçon *</label>
                  <input
                    id="new-les-title"
                    className="sx-input"
                    placeholder="Ex: Découverte des capteurs"
                    value={newLessonTitle}
                    onChange={e => setNewLessonTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <p style={{ fontSize: 12, color: "var(--sx-muted)" }}>
                  La leçon sera créée avec un gabarit de 4 écrans immédiatement valide (histoire, pourquoi, jeu, je retiens).
                </p>
              </div>

              <div className="sx-modal-foot">
                <button
                  type="button"
                  className="ec-btn"
                  onClick={() => setNewLessonModule(null)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="ec-btn ec-btn-primary"
                  disabled={isSubmitting || !newLessonTitle.trim()}
                >
                  {isSubmitting ? "Création…" : "Créer la leçon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Confirmation Suppression ──────────────────────────────── */}
      {lessonToDelete && (
        <div className="sx-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-del-les-title">
          <div className="sx-modal" style={{ maxWidth: 460 }}>
            <div className="sx-modal-head">
              <h3 id="modal-del-les-title" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--sx-danger)" }}>
                <AlertCircle size={18} /> Supprimer la leçon ?
              </h3>
              <button
                type="button"
                className="sx-btn-ghost"
                onClick={() => setLessonToDelete(null)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="sx-modal-body">
              <p style={{ fontSize: 14, margin: "0 0 12px" }}>
                Voulez-vous supprimer définitivement <b>{lessonToDelete.title}</b> (<code>{lessonToDelete.id}</code>) ?
              </p>

              {deleteError && (
                <div style={{
                  background: "var(--sx-danger-bg)", border: "1px solid var(--sx-danger-border)",
                  color: "var(--sx-danger)", padding: "10px 14px", borderRadius: "var(--sx-radius-sm)", fontSize: 13, lineHeight: 1.45, marginBottom: 12
                }}>
                  {deleteError}
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="ec-btn ec-btn-sm"
                      onClick={() => {
                        void handleToggleHide(lessonToDelete.id);
                        setLessonToDelete(null);
                      }}
                    >
                      <EyeOff size={13} /> Masquer cette leçon à la place
                    </button>
                  </div>
                </div>
              )}

              {!deleteError && (
                <p style={{ fontSize: 12, color: "var(--sx-muted)" }}>
                  ⚠️ Règle de sécurité : si des élèves ont déjà complété cette leçon ou gagné de l&apos;XP dessus, le serveur refusera la suppression et exigera de la masquer à la place.
                </p>
              )}
            </div>

            <div className="sx-modal-foot">
              <button
                type="button"
                className="ec-btn"
                onClick={() => setLessonToDelete(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="ec-btn ec-btn-danger"
                onClick={handleDeleteLesson}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Suppression…" : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Publication Catalogue ─────────────────────────────────── */}
      {showPublishCatalogModal && (
        <div className="sx-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-pub-cat-title">
          <div className="sx-modal" style={{ maxWidth: 480 }}>
            <div className="sx-modal-head">
              <h3 id="modal-pub-cat-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Send size={18} color="var(--sx-brand)" /> Publication du catalogue
              </h3>
              <button
                type="button"
                className="sx-btn-ghost"
                onClick={() => setShowPublishCatalogModal(false)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="sx-modal-body">
              <p style={{ fontSize: 13, color: "var(--sx-ink)", lineHeight: 1.5 }}>
                La nouvelle arborescence (modules, leçons et ordre d&apos;affichage) sera synchronisée en base pour l&apos;ensemble des élèves et classes.
              </p>

              <div className="sx-field" style={{ marginTop: 12 }}>
                <label className="sx-label" htmlFor="pub-cat-note">Note de version (optionnel)</label>
                <input
                  id="pub-cat-note"
                  className="sx-input"
                  placeholder="Ex: Ajout du module éthique et réorganisation"
                  value={publishNote}
                  onChange={e => setPublishNote(e.target.value)}
                />
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={publishImmediate}
                    onChange={e => setPublishImmediate(e.target.checked)}
                  />
                  Mise en ligne immédiate (sans délai de sécurité)
                </label>
                {!publishImmediate && (
                  <p style={{ fontSize: 12, color: "var(--sx-muted)", margin: "4px 0 0 24px" }}>
                    Délai standard de 15 minutes avant prise d&apos;effet pour les enfants.
                  </p>
                )}
              </div>
            </div>

            <div className="sx-modal-foot">
              <button
                type="button"
                className="ec-btn"
                onClick={() => setShowPublishCatalogModal(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="ec-btn ec-btn-primary"
                onClick={handlePublishCatalog}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Publication…" : "Confirmer la publication"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Médiathèque ────────────────────────────────────────────── */}
      {showMedia && (
        <MediaPicker
          onPick={() => {}}
          onClose={() => setShowMedia(false)}
        />
      )}

      {/* ── Modal Édition d'un Item (T22 : Énigmes, Défis, Devoirs, Activités) ─ */}
      {selectedItemModal && (
        <StudioItemModal
          kind={selectedItemModal.kind}
          itemKey={selectedItemModal.key}
          onClose={() => setSelectedItemModal(null)}
          onSaved={() => void loadItems(selectedItemModal.kind)}
        />
      )}
    </div>
  );
}
