"use client";

import { useCallback, useState } from "react";
import { getClassRules, saveClassRules } from "@/app/_scolaire/lib/enseignantApi";
import {
  BOOL_KEYS,
  DAILY_MAX_MINUTES,
  DAILY_MIN_MINUTES,
  RULE_LABELS,
  apiRules,
  isRuleLocked,
  looseningErrors,
  slotsToWindows,
  validateDailyMinutes,
  validateSlots,
  windowsToSlots,
  type RuleSet,
} from "@/app/_scolaire/lib/rules";
import { RuleSwitchCard, RULE_HINTS } from "@/app/_scolaire/ui/RuleSwitchCard";
import { SlotsEditor } from "@/app/_scolaire/ui/SlotsEditor";
import { StudentPreview } from "@/app/_scolaire/ui/StudentPreview";
import { useApi } from "@/app/_scolaire/lib/useApi";

/**
 * Section « Règles de la classe » : mêmes contrôles que la direction, mais ce
 * que l'école interdit est verrouillé (interrupteur éteint + « Interdit par
 * l'école ») et l'envoi est bloqué si la classe assouplirait l'école
 * (validation locale + erreur du serveur affichée telle quelle).
 */
export function TeacherRulesSection({ classId }: { classId: string }) {
  const load = useCallback(() => getClassRules(classId), [classId]);
  const { data, error } = useApi(load);
  const [draft, setDraft] = useState<RuleSet>({});
  const [message, setMessage] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (error) return <p className="ec-error">{error}</p>;
  if (!data) return <p>Chargement…</p>;

  const schoolRules: RuleSet = data.schoolRules;
  const current: RuleSet = { ...data.rules, ...draft };
  const slots = windowsToSlots(current.windows);
  const label = (key: string) => data.catalogue[key] ?? RULE_LABELS[key] ?? key;

  const setSlots = (next: ReturnType<typeof windowsToSlots>) =>
    setDraft((d) => ({ ...d, windows: next.length > 0 ? slotsToWindows(next) : undefined }));

  const save = async () => {
    const errors = [
      ...validateSlots(slots),
      ...validateDailyMinutes(current.daily_limit_minutes),
      ...looseningErrors(schoolRules, current),
    ];
    setProblems(errors);
    if (errors.length > 0) {
      setMessage("");
      return;
    }
    setSaving(true);
    try {
      await saveClassRules(classId, apiRules(current));
      setProblems([]);
      setMessage("Enregistré avec succès.");
    } catch (e) {
      // Le serveur répond 400 {error} si la classe assouplit l'école : on l'affiche tel quel.
      setMessage(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3 className="ec-rules-subhead">Créneaux horaires autorisés</h3>
      <p className="ec-card-desc">Doivent rester dans les créneaux de l&apos;école.</p>
      <SlotsEditor slots={slots} onChange={setSlots} />

      <h3 className="ec-rules-subhead" style={{ marginTop: 20 }}>
        Fonctionnalités
      </h3>
      <div className="ec-rules-grid" style={{ marginTop: 8 }}>
        {BOOL_KEYS.map((key) => {
          const locked = isRuleLocked(key, schoolRules);
          const checked = locked ? false : current[key] !== false;
          return (
            <RuleSwitchCard
              key={key}
              title={label(key)}
              hint={RULE_HINTS[key]}
              checked={checked}
              locked={locked}
              onChange={(next) => setDraft((d) => ({ ...d, [key]: next }))}
            />
          );
        })}
        <div className="ec-rule-switch">
          <div className="ec-rule-switch__info">
            <h3>Temps quotidien</h3>
            <p>
              {typeof schoolRules.daily_limit_minutes === "number"
                ? `L’école plafonne à ${schoolRules.daily_limit_minutes} minutes par jour.`
                : "Plafond de minutes par jour et par élève."}
            </p>
            <div className="ec-minutes-field">
              <input
                type="number"
                min={DAILY_MIN_MINUTES}
                max={DAILY_MAX_MINUTES}
                value={typeof current.daily_limit_minutes === "number" ? current.daily_limit_minutes : ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    daily_limit_minutes: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
                aria-label="Temps quotidien en minutes"
              />
              <span>
                minutes/jour · {DAILY_MIN_MINUTES} à {DAILY_MAX_MINUTES} · vide = aucun plafond
              </span>
            </div>
          </div>
        </div>
      </div>

      <StudentPreview schoolRules={schoolRules} classRules={current} />

      <div className="ec-rules-actions">
        <button type="button" className="ec-btn ec-btn--primary" onClick={save} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer les règles"}
        </button>
        {message && (
          <span className="ec-rules-status" role="status">
            {message}
          </span>
        )}
      </div>

      {problems.length > 0 && (
        <div className="ec-error" role="alert" style={{ marginTop: 10 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
