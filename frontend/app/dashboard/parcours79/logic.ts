/**
 * Logique pure du parcours 7-9 : aucune dépendance d'exécution (ni React, ni import de valeur), pour être testée seule
 * (frontend/tests/parcours79-logic.test.mjs). Les `import type` sont effacés à la compilation.
 */
import type { LessonState, MapLesson, MapModel, MapModule, ModuleState, ScreenLayout } from "./types";

export interface WorldLike { id: string; lessons: { id: string }[] }

/**
 * État de la carte.
 *  - une leçon est « terminée » si l'enfant l'a finie ;
 *  - la première leçon non terminée est « now » si elle est jouable, « soon » sinon (contenu pas encore écrit) ;
 *  - les suivantes de son module sont « next » (jouables) ou « soon » ;
 *  - un module est verrouillé tant que le précédent n'est pas entièrement terminé.
 * Ainsi un enfant n'est jamais bloqué devant un écran vide : il voit « La suite arrive bientôt ».
 */
export function computeMap(worlds: WorldLike[], completed: string[], isPlayable: (lessonId: string) => boolean, devUnlocked = false): MapModel {
  const done = new Set(completed);
  const modules: MapModule[] = [];
  let previousDone = true;
  let current: MapModel["current"] = null;
  let frontierFound = false;
  let waiting = false;
  let palouAt = 0;

  worlds.forEach((world, index) => {
    const finished = world.lessons.filter(l => done.has(l.id)).length;
    const allDone = finished === world.lessons.length;
    const unlocked = devUnlocked || previousDone;
    const lessons: MapLesson[] = [];
    let seenOpen = false;

    for (const lesson of world.lessons) {
      let state: LessonState;
      if (done.has(lesson.id)) state = "done";
      else if (!unlocked) state = "lock";
      else if (devUnlocked) {
        state = isPlayable(lesson.id) ? "now" : "soon";
      } else if (!seenOpen) {
        seenOpen = true;
        state = isPlayable(lesson.id) ? "now" : "soon";
      } else state = isPlayable(lesson.id) ? "next" : "soon";
      lessons.push({ id: lesson.id, state });
    }

    let moduleState: ModuleState;
    if (allDone) moduleState = "done";
    else if (!unlocked) moduleState = "lock";
    else moduleState = lessons.some(l => l.state === "now") ? "now" : "soon";

    if (moduleState !== "done" && !frontierFound && unlocked) {
      frontierFound = true;
      palouAt = index;
      const now = lessons.find(l => l.state === "now");
      if (now) current = { moduleId: world.id, lessonId: now.id };
      else waiting = true;
    }
    modules.push({ id: world.id, state: moduleState, doneCount: finished, total: world.lessons.length, lessons });
    previousDone = allDone;
  });

  if (!frontierFound) palouAt = Math.max(0, worlds.length - 1); // parcours terminé
  return { modules, current, waitingForContent: waiting, palouAt };
}

