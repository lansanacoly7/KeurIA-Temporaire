"use client";

import { useCallback, useState } from "react";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { getSchoolRules, saveSchoolRules } from "@/app/_scolaire/lib/ecoleApi";
import {
  BOOL_KEYS,
  DAILY_MAX_MINUTES,
  DAILY_MIN_MINUTES,
  RULE_LABELS,
  apiRules,
  slotsToWindows,
  validateDailyMinutes,
  validateSlots,
  windowsToSlots,
  type RuleSet,
} from "@/app/_scolaire/lib/rules";
import { RuleSwitchCard, RULE_HINTS } from "@/app/_scolaire/ui/RuleSwitchCard";
import { SlotsEditor } from "@/app/_scolaire/ui/SlotsEditor";
import { StudentPreview } from "@/app/_scolaire/ui/StudentPreview";

/** Page « Règles de l'école » (direction) : créneaux, interrupteurs, aperçu élève. */
export function SchoolRulesView() {
  const load = useCallback(() => getSchoolRules(), []);
  const { data, error } = useApi(load);
  const [draft, setDraft] = useState<RuleSet>({});
  const [message, setMessage] = useState("");
  const [problems, setProblems] = useState<string[]>([]);

  const current: RuleSet = data ? { ...data.rules, ...draft } : draft;
  const slots = windowsToSlots(current.windows);
  const label = (key: string) => data?.catalogue[key] ?? RULE_LABELS[key] ?? key;

  const setSlots = (next: ReturnType<typeof windowsToSlots>) =>
    setDraft((d) => ({ ...d, windows: next.length > 0 ? slotsToWindows(next) : undefined }));

  const save = async () => {
    const errors = [...validateSlots(slots), ...validateDailyMinutes(current.daily_limit_minutes)];
    setProblems(errors);
    if (errors.length > 0) {
      setMessage("");
      return;
    }
    try {
      await saveSchoolRules(apiRules(current));
      setProblems([]);
      setMessage("Enregistré avec succès.");
    } catch (e) {
      // L'erreur du serveur (400 « assouplit l'école », etc.) s'affiche telle quelle.
      setMessage(e instanceof Error ? e.message : "Erreur.");
    }
  };

  if (error) return <p className="ec-error">{error}</p>;
  if (!data) return <p>Chargement…</p>;

  return (
    <div>
      <p className="ec-rules-eyebrow">Règles en couches — École → Classe → Maison</p>
      <h1 className="ec-rules-title">Règles de l&apos;école</h1>
      <p className="ec-rules-subtitle">Horaires et fonctionnalités autorisés pour toutes les classes.</p>

      <section className="ec-card" aria-labelledby="regles-ecole-creneaux">
        <h2 id="regles-ecole-creneaux">Créneaux horaires autorisés</h2>
        <p className="ec-card-desc">Périodes d’accès au cahier, fuseau Africa/Dakar.</p>
        <SlotsEditor slots={slots} onChange={setSlots} />
      </section>

      <section className="ec-card" aria-labelledby="regles-ecole-fonctions" style={{ marginTop: 20 }}>
        <h2 id="regles-ecole-fonctions">Fonctionnalités</h2>
        <div className="ec-rules-grid">
          {BOOL_KEYS.map((key) => (
            <RuleSwitchCard
              key={key}
              title={label(key)}
              hint={RULE_HINTS[key]}
              checked={current[key] !== false}
              onChange={(checked) => setDraft((d) => ({ ...d, [key]: checked }))}
            />
          ))}
          <div className="ec-rule-switch">
            <div className="ec-rule-switch__info">
              <h3>Temps quotidien</h3>
              <p>Plafond de minutes par jour et par élève.</p>
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

        <StudentPreview schoolRules={current} />

        <div className="ec-rules-actions">
          <button type="button" className="ec-btn ec-btn--primary" onClick={save}>
            Enregistrer les règles
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
      </section>
    </div>
  );
}
