"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { Hand } from "lucide-react";
import type { CleanupRound, ChooseRound, FocusRound, LayersRound, LensRound, LoupeRound, MachineRound, MultiRound, ProbeRound, ShieldRound, RelabelRound, Round, RuleSortRound, SortRound, SpeakRound, TrainRound, VerifyRound, WhoisRound } from "./types";
import { burstAt } from "./fx";
import { Icon79 } from "./Icons79";
import { Pict79, pictoUrl } from "./Img79";
import { checkSpeech, normalizeSpeech, shuffle } from "./logic";
import { sfx } from "./sound";
import { lessonClipSrc, speakLesson } from "./voice";

/**
 * Activités tactiles du parcours 7-9. Règles : tout se touche (jamais de glisser-déposer), une erreur ne fait jamais « échouer »
 * (elle est expliquée, et compte seulement pour les étoiles), la bonne réponse change de place à chaque partie.
 * Aucun emoji : chaque choix est un gros bouton en relief avec sa lettre (A, B, C…), comme une vraie borne de jeu.
 */

/** Où trouver les enregistrements de la manche (leçon, numéro d'écran, numéro de manche, à partir de 1). */
export type RoundVoice = { lessonId: string; screen: number; round: number };

interface RoundProps<R> { round: R; voice?: RoundVoice; onMistake: () => void; onDone: () => void }

type Feedback = { ok: boolean; text: string } | null;

/**
 * Palou dit une réaction de la manche avec sa voix officielle (fichier `eNN-mM-<suffixe>`, ou `commun_…` pour une phrase commune).
 * Si le fichier n'existe pas encore, `text` est lu par la voix du navigateur.
 */
function sayRound(voice: RoundVoice | undefined, suffix: string, text: string) {
  if (!voice) return;
  const key = suffix.startsWith("commun_") ? suffix : `e${String(voice.screen).padStart(2, "0")}-m${voice.round}-${suffix}`;
  void speakLesson([{ src: lessonClipSrc(voice.lessonId, key), text }]);
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function FeedbackBox({ feedback, hint }: { feedback: Feedback; hint?: string }) {
  return (
    <div className="p79-feedback-zone" role="status" aria-live="polite">
      {feedback && (
        <div className={`p79-feedback ${feedback.ok ? "ok" : "no"}`}>
          <span className="p79-feedback-ico"><Icon79 name={feedback.ok ? "check" : "help"} size={26} /></span>
          <span>{feedback.text}</span>
        </div>
      )}
      {hint && (
        <div className="p79-hint">
          <span className="p79-feedback-ico"><Icon79 name="bulb" size={24} /></span>
          <span>{hint}</span>
        </div>
      )}
    </div>
  );
}

function ChooseRoundView({ round, voice, onMistake, onDone }: RoundProps<ChooseRound>) {
  const [order] = useState(() => shuffle(round.options.map((_, i) => i)));
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const pick = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    if (solved !== null || wrong.includes(index)) return;
    const option = round.options[index];
    if (option.correct) {
      setSolved(index);
      sfx.ok();
      void burstAt(event.currentTarget);
      setFeedback({ ok: true, text: round.success });
      sayRound(voice, "ok", round.success);
      onDone();
    } else {
      setWrong(w => [...w, index]);
      onMistake();
      sfx.almost();
      const text = option.explain ?? "Presque ! Regarde encore.";
      setFeedback({ ok: false, text });
      sayRound(voice, option.explain ? `o${index + 1}` : "commun_presque-regarde", text);
    }
  };

  return (
    <div>
      <div className="p79-options" role="group" aria-label={round.prompt}>
        {order.map((i, position) => {
          const option = round.options[i];
          const state = solved === i ? "ok" : wrong.includes(i) ? "no" : "";
          const letter = LETTERS[position] || String(position + 1);
          return (
            <button
              key={i}
              type="button"
              className={`p79-opt ${state}`}
              onClick={e => pick(i, e)}
              aria-pressed={solved === i}
              aria-label={`Choix ${letter} : ${option.label}${state === "ok" ? " (bonne réponse)" : state === "no" ? " (déjà essayé)" : ""}`}
            >
              <span className="p79-letter" aria-hidden="true">{state === "ok" ? <Icon79 name="check" size={22} /> : letter}</span>
              <Pict79 id={option.pict} />
              <span className="p79-opt-label">{option.label}</span>
            </button>
          );
        })}
      </div>
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && solved === null ? round.hint : undefined} />
    </div>
  );
}

function MultiRoundView({ round, voice, onMistake, onDone }: RoundProps<MultiRound>) {
  const [order] = useState(() => shuffle(round.options.map((_, i) => i)));
  const [found, setFound] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const total = round.options.filter(o => o.correct).length;

  const pick = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    if (found.includes(index) || wrong.includes(index)) return;
    const option = round.options[index];
    if (option.correct) {
      const next = [...found, index];
      setFound(next);
      sfx.ok();
      void burstAt(event.currentTarget);
      if (next.length === total) {
        setFeedback({ ok: true, text: round.success });
        sayRound(voice, "ok", round.success);
        onDone();
      } else {
        setFeedback({ ok: true, text: `Oui ! Encore ${total - next.length}.` });
      }
    } else {
      setWrong(w => [...w, index]);
      onMistake();
      sfx.almost();
      const text = option.explain ?? "Presque ! Regarde encore.";
      setFeedback({ ok: false, text });
      sayRound(voice, option.explain ? `o${index + 1}` : "commun_presque-regarde", text);
    }
  };

  return (
    <div>
      <div className="p79-options" role="group" aria-label={round.prompt}>
        {order.map((i, position) => {
          const option = round.options[i];
          const state = found.includes(i) ? "ok" : wrong.includes(i) ? "no" : "";
          const letter = LETTERS[position] || String(position + 1);
          return (
            <button
              key={i}
              type="button"
              className={`p79-opt ${state}`}
              onClick={e => pick(i, e)}
              aria-pressed={found.includes(i)}
              aria-label={`Choix ${letter} : ${option.label}${state === "ok" ? " (validé)" : state === "no" ? " (non valide)" : ""}`}
            >
              <span className="p79-letter" aria-hidden="true">{state === "ok" ? <Icon79 name="check" size={22} /> : letter}</span>
              <Pict79 id={option.pict} />
              <span className="p79-opt-label">{option.label}</span>
            </button>
          );
        })}
      </div>
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && found.length < total ? round.hint : undefined} />
    </div>
  );
}

