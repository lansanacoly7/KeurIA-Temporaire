import { api } from "./http";

export type ProgrammeTrack = {
  key: string;
  label: string;
  name: string;
  classes: string[];
  modules: ProgrammeModule[];
};

export type ProgrammeModule = {
  id: string;
  order: number;
  title: string;
  description: string;
  lessons: ProgrammeLesson[];
};

export type ProgrammeLesson = {
  id: string;
  order: number;
  title: string;
  type: string;
  minutes: number;
  skill: string;
};

export type LessonSheet = {
  id: string;
  order: number;
  title: string;
  type: string;
  minutes: number;
  track: { key: string; label: string };
  module: { id: string; order: number; title: string; description: string };
  previous: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  sheet: {
    mission: string;
    objectives: string[];
    discover: string;
    example: string;
    remember: string[];
    vocabulary: { term: string; definition: string }[];
    challenge: string;
    skill: string;
    questions: { question: string; options: string[]; correct: number; explain: string }[];
  };
  guide: {
    source: "auto" | "redige";
    essential: string[];
    explain: string;
    unplugged: { title: string; minutes: number; materials: string[]; steps: string[] } | null;
    askThem: string[];
    commonMistakes: string[];
  };
  homework: {
    lessonMissionId: string | null;
    reviewMissionId: string | null;
  };
};

export type QuestionStat = {
  index: number;
  question: string;
  answered: number;
  correct: number;
  successRate: number | null;
};

export type ProgrammeResponse = {
  tracks: ProgrammeTrack[];
};

export function getProgramme(): Promise<ProgrammeResponse> {
  return api.get("enseignant/programme");
}

export function getLessonSheet(id: string): Promise<LessonSheet> {
  return api.get(`enseignant/programme/lessons/${id}`);
}
