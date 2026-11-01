"use client";

import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Plus, ScrollText, Trash2, X } from "lucide-react";
import type { Screen } from "@/app/dashboard/parcours79/types";
import { ConfirmModal } from "@/app/_scolaire/ui/ui";
import { KIND_ORDER, newScreen, SCREEN_KINDS, screenExcerpt, type ScreenKind } from "./studioModel";

type Severity = "error" | "warning";

/** Colonne de gauche : la fiche de la leçon, puis les écrans dans l'ordre où l'enfant les voit (on les déplace en les glissant). */
export function ScreenRail({ screens, selected, onSelect, onChange, severity }: {
  screens: Screen[];
  /** -1 : la fiche de la leçon. */
  selected: number;
  onSelect: (index: number) => void;
  onChange: (screens: Screen[], selected: number) => void;
  severity: Map<number, Severity>;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const ids = screens.map((_, i) => `screen-${i}`);

  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    onChange(arrayMove(screens, from, to), selected === from ? to : selected);
  };

  const add = (kind: ScreenKind) => {
    // Un nouvel écran se place après celui qu'on regarde, mais jamais après « Je retiens » (toujours le dernier).
    const lastIsBravo = screens[screens.length - 1]?.kind === "bravo";
    const limit = lastIsBravo && kind !== "bravo" ? screens.length - 1 : screens.length;
    const at = Math.min(Math.max(selected + 1, 0), limit);
    onChange([...screens.slice(0, at), newScreen(kind), ...screens.slice(at)], at);
    setAdding(false);
  };

  const duplicate = (index: number) => {
    const copy = JSON.parse(JSON.stringify(screens[index])) as Screen;
    onChange([...screens.slice(0, index + 1), copy, ...screens.slice(index + 1)], index + 1);
  };

  return (
    <nav className="sx-rail" aria-label="Écrans de la leçon">
      <button type="button" className="sx-rail-info" data-on={selected === -1} onClick={() => onSelect(-1)}>
        <ScrollText size={16} aria-hidden="true" /> Fiche de la leçon
      </button>

      <div className="sx-rail-title">Écrans <span>{screens.length}</span></div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="sx-screens">
            {screens.map((screen, i) => (
              <ScreenCard key={ids[i]} id={ids[i]} index={i} screen={screen} on={selected === i} severity={severity.get(i + 1)}
                onSelect={() => onSelect(i)} onDuplicate={() => duplicate(i)} onRemove={() => setRemoving(i)} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {adding ? (
        <div className="sx-picker" role="menu" aria-label="Type d'écran à ajouter">
          <div className="sx-picker-head"><b>Quel écran ajouter ?</b><button type="button" className="sx-icon-btn" onClick={() => setAdding(false)} aria-label="Fermer"><X size={14} /></button></div>
          {KIND_ORDER.map(kind => {
            const meta = SCREEN_KINDS[kind];
            return (
              <button key={kind} type="button" role="menuitem" onClick={() => add(kind)}>
                <span className="sx-kind-dot" data-tone={meta.tone}><meta.icon size={15} aria-hidden="true" /></span>
                <span><b>{meta.label}</b><small>{meta.description}</small></span>
              </button>
            );
          })}
        </div>
      ) : (
        <button type="button" className="sx-add big" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" /> Ajouter un écran</button>
      )}

      {removing !== null && (
        <ConfirmModal
          title={`Supprimer l'écran ${removing + 1} ?`}
          message={`« ${screenExcerpt(screens[removing])} »`}
          consequences={["L'écran disparaît de la leçon dans votre brouillon. Rien n'est visible des enfants avant la publication."]}
          reversibility="Tant que vous n'avez pas publié, vous pouvez écarter le brouillon pour tout retrouver."
          confirmLabel="Supprimer l'écran" danger
          onConfirm={() => { onChange(screens.filter((_, j) => j !== removing), Math.min(selected, screens.length - 2)); setRemoving(null); }}
          onClose={() => setRemoving(null)}
        />
      )}
    </nav>
  );
}

function ScreenCard({ id, index, screen, on, severity, onSelect, onDuplicate, onRemove }: {
  id: string; index: number; screen: Screen; on: boolean; severity?: Severity; onSelect: () => void; onDuplicate: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const meta = SCREEN_KINDS[screen.kind] ?? SCREEN_KINDS.story;
  return (
    <li ref={setNodeRef} className="sx-screen" data-on={on} data-dragging={isDragging} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <button type="button" className="sx-handle" {...attributes} {...listeners} aria-label={`Déplacer l'écran ${index + 1}`}><GripVertical size={16} /></button>
      <button type="button" className="sx-screen-main" onClick={onSelect} aria-current={on ? "true" : undefined}>
        <span className="sx-kind-dot" data-tone={meta.tone}><meta.icon size={15} aria-hidden="true" /></span>
        <span className="sx-screen-text"><b>{index + 1}. {meta.label}</b><small>{screenExcerpt(screen)}</small></span>
        {severity && <span className="sx-flag" data-severity={severity} title={severity === "error" ? "À corriger avant de publier" : "Règle de style non respectée"} />}
      </button>
      <span className="sx-screen-actions">
        <button type="button" className="sx-icon-btn" onClick={onDuplicate} aria-label={`Dupliquer l'écran ${index + 1}`}><Copy size={14} /></button>
        <button type="button" className="sx-icon-btn danger" onClick={onRemove} aria-label={`Supprimer l'écran ${index + 1}`}><Trash2 size={14} /></button>
      </span>
    </li>
  );
}
