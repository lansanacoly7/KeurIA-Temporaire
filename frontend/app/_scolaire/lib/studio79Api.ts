/*
 * Studio des leçons du parcours 7-9 : appels à /api/superadmin/studio79 et /api/superadmin/media.
 * Les règles (brouillon, délai de sécurité avant mise en ligne, contrôle de structure) sont appliquées par le serveur.
 */
import type { LessonContent } from "@/app/dashboard/parcours79/types";
import { api, EcoleApiError, query } from "./http";
import type { Paged } from "./superadminApi";

/** `error` bloque la publication ; `warning` est une règle de style de la bible narrative, à confirmer. */
export type Issue = { severity: "error" | "warning"; screen: number | null; message: string; where?: string };

export type VersionState = "draft" | "pending" | "live" | "past";
export type VersionInfo = {
  id: number;
  number: number;
  source: "import" | "studio" | "rollback";
  note: string;
  author: string | null;
  createdAt: string;
  updatedAt: string;
  publishAt: string | null;
  state: VersionState;
};

export type LessonSummary = {
  id: string;
  title: string;
  moduleId: string;
  /** Le contenu en ligne n'est plus celui d'origine. */
  modified: boolean;
  liveNumber: number | null;
  hasDraft: boolean;
  draftUpdatedAt: string | null;
  pendingAt: string | null;
  lastEditedAt: string | null;
  lastEditedBy: string | null;
  hidden?: boolean;
};
export type StudioOverview = { modules: { id: string; title: string; number: number }[]; lessons: LessonSummary[]; delayMinutes: number };

export type StudioLesson = {
  id: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
  live: (VersionInfo & { content: LessonContent }) | null;
  pending: VersionInfo | null;
  draft: VersionInfo | null;
  /** Ce sur quoi l'auteur travaille : son brouillon, sinon la publication en attente, sinon la version en ligne. */
  working: { from: "draft" | "pending" | "live"; content: LessonContent };
  history: VersionInfo[];
  delayMinutes: number;
  issues: Issue[];
};

export type MediaUsage = {
  versionId: number;
  key: string;
  kind: string;
  version: number;
  state: string;
  description: string;
};

export type MediaStorageStats = {
  totalBytes: number;
  maxBytes: number;
  maxMb: number;
  percentUsed: number;
  warningThresholdPercent: number;
  isWarning: boolean;
  warningMessage: string | null;
  assetCount: number;
};

export type MediaItem = {
  id: number;
  kind: "image" | "video";
  /** Référence à écrire dans un contenu (« media:12.ab12cd34 »). */
  ref: string;
  url: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
  name: string;
  alt: string;
  createdAt: string;
  usageCount?: number;
  usages?: MediaUsage[];
  canDelete?: boolean;
};

export type MediaListResponse = Paged<MediaItem> & {
  storage: MediaStorageStats;
};

const base = (id: string) => `superadmin/studio79/lessons/${encodeURIComponent(id)}`;

export const getStudioOverview = () => api.get<StudioOverview>("superadmin/studio79/lessons");
export const getStudioLesson = (id: string) => api.get<StudioLesson>(base(id));

export function saveDraft(id: string, content: LessonContent, note = ""): Promise<{ draft: VersionInfo; issues: Issue[] }> {
  return api.put(`${base(id)}/draft`, { content, note });
}
export const discardDraft = (id: string) => api.delete<{ ok: true }>(`${base(id)}/draft`);
export const validateLesson = (id: string, content: LessonContent) => api.post<{ issues: Issue[] }>(`${base(id)}/validate`, { content });

/** Refus de publication : `blocking` (erreurs de structure) ou `needsAcknowledge` (règles de style à confirmer), avec la liste des problèmes. */
export type PublishRefusal = { blocking: boolean; needsAcknowledge: boolean; issues: Issue[]; message: string };

export function publishRefusal(error: unknown): PublishRefusal | null {
  if (!(error instanceof EcoleApiError) || !error.data || !Array.isArray(error.data.issues)) return null;
  return { blocking: error.data.blocking === true, needsAcknowledge: error.data.needsAcknowledge === true, issues: error.data.issues as Issue[], message: error.message };
}

