/**
 * Utilitaires pour l'envoi de messages via WhatsApp (wa.me).
 * Nettoie les numéros de téléphone et gère les formats internationaux et locaux.
 */

export function cleanWhatsAppNumber(phone?: string | null): string {
  if (!phone) return "";
  let digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  // Numéro à 9 chiffres commençant par 7 (ex: 77 998 68 28 pour le Sénégal) -> ajout de l'indicatif 221
  if (digits.length === 9 && digits.startsWith("7")) {
    digits = `221${digits}`;
  }
  return digits;
}

/**
 * Messages envoyés aux parents. Texte simple, SANS symboles de mise en forme (« * », « _ », « ` ») : WhatsApp ne les
 * interprète pas toujours (les espaces autour d'un « * » les laissent à l'écran, et un message copié dans un SMS ou un
 * e-mail les montre tels quels). La clarté vient de la structure : le code seul sur sa ligne, puis les étapes numérotées.
 */
import { deName } from "./format";

const BRAND = "kEur IA";

/** Le code de liaison est l'essentiel : il vient en premier, seul sur sa ligne, et se recopie d'un geste. */
export function parentLinkMessage({ studentName, code, validDays }: { studentName: string; code: string; validDays: number }): string {
  return [
    "Bonjour,",
    "",
    `Voici le code pour relier ${studentName} à votre compte parent ${BRAND} :`,
    "",
    code,
    "",
    "Pour l'utiliser :",
    `1. Créez votre compte parent sur ${BRAND}, ou connectez-vous.`,
    "2. Ouvrez « Relier mon enfant ».",
    `3. Saisissez le code ${code}.`,
    "",
    `Ce code est personnel : il est valable ${validDays} jours et ne sert qu'une seule fois.`,
  ].join("\n");
}

/**
 * Accès d'un élève (ou d'un enseignant). Avec un code parent, le code reste en tête : c'est ce que le parent doit
 * utiliser ; les accès de l'élève viennent après.
 */
export function accessMessage({ name, login, password, parentCode, validDays }: {
  name: string;
  login: string;
  password: string;
  parentCode?: string | null;
  validDays: number;
}): string {
  const access = [`Identifiant : ${login}`, `Mot de passe provisoire : ${password}`];
  if (!parentCode) return ["Bonjour,", "", `Voici les accès ${BRAND} ${deName(name)} :`, "", ...access].join("\n");
  return [
    parentLinkMessage({ studentName: name, code: parentCode, validDays }),
    "",
    `Accès ${deName(name)} à son espace élève :`,
    ...access,
  ].join("\n");
}

export function buildWhatsAppLink(phone: string | undefined | null, message: string): string {
  const clean = cleanWhatsAppNumber(phone);
  const encoded = encodeURIComponent(message);
  return clean ? `https://wa.me/${clean}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}
