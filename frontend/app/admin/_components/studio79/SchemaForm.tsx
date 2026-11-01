"use client";

import { useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Copy, GripVertical, Plus, Search, Trash2, X } from "lucide-react";
import pictoCatalog from "../../../../content/parcours79/pictos.json";
import { pictoUrl } from "@/app/dashboard/parcours79/Img79";
import { uid, type FieldDef, type Rec } from "./roundSchemas";

const PICTOS = Object.entries((pictoCatalog as { pictos: Record<string, string> }).pictos);

type Common = { value: Rec; root: Rec; onChange: (next: Rec) => void };

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asRec = (v: unknown): Rec => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {});

/** Formulaire d'un objet décrit par `fields` (voir roundSchemas.ts). `root` est l'activité entière : les champs « ref » y cherchent leurs choix. */
export function SchemaForm({ fields, value, onChange, root }: { fields: FieldDef[]; value: Rec; onChange: (next: Rec) => void; root?: Rec }) {
  return (
    <div className="sx-fields">
      {fields.map(field => (
        <FieldView key={field.key} field={field} value={value} root={root ?? value} onChange={onChange} />
      ))}
    </div>
  );
}

function Labeled({ label, hint, children, inline = false }: { label: string; hint?: string; children: React.ReactNode; inline?: boolean }) {
  return (
    <label className={`sx-field${inline ? " inline" : ""}`}>
      <span className="sx-label">{label}</span>
      {children}
      {hint && <span className="sx-hint">{hint}</span>}
    </label>
  );
}