/** Une carte d'objet : se touche pour la choisir, ou se glisse vers une boîte. */
function ItemCard({ item, selected, onSelect, ghost = false, ghostWidth, ghostHeight, ghostScale = 1 }: { item: SortRound["items"][number]; selected: boolean; onSelect: () => void; ghost?: boolean; ghostWidth?: number; ghostHeight?: number; ghostScale?: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id, disabled: ghost });
  return (
    <button
      ref={ghost ? undefined : setNodeRef} type="button" data-item={item.id}
      className={`p79-item ${selected ? "on" : ""} ${isDragging ? "dragging" : ""} ${ghost ? "ghost" : ""}`}
      // L'image glissée vit hors de l'écran réduit du lecteur : on lui rend la taille que la carte a vraiment à l'écran.
      style={ghost ? { width: ghostWidth, height: ghostHeight, transform: `scale(${ghostScale})`, transformOrigin: "top left" } : undefined}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Objet à classer : ${item.label}${selected ? " (sélectionné pour classement)" : ""}`}
      {...(ghost ? {} : { ...attributes, ...listeners })}
    >
      <Pict79 id={item.pict} />
      <span className="p79-opt-label">{item.label}</span>
    </button>
  );
}

/** Une boîte : un vrai bouton en relief, qui reçoit les objets glissés ou touchés. */
function BinBox({ bin, k, ready, over, onChoose, children }: { bin: SortRound["bins"][number]; k: number; ready: boolean; over: boolean; onChoose: (e: MouseEvent<HTMLButtonElement>) => void; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `bin:${bin.id}` });
  return (
    <button ref={setNodeRef} type="button" data-bin={bin.id} className={`p79-bin b${k % 2} ${ready ? "ready" : ""} ${isOver || over ? "over" : ""}`} onClick={onChoose} aria-label={`Boîte : ${bin.label}`}>
      <span className="p79-bin-title"><Pict79 id={bin.pict} />{bin.label}</span>
      <span className="p79-bin-slot" data-slot={bin.id}>{children}</span>
    </button>
  );
}

function SortRoundView({ round, voice, onMistake, onDone }: RoundProps<SortRound>) {
  const [order] = useState(() => shuffle(round.items.map((_, i) => i)));
  const [selected, setSelected] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [dragging, setDragging] = useState<{ id: string; width: number; height: number; scale: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => setMounted(true), []);
  const [demo, setDemo] = useState<{ x0: number; y0: number; x1: number; y1: number; pict?: string } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const remaining = round.items.filter(item => !placed[item.id]);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const chooseItem = (id: string) => {
    sfx.tap();
    setSelected(current => (current === id ? null : id));
  };

  /** Range un objet dans une boîte (par un toucher ou un glisser-déposer). */
  const place = (itemId: string, binId: string) => {
    const item = round.items.find(i => i.id === itemId);
    if (!item) return;
    const bin = root.current?.querySelector<HTMLElement>(`[data-bin="${binId}"]`) ?? null;
    if (item.bin === binId) {
      const next = { ...placed, [item.id]: binId };
      setPlaced(next);
      setSelected(null);
      sfx.ok();
      void burstAt(bin);
      if (Object.keys(next).length === round.items.length) {
        setFeedback({ ok: true, text: round.success });
        sayRound(voice, "ok", round.success);
        onDone();
      } else {
        setFeedback({ ok: true, text: item.explain ?? "Bien rangé !" });
      }
    } else {
      setMistakes(m => m + 1);
      onMistake();
      setSelected(null);
      sfx.almost();
      const text = item.explain ? `Presque ! ${item.explain}` : "Presque ! Essaie l’autre boîte.";
      setFeedback({ ok: false, text });
      sayRound(voice, item.explain ? `i${round.items.indexOf(item) + 1}` : "commun_presque-boite", text);
    }
  };

  const chooseBin = (binId: string) => {
    if (!selected) {
      setFeedback({ ok: false, text: "Glisse un objet dans une boîte, ou touche d’abord l’objet puis sa boîte." });
      return;
    }
    place(selected, binId);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const over = e.over ? String(e.over.id) : "";
    if (over.startsWith("bin:")) place(String(e.active.id), over.slice(4));
  };

  // La main de démonstration : elle montre un objet qu'on glisse dans sa boîte, en boucle, jusqu'au premier geste de l'enfant.
  const first = order.map(i => round.items[i]).find(item => !placed[item.id]);
  useLayoutEffect(() => {
    const box = root.current;
    if (!box || !first || touched) { setDemo(null); return; }
    const measure = () => {
      const from = box.querySelector<HTMLElement>(`[data-item="${first.id}"] img, [data-item="${first.id}"]`);
      const to = box.querySelector<HTMLElement>(`[data-slot="${first.bin}"]`);
      if (!from || !to) return;
      const a = box.getBoundingClientRect();
      const f = from.getBoundingClientRect();
      const t = to.getBoundingClientRect();
      const size = 84;
      // Le lecteur réduit l'écran pour qu'il tienne : les positions mesurées à l'écran sont ramenées à l'échelle de la page.
      const k = box.offsetWidth > 0 ? a.width / box.offsetWidth : 1;
      setDemo({ x0: (f.left - a.left + f.width / 2) / k - size / 2, y0: (f.top - a.top + f.height / 2) / k - size / 2, x1: (t.left - a.left + t.width / 2) / k - size / 2, y1: (t.top - a.top + t.height / 2) / k - size / 2, pict: first.pict });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [first, touched]);

  const activeItem = dragging ? round.items.find(i => i.id === dragging.id) : undefined;

  return (
    <div className="p79-sort" ref={root} onPointerDownCapture={() => setTouched(true)} onKeyDownCapture={() => setTouched(true)}>
      <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => {
        const id = String(e.active.id);
        const node = root.current?.querySelector<HTMLElement>(`[data-item="${id}"]`);
        const shown = node?.getBoundingClientRect();
        setDragging({ id, width: node?.offsetWidth ?? 190, height: node?.offsetHeight ?? 230, scale: node && shown && node.offsetWidth > 0 ? shown.width / node.offsetWidth : 1 });
        setTouched(true);
        setSelected(null);
      }} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className={`p79-tray ${round.items.length > 4 ? "many" : ""}`} role="group" aria-label="Objets à ranger">
          {order.map(i => {
            const item = round.items[i];
            if (placed[item.id]) return null;
            return <ItemCard key={item.id} item={item} selected={selected === item.id} onSelect={() => chooseItem(item.id)} />;
          })}
          {remaining.length === 0 && <div className="p79-tray-empty"><Icon79 name="sparkles" size={26} /> Tout est rangé !</div>}
        </div>
        <div className="p79-bins">
          {round.bins.map((bin, k) => {
            const inside = round.items.filter(item => placed[item.id] === bin.id);
            return (
              <BinBox key={bin.id} bin={bin} k={k} ready={!!selected} over={false} onChoose={() => chooseBin(bin.id)}>
                {inside.length === 0 && <span className="p79-bin-hint"><Icon79 name="arrow-right" size={26} className="p79-down" /> Dépose ici</span>}
                {inside.map(item => <span key={item.id} className="p79-chip"><Pict79 id={item.pict} />{item.label}</span>)}
              </BinBox>
            );
          })}
        </div>
        {/* Hors de l'écran réduit du lecteur (sinon l'image se décale et fuit le curseur) ; le conteneur « p79 » garde les couleurs et les polices. */}
        {mounted && createPortal(
          <div className="p79">
            <DragOverlay dropAnimation={{ duration: 160 }} zIndex={20000}>
              {activeItem && dragging ? <ItemCard item={activeItem} selected={false} onSelect={() => {}} ghost ghostWidth={dragging.width} ghostHeight={dragging.height} ghostScale={dragging.scale} /> : null}
            </DragOverlay>
          </div>,
          document.body,
        )}
      </DndContext>
      {demo && !touched && remaining.length > 0 && (
        <div className="p79-demo" aria-hidden="true" style={{ ["--x0" as string]: `${demo.x0}px`, ["--y0" as string]: `${demo.y0}px`, ["--x1" as string]: `${demo.x1}px`, ["--y1" as string]: `${demo.y1}px` }}>
          <Pict79 id={demo.pict} />
          <Hand className="p79-demo-hand" size={56} strokeWidth={2.2} />
        </div>
      )}
      <FeedbackBox feedback={feedback} hint={mistakes >= 2 && remaining.length > 0 ? round.hint : undefined} />
    </div>
  );
}

/**
 * « Qui est-ce ? avec Palou ». L'enfant voit l'objet à trouver et le décrit en touchant des données ; Palou ne voit pas l'image,
 * il lit seulement les données et écarte ce qui ne correspond pas. Le lien avec l'IA se voit à l'écran : plus de données précises,
 * moins de possibilités, jusqu'à la bonne réponse.
 */
function WhoisRoundView({ round, voice, onMistake, onDone }: RoundProps<WhoisRound>) {
  const [itemOrder] = useState(() => shuffle(round.items.map((_, i) => i)));
  const [tagOrder] = useState(() => shuffle(round.tags.map((_, i) => i)));
  const [chosen, setChosen] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const target = round.items.find(item => item.id === round.target) ?? round.items[0];
  const remaining = round.items.filter(item => chosen.every(tag => item.tags.includes(tag)));

  const pick = (tagId: string, event: MouseEvent<HTMLButtonElement>) => {
    if (solved || chosen.includes(tagId) || wrong.includes(tagId)) return;
    const index = round.tags.findIndex(tag => tag.id === tagId);
    const tag = round.tags[index];
    if (target.tags.includes(tagId)) {
      const next = [...chosen, tagId];
      setChosen(next);
      sfx.ok();
      void burstAt(event.currentTarget);
      const left = round.items.filter(item => next.every(t => item.tags.includes(t)));
      if (left.length === 1) {
        setSolved(true);
        setFeedback({ ok: true, text: round.success });
        sayRound(voice, "ok", round.success);
        onDone();
      } else {
        setFeedback({ ok: true, text: `Palou écarte ce qui ne va pas : il reste ${left.length} possibilités.` });
      }
    } else {
      setWrong(w => [...w, tagId]);
      onMistake();
      sfx.almost();
      const text = tag.explain ?? "Presque ! Regarde encore.";
      setFeedback({ ok: false, text });
      sayRound(voice, tag.explain ? `o${index + 1}` : "commun_presque-regarde", text);
    }
  };

  return (
    <div className="p79-whois">
      <div className="p79-whois-top">
        <div className="p79-whois-target" role="img" aria-label={`À trouver : ${target.label}`}>
          <Pict79 id={target.pict} />
          <span>À trouver</span>
        </div>
        <div className="p79-whois-status" role="status" aria-live="polite">
          {solved ? "Palou a trouvé !" : remaining.length === round.items.length ? "Palou ne voit pas l’image : il lit tes données." : `Palou hésite : il reste ${remaining.length} possibilités.`}
        </div>
      </div>
      <div className="p79-whois-grid" role="group" aria-label="Les objets que Palou regarde">
        {itemOrder.map(i => {
          const item = round.items[i];
          const out = !remaining.includes(item);
          return (
            <div key={item.id} className={`p79-whois-item ${out ? "out" : ""} ${solved && item.id === target.id ? "found" : ""}`} aria-label={`${item.label}${out ? " (écarté par Palou)" : ""}`}>
              <Pict79 id={item.pict} />
            </div>
          );
        })}
      </div>
      <div className="p79-whois-tags" role="group" aria-label="Les données à donner à Palou">
        {tagOrder.map(i => {
          const tag = round.tags[i];
          const state = chosen.includes(tag.id) ? "ok" : wrong.includes(tag.id) ? "no" : "";
          return (
            <button
              key={tag.id}
              type="button"
              className={`p79-opt p79-whois-tag ${state}`}
              onClick={e => pick(tag.id, e)}
              aria-pressed={chosen.includes(tag.id)}
              aria-label={`Donnée : ${tag.label}${state === "ok" ? " (donnée juste)" : state === "no" ? " (déjà essayée)" : ""}`}
            >
              <span className="p79-opt-label">{tag.label}</span>
            </button>
          );
        })}
      </div>
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && !solved ? round.hint : undefined} />
    </div>
  );
}

/**
 * « La machine à trier ». L'enfant donne une règle à Palou ; la machine range tous les objets d'un coup selon cette règle, et il voit
 * le résultat. Une mauvaise règle montre quand même son rangement (on apprend en voyant), puis elle est expliquée.
 */
function RuleSortRoundView({ round, voice, onMistake, onDone }: RoundProps<RuleSortRound>) {
  const [rule, setRule] = useState<RuleSortRound["rules"][number] | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [ruleOrder] = useState(() => shuffle(round.rules.map((_, i) => i)));

  const groups = rule
    ? Object.keys(rule.groups)
        .map(value => ({ value, label: rule.groups[value], items: round.items.filter(item => item.props[rule.prop] === value) }))
        .filter(group => group.items.length > 0)
    : [];

  const pick = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    const next = round.rules[index];
    if (solved || next.id === rule?.id) return;
    setRule(next);
    if (next.correct) {
      setSolved(true);
      sfx.ok();
      void burstAt(event.currentTarget);
      setFeedback({ ok: true, text: round.success });
      sayRound(voice, "ok", round.success);
      onDone();
    } else {
      if (!wrong.includes(next.id)) {
        setWrong(w => [...w, next.id]);
        onMistake();
      }
      sfx.almost();
      const text = next.explain ?? "Presque ! Regarde encore.";
      setFeedback({ ok: false, text });
      sayRound(voice, next.explain ? `o${index + 1}` : "commun_presque-regarde", text);
    }
  };

  return (
    <div className="p79-rs">
      <div className="p79-rs-field" role="group" aria-label={rule ? `La machine de Palou trie : ${rule.label}` : "Les objets à trier"}>
        {!rule ? (
          <div className="p79-rs-pile">
            {round.items.map(item => <div key={item.id} className="p79-rs-item" aria-label={item.label}><Pict79 id={item.pict} /></div>)}
          </div>
        ) : (
          <div className="p79-rs-groups" key={rule.id}>
            {groups.map(group => (
              <div key={group.value} className="p79-rs-group">
                <div className="p79-rs-gtitle">{group.label}</div>
                <div className="p79-rs-gitems">
                  {group.items.map(item => <div key={item.id} className="p79-rs-item pop" aria-label={item.label}><Pict79 id={item.pict} /></div>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p79-rs-rules" role="group" aria-label="Les règles de la machine de Palou">
        {ruleOrder.map(i => {
          const r = round.rules[i];
          const state = solved && r.id === rule?.id ? "ok" : wrong.includes(r.id) ? "no" : "";
          return (
            <button
              key={r.id}
              type="button"
              className={`p79-opt p79-rs-rule ${state} ${rule?.id === r.id ? "on" : ""}`}
              onClick={e => pick(i, e)}
              aria-pressed={rule?.id === r.id}
              aria-label={`Règle : ${r.label}${state === "ok" ? " (bonne règle)" : state === "no" ? " (déjà essayée)" : ""}`}
            >
              <Pict79 id={r.pict} />
              <span className="p79-opt-label">{r.label}</span>
            </button>
          );
        })}
      </div>
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && !solved ? round.hint : undefined} />
    </div>
  );
}

/**
 * « Données propres, IA contente ». Palou compte avec les données qu'il a : tant qu'un intrus reste dans la liste, son compte est
 * faux. L'enfant touche les intrus pour les retirer, et voit le compte de Palou se corriger ; toucher une bonne donnée est expliqué.
 */
function CleanupRoundView({ round, voice, onMistake, onDone }: RoundProps<CleanupRound>) {
  const [order] = useState(() => shuffle(round.rows.map((_, i) => i)));
  const [removed, setRemoved] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const intruders = round.rows.filter(row => row.intruder);
  const solved = intruders.every(row => removed.includes(row.id));
  const count = round.rows.length - removed.length;

  const pick = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    const row = round.rows[index];
    if (solved || removed.includes(row.id)) return;
    if (row.intruder) {
      const next = [...removed, row.id];
      setRemoved(next);
      sfx.ok();
      void burstAt(event.currentTarget);
      if (intruders.every(r => next.includes(r.id))) {
        setFeedback({ ok: true, text: round.success });
        sayRound(voice, "ok", round.success);
        onDone();
      } else {
        setFeedback({ ok: true, text: "Bien vu ! Cette donnée est fausse : Palou la retire." });
      }
    } else {
      if (!wrong.includes(row.id)) { setWrong(w => [...w, row.id]); onMistake(); }
      sfx.almost();
      const text = row.explain ?? "Presque ! Regarde encore.";
      setFeedback({ ok: false, text });
      sayRound(voice, row.explain ? `o${index + 1}` : "commun_presque-regarde", text);
    }
  };

  return (
    <div className="p79-cl">
      <div className={`p79-cl-count ${solved ? "ok" : ""}`} role="status" aria-live="polite">
        Palou compte : <b>{count}</b> {round.counts}{solved ? " : c’est juste !" : ""}
      </div>
      <div className="p79-cl-rows" role="group" aria-label="Les données que Palou utilise">
        {order.map(i => {
          const row = round.rows[i];
          const gone = removed.includes(row.id);
          const state = gone ? "gone" : wrong.includes(row.id) ? "no" : "";
          return (
            <button
              key={row.id}
              type="button"
              className={`p79-opt p79-cl-row ${state}`}
              onClick={e => pick(i, e)}
              disabled={gone || solved}
              aria-label={`${row.label}${gone ? " (retiré par Palou)" : ""}`}
            >
              <Pict79 id={row.pict} />
              <span className="p79-opt-label">{row.label}</span>
            </button>
          );
        })}
      </div>
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && !solved ? round.hint : undefined} />
    </div>
  );
}

/**
 * « L'entraînement de Palou ». La mémoire de Palou se remplit des exemples que l'enfant lui montre ; sa réponse devant la photo
 * d'essai change à chaque exemple, jusqu'à ce qu'il reconnaisse. Le nombre d'exemples nécessaires est celui des bons exemples.
 */
function TrainRoundView({ round, voice, onMistake, onDone }: RoundProps<TrainRound>) {
  const [order] = useState(() => shuffle(round.examples.map((_, i) => i)));
  const [taught, setTaught] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const need = round.examples.filter(e => e.good).length;
  const solved = taught.length >= need;
  const says = solved ? round.success : round.says[Math.min(taught.length, round.says.length - 1)];

  const pick = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    const ex = round.examples[index];
    if (solved || taught.includes(ex.id)) return;
    if (ex.good) {
      const next = [...taught, ex.id];
      setTaught(next);
      sfx.ok();
      void burstAt(event.currentTarget);
      if (next.length >= need) {
        setFeedback({ ok: true, text: round.success });
        sayRound(voice, "ok", round.success);
        onDone();
      } else {
        setFeedback(null);
        sayRound(voice, `s${next.length}`, round.says[next.length]);
      }
    } else {
      if (!wrong.includes(ex.id)) { setWrong(w => [...w, ex.id]); onMistake(); }
      sfx.almost();
      const text = ex.explain ?? "Presque ! Regarde encore.";
      setFeedback({ ok: false, text });
      sayRound(voice, `o${index + 1}`, text);
    }
  };

  return (
    <div className="p79-tr">
      <div className="p79-tr-top">
        <div className="p79-tr-test" aria-label={`Photo d’essai : ${round.test.label}`}>
          <Pict79 id={round.test.pict} />
          <span>{round.test.label}</span>
        </div>
        <div className="p79-tr-side">
          <div className={`p79-tr-says ${solved ? "ok" : ""}`} role="status" aria-live="polite">{says}</div>
          <div className="p79-tr-gauge" aria-label={`Mémoire de Palou : ${taught.length} sur ${need}`}>
            {Array.from({ length: need }, (_, i) => <span key={i} className={i < taught.length ? "on" : ""} />)}
          </div>
        </div>
      </div>
      <div className="p79-tr-rows" role="group" aria-label={`Des exemples pour apprendre le ${round.learns}`}>
        {order.map(i => {
          const ex = round.examples[i];
          const done = taught.includes(ex.id);
          return (
            <button
              key={ex.id}
              type="button"
              className={`p79-opt p79-tr-ex ${done ? "gone" : wrong.includes(ex.id) ? "no" : ""}`}
              onClick={e => pick(i, e)}
              disabled={done || solved}
              aria-label={`${ex.label}${done ? " (dans la mémoire de Palou)" : ""}`}
            >
              <Pict79 id={ex.pict} />
              <span className="p79-opt-label">{ex.label}</span>
            </button>
          );
        })}
      </div>
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && !solved ? round.hint : undefined} />
    </div>
  );
}

/**
 * « Corrige l'étiquette ». Palou répond mal à la photo d'essai parce qu'une photo de sa mémoire porte une fausse étiquette.
 * L'enfant touche cette photo : l'étiquette est corrigée et Palou répond juste.
 */
function RelabelRoundView({ round, voice, onMistake, onDone }: RoundProps<RelabelRound>) {
  const [order] = useState(() => shuffle(round.cards.map((_, i) => i)));
  const [fixed, setFixed] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const pick = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    const card = round.cards[index];
    if (fixed) return;
    if (card.fix) {
      setFixed(true);
      sfx.ok();
      void burstAt(event.currentTarget);
      setFeedback({ ok: true, text: round.success });
      sayRound(voice, "ok", round.success);
      onDone();
    } else {
      if (!wrong.includes(card.id)) { setWrong(w => [...w, card.id]); onMistake(); }
      sfx.almost();
      const text = card.explain ?? "Presque ! Regarde encore.";
      setFeedback({ ok: false, text });
      sayRound(voice, `o${index + 1}`, text);
    }
  };

  return (
    <div className="p79-tr">
      <div className="p79-tr-top">
        <div className="p79-tr-test" aria-label={`Photo d’essai : ${round.test.label}`}>
          <Pict79 id={round.test.pict} />
          <span>{round.test.label}</span>
        </div>
        <div className="p79-tr-side">
          <div className={`p79-tr-says ${fixed ? "ok" : "no"}`} role="status" aria-live="polite">{fixed ? round.success : round.says}</div>
        </div>
      </div>
      <div className="p79-tr-rows" role="group" aria-label="La mémoire de Palou : des photos avec leur étiquette">
        {order.map(i => {
          const card = round.cards[i];
          const isFixedCard = fixed && !!card.fix;
          return (
            <button
              key={card.id}
              type="button"
              className={`p79-opt p79-tr-ex p79-rl-card ${isFixedCard ? "ok" : wrong.includes(card.id) ? "no" : ""}`}
              onClick={e => pick(i, e)}
              disabled={fixed}
              aria-label={`${card.label}, étiquette ${isFixedCard ? card.fix : card.tag}`}
            >
              <Pict79 id={card.pict} />
              <span className="p79-opt-label">{card.label}</span>
              <span className={`p79-rl-tag ${isFixedCard ? "fixed" : ""}`}>{isFixedCard ? card.fix : card.tag}</span>
            </button>
          );
        })}
      </div>
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && !fixed ? round.hint : undefined} />
    </div>
  );
}

/**
 * « Le test de Palou ». Palou devine des photos et se trompe sur une. Étape 1 : l'enfant touche l'erreur. Étape 2 : il choisit le
 * meilleur exemple à lui donner ; Palou corrige alors sa réponse.
 */
function ProbeRoundView({ round, voice, onMistake, onDone }: RoundProps<ProbeRound>) {
  const [order] = useState(() => shuffle(round.photos.map((_, i) => i)));
  const [fixOrder] = useState(() => shuffle(round.fix.options.map((_, i) => i)));
  const [found, setFound] = useState(false);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const mistake = (key: string, suffix: string, text: string) => {
    if (!wrong.includes(key)) { setWrong(w => [...w, key]); onMistake(); }
    sfx.almost();
    setFeedback({ ok: false, text });
    sayRound(voice, suffix, text);
  };

  const pickPhoto = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    const photo = round.photos[index];
    if (found) return;
    if (photo.wrong) {
      setFound(true);
      sfx.ok();
      void burstAt(event.currentTarget);
      setFeedback({ ok: true, text: round.found });
      sayRound(voice, "s1", round.found);
    } else {
      mistake(photo.id, `o${index + 1}`, photo.explain ?? "Presque ! Regarde encore.");
    }
  };

  const pickFix = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    const option = round.fix.options[index];
    if (solved) return;
    if (option.correct) {
      setSolved(true);
      sfx.ok();
      void burstAt(event.currentTarget);
      setFeedback({ ok: true, text: round.success });
      sayRound(voice, "ok", round.success);
      onDone();
    } else {
      mistake(`fix-${index}`, `f${index + 1}`, option.explain ?? "Presque ! Regarde encore.");
    }
  };

  return (
    <div className="p79-tr">
      <div className="p79-tr-rows" role="group" aria-label="Les devinettes de Palou">
        {order.map(i => {
          const photo = round.photos[i];
          const corrected = solved && photo.wrong;
          return (
            <button
              key={photo.id}
              type="button"
              className={`p79-opt p79-pb-photo ${found && photo.wrong ? (solved ? "ok" : "no") : wrong.includes(photo.id) ? "no" : ""}`}
              onClick={e => pickPhoto(i, e)}
              disabled={found}
              aria-label={`${photo.label}. Palou dit : ${corrected ? "juste" : photo.guess}`}
            >
              <Pict79 id={photo.pict} />
              <span className="p79-opt-label">{photo.label}</span>
              <span className="p79-pb-guess">{corrected ? "✔ juste" : `Palou : ${photo.guess}`}</span>
            </button>
          );
        })}
      </div>
      {found && !solved && (
        <div className="p79-tr-rows" role="group" aria-label="Quel exemple donner à Palou ?">
          {fixOrder.map(i => {
            const option = round.fix.options[i];
            return (
              <button key={i} type="button" className={`p79-opt p79-tr-ex ${wrong.includes(`fix-${i}`) ? "no" : ""}`} onClick={e => pickFix(i, e)}>
                <Pict79 id={option.pict} />
                <span className="p79-opt-label">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && !solved ? round.hint : undefined} />
    </div>
  );
}

/** Photo vue par la machine : en gros carrés (« pixels », dessinée sur un canevas), floue, ou plus ou moins sombre. */
function MachineEyes({ pict, effect, level, levels }: { pict: string; effect: FocusRound["effect"]; level: number; levels: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [canvasOk, setCanvasOk] = useState(effect === "pixels");
  const steps = Math.max(levels - 1, 1);
  const block = level >= steps ? 1 : Math.max(2, Math.round(28 / 2 ** level));

  useEffect(() => {
    if (effect !== "pixels") return;
    let cancelled = false;
    const image = document.createElement("img");
    image.onload = () => {
      const el = canvas.current;
      const size = 220;
      try {
        const ctx = el?.getContext("2d");
        if (cancelled || !el || !ctx) { if (!cancelled) setCanvasOk(false); return; }
        const small = document.createElement("canvas");
        const n = Math.max(2, Math.round(size / block));
        small.width = n; small.height = n;
        small.getContext("2d")?.drawImage(image, 0, 0, n, n);
        el.width = size; el.height = size;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(small, 0, 0, size, size);
      } catch {
        setCanvasOk(false);
      }
    };
    image.onerror = () => { if (!cancelled) setCanvasOk(false); };
    image.src = pictoUrl(pict);
    return () => { cancelled = true; };
  }, [pict, effect, block]);

  const filter = effect === "blur" || (effect === "pixels" && !canvasOk)
    ? `blur(${Math.round(((steps - level) / steps) * 14)}px)`
    : effect === "dark" ? `brightness(${(0.12 + 0.88 * (level / steps)).toFixed(2)})` : undefined;

  return effect === "pixels" && canvasOk
    ? <canvas ref={canvas} className="p79-fc-img" width={220} height={220} aria-hidden="true" />
    // eslint-disable-next-line @next/next/no-img-element
    : <img className="p79-fc-img" src={pictoUrl(pict)} alt="" aria-hidden="true" draggable={false} style={{ filter }} />;
}

/**
 * « Les yeux de Palou ». L'enfant rend la photo plus ou moins nette ; Palou dit ce qu'il voit à chaque cran. La manche est réussie
 * quand l'enfant amène la photo au cran où Palou reconnaît (les boutons restent actifs ensuite pour essayer les autres crans).
 */
function FocusRoundView({ round, voice, onDone }: RoundProps<FocusRound>) {
  const [level, setLevel] = useState(0);
  const [solved, setSolved] = useState(false);
  const last = round.levels.length - 1;

  const go = (next: number) => {
    const to = Math.max(0, Math.min(last, next));
    if (to === level) return;
    setLevel(to);
    sfx.tap();
    if (!solved && to >= round.enough) {
      setSolved(true);
      sfx.ok();
      sayRound(voice, "ok", round.success);
      onDone();
    } else {
      sayRound(voice, `s${to}`, round.levels[to].says);
    }
  };

  const recognized = level >= round.enough;
  return (
    <div className="p79-fc">
      <div className="p79-fc-top">
        <div className="p79-fc-photo" role="img" aria-label={`${round.photo.label}, cran ${level + 1} sur ${last + 1}`}>
          <MachineEyes pict={round.photo.pict} effect={round.effect} level={level} levels={round.levels.length} />
        </div>
        <div className="p79-tr-side">
          <div className={`p79-tr-says ${recognized ? "ok" : "no"}`} role="status" aria-live="polite">{round.levels[level].says}</div>
          <div className="p79-tr-gauge" aria-hidden="true">
            {round.levels.map((_, i) => <span key={i} className={i <= level ? "on" : ""} />)}
          </div>
        </div>
      </div>
      <div className="p79-fc-btns">
        <button type="button" className="p79-opt p79-fc-btn" onClick={() => go(level - 1)} disabled={level === 0}>
          <span className="p79-opt-label">{round.less ?? "Moins net"}</span>
        </button>
        <button type="button" className="p79-opt p79-fc-btn" onClick={() => go(level + 1)} disabled={level === last}>
          <span className="p79-opt-label">{round.more ?? "Plus net"}</span>
        </button>
      </div>
      {solved && <FeedbackBox feedback={{ ok: true, text: round.success }} />}
    </div>
  );
}

/**
 * « Regarde comme Palou ». L'enfant choisit un regard ; la photo s'affiche comme Palou la voit et il dit ce qu'il en tire.
 * Un seul regard (les détails) permet de reconnaître la feuille malade ; les autres sont expliqués.
 */
function LensRoundView({ round, voice, onMistake, onDone }: RoundProps<LensRound>) {
  const [order] = useState(() => shuffle(round.lenses.map((_, i) => i)));
  const [current, setCurrent] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const lens = current === null ? null : round.lenses[current];

  const pick = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    const next = round.lenses[index];
    if (solved) return;
    setCurrent(index);
    if (next.correct) {
      setSolved(true);
      sfx.ok();
      void burstAt(event.currentTarget);
      setFeedback({ ok: true, text: round.success });
      sayRound(voice, "ok", round.success);
      onDone();
    } else {
      if (!wrong.includes(next.id)) { setWrong(w => [...w, next.id]); onMistake(); }
      sfx.almost();
      const text = next.explain ?? "Presque ! Regarde encore.";
      setFeedback({ ok: false, text });
      sayRound(voice, `o${index + 1}`, text);
    }
  };

  return (
    <div className="p79-fc">
      <div className="p79-fc-top">
        <div className="p79-fc-photo" role="img" aria-label={`${round.photo.label}, vue ${lens ? lens.label : "normale"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`p79-fc-img p79-lens-${lens ? lens.view : "colors"}`} src={pictoUrl(round.photo.pict)} alt="" aria-hidden="true" draggable={false} />
        </div>
        <div className="p79-tr-side">
          <div className={`p79-tr-says ${solved ? "ok" : "no"}`} role="status" aria-live="polite">{lens ? lens.says : "Je ne vois pas bien… Que dois-je regarder ?"}</div>
        </div>
      </div>
      <div className="p79-tr-rows" role="group" aria-label="Que doit regarder Palou ?">
        {order.map(i => {
          const item = round.lenses[i];
          return (
            <button
              key={item.id}
              type="button"
              className={`p79-opt p79-tr-ex ${current === i ? (solved ? "ok" : "no") : ""}`}
              onClick={e => pick(i, e)}
              disabled={solved}
            >
              <Pict79 id={item.pict} />
              <span className="p79-opt-label">{item.label}</span>
            </button>
          );
        })}
      </div>
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && !solved ? round.hint : undefined} />
    </div>
  );
}

