"use client";

import { useEffect } from "react";
import { reportClientError } from "./utils/reportClientError";

/** Écoute les erreurs JavaScript non rattrapées de la page et les signale au serveur (invisible pour l'enfant). */
export default function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => reportClientError("error", event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => reportClientError("unhandledrejection", event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
