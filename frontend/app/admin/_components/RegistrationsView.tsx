"use client";

import "./registrations.css";
import { useCallback, useState } from "react";
import { Baby, Check, Clock, Mail, MailWarning, Phone, Search, ShieldCheck, UserCheck, X } from "lucide-react";
import { formatRelative, initials } from "@/app/_scolaire/lib/format";
import {
  approveRegistration, listRegistrations, PARENT_ROLE_LABELS, REGISTRATIONS_CHANGED, rejectRegistration,
  type RegistrationRequest, type RegistrationStatus,
} from "@/app/_scolaire/lib/registrationsApi";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { useDebounced } from "@/app/_scolaire/lib/useDebounced";
import { Pagination } from "@/app/_scolaire/ui/Pagination";
import { Badge, ConfirmModal, EmptyState, ErrorMessage, Field, Modal, Notice, PageHeader, Skeleton } from "@/app/_scolaire/ui/ui";

const TABS: { status: RegistrationStatus; label: string }[] = [
  { status: "pending", label: "À traiter" },
  { status: "approved", label: "Acceptées" },
  { status: "rejected", label: "Refusées" },
];

const EMPTY: Record<RegistrationStatus, { title: string; text: string }> = {
  pending: { title: "Aucune demande en attente", text: "Les nouvelles inscriptions de parents apparaîtront ici dès que l'adresse e-mail est confirmée." },
  approved: { title: "Aucune demande acceptée pour le moment", text: "Les inscriptions que vous acceptez sont gardées ici." },
  rejected: { title: "Aucune demande refusée", text: "Les inscriptions que vous refusez sont gardées ici ; vous pouvez les accepter plus tard." },
};

type Dialog = { kind: "approve" | "reject"; request: RegistrationRequest };

function RejectModal({ request, busy, onClose, onConfirm }: { request: RegistrationRequest; busy: boolean; onClose: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <Modal title={`Refuser la demande de ${request.displayName} ?`} onClose={onClose} footer={
      <>
        <button type="button" className="ec-btn" onClick={onClose}>Annuler</button>
        <button type="button" className="ec-btn ec-btn--danger" disabled={busy} onClick={() => onConfirm(note)}>{busy ? "Refus…" : "Refuser la demande"}</button>
      </>
    }>
      <div style={{ display: "grid", gap: 16 }}>
        <p style={{ margin: 0, color: "var(--ec-muted)" }}>
          Le parent et ses enfants ne pourront pas se connecter. Il reçoit un e-mail, et vous pourrez toujours accepter sa demande plus tard.
        </p>
        <Field label="Motif (facultatif)" hint="Il est écrit dans l'e-mail envoyé au parent.">
          <textarea className="ec-input" rows={3} maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder="Ex. : numéro de téléphone injoignable" />
        </Field>
      </div>
    </Modal>
  );
}

function RequestCard({ request, onApprove, onReject }: { request: RegistrationRequest; onApprove: () => void; onReject: () => void }) {
  const first = request.firstName || request.displayName;
  const last = request.lastName || first;
  const decided = request.status !== "pending";
  return (
    <li className="rg-card" data-status={request.status}>
      <div className="ec-avatar rg-avatar" aria-hidden="true">{initials({ firstName: first, lastName: last })}</div>
      <div className="rg-main">
        <div className="rg-head">
          <b>{request.displayName}</b>
          {PARENT_ROLE_LABELS[request.parentRole] && <Badge tone="info">{PARENT_ROLE_LABELS[request.parentRole]}</Badge>}
          {!request.emailVerified && <Badge tone="warn"><MailWarning size={13} aria-hidden="true" /> E-mail non confirmé</Badge>}
          {request.status === "approved" && <Badge tone="ok">Acceptée</Badge>}
          {request.status === "rejected" && <Badge tone="danger">Refusée</Badge>}
        </div>
        <div className="rg-meta">
          <span><Mail size={14} aria-hidden="true" /> {request.email}</span>
          {request.phone && <span><Phone size={14} aria-hidden="true" /> {request.phone}</span>}
          <span title={new Date(request.requestedAt).toLocaleString("fr-FR")}><Clock size={14} aria-hidden="true" /> Demandée {formatRelative(request.requestedAt)}</span>
        </div>
        {request.child && (
          <div className="rg-child"><Baby size={15} aria-hidden="true" /> Enfant : <b>{request.child.name}</b>{request.child.ageGroup ? ` · parcours ${request.child.ageGroup} ans` : ""}</div>
        )}
        {decided && (
          <p className="rg-decision">
            {request.status === "approved" ? "Acceptée" : "Refusée"}
            {request.decidedBy ? ` par ${request.decidedBy}` : ""}{request.decidedAt ? ` · ${formatRelative(request.decidedAt)}` : ""}
            {request.note ? ` · Motif : « ${request.note} »` : ""}
          </p>
        )}
      </div>
      <div className="rg-actions">
        {request.status === "pending" && (
          <>
            <button type="button" className="ec-btn ec-btn--danger" onClick={onReject}><X size={16} aria-hidden="true" /> Refuser</button>
            <button type="button" className="ec-btn ec-btn--primary" onClick={onApprove}><Check size={16} aria-hidden="true" /> Accepter</button>
          </>
        )}
        {request.status === "rejected" && (
          <button type="button" className="ec-btn" onClick={onApprove}><UserCheck size={16} aria-hidden="true" /> Accepter finalement</button>
        )}
      </div>
    </li>
  );
}

