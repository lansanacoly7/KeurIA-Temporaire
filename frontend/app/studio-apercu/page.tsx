"use client";

import { useEffect, useState } from "react";
import { LessonPlayer79 } from "@/app/dashboard/parcours79/LessonPlayer79";
import type { LessonContent } from "@/app/dashboard/parcours79/types";

type Preview = { content: LessonContent; startAt: number; key: string };

const noop = () => {};

/**
 * Aperçu du studio : le VRAI lecteur de l'enfant, dans un cadre isolé (la taille du cadre simule ordinateur, tablette ou téléphone).
 * Le studio lui envoie le contenu du brouillon par `postMessage` ; seule la page parente (même origine) est écoutée, rien n'est
 * enregistré et la voix est coupée.
 */
export default function StudioPreviewPage() {
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const data = event.data as { type?: string } & Partial<Preview>;
      if (data?.type === "studio79-preview" && data.content) setPreview({ content: data.content, startAt: data.startAt ?? 0, key: data.key ?? "" });
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "studio79-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!preview) return <p style={{ padding: 24, fontFamily: "system-ui", color: "#5b706c" }}>Chargement de l&apos;aperçu…</p>;
  return <LessonPlayer79 key={preview.key} content={preview.content} startAt={preview.startAt} preview firstName="Aminata" onClose={noop} onComplete={noop} />;
}
