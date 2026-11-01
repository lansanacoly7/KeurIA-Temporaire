"use client";

import { Plus, Trash2 } from "lucide-react";
import { DAY_LABELS, emptySlot, type SlotDraft } from "@/app/_scolaire/lib/rules";

/**
 * Éditeur de créneaux horaires : un tableau (une ligne par créneau, colonnes
 * Lun → Dim, puis heures « de » / « à », suppression) qui défile
 * horizontalement DANS son cadre sur petit écran — la page ne déborde jamais.
 * Travaille directement sur le format `windows` de l'API (days 0 = lundi,
 * start/end « HH:MM »), aucune saisie JSON.
 */
export function SlotsEditor({
  slots,
  onChange,
  disabled = false,
  error,
}: {
  slots: SlotDraft[];
  onChange: (slots: SlotDraft[]) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  const update = (index: number, patch: Partial<SlotDraft>) =>
    onChange(slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));

  const toggleDay = (index: number, day: number) =>
    onChange(
      slots.map((slot, i) =>
        i === index ? { ...slot, days: slot.days.map((checked, d) => (d === day ? !checked : checked)) } : slot,
      ),
    );

  return (
    <div>
      <p className="ec-table-hint">
        👉 Faites glisser le tableau horizontalement pour voir tous les jours.
      </p>
      <div className="ec-table-frame" tabIndex={0} role="group" aria-label="Créneaux horaires autorisés">
        <table className="ec-slots-table">
          <thead>
            <tr>
              <th scope="col">Créneau</th>
              {DAY_LABELS.map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
              <th scope="col">De</th>
              <th scope="col">À</th>
              <th scope="col" className="sr-only">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, index) => (
              <tr key={index}>
                <th scope="row">Créneau {index + 1}</th>
                {DAY_LABELS.map((label, day) => (
                  <td key={label} className="ec-slots-day">
                    <input
                      type="checkbox"
                      checked={slot.days[day] ?? false}
                      disabled={disabled}
                      onChange={() => toggleDay(index, day)}
                      aria-label={`${label} — créneau ${index + 1}`}
                    />
                  </td>
                ))}
                <td>
                  <input
                    type="time"
                    value={slot.start}
                    disabled={disabled}
                    onChange={(e) => update(index, { start: e.target.value })}
                    aria-label={`Heure de début du créneau ${index + 1}`}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    value={slot.end}
                    disabled={disabled}
                    onChange={(e) => update(index, { end: e.target.value })}
                    aria-label={`Heure de fin du créneau ${index + 1}`}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="ec-btn ec-btn--ghost"
                    disabled={disabled}
                    onClick={() => onChange(slots.filter((_, i) => i !== index))}
                    aria-label={`Supprimer le créneau ${index + 1}`}
                  >
                    <Trash2 size={14} aria-hidden="true" /> Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {slots.length === 0 && (
              <tr>
                <td
                  colSpan={DAY_LABELS.length + 4}
                  style={{ textAlign: "left", color: "var(--ec-muted)", padding: "14px 12px" }}
                >
                  Aucun créneau : aucune restriction d&apos;horaire à ce niveau.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="ec-btn"
        disabled={disabled}
        onClick={() => onChange([...slots, emptySlot()])}
        style={{ marginTop: 10 }}
      >
        <Plus size={14} aria-hidden="true" /> Ajouter un créneau
      </button>
      {error && (
        <p className="ec-error" style={{ marginTop: 8 }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
