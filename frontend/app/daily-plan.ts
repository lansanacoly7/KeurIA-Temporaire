import type { AgeKey } from "./lms-data";

export type DailyKind="minute"|"lesson"|"quiz"|"game";
export type DailyUsage={minutes:number;lessons:number;quizzes:number;games:number};
export type DailyPlan=DailyUsage;

export const dailyPlans:Record<AgeKey,DailyPlan>={
  "7-9":{minutes:45,lessons:2,quizzes:3,games:1},
  "10-12":{minutes:60,lessons:3,quizzes:4,games:2},
  "13-15":{minutes:60,lessons:3,quizzes:4,games:2},
};

export const emptyDailyUsage:DailyUsage={minutes:0,lessons:0,quizzes:0,games:0};
export const isAgeKey=(value:string):value is AgeKey=>value==="7-9"||value==="10-12"||value==="13-15";