/** Demandes d'inscription des parents : l'équipe kEur IA accepte ou refuse avant que le parent accède à son espace. */
export function RegistrationsView() {
  const [status, setStatus] = useState<RegistrationStatus>("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useDebounced(search);
  const load = useCallback(() => listRegistrations({ status, query, page }), [status, query, page]);
  const { data, error, reload } = useApi(load);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  async function decide(request: RegistrationRequest, kind: Dialog["kind"], note = "") {
    setBusy(true);
    setActionError(null);
    try {
      const done = kind === "approve" ? await approveRegistration(request.id) : await rejectRegistration(request.id, note);
      const mail = done.emailSent ? "Le parent a été prévenu par e-mail." : "L'e-mail n'a pas pu être envoyé : prévenez le parent directement.";
      setNotice(kind === "approve"
        ? `${request.displayName} peut maintenant se connecter. ${mail}`
        : `La demande de ${request.displayName} est refusée. ${mail}`);
      window.dispatchEvent(new Event(REGISTRATIONS_CHANGED));
      reload();
    } catch (err) {
      setNotice(null);
      setActionError(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
      setDialog(null);
    }
  }

  return (
    <>
      <PageHeader title="Inscriptions des parents" subtitle="Un parent n'accède à son espace (et ses enfants non plus) qu'une fois sa demande acceptée par l'équipe kEur IA." />
      {notice && <Notice>{notice}</Notice>}
      {actionError && <ErrorMessage message={actionError} />}

      <div className="rg-toolbar">
        <div className="rg-tabs" role="tablist" aria-label="État des demandes">
          {TABS.map(tab => (
            <button key={tab.status} type="button" role="tab" aria-selected={status === tab.status} data-active={status === tab.status}
              onClick={() => { setStatus(tab.status); setPage(1); }}>
              {tab.label}
              {data && <span className="rg-count" data-urgent={tab.status === "pending" && data.counts.pending > 0}>{data.counts[tab.status]}</span>}
            </button>
          ))}
        </div>
        <label className="ec-search">
          <span className="sr-only">Rechercher une demande</span>
          <Search size={18} aria-hidden="true" />
          <input className="ec-input" type="search" placeholder="Nom ou e-mail…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </label>
      </div>

      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={300} /> : (
        <>
          <Pagination page={page - 1} pageCount={pageCount} onChange={p => setPage(p + 1)} />
          {data.results.length === 0 ? (
            <EmptyState icon={ShieldCheck} title={query ? "Aucune demande ne correspond" : EMPTY[status].title} text={query ? "Modifiez la recherche." : EMPTY[status].text} />
          ) : (
            <ul className="rg-list">
              {data.results.map(request => (
                <RequestCard key={request.id} request={request}
                  onApprove={() => { setActionError(null); setDialog({ kind: "approve", request }); }}
                  onReject={() => { setActionError(null); setDialog({ kind: "reject", request }); }} />
              ))}
            </ul>
          )}
        </>
      )}

      {dialog?.kind === "approve" && (
        <ConfirmModal
          title={`Accepter ${dialog.request.displayName} ?`}
          consequences={[
            "Le parent peut se connecter à son espace dès maintenant, avec son e-mail et son mot de passe.",
            ...(dialog.request.child ? [`${dialog.request.child.name} peut aussi se connecter.`] : []),
            "Le parent reçoit un e-mail pour l'en informer.",
          ]}
          reversibility="Pour retirer l'accès plus tard, désactivez le compte depuis la page Comptes."
          confirmLabel="Accepter la demande"
          busy={busy}
          onConfirm={() => decide(dialog.request, "approve")}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "reject" && (
        <RejectModal request={dialog.request} busy={busy} onClose={() => setDialog(null)} onConfirm={note => decide(dialog.request, "reject", note)} />
      )}
    </>
  );
}
