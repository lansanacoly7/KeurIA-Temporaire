import { useRef, useState } from "react";
import { AlignCenter, AlignLeft, ArrowDown, ArrowUp, Film, ImagePlus, Plus, Replace, RotateCcw, Trash2, Video, X } from "lucide-react";
import { lessonImageUrl } from "@/app/dashboard/parcours79/Img79";
import { parseVideoEmbedUrl, resetScreenLayout, resolveMediaSource, updateScreenLayout } from "@/app/dashboard/parcours79/logic";
import type { ActivityScreen, BravoScreen, CastId, CreateScreen, LessonContent, MediaAction, MediaBlock, MediaScreen, Pose, Round, Screen, ScreenLayout, TextScreen } from "@/app/dashboard/parcours79/types";
import type { MediaItem } from "@/app/_scolaire/lib/studio79Api";
import { ConfirmModal } from "@/app/_scolaire/ui/ui";
import { MediaPicker } from "./MediaPicker";
import { newRound, ROUND_TYPE_ORDER, ROUND_TYPES, uid, type FieldDef, type Rec, type RoundType } from "./roundSchemas";
import { SchemaForm } from "./SchemaForm";
import { CAST, moveItem, POSE_LABELS, POSES, SCREEN_KINDS, sentenceStats } from "./studioModel";

/* ── Petits éléments communs ─────────────────────────────────────────────── */

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="sx-section">
      <h3>{title}</h3>
      {hint && <p className="sx-hint">{hint}</p>}
      {children}
    </section>
  );
}

/** Zone de texte avec compteur : la bible narrative demande deux phrases de 12 mots au plus ; au-delà, c'est un avertissement, jamais un blocage. */
function SpeechText({ label, value, onChange, max = 2, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; max?: number; rows?: number; placeholder?: string }) {
  const { sentences, longest } = sentenceStats(value);
  const long = sentences > max || longest > 14;
  return (
    <label className="sx-field">
      <span className="sx-label">{label}</span>
      <textarea className="sx-input" rows={rows} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      <span className="sx-counter" data-warn={long}>
        {sentences} phrase{sentences > 1 ? "s" : ""} · plus longue : {longest} mot{longest > 1 ? "s" : ""}
        {long && ` — idéal : ${max} phrases, 12 mots chacune`}
      </span>
    </label>
  );
}

function PosePicker({ value, onChange }: { value: Pose; onChange: (p: Pose) => void }) {
  return (
    <div className="sx-poses" role="radiogroup" aria-label="Pose de Palou">
      {POSES.map(pose => (
        <button key={pose} type="button" role="radio" aria-checked={value === pose} title={POSE_LABELS[pose]} className="sx-pose" data-on={value === pose} onClick={() => onChange(pose)}>
          <img src={`/images/palou/Palou_${pose}.png`} alt={POSE_LABELS[pose]} loading="lazy" />
        </button>
      ))}
    </div>
  );
}

function ImageBlock({ image, alt, onChange }: { image?: string; alt?: string; onChange: (next: { image?: string; alt?: string }) => void }) {
  const [picking, setPicking] = useState(false);
  const pick = (item: MediaItem) => { setPicking(false); onChange({ image: item.ref, alt: alt || item.name.replace(/\.[^.]+$/, "") }); };
  return (
    <>
      {image ? (
        <div className="sx-image">
          <img src={lessonImageUrl(image)} alt={alt ?? ""} onError={e => { e.currentTarget.style.opacity = "0.25"; }} />
          <div className="sx-image-actions">
            <button type="button" className="ec-btn" onClick={() => setPicking(true)}><Replace size={15} aria-hidden="true" /> Remplacer</button>
            <button type="button" className="ec-btn ec-btn--danger" onClick={() => onChange({ image: undefined, alt: undefined })}><X size={15} aria-hidden="true" /> Retirer</button>
          </div>
        </div>
      ) : (
        <button type="button" className="sx-image-empty" onClick={() => setPicking(true)}>
          <ImagePlus size={26} aria-hidden="true" />
          <b>Ajouter une image</b>
          <small>Depuis la médiathèque, ou en envoyant un fichier</small>
        </button>
      )}
      {image && (
        <label className="sx-field">
          <span className="sx-label">Description de l&apos;image <small>(obligatoire, lue par les lecteurs d&apos;écran)</small></span>
          <input className="sx-input" value={alt ?? ""} onChange={e => onChange({ image, alt: e.target.value })} />
        </label>
      )}
      {picking && <MediaPicker kind="image" onPick={pick} onClose={() => setPicking(false)} />}
    </>
  );
}

