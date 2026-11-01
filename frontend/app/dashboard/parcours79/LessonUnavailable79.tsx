"use client";

import "./parcours79.css";
import { PalouImg } from "./Img79";
import { sfx } from "./sound";

/**
 * Écran affiché quand une leçon du parcours 7-9 n'a pas de contenu à montrer à l'enfant : par exemple une leçon
 * (identifiant inconnu). L'archipel ne propose pas ces leçons, mais ce filet évite tout écran vide ou erreur si une ancienne adresse
 * ou un ancien enregistrement y mène.
 */
export function LessonUnavailable79({ onClose }: { onClose: () => void }) {
  return (
    <div className="p79 p79-modal-back" role="alertdialog" aria-modal="true" aria-label="Leçon bientôt disponible">
      <div className="p79-modal">
        <PalouImg pose="Reflexion" className="p79-modal-palou" />
        <h3>Cette leçon arrive bientôt !</h3>
        <p>Palou prépare encore cette aventure. Reviens à la carte pour continuer ton voyage.</p>
        <div className="p79-modal-actions">
          <button type="button" className="p79-btn" onClick={() => { sfx.tap(); onClose(); }} autoFocus>
            Retour à la carte
          </button>
        </div>
      </div>
    </div>
  );
}
