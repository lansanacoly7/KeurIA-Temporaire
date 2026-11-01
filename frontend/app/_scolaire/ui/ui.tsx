"use client";

/*
 * Composants d'interface réutilisés par tous les écrans de l'espace école.
 * Styles : ../scolaire.css (classes ec-*).
 */
import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, CircleCheck, Inbox, RotateCcw, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { STATUS_LABELS } from "../lib/format";
import type { AccountStatus } from "../lib/types";

/** En-tête de page (h1, un seul par page) ou, avec section, en-tête de section (h2). */
export function PageHeader({ title, subtitle, actions, section = false }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  section?: boolean;
}) {
  const Heading = section ? "h2" : "h1";
  return (
    <div className="ec-page-header" data-section={section || undefined}>
      <div className="ec-page-header-main">
        <Heading>{title}</Heading>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="ec-page-header-aside">
        {actions && <div className="ec-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone }: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "warn";
}) {
  return (
    // Libellé, nombre et précision sont des enfants directs : dans .ec-grid-stats,
    // ils se placent sur des lignes partagées par toutes les cartes (nombres alignés).
    <div className="ec-card ec-stat" data-tone={tone}>
      <div className="ec-stat-icon" aria-hidden="true"><Icon size={22} /></div>
      <small>{label}</small>
      <b>{value}</b>
      <span>{hint}</span>
    </div>
  );
}

export type BadgeTone = "ok" | "warn" | "danger" | "info" | "neutral";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return <span className="ec-badge" data-tone={tone}>{children}</span>;
}

const STATUS_TONES: Record<AccountStatus, BadgeTone> = { actif: "ok", jamais_connecte: "warn", desactive: "neutral" };

export function StatusBadge({ status }: { status: AccountStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }: {
  icon?: LucideIcon;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ec-empty">
      <div className="ec-empty-icon" aria-hidden="true"><Icon size={26} /></div>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="ec-error" role="alert">
      {message}{" "}
      {onRetry && <button type="button" className="ec-btn ec-btn--ghost" onClick={onRetry}>Réessayer</button>}
    </div>
  );
}

export function Skeleton({ height = 20, width = "100%" }: { height?: number; width?: number | string }) {
  return <div className="ec-skeleton" style={{ height, width }} aria-hidden="true" />;
}

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
};

/** Un clic sur un bouton, un lien ou un champ dans la ligne ne doit pas ouvrir la fiche. */
function fromControl(event: React.SyntheticEvent): boolean {
  return (event.target as HTMLElement).closest("button, a, input, select, textarea") !== null;
}

/**
 * Tableau. Avec onRowClick, chaque ligne ouvre une fiche : survol bien visible,
 * flèche « › » en bout de ligne (utile sur écran tactile), Entrée au clavier.
 */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, rowLabel, empty, caption }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Texte lu par les lecteurs d'écran sur la flèche : « Ouvrir la fiche de … ». */
  rowLabel?: (row: T) => string;
  empty?: React.ReactNode;
  /** Titre lu par les lecteurs d'écran. */
  caption: string;
}) {
  if (rows.length === 0 && empty) return <div className="ec-card">{empty}</div>;
  return (
    <div className="ec-table-wrap">
      <table className="ec-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map(c => <th key={c.key} scope="col" style={{ textAlign: c.align }}>{c.header}</th>)}
            {onRowClick && <th scope="col" className="ec-row-go"><span className="sr-only">Ouvrir</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={rowKey(row)}
              data-clickable={Boolean(onRowClick)}
              onClick={onRowClick ? event => { if (!fromControl(event)) onRowClick(row); } : undefined}
              onKeyDown={onRowClick ? event => { if (event.key === "Enter" && event.target === event.currentTarget) onRowClick(row); } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {columns.map(c => <td key={c.key} style={{ textAlign: c.align }}>{c.render(row)}</td>)}
              {onRowClick && (
                <td className="ec-row-go">
                  <ChevronRight size={18} aria-hidden="true" />
                  <span className="sr-only">{rowLabel ? rowLabel(row) : "Ouvrir la fiche"}</span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Field({ label, hint, error, children }: {
  label: string;
  hint?: string;
  error?: string;
  /** Le champ (input, select…). */
  children: React.ReactNode;
}) {
  return (
    <label className="ec-field">
      <span>{label}</span>
      {children}
      {error ? <small data-error="true">{error}</small> : hint && <small>{hint}</small>}
    </label>
  );
}

/** Fenêtre modale accessible : fermeture par Échap ou clic à l'extérieur, focus sur la fenêtre. */
export function Modal({ title, onClose, children, footer }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Référence stable : sinon l'effet se relancerait à chaque rendu et
  // reprendrait le focus pendant que l'utilisateur tape dans un champ.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prevActive?.focus();
    };
  }, []);

  return (
    <div className="ec-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="ec-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef} tabIndex={-1}>
        <div className="ec-modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="ec-icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="ec-modal-body">{children}</div>
        {/* Pas de <footer> : le style du pied de page de l'accueil (globals.css) s'y appliquerait. */}
        {footer && <div className="ec-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Confirmation avant une action sensible. Structure commune :
 * question, « Ce qui va se passer », « Ce qui ne change pas », réversibilité,
 * et, pour les actions les plus lourdes, un mot à taper pour confirmer.
 * Pour une action dangereuse (danger), le bouton de retrait s'appelle « Abandonner ».
 */
export function ConfirmModal({
  title, message, consequences, unchanged, reversibility, confirmText,
  confirmLabel, cancelLabel, danger, busy, onConfirm, onClose,
}: {
  title: string;
  /** Phrase d'introduction (facultative). */
  message?: React.ReactNode;
  /** Liste « Ce qui va se passer ». */
  consequences?: React.ReactNode[];
  /** « Ce qui ne change pas ». */
  unchanged?: React.ReactNode;
  /** « Vous pourrez… » ou « Action définitive. » */
  reversibility?: React.ReactNode;
  /** Mot à taper exactement pour activer le bouton (actions les plus lourdes). */
  confirmText?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const locked = confirmText !== undefined && typed.trim() !== confirmText;
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ec-btn" onClick={onClose}>{cancelLabel ?? (danger ? "Abandonner" : "Annuler")}</button>
          <button type="button" className={`ec-btn ${danger ? "ec-btn--danger" : "ec-btn--primary"}`} onClick={onConfirm} disabled={busy || locked}>
            {busy ? "Un instant…" : confirmLabel}
          </button>
        </>
      }
    >
      {message && <div className="ec-confirm-intro">{message}</div>}
      {consequences && consequences.length > 0 && (
        <div className="ec-confirm-block" data-danger={danger || undefined}>
          <b><TriangleAlert size={16} aria-hidden="true" /> Ce qui va se passer</b>
          <ul>{consequences.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </div>
      )}
      {unchanged && (
        <p className="ec-confirm-line" data-kind="ok">
          <CircleCheck size={17} aria-hidden="true" /><span><b>Ce qui ne change pas :</b> {unchanged}</span>
        </p>
      )}
      {reversibility && (
        <p className="ec-confirm-line">
          <RotateCcw size={16} aria-hidden="true" /><span>{reversibility}</span>
        </p>
      )}
      {confirmText !== undefined && (
        <Field label={`Pour confirmer, tapez « ${confirmText} »`}>
          <input className="ec-input" value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" spellCheck={false} style={{ maxWidth: 220 }} />
        </Field>
      )}
    </Modal>
  );
}

/** Message de réussite affiché après une action. */
export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="ec-notice" role="status">{children}</div>;
}
