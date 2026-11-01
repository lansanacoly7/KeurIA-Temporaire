"use client";

import { createContext, useContext } from "react";
import type { School } from "../lib/types";
import { useApi } from "../lib/useApi";

type SchoolContextValue = { school: School | null; reload: () => void };

const SchoolContext = createContext<SchoolContextValue>({ school: null, reload: () => {} });

/**
 * Informations de l'école partagées par le menu et les écrans (rechargées après
 * modification). `load` : la route de l'espace (direction : ecole/school,
 * enseignant : enseignant/school).
 */
export function SchoolProvider({ load, children }: { load: () => Promise<School>; children: React.ReactNode }) {
  const { data, reload } = useApi(load);
  return <SchoolContext.Provider value={{ school: data, reload }}>{children}</SchoolContext.Provider>;
}

export function useSchool(): SchoolContextValue {
  return useContext(SchoolContext);
}
