"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react";
import type { LessonContent } from "@/app/dashboard/parcours79/types";

const DEVICES = {
  desktop: { label: "Ordinateur", icon: Monitor, width: 1280, height: 720 },
  tablet: { label: "Tablette", icon: Tablet, width: 1024, height: 768 },
  phone: { label: "Téléphone", icon: Smartphone, width: 390, height: 760 },
} as const;
type Device = keyof typeof DEVICES;

/**
 * Aperçu fidèle : le vrai lecteur de l'enfant dans un cadre à la taille de l'appareil choisi, réduit pour tenir dans la zone.
 * Changer d'écran dans la liste, ou « Rejouer », relance le lecteur à cet écran ; une modification du texte s'y voit tout de suite.
 */
export function PreviewFrame({ content, screenIndex }: { content: LessonContent; screenIndex: number }) {
  const [device, setDevice] = useState<Device>("desktop");
  const [replay, setReplay] = useState(0);
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const { width, height } = DEVICES[device];
  // Le lecteur repart de l'écran choisi quand on change d'écran ou d'appareil, ou qu'on clique sur « Rejouer ».
  const runKey = `${Math.max(0, screenIndex)}-${device}-${replay}`;

  const send = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: "studio79-preview", content, startAt: Math.max(0, screenIndex), key: runKey }, window.location.origin);
  }, [content, screenIndex, runKey]);

  // L'aperçu dit « prêt » quand il écoute : c'est à ce moment seulement qu'on peut lui envoyer le contenu (un envoi plus tôt serait perdu).
  const sendRef = useRef(send);
  useEffect(() => { sendRef.current = send; }, [send]);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === "studio79-preview-ready") {
        setReady(true);
        sendRef.current();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => { if (ready) send(); }, [ready, send]);

  useLayoutEffect(() => {
    const box = stage.current;
    if (!box) return;
    const measure = () => setScale(Math.min(1, (box.clientWidth - 24) / width, (box.clientHeight - 24) / height) || 0.5);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div className="sx-preview">
      <div className="sx-preview-bar">
        <div className="sx-seg" role="radiogroup" aria-label="Appareil simulé">
          {(Object.keys(DEVICES) as Device[]).map(key => {
            const d = DEVICES[key];
            return <button key={key} type="button" role="radio" aria-checked={device === key} data-on={device === key} onClick={() => setDevice(key)}><d.icon size={15} aria-hidden="true" /> {d.label}</button>;
          })}
        </div>
        <button type="button" className="sx-ghost" onClick={() => setReplay(n => n + 1)}><RotateCcw size={14} aria-hidden="true" /> Rejouer</button>
      </div>
      <div className="sx-stage" ref={stage}>
        <div className="sx-device" data-device={device} style={{ width: width * scale, height: height * scale }}>
          <iframe
            ref={frame} src="/studio-apercu" title="Aperçu de la leçon, tel que l'enfant la verra"
            style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}
          />
        </div>
      </div>
    </div>
  );
}