/** Étoiles : 3 sans erreur, 2 avec une ou deux erreurs, 1 sinon. Jamais moins de 1 : on ne « rate » pas une leçon. */
export function starsFor(mistakes: number): 1 | 2 | 3 {
  if (mistakes <= 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

/** Score 0-100 envoyé au serveur, dérivé des étoiles (le serveur ne l'utilise pas pour l'XP). */
export function scoreForStars(stars: number): number {
  return stars >= 3 ? 100 : stars === 2 ? 75 : 50;
}

/** Mélange de Fisher-Yates ; ng est injectable pour les tests (voir utils/random.ts). */
export { shuffle } from "../../utils/random";

/** Réduction maximale du contenu d'un écran de leçon : en dessous, la zone de jeu défile au lieu de rapetisser encore. */
export const MIN_SCALE = 0.85;

export interface FitPlan {
  /** Réduction à appliquer (entre MIN_SCALE et 1). */
  scale: number;
  /** Largeur (px, avant réduction) à donner au contenu : plus large que la zone quand il faut gagner en hauteur. */
  width: number;
  /** Hauteur du contenu (px, avant réduction) à cette largeur. */
  needed: number;
  /** Vrai quand, même réduit au minimum, le contenu est plus haut que la zone : elle doit défiler. */
  overflow: boolean;
}

/**
 * Plan de mise en page d'un écran de leçon. Le contenu garde une taille lisible (jamais sous MIN_SCALE) ; avant de le réduire, on lui donne
 * de la largeur (il se réorganise sur plus de colonnes, donc moins haut) ; s'il ne tient toujours pas, la zone défile.
 * `heightAt(largeur)` mesure la hauteur du contenu à une largeur donnée.
 */
export function planFit(available: number, boxWidth: number, heightAt: (width: number) => number, minScale = MIN_SCALE): FitPlan {
  const scaleFor = (needed: number) => Math.max(minScale, Math.min(1, available / needed));
  let width = boxWidth;
  let needed = heightAt(width);
  let scale = scaleFor(needed);

  // Sur grand écran uniquement : essayer d'étaler sur plusieurs colonnes si possible
  if (boxWidth > 640) {
    for (let pass = 0; pass < 4 && scale < 1; pass++) {
      const wider = boxWidth / scale;
      const neededWider = heightAt(wider);
      const scaleWider = scaleFor(neededWider);
      if (scaleWider <= scale + 0.01) break;
      width = wider; needed = neededWider; scale = scaleWider;
    }
  }

  // Sécurité anti-débordement horizontal : la largeur mise à l'échelle ne doit jamais dépasser l'écran
  if (width * scale > boxWidth) {
    scale = boxWidth / width;
  }

  return { scale, width, needed, overflow: needed * scale > available + 1 };
}

/** Minuscules, sans accents ni ponctuation : « À quelle heure ? » → « a quelle heure ». */
export function normalizeSpeech(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface SpeechCheck {
  /** Vrai quand chaque mot-clé attendu est dit et qu'aucun mot à éviter ne l'est. */
  ok: boolean;
  /** Mots-clés attendus qui ont bien été dits (tels qu'écrits dans le contenu). */
  heard: string[];
  /** Mots à éviter qui ont été dits. */
  avoided: string[];
}

/**
 * Compare ce que l'enfant a dit (écrit par la reconnaissance vocale, ou construit avec des cartes) à ce que Palou attend.
 * `need` : une liste de groupes de synonymes ; il faut au moins un mot de chaque groupe. `avoid` : mots qui rendent la phrase vague.
 * Le contrôle porte sur des mots entiers, sans tenir compte des accents ni de la casse.
 */
export function checkSpeech(text: string, need: string[][], avoid: string[] = []): SpeechCheck {
  const words = new Set(normalizeSpeech(text).split(" ").filter(Boolean));
  const has = (word: string) => normalizeSpeech(word).split(" ").every(part => words.has(part));
  const heard = need.flatMap(group => group.filter(has).slice(0, 1));
  const avoided = avoid.filter(has);
  return { ok: need.every(group => group.some(has)) && avoided.length === 0, heard, avoided };
}

/** Remplace {prenom} ; sans prénom, on tutoie simplement (« Toi »). */
export function fillTokens(text: string, firstName: string | null | undefined): string {
  const name = (firstName ?? "").trim();
  if (name) return text.replace(/\{prenom\}/g, name);
  return text.replace(/,?\s*\{prenom\}/g, "").replace(/\s{2,}/g, " ").trim();
}

/** Prononciations forcées pour la voix du navigateur (noms propres qu'elle déforme). */
const PRONUNCIATIONS: [RegExp, string][] = [
  [/\bIA\b/g, "I A"],
  [/\bBaye\b/g, "Baï"],
  [/\bMame\b/g, "Mamé"],
  [/\bKermel\b/g, "Kermèl"],
  [/\bGuet Ndar\b/g, "Guette Ndar"],
  [/\bZiguinchor\b/g, "Ziguinchor"],
  [/\bMme\b/g, "Madame"],
];

/** Texte réellement lu : emoji retirés, prononciations corrigées, pastilles wolof exclues. */
export function speakable(text: string): string {
  let out = text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  for (const [pattern, spoken] of PRONUNCIATIONS) out = out.replace(pattern, spoken);
  return out;
}

/** Nombre de mots de chaque phrase (pour vérifier la lisibilité 7-9 ans). */
export function sentenceLengths(text: string): number[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map(s => s.trim().split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word)).length)
    .filter(n => n > 0);
}

/**
 * Repli sur petits écrans (≤ 640 px) :
 * « left » et « right » se replient en « top » (image au-dessus du texte) ; « bottom » reste « bottom ».
 */
export function foldLayoutForSmallScreen(layout?: ScreenLayout | null): ScreenLayout | undefined {
  if (!layout || typeof layout !== "object") return undefined;
  const folded = { ...layout };
  if (folded.image === "left" || folded.image === "right") {
    folded.image = "top";
  }
  return folded;
}

/**
 * Classes CSS de mise en page pour la ligne .p79-top-row.
 * Retourne les classes correspondantes, ou un tableau vide pour la mise en page par défaut.
 * Ignore silencieusement toute valeur inconnue.
 */
export function layoutClasses(layout?: ScreenLayout | null, options?: { smallScreen?: boolean }): string[] {
  if (!layout || typeof layout !== "object") return [];
  const effective = options?.smallScreen ? foldLayoutForSmallScreen(layout) : layout;
  if (!effective) return [];
  const classes: string[] = [];

  if (effective.image === "left") classes.push("p79-img-left");
  else if (effective.image === "top") classes.push("p79-img-top");
  else if (effective.image === "bottom") classes.push("p79-img-bottom");

  if (effective.imageSize === "s") classes.push("p79-img-s");
  else if (effective.imageSize === "l") classes.push("p79-img-l");

  if (effective.textSize === "sm") classes.push("p79-ts-sm");
  else if (effective.textSize === "lg") classes.push("p79-ts-lg");
  else if (effective.textSize === "xl") classes.push("p79-ts-xl");

  if (effective.align === "center") classes.push("p79-al-center");

  return classes;
}

/**
 * Classes CSS de mise en page pour un écran spécifique :
 * un écran sans image ignore les paramètres image et imageSize (seuls textSize et align s'appliquent).
 */
export function screenLayoutClasses(layout?: ScreenLayout | null, hasImage = false, options?: { smallScreen?: boolean }): string[] {
  if (!layout || typeof layout !== "object") return [];
  if (!hasImage) {
    return layoutClasses({ textSize: layout.textSize, align: layout.align }, options);
  }
  return layoutClasses(layout, options);
}

/**
 * Met à jour un champ du layout d'un écran.
 * La valeur par défaut n'écrit rien : si tous les champs reviennent à leurs valeurs par défaut,
 * la fonction renvoie `undefined` (l'écran n'a plus de layout).
 */
export function updateScreenLayout(
  current: ScreenLayout | undefined,
  patch: Partial<ScreenLayout>
): ScreenLayout | undefined {
  const merged: ScreenLayout = { ...(current || {}), ...patch };

  // Nettoyer les clés qui valent la valeur par défaut
  if (merged.image === "right") delete merged.image;
  if (merged.imageSize === "m") delete merged.imageSize;
  if (merged.textSize === "md") delete merged.textSize;
  if (merged.align === "left") delete merged.align;

  // Supprimer les clés indéfinies
  for (const k of Object.keys(merged) as (keyof ScreenLayout)[]) {
    if (merged[k] === undefined) delete merged[k];
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

/**
 * Rétablit la mise en page par défaut : supprime entièrement le champ layout.
 */
export function resetScreenLayout(): undefined {
  return undefined;
}

/**
 * Analyse une URL vidéo (YouTube ou Vimeo) et retourne une URL d'intégration sandboxée stricte.
 * Retourne null si le domaine n'est pas autorisé ou si l'identifiant ne peut être extrait.
 */
export function parseVideoEmbedUrl(url: string): { provider: "youtube" | "vimeo"; embedUrl: string; videoId: string } | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    // YouTube
    if (
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com" ||
      host === "www.youtube-nocookie.com"
    ) {
      let id = parsed.searchParams.get("v");
      if (!id && (parsed.pathname.startsWith("/embed/") || parsed.pathname.startsWith("/v/"))) {
        id = parsed.pathname.split("/")[2];
      }
      if (id && /^[\w-]{10,12}$/.test(id)) {
        return {
          provider: "youtube",
          videoId: id,
          embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
        };
      }
    } else if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      if (id && /^[\w-]{10,12}$/.test(id)) {
        return {
          provider: "youtube",
          videoId: id,
          embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
        };
      }
    }

    // Vimeo
    if (host === "vimeo.com" || host === "www.vimeo.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      if (id && /^\d+$/.test(id)) {
        return {
          provider: "vimeo",
          videoId: id,
          embedUrl: `https://player.vimeo.com/video/${id}`,
        };
      }
    } else if (host === "player.vimeo.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      if (id && /^\d+$/.test(id)) {
        return {
          provider: "vimeo",
          videoId: id,
          embedUrl: `https://player.vimeo.com/video/${id}`,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Résout une référence de média (media:<id>.<empreinte>, chemin absolu/URL ou image de leçon).
 */
export function resolveMediaSource(refOrUrl: string): string {
  if (!refOrUrl || typeof refOrUrl !== "string") return "";
  const trimmed = refOrUrl.trim();
  const match = trimmed.match(/^media:(\d+)\.([0-9a-f]{8})$/);
  if (match) {
    return `/api/media/${match[1]}/${match[2]}`;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }
  return `/images/parcours79/lecons/${trimmed}`;
}



