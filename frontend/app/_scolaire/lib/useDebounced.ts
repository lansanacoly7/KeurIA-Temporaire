"use client";

import { useEffect, useState } from "react";

/** Valeur mise à jour seulement quand l'utilisateur a arrêté de taper. */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
