"use client";

/*
 * « Ma classe » : la classe de l'élève, son enseignant et le classement de la
 * classe de la semaine (T14, GET /api/eleve/classement). Seuls les camarades
 * de SA classe, prénom et initiale ; le serveur refuse (403 « coupé par … »)
 * quand l'école ou la classe a fermé le classement.
 */

import { useCallback, useEffect, useState } from "react";
import { RotateCw, School, Trophy } from "lucide-react";
import { LEVELS, className as classroomLabel, trackLabel } from "../../_scolaire/lib/levels";
import type { LevelCode } from "../../_scolaire/lib/types";
import { myStandingPhrase, type AssignmentsPayload, type ClassBoardResult } from "./cahierLogic";
import { fetchAssignments, fetchClassBoard, fetchToday } from "./eleveApi";
import "./cahier.css";

export function MaClasseView() {
  const [devoirs, setDevoirs] = useState<AssignmentsPayload | null | undefined>(undefined);
  const [track, setTrack] = useState<string | null>(null);
  const [result, setResult] = useState<ClassBoardResult | null>(null);   // null = en cours de chargement

  const loadBoard = useCallback(async () => {
    setResult(null);
    setResult(await fetchClassBoard());
  }, []);

  useEffect(() => {
    void (async () => {
      const [hw, day] = await Promise.all([fetchAssignments(), fetchToday(), loadBoard()]);
      setDevoirs(hw);
      setTrack(day?.track ?? null);
    })();
  }, [loadBoard]);

  const classroom = devoirs?.classroom ?? null;
  const teacher = devoirs?.assignments[0]?.teacherName ?? "Votre enseignant";
  const level = classroom ? LEVELS.find(item => item.code === classroom.level) : undefined;
  // Le parcours effectif (exception de l'enseignant, sinon niveau de la classe) vient du serveur.
  const shownTrack = track ?? level?.track ?? null;

  return (
    <div className="dash-content cahier">
      <header className="cahier-head">
        <span>MON CAHIER DE CLASSE</span>
        <h2>Ma classe</h2>
      </header>

      {classroom ? (
        <section className="cahier-card cahier-class">
          <h3>
            <School size={18} aria-hidden="true" /> Classe de {classroomLabel({ level: classroom.level as LevelCode, section: classroom.section })}
          </h3>
          <p>{level?.label ?? classroom.level}{shownTrack ? ` · Parcours ${trackLabel(shownTrack)}` : ""}</p>
          <p className="cahier-sub">Enseignant : {teacher}</p>
        </section>
      ) : devoirs === undefined ? (
        <p className="cahier-empty" role="status">Ta classe s’ouvre…</p>
      ) : null}

      <section className="cahier-block cahier-board" aria-labelledby="cahier-board-title" aria-busy={result === null}>
        <h3 id="cahier-board-title">
          <Trophy size={18} aria-hidden="true" /> Classement de la classe
        </h3>
        <ClassBoardContent result={result} onRetry={() => void loadBoard()} />
      </section>
    </div>
  );
}

function ClassBoardContent({ result, onRetry }: { result: ClassBoardResult | null; onRetry: () => void }) {
  if (result === null) {
    return (
      <div className="cahier-board-loading" role="status">
        <span className="cahier-skeleton" aria-hidden="true" />
        <span className="cahier-skeleton" aria-hidden="true" />
        <span className="cahier-skeleton" aria-hidden="true" />
        <span className="cahier-sr">Le classement se charge…</span>
      </div>
    );
  }
  if (result.kind === "closed") {
    return <p className="cahier-card cahier-locked" role="status">{result.message}</p>;
  }
  if (result.kind === "no_class") {
    return <p className="cahier-empty">{result.message}</p>;
  }
  if (result.kind === "error") {
    return (
      <div className="cahier-notice cahier-board-error" role="alert">
        <p>Le classement n’a pas pu se charger. Vérifie ta connexion, puis réessaie.</p>
        <button type="button" className="cahier-retry" onClick={onRetry}>
          <RotateCw size={18} aria-hidden="true" /> Réessayer
        </button>
      </div>
    );
  }

  const { board } = result;
  return (
    <>
      <p className="cahier-sub cahier-board-period">
        Points gagnés {board.period.range} ({board.period.label})
      </p>
      {board.entries.length === 0 ? (
        <p className="cahier-empty">Personne n’a encore gagné de points cette semaine. Toi le premier ?</p>
      ) : (
        <table className="cahier-board-table">
          <caption className="cahier-sr">
            {board.scopeLabel} {board.classroom}, {board.period.range}
          </caption>
          <thead>
            <tr>
              <th scope="col">Rang</th>
              <th scope="col">Élève</th>
              <th scope="col">Points</th>
              <th scope="col">Leçons</th>
            </tr>
          </thead>
          <tbody>
            {board.entries.map((entry, index) => (
              <tr key={`${entry.rank}-${index}`} className={entry.isMe ? "me" : undefined} aria-current={entry.isMe ? "true" : undefined}>
                <td><b>{entry.rank}</b></td>
                <th scope="row">
                  {entry.displayName}
                  {entry.isMe && <span className="cahier-me-tag"> (toi)</span>}
                </th>
                <td>{entry.xp}</td>
                <td>{entry.lessons}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="cahier-sub" role="status">{myStandingPhrase(board)}</p>
      <p className="cahier-sub">
        {board.participants} élève{board.participants > 1 ? "s" : ""} sur {board.classSize} {board.participants > 1 ? "ont" : "a"} des points cette semaine.
      </p>
    </>
  );
}
