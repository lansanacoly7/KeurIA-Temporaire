"use client";

import "./parcours79.css";
import "./adventure79.css";
import { useEffect, useState } from "react";
import { Icon79 } from "./Icons79";
import { PalouImg } from "./Img79";
import { sfx } from "./sound";
import { burstAt } from "./fx";
import { dayKey, tipOfTheDay } from "./tips79";

const storageKey = (scope: string) => `p79-tip-done:${scope}`;

/**
 * « Le conseil de Palou » : un conseil par jour, qui change à minuit. Quand l'enfant touche « J'ai compris », la carte disparaît de
 * l'accueil jusqu'à demain (elle ne reste jamais pour alourdir la page). Le jour validé est gardé dans le navigateur de l'enfant.
 */
export function DailyTip79({ scope }: { scope: string }) {
  const [today, setToday] = useState<string | null>(null);
  const [doneDay, setDoneDay] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    const refresh = () => setToday(dayKey());
    refresh();
    try { setDoneDay(window.localStorage.getItem(storageKey(scope))); } catch { /* stockage bloqué : le conseil reste affiché */ }
    const timer = window.setInterval(refresh, 60_000); // passe à minuit même si la page reste ouverte
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [scope]);

  if (!today || doneDay === today) return null;
  const tip = tipOfTheDay();

  const validate = (button: HTMLElement | null) => {
    sfx.ok();
    void burstAt(button);
    setThanks(true);
    try { window.localStorage.setItem(storageKey(scope), today); } catch { /* sans importance */ }
    window.setTimeout(() => setDoneDay(today), 1400);
  };

  return (
    <section className="p79 a79 a79-tip" aria-labelledby="a79-tip-title" style={{ marginBottom: 40 }}>
      <div className="a79-card" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div className="a79-tip-palou" aria-hidden="true"><PalouImg pose={thanks ? "Celebration" : "Encouragement"} /></div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <span className="p79-eyebrow">Le conseil de Palou · {tip.theme}</span>
          <h2 id="a79-tip-title" style={{ margin: "8px 0 4px", fontSize: 26 }}>{tip.title}</h2>
          <p style={{ margin: 0, fontSize: 19, lineHeight: 1.4 }}>{tip.text}</p>
        </div>
        <button type="button" className="p79-btn" disabled={thanks} onClick={e => validate(e.currentTarget)}>
          <Icon79 name="check" size={24} /> {thanks ? "Bravo !" : "J’ai compris"}
        </button>
      </div>
    </section>
  );
}
