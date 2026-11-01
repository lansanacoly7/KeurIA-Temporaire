"use client";

import { useCallback, useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { formatRelative, plural } from "@/app/_scolaire/lib/format";
import {
  createAccount, deleteAccount, FREE_ROLES, listAccounts, listPlatformSchools, ROLE_LABELS, setAccountStatus, updateAccount,
  type PlatformAccount,
} from "@/app/_scolaire/lib/superadminApi";
import type { Credentials } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { useDebounced } from "@/app/_scolaire/lib/useDebounced";
import { CredentialsModal } from "@/app/_scolaire/ui/CredentialsModal";
import { Pagination } from "@/app/_scolaire/ui/Pagination";
import { Badge, ConfirmModal, DataTable, EmptyState, ErrorMessage, Field, Modal, Notice, PageHeader, Skeleton, StatusBadge, type Column } from "@/app/_scolaire/ui/ui";

const COLUMNS: Column<PlatformAccount>[] = [
  { key: "name", header: "Compte", render: a => <div><b>{a.displayName}</b><div className="ec-login">{a.email}</div></div> },
  { key: "role", header: "Profil", render: a => ROLE_LABELS[a.role] ?? a.role },
  { key: "school", header: "École", render: a => a.schoolName ?? <span style={{ color: "var(--ec-muted)" }}>Hors école</span> },
  { key: "status", header: "Compte", render: a => <StatusBadge status={a.status} /> },
  { key: "last", header: "Dernière connexion", render: a => formatRelative(a.lastSeenAt) },
];

function NewAccountModal({ onClose, onCreated }: { onClose: () => void; onCreated: (account: PlatformAccount, credentials: Credentials | null) => void }) {
  const [form, setForm] = useState({ displayName: "", email: "", role: "parent" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await createAccount(form);
      onCreated(created.account, created.credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Nouveau compte" onClose={onClose} footer={
      <>
        <button type="button" className="ec-btn" onClick={onClose}>Annuler</button>
        <button type="submit" form="new-account" className="ec-btn ec-btn--primary" disabled={saving}>{saving ? "Création…" : "Créer le compte"}</button>
      </>
    }>
      <form id="new-account" onSubmit={submit} noValidate style={{ display: "grid", gap: 16 }}>
        <p style={{ margin: 0, color: "var(--ec-muted)" }}>
          Comptes hors école : équipe kEur IA, parents ou enseignants indépendants. La direction, les enseignants et les élèves d&apos;une école sont créés par l&apos;école.
        </p>
        <Field label="Nom affiché"><input className="ec-input" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} /></Field>
        <Field label="E-mail"><input className="ec-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
        <Field label="Profil">
          <select className="ec-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            {FREE_ROLES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
          </select>
        </Field>
        {error && <ErrorMessage message={error} />}
      </form>
    </Modal>
  );
}

type Dialog = { kind: "manage" | "status" | "delete"; account: PlatformAccount };

function ManageAccountModal({ account, onClose, onAction, onSaved }: {
  account: PlatformAccount;
  onClose: () => void;
  onAction: (kind: "status" | "delete") => void;
  onSaved: (message: string) => void;
}) {
  const [displayName, setDisplayName] = useState(account.displayName);
  const [role, setRole] = useState(account.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canChangeRole = !account.managedBySchool && !account.isSelf;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateAccount(account.id, { displayName, ...(canChangeRole ? { role } : {}) });
      onSaved("Le compte a été modifié.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
      setSaving(false);
    }
  }

  return (
    <Modal title={account.displayName} onClose={onClose} footer={
      <>
        <button type="button" className="ec-btn" onClick={onClose}>Fermer</button>
        <button type="button" className="ec-btn ec-btn--primary" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
      </>
    }>
      <div style={{ display: "grid", gap: 16 }}>
        <dl className="ec-dl">
          <dt>E-mail</dt><dd>{account.email}</dd>
          <dt>École</dt><dd>{account.schoolName ?? "Hors école"}</dd>
          <dt>Statut</dt><dd><StatusBadge status={account.status} /></dd>
          <dt>Créé le</dt><dd>{formatRelative(account.createdAt)}</dd>
        </dl>
        <Field label="Nom affiché"><input className="ec-input" value={displayName} onChange={e => setDisplayName(e.target.value)} /></Field>
        {canChangeRole ? (
          <Field label="Profil">
            <select className="ec-select" value={role} onChange={e => setRole(e.target.value)}>
              {FREE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </Field>
        ) : (
          <p className="ec-readonly" style={{ margin: 0 }}>
            {account.isSelf ? "Vous ne pouvez pas modifier votre propre profil." : "Profil géré par l'école de ce compte."}
          </p>
        )}
        {error && <ErrorMessage message={error} />}
        {!account.isSelf && (
          <div className="ec-actions">
            <button type="button" className={`ec-btn ${account.status === "desactive" ? "" : "ec-btn--danger"}`} onClick={() => onAction("status")}>
              {account.status === "desactive" ? "Réactiver le compte" : "Désactiver le compte"}
            </button>
            {!account.managedBySchool && (
              <button type="button" className="ec-btn ec-btn--danger" onClick={() => onAction("delete")}>Supprimer le compte</button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function AccountsView({ initialRole }: { initialRole: string }) {
  const [role, setRole] = useState(initialRole);
  const [schoolId, setSchoolId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useDebounced(search);
  const load = useCallback(() => listAccounts({ role, schoolId, status, query, page }), [role, schoolId, status, query, page]);
  const { data, error, reload } = useApi(load);
  const { data: schools } = useApi(listPlatformSchools);
  const [creating, setCreating] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ account: PlatformAccount; credentials: Credentials } | null>(null);

  const filter = (apply: () => void) => { apply(); setPage(1); };
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      setNotice(message);
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
      <PageHeader
        title="Comptes"
        subtitle="Tous les comptes de la plateforme, avec leur école et leur activité."
        actions={<button type="button" className="ec-btn ec-btn--primary" onClick={() => setCreating(true)}><UserPlus size={18} aria-hidden="true" /> Nouveau compte</button>}
      />
      {notice && <Notice>{notice}</Notice>}
      {actionError && <ErrorMessage message={actionError} />}
      <div className="ec-toolbar">
        <label className="ec-search">
          <span className="sr-only">Rechercher un compte</span>
          <Search size={18} aria-hidden="true" />
          <input className="ec-input" type="search" placeholder="Nom ou e-mail…" value={search} onChange={e => filter(() => setSearch(e.target.value))} />
        </label>
        <select className="ec-select" aria-label="Profil" value={role} onChange={e => filter(() => setRole(e.target.value))}>
          <option value="">Tous les profils</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="ec-select" aria-label="École" value={schoolId} onChange={e => filter(() => setSchoolId(e.target.value))}>
          <option value="">Toutes les écoles</option>
          <option value="none">Hors école</option>
          {(schools ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="ec-select" aria-label="Statut" value={status} onChange={e => filter(() => setStatus(e.target.value))}>
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="jamais_connecte">Jamais connecté</option>
          <option value="desactive">Désactivé</option>
        </select>
        {data && <span className="ec-count">{plural(data.total, "compte")}</span>}
      </div>
      {error ? <ErrorMessage message={error} onRetry={reload} /> : !data ? <Skeleton height={300} /> : (
        <>
          <Pagination page={page - 1} pageCount={pageCount} onChange={p => setPage(p + 1)} />
          <DataTable
            caption="Liste des comptes"
            columns={COLUMNS}
            rows={data.results}
            rowKey={a => a.id}
            onRowClick={a => { setActionError(null); setDialog({ kind: "manage", account: a }); }}
            rowLabel={a => `Gérer le compte ${a.email}`}
            empty={<EmptyState icon={Users} title="Aucun compte trouvé" text="Modifiez la recherche ou les filtres." />}
          />
        </>
      )}

      {creating && (
        <NewAccountModal
          onClose={() => setCreating(false)}
          onCreated={(account, credentials) => {
            setCreating(false);
            setNotice(`Le compte ${account.email} a été créé.`);
            if (credentials) setCreated({ account, credentials });
            reload();
          }}
        />
      )}
      {dialog?.kind === "manage" && (
        <ManageAccountModal
          account={dialog.account}
          onClose={() => setDialog(null)}
          onAction={kind => setDialog({ kind, account: dialog.account })}
          onSaved={message => { setDialog(null); setNotice(message); reload(); }}
        />
      )}
      {dialog?.kind === "status" && (dialog.account.status === "desactive" ? (
        <ConfirmModal
          title={`Réactiver ${dialog.account.displayName} ?`}
          message="Ce compte pourra de nouveau se connecter."
          confirmLabel="Réactiver le compte"
          busy={busy}
          onConfirm={() => run(() => setAccountStatus(dialog.account.id, "actif"), "Le compte est réactivé.")}
          onClose={() => setDialog(null)}
        />
      ) : (
        <ConfirmModal
          title={`Désactiver ${dialog.account.displayName} ?`}
          consequences={[
            "Ce compte ne peut plus se connecter à kEur IA ; les sessions ouvertes sont coupées.",
            ...(dialog.account.role === "enseignant" && dialog.account.schoolName ? [`Ses classes à ${dialog.account.schoolName} se retrouvent sans enseignant.`] : []),
          ]}
          unchanged="toutes les données du compte (progression, liens, historique)."
          reversibility="Vous pourrez réactiver le compte à tout moment."
          confirmLabel="Désactiver le compte"
          danger
          busy={busy}
          onConfirm={() => run(() => setAccountStatus(dialog.account.id, "desactive"), "Le compte est désactivé.")}
          onClose={() => setDialog(null)}
        />
      ))}
      {dialog?.kind === "delete" && (
        <ConfirmModal
          title={`Supprimer définitivement ${dialog.account.displayName} ?`}
          consequences={[
            "Le compte et toutes ses données (progression, profil) sont effacés.",
            "Un parent encore relié à des enfants ne peut pas être supprimé : retirez d'abord ces liens.",
          ]}
          reversibility="Action définitive : le compte ne pourra pas être restauré. Préférez « Désactiver » en cas de doute."
          confirmText={dialog.account.email}
          confirmLabel="Supprimer le compte"
          danger
          busy={busy}
          onConfirm={() => run(() => deleteAccount(dialog.account.id), `Le compte ${dialog.account.email} a été supprimé.`)}
          onClose={() => setDialog(null)}
        />
      )}
      {created && (
        <CredentialsModal title="Compte créé" personName={created.account.displayName} subtitle={ROLE_LABELS[created.account.role]} credentials={created.credentials} onClose={() => setCreated(null)} />
      )}
      <p className="ec-readonly" style={{ marginTop: 16 }}><Badge tone="info">Info</Badge> Les comptes d&apos;une école se suppriment ou changent de profil depuis l&apos;école ; ici, vous pouvez les désactiver.</p>
    </>
  );
}
