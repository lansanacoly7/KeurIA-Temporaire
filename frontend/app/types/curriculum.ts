export type AgeKey = "7-9" | "10-12" | "13-15";

export type LessonType = "histoire" | "jeu" | "quiz" | "projet" | "atelier";

export interface PilotQuestion {
  question: string;
  options: string[];
  correct: number;
  explain: string;
}

export interface PilotActivity {
  prompt: string;
  options: string[];
  correct: number;
  success: string;
}

export interface LessonContent {
  id?: number;
  mission: string;
  objectives: string[];
  discover: string;
  example: string;
  activity: PilotActivity;
  remember: string[];
  vocabulary: [string, string][];
  challenge: string;
  skill: string;
  questions: PilotQuestion[];
  steps?: unknown[];
}

export type PilotLesson = LessonContent;

export interface Lesson {
  id: string;
  numeric_id?: number;
  title: string;
  type: LessonType;
  minutes: number;
  xp: number;
  stars: number;
  order?: number;
  has_content?: boolean;
  content?: LessonContent;
}

export interface World {
  id: string;
  numeric_id?: number;
  icon: string;
  title: string;
  description: string;
  color: string;
  order?: number;
  lessons: Lesson[];
}

export interface AgeTrack {
  key: AgeKey;
  label: string;
  name: string;
  tagline: string;
  accent: string;
  order?: number;
  worlds: World[];
}

export interface YoungModulePilot {
  theme: string;
  concept: string;
  example: string;
  remember: string[];
  vocabulary: [string, string][];
  missions: string[];
  discoveries: string[];
  activities: PilotActivity[];
  challenges: string[];
  skills: string[];
}
