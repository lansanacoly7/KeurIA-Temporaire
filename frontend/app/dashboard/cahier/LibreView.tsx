"use client";

/*
 * « Libre » : le hub des activités libres (maquette 06). Chaque carte dit si
 * elle est ouverte et, sinon, qui l'a fermée — jamais de blocage muet. Les
 * liens mènent aux ateliers déjà construits (jeux, programmation).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Code2, Gamepad2, Lock, Target } from "lucide-react";
import { libreCards, rulesMessages, type LibreCardKey, type Restrictions } from "./cahierLogic";
import { fetchRestrictions } from "./eleveApi";
import "./cahier.css";

const ICONS: Record<LibreCardKey, typeof Gamepad2> = {
  jeux: Gamepad2,
  scratch: Code2,
  defis: Target,
};

export function LibreView() {
  const [restrictions, setRestrictions] = useState<Restrictions | null>(null);

  useEffect(() => {
    void fetchRestrictions().then(setRestrictions);
  }, []);

  const cards = libreCards(restrictions);
  const messages = rulesMessages(restrictions);

  return (
    <div className="dash-content cahier">
      <header className="cahier-head">
        <span>MON CAHIER DE CLASSE</span>
        <h2>Espace libre</h2>
      </header>

      {messages.length > 0 && (
        <section className="cahier-rules" aria-label="Les règles de ta classe">
          {messages.map(line => (
            <p key={line}>{line}</p>
          ))}
        </section>
      )}

      <div className="cahier-libre">
        {cards.map(card => {
          const Icon = ICONS[card.key];
          const body = (
            <>
              <Icon size={26} aria-hidden="true" />
              <h3>{card.title}</h3>
              <p>{card.blurb}</p>
              {card.closed ? (
                <b className="cahier-closed-tag">
                  <Lock size={14} aria-hidden="true" /> {card.reason}
                </b>
              ) : (
                <b className="cahier-open-tag">Ouvrir</b>
              )}
            </>
          );
          return card.closed ? (
            <article className="cahier-card cahier-libre-card closed" key={card.key}>
              {body}
            </article>
          ) : (
            <Link className="cahier-card cahier-libre-card" href={card.href} key={card.key}>
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