export const publishLesson = (id: string, acknowledge = false) =>
  api.post<{ version: VersionInfo; issues: Issue[] }>(`${base(id)}/publish`, { acknowledge });
export const cancelPublication = (id: string) => api.post<{ outcome: string }>(`${base(id)}/cancel`);
export const rollbackLesson = (id: string, number: number) => api.post<{ version: VersionInfo }>(`${base(id)}/rollback`, { number });

export const listMedia = (filter: { kind?: "image" | "video"; q?: string; usage?: "all" | "used" | "unused"; page?: number; pageSize?: number } = {}) =>
  api.get<MediaListResponse>(`superadmin/media${query(filter)}`);

export const getMediaDetail = (id: number) => api.get<MediaItem>(`superadmin/media/${id}`);

export const updateMediaMetadata = (id: number, data: { name?: string; alt?: string }) =>
  api.patch<MediaItem>(`superadmin/media/${id}`, data);

export const deleteMedia = (id: number) => api.delete<{ ok: boolean; id: number; message: string }>(`superadmin/media/${id}`);

export function uploadMedia(file: File, alt = ""): Promise<MediaItem> {
  const form = new FormData();
  form.append("file", file);
  if (alt) form.append("alt", alt);
  return api.post<MediaItem>("superadmin/media", form);
}

// ─── Catalogue dynamique (T21) ────────────────────────────────────────────────

export type CatalogModule = {
  id: string;
  title: string;
  description?: string;
  color: string;
  icon: string;
  order: number;
};

export type CatalogLessonEntry = {
  id: string;
  moduleId: string;
  title: string;
  order: number;
  hidden: boolean;
};

export type CatalogContent = {
  version: string;
  track: string;
  modules: CatalogModule[];
  lessons: CatalogLessonEntry[];
};

export type CatalogOverview = {
  trackKey: string;
  working: {
    origin: "live" | "draft" | "pending" | "base";
    content: CatalogContent;
  };
  hasDraft: boolean;
  draft: VersionInfo | null;
  pending: VersionInfo | null;
  live: VersionInfo | null;
  history: VersionInfo[];
  delayMinutes: number;
};

export const getCatalogOverview = () => api.get<CatalogOverview>("superadmin/studio79/catalog");
export const saveCatalogDraft = (content: CatalogContent, note = "") =>
  api.put<CatalogOverview>("superadmin/studio79/catalog", { content, note });
export const discardCatalogDraft = () => api.delete<{ ok: true }>("superadmin/studio79/catalog");
export const publishCatalog = (options: { note?: string; delayMinutes?: number; immediate?: boolean } = {}) =>
  api.post<{ ok: true; state: string; publishAt: string | null; versionNumber: number }>("superadmin/studio79/catalog/publish", options);
export const cancelCatalogPublication = () => api.post<{ ok: true }>("superadmin/studio79/catalog/cancel");
export const rollbackCatalog = (number: number) => api.post<{ ok: true; restoredNumber: number }>("superadmin/studio79/catalog/rollback", { number });

export const createCatalogLesson = (moduleId: string, title: string) =>
  api.post<{ ok: true; lesson: CatalogLessonEntry; content: LessonContent }>("superadmin/studio79/catalog/lessons/new", { moduleId, title });

export const deleteCatalogLesson = (lessonId: string) =>
  api.delete<{ ok: true; deleted: boolean; id: string }>(`superadmin/studio79/catalog/lessons/${encodeURIComponent(lessonId)}`);

export const toggleHideCatalogLesson = (lessonId: string) =>
  api.post<{ ok: true; id: string; hidden: boolean }>(`superadmin/studio79/catalog/lessons/${encodeURIComponent(lessonId)}/toggle-hide`);

export const duplicateCatalogLesson = (lessonId: string) =>
  api.post<{ ok: true; lesson: CatalogLessonEntry }>(`superadmin/studio79/catalog/lessons/${encodeURIComponent(lessonId)}/duplicate`);

export const createCatalogModule = (params: { title: string; description?: string; color?: string; icon?: string }) =>
  api.post<{ ok: true; module: CatalogModule; firstLesson: CatalogLessonEntry }>("superadmin/studio79/catalog/modules/new", params);

