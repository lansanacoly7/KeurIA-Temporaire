"use client";

import "./parcours79.css";
import { useEffect, useMemo, useState } from "react";
import type { World } from "../../lms-data";
import { getChapter, isPlayable } from "./content";
import { Icon79 } from "./Icons79";
import { Img79, PalouImg, stickerUrl } from "./Img79";
import { computeMap } from "./logic";
import { startStudioRefresh } from "./studioContent";
import { Archipel79 } from "./Archipel79";
import { sfx } from "./sound";
import { isDevMode } from "../../utils/devMode";
import { ScrollDownHint } from "../components/ScrollDownHint";

interface Props {
  worlds: World[];
  completed: string[];
  lessonStars: Record<string, number>;
  onStartLesson: (lessonId: string, worldId: string) => void;
  /** Identifiant local de l'enfant : l'archipel retient où en est Palou pour chaque enfant. */
  scope?: string;
}

/** Identifiant de l'autocollant d'un chapitre (« m01 » … « m10 »). */
const stickerId = (chapter: number) => `m${String(chapter).padStart(2, "0")}`;

/**
 * La page « Mes modules » : l'archipel (une grande carte avec les 10 îles), le titre, les étoiles et l'album d'autocollants.
 * Il n'y a plus de vue « Carte » (sentier) : une sauvegarde locale non poussée est dans frontend/local-only/carte79/.
 */
export function ModuleMap79({ worlds: initialWorlds, completed, lessonStars, onStartLesson, scope }: Props) {
  const [worlds, setWorlds] = useState<World[]>(initialWorlds);

  useEffect(() => {
    setWorlds(initialWorlds);
  }, [initialWorlds]);

  useEffect(() => {
    let active = true;
    fetch("/api/curriculum/tracks/7-9/")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!active || !data || !Array.isArray(data.worlds) || data.worlds.length === 0) return;
        setWorlds(data.worlds);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const model = useMemo(() => computeMap(worlds, completed, isPlayable, isDevMode()), [worlds, completed]);
  const [album, setAlbum] = useState<number | null>(null);

  const totalLessons = worlds.reduce((n, w) => n + w.lessons.length, 0);
  const doneLessons = model.modules.reduce((n, m) => n + m.doneCount, 0);
  const starsOf = (lessonId: string) => (completed.includes(lessonId) ? Math.max(1, lessonStars[lessonId] ?? 0) : 0);
  const totalStars = worlds.flatMap(w => w.lessons).reduce((n, l) => n + starsOf(l.id), 0);
  const stickersWon = model.modules.filter(m => m.state === "done").length;

  useEffect(() => {
    // Premier affichage du parcours 7-9 : on va chercher les leçons publiées depuis le studio, puis on le refait
    // au retour sur l'onglet et toutes les 5 minutes (voir studioContent.ts).
    return startStudioRefresh();
  }, []);

  useEffect(() => {
    if (album === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAlbum(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [album]);

  return (
    <div className="p79 p79-map voyage">
      <header className="p79-map-head">
        <div>
          <span className="p79-eyebrow">Parcours 7-9 ans</span>
          <h2>L’île des Petits Explorateurs</h2>
        </div>
        <div className="p79-chips" aria-label="Ta progression">
          <span className="p79-chip-big" title="Étoiles gagnées"><Icon79 name="star" size={26} className="gold" /> {totalStars}</span>
          <span className="p79-chip-big" title="Leçons terminées"><Icon79 name="graduation" size={26} /> {doneLessons}/{totalLessons}</span>
        </div>
      </header>

      <section className="p79-album" aria-labelledby="p79-album-title">
        <div className="p79-album-head">
          <h3 id="p79-album-title">Mon album d’autocollants</h3>
          <span className="p79-chip-big" title="Autocollants gagnés"><Icon79 name="sparkles" size={24} /> {stickersWon}/{worlds.length}</span>
        </div>
        <div className="p79-album-row">
          {worlds.map((world, i) => {
            const won = model.modules[i].state === "done";
            return (
              <button
                key={world.id}
                type="button"
                className={`p79-slot ${won ? "won" : "empty"}`}
                onClick={() => { sfx.tap(); setAlbum(i); }}
                aria-label={won ? `Autocollant du chapitre ${i + 1} : gagné` : `Autocollant du chapitre ${i + 1} : à gagner`}
              >
                <Img79 eager src={stickerUrl(stickerId(i + 1))} fallback={<span className="p79-slot-n">{i + 1}</span>} />
                <b className="p79-slot-label">{i + 1}</b>
              </button>
            );
          })}
        </div>
      </section>

      <Archipel79
        worlds={worlds}
        model={model}
        completed={completed}
        lessonStars={lessonStars}
        onStartLesson={onStartLesson}
        scope={scope}
      />

      {album !== null && worlds[album] && (
        <div className="p79-sheet-back" onClick={e => { if (e.target === e.currentTarget) setAlbum(null); }}>
          <div className="p79-modal p79-album-modal" role="dialog" aria-modal="true" aria-label={`Autocollant du chapitre ${album + 1}`}>
            <div className={`p79-album-big ${model.modules[album].state === "done" ? "won" : "empty"}`}>
              <Img79 eager src={stickerUrl(stickerId(album + 1))} fallback={<PalouImg pose="Content" />} />
            </div>
            <h3>{getChapter(worlds[album].id)?.module.title ?? worlds[album].title}</h3>
            {model.modules[album].state === "done" ? (
              <p>Bravo ! Tu as gagné cet autocollant en finissant le chapitre {album + 1}.</p>
            ) : (
              <p>Termine les {worlds[album].lessons.length} leçons du chapitre {album + 1} pour gagner cet autocollant.</p>
            )}
            <div className="p79-modal-actions">
              <button type="button" className="p79-btn" onClick={() => { sfx.tap(); setAlbum(null); }}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      <ScrollDownHint scrollOffset={420} ariaLabel="Faire défiler vers la carte des modules" />
    </div>
  );
}
