"use client";

import { useState } from "react";
import { Check, Copy, Printer, TriangleAlert } from "lucide-react";
import type { Credentials } from "../lib/types";
import { LINK_CODE_VALID_DAYS } from "../lib/parentLinks";
import { accessMessage, buildWhatsAppLink } from "../lib/whatsapp";
import { Modal } from "./ui";
import { ParentCodeNote } from "./CredentialSheet";

/**
 * Affiche l'identifiant et le mot de passe provisoire UNE SEULE FOIS
 * (comme le fera l'API : le mot de passe n'est jamais stocké en clair).
 */
export function CredentialsModal({ title, personName, subtitle, credentials, onClose }: {
  title: string;
  personName: string;
  /** Ex. « CE1 A · Groupe Scolaire Les Baobabs » */
  subtitle?: string;
  credentials: Credentials;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = `Identifiant : ${credentials.login}\nMot de passe provisoire : ${credentials.temporaryPassword}`
      + (credentials.parentCode ? `\nCode parent : ${credentials.parentCode}` : "");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (navigateur ancien ou non sécurisé) : l'utilisateur peut recopier à la main.
    }
  }

  const whatsappText = accessMessage({
    name: personName,
    login: credentials.login,
    password: credentials.temporaryPassword,
    parentCode: credentials.parentCode,
    validDays: LINK_CODE_VALID_DAYS,
  });
  const whatsappUrl = buildWhatsAppLink(credentials.parentPhone, whatsappText);

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ec-btn ec-btn--whatsapp"
          >
            WhatsApp
          </a>
          <button type="button" className="ec-btn" onClick={copy}>
            {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />} {copied ? "Copié" : "Copier"}
          </button>
          <button type="button" className="ec-btn" onClick={() => window.print()}>
            <Printer size={17} aria-hidden="true" /> Imprimer
          </button>
          <button type="button" className="ec-btn ec-btn--primary" onClick={onClose}>Terminé</button>
        </>
      }
    >
      <div className="ec-credential ec-print-area">
        <small>kEur IA · Fiche de connexion</small>
        <b>{personName}</b>
        {subtitle && <span>{subtitle}</span>}
        <dl>
          <dt>Identifiant</dt>
          <dd>{credentials.login}</dd>
          <dt>Mot de passe provisoire</dt>
          <dd>{credentials.temporaryPassword}</dd>
        </dl>
        <ParentCodeNote credentials={credentials} />
        {/* Rendu uniquement après une action de l'utilisateur : window est disponible. */}
        <span>Se connecter sur : {window.location.host}/connexion</span>
      </div>
      <div className="ec-alert">
        <TriangleAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>Ce mot de passe ne sera <b>plus jamais affiché</b>. Copiez-le ou imprimez la fiche maintenant. En cas de perte, vous pourrez en générer un nouveau.</div>
      </div>
    </Modal>
  );
}
