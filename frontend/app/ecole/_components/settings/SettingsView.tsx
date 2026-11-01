"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { updateSchool, type SchoolSettingsInput } from "@/app/_scolaire/lib/ecoleApi";
import { fullName } from "@/app/_scolaire/lib/format";
import { LOGIN_DOMAIN } from "@/app/_scolaire/lib/identifiers";
import type { School } from "@/app/_scolaire/lib/types";
import { useSchool } from "@/app/_scolaire/ui/SchoolContext";
import { ConfirmModal, ErrorMessage, Field, Notice, PageHeader, Skeleton } from "@/app/_scolaire/ui/ui";
import { LogoEditorModal } from "./LogoEditorModal";
import { ThemePicker } from "./ThemePicker";

function SettingsForm({ school, onSaved }: { school: School; onSaved: () => void }) {
  const initial: SchoolSettingsInput = {
    name: school.name,
    city: school.city,
    website: school.website ?? "",
    primaryColor: school.primaryColor,
    accentColor: school.accentColor,
    logo: undefined,
    removeLogo: false,
  };
  const [form, setForm] = useState(initial);
  const [logoPreview, setLogoPreview] = useState<string | null>(school.logoUrl ?? null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);

  const update = <K extends keyof SchoolSettingsInput>(key: K, value: SchoolSettingsInput[K]) => setForm(f => ({ ...f, [key]: value }));
  const changed =
    form.name !== initial.name ||
    form.city !== initial.city ||
    (form.website ?? "") !== (initial.website ?? "") ||
    form.primaryColor !== initial.primaryColor ||
    form.accentColor !== initial.accentColor ||
    Boolean(form.logo) ||
    Boolean(form.removeLogo);

  const exampleLogin = `awa.diop@${school.slug}.${LOGIN_DOMAIN}`;

  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 5 Mo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target?.result as string;
      setRawImageForCrop(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleCroppedLogo(croppedBase64: string) {
    setLogoPreview(croppedBase64);
    setForm(f => ({ ...f, logo: croppedBase64, removeLogo: false }));
    setRawImageForCrop(null);
  }

  function removeLogo() {
    setLogoPreview(null);
    setForm(f => ({ ...f, logo: null, removeLogo: true }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateSchool(form);
      onSaved(); // recrée ce formulaire avec les valeurs enregistrées
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
      setSaving(false);
    }
  }

  return (
    <>
      {rawImageForCrop && (
        <LogoEditorModal
          rawImageSrc={rawImageForCrop}
          onApply={handleCroppedLogo}
          onClose={() => setRawImageForCrop(null)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Supprimer le logo"
          message="Êtes-vous sûr de vouloir supprimer le logo de l'établissement ?"
          confirmLabel="Supprimer le logo"
          danger
          onConfirm={() => {
            removeLogo();
            setShowDeleteConfirm(false);
          }}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}

      <form className="ec-settings" onSubmit={submit} noValidate>

        <section className="ec-card" aria-labelledby="etablissement-titre">
          <h2 id="etablissement-titre">Établissement</h2>
          <div className="ec-form-grid">
            <Field label="Nom de l'établissement">
              <input className="ec-input" value={form.name} onChange={e => update("name", e.target.value)} required />
            </Field>
            <Field label="Ville">
              <input className="ec-input" value={form.city} onChange={e => update("city", e.target.value)} required />
            </Field>
            <Field label="Site internet officiel (facultatif)" hint="Ex : https://mon-ecole.sn">
              <input
                className="ec-input"
                type="url"
                value={form.website ?? ""}
                onChange={e => update("website", e.target.value)}
                placeholder="https://..."
              />
            </Field>
          </div>
        </section>

        <section className="ec-card" aria-labelledby="logo-titre">
          <h2 id="logo-titre">Logo de l&apos;école</h2>
          <p style={{ margin: "0 0 16px", color: "var(--ec-muted)" }}>
            Il s&apos;affiche sur le tableau de bord et dans l&apos;espace des élèves (PNG, JPG, WebP ou SVG).
          </p>

          {logoPreview ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  width: "fit-content",
                  maxWidth: 400,
                  minHeight: 100,
                  borderRadius: 12,
                  border: "1px solid var(--ec-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ffffff",
                  padding: 16,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <img
                  src={logoPreview}
                  alt="Logo de l'école"
                  style={{ maxHeight: 120, maxWidth: "100%", width: "auto", height: "auto", objectFit: "contain" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <label className="ec-btn ec-btn--primary" style={{ cursor: "pointer", display: "inline-flex" }}>
                  <span>Changer le logo</span>
                  <input type="file" accept="image/*" hidden onChange={onLogoFile} />
                </label>

                <button
                  type="button"
                  className="ec-btn"
                  style={{ fontSize: 13 }}
                  onClick={() => setRawImageForCrop(logoPreview)}
                >
                  Ajuster le zoom / cadrage
                </button>

                <button
                  type="button"
                  className="ec-btn ec-btn--ghost"
                  style={{ color: "var(--ec-danger)", fontSize: 13 }}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Supprimer le logo
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label className="ec-btn ec-btn--primary" style={{ cursor: "pointer", display: "inline-flex" }}>
                <span>Choisir un logo</span>
                <input type="file" accept="image/*" hidden onChange={onLogoFile} />
              </label>
              <span style={{ fontSize: 13, color: "var(--ec-muted)" }}>
                Aucun logo configuré (max 5 Mo)
              </span>
            </div>
          )}
        </section>

        <section className="ec-card" aria-labelledby="direction-titre">
          <h2 id="direction-titre">Direction et identifiants</h2>
          <dl className="ec-dl">
            <dt>Responsable</dt><dd>{fullName(school.admin)} ({school.admin.title})</dd>
            <dt>E-mail</dt><dd>{school.admin.email}</dd>
            <dt>Identifiants élèves</dt><dd className="ec-login">{exampleLogin}</dd>
          </dl>
          <p className="ec-readonly" style={{ marginBottom: 0 }}>
            <Lock size={13} aria-hidden="true" /> Ces informations sont gérées par l&apos;équipe kEur IA : le format des identifiants ne change pas, pour ne pas bloquer les comptes existants.
          </p>
        </section>

        <section className="ec-card" aria-labelledby="couleurs-titre">
          <h2 id="couleurs-titre">Couleurs de l&apos;espace élèves</h2>
          <p style={{ margin: "0 0 16px", color: "var(--ec-muted)" }}>Elles personnalisent la page d&apos;accueil de l&apos;école que voient les élèves.</p>
          <ThemePicker
            value={{ primary: form.primaryColor, accent: form.accentColor }}
            schoolName={form.name}
            onChange={({ primary, accent }) => setForm(f => ({ ...f, primaryColor: primary, accentColor: accent }))}
          />
        </section>

      {error && <ErrorMessage message={error} />}
      <div className="ec-wizard-footer" style={{ marginTop: 0 }}>
        <button type="button" className="ec-btn" disabled={!changed || saving} onClick={() => { setForm(initial); setError(null); }}>Annuler les modifications</button>
        <button type="submit" className="ec-btn ec-btn--primary" disabled={!changed || saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
    </form>
  </>
  );
}

export function SettingsView() {
  const { school, reload } = useSchool();
  // Le message vit ici : le formulaire est recréé après chaque sauvegarde (voir key).
  const [saved, setSaved] = useState(false);
  return (
    <>
      <PageHeader title="Paramètres" subtitle="Informations de l'établissement et personnalisation de l'espace élèves." />
      {saved && <Notice>Les paramètres de l&apos;établissement ont été enregistrés.</Notice>}
      {/* key : le formulaire repart des valeurs enregistrées après chaque sauvegarde. */}
      {school ? <SettingsForm key={JSON.stringify(school)} school={school} onSaved={() => { setSaved(true); reload(); }} /> : <Skeleton height={320} />}
    </>
  );
}