function FieldView({ field, value, root, onChange }: { field: FieldDef } & Common) {
  const set = (next: unknown) => onChange({ ...value, [field.key]: next });
  const current = value[field.key];

  switch (field.kind) {
    case "text":
      return (
        <Labeled label={field.label} hint={field.hint}>
          {field.multiline
            ? <textarea className="sx-input" rows={2} value={asString(current)} placeholder={field.placeholder} onChange={e => set(e.target.value)} />
            : <input className="sx-input" value={asString(current)} placeholder={field.placeholder} onChange={e => set(e.target.value)} />}
        </Labeled>
      );
    case "number":
      return (
        <Labeled label={field.label} hint={field.hint}>
          <input className="sx-input narrow" type="number" min={field.min} max={field.max} value={typeof current === "number" ? current : ""}
            onChange={e => set(e.target.value === "" ? undefined : Number(e.target.value))} />
        </Labeled>
      );
    case "select":
      return (
        <Labeled label={field.label}>
          <select className="sx-input" value={asString(current)} onChange={e => set(e.target.value)}>
            {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Labeled>
      );
    case "bool":
      return (
        <label className="sx-check">
          <input type="checkbox" checked={current === true} onChange={e => set(e.target.checked ? true : undefined)} />
          <span>{field.label}</span>
          {field.hint && <em>{field.hint}</em>}
        </label>
      );
    case "pict":
      return <PictField label={field.label} value={asString(current)} onChange={set} />;
    case "strings":
      return <StringsField field={field} value={asList(current).map(asString)} onChange={set} />;
    case "groups":
      return <GroupsField field={field} value={asList(current).map(g => asList(g).map(asString))} onChange={set} />;
    case "record":
      return <RecordField field={field} value={asRec(current)} onChange={set} />;
    case "ref": {
      const options = asList(root[field.from]).map(asRec);
      return (
        <Labeled label={field.label}>
          <select className="sx-input" value={asString(current)} onChange={e => set(e.target.value)}>
            <option value="">— Choisir —</option>
            {options.map((o, i) => <option key={asString(o.id) || i} value={asString(o.id)}>{asString(o.label) || asString(o.id)}</option>)}
          </select>
        </Labeled>
      );
    }
    case "multiref": {
      const options = asList(root[field.from]).map(asRec);
      const chosen = new Set(asList(current).map(asString));
      return (
        <div className="sx-field">
          <span className="sx-label">{field.label}</span>
          <div className="sx-chips">
            {options.length === 0 && <span className="sx-hint">Ajoutez d'abord des éléments dans la liste concernée.</span>}
            {options.map((o, i) => {
              const id = asString(o.id);
              const on = chosen.has(id);
              return (
                <button key={id || i} type="button" className="sx-chip" aria-pressed={on}
                  onClick={() => set(on ? asList(current).filter(x => x !== id) : [...asList(current), id])}>
                  {asString(o.label) || id}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    case "object": {
      const object = current === undefined ? null : asRec(current);
      if (field.optional && object === null) {
        return (
          <div className="sx-group">
            <button type="button" className="sx-add" onClick={() => set(field.blank ? field.blank() : {})}><Plus size={14} /> Ajouter : {field.label}</button>
          </div>
        );
      }
      return (
        <fieldset className="sx-group">
          <legend>
            {field.label}
            {field.optional && <button type="button" className="sx-icon-btn" onClick={() => set(undefined)} aria-label={`Retirer : ${field.label}`}><X size={14} /></button>}
          </legend>
          <SchemaForm fields={field.fields} value={object ?? {}} root={root} onChange={set} />
        </fieldset>
      );
    }
    case "list":
      return <ListField field={field} items={asList(current).map(asRec)} root={root} onChange={set} />;
  }
}

/* ── Image (pictogramme du catalogue) ───────────────────────────────────── */

function PictField({ label, value, onChange }: { label: string; value: string; onChange: (v: string | undefined) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PICTOS.slice(0, 8);
    return PICTOS.filter(([id, description]) => id.includes(q) || description.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  return (
    <div className="sx-field">
      <span className="sx-label">{label}</span>
      <div className="sx-pict">
        <span className="sx-pict-thumb">{value ? <img src={pictoUrl(value)} alt="" onError={e => { e.currentTarget.style.visibility = "hidden"; }} /> : null}</span>
        <div className="sx-pict-search">
          <Search size={14} aria-hidden="true" />
          <input
            className="sx-input" placeholder={value || "Chercher une image…"} value={open ? query : value}
            onFocus={() => { setOpen(true); setQuery(""); }} onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onChange={e => setQuery(e.target.value)} aria-label={`${label} : rechercher dans le catalogue`}
          />
          {value && <button type="button" className="sx-icon-btn" onClick={() => onChange(undefined)} aria-label="Retirer l'image"><X size={14} /></button>}
          {open && (
            <ul className="sx-pict-list" role="listbox">
              {results.length === 0 && <li className="sx-pict-empty">Aucune image ne correspond.</li>}
              {results.map(([id, description]) => (
                <li key={id} role="option" aria-selected={id === value}>
                  <button type="button" onMouseDown={e => { e.preventDefault(); onChange(id); setOpen(false); }}>
                    <img src={pictoUrl(id)} alt="" onError={e => { e.currentTarget.style.visibility = "hidden"; }} />
                    <span><b>{id}</b><small>{description}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Listes de textes, groupes de mots, paires clé / valeur ──────────────── */

function StringsField({ field, value, onChange }: { field: Extract<FieldDef, { kind: "strings" }>; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="sx-field">
      <span className="sx-label">{field.label}</span>
      <div className="sx-rows">
        {value.map((text, i) => (
          <div className="sx-row" key={i}>
            <input className="sx-input" value={text} onChange={e => onChange(value.map((t, j) => (j === i ? e.target.value : t)))} aria-label={`${field.label} ${i + 1}`} />
            <button type="button" className="sx-icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Retirer"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className="sx-add" onClick={() => onChange([...value, ""])}><Plus size={14} /> {field.addLabel ?? "Ajouter"}</button>
      </div>
      {field.hint && <span className="sx-hint">{field.hint}</span>}
    </div>
  );
}

function GroupsField({ field, value, onChange }: { field: Extract<FieldDef, { kind: "groups" }>; value: string[][]; onChange: (v: string[][]) => void }) {
  return (
    <div className="sx-field">
      <span className="sx-label">{field.label}</span>
      <div className="sx-rows">
        {value.map((group, i) => (
          <div className="sx-row" key={i}>
            <input className="sx-input" value={group.join(", ")} placeholder="mot, synonyme, autre synonyme"
              onChange={e => onChange(value.map((g, j) => (j === i ? e.target.value.split(",").map(w => w.trimStart()) : g)))} aria-label={`Groupe ${i + 1}`} />
            <button type="button" className="sx-icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Retirer"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className="sx-add" onClick={() => onChange([...value, [""]])}><Plus size={14} /> Ajouter un groupe</button>
      </div>
      {field.hint && <span className="sx-hint">{field.hint}</span>}
    </div>
  );
}

function RecordField({ field, value, onChange }: { field: Extract<FieldDef, { kind: "record" }>; value: Rec; onChange: (v: Rec) => void }) {
  // L'ordre des paires est celui de l'objet ; renommer une clé la garde à sa place.
  const entries = Object.entries(value).map(([k, v]) => [k, asString(v)] as const);
  const rebuild = (next: (readonly [string, string])[]) => onChange(Object.fromEntries(next));
  return (
    <div className="sx-field">
      <span className="sx-label">{field.label}</span>
      <div className="sx-rows">
        {entries.map(([k, v], i) => (
          <div className="sx-row" key={i}>
            <input className="sx-input" value={k} placeholder={field.keyLabel} aria-label={field.keyLabel}
              onChange={e => rebuild(entries.map((p, j) => (j === i ? [e.target.value, v] as const : p)))} />
            <input className="sx-input" value={v} placeholder={field.valueLabel} aria-label={field.valueLabel}
              onChange={e => rebuild(entries.map((p, j) => (j === i ? [k, e.target.value] as const : p)))} />
            <button type="button" className="sx-icon-btn" onClick={() => rebuild(entries.filter((_, j) => j !== i))} aria-label="Retirer"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className="sx-add" onClick={() => rebuild([...entries, [`cle${entries.length + 1}`, ""]])}><Plus size={14} /> Ajouter</button>
      </div>
      {field.hint && <span className="sx-hint">{field.hint}</span>}
    </div>
  );
}

/* ── Liste d'éléments réordonnables ──────────────────────────────────────── */

function ListField({ field, items, root, onChange }: { field: Extract<FieldDef, { kind: "list" }>; items: Rec[]; root: Rec; onChange: (v: Rec[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [closed, setClosed] = useState<Record<number, boolean>>({});
  const ids = items.map((_, i) => `${field.key}-${i}`);
  const canAdd = field.max === undefined || items.length < field.max;
  const canRemove = items.length > (field.min ?? 0);

  // Une case « exclusive » (bonne réponse unique) se décoche chez les autres quand on la coche.
  const update = (index: number, next: Rec) => {
    const exclusiveKeys = field.fields.filter(f => f.kind === "bool" && f.exclusive).map(f => f.key);
    onChange(items.map((item, i) => {
      if (i === index) return next;
      const turnedOn = exclusiveKeys.filter(k => next[k] === true && item[k] === true);
      if (turnedOn.length === 0) return item;
      const copy = { ...item };
      for (const k of turnedOn) delete copy[k];
      return copy;
    }));
  };

  const duplicate = (index: number) => {
    const copy = JSON.parse(JSON.stringify(items[index])) as Rec;
    if (typeof copy.id === "string") copy.id = uid(copy.id.charAt(0) || "x");
    onChange([...items.slice(0, index + 1), copy, ...items.slice(index + 1)]);
  };

  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onChange(arrayMove(items, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  return (
    <div className="sx-field">
      <span className="sx-label">{field.label} <small>({items.length})</small></span>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="sx-list">
            {items.map((item, i) => (
              <ListItem key={ids[i]} id={ids[i]} title={`${field.itemLabel} ${i + 1}${field.summary && asString(item[field.summary]) ? ` · ${asString(item[field.summary]).slice(0, 36)}` : ""}`}
                open={!closed[i]} onToggle={() => setClosed(c => ({ ...c, [i]: !c[i] }))}
                onDuplicate={canAdd ? () => duplicate(i) : undefined} onRemove={canRemove ? () => onChange(items.filter((_, j) => j !== i)) : undefined}>
                <SchemaForm fields={field.fields} value={item} root={root} onChange={next => update(i, next)} />
              </ListItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {canAdd && <button type="button" className="sx-add" onClick={() => onChange([...items, field.blank()])}><Plus size={14} /> Ajouter : {field.itemLabel.toLowerCase()}</button>}
      {field.hint && <span className="sx-hint">{field.hint}</span>}
    </div>
  );
}

function ListItem({ id, title, open, onToggle, onDuplicate, onRemove, children }: {
  id: string; title: string; open: boolean; onToggle: () => void; onDuplicate?: () => void; onRemove?: () => void; children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} className="sx-item" data-dragging={isDragging} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div className="sx-item-head">
        <button type="button" className="sx-handle" {...attributes} {...listeners} aria-label={`Déplacer : ${title}`}><GripVertical size={16} /></button>
        <button type="button" className="sx-item-title" onClick={onToggle} aria-expanded={open}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />} {title}
        </button>
        {onDuplicate && <button type="button" className="sx-icon-btn" onClick={onDuplicate} aria-label="Dupliquer"><Copy size={14} /></button>}
        {onRemove && <button type="button" className="sx-icon-btn danger" onClick={onRemove} aria-label="Supprimer"><Trash2 size={14} /></button>}
      </div>
      {open && <div className="sx-item-body">{children}</div>}
    </div>
  );
}
