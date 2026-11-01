import { AgeKey, AgeTrack, Lesson, LessonContent } from "../types/curriculum";
import { tracks as fallbackTracks } from "../lms-data";

// In-memory cache for ultra-fast client-side transitions
let cachedOverview: Record<AgeKey, AgeTrack> | null = null;
const cachedLessonContent: Map<string, LessonContent> = new Map();

/**
 * Charge l'ensemble des parcours et mondes depuis la base de données Django.
 */
export async function fetchCurriculumOverview(): Promise<Record<AgeKey, AgeTrack>> {
  if (cachedOverview) {
    return cachedOverview;
  }

  try {
    const res = await fetch("/api/curriculum/overview/", {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      cache: "no-cache",
    });

    if (!res.ok) {
      throw new Error(`Curriculum overview HTTP error: ${res.status}`);
    }

    const data = (await res.json()) as Record<AgeKey, AgeTrack>;
    cachedOverview = data;
    return data;
  } catch (err) {
    console.warn("[curriculum-api] Utilisation du catalogue de secours local :", err);
    return fallbackTracks as unknown as Record<AgeKey, AgeTrack>;
  }
}

/**
 * Charge un parcours spécifique par clé d'âge (ex: '7-9').
 */
export async function fetchCurriculumTrack(ageKey: AgeKey): Promise<AgeTrack | null> {
  try {
    const res = await fetch(`/api/curriculum/tracks/${ageKey}/`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Curriculum track HTTP error: ${res.status}`);
    }

    return (await res.json()) as AgeTrack;
  } catch (err) {
    console.warn(`[curriculum-api] Erreur lors du chargement du parcours ${ageKey} :`, err);
    const overview = await fetchCurriculumOverview();
    return overview[ageKey] || null;
  }
}

/**
 * Récupère le contenu riche d'une leçon (scénario, QCM, activités) directement depuis la BDD.
 */
export async function fetchLessonDetail(lessonId: string): Promise<Lesson | null> {
  try {
    const res = await fetch(`/api/curriculum/lessons/${lessonId}/`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Lesson detail HTTP error: ${res.status}`);
    }

    const lesson = (await res.json()) as Lesson;
    if (lesson.content) {
      cachedLessonContent.set(lessonId, lesson.content);
    }
    return lesson;
  } catch (err) {
    console.warn(`[curriculum-api] Erreur lors du chargement de la leçon ${lessonId} :`, err);
    return null;
  }
}

/**
 * Récupère le contenu pédagogique d'une leçon à partir du cache ou via un appel API asynchrone.
 */
export async function getLessonContent(lessonId: string): Promise<LessonContent | null> {
  if (cachedLessonContent.has(lessonId)) {
    return cachedLessonContent.get(lessonId)!;
  }

  const lesson = await fetchLessonDetail(lessonId);
  return lesson?.content || null;
}
