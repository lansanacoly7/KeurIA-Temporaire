"use client";

import { useEffect, useRef, useState } from "react";
import { Icon79 } from "./Icons79";
import { useP79Settings } from "./settings";
import { sfx } from "./sound";
import { stopSpeaking, voiceSupported } from "./voice";

interface Props {
  /** Musique des îles (vue archipel) : l'état vit chez l'appelant, qui lance et coupe la musique. */
  music?: { on: boolean; onChange: (on: boolean) => void };
  /** Classe du bouton rond (le cours et l'archipel n'ont pas le même style). */
  buttonClassName?: string;
  size?: number;
}

/**
 * Le bouton de son : un seul, le même dans les cours et sur l'archipel. Il ouvre une petite fenêtre avec de gros interrupteurs :
 * musique (archipel), petits sons et voix de Palou (allumée, Palou parle tout seul à chaque écran ; éteinte, il se tait sauf si on touche « Écouter »). La fenêtre se ferme en touchant ailleurs ou avec Échap.
 */
export function SoundControl79({ music, buttonClassName = "p79-round-btn", size = 28 }: Props) {
  const [settings, update] = useP79Settings();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const anySound = settings.sound || settings.voice || (music?.on ?? false);
  const rows: { id: string; label: string; on: boolean; disabled?: boolean; set: (on: boolean) => void }[] = [];
  if (music) rows.push({ id: "music", label: "Musique", on: music.on, set: music.onChange });
  rows.push({ id: "sound", label: "Petits sons", on: settings.sound, set: on => update({ sound: on }) });
  rows.push({
    id: "voice",
    label: voiceSupported() ? "Voix de Palou" : "Voix de Palou (indisponible ici)",
    on: settings.voice,
    disabled: !voiceSupported(),
    set: on => { update({ voice: on }); if (!on) stopSpeaking(); },
  });

  return (
    <div className="p79-sound" ref={box}>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => { sfx.tap(); setOpen(o => !o); }}
        aria-label="Réglages du son"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Icon79 name={anySound ? "sound" : "mute"} size={size} />
      </button>
      {open && (
        <div className="p79-sound-pop" role="group" aria-label="Réglages du son">
          {rows.map(row => (
            <button
              key={row.id}
              type="button"
              role="switch"
              aria-checked={row.on && !row.disabled}
              disabled={row.disabled}
              className={`p79-sound-row ${row.on && !row.disabled ? "on" : ""}`}
              onClick={() => { row.set(!row.on); sfx.tap(); }}
            >
              <span>{row.label}</span>
              <i className="p79-sound-switch" aria-hidden="true"><b /></i>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
