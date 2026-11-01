"use client";

import { formatDate } from "../lib/format";
import type { Credentials } from "../lib/types";

/** Partie « parents » d'une fiche élève : le code de liaison et son mode d'emploi. */
export function ParentCodeNote({ credentials }: { credentials: Credentials }) {
  if (!credentials.parentCode) return null;
  return (
    <div className="ec-credential-parent">
      <p><b>Pour les parents</b>{" "}: créez un compte parent sur kEur IA, puis saisissez ce code pour suivre votre enfant.</p>
      <p>
        Code parent : <strong>{credentials.parentCode}</strong>
        {credentials.parentCodeExpiresAt && <> · valable jusqu&apos;au {formatDate(credentials.parentCodeExpiresAt)}</>}
      </p>
    </div>
  );
}

export type SheetItem = { key: string; name: string; subtitle: string; credentials: Credentials };

/**
 * Planche de fiches de connexion : visible à l'écran, et seule partie imprimée
 * (classe ec-print-area, deux fiches par ligne sur une feuille A4).
 */
export function CredentialSheet({ schoolName, items }: { schoolName: string; items: SheetItem[] }) {
  return (
    <div className="ec-sheet ec-print-area">
      {items.map(item => (
        <div key={item.key} className="ec-credential">
          <small>kEur IA · {schoolName}</small>
          <b>{item.name}</b>
          <span>{item.subtitle}</span>
          <dl>
            <dt>Identifiant</dt>
            <dd>{item.credentials.login}</dd>
            <dt>Mot de passe</dt>
            <dd>{item.credentials.temporaryPassword}</dd>
          </dl>
          <ParentCodeNote credentials={item.credentials} />
          <span>Se connecter sur : {window.location.host}/connexion</span>
        </div>
      ))}
    </div>
  );
}
