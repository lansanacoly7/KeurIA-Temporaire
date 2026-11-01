/*
 * Liaison parent ↔ élève par code.
 *
 * L'école crée les comptes élèves ; un parent ne peut donc pas « créer » le
 * compte de son enfant. Il saisit à la place un code de liaison remis par
 * l'école (fiche de connexion ou fiche élève). Règles appliquées par le serveur :
 *   - usage unique, valable LINK_CODE_VALID_DAYS jours ;
 *   - un seul code actif par élève (en générer un nouveau révoque l'ancien) ;
 *   - le mot de passe de l'enfant n'est jamais partagé ;
 *   - saisie réservée à un compte parent connecté, avec un nombre d'essais limité.
 */
import { api } from "./http";
import type { Parent } from "./types";

export const LINK_CODE_VALID_DAYS = 30;

export type ParentLinkInfo = {
  studentName: string;
  studentDisabled: boolean;
  parent: Parent | null;
  parentPhone?: string;
  linkedAt: string | null;
  /** Code actif, déjà formaté (« K7P-4Q2 »). */
  code: { code: string; expiresAt: string } | null;
};

// ─── École ────────────────────────────────────────────────────────────────────

export function getParentLink(studentId: string): Promise<ParentLinkInfo> {
  return api.get(`ecole/students/${encodeURIComponent(studentId)}/parent-link`);
}

export function generateParentLinkCode(studentId: string): Promise<ParentLinkInfo> {
  return api.post(`ecole/students/${encodeURIComponent(studentId)}/parent-link`);
}

/** Retire le lien (le compte parent existe toujours, il ne voit plus l'enfant). */
export function unlinkParent(studentId: string): Promise<ParentLinkInfo> {
  return api.delete(`ecole/students/${encodeURIComponent(studentId)}/parent-link`);
}

// ─── Parent connecté ──────────────────────────────────────────────────────────

/** Le code suffit : prénom, nom et téléphone viennent de la fiche créée à l'inscription. */
export type RedeemInput = { code: string };
export type RedeemResult = { studentName: string; classroom: string | null; parentName: string };

/** Le parent saisit le code reçu de l'école (message identique pour un code inconnu, expiré ou utilisé). */
export function redeemParentLinkCode(input: RedeemInput): Promise<RedeemResult> {
  return api.post("parent/link-code", input);
}
