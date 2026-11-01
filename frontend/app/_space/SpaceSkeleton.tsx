import type { SpaceKind } from "../space-home";
import "./space-skeleton.css";

const NAV_ITEMS = 6;
const STAT_TILES = 4;

/** Contenu fantôme d'une page : en-tête, chiffres clés, deux cartes. */
function SkeletonContent() {
  return (
    <div className="sk-content">
      <div className="sk-head">
        <div className="sk-head-text">
          <span className="sk-bone sk-title" />
          <span className="sk-bone sk-subtitle" />
        </div>
        <span className="sk-bone sk-action" />
      </div>
      <div className="sk-stats">
        {Array.from({ length: STAT_TILES }, (_, i) => (
          <div className="sk-card sk-stat" key={i}>
            <span className="sk-bone sk-stat-icon" />
            <span className="sk-bone sk-line sk-w40" />
            <span className="sk-bone sk-stat-value" />
          </div>
        ))}
      </div>
      <div className="sk-panels">
        {[5, 4].map((rows, i) => (
          <div className="sk-card sk-panel" key={i}>
            <span className="sk-bone sk-line sk-w35 sk-panel-title" />
            {Array.from({ length: rows }, (_, r) => (
              <div className="sk-row" key={r}>
                <span className="sk-bone sk-dot" />
                <span className="sk-bone sk-line" style={{ width: `${55 + ((r * 17) % 35)}%` }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton de chargement d'un espace (aucun faux délai : il reste affiché le
 * temps du chargement réel). `contentOnly` : seulement la zone de contenu,
 * pour un chargement à l'intérieur d'un espace dont la barre latérale est déjà là.
 */
export function SpaceSkeleton({ kind, contentOnly = false }: { kind: SpaceKind; contentOnly?: boolean }) {
  const status = <span className="sk-sr">Chargement de votre espace…</span>;
  if (contentOnly) {
    return <div className="sk-inline" role="status" aria-live="polite" aria-busy="true">{status}<SkeletonContent /></div>;
  }
  return (
    <div className="sk-shell" data-kind={kind} role="status" aria-live="polite" aria-busy="true">
      {status}
      <aside className="sk-side" aria-hidden="true">
        <span className="sk-bone sk-logo" />
        <div className="sk-nav">
          {Array.from({ length: NAV_ITEMS }, (_, i) => <span className={`sk-bone sk-nav-item${i === 0 ? " is-active" : ""}`} key={i} />)}
        </div>
      </aside>
      <div className="sk-main" aria-hidden="true">
        {kind !== "gestion" && (
          <div className="sk-topbar">
            <span className="sk-bone sk-line sk-w20" />
            <span className="sk-bone sk-avatar" />
          </div>
        )}
        <SkeletonContent />
      </div>
    </div>
  );
}
