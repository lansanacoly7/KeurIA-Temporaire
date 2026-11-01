import { normalizeText } from "./format";

/** Domaine réservé : ces identifiants ne sont pas de vraies boîtes mail et ne reçoivent jamais d'e-mail. */
export const LOGIN_DOMAIN = "keuria.sn";

/** « Aïssatou N'Diaye » → « aissatou-ndiaye » : minuscules ASCII, sans accents ni apostrophes. */
export function slugifyName(value: string): string {
  return normalizeText(value)
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Identifiant unique d'un élève : prenom.nom@<ecole>.keuria.sn.
 * En cas d'homonyme, un numéro est ajouté (awa.ndiaye2@…).
 */
export function generateStudentLogin(firstName: string, lastName: string, schoolSlug: string, taken: ReadonlySet<string>): string {
  const base = `${slugifyName(firstName)}.${slugifyName(lastName)}`;
  const domain = `@${schoolSlug}.${LOGIN_DOMAIN}`;
  let candidate = `${base}${domain}`;
  for (let n = 2; taken.has(candidate); n++) candidate = `${base}${n}${domain}`;
  return candidate;
}

// Mots simples et faciles à recopier pour des enfants (pas de caractères ambigus).
const PASSWORD_WORDS = ["Baobab", "Mangue", "Soleil", "Pirogue", "Lion", "Etoile", "Tambour", "Palmier", "Girafe", "Kora"];

/** Mot de passe provisoire lisible : « Pirogue-4821 ». Généré avec un aléa cryptographique. */
export function generateTemporaryPassword(): string {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  const word = PASSWORD_WORDS[values[0] % PASSWORD_WORDS.length];
  const digits = String(1000 + (values[1] % 9000));
  return `${word}-${digits}`;
}
