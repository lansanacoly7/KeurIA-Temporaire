/*
 * Demandes d'inscription des parents : appels à /api/superadmin/registrations.
 * Le serveur applique la règle (un parent n'accède à son espace qu'une fois la demande acceptée par l'équipe kEur IA).
 */
import { api, query } from "./http";
import type { Paged } from "./superadminApi";

export type RegistrationStatus = "pending" | "approved" | "rejected";

export type RegistrationRequest = {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** pere, mere, tuteur ou tutrice. */
  parentRole: string;
  emailVerified: boolean;
  status: RegistrationStatus;
  requestedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  /** Motif d'un refus, communiqué au parent. */
  note: string;
  child: { name: string; ageGroup: string | null } | null;
};

export type RegistrationList = Paged<RegistrationRequest> & { counts: Record<RegistrationStatus, number> };

export type RegistrationFilter = { status?: RegistrationStatus; query?: string; page?: number };

/** Évènement envoyé après chaque décision : le menu met à jour son compteur sans recharger la page. */
export const REGISTRATIONS_CHANGED = "keuria:registrations-changed";

export function listRegistrations(filter: RegistrationFilter): Promise<RegistrationList> {
  return api.get(`superadmin/registrations${query(filter)}`);
}

export async function pendingRegistrationCount(): Promise<number> {
  return (await listRegistrations({ status: "pending", page: 1 })).counts.pending;
}

type Decision = RegistrationRequest & { emailSent: boolean };

export function approveRegistration(id: string): Promise<Decision> {
  return api.post(`superadmin/registrations/${encodeURIComponent(id)}/approve`, {});
}

export function rejectRegistration(id: string, note: string): Promise<Decision> {
  return api.post(`superadmin/registrations/${encodeURIComponent(id)}/reject`, { note });
}

export const PARENT_ROLE_LABELS: Record<string, string> = { pere: "Père", mere: "Mère", tuteur: "Tuteur", tutrice: "Tutrice" };
