/*
 * Graphiques simples en HTML/CSS (sans bibliothèque), pour une série unique :
 * une seule teinte, pas de légende (le titre dit ce qui est tracé), valeur au
 * bout de chaque barre, infobulle au survol ET au focus clavier.
 * Styles : ../scolaire.css (section « Graphiques »).
 */

export type HBarDatum = {
  key: string;
  label: string;
  /** null : pas encore de données (aucune barre dessinée). */
  value: number | null;
  valueLabel: string;
  tooltip: string;
  /** Élément affiché à côté du libellé (ex. badge « À retravailler »). */
  flag?: React.ReactNode;
};

/** Barres horizontales sur une échelle 0–max (ex. scores en %). */
export function HBarChart({ data, max, axis, caption }: {
  data: HBarDatum[];
  max: number;
  /** Graduations affichées sous le graphique (début, milieu, fin). */
  axis: [string, string, string];
  caption: string;
}) {
  return (
    <div className="ec-chart" role="list" aria-label={caption}>
      {data.map(d => (
        <div key={d.key} className="ec-hbar-row" role="listitem" tabIndex={0} aria-label={d.tooltip}>
          <span className="ec-hbar-label">{d.label}{d.flag}</span>
          <span className="ec-hbar-track">
            {d.value !== null && <span className="ec-hbar-bar" style={{ width: `${Math.max(1, (d.value / max) * 100)}%` }} />}
            <span className="ec-hbar-value">{d.valueLabel}</span>
          </span>
          <span className="ec-tooltip" aria-hidden="true">{d.tooltip}</span>
        </div>
      ))}
      <div className="ec-chart-axis" aria-hidden="true">
        <span />
        <div><span>{axis[0]}</span><span>{axis[1]}</span><span>{axis[2]}</span></div>
      </div>
    </div>
  );
}

export type ColumnDatum = { key: string; label: string; value: number; tooltip: string };

/** Colonnes verticales d'effectifs (ex. nombre d'élèves par tranche). */
export function ColumnChart({ data, caption }: { data: ColumnDatum[]; caption: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="ec-chart">
      <div className="ec-columns" role="list" aria-label={caption}>
        {data.map(d => (
          <div key={d.key} className="ec-column" role="listitem" tabIndex={0} aria-label={d.tooltip}>
            <span className="ec-hbar-value">{d.value}</span>
            <span className="ec-column-bar" style={{ height: `${(d.value / max) * 80}%` }} />
            <span className="ec-tooltip" aria-hidden="true">{d.tooltip}</span>
          </div>
        ))}
      </div>
      <div className="ec-column-labels" aria-hidden="true">
        {data.map(d => <span key={d.key}>{d.label}</span>)}
      </div>
    </div>
  );
}
