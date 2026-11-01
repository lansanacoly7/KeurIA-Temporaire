"use client";

import { useEffect, useState } from "react";
import { Sparkles, Compass } from "lucide-react";
import { ChildTracking, getColorForIndex, getChildAdventure } from "./ChildrenShared";
import { ChildDetail, ChildPedagogyView } from "./ChildDetailViews";

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// ─── État vide ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "80px 24px", textAlign: "center",
      background: "white", borderRadius: 32, border: "2px dashed #e2e8f0"
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "linear-gradient(135deg,#f0fdf9,#ccfbf1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 24
      }}>
        <Sparkles size={36} color="#0d846e" />
      </div>
      <h3 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
        Aucun explorateur relié
      </h3>
      <p style={{ margin: "0", fontSize: 15, color: "#64748b", maxWidth: 420, lineHeight: 1.6 }}>
        Pour suivre vos enfants, reliez leur compte avec le code remis par l&apos;école depuis l&apos;onglet <strong>Paramètres</strong>.
      </p>
    </div>
  );
}

// ─── Vue principale : Carnets d'Explorateurs (Passeport d'Aventure) ────────────

export function ParentChildrenView({ onVisitChild }: { onVisitChild?: (id: string | number, name: string) => void }) {
  const [tracking, setTracking] = useState<ChildTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [pedagogyChildId, setPedagogyChildId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/progress/tracking", { credentials: "include" });
        if (!res.ok) throw new Error("Impossible de récupérer les données.");
        const data = await res.json();
        const list: ChildTracking[] = data.tracking || [];
        setTracking(list);
        if (list.length > 0) setActiveId(list[0].id);
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "Erreur de chargement.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeChild = tracking.find((c) => c.id === activeId) ?? null;
  const activeIndex = tracking.findIndex((c) => c.id === activeId);
  const pedagogyChild = pedagogyChildId ? tracking.find(c => c.id === pedagogyChildId) : null;

  if (pedagogyChild) {
    return <ChildPedagogyView child={pedagogyChild} onBack={() => setPedagogyChildId(null)} />;
  }

  return (
    <div style={{ padding: "0", color: "#0f172a", width: "100%" }}>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleUpFade {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .anim-slide-up {
          animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-scale-up {
          animation: scaleUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .parent-child-tab-pill:hover:not(.active) {
          border-color: #0F766E !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06) !important;
        }
        @media (max-width: 768px) {
          .parent-bulletin-title { font-size: 22px !important; }
          .parent-children-deck { gap: 10px !important; }
          .parent-child-tab-pill { padding: 12px 16px !important; }
        }
      `}</style>

      {/* En-tête de page aéré */}
      <div className="anim-slide-up" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, background: "linear-gradient(135deg, #0F766E 0%, #175F4E 100%)",
            borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 18px -4px rgba(15, 118, 110, 0.28)", flexShrink: 0
          }}>
            <Compass size={25} color="#D9EF59" />
          </div>
          <div>
            <h2 className="parent-bulletin-title" style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#143C37", letterSpacing: "-0.02em" }}>
              Carnets d&apos;Explorateurs
            </h2>
            <p style={{ margin: "2px 0 0", color: "#647E79", fontSize: 14, fontWeight: 500 }}>
              Le passeport pédagogique, les jalons d&apos;éveil et les réussites de vos enfants
            </p>
          </div>
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 16 }}>
          <div style={{
            width: 48, height: 48, border: "4px solid #ccfbf1", borderTopColor: "#0d846e",
            borderRadius: "50%", animation: "keur-spin 0.9s linear infinite"
          }} />
          <p style={{ margin: 0, color: "#94a3b8", fontWeight: 700 }}>Chargement des carnets d&apos;explorateurs…</p>
          <style>{`@keyframes keur-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 20, padding: "24px",
          color: "#b91c1c", fontWeight: 700, textAlign: "center"
        }}>
          {error}
        </div>
      ) : tracking.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>

          {/* ── Sélecteur horizontal d'enfants (noms complets, zéro troncature) ── */}
          <div className="anim-slide-up" style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Vos explorateurs ({tracking.length})
              </span>
            </div>

            <div 
              className="parent-children-deck" 
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                paddingBottom: 8,
                scrollbarWidth: "thin",
                WebkitOverflowScrolling: "touch",
                width: "100%"
              }}
            >
              {tracking.map((child, idx) => {
                const isActive = child.id === activeId;
                const color = getColorForIndex(idx);
                const statusLabel = child.totalLessons === 0 
                  ? "Première découverte" 
                  : child.totalLessons <= 2 
                  ? "Exploration active" 
                  : "Explorateur autonome";

                return (
                  <button
                    key={child.id}
                    onClick={() => setActiveId(child.id)}
                    type="button"
                    className={`parent-child-tab-pill ${isActive ? "active" : ""}`}
                    style={{
                      background: isActive ? color.bg : "white",
                      color: isActive ? "white" : "#143C37",
                      border: isActive ? "1.5px solid rgba(255,255,255,0.2)" : "1.5px solid #E2EAE3",
                      borderRadius: 18,
                      padding: "12px 18px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexShrink: 0,
                      minWidth: "max-content",
                      boxShadow: isActive ? "0 8px 20px -6px rgba(15, 118, 110, 0.3)" : "0 2px 8px rgba(15, 23, 42, 0.03)",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                      transform: isActive ? "scale(1.02)" : "scale(1)",
                    }}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: isActive ? "rgba(255,255,255,0.2)" : "#EEF7F2",
                      border: isActive ? "2px solid rgba(255,255,255,0.4)" : "1.5px solid #CFE3D8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: 15,
                      color: isActive ? "white" : "#0F766E",
                      flexShrink: 0
                    }}>
                      {getInitials(child.displayName)}
                    </div>

                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap" }}>
                        {child.displayName}
                      </div>
                      <div style={{ fontSize: 11.5, opacity: isActive ? 0.9 : 0.7, fontWeight: 600, marginTop: 1 }}>
                        {statusLabel}
                      </div>
                    </div>

                    {isActive && (
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#D9EF59",
                        boxShadow: "0 0 8px #D9EF59",
                        marginLeft: 4,
                        flexShrink: 0
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Contenu principal : Passeport d'aventure en pleine largeur ── */}
          <div className="anim-scale-up" style={{ width: "100%" }}>
            {activeChild ? (
              <ChildDetail 
                child={activeChild} 
                index={activeIndex} 
                onShowPedagogy={() => setPedagogyChildId(activeChild.id)} 
                onVisitChild={onVisitChild}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#94a3b8" }}>
                Sélectionnez un explorateur
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