function MediaBlockEditor({
  media,
  onChange,
}: {
  media?: MediaBlock;
  onChange: (next: MediaBlock) => void;
}) {
  const currentMedia: MediaBlock = media || { type: "video-link", url: "" };
  const [pickingVideo, setPickingVideo] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  const setType = (type: MediaBlock["type"]) => {
    if (type === currentMedia.type) return;
    onChange({ type, caption: currentMedia.caption });
  };

  const parsedVideo = currentMedia.type === "video-link" && currentMedia.url ? parseVideoEmbedUrl(currentMedia.url) : null;
  const isBadUrl = currentMedia.type === "video-link" && currentMedia.url && !parsedVideo;

  return (
    <div className="sx-media-editor">
      <div className="sx-field">
        <span className="sx-label">Type de média</span>
        <div className="sx-media-types" role="radiogroup" aria-label="Type de média">
          <button
            type="button"
            className="sx-media-type-btn"
            data-active={currentMedia.type === "video-link"}
            onClick={() => setType("video-link")}
          >
            <Video size={16} aria-hidden="true" /> Lien vidéo (YouTube / Vimeo)
          </button>
          <button
            type="button"
            className="sx-media-type-btn"
            data-active={currentMedia.type === "video-file"}
            onClick={() => setType("video-file")}
          >
            <Film size={16} aria-hidden="true" /> Fichier vidéo (Médiathèque)
          </button>
          <button
            type="button"
            className="sx-media-type-btn"
            data-active={currentMedia.type === "image"}
            onClick={() => setType("image")}
          >
            <ImagePlus size={16} aria-hidden="true" /> Image
          </button>
        </div>
      </div>

      {currentMedia.type === "video-link" && (
        <div className="sx-field">
          <label className="sx-field">
            <span className="sx-label">
              Adresse de la vidéo <small>(YouTube ou Vimeo en https://)</small>
            </span>
            <input
              type="url"
              className="sx-input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={currentMedia.url || ""}
              onChange={e => onChange({ ...currentMedia, url: e.target.value })}
            />
          </label>
          {isBadUrl && (
            <p className="sx-field-error">
              Lien non reconnu ou domaine non autorisé (seuls YouTube et Vimeo en https:// sont acceptés).
            </p>
          )}
          {parsedVideo && (
            <div className="sx-video-preview">
              <div className="sx-video-embed-box">
                <iframe
                  src={parsedVideo.embedUrl}
                  title="Aperçu vidéo"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  allowFullScreen
                />
              </div>
              <span className="sx-video-badge">✓ Vidéo {parsedVideo.provider === "youtube" ? "YouTube" : "Vimeo"} prête</span>
            </div>
          )}
        </div>
      )}

      {currentMedia.type === "video-file" && (
        <div className="sx-field">
          <span className="sx-label">Fichier vidéo</span>
          {currentMedia.ref ? (
            <div className="sx-video-file-preview">
              <video
                controls
                playsInline
                preload="metadata"
                src={resolveMediaSource(currentMedia.ref)}
                className="sx-video-player"
              />
              <div className="sx-row sx-gap-sm">
                <button
                  type="button"
                  className="ec-btn"
                  onClick={() => setPickingVideo(true)}
                >
                  <Replace size={14} aria-hidden="true" /> Changer de vidéo
                </button>
                <button
                  type="button"
                  className="ec-btn ec-btn--danger"
                  onClick={() => onChange({ ...currentMedia, ref: undefined })}
                >
                  <X size={14} aria-hidden="true" /> Retirer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="sx-image-empty"
              onClick={() => setPickingVideo(true)}
            >
              <Film size={26} aria-hidden="true" />
              <b>Choisir une vidéo</b>
              <small>Fichier MP4 de la médiathèque</small>
            </button>
          )}
          {pickingVideo && (
            <MediaPicker
              kind="video"
              onPick={item => {
                setPickingVideo(false);
                onChange({ ...currentMedia, ref: item.ref });
              }}
              onClose={() => setPickingVideo(false)}
            />
          )}
        </div>
      )}

      {currentMedia.type === "image" && (
        <div className="sx-field">
          <span className="sx-label">Image</span>
          {currentMedia.ref ? (
            <div className="sx-image">
              <img
                src={resolveMediaSource(currentMedia.ref)}
                alt={currentMedia.caption || "Image"}
              />
              <div className="sx-image-actions">
                <button
                  type="button"
                  className="ec-btn"
                  onClick={() => setPickingImage(true)}
                >
                  <Replace size={15} aria-hidden="true" /> Remplacer
                </button>
                <button
                  type="button"
                  className="ec-btn ec-btn--danger"
                  onClick={() => onChange({ ...currentMedia, ref: undefined })}
                >
                  <X size={15} aria-hidden="true" /> Retirer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="sx-image-empty"
              onClick={() => setPickingImage(true)}
            >
              <ImagePlus size={26} aria-hidden="true" />
              <b>Ajouter une image</b>
              <small>Depuis la médiathèque ou en envoyant un fichier</small>
            </button>
          )}
          {pickingImage && (
            <MediaPicker
              kind="image"
              onPick={item => {
                setPickingImage(false);
                onChange({ ...currentMedia, ref: item.ref });
              }}
              onClose={() => setPickingImage(false)}
            />
          )}
        </div>
      )}

      <label className="sx-field">
        <span className="sx-label">Légende <small>(facultative, affichée sous le média)</small></span>
        <input
          type="text"
          className="sx-input"
          placeholder="Ex : Explication de Palou sur les réseaux"
          value={currentMedia.caption || ""}
          onChange={e => onChange({ ...currentMedia, caption: e.target.value })}
        />
      </label>
    </div>
  );
}

function ActionsEditor({
  actions,
  onChange,
}: {
  actions?: MediaAction[];
  onChange: (next: MediaAction[]) => void;
}) {
  const list = actions || [];

  const addAction = () => {
    onChange([...list, { label: "Continuer", kind: "lesson", target: "p1-2" }]);
  };

  const updateAction = (index: number, patch: Partial<MediaAction>) => {
    const next = [...list];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeAction = (index: number) => {
    onChange(list.filter((_, i) => i !== index));
  };

  return (
    <div className="sx-actions-editor">
      {list.map((action, i) => (
        <div key={i} className="sx-action-card">
          <div className="sx-action-card-header">
            <b>Bouton {i + 1}</b>
            <button
              type="button"
              className="sx-icon-btn"
              onClick={() => removeAction(i)}
              aria-label="Supprimer ce bouton"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="sx-action-fields">
            <label className="sx-field">
              <span className="sx-label">Texte du bouton</span>
              <input
                type="text"
                className="sx-input"
                placeholder="Ex : Leçon suivante"
                value={action.label}
                onChange={e => updateAction(i, { label: e.target.value })}
              />
            </label>
            <div className="sx-action-row">
              <label className="sx-field" style={{ flex: "0 0 160px" }}>
                <span className="sx-label">Type d&apos;action</span>
                <select
                  className="sx-input"
                  value={action.kind}
                  onChange={e => updateAction(i, {
                    kind: e.target.value as "lesson" | "external",
                    target: e.target.value === "lesson" ? "p1-1" : "https://"
                  })}
                >
                  <option value="lesson">Autre leçon (interne)</option>
                  <option value="external">Lien externe (protégé)</option>
                </select>
              </label>
              <label className="sx-field" style={{ flex: 1 }}>
                <span className="sx-label">
                  {action.kind === "lesson" ? "Identifiant leçon (ex: p2-3)" : "Adresse web (https://...)"}
                </span>
                <input
                  type={action.kind === "external" ? "url" : "text"}
                  className="sx-input"
                  placeholder={action.kind === "lesson" ? "p1-2" : "https://..."}
                  value={action.target}
                  onChange={e => updateAction(i, { target: e.target.value })}
                />
              </label>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="sx-add" onClick={addAction}>
        <Plus size={14} aria-hidden="true" /> Ajouter un bouton d&apos;action
      </button>
    </div>
  );
}

/* ── Fiche de la leçon (aucun écran sélectionné) ─────────────────────────── */

export function LessonInfoInspector({ content, onChange }: { content: LessonContent; onChange: (next: LessonContent) => void }) {
  const toggleCast = (id: CastId) => onChange({ ...content, cast: content.cast.includes(id) ? content.cast.filter(c => c !== id) : [...content.cast, id] });
  return (
    <div className="sx-inspector-body">
      <Section title="Cette leçon" hint="Le titre et l'identifiant suivent le catalogue du parcours : on ne les change pas ici.">
        <dl className="sx-dl"><dt>Titre</dt><dd>{content.title}</dd><dt>Identifiant</dt><dd>{content.id}</dd></dl>
      </Section>
      <Section title="L'histoire">
        <label className="sx-field"><span className="sx-label">Lieu de l&apos;histoire</span>
          <input className="sx-input" value={content.scene?.label ?? ""} onChange={e => onChange({ ...content, scene: { id: content.scene?.id ?? "scene", label: e.target.value } })} /></label>
        <label className="sx-field"><span className="sx-label">Le problème <small>(affiché au début de la leçon)</small></span>
          <textarea className="sx-input" rows={3} value={content.problem ?? ""} onChange={e => onChange({ ...content, problem: e.target.value })} /></label>
        <label className="sx-field"><span className="sx-label">Rappel d&apos;un épisode précédent</span>
          <textarea className="sx-input" rows={2} value={content.callback ?? ""} onChange={e => onChange({ ...content, callback: e.target.value || undefined })} /></label>
      </Section>
      <Section title="Les personnages" hint="Palou est toujours là. Chaque personnage listé doit être nommé dans le texte.">
        <div className="sx-chips">
          {CAST.map(c => (
            <button key={c.id} type="button" className="sx-chip" aria-pressed={content.cast.includes(c.id)} disabled={c.id === "palou"} onClick={() => toggleCast(c.id)}>{c.label}</button>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ── Activités (écrans « À toi de jouer » et « Pourquoi ? ») ─────────────── */

function RoundsEditor({ rounds, onChange }: { rounds: Round[]; onChange: (next: Round[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [switching, setSwitching] = useState<{ index: number; type: RoundType } | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  return (
    <Section title="Activités" hint="Les manches se jouent l'une après l'autre. Chaque activité a ses propres champs.">
      {rounds.map((round, i) => {
        const def = ROUND_TYPES[round.type as RoundType];
        return (
          <div className="sx-round" key={i}>
            <div className="sx-round-head">
              <b>Manche {i + 1}</b>
              <select className="sx-input" value={round.type} aria-label={`Type de la manche ${i + 1}`} onChange={e => setSwitching({ index: i, type: e.target.value as RoundType })}>
                {ROUND_TYPE_ORDER.map(t => <option key={t} value={t}>{ROUND_TYPES[t].label}</option>)}
              </select>
              <button type="button" className="sx-icon-btn" disabled={i === 0} onClick={() => onChange(moveItem(rounds, i, i - 1))} aria-label="Monter"><ArrowUp size={14} /></button>
              <button type="button" className="sx-icon-btn" disabled={i === rounds.length - 1} onClick={() => onChange(moveItem(rounds, i, i + 1))} aria-label="Descendre"><ArrowDown size={14} /></button>
              <button type="button" className="sx-icon-btn danger" disabled={rounds.length <= 1} onClick={() => setRemoving(i)} aria-label="Supprimer la manche"><Trash2 size={14} /></button>
            </div>
            {def ? <p className="sx-hint">{def.description}</p> : <p className="sx-hint" role="alert">Type d&apos;activité inconnu : « {String(round.type)} ». Choisissez-en un.</p>}
            {def && <SchemaForm fields={def.fields as FieldDef[]} value={round as unknown as Rec} onChange={next => onChange(rounds.map((r, j) => (j === i ? (next as unknown as Round) : r)))} />}
          </div>
        );
      })}

      {adding ? (
        <div className="sx-picker">
          <div className="sx-picker-head"><b>Quelle activité ajouter ?</b><button type="button" className="sx-icon-btn" onClick={() => setAdding(false)} aria-label="Fermer"><X size={14} /></button></div>
          {ROUND_TYPE_ORDER.map(t => (
            <button key={t} type="button" onClick={() => { onChange([...rounds, newRound(t)]); setAdding(false); }}>
              <b>{ROUND_TYPES[t].label}</b><small>{ROUND_TYPES[t].description}</small>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="sx-add" onClick={() => setAdding(true)}><Plus size={14} /> Ajouter une manche</button>
      )}

      {switching && (
        <ConfirmModal
          title={`Passer à « ${ROUND_TYPES[switching.type].label} » ?`}
          consequences={["Les champs de cette manche sont remplacés par ceux du nouveau type (le contenu actuel de la manche est perdu)."]}
          reversibility="Tant que vous n'avez pas publié, vous pouvez écarter le brouillon pour revenir en arrière."
          confirmLabel="Changer le type" danger
          onConfirm={() => { onChange(rounds.map((r, j) => (j === switching.index ? newRound(switching.type) : r))); setSwitching(null); }}
          onClose={() => setSwitching(null)}
        />
      )}
      {removing !== null && (
        <ConfirmModal title={`Supprimer la manche ${removing + 1} ?`} consequences={["Cette manche disparaît de l'écran."]} confirmLabel="Supprimer" danger
          onConfirm={() => { onChange(rounds.filter((_, j) => j !== removing)); setRemoving(null); }} onClose={() => setRemoving(null)} />
      )}
    </Section>
  );
}

const CREATE_STEP_FIELDS: FieldDef[] = [
  { kind: "list", key: "steps", label: "Étapes", itemLabel: "Étape", min: 1, summary: "prompt", blank: () => ({ prompt: "", count: 1, tray: [{ id: uid("t"), label: "" }, { id: uid("t"), label: "" }] }),
    fields: [
      { kind: "text", key: "prompt", label: "Consigne de l'étape", multiline: true },
      { kind: "number", key: "count", label: "Nombre de choix à faire", min: 1, hint: "Toujours moins que d'objets proposés." },
      { kind: "list", key: "tray", label: "Objets proposés", itemLabel: "Objet", min: 2, summary: "label", blank: () => ({ id: uid("t"), label: "" }),
        fields: [{ kind: "text", key: "label", label: "Nom" }, { kind: "pict", key: "pict", label: "Image" }] },
    ] },
];

/* ── Mise en page par écran (T19) ────────────────────────────────────────── */

function SxRadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  className = "sx-layout-row",
}: {
  label: string;
  options: { value: T; label: string; render?: React.ReactNode }[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % options.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    }
    if (nextIndex >= 0) {
      const nextOpt = options[nextIndex];
      onChange(nextOpt.value);
      const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      buttons?.[nextIndex]?.focus();
    }
  };

  return (
    <div ref={containerRef} className={className} role="radiogroup" aria-label={label}>
      {options.map((opt, i) => {
        const isChecked = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isChecked}
            data-on={isChecked}
            tabIndex={isChecked ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={e => handleKeyDown(e, i)}
            className="sx-layout-btn"
          >
            {opt.render ?? <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

function LayoutEditor({
  layout,
  hasImage,
  onChange,
}: {
  layout?: ScreenLayout;
  hasImage: boolean;
  onChange: (nextLayout?: ScreenLayout) => void;
}) {
  const setField = (patch: Partial<ScreenLayout>) => {
    onChange(updateScreenLayout(layout, patch));
  };

  const textSize = layout?.textSize ?? "md";
  const align = layout?.align ?? "left";
  const image = layout?.image ?? "right";
  const imageSize = layout?.imageSize ?? "m";

  const textSizeOptions: { value: "sm" | "md" | "lg" | "xl"; label: string; render: React.ReactNode }[] = [
    { value: "sm", label: "Petit", render: <><span className="sx-a sx-a-sm" aria-hidden="true">A</span><span>Petit</span></> },
    { value: "md", label: "Normal", render: <><span className="sx-a sx-a-md" aria-hidden="true">A</span><span>Normal</span></> },
    { value: "lg", label: "Grand", render: <><span className="sx-a sx-a-lg" aria-hidden="true">A</span><span>Grand</span></> },
    { value: "xl", label: "Très grand", render: <><span className="sx-a sx-a-xl" aria-hidden="true">A</span><span>Très grand</span></> },
  ];

  const alignOptions: { value: "left" | "center"; label: string; render: React.ReactNode }[] = [
    { value: "left", label: "À gauche", render: <><AlignLeft size={16} aria-hidden="true" /><span>À gauche</span></> },
    { value: "center", label: "Centré", render: <><AlignCenter size={16} aria-hidden="true" /><span>Centré</span></> },
  ];

  const imagePosOptions: { value: "left" | "right" | "top" | "bottom"; label: string; render: React.ReactNode }[] = [
    {
      value: "left",
      label: "Image à gauche",
      render: (
        <>
          <span className="sx-schematic sx-sch-left" aria-hidden="true">
            <i className="sx-sch-img" />
            <span className="sx-sch-lines"><i /><i /><i /></span>
          </span>
          <span>À gauche</span>
        </>
      ),
    },
    {
      value: "right",
      label: "Image à droite",
      render: (
        <>
          <span className="sx-schematic sx-sch-right" aria-hidden="true">
            <span className="sx-sch-lines"><i /><i /><i /></span>
            <i className="sx-sch-img" />
          </span>
          <span>À droite</span>
        </>
      ),
    },
    {
      value: "top",
      label: "Image en haut",
      render: (
        <>
          <span className="sx-schematic sx-sch-top" aria-hidden="true">
            <i className="sx-sch-img" />
            <span className="sx-sch-lines"><i /><i /></span>
          </span>
          <span>En haut</span>
        </>
      ),
    },
    {
      value: "bottom",
      label: "Image en bas",
      render: (
        <>
          <span className="sx-schematic sx-sch-bottom" aria-hidden="true">
            <span className="sx-sch-lines"><i /><i /></span>
            <i className="sx-sch-img" />
          </span>
          <span>En bas</span>
        </>
      ),
    },
  ];

  const imageSizeOptions: { value: "s" | "m" | "l"; label: string; render: React.ReactNode }[] = [
    { value: "s", label: "Petite (S)", render: <span>S</span> },
    { value: "m", label: "Moyenne (M)", render: <span>M</span> },
    { value: "l", label: "Grande (L)", render: <span>L</span> },
  ];

  return (
    <div className="sx-layout-editor">
      <div className="sx-field">
        <span className="sx-label">Taille du texte</span>
        <SxRadioGroup
          label="Taille du texte de Palou"
          options={textSizeOptions}
          value={textSize}
          onChange={val => setField({ textSize: val })}
        />
      </div>

      <div className="sx-field">
        <span className="sx-label">Alignement du texte</span>
        <SxRadioGroup
          label="Alignement du texte"
          options={alignOptions}
          value={align}
          onChange={val => setField({ align: val })}
        />
      </div>

      {hasImage && (
        <>
          <div className="sx-field">
            <span className="sx-label">Position de l&apos;image</span>
            <SxRadioGroup
              label="Position de l'image"
              className="sx-layout-grid"
              options={imagePosOptions}
              value={image}
              onChange={val => setField({ image: val })}
            />
          </div>

          <div className="sx-field">
            <span className="sx-label">Taille de l&apos;image</span>
            <SxRadioGroup
              label="Taille de l'image"
              options={imageSizeOptions}
              value={imageSize}
              onChange={val => setField({ imageSize: val })}
            />
          </div>
        </>
      )}

      {layout && (
        <div className="sx-layout-reset-row">
          <button
            type="button"
            className="sx-layout-reset-btn"
            onClick={() => onChange(resetScreenLayout())}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Rétablir la mise en page par défaut
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Inspecteur d'un écran ───────────────────────────────────────────────── */

export function ScreenInspector({ screen, onChange }: { screen: Screen; onChange: (next: Screen) => void }) {
  // `kind` ne change jamais ici : une intersection des écrans (qui ont chacun un `kind` différent) n'aurait aucun sens.
  const patch = (changes: Partial<Omit<TextScreen, "kind"> & Omit<ActivityScreen, "kind"> & Omit<CreateScreen, "kind"> & Omit<BravoScreen, "kind"> & Omit<MediaScreen, "kind">>) => onChange({ ...screen, ...changes } as Screen);
  const meta = SCREEN_KINDS[screen.kind];
  const hasImage = screen.kind === "story" || screen.kind === "discover" || screen.kind === "ai" || (screen.kind === "media" && screen.media?.type === "image");
  const wolof = "wolof" in screen ? screen.wolof : undefined;

  return (
    <div className="sx-inspector-body">
      <div className="sx-kind-banner" data-tone={meta.tone}><meta.icon size={18} aria-hidden="true" /><div><b>{meta.label}</b><small>{meta.description}</small></div></div>

      <Section title="Ce que dit Palou">
        <SpeechText label="Texte affiché" value={screen.text} onChange={text => patch({ text })} placeholder="Deux phrases courtes, pour un enfant de 7 à 9 ans." />
        <label className="sx-field"><span className="sx-label">Qui parle ? <small>(facultatif)</small></span>
          <select className="sx-input" value={"speaker" in screen && screen.speaker ? screen.speaker : ""} onChange={e => patch({ speaker: (e.target.value || undefined) as CastId | undefined })}>
            <option value="">Palou (par défaut)</option>
            {CAST.filter(c => c.id !== "palou").map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select></label>
        <div className="sx-field"><span className="sx-label">Pose de Palou</span><PosePicker value={screen.pose ?? "Content"} onChange={pose => patch({ pose })} /></div>
      </Section>

      <Section title="Mise en page" hint="Disposition du texte et de l'image sur cet écran.">
        <LayoutEditor
          layout={screen.layout}
          hasImage={Boolean(hasImage && (screen.image || (screen.kind === "media" && screen.media?.ref)))}
          onChange={nextLayout => onChange({ ...screen, layout: nextLayout } as Screen)}
        />
      </Section>


      {hasImage && screen.kind !== "media" && (
        <Section title="Image" hint="Elle est allégée automatiquement. Sans image, Palou s'affiche à la place.">
          <ImageBlock image={screen.image} alt={screen.alt} onChange={({ image, alt }) => patch({ image, alt })} />
        </Section>
      )}

      {screen.kind === "media" && (
        <>
          <Section title="Média (vidéo ou image)" hint="Intégrez une vidéo YouTube ou Vimeo, ou choisissez un fichier vidéo ou image.">
            <MediaBlockEditor
              media={screen.media}
              onChange={media => onChange({ ...screen, media } as Screen)}
            />
          </Section>

          <Section title="Boutons et liens d'action" hint="Boutons interactifs proposés à l'enfant. Les liens externes sont protégés par confirmation adulte.">
            <ActionsEditor
              actions={screen.actions}
              onChange={actions => onChange({ ...screen, actions } as Screen)}
            />
          </Section>
        </>
      )}

      {screen.kind === "discover" && (
        <Section title="Mot nouveau" hint="Un seul mot par leçon.">
          <SchemaForm value={{ word: screen.word ?? { terme: "", sens: "" } }} onChange={next => patch({ word: next.word as TextScreen["word"] })}
            fields={[{ kind: "object", key: "word", label: "Le mot", fields: [{ kind: "text", key: "terme", label: "Mot" }, { kind: "text", key: "sens", label: "Ce que ça veut dire", multiline: true }] }]} />
        </Section>
      )}

      {screen.kind === "bravo" && (
        <Section title="Je retiens">
          <label className="sx-field"><span className="sx-label">Ce que j&apos;ai appris <small>(une seule phrase)</small></span>
            <textarea className="sx-input" rows={2} value={screen.learned ?? ""} onChange={e => patch({ learned: e.target.value })} /></label>
          <label className="sx-field"><span className="sx-label">Autocollant du chapitre <small>(dernière leçon seulement)</small></span>
            <input className="sx-input narrow" placeholder="m01" value={screen.sticker ?? ""} onChange={e => patch({ sticker: e.target.value || undefined })} /></label>
        </Section>
      )}

      {screen.kind === "create" && (
        <Section title="Création" hint="L'enfant fait des choix à toucher ; le résultat est gardé dans son carnet.">
          <SchemaForm value={screen as unknown as Rec} onChange={next => onChange(next as unknown as Screen)}
            fields={[{ kind: "text", key: "carnet", label: "Titre dans le carnet" }, ...CREATE_STEP_FIELDS]} />
        </Section>
      )}

      {(screen.kind === "play" || screen.kind === "why") && <RoundsEditor rounds={screen.rounds} onChange={rounds => patch({ rounds })} />}

      <Section title="Mot en wolof" hint="Facultatif : une pastille. Quelques mots seulement dans toute la leçon.">
        {wolof ? (
          <div className="sx-rows">
            <div className="sx-row">
              <input className="sx-input" placeholder="Mot" aria-label="Mot en wolof" value={wolof.mot} onChange={e => patch({ wolof: { ...wolof, mot: e.target.value } })} />
              <input className="sx-input" placeholder="Sens" aria-label="Sens en français" value={wolof.sens} onChange={e => patch({ wolof: { ...wolof, sens: e.target.value } })} />
              <button type="button" className="sx-icon-btn" onClick={() => patch({ wolof: undefined })} aria-label="Retirer le mot en wolof"><X size={14} /></button>
            </div>
          </div>
        ) : (
          <button type="button" className="sx-add" onClick={() => patch({ wolof: { mot: "", sens: "" } })}><Plus size={14} /> Ajouter un mot en wolof</button>
        )}
      </Section>

      <details className="sx-advanced">
        <summary>Réglages avancés</summary>
        <label className="sx-field"><span className="sx-label">Texte lu à voix haute <small>(si différent du texte affiché)</small></span>
          <textarea className="sx-input" rows={2} value={"dit" in screen ? screen.dit ?? "" : ""} onChange={e => patch({ dit: e.target.value || undefined })} /></label>
        <p className="sx-hint">La voix officielle de Palou est enregistrée : si vous changez un texte, ce passage restera muet jusqu&apos;à un nouvel enregistrement.</p>
      </details>
    </div>
  );
}
