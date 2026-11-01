/*
 * Schémas déclaratifs (FieldDef[]) pour l'édition No-Code des items pédagogiques (T22) :
 *   - Énigmes (7-9 ans)
 *   - Défis du jour
 *   - Devoirs (Missions)
 *   - Jeux & Activités
 */
import type { FieldDef } from "./roundSchemas";

export const RIDDLE_FIELDS: FieldDef[] = [
  { kind: "text", key: "lessonId", label: "Identifiant de la leçon liée", hint: "Exemple: p1-1, p2-3 (l'énigme ne sera proposée qu'après cette leçon)." },
  { kind: "text", key: "question", label: "Question de l'énigme", multiline: true, hint: "Question courte formulée pour un enfant de 7-9 ans." },
  { kind: "strings", key: "options", label: "Choix de réponse", hint: "3 options conseillées. La bonne réponse doit figurer dans la liste.", addLabel: "Ajouter une option" },
  { kind: "number", key: "correctIndex", label: "Index de la bonne réponse (0 pour la 1ère, 1 pour la 2ème...)", min: 0, max: 3, hint: "Numéro de l'option exacte dans l'ordre ci-dessus." },
  { kind: "text", key: "explanation", label: "Explication pédagogique", multiline: true, hint: "Affichée à l'enfant après sa réponse pour expliquer pourquoi." },
  { kind: "bool", key: "isActive", label: "Énigme active dans la rotation quotidienne", hint: "Si décoché, cette énigme ne sera pas tirée au sort." },
];

export const DAILY_CHALLENGE_FIELDS: FieldDef[] = [
  { kind: "text", key: "theme", label: "Thème du défi", hint: "Ex: Découverte, Données, Éthique, Logique..." },
  { kind: "text", key: "question", label: "Question du défi", multiline: true, hint: "Question stimulante pour la réflexion quotidienne." },
  { kind: "strings", key: "options", label: "Choix de réponse", hint: "Options claires présentées à l'apprenant.", addLabel: "Ajouter une option" },
  { kind: "number", key: "correctIndex", label: "Index de la bonne réponse (0, 1, 2...)", min: 0, max: 5 },
  { kind: "text", key: "explanation", label: "Explication affichée après réussite", multiline: true },
  { kind: "number", key: "order", label: "Ordre dans la rotation", min: 1 },
  { kind: "bool", key: "isActive", label: "Défi actif dans le roulement quotidien" },
];

export const MISSION_FIELDS: FieldDef[] = [
  { kind: "text", key: "title", label: "Titre du devoir / de la mission" },
  { kind: "text", key: "description", label: "Description / Consignes pédagogiques", multiline: true },
  { kind: "text", key: "category", label: "Catégorie", hint: "Ex: Algorithmes, Vie privée, Société..." },
  {
    kind: "select",
    key: "difficulty",
    label: "Niveau de difficulté",
    options: [
      { value: "Facile", label: "Facile" },
      { value: "Moyen", label: "Moyen" },
      { value: "Difficile", label: "Difficile" },
    ],
  },
  { kind: "number", key: "durationMinutes", label: "Durée estimée (minutes)", min: 5, max: 120 },
  { kind: "number", key: "xp", label: "Points d'XP attribués", min: 0, max: 200 },
  {
    kind: "select",
    key: "track",
    label: "Tranche d'âge",
    options: [
      { value: "7-9", label: "7-9 ans" },
      { value: "10-12", label: "10-12 ans" },
      { value: "13-15", label: "13-15 ans" },
      { value: "", label: "Tous les âges (Mission libre)" },
    ],
  },
  { kind: "bool", key: "active", label: "Mission disponible dans la bibliothèque des enseignants" },
];

export const ACTIVITY_FIELDS: FieldDef[] = [
  { kind: "text", key: "activityId", label: "Identifiant unique de l'activité", hint: "Ex: arcade-game-01, bonus-01" },
  {
    kind: "select",
    key: "kind",
    label: "Type d'activité",
    options: [
      { value: "arcade_game", label: "Jeu d'arcade" },
      { value: "arcade_quiz", label: "Quiz d'arcade" },
      { value: "game_level", label: "Niveau de la carte des jeux" },
      { value: "bonus", label: "Bonus exceptionnel" },
    ],
  },
  { kind: "text", key: "title", label: "Titre de l'activité" },
  { kind: "number", key: "xp", label: "XP attribuée (une seule fois)", min: 5, max: 500 },
  { kind: "bool", key: "isActive", label: "Activité activée sur la plateforme" },
];
