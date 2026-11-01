"use client";

import { useCallback, useEffect, useState } from "react";

type ApiState<T> = { data: T | null; error: string | null; loading: boolean };

/**
 * Charge une ressource via ecoleApi et expose { data, error, loading, reload }.
 * `load` doit être stable (useCallback) ou déclaré hors du composant.
 */
export function useApi<T>(load: () => Promise<T>): ApiState<T> & { reload: () => void } {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load()
      .then(data => { if (!cancelled) setState({ data, error: null, loading: false }); })
      .catch((error: unknown) => {
        if (!cancelled) setState({ data: null, error: error instanceof Error ? error.message : "Erreur inattendue.", loading: false });
      });
    return () => { cancelled = true; };
  }, [load, version]);

  const reload = useCallback(() => {
    setState(previous => ({ ...previous, loading: true }));
    setVersion(v => v + 1);
  }, []);

  return { ...state, reload };
}