export const reorderCatalogLessons = (moduleId: string, lessonIds: string[]) =>
  api.post<{ ok: true; lessons: CatalogLessonEntry[] }>("superadmin/studio79/catalog/reorder", { type: "lessons", moduleId, lessonIds });

export const reorderCatalogModules = (moduleIds: string[]) =>
  api.post<{ ok: true; modules: CatalogModule[] }>("superadmin/studio79/catalog/reorder", { type: "modules", moduleIds });

// ─── Studio Items (T22 : Énigmes, Défis, Devoirs, Activités) ────────────────

export type StudioItemKind = "riddle" | "daily_challenge" | "mission" | "activity";

export type StudioItemSummary = {
  id: string;
  kind: StudioItemKind;
  title: string;
  subtitle: string;
  isActive: boolean;
  tag: string;
  modified: boolean;
  liveNumber: number | null;
  hasDraft: boolean;
  draftUpdatedAt: string | null;
  pendingAt: string | null;
  lastEditedAt: string | null;
  lastEditedBy: string | null;
};

export type StudioItemsListResponse = {
  kind: StudioItemKind;
  items: StudioItemSummary[];
  delayMinutes: number;
};

export type StudioItemDetail = {
  id: string;
  kind: StudioItemKind;
  live: (VersionInfo & { content: Record<string, unknown> }) | null;
  pending: VersionInfo | null;
  draft: VersionInfo | null;
  working: { from: "draft" | "pending" | "live"; content: Record<string, unknown> };
  history: VersionInfo[];
  delayMinutes: number;
  issues: Issue[];
};

export const listStudioItems = (kind: StudioItemKind) =>
  api.get<StudioItemsListResponse>(`superadmin/studio79/items/${kind}`);

export const getStudioItem = (kind: StudioItemKind, key: string) =>
  api.get<StudioItemDetail>(`superadmin/studio79/items/${kind}/${encodeURIComponent(key)}`);

export const saveStudioItemDraft = (kind: StudioItemKind, key: string, content: Record<string, unknown>, note = "") =>
  api.put<{ draft: VersionInfo; issues: Issue[] }>(`superadmin/studio79/items/${kind}/${encodeURIComponent(key)}/draft`, { content, note });

export const discardStudioItemDraft = (kind: StudioItemKind, key: string) =>
  api.delete<{ ok: true }>(`superadmin/studio79/items/${kind}/${encodeURIComponent(key)}/draft`);

export const publishStudioItem = (
  kind: StudioItemKind,
  key: string,
  options: { note?: string; delayMinutes?: number; immediate?: boolean; acknowledge?: boolean } = {}
) =>
  api.post<{ version: VersionInfo; issues: Issue[] }>(`superadmin/studio79/items/${kind}/${encodeURIComponent(key)}/publish`, options);

export const cancelStudioItemPublication = (kind: StudioItemKind, key: string) =>
  api.post<{ outcome: string }>(`superadmin/studio79/items/${kind}/${encodeURIComponent(key)}/cancel`);

export const rollbackStudioItem = (kind: StudioItemKind, key: string, number: number) =>
  api.post<{ version: VersionInfo }>(`superadmin/studio79/items/${kind}/${encodeURIComponent(key)}/rollback`, { number });

export const validateStudioItem = (kind: StudioItemKind, key: string, content: Record<string, unknown>) =>
  api.post<{ issues: Issue[] }>(`superadmin/studio79/items/${kind}/${encodeURIComponent(key)}/validate`, { content });

export const createStudioItem = (kind: StudioItemKind, initialData: Record<string, unknown> = {}) =>
  api.post<{ id: string; kind: StudioItemKind; draft: VersionInfo; issues: Issue[] }>(`superadmin/studio79/items/${kind}/new`, { initialData });

export const toggleActiveStudioItem = (kind: StudioItemKind, key: string) =>
  api.post<{ isActive: boolean; draft: VersionInfo; issues: Issue[] }>(`superadmin/studio79/items/${kind}/${encodeURIComponent(key)}/toggle-active`);
