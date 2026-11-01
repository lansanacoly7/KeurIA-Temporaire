"use client";

import { useState } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import { formatRelative } from "@/app/_scolaire/lib/format";
import { addSchoolAdmin, resetSchoolAdminPassword, setSchoolAdminStatus, type DirectionInput, type SchoolAdmin } from "@/app/_scolaire/lib/superadminApi";
import type { Credentials } from "@/app/_scolaire/lib/types";
import { CredentialsModal } from "@/app/_scolaire/ui/CredentialsModal";
import { ConfirmModal, DataTable, ErrorMessage, Field, Modal, Notice, StatusBadge, type Column } from "@/app/_scolaire/ui/ui";
import { useSchoolSpace } from "./SchoolSpace";

function AddDirectionModal({ schoolId, onClose, onAdded }: { schoolId: string; onClose: () => void; onAdded: (name: string, credentials: Credentials) => void }) {
  const [form, setForm] = useState<DirectionInput>({ firstName: "", lastName: "", email: "", title: "Directeur·rice" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = (key: keyof DirectionInput, value: string) => setForm(f => ({ ...f, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await addSchoolAdmin(schoolId, form);
      onAdded(`${created.admin.firstName} ${created.admin.lastName}`, created.credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ajout impossible.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Ajouter une direction" onClose={onClose} footer={
      <>
        <button type="button" className="ec-btn" onClick={onClose}>Annuler</button>
        <button type="submit" form="add-direction" className="ec-btn ec-btn--primary" disabled={saving}>{saving ? "Ajout…" : "Ajouter"}</button>
      </>
    }>
      <form id="add-direction" onSubmit={submit} noValidate className="ec-form-grid">
        <Field label="Prénom"><input className="ec-input" value={form.firstName} onChange={e => update("firstName", e.target.value)} /></Field>
        <Field label="Nom"><input className="ec-input" value={form.lastName} onChange={e => update("lastName", e.target.value)} /></Field>
        <Field label="E-mail (identifiant de connexion)"><input className="ec-input" type="email" value={form.email} onChange={e => update("email", e.target.value)} /></Field>
        <Field label="Fonction"><input className="ec-input" value={form.title} onChange={e => update("title", e.target.value)} /></Field>
        {error && <div style={{ gridColumn: "1 / -1" }}><ErrorMessage message={error} /></div>}
      </form>
    </Modal>
  );
}

type Dialog = { kind: "add" } | { kind: "password"; admin: SchoolAdmin } | { kind: "status"; admin: SchoolAdmin };

/**
 * Comptes de direction : l'école ne peut pas les gérer elle-même, c'est donc
 * la seule gestion de comptes que l'équipe kEur IA garde (ajout, nouveau mot
 * de passe, désactivation).
 */
export function DirectionTab() {
  const { overview, reload } = useSchoolSpace();
  const { school } = overview;
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ name: string; credentials: Credentials } | null>(null);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      setNotice(message);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
      setDialog(null);
    }
  }

  const activeAdmins = school.admins.filter(a => a.status !== "desactive");
  const columns: Column<SchoolAdmin>[] = [
    { key: "name", header: "Direction", render: a => <div><b>{a.firstName} {a.lastName}</b><div className="ec-login">{a.email}</div></div> },
    { key: "title", header: "Fonction", render: a => a.title },
    { key: "status", header: "Compte", render: a => <StatusBadge status={a.status} /> },
    { key: "last", header: "Dernière connexion", render: a => formatRelative(a.lastLoginAt) },
    {
      key: "actions", header: "", align: "right",
      render: a => (
        <div className="ec-actions" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="ec-btn" onClick={() => setDialog({ kind: "password", admin: a })} disabled={a.status === "desactive"}>
            <KeyRound size={15} aria-hidden="true" /> Mot de passe
          </button>
          <button type="button" className={`ec-btn ${a.status === "desactive" ? "" : "ec-btn--danger"}`} onClick={() => setDialog({ kind: "status", admin: a })}>
            {a.status === "desactive" ? "Réactiver" : "Désactiver"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="direction-titre">
      <div className="sa-section-head">
        <div>
          <h2 id="direction-titre" className="sa-section-title">Direction de l&apos;école</h2>
          <p className="sa-section-sub">L&apos;école ne peut pas gérer ses comptes de direction : c&apos;est l&apos;équipe kEur IA qui s&apos;en charge.</p>
        </div>
        <button type="button" className="sa-pill sa-pill--primary" onClick={() => setDialog({ kind: "add" })}><UserPlus size={17} aria-hidden="true" /> Ajouter une direction</button>
      </div>
      {notice && <Notice>{notice}</Notice>}
      {actionError && <ErrorMessage message={actionError} />}
      {activeAdmins.length === 0 && <div className="ec-alert" style={{ marginBottom: 12 }}>Aucune direction active : l&apos;école ne peut pas gérer son espace.</div>}
      <DataTable caption={`Direction de ${school.name}`} columns={columns} rows={school.admins} rowKey={a => a.id} />

      {dialog?.kind === "add" && (
        <AddDirectionModal schoolId={school.id} onClose={() => setDialog(null)} onAdded={(name, creds) => { setDialog(null); setCredentials({ name, credentials: creds }); setNotice(`${name} a été ajouté·e à la direction.`); reload(); }} />
      )}
      {dialog?.kind === "password" && (
        <ConfirmModal
          title="Générer un nouveau mot de passe ?"
          consequences={[`L'ancien mot de passe de ${dialog.admin.firstName} ${dialog.admin.lastName} ne fonctionnera plus, immédiatement.`, "Un mot de passe provisoire s'affichera une seule fois : transmettez-le à la personne."]}
          unchanged="l'identifiant de connexion et le compte."
          reversibility="Action définitive : l'ancien mot de passe ne peut pas être rétabli."
          confirmLabel="Générer le mot de passe"
          danger
          busy={busy}
          onConfirm={async () => {
            const admin = dialog.admin;
            setBusy(true);
            try {
              const creds = await resetSchoolAdminPassword(school.id, admin.id);
              setCredentials({ name: `${admin.firstName} ${admin.lastName}`, credentials: creds });
            } catch (err) {
              setActionError(err instanceof Error ? err.message : "Action impossible.");
            } finally {
              setBusy(false);
              setDialog(null);
            }
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "status" && (dialog.admin.status === "desactive" ? (
        <ConfirmModal
          title={`Réactiver ${dialog.admin.firstName} ${dialog.admin.lastName} ?`}
          message="Cette personne pourra de nouveau se connecter à l'espace de l'école."
          confirmLabel="Réactiver le compte"
          busy={busy}
          onConfirm={() => run(() => setSchoolAdminStatus(school.id, dialog.admin.id, "actif"), "Le compte de direction est réactivé.")}
          onClose={() => setDialog(null)}
        />
      ) : (
        <ConfirmModal
          title={`Désactiver ${dialog.admin.firstName} ${dialog.admin.lastName} ?`}
          consequences={["Cette personne ne peut plus se connecter à l'espace de l'école."]}
          unchanged="les données de l'école."
          reversibility="Vous pourrez réactiver le compte. Il doit rester au moins une direction active."
          confirmLabel="Désactiver le compte"
          danger
          busy={busy}
          onConfirm={() => run(() => setSchoolAdminStatus(school.id, dialog.admin.id, "desactive"), "Le compte de direction est désactivé.")}
          onClose={() => setDialog(null)}
        />
      ))}
      {credentials && (
        <CredentialsModal title="Identifiants de la direction" personName={credentials.name} subtitle={school.name} credentials={credentials.credentials} onClose={() => setCredentials(null)} />
      )}
    </section>
  );
}
