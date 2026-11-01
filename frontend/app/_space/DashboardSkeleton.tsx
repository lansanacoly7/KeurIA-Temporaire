"use client";

import { useSyncExternalStore } from "react";
import { readSpaceRole } from "../space-home";
import { SpaceSkeleton } from "./SpaceSkeleton";

const noSubscribe = () => () => {};

/** /dashboard sert l'élève et le parent : le rôle mémorisé à la connexion choisit le skeleton. */
export function DashboardSkeleton() {
  const role = useSyncExternalStore(noSubscribe, readSpaceRole, () => null);
  return <SpaceSkeleton kind={role === "parent" ? "parent" : "eleve"} />;
}
