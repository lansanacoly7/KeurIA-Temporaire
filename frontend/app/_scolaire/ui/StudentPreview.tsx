"use client";

import { studentPreview, type RuleSet } from "@/app/_scolaire/lib/rules";

/**
 * Encart « Ce que voit l'élève » : phrases déduites des règles effectives
 * (une ligne par réglage qui restreint, avec qui l'a coupé), horaires lisibles
 * et temps par jour. Si rien n'est restreint : « Tout est ouvert ».
 */
export function StudentPreview({ schoolRules, classRules = {} }: { schoolRules: RuleSet; classRules?: RuleSet }) {
  const lines = studentPreview(schoolRules, classRules);
  return (
    <div
      className="ec-readonly"
      style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, fontSize: 13, lineHeight: 1.5 }}
      aria-label="Ce que voit l'élève"
    >
      <strong style={{ display: "block", marginBottom: 4, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>
        Ce que voit l&apos;élève
      </strong>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
