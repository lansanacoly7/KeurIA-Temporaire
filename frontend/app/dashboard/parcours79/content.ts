import type { ChapterContent, LessonContent } from "./types";
import { getStudioLesson } from "./studioContent";
import chapter01 from "../../../content/parcours79/m01.json";
import chapter02 from "../../../content/parcours79/m02.json";
import chapter03 from "../../../content/parcours79/m03.json";
import chapter04 from "../../../content/parcours79/m04.json";
import chapter05 from "../../../content/parcours79/m05.json";
import chapter06 from "../../../content/parcours79/m06.json";
import chapter07 from "../../../content/parcours79/m07.json";
import chapter08 from "../../../content/parcours79/m08.json";
import chapter09 from "../../../content/parcours79/m09.json";
import chapter10 from "../../../content/parcours79/m10.json";

/**
 * Contenu du parcours 7-9, un fichier par chapitre : frontend/content/parcours79/mXX.json.
 * Pour ajouter un chapitre : créer le fichier, l'importer ici, l'ajouter à CHAPTERS ; `manage.py check_parcours79` le contrôle.
 * Les leçons modifiées dans le studio remplacent le JSON embarqué : voir studioContent.ts.
 */
const CHAPTERS = [chapter01, chapter02, chapter03, chapter04, chapter05, chapter06, chapter07, chapter08, chapter09, chapter10] as unknown as ChapterContent[];

/** Leçons de l'ancien lecteur, jouables tant que leur chapitre n'a pas été réécrit (elles disparaissent au fil des chapitres). */
export const LEGACY_PLAYABLE: ReadonlySet<string> = new Set([]);

/** Noms affichés des personnages (légende « Moussa dit : »). */
export const CAST_LABELS: Record<string, string> = {
  palou: "Palou", moussa: "Moussa", fatou: "Fatou", "mme-diop": "Madame Diop", "mame-awa": "Mame Awa",
  "papa-ibou": "Papa Ibou", "tonton-cheikh": "Tonton Cheikh", baye: "Baye", "mame-coumba": "Mame Coumba",
};

export function getChapter(moduleId: string): ChapterContent | undefined {
  return CHAPTERS.find(chapter => chapter.module.id === moduleId);
}

/**
 * Contenu d'une leçon : la version publiée depuis le studio d'abord (si elle est en mémoire, voir studioContent.ts),
 * sinon le JSON embarqué. Le titre vient toujours du catalogue serveur ; `getChapter`, `isPlayable` et `computeMap`
 * ne changent pas de comportement.
 */
export function getLessonContent(lessonId: string): LessonContent | undefined {
  const studio = getStudioLesson(lessonId);
  if (studio) return studio;
  for (const chapter of CHAPTERS) {
    const lesson = chapter.lessons.find(l => l.id === lessonId);
    if (lesson) return lesson;
  }
  return undefined;
}

/** Vrai si l'enfant peut jouer cette leçon (nouveau contenu, leçon du studio ou ancienne leçon encore en service). */
export function isPlayable(lessonId: string): boolean {
  return getLessonContent(lessonId) !== undefined || LEGACY_PLAYABLE.has(lessonId) || /^p\d{1,2}-\d{1,2}$/.test(lessonId);
}