/**
 * « Parle à Palou ». L'enfant construit sa phrase en touchant des cartes de mots (aucun micro : la voix de l'enfant n'est jamais captée).
 * Palou écrit ce qu'il a « entendu », met en valeur les mots importants, puis répond avec une phrase préparée.
 */
function SpeakRoundView({ round, voice, onMistake, onDone }: RoundProps<SpeakRound>) {
  const [order] = useState(() => shuffle(round.cards.map((_, i) => i)));
  const [picked, setPicked] = useState<number[]>([]);
  const [heard, setHeard] = useState<{ text: string; keys: string[] } | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);   // essais ratés : l'aide vient petit à petit (indice, puis mots à toucher qui brillent)

  const submit = (text: string, event?: MouseEvent<HTMLElement>) => {
    const check = checkSpeech(text, round.need, round.avoid);
    setHeard({ text, keys: check.heard });
    if (!check.ok) setAttempts(n => n + 1);
    if (check.ok) {
      setSolved(true);
      setReply(round.success);
      sfx.ok();
      if (event) void burstAt(event.currentTarget);
      sayRound(voice, "ok", round.success);
      onDone();
      return;
    }
    const vague = check.avoided.length > 0 && !!round.vague;
    const text2 = vague ? round.vague! : round.missing;
    const reason = vague ? "vague" : "missing";
    if (!failed.includes(reason)) { setFailed(f => [...f, reason]); onMistake(); }
    sfx.almost();
    setReply(text2);
    sayRound(voice, vague ? "o2" : "o1", text2);
  };

  const phrase = picked.map(i => round.cards[i]).join(" ");
  const keyWords = (heard?.keys ?? []).map(normalizeSpeech);
  // Après 3 essais ratés, les cartes qui manquent à la phrase brillent doucement : l'enfant est guidé jusqu'au bon mot.
  const helped = new Set<number>();
  if (attempts >= 3 && !solved) {
    const spoken = new Set(normalizeSpeech(phrase).split(" ").filter(Boolean));
    for (const group of round.need) {
      const done = group.some(word => normalizeSpeech(word).split(" ").every(part => spoken.has(part)));
      if (done) continue;
      round.cards.forEach((card, i) => {
        if (!picked.includes(i) && group.some(word => normalizeSpeech(word).split(" ").every(part => normalizeSpeech(card).split(" ").includes(part)))) helped.add(i);
      });
    }
  }

  return (
    <div className="p79-sp">
      <div className="p79-sp-say" aria-label="Ce que tu dois dire">« {round.say} »</div>
      <div className="p79-sp-line" aria-live="polite">
        <span className="p79-sp-label">Touche les mots pour parler à Palou :</span>
        <span className="p79-sp-phrase">{phrase || "…"}</span>
      </div>
      <div className="p79-tr-rows" role="group" aria-label="Les mots à dire">
        {order.map(i => (
          <button key={i} type="button" className={`p79-opt p79-tr-ex p79-sp-card ${helped.has(i) ? "help" : ""}`} disabled={solved || picked.includes(i)} onClick={() => setPicked(p => [...p, i])}>
            <span className="p79-opt-label">{round.cards[i]}</span>
          </button>
        ))}
      </div>
      {!solved && (
        <div className="p79-sp-actions">
          <button type="button" className="p79-sp-undo" onClick={() => { sfx.tap(); setPicked(p => p.slice(0, -1)); }} disabled={picked.length === 0} aria-label="Enlever le dernier mot">
            <Icon79 name="undo" size={26} /> Enlever
          </button>
          <button type="button" className="p79-btn p79-sp-say-btn" onClick={e => submit(phrase, e)} disabled={picked.length === 0} aria-label="Dire la phrase à Palou">
            <Icon79 name="sound" size={26} /> Dire à Palou
          </button>
        </div>
      )}
      {attempts >= 2 && !solved && <FeedbackBox feedback={null} hint={round.hint} />}
      {heard && (
        <div className="p79-sp-heard" aria-live="polite">
          <b>Palou a écrit :</b>{" "}
          {heard.text.split(/\s+/).filter(Boolean).map((token, i) => (
            normalizeSpeech(token).split(" ").some(part => keyWords.includes(part)) ? <mark key={i}>{token} </mark> : <span key={i}>{token} </span>
          ))}
        </div>
      )}
      {reply && <FeedbackBox feedback={{ ok: solved, text: reply }} />}
    </div>
  );
}

