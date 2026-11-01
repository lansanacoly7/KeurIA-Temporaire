"use client";

import { useCallback, useRef, useState } from "react";
import { Film, ImagePlus, UploadCloud } from "lucide-react";
import { formatRelative } from "@/app/_scolaire/lib/format";
import { listMedia, uploadMedia, type MediaItem } from "@/app/_scolaire/lib/studio79Api";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { ErrorMessage, Modal, Skeleton } from "@/app/_scolaire/ui/ui";

const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`);

/**
 * Médiathèque du studio : on glisse un fichier (ou on le choisit) et il s'envoie ; on clique sur une image pour l'utiliser.
 * Les images sont allégées automatiquement ; une vidéo est un petit fichier (au-delà, on colle un lien YouTube).
 */
export function MediaPicker({ onPick, onClose, kind = "image" }: { onPick: (item: MediaItem) => void; onClose: () => void; kind?: "image" | "video" }) {
  const [search, setSearch] = useState("");
  const [uploadAlt, setUploadAlt] = useState("");
  const load = useCallback(() => listMedia({ kind, q: search.trim() || undefined }), [kind, search]);
  const { data, error, reload } = useApi(load);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function send(files: FileList | File[]) {
    const file = Array.from(files)[0];
    if (!file) return;
    setBusy(true);
    setUploadError(null);
    try {
      onPick(await uploadMedia(file, uploadAlt));     // l'image envoyée est utilisée tout de suite
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Envoi impossible.");
      setBusy(false);
    }
  }

  return (
    <Modal title={kind === "video" ? "Médiathèque · vidéos" : "Médiathèque · images"} onClose={onClose} footer={<button type="button" className="ec-btn" onClick={onClose}>Fermer</button>}>
      <div className="sx-media">
        <div className="sx-drop" data-over={over} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); void send(e.dataTransfer.files); }}>
          <UploadCloud size={30} aria-hidden="true" />
          <p><b>{busy ? "Envoi en cours…" : "Glissez un fichier ici"}</b></p>
          <p className="sx-hint">{kind === "video" ? "MP4 ou WebM, petit fichier (20 Mo au plus). Pour une longue vidéo, collez un lien YouTube." : "JPEG, PNG ou WebP. L'image est redimensionnée et allégée automatiquement."}</p>
          
          <div style={{ width: "100%", maxWidth: 360, marginTop: 4, marginBottom: 8 }}>
            <input
              type="text"
              className="sx-input"
              placeholder="Texte alternatif (optionnel, pour l'accessibilité)"
              value={uploadAlt}
              onChange={e => setUploadAlt(e.target.value)}
              disabled={busy}
              style={{ fontSize: 13, background: "var(--sx-surface)" }}
            />
          </div>

          <button type="button" className="ec-btn ec-btn--primary" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={16} aria-hidden="true" /> Choisir un fichier</button>
          <input ref={input} type="file" hidden accept={kind === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/gif"} onChange={e => { void send(e.target.files ?? []); e.target.value = ""; }} />
        </div>
        {uploadError && <ErrorMessage message={uploadError} />}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 4 }}>
          <h3 className="sx-media-title">Déjà envoyés</h3>
          <input
            type="search"
            className="sx-input"
            placeholder="Rechercher par nom ou alt..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 220, fontSize: 12, padding: "4px 8px" }}
          />
        </div>

        {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={120} /> : data.results.length === 0 ? (
          <p className="sx-hint">Rien pour l'instant.</p>
        ) : (
          <ul className="sx-media-grid">
            {data.results.map(item => (
              <li key={item.id}>
                <button type="button" onClick={() => onPick(item)} title={item.alt ? `${item.name} (${item.alt})` : item.name}>
                  {item.kind === "image"
                    ? <img src={item.url} alt={item.alt || item.name} loading="lazy" />
                    : <span className="sx-media-video"><Film size={26} aria-hidden="true" /></span>}
                  <small style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                    {item.name}
                  </small>
                  <small style={{ fontSize: 10, color: "var(--sx-muted)" }}>
                    {size(item.size)} · {item.usageCount !== undefined && item.usageCount > 0 ? `${item.usageCount} leç.` : "libre"}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
