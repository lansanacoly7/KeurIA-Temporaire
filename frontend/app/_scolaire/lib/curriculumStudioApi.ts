/*
 * API Client pour le Studio de Contenus Pédagogiques (Super Admin).
 */
import { api } from "./http";

export type StudioQuestion = {
  question: string;
  options: string[];
  correct: number;
  explain: string;
};

export type StudioActivity = {
  prompt?: string;
  options?: string[];
  correct?: number;
  success?: string;
};

export type StudioLessonContent = {
  mission?: string;
  objectives?: string[];
  discover?: string;
  example?: string;
  activity?: StudioActivity;
  remember?: string[];
  vocabulary?: [string, string][];
  challenge?: string;
  skill?: string;
  questions?: StudioQuestion[];
};

export type StudioLesson = {
  id: string;
  numeric_id: number;
  title: string;
  type: "histoire" | "jeu" | "quiz" | "atelier" | "projet";
  minutes: number;
  xp: number;
  stars: number;
  order: number;
  has_content: boolean;
  module_id?: string;
  module_title?: string;
  track_key?: string;
  content?: StudioLessonContent;
};

export type StudioModule = {
  id: string;
  numeric_id: number;
  icon: string;
  title: string;
  description: string;
  color: string;
  order: number;
  lessons: StudioLesson[];
};

export type StudioTrack = {
  key: string;
  label: string;
  name: string;
  tagline: string;
  accent: string;
  order: number;
  worlds: StudioModule[];
};

export type LessonPayload = {
  id?: string;
  module_id: string;
  title: string;
  type: string;
  minutes: number;
  xp: number;
  stars: number;
  order: number;
  content?: StudioLessonContent;
};

export type ModulePayload = {
  id?: string;
  track_key: string;
  title: string;
  icon: string;
  description: string;
  color: string;
  order: number;
};

export async function listStudioTracks(): Promise<StudioTrack[]> {
  return api.get<StudioTrack[]>("superadmin/curriculum/tracks");
}

export async function getStudioLessonDetail(lessonId: string): Promise<StudioLesson> {
  return api.get<StudioLesson>(`superadmin/curriculum/lessons/${encodeURIComponent(lessonId)}`);
}

export async function saveStudioLesson(payload: LessonPayload): Promise<StudioLesson> {
  if (payload.id) {
    return api.patch<StudioLesson>(`superadmin/curriculum/lessons/${encodeURIComponent(payload.id)}`, payload);
  }
  return api.post<StudioLesson>("superadmin/curriculum/lessons", payload);
}

export async function deleteStudioLesson(lessonId: string): Promise<{ deleted: boolean; id: string; title: string }> {
  return api.delete(`superadmin/curriculum/lessons/${encodeURIComponent(lessonId)}`);
}

export async function saveStudioModule(payload: ModulePayload): Promise<unknown> {
  return api.post("superadmin/curriculum/modules", payload);
}

export async function reorderStudioLesson(lessonId: string, direction: "up" | "down"): Promise<{ reordered: boolean }> {
  return api.post(`superadmin/curriculum/lessons/${encodeURIComponent(lessonId)}/reorder`, { direction });
}

export async function duplicateStudioLesson(lessonId: string): Promise<StudioLesson> {
  return api.post(`superadmin/curriculum/lessons/${encodeURIComponent(lessonId)}/duplicate`, {});
}