/**
 * « Décris, Palou dessine ». Les cartes touchées s'empilent dans le dessin de Palou, qui commente ; une carte hors sujet y paraît
 * un instant, de travers, avec son explication, puis disparaît.
 */
function LayersRoundView({ round, voice, onMistake, onDone }: RoundProps<LayersRound>) {
  const [order] = useState(() => shuffle(round.cards.map((_, i) => i)));
  const [placed, setPlaced] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const solved = placed.length >= round.need;
  const says = solved ? round.success : round.says[Math.min(placed.length, round.says.length - 1)];
  const byId = (id: string) => round.cards.find(c => c.id === id);

  const pick = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    const card = round.cards[index];
    if (solved || placed.includes(card.id)) return;
    if (card.good) {
      const next = [...placed, card.id];
      setPlaced(next);
      setFlash(null);
      sfx.ok();
      void burstAt(event.currentTarget);
      if (next.length >= round.need) {
        setFeedback({ ok: true, text: round.success });
        sayRound(voice, "ok", round.success);
        onDone();
      } else {
        setFeedback(null);
        sayRound(voice, `s${next.length}`, round.says[next.length]);
      }
    } else {
      setFlash(card.id);
      if (!wrong.includes(card.id)) { setWrong(w => [...w, card.id]); onMistake(); }
      sfx.almost();
      const text = card.explain ?? "Presque ! Regarde encore.";
      setFeedback({ ok: false, text });
      sayRound(voice, `o${index + 1}`, text);
    }
  };

  const flashed = flash ? byId(flash) : undefined;
  return (
    <div className="p79-ly">
      <div className="p79-ly-top">
        <div className="p79-tr-test" aria-label={`L’idée : ${round.goal.label}`}>
          <Pict79 id={round.goal.pict} />
          <span>{round.goal.label}</span>
        </div>
        <div className="p79-ly-canvas" role="img" aria-label="Le dessin de Palou">
          {placed.length === 0 && !flashed && <span className="p79-ly-empty">Le dessin de Palou est vide.</span>}
          {placed.map(id => {
            const card = byId(id);
            return card ? <span key={id} className="p79-ly-sticker"><Pict79 id={card.pict} /><b>{card.label}</b></span> : null;
          })}
          {flashed && <span className="p79-ly-sticker off"><Pict79 id={flashed.pict} /><b>{flashed.label}</b></span>}
        </div>
      </div>
      <div className={`p79-tr-says ${solved ? "ok" : ""}`} role="status" aria-live="polite">{says}</div>
      <div className="p79-tr-rows" role="group" aria-label="Les cartes pour décrire">
        {order.map(i => {
          const card = round.cards[i];
          const done = placed.includes(card.id);
          return (
            <button key={card.id} type="button" className={`p79-opt p79-tr-ex ${done ? "gone" : wrong.includes(card.id) ? "no" : ""}`} onClick={e => pick(i, e)} disabled={done || solved}>
              <Pict79 id={card.pict} />
              <span className="p79-opt-label">{card.label}</span>
            </button>
          );
        })}
      </div>
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && !solved ? round.hint : undefined} />
    </div>
  );
}

