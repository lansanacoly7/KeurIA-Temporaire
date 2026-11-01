"use client";

import { sayUi } from "../parcours79/uiVoice";
import { Volume2, Sparkles, Trash2 } from "lucide-react";
import ModuleIcon from "../../components/ModuleIcon";
import { useDrawingGuess } from "./useDrawingGuess";
import { DrawingConfirmPhase, DrawingRetryPhase, DrawingAnalyzingPhase } from "./DrawingPhases";

export function DrawingGuessGame({
  onComplete,
}: {
  onComplete: (stars?: number, feedback?: React.ReactNode) => void;
}) {
  const s = useDrawingGuess({ onComplete });
  const { canvas, drawing, strokes, showCatalog, setShowCatalog, warningMsg, start, move, clear, analyzeDrawing } = s;


  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url('/images/bg-level-7.jpg') center/cover",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          width: "100%",
          height: "100%",
          padding: "20px 0",
        }}
      >
        {/* Mascotte Palou */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <img
            src="/images/palou/game-palou-reflexion.png"
            alt="Palou"
            style={{ width: 180, animation: "kiFloatSlow 2.5s infinite alternate" }}
          />
          <button
            style={{
              padding: "8px 20px",
              background: "#FFF",
              border: "3px solid #10B981",
              borderRadius: 999,
              color: "#0E4B3C",
              fontWeight: 800,
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 0 #059669",
            }}
            onClick={() => {
              void sayUi("jeu-dessin-debut", { force: true });
            }}
            aria-label="Écouter les consignes de Palou"
          >
            <Volume2 size={18} /> Écouter Palou
          </button>
        </div>

        {/* Zone de dessin */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, maxWidth: 1000 }}>
          <div
            style={{
              position: "relative",
              background: "#FFF",
              borderRadius: 24,
              padding: "16px 24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: -20,
                top: "50%",
                transform: "translateY(-50%)",
                width: 0,
                height: 0,
                borderTop: "20px solid transparent",
                borderBottom: "20px solid transparent",
                borderRight: "20px solid #FFF",
              }}
            />
            <h2
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 900,
                color: "#144C3A",
                lineHeight: 1.3,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>Dessine ce que tu veux sur cette partie !</span>
              <span className="stroke-counter" style={{ fontSize: 18, color: "#9CA3AF", fontWeight: 600 }}>
                (Traits : {strokes})
              </span>
            </h2>
          </div>

          {warningMsg && (
            <div
              style={{
                background: "#FEF3C7",
                color: "#92400E",
                padding: "12px 20px",
                borderRadius: 16,
                border: "2px solid #F59E0B",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {warningMsg}
            </div>
          )}

          <div
            className="draw-layout"
            style={{
              display: "flex",
              gap: 30,
              justifyContent: "center",
              alignItems: "stretch",
              marginBottom: 10,
              minHeight: 380,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", width: 500, minWidth: "min(500px, 100%)" }}>
              <div
                style={{
                  flex: 1,
                  width: "100%",
                  background: "#FFF",
                  borderRadius: 24,
                  border: "4px solid #E4DEC6",
                  padding: 10,
                  display: "inline-block",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <canvas
                  ref={canvas}
                  width={480}
                  height={360}
                  onPointerDown={start}
                  onPointerMove={move}
                  onPointerUp={() => (drawing.current = false)}
                  onPointerLeave={() => (drawing.current = false)}
                  style={{
                    cursor: "crosshair",
                    borderRadius: 16,
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>

            <div
              className="draw-actions"
              style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, minWidth: "min(300px, 100%)" }}
            >
              <button
                onClick={clear}
                style={{
                  padding: "16px 24px",
                  fontSize: 20,
                  fontWeight: 700,
                  borderRadius: 16,
                  background: "#FFF",
                  color: "#0E3A2E",
                  border: "3px solid #E4DEC6",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                aria-label="Effacer le dessin"
              >
                <Trash2 size={20} /> Effacer
              </button>
              <button
                onClick={analyzeDrawing}
                disabled={strokes < 2}
                style={{
                  padding: "18px 36px",
                  fontSize: 22,
                  fontWeight: 900,
                  borderRadius: 20,
                  background: "#C8F24D",
                  color: "#0E3A2E",
                  border: "none",
                  cursor: strokes < 2 ? "not-allowed" : "pointer",
                  opacity: strokes < 2 ? 0.5 : 1,
                  boxShadow: strokes >= 2 ? "0 6px 0 #9DC237" : "none",
                  transition: "all 0.2s",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                aria-label="Demander à Palou de deviner"
              >
                <Sparkles size={22} /> Palou, devine !
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CATALOGUE INITIAL */}
      {showCatalog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10020,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: "20px",
            background: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
            animation: "gmPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "#FFF",
              border: "4px solid #10B981",
              borderRadius: 36,
              padding: "24px 32px",
              maxWidth: 840,
              width: "100%",
              boxSizing: "border-box",
              boxShadow: "0 20px 50px rgba(16,185,129,0.2)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, textAlign: "left", width: "100%" }}>
              <img
                src="/images/palou/game-palou-joie.png"
                alt="Palou est prêt"
                style={{ width: 100, animation: "kiFloatSlow 2s infinite alternate", flexShrink: 0 }}
              />
              <div>
                <span
                  style={{
                    fontSize: 13,
                    color: "#047857",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    display: "block",
                  }}
                >
                  Galerie de la vision IA
                </span>
                <h2 style={{ fontSize: 26, color: "#064E3B", margin: "2px 0 6px", fontWeight: 900 }}>
                  Voici ce que Palou sait deviner !
                </h2>
                <p style={{ margin: 0, fontSize: 15, color: "#065F46", fontWeight: 700, lineHeight: 1.3 }}>
                  Mon algorithme a appris à reconnaître ces 14 objets. Regarde-les bien, choisis-en un dans ta tête,
                  puis dessine-le sur la page suivante !
                </p>
              </div>
            </div>

            <div
              style={{
                width: "100%",
                background: "#F0FDF4",
                border: "2px solid #A7F3D0",
                borderRadius: 20,
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
                {[
                  { name: "Arbre", icon: "tree" },
                  { name: "Fleur", icon: "flower" },
                  { name: "Maison", icon: "home" },
                  { name: "Bateau", icon: "boat" },
                  { name: "Poisson", icon: "fish" },
                  { name: "Voiture", icon: "car" },
                  { name: "Fusée", icon: "rocket" },
                  { name: "Chat", icon: "cat" },
                  { name: "Bonhomme", icon: "user" },
                  { name: "Couronne", icon: "crown" },
                  { name: "Parapluie", icon: "umbrella" },
                  { name: "Nuage", icon: "cloud" },
                  { name: "Soleil", icon: "sun" },
                  { name: "Ballon", icon: "ball" },
                ].map((item) => (
                  <div
                    key={item.name}
                    style={{
                      background: "#FFF",
                      border: "2px solid #D1FAE5",
                      borderRadius: 14,
                      padding: "8px 4px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div style={{ marginBottom: 4, color: "#10B981" }}>
                      <ModuleIcon name={item.icon} size={24} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#065F46" }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                paddingTop: 4,
              }}
            >
              <button
                onClick={() => {
                  void sayUi("jeu-dessin-modele", { force: true });
                }}
                style={{
                  padding: "12px 20px",
                  background: "#FFF",
                  border: "3px solid #10B981",
                  borderRadius: 18,
                  color: "#0E4B3C",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 4px 0 #059669",
                }}
                aria-label="Écouter les consignes de la galerie"
              >
                <Volume2 size={18} /> Écouter Palou
              </button>

              <button
                onClick={() => setShowCatalog(false)}
                style={{
                  padding: "14px 36px",
                  fontSize: 20,
                  fontWeight: 900,
                  background: "#10B981",
                  color: "#FFF",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 6px 0 #059669, 0 10px 20px rgba(16,185,129,0.3)",
                  transition: "transform 0.1s",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(5px)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                aria-label="Commencer à dessiner"
              >
                J&apos;ai compris, à moi de dessiner ! →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANALYSE EN COURS */}
      
      <DrawingAnalyzingPhase s={s} />

      {/* CONFIRMATION DE PALOU */}
      
      <DrawingConfirmPhase s={s} />

      {/* APPRENTISSAGE EN CAS D'ERREUR */}
      
      <DrawingRetryPhase s={s} />
    </>
  );
}
