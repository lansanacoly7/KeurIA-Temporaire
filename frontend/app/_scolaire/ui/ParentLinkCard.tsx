"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Unlink } from "lucide-react";
import { deName, formatDate, fullName } from "../lib/format";
import { LINK_CODE_VALID_DAYS, type ParentLinkInfo } from "../lib/parentLinks";
import { useApi } from "../lib/useApi";
import { buildWhatsAppLink, parentLinkMessage } from "../lib/whatsapp";
import { ConfirmModal, ErrorMessage, Skeleton } from "./ui";

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}

/**
 * Bloc « Parent » d'une fiche élève : parent relié, ou code de liaison à
 * remettre à la famille. Utilisé par l'école (avec « Retirer le lien » et
 * les coordonnées) et par l'enseignant (code seulement).
 */
export function ParentLinkCard({ load, generate, unlink, showContact }: {
  load: () => Promise<ParentLinkInfo>;
  generate: () => Promise<ParentLinkInfo>;
  /** Réservé à l'école. */
  unlink?: () => Promise<ParentLinkInfo>;
  showContact?: boolean;
}) {
  const { data, error, reload } = useApi(load);
  const [dialog, setDialog] = useState<"generate" | "unlink" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  function getShareData() {
    if (!data?.code) return null;
    const text = parentLinkMessage({ studentName: data.studentName, code: data.code.code, validDays: LINK_CODE_VALID_DAYS });
    const whatsappUrl = buildWhatsAppLink(data.parentPhone, text);
    return { text, whatsappUrl, parentPhone: data.parentPhone };
  }

  async function copyMessage() {
    const share = getShareData();
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignorer si presse-papiers indisponible
    }
  }

  async function run(action: () => Promise<ParentLinkInfo>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
      setDialog(null);
    }
  }

  const share = getShareData();

  return (
    <section className="ec-card" aria-labelledby="parent-titre">
      <h2 id="parent-titre">Parent</h2>
      {error ? <ErrorMessage message={error} /> : !data ? <Skeleton height={90} /> : data.parent ? (
        <>
          <dl className="ec-dl">
            <dt>Nom</dt><dd>{fullName(data.parent)}</dd>
            {showContact && <><dt>E-mail</dt><dd>{data.parent.email}</dd></>}
            {showContact && <><dt>Téléphone</dt><dd>{data.parent.phone || "—"}</dd></>}
            <dt>Relié le</dt><dd>{data.linkedAt ? formatDate(data.linkedAt) : "—"}</dd>
          </dl>
          {unlink && (
            <button type="button" className="ec-btn ec-btn--caution" style={{ marginTop: 14 }} onClick={() => setDialog("unlink")}>
              <Unlink size={16} aria-hidden="true" /> Retirer le lien
            </button>
          )}
        </>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ margin: 0, color: "var(--ec-muted)" }}>
            Aucun parent relié. C&apos;est facultatif : l&apos;élève utilise kEur IA sans compte parent.
          </p>
          {data.code ? (
            <div className="ec-link-code">
              <span>Code parent</span>
              <b>{data.code.code}</b>
              <small>Valable jusqu&apos;au {formatDate(data.code.expiresAt)} · une seule utilisation</small>
            </div>
          ) : null}
          {!data.studentDisabled && (
            <div className="ec-actions" style={{ flexWrap: "wrap", gap: 8 }}>
              {share && (
                <>
                  <a
                    href={share.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ec-btn ec-btn--whatsapp"
                  >
                    <WhatsAppIcon size={16} /> Envoyer par WhatsApp
                  </a>
                  <button type="button" className="ec-btn" onClick={copyMessage}>
                    {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                    {copied ? "Message copié !" : "Copier le message"}
                  </button>
                </>
              )}
              <button type="button" className={`ec-btn ${data.code ? "" : "ec-btn--primary"}`} onClick={() => (data.code ? setDialog("generate") : run(generate))} disabled={busy}>
                <KeyRound size={16} aria-hidden="true" /> {data.code ? "Générer un nouveau code" : "Générer un code parent"}
              </button>
            </div>
          )}
          <p style={{ margin: 0, color: "var(--ec-muted)", fontSize: 13 }}>
            Le parent se connecte à son compte kEur IA, ouvre « Relier mon enfant » et saisit ce code. Le code figure aussi sur la fiche de connexion.
          </p>
        </div>
      )}
      {actionError && <div style={{ marginTop: 12 }}><ErrorMessage message={actionError} /></div>}

      {dialog === "generate" && data && (
        <ConfirmModal
          title="Générer un nouveau code parent ?"
          consequences={[
            <>L&apos;ancien code <b>{data.code?.code}</b>{" "}ne fonctionnera plus, même s&apos;il est déjà imprimé sur une fiche.</>,
            `Le nouveau code est valable ${LINK_CODE_VALID_DAYS} jours, pour une seule utilisation.`,
          ]}
          unchanged="le compte de l'élève, son identifiant et son mot de passe."
          confirmLabel="Générer le code"
          busy={busy}
          onConfirm={() => run(generate)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "unlink" && data?.parent && unlink && (
        <ConfirmModal
          title="Retirer le lien avec ce parent ?"
          consequences={[
            <>{fullName(data.parent)} ne verra plus la progression {deName(data.studentName)} dans son espace parent.</>,
          ]}
          unchanged="le compte de l'élève, sa classe et sa progression ; le compte du parent existe toujours."
          reversibility="Pour relier un parent de nouveau, générez un nouveau code."
          confirmLabel="Retirer le lien"
          danger
          busy={busy}
          onConfirm={() => run(unlink)}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}
