"use client";

import React, { useRef, useState, useEffect } from "react";
import { Maximize2, Minimize2, X, RefreshCw, Code2, Smartphone, RotateCw } from "lucide-react";

interface ScratchEmbedProps {
  onClose: () => void;
  title?: string;
}

export function ScratchEmbed({ onClose, title = "Studio Scratch" }: ScratchEmbedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  async function toggleOrientation() {
    try {
      if (typeof window !== "undefined" && window.screen?.orientation && "lock" in window.screen.orientation) {
        if (window.screen.orientation.type.includes("portrait")) {
          await (window.screen.orientation as { lock: (o: "landscape" | "portrait") => Promise<void> }).lock("landscape");
        } else {
          await (window.screen.orientation as { lock: (o: "landscape" | "portrait") => Promise<void> }).lock("portrait");
        }
      } else {
        toggleFullscreen();
      }
    } catch {
      toggleFullscreen();
    }
  }

  function reloadEditor() {
    if (iframeRef.current) {
      setLoading(true);
      iframeRef.current.src = "/scratch/index.html";
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "var(--brand, #0d2b27)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        .scratch-header {
          height: 52px;
          background: linear-gradient(90deg, var(--brand, #183f3b) 0%, var(--brand-mid, #1c524c) 100%);
          border-bottom: 2px solid var(--brand-mid, #28665f);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px !important;
          color: #fff;
          flex-shrink: 0;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
        }
        .scratch-btn {
          min-height: 0 !important;
          max-height: 30px !important;
          height: 30px !important;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          padding: 0 10px !important;
          border-radius: 8px !important;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          align-self: center !important;
          margin: 0 !important;
          gap: 6px;
          box-sizing: border-box !important;
          transition: background 0.15s;
        }
        .scratch-btn:active {
          background: rgba(255,255,255,0.22);
        }
        .scratch-quit-btn {
          min-height: 0 !important;
          max-height: 30px !important;
          height: 30px !important;
          background: #ef4444;
          border: 1px solid #dc2626;
          color: #fff;
          padding: 0 12px !important;
          border-radius: 8px !important;
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          align-self: center !important;
          margin: 0 !important;
          gap: 6px;
          box-shadow: 0 2px 0 #b91c1c;
          box-sizing: border-box !important;
          transition: background 0.15s;
        }
        .scratch-quit-btn:active {
          background: #dc2626;
        }
        .scratch-landscape-tip {
          background: #FEF3C7;
          color: #92400E;
          border-bottom: 2px solid #FCD34D;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-shrink: 0;
        }
        .scratch-desktop-only {
          display: inline-flex !important;
        }
        .scratch-mobile-only {
          display: none !important;
        }
        @media (max-width: 768px) {
          .scratch-desktop-only {
            display: none !important;
          }
          .scratch-mobile-only {
            display: inline-flex !important;
          }
          .scratch-header {
            height: 48px;
            padding: 0 14px 0 10px !important;
          }
          .scratch-subtitle {
            display: none !important;
          }
          .scratch-btn-label {
            display: none !important;
          }
          .scratch-btn {
            height: 30px !important;
            width: 30px !important;
            min-height: 0 !important;
            max-height: 30px !important;
            padding: 0 !important;
            border-radius: 8px !important;
          }
          .scratch-quit-btn {
            height: 30px !important;
            min-height: 0 !important;
            max-height: 30px !important;
            padding: 0 10px !important;
            font-size: 12px !important;
            border-radius: 8px !important;
          }
          .scratch-header-brand {
            gap: 8px !important;
          }
        }
      `}</style>

      {/* Barre supérieure kEur IA responsive */}
      <header className="scratch-header">
        <div className="scratch-header-brand" style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "9px",
              background: "rgba(200, 242, 77, 0.14)",
              border: "1px solid rgba(200, 242, 77, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--brand-accent, #c8f24d)",
              flexShrink: 0,
            }}
          >
            <Code2 size={17} strokeWidth={2.4} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
            <span
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </span>
            <p
              className="scratch-subtitle"
              style={{
                margin: 0,
                fontSize: "11px",
                color: "#a8c9c4",
                fontWeight: 500,
                letterSpacing: "-0.005em",
                lineHeight: 1.2,
              }}
            >
              Atelier de programmation créative · Création libre
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", height: "100%", gap: "8px", flexShrink: 0 }}>
          <button
            type="button"
            className="scratch-btn"
            onClick={reloadEditor}
            title="Recharger l'éditeur Scratch"
          >
            <RefreshCw size={14} />
            <span className="scratch-btn-label">Recommencer</span>
          </button>

          {/* Bouton Desktop / Web : Plein écran classique */}
          <button
            type="button"
            className="scratch-btn scratch-desktop-only"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="scratch-btn-label">{isFullscreen ? "Fenêtré" : "Plein écran"}</span>
          </button>

          {/* Bouton Mobile uniquement : Pivoter l'écran */}
          <button
            type="button"
            className="scratch-btn scratch-mobile-only"
            onClick={toggleOrientation}
            title="Pivoter l'écran en mode paysage"
          >
            <RotateCw size={15} />
            <span className="scratch-btn-label">Pivoter</span>
          </button>

          <button
            type="button"
            className="scratch-quit-btn"
            onClick={onClose}
            title="Fermer Scratch"
          >
            <X size={15} strokeWidth={2.4} />
            <span>Quitter</span>
          </button>
        </div>
      </header>

      {/* Conseil orientation mobile pour une expérience optimale */}
      {showHint && (
        <div className="scratch-landscape-tip">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Smartphone size={17} strokeWidth={2.4} style={{ color: "#B45309", flexShrink: 0 }} />
            <span>Pour plus de confort sur Scratch, tu peux tourner ton téléphone en <b>mode paysage (horizontal)</b> !</span>
          </div>
          <button
            type="button"
            onClick={() => setShowHint(false)}
            style={{
              background: "none",
              border: "none",
              color: "#92400E",
              cursor: "pointer",
              padding: "2px 6px",
              fontSize: "14px",
              fontWeight: 800,
            }}
            title="Masquer le conseil"
          >
            ✕
          </button>
        </div>
      )}

      {/* Zone Iframe de Scratch */}
      <div style={{ flex: 1, position: "relative", width: "100%", height: "100%" }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#f8fafc",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <style>{`
              @keyframes scratch-sk-shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
              .sk-scratch-bone {
                position: relative;
                overflow: hidden;
                background: #e2e8f0;
                border-radius: 8px;
              }
              .sk-scratch-bone::after {
                content: "";
                position: absolute;
                inset: 0;
                background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.65) 50%, transparent 100%);
                transform: translateX(-100%);
                animation: scratch-sk-shimmer 1.4s ease-in-out infinite;
              }
            `}</style>

            {/* Barre de navigation supérieure de l'éditeur */}
            <div
              style={{
                height: "44px",
                background: "#f1f5f9",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
                gap: "12px",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="sk-scratch-bone" style={{ width: "70px", height: "26px", borderRadius: "6px" }} />
                <div className="sk-scratch-bone" style={{ width: "60px", height: "24px", borderRadius: "6px" }} />
                <div className="sk-scratch-bone" style={{ width: "60px", height: "24px", borderRadius: "6px" }} />
                <div className="sk-scratch-bone" style={{ width: "160px", height: "26px", borderRadius: "6px" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="sk-scratch-bone" style={{ width: "28px", height: "28px", borderRadius: "50%" }} />
                <div className="sk-scratch-bone" style={{ width: "28px", height: "28px", borderRadius: "50%" }} />
                <div className="sk-scratch-bone" style={{ width: "80px", height: "26px", borderRadius: "6px" }} />
              </div>
            </div>

            {/* Onglets Code / Costumes / Sons */}
            <div
              style={{
                height: "36px",
                background: "#ffffff",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
                gap: "8px",
              }}
            >
              <div className="sk-scratch-bone" style={{ width: "70px", height: "22px", borderRadius: "12px" }} />
              <div className="sk-scratch-bone" style={{ width: "80px", height: "22px", borderRadius: "12px" }} />
              <div className="sk-scratch-bone" style={{ width: "60px", height: "22px", borderRadius: "12px" }} />
            </div>

            {/* Corps principal : Palette + Espace de scripts + Scène */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Colonne 1 : Catégories de blocs */}
              <div
                style={{
                  width: "60px",
                  background: "#f8fafc",
                  borderRight: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "12px 0",
                  gap: "14px",
                }}
              >
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="sk-scratch-bone" style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
                ))}
              </div>

              {/* Colonne 2 : Palette de blocs */}
              <div
                style={{
                  width: "240px",
                  background: "#ffffff",
                  borderRight: "1px solid #e2e8f0",
                  padding: "16px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div className="sk-scratch-bone" style={{ width: "80px", height: "16px", marginBottom: "4px" }} />
                <div className="sk-scratch-bone" style={{ width: "190px", height: "36px", borderRadius: "18px" }} />
                <div className="sk-scratch-bone" style={{ width: "170px", height: "36px", borderRadius: "18px" }} />
                <div className="sk-scratch-bone" style={{ width: "180px", height: "36px", borderRadius: "18px" }} />
                <div className="sk-scratch-bone" style={{ width: "90px", height: "16px", margin: "8px 0 4px" }} />
                <div className="sk-scratch-bone" style={{ width: "195px", height: "36px", borderRadius: "18px" }} />
                <div className="sk-scratch-bone" style={{ width: "160px", height: "36px", borderRadius: "18px" }} />
                <div className="sk-scratch-bone" style={{ width: "185px", height: "36px", borderRadius: "18px" }} />
              </div>

              {/* Colonne 3 : Espace d'assemblage des blocs */}
              <div
                style={{
                  flex: 1,
                  background: "#f8fafc",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div className="sk-scratch-bone" style={{ width: "220px", height: "42px", borderRadius: "10px" }} />
                <div style={{ marginLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div className="sk-scratch-bone" style={{ width: "180px", height: "36px", borderRadius: "10px" }} />
                  <div className="sk-scratch-bone" style={{ width: "200px", height: "36px", borderRadius: "10px" }} />
                  <div className="sk-scratch-bone" style={{ width: "160px", height: "36px", borderRadius: "10px" }} />
                </div>
              </div>

              {/* Colonne 4 : Scène de jeu + Liste des lutins */}
              <div
                style={{
                  width: "380px",
                  background: "#ffffff",
                  borderLeft: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  padding: "16px",
                  gap: "16px",
                }}
              >
                {/* Scène de prévisualisation */}
                <div className="sk-scratch-bone" style={{ width: "100%", height: "240px", borderRadius: "12px" }} />

                {/* Barre d'infos du lutin sélectionné */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <div className="sk-scratch-bone" style={{ flex: 1, height: "32px", borderRadius: "6px" }} />
                  <div className="sk-scratch-bone" style={{ width: "60px", height: "32px", borderRadius: "6px" }} />
                  <div className="sk-scratch-bone" style={{ width: "60px", height: "32px", borderRadius: "6px" }} />
                </div>

                {/* Grille des lutins */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  <div className="sk-scratch-bone" style={{ height: "80px", borderRadius: "8px" }} />
                  <div className="sk-scratch-bone" style={{ height: "80px", borderRadius: "8px" }} />
                  <div className="sk-scratch-bone" style={{ height: "80px", borderRadius: "8px" }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="/scratch/index.html"
          title="Éditeur officiel Scratch 3.0"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
          allow="camera; microphone; display-capture; fullscreen"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
