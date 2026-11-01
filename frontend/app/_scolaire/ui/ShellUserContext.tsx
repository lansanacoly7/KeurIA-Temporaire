"use client";

import { createContext, useContext } from "react";

export type ShellUser = {
  initials: string;
  name: string;
  role: string;
} | null;

const ShellUserContext = createContext<ShellUser>(null);

export const ShellUserProvider = ShellUserContext.Provider;

export function useShellUser(): ShellUser {
  return useContext(ShellUserContext);
}
