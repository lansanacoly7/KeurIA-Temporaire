"use client";

import { useState, type ReactNode } from "react";
import type { Pose } from "./types";

/**
 * Image du parcours 7-9 avec repli : tant que le fichier n'existe pas (illustrations en cours de création), on affiche
 * Palou sur un fond doux aux couleurs de kEur IA, jamais une image cassée ni un emoji. `alt` décrit l'image ;
 * sans image, le repli est décoratif.
 */
export function Img79({ src, alt, pose = "Content", className = "", fallback, eager = false }: { src?: string; alt?: string; pose?: Pose; className?: string; fallback?: ReactNode; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className={`p79-fallback ${className}`} role={alt ? "img" : undefined} aria-label={alt} aria-hidden={alt ? undefined : true}>
        <PalouImg pose={pose} />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src} alt={alt ?? ""} loading={eager ? "eager" : "lazy"} onError={() => setFailed(true)} />;
}

/** Image d'une leçon : un fichier du site, ou une image envoyée depuis le studio (« media:<id>.<empreinte> », servie par l'API). */
export const lessonImageUrl = (name: string) => {
  const media = /^media:(\d+)\.([0-9a-f]{8})$/.exec(name);
  return media ? `/api/media/${media[1]}/${media[2]}` : `/images/parcours79/lecons/${name}`;
};
export const moduleImageUrl = (moduleNumber: number) => `/images/parcours79/modules/m${String(moduleNumber).padStart(2, "0")}-carte.webp`;
export const moduleBackdropUrl = (moduleNumber: number) => `/images/parcours79/modules/m${String(moduleNumber).padStart(2, "0")}-fond.webp`;
export const stickerUrl = (id: string) => `/images/parcours79/stickers/${id}-sticker.webp`;
export const pictoUrl = (id: string) => `/images/parcours79/pictos/${id}.webp`;

/**
 * Pictogramme d'une réponse : l'enfant voit ce dont on parle (un chat, une mangue, un cadenas…) et le texte le nomme.
 * Tant que l'image n'existe pas, rien ne s'affiche (le bouton reste lisible avec son texte) : jamais d'image cassée.
 */
export function Pict79({ id, className = "" }: { id?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!id || failed) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`p79-pict ${className}`} src={pictoUrl(id)} alt="" aria-hidden="true" draggable={false} onError={() => setFailed(true)} />;
}

/** Palou dans une pose ; les poses existent toutes dans /images/palou. */
export function PalouImg({ pose = "Content", className = "" }: { pose?: Pose; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={`/images/palou/Palou_${pose}.png`} alt="Palou, le petit lion-robot" />;
}
