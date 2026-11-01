"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarCheck, CalendarDays, History, RotateCcw, TriangleAlert } from "lucide-react";
import {
  CLOSURE_UNDO_DAYS, getYearsOverview, undoYearClosure, updateCurrentYearDates, type YearsOverview,
} from "@/app/_scolaire/lib/anneeApi";
import { formatDate, plural } from "@/app/_scolaire/lib/format";
import type { AcademicYear } from "@/app/_scolaire/lib/types";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { useSchool } from "@/app/_scolaire/ui/SchoolContext";
import { Badge, ConfirmModal, EmptyState, ErrorMessage, Field, Notice, PageHeader, Skeleton } from "@/app/_scolaire/ui/ui";

const DAY_MS = 24 * 3600_000;

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(`${isoDate}T23:59:59`).getTime() - Date.now()) / DAY_MS);
}

function DatesForm({ year, onSaved }: { year: AcademicYear; onSaved: () => void }) {
  const [startDate, setStartDate] = useState(year.startDate);
  const [endDate, setEndDate] = useState(year.endDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = startDate !== year.startDate || endDate !== year.endDate;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateCurrentYearDates({ startDate, endDate });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="ec-form-grid">
        <Field label="Rentrée">
          <input type="date" className="ec-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </Field>
        <Field label="Fin de l'année" hint="La clôture de l'année sera possible à partir de cette date.">
          <input type="date" className="ec-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </Field>
      </div>
      {error && <div style={{ marginTop: 12 }}><ErrorMessage message={error} /></div>}
      {changed && (
        <div className="ec-actions" style={{ marginTop: 12 }}>
          <button type="button" className="ec-btn" onClick={() => { setStartDate(year.startDate); setEndDate(year.endDate); setError(null); }}>Annuler</button>
          <button type="submit" className="ec-btn ec-btn--primary" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer les dates"}</button>
        </div>
      )}
    </form>
  );
}

