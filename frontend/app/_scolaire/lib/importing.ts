/*
 * Lecture des fichiers d'import (élèves / enseignants).
 *
 * - CSV : lu dans le navigateur (séparateur ; , ou tabulation, guillemets, BOM Excel).
 * - Excel (.xlsx) : lu par le serveur (readExcelFile), qui renvoie le même tableau de textes.
 */

import { normalizeText } from "./format";

export type ImportKind = "eleves" | "enseignants";

export type StudentField = "matricule" | "firstName" | "lastName" | "sexe" | "birthDate" | "className";
export type TeacherField = "firstName" | "lastName" | "email" | "phone" | "classNames";

/** Une ligne du fichier, champ par champ, encore sous forme de texte brut. */
export type RawRecord<F extends string> = { line: number; values: Record<F, string> };

type ColumnSpec<F extends string> = { field: F; header: string; aliases: string[]; example: string[] };

export const STUDENT_COLUMNS: ColumnSpec<StudentField>[] = [
  { field: "matricule", header: "Matricule", aliases: ["matricule", "numero", "numeromatricule", "id"], example: ["LB-2026-0301", "LB-2026-0302"] },
  { field: "firstName", header: "Prénom", aliases: ["prenom", "prenoms", "firstname"], example: ["Awa", "Moussa"] },
  { field: "lastName", header: "Nom", aliases: ["nom", "nomdefamille", "lastname"], example: ["Diop", "Fall"] },
  { field: "sexe", header: "Sexe", aliases: ["sexe", "genre", "sex"], example: ["F", "M"] },
  { field: "birthDate", header: "Date de naissance", aliases: ["datedenaissance", "datenaissance", "naissance", "nele", "birthdate"], example: ["14/03/2018", "02/11/2017"] },
  { field: "className", header: "Classe", aliases: ["classe", "class"], example: ["CE1 A", "CE1 A"] },
];

export const TEACHER_COLUMNS: ColumnSpec<TeacherField>[] = [
  { field: "firstName", header: "Prénom", aliases: ["prenom", "prenoms", "firstname"], example: ["Fatou", "Ousmane"] },
  { field: "lastName", header: "Nom", aliases: ["nom", "nomdefamille", "lastname"], example: ["Ndiaye", "Sarr"] },
  { field: "email", header: "E-mail", aliases: ["email", "mail", "courriel", "adresseemail", "adressemail"], example: ["fatou.ndiaye@example.com", "ousmane.sarr@example.com"] },
  { field: "phone", header: "Téléphone", aliases: ["telephone", "tel", "portable", "phone", "numerodetelephone"], example: ["77 123 45 67", "78 234 56 78"] },
  { field: "classNames", header: "Classes", aliases: ["classes", "classe", "class"], example: ["CM1 A", "6e A, 5e A"] },
];

export const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".pdf"];
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

function normalizeHeader(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

/** Devine le séparateur en regardant la première ligne (hors guillemets). */
function detectSeparator(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0].replace(/"[^"]*"/g, "");
  const counts = [";", ",", "\t"].map(sep => ({ sep, n: firstLine.split(sep).length - 1 }));
  return counts.sort((a, b) => b.n - a.n)[0].n > 0 ? counts[0].sep : ";";
}

/** Lecteur CSV (RFC 4180) : guillemets, guillemets doublés, retours à la ligne dans une cellule. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const sep = detectSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === "") quoted = true;
    else if (char === sep) { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(value => value.trim() !== ""));
}

export class ImportFormatError extends Error {}

/**
 * Associe les colonnes du fichier aux champs attendus.
 * Si des colonnes manquent dans le fichier, le fichier n'est pas refusé :
 * les cellules correspondantes sont initialisées vides pour être complétées directement dans l'interface.
 */
export function tableToRecords<F extends string>(table: string[][], columns: ColumnSpec<F>[]): RawRecord<F>[] {
  if (table.length === 0) throw new ImportFormatError("Le fichier ne contient aucune ligne de données.");
  
  const headers = table[0].map(normalizeHeader);
  const recognizedCount = columns.filter(col => headers.some(h => col.aliases.includes(h))).length;
  
  // Si au moins une colonne correspond à un en-tête reconnu, la ligne 0 est l'en-tête
  const hasHeaderRow = recognizedCount > 0 && table.length > 1;
  const dataRows = hasHeaderRow ? table.slice(1) : table;
  const startLine = hasHeaderRow ? 2 : 1;

  const indexes = columns.map((column, defaultColIndex) => {
    if (hasHeaderRow) {
      const idx = headers.findIndex(h => column.aliases.includes(h));
      return { column, index: idx };
    }
    // Sans en-tête explicite (ex: export brut), on associe par ordre des colonnes
    return { column, index: defaultColIndex < (dataRows[0]?.length ?? 0) ? defaultColIndex : -1 };
  });

  return dataRows.map((cells, i) => ({
    line: startLine + i,
    values: Object.fromEntries(
      indexes.map(({ column, index }) => [column.field, index >= 0 && index < cells.length ? (cells[index] ?? "").trim() : ""])
    ) as Record<F, string>,
  }));
}

/** « 14/03/2018 », « 14-03-2018 » ou « 2018-03-14 » → « 2018-03-14 » (null si illisible). */
export function parseDate(value: string): string | null {
  const text = value.trim();
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  let [year, month, day] = match ? [match[1], match[2], match[3]] : ["", "", ""];
  if (!match) {
    match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
    if (!match) return null;
    [day, month, year] = [match[1], match[2], match[3]];
  }
  // Calcul en UTC : refuse les dates impossibles (31/02) sans dépendre du fuseau horaire.
  const [y, m, d] = [Number(year), Number(month), Number(day)];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** « F », « Fille », « féminin » → F ; « M », « G », « Garçon », « masculin » → M. */
export function parseSexe(value: string): "F" | "M" | null {
  const text = normalizeHeader(value);
  if (["f", "fille", "feminin", "femme"].includes(text)) return "F";
  if (["m", "g", "garcon", "masculin", "homme"].includes(text)) return "M";
  return null;
}

/** Modèle téléchargeable : CSV « ; » avec BOM pour qu'Excel affiche bien les accents. */
export function templateCsv(kind: ImportKind): string {
  const columns = kind === "eleves" ? STUDENT_COLUMNS : TEACHER_COLUMNS;
  const escape = (value: string) => (/[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const lines = [
    columns.map(c => c.header),
    ...[0, 1].map(i => columns.map(c => c.example[i])),
  ].map(cells => cells.map(escape).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}