/**
 * « Enquête ». L'enfant pose des questions (boutons) : chaque question utile révèle un indice et fait baisser la confiance ; une question
 * inutile n'apprend rien. Avec assez d'indices, il pose un tampon. Le dossier d'indices reste visible.
 */
function VerifyRoundView({ round, voice, onMistake, onDone }: RoundProps<VerifyRound>) {
  const [checkOrder] = useState(() => shuffle(round.checks.map((_, i) => i)));
  const [stampOrder] = useState(() => shuffle(round.stamps.map((_, i) => i)));
  const [found, setFound] = useState<string[]>([]);
  const [useless, setUseless] = useState<string[]>([]);
  const [stage2, setStage2] = useState(false);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const askTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(askTimer.current), []);
  const usefulTotal = round.checks.filter(c => c.useful).length || 1;
  const trust = round.meter ? Math.round(round.meter.start + (round.meter.end - round.meter.start) * (found.length / usefulTotal)) : null;

  const mistake = (key: string) => { if (!wrong.includes(key)) { setWrong(w => [...w, key]); onMistake(); } };

  const ask = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    const check = round.checks[index];
    if (solved || found.includes(check.id) || useless.includes(check.id)) return;
    if (check.useful) {
      const next = [...found, check.id];
      setFound(next);
      sfx.ok();
      void burstAt(event.currentTarget);
      sayRound(voice, `s${index + 1}`, check.reveal);
      if (next.length >= round.need && !stage2) {
        setStage2(true);
        setFeedback({ ok: true, text: round.ask });
        // La phrase du tampon est lue après l'indice (≈ 66 ms par caractère), et annulée si l'enfant quitte la manche.
        askTimer.current = window.setTimeout(() => sayRound(voice, "a", round.ask), Math.round(check.reveal.length * 66 + 900));
      } else {
        setFeedback(null);
      }
    } else {
      setUseless(u => [...u, check.id]);
      mistake(check.id);
      sfx.almost();
      const text = check.explain ?? "Cette question n’apprend rien.";
      setFeedback({ ok: false, text });
      sayRound(voice, `o${index + 1}`, text);
    }
  };

  const stamp = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    const item = round.stamps[index];
    if (solved) return;
    if (item.correct) {
      setSolved(true);
      sfx.ok();
      void burstAt(event.currentTarget);
      setFeedback({ ok: true, text: round.success });
      sayRound(voice, "ok", round.success);
      onDone();
    } else {
      mistake(`stamp-${item.id}`);
      sfx.almost();
      const text = item.explain ?? "Presque ! Regarde les indices.";
      setFeedback({ ok: false, text });
      sayRound(voice, `f${index + 1}`, text);
    }
  };

  const revealed = round.checks.filter(c => found.includes(c.id) || useless.includes(c.id));
  return (
    <div className="p79-vf">
      <div className="p79-vf-top">
        <div className="p79-tr-test" aria-label={`L’affirmation : ${round.claim.text}`}>
          <Pict79 id={round.claim.pict} />
          <span>{round.claim.text}</span>
        </div>
        {trust !== null && round.meter && (
          <div className="p79-vf-meter" role="status" aria-label={`${round.meter.label} : ${trust} %`}>
            <span>{round.meter.label}</span>
            <div className="p79-vf-bar"><i style={{ width: `${trust}%` }} /></div>
            <b>{trust} %</b>
          </div>
        )}
      </div>
      {revealed.length > 0 && (
        <ul className="p79-vf-file" aria-label="Ce que tu as trouvé">
          {revealed.map(c => (
            <li key={c.id} className={c.useful ? "ok" : "off"}><b>{c.label}</b> {c.reveal}</li>
          ))}
        </ul>
      )}
      {!stage2 && (
        <div className="p79-tr-rows" role="group" aria-label="Les questions à poser">
          {checkOrder.map(i => {
            const check = round.checks[i];
            const done = found.includes(check.id) || useless.includes(check.id);
            return (
              <button key={check.id} type="button" className={`p79-opt p79-tr-ex ${done ? "gone" : ""}`} onClick={e => ask(i, e)} disabled={done || solved}>
                <Pict79 id={check.pict} />
                <span className="p79-opt-label">{check.label}</span>
              </button>
            );
          })}
        </div>
      )}
      {stage2 && (
        <div className="p79-tr-rows" role="group" aria-label="Le tampon">
          {stampOrder.map(i => {
            const item = round.stamps[i];
            return (
              <button key={item.id} type="button" className={`p79-opt p79-tr-ex p79-vf-stamp ${solved && item.correct ? "ok" : wrong.includes(`stamp-${item.id}`) ? "no" : ""}`} onClick={e => stamp(i, e)} disabled={solved}>
                <Pict79 id={item.pict} />
                <span className="p79-opt-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && !solved ? round.hint : undefined} />
    </div>
  );
}

/**
 * « La loupe ». L'enfant choisit où regarder ; la loupe agrandit la zone et Palou dit ce qu'il voit. Les zones à indice restent cerclées
 * sur l'image ; une zone normale est expliquée.
 */
function LoupeRoundView({ round, voice, onMistake, onDone }: RoundProps<LoupeRound>) {
  const [order] = useState(() => shuffle(round.spots.map((_, i) => i)));
  const [current, setCurrent] = useState<number | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const solved = found.length >= round.need;
  const spot = current === null ? null : round.spots[current];
  const ZOOM = 3;
  const bg = (v: number) => `${Math.max(0, Math.min(100, ((v / 100) * ZOOM - 0.5) / (ZOOM - 1) * 100))}%`;

  const look = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    const item = round.spots[index];
    if (solved) return;
    setCurrent(index);
    if (item.clue) {
      if (found.includes(item.id)) return;
      const next = [...found, item.id];
      setFound(next);
      sfx.ok();
      void burstAt(event.currentTarget);
      if (next.length >= round.need) {
        setFeedback({ ok: true, text: round.success });
        sayRound(voice, "ok", round.success);
        onDone();
      } else {
        setFeedback({ ok: true, text: item.says });
        sayRound(voice, `s${index + 1}`, item.says);
      }
    } else {
      if (!wrong.includes(item.id)) { setWrong(w => [...w, item.id]); onMistake(); }
      sfx.almost();
      const text = item.explain ?? "Rien d’étrange ici.";
      setFeedback({ ok: false, text });
      sayRound(voice, `o${index + 1}`, text);
    }
  };

  return (
    <div className="p79-lp">
      <div className="p79-lp-top">
        <div className="p79-lp-photo" role="img" aria-label={round.photo.label}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pictoUrl(round.photo.pict)} alt="" aria-hidden="true" draggable={false} />
          {round.spots.filter(s => found.includes(s.id)).map(s => <span key={s.id} className="p79-lp-ring found" style={{ left: `${s.x}%`, top: `${s.y}%` }} />)}
          {spot && !found.includes(spot.id) && <span className="p79-lp-ring" style={{ left: `${spot.x}%`, top: `${spot.y}%` }} />}
        </div>
        <div className="p79-lp-lens" role="img" aria-label={spot ? `La loupe sur : ${spot.label}` : "La loupe"}
          style={spot ? { backgroundImage: `url(${pictoUrl(round.photo.pict)})`, backgroundSize: `${ZOOM * 100}%`, backgroundPosition: `${bg(spot.x)} ${bg(spot.y)}` } : undefined}>
          {!spot && <span>Choisis où regarder</span>}
        </div>
      </div>
      <div className="p79-tr-rows" role="group" aria-label="Où regarder avec la loupe ?">
        {order.map(i => {
          const item = round.spots[i];
          const done = found.includes(item.id);
          return (
            <button key={item.id} type="button" className={`p79-opt p79-tr-ex ${done ? "gone" : wrong.includes(item.id) ? "no" : ""}`} onClick={e => look(i, e)} disabled={solved}>
              <Pict79 id={item.pict} />
              <span className="p79-opt-label">{item.label}</span>
            </button>
          );
        })}
      </div>
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && !solved ? round.hint : undefined} />
    </div>
  );
}

/**
 * « Construis ton IA ». Trois cases à remplir dans l'ordre (elle regarde, elle apprend, elle fait), puis la machine se met en marche :
 * l'enfant lui présente des cas et lit ses réponses.
 */
function MachineRoundView({ round, voice, onMistake, onDone }: RoundProps<MachineRound>) {
  const [filled, setFilled] = useState<string[]>([]);      // libellé choisi dans chaque case remplie
  const [wrong, setWrong] = useState<string[]>([]);
  const [tried, setTried] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [orders] = useState(() => round.slots.map(slot => shuffle(slot.options.map((_, i) => i))));
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), []);
  const slotIndex = filled.length;
  const ready = slotIndex >= round.slots.length;
  const solved = ready && tried.length >= round.demo.need;
  // Numéro de chaque option dans l'ordre du contenu (pour les clés audio oN) : cases à la suite, options à la suite.
  const base = (s: number) => round.slots.slice(0, s).reduce((n, slot) => n + slot.options.length, 0);

  const choose = (s: number, i: number, event: MouseEvent<HTMLButtonElement>) => {
    const option = round.slots[s].options[i];
    if (option.correct) {
      setFilled(f => [...f, option.label]);
      sfx.ok();
      void burstAt(event.currentTarget);
      if (s + 1 >= round.slots.length) {
        setFeedback({ ok: true, text: round.demo.prompt });
        timers.current.push(window.setTimeout(() => sayRound(voice, "d", round.demo.prompt), 600));
      } else {
        setFeedback(null);
      }
    } else {
      const key = `${s}-${i}`;
      if (!wrong.includes(key)) { setWrong(w => [...w, key]); onMistake(); }
      sfx.almost();
      const text = option.explain ?? "Presque ! Regarde encore.";
      setFeedback({ ok: false, text });
      sayRound(voice, `o${base(s) + i + 1}`, text);
    }
  };

  const tryCase = (i: number, event: MouseEvent<HTMLButtonElement>) => {
    const item = round.demo.cases[i];
    if (solved || tried.includes(item.id)) return;
    const next = [...tried, item.id];
    setTried(next);
    sfx.ok();
    void burstAt(event.currentTarget);
    setFeedback({ ok: true, text: item.result });
    sayRound(voice, `r${i + 1}`, item.result);
    if (next.length >= round.demo.need) {
      onDone();
      // Le bravo est dit après la réponse de la machine ; il est annulé si l'enfant passe tout de suite à la suite.
      timers.current.push(window.setTimeout(() => { setFeedback({ ok: true, text: round.success }); sayRound(voice, "ok", round.success); }, Math.round(item.result.length * 66 + 1200)));
    }
  };

  return (
    <div className="p79-mc">
      <div className="p79-mc-slots" role="list" aria-label={`Ton IA : ${round.goal.label}`}>
        {round.slots.map((slot, s) => (
          <div key={slot.id} role="listitem" className={`p79-mc-slot ${s < slotIndex ? "full" : s === slotIndex ? "now" : ""}`}>
            <small>{s + 1}. {slot.label}</small>
            <b>{s < slotIndex ? filled[s] : "…"}</b>
          </div>
        ))}
      </div>
      {!ready && (
        <>
          <div className="p79-mc-ask">{round.slots[slotIndex].question}</div>
          <div className="p79-tr-rows" role="group" aria-label={round.slots[slotIndex].question}>
            {orders[slotIndex].map(i => {
              const option = round.slots[slotIndex].options[i];
              return (
                <button key={i} type="button" className={`p79-opt p79-tr-ex ${wrong.includes(`${slotIndex}-${i}`) ? "no" : ""}`} onClick={e => choose(slotIndex, i, e)}>
                  <Pict79 id={option.pict} />
                  <span className="p79-opt-label">{option.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {ready && (
        <div className="p79-tr-rows" role="group" aria-label="Présente des cas à ta machine">
          {round.demo.cases.map((item, i) => (
            <button key={item.id} type="button" className={`p79-opt p79-tr-ex ${tried.includes(item.id) ? "gone" : ""}`} onClick={e => tryCase(i, e)} disabled={tried.includes(item.id) || solved}>
              <Pict79 id={item.pict} />
              <span className="p79-opt-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && !ready ? round.hint : undefined} />
    </div>
  );
}

/**
 * « Cache pour protéger ». L'enfant touche les informations secrètes : elles se cachent sous un flou. Le panneau « Un inconnu voit »
 * montre ce qui reste lisible. Une information sans danger touchée par erreur reste visible, avec son explication.
 */
function ShieldRoundView({ round, voice, onMistake, onDone }: RoundProps<ShieldRound>) {
  const [order] = useState(() => shuffle(round.items.map((_, i) => i)));
  const [hidden, setHidden] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const secrets = round.items.filter(item => item.secret);
  const solved = secrets.every(item => hidden.includes(item.id));

  const pick = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    const item = round.items[index];
    if (solved || hidden.includes(item.id)) return;
    if (item.secret) {
      const next = [...hidden, item.id];
      setHidden(next);
      sfx.ok();
      void burstAt(event.currentTarget);
      if (secrets.every(s => next.includes(s.id))) {
        setFeedback({ ok: true, text: round.success });
        sayRound(voice, "ok", round.success);
        onDone();
      } else {
        setFeedback({ ok: true, text: "Bien vu ! Cette information est cachée." });
      }
    } else {
      if (!wrong.includes(item.id)) { setWrong(w => [...w, item.id]); onMistake(); }
      sfx.almost();
      const text = item.explain ?? "Presque ! Regarde encore.";
      setFeedback({ ok: false, text });
      sayRound(voice, `o${index + 1}`, text);
    }
  };

  const visible = round.items.filter(item => !hidden.includes(item.id));
  return (
    <div className="p79-sh">
      <div className="p79-tr-test" aria-label={round.scene.label}>
        <Pict79 id={round.scene.pict} />
        <span>{round.scene.label}</span>
      </div>
      <div className="p79-tr-rows" role="group" aria-label="Les informations à protéger">
        {order.map(i => {
          const item = round.items[i];
          const isHidden = hidden.includes(item.id);
          return (
            <button key={item.id} type="button" className={`p79-opt p79-tr-ex p79-sh-item ${isHidden ? "hid" : wrong.includes(item.id) ? "no" : ""}`} onClick={e => pick(i, e)} disabled={isHidden || solved} aria-label={`${item.label}${isHidden ? " (cachée)" : ""}`}>
              <Pict79 id={item.pict} />
              <span className="p79-opt-label">{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="p79-sh-view" role="status" aria-live="polite">
        <b>Un inconnu peut lire :</b> {visible.length === 0 ? "rien d’important" : visible.map(v => v.label).join(" · ")}
      </div>
      <FeedbackBox feedback={feedback} hint={wrong.length >= 2 && !solved ? round.hint : undefined} />
    </div>
  );
}

/** Une manche, quel que soit son type. La clé (indice de manche) remet l'état à zéro à chaque manche. */
export function RoundView(props: RoundProps<Round>) {
  const { round } = props;
  if (round.type === "shield") return <ShieldRoundView {...props} round={round} />;
  if (round.type === "machine") return <MachineRoundView {...props} round={round} />;
  if (round.type === "verify") return <VerifyRoundView {...props} round={round} />;
  if (round.type === "loupe") return <LoupeRoundView {...props} round={round} />;
  if (round.type === "layers") return <LayersRoundView {...props} round={round} />;
  if (round.type === "speak") return <SpeakRoundView {...props} round={round} />;
  if (round.type === "lens") return <LensRoundView {...props} round={round} />;
  if (round.type === "focus") return <FocusRoundView {...props} round={round} />;
  if (round.type === "relabel") return <RelabelRoundView {...props} round={round} />;
  if (round.type === "probe") return <ProbeRoundView {...props} round={round} />;
  if (round.type === "train") return <TrainRoundView {...props} round={round} />;
  if (round.type === "cleanup") return <CleanupRoundView {...props} round={round} />;
  if (round.type === "choose") return <ChooseRoundView {...props} round={round} />;
  if (round.type === "multi") return <MultiRoundView {...props} round={round} />;
  if (round.type === "whois") return <WhoisRoundView {...props} round={round} />;
  if (round.type === "rulesort") return <RuleSortRoundView {...props} round={round} />;
  return <SortRoundView {...props} round={round} />;
}