function PendingClosure({ pending, onUndone }: { pending: NonNullable<YearsOverview["pendingClosure"]>; onUndone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function undo() {
    setBusy(true);
    try {
      await undoYearClosure();
      onUndone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Annulation impossible.");
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="ec-alert" style={{ marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
      <RotateCcw size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
      <div style={{ flex: "1 1 280px" }}>
        L&apos;année <b>{pending.fromYear}</b>{" "}a été clôturée le {formatDate(pending.closedAt)}. Vous pouvez annuler cette clôture
        jusqu&apos;au <b>{formatDate(pending.undoUntil)}</b>.
        {error && <div style={{ marginTop: 6 }}>{error}</div>}
      </div>
      <button type="button" className="ec-btn" onClick={() => setConfirming(true)}>Annuler la clôture</button>
      {confirming && (
        <ConfirmModal
          title={`Annuler la clôture de ${pending.fromYear} ?`}
          consequences={[
            <>L&apos;école revient en {pending.fromYear} : les classes, les élèves et les enseignants retrouvent leur situation d&apos;avant la clôture.</>,
            <>Les classes créées pour {pending.toYear} sont supprimées, avec les devoirs qui leur ont été donnés depuis.</>,
            "Les élèves inscrits depuis dans ces nouvelles classes se retrouvent sans classe (leur compte est conservé).",
            ...(pending.changesSince > 0
              ? [<b key="perdu">{plural(pending.changesSince, "modification faite", "modifications faites")} depuis la clôture {pending.changesSince > 1 ? "seront perdues" : "sera perdue"}.</b>]
              : []),
          ]}
          reversibility="Vous pourrez clôturer l'année de nouveau plus tard, avec l'assistant."
          confirmLabel="Annuler la clôture"
          cancelLabel="Garder la clôture"
          danger
          busy={busy}
          onClose={() => setConfirming(false)}
          onConfirm={undo}
        />
      )}
    </div>
  );
}

function summaryText(year: AcademicYear): string {
  const s = year.summary;
  if (!s) return "";
  return [
    plural(s.classesArchived, "classe archivée", "classes archivées"),
    `${s.promoted} ${s.promoted > 1 ? "passent" : "passe"}`,
    `${s.repeating} ${s.repeating > 1 ? "redoublent" : "redouble"}`,
    `${s.leaving} ${s.leaving > 1 ? "quittent" : "quitte"} l'école`,
  ].join(" · ");
}

export function YearsView({ justClosed }: { justClosed: boolean }) {
  const { data, error, reload } = useApi(getYearsOverview);
  const { reload: reloadSchool } = useSchool();
  const [notice, setNotice] = useState<string | null>(justClosed ? "L'année a été clôturée. Pensez à attribuer un enseignant à chaque nouvelle classe." : null);

  const header = (
    <PageHeader
      title="Années scolaires"
      subtitle="Calendrier de l'année en cours, clôture de fin d'année et années passées."
      actions={<Link className="ec-btn ec-btn--primary" href="/ecole/parametres">Retour aux paramètres</Link>}
    />
  );
  if (error) return <>{header}<ErrorMessage message={error} onRetry={reload} /></>;
  if (!data) return <>{header}<Skeleton height={320} /></>;

  const { current, past, pendingClosure } = data;
  const remaining = daysUntil(current.endDate);

  return (
    <>
      {header}
      {notice && <Notice>{notice}</Notice>}
      {pendingClosure && (
        <PendingClosure
          pending={pendingClosure}
          onUndone={() => { setNotice(`La clôture a été annulée : l'école est revenue en ${pendingClosure.fromYear}.`); reload(); reloadSchool(); }}
        />
      )}

      <section className="ec-card" aria-labelledby="annee-titre" style={{ marginBottom: 20 }}>
        <div className="ec-year-head">
          <div>
            <h2 id="annee-titre">Année {current.label}</h2>
            <p>
              {remaining > 0
                ? `Fin de l'année dans ${plural(remaining, "jour")}, le ${formatDate(current.endDate)}.`
                : `L'année est terminée depuis le ${formatDate(current.endDate)}.`}
            </p>
          </div>
          <Badge tone="ok"><CalendarDays size={13} aria-hidden="true" /> En cours</Badge>
        </div>

        <DatesForm key={`${current.startDate}|${current.endDate}`} year={current} onSaved={() => { setNotice("Les dates de l'année ont été enregistrées."); reload(); }} />

        <div className="ec-year-closing">
          <div>
            <h3>Fin d&apos;année</h3>
            <p>
              La clôture archive les classes de {current.label}, fait passer les élèves au niveau supérieur (ou redoubler)
              et prépare les classes de l&apos;année suivante. Un assistant vous guide ; la clôture reste annulable
              pendant {CLOSURE_UNDO_DAYS} jours.
            </p>
          </div>
          {pendingClosure ? (
            <p className="ec-readonly" style={{ margin: 0 }}><TriangleAlert size={14} aria-hidden="true" /> Une clôture est encore annulable : une nouvelle clôture n&apos;est pas possible pour l&apos;instant.</p>
          ) : (
            <Link className="ec-btn ec-btn--primary" href="/ecole/annees/cloture">
              <CalendarCheck size={17} aria-hidden="true" /> Clôturer l&apos;année {current.label}…
            </Link>
          )}
        </div>
      </section>

      <section className="ec-card" aria-labelledby="passees-titre">
        <h2 id="passees-titre">Années précédentes</h2>
        {past.length === 0 ? (
          <EmptyState icon={History} title="Aucune année clôturée pour l'instant" text="Après une clôture, l'année reste consultable ici : classes et élèves de l'époque." />
        ) : (
          <ul className="ec-list">
            {past.map(year => (
              <li key={year.label}>
                <div className="ec-list-main">
                  <b>Année {year.label}</b>
                  <span>Clôturée le {year.closedAt ? formatDate(year.closedAt) : "—"} · {summaryText(year)}</span>
                </div>
                <Link className="ec-link-btn" href={`/ecole/annees/${year.label}`}>Consulter</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
