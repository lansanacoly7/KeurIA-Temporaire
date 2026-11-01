"use client";

import { useState } from "react";
import { Ban, Pencil, RotateCcw } from "lucide-react";
import { formatDate } from "@/app/_scolaire/lib/format";
import { reactivateSchool, suspendSchool, updatePlatformSchool, type PlatformSchool } from "@/app/_scolaire/lib/superadminApi";
import { ThemePicker } from "@/app/ecole/_components/settings/ThemePicker";
import { ConfirmModal, ErrorMessage, Field, Modal, Notice } from "@/app/_scolaire/ui/ui";
import { useSchoolSpace } from "./SchoolSpace";

function EditSchoolModal({ school, onClose, onSaved }: { school: PlatformSchool; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(school.name);
  const [city, setCity] = useState(school.city);
  const [colors, setColors] = useState({ primary: school.primaryColor, accent: school.accentColor });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updatePlatformSchool(school.id, { name, city, primaryColor: colors.primary, accentColor: colors.accent });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
      setSaving(false);
    }
  }

  return (
    <Modal title={`Modifier ${school.name}`} onClose={onClose} footer={
      <>
        <button type="button" className="ec-btn" onClick={onClose}>Annuler</button>
        <button type="submit" form="edit-school" className="ec-btn ec-btn--primary" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
      </>
    }>
      <form id="edit-school" onSubmit={submit} noValidate style={{ display: "grid", gap: 16 }}>
        <div className="ec-form-grid">
          <Field label="Nom de l'école"><input className="ec-input" value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="Ville"><input className="ec-input" value={city} onChange={e => setCity(e.target.value)} /></Field>
        </div>
        <p style={{ margin: 0, color: "var(--ec-muted)", fontSize: 13 }}>
          L&apos;adresse <span className="ec-login">/school/{school.slug}</span>{" "}ne change pas : elle sert aux identifiants des élèves.
        </p>
        <ThemePicker value={colors} schoolName={name} onChange={setColors} />
        {error && <ErrorMessage message={error} />}
      </form>
    </Modal>
  );
}

/** Paramètres de l'école côté plateforme : informations et suspension. */
export function SettingsTab() {
  const { overview, reload } = useSchoolSpace();
  const { school } = overview;
  const [dialog, setDialog] = useState<"edit" | "suspend" | "reactivate" | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setNotice(message);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
      setDialog(null);
    }
  }

  return (
    <>
      {notice && <Notice>{notice}</Notice>}
      {error && <ErrorMessage message={error} />}
      <div className="sa-columns">
        <section className="sa-panel" aria-labelledby="infos-titre">
          <h2 id="infos-titre" className="sa-panel-title">Informations de l&apos;école</h2>
          <dl className="sa-facts">
            <div><dt>Nom</dt><dd>{school.name}</dd></div>
            <div><dt>Ville</dt><dd>{school.city}</dd></div>
            <div><dt>Adresse</dt><dd><span className="ec-login">/school/{school.slug}</span></dd></div>
            <div><dt>Thème</dt><dd><span className="sa-swatch" style={{ background: school.primaryColor }} /><span className="sa-swatch" style={{ background: school.accentColor }} /></dd></div>
            <div><dt>Créée le</dt><dd>{formatDate(school.createdAt)}</dd></div>
          </dl>
          <button type="button" className="sa-pill" onClick={() => setDialog("edit")}><Pencil size={16} aria-hidden="true" /> Modifier les informations</button>
        </section>

        <section className="sa-panel sa-panel--danger" aria-labelledby="zone-titre">
          <h2 id="zone-titre" className="sa-panel-title">{school.suspended ? "École suspendue" : "Suspendre l'école"}</h2>
          <p className="sa-section-sub">
            {school.suspended
              ? "Ses comptes ne peuvent plus se connecter. La réactivation leur rend l'accès, avec toutes leurs données."
              : "Coupe l'accès de tous les comptes de l'école, sans effacer aucune donnée. Réversible à tout moment."}
          </p>
          {school.suspended
            ? <button type="button" className="ec-btn ec-btn--primary" onClick={() => setDialog("reactivate")}><RotateCcw size={17} aria-hidden="true" /> Réactiver l&apos;école</button>
            : <button type="button" className="ec-btn ec-btn--danger" onClick={() => setDialog("suspend")}><Ban size={17} aria-hidden="true" /> Suspendre l&apos;école</button>}
        </section>
      </div>

      {dialog === "edit" && <EditSchoolModal school={school} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); setNotice("L'école a été modifiée."); reload(); }} />}
      {dialog === "suspend" && (
        <ConfirmModal
          title={`Suspendre ${school.name} ?`}
          consequences={[
            "Plus aucun compte de l'école ne peut se connecter : direction, enseignants et élèves (les sessions ouvertes sont coupées).",
            "La page publique de l'école est masquée.",
          ]}
          unchanged="toutes les données : classes, élèves, progression, devoirs, années."
          reversibility="Vous pourrez réactiver l'école à tout moment."
          confirmText={school.name}
          confirmLabel="Suspendre l'école"
          danger
          busy={busy}
          onConfirm={() => run(() => suspendSchool(school.id, school.name), `L'école « ${school.name} » est suspendue.`)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "reactivate" && (
        <ConfirmModal
          title={`Réactiver ${school.name} ?`}
          message="Les comptes de l'école pourront de nouveau se connecter."
          confirmLabel="Réactiver l'école"
          busy={busy}
          onConfirm={() => run(() => reactivateSchool(school.id), `L'école « ${school.name} » est réactivée.`)}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
