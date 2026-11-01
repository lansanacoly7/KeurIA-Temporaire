"use client";

import { Check, RotateCcw } from "lucide-react";
import ModuleIcon from "../../components/ModuleIcon";
import { Pencil, Search, Lightbulb } from "lucide-react";
import type { useDrawingGuess } from "./useDrawingGuess";

type HookState = ReturnType<typeof useDrawingGuess>;

export function DrawingConfirmPhase({ s }: { s: HookState }) {
  const { phase, palouGuess, handleChildResponse } = s;
  return (
    <>
      {phase === "confirming" && (
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
            padding: "24px 20px",
            background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
            animation: "gmPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "#FFF",
              border: "4px solid #10B981",
              borderRadius: 36,
              padding: "32px 40px",
              maxWidth: 780,
              width: "100%",
              boxSizing: "border-box",
              boxShadow: "0 20px 50px rgba(16,185,129,0.2)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <img
              src="/images/palou/game-palou-surprise.png"
              alt="Palou a deviné"
              style={{
                width: 140,
                display: "block",
                animation: "kiPop 0.5s",
                filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.1))",
              }}
            />
            <div>
              <span
                style={{
                  fontSize: 15,
                  color: "#047857",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Résultat de la vision IA
              </span>
              <h2
                style={{
                  fontSize: 32,
                  color: "#064E3B",
                  margin: 0,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                Je pense que tu as dessiné {palouGuess.name} <ModuleIcon name={palouGuess.icon} size={32} /> !
              </h2>
            </div>

            <div
              style={{
                background: "#F3F4F6",
                border: "2px solid #E5E7EB",
                borderRadius: 20,
                padding: "16px 24px",
                color: "#065F46",
                fontSize: 20,
                lineHeight: 1.4,
                fontWeight: 700,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {palouGuess.explanation}
            </div>

            <div style={{ width: "100%", paddingTop: 8 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 22, color: "#064E3B", fontWeight: 900 }}>
                Est-ce que Palou a bien deviné ?
              </h3>
              <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => handleChildResponse(true)}
                  style={{
                    padding: "16px 36px",
                    fontSize: 22,
                    fontWeight: 900,
                    background: "#10B981",
                    color: "#FFF",
                    borderRadius: 20,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 6px 0 #059669, 0 10px 20px rgba(16,185,129,0.25)",
                    transition: "transform 0.1s",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(6px)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                  aria-label="Confirmer que Palou a bien deviné"
                >
                  <Check size={22} /> Oui, bravo Palou !
                </button>
                <button
                  onClick={() => handleChildResponse(false)}
                  style={{
                    padding: "16px 36px",
                    fontSize: 22,
                    fontWeight: 900,
                    background: "#EF4444",
                    color: "#FFF",
                    borderRadius: 20,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 6px 0 #DC2626, 0 10px 20px rgba(239,68,68,0.25)",
                    transition: "transform 0.1s",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(6px)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                  aria-label="Indiquer que Palou s'est trompé"
                >
                  <RotateCcw size={22} /> Non, réessaye !
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DrawingRetryPhase({ s }: { s: HookState }) {
  const { phase, setPhase, analyzeDrawing, handleTeachPalou } = s;
  return (
    <>
      {phase === "retry" && (
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
            padding: "16px 20px",
            background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
            animation: "gmPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "#FFF",
              border: "4px solid #F59E0B",
              borderRadius: 32,
              padding: "20px 32px",
              maxWidth: 860,
              width: "100%",
              boxSizing: "border-box",
              boxShadow: "0 20px 50px rgba(245,158,11,0.2)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <img
              src="/images/palou/game-palou-reflexion.png"
              alt="Palou apprend"
              style={{
                width: 95,
                display: "block",
                animation: "kiFloatSlow 2.5s infinite alternate",
                filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.1))",
              }}
            />
            <div>
              <span
                style={{
                  fontSize: 13,
                  color: "#D97706",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  display: "block",
                  marginBottom: 2,
                }}
              >
                Apprentissage de l'IA
              </span>
              <h2 style={{ fontSize: 26, color: "#92400E", margin: 0, fontWeight: 900 }}>
                Oups ! L&apos;IA s&apos;est trompée !
              </h2>
            </div>

            <div
              style={{
                background: "#FEF3C7",
                border: "2px solid #FCD34D",
                borderRadius: 16,
                padding: "10px 18px",
                color: "#92400E",
                fontSize: 15,
                lineHeight: 1.35,
                fontWeight: 700,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              L&apos;IA ne lit pas dans tes pensées : elle analyse uniquement les formes qu&apos;elle aperçoit. Tu peux
              ajouter des détails ou apprendre directement à Palou ce que tu as dessiné !
            </div>

            <div style={{ width: "100%" }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#78350F",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Lightbulb size={16} /> Dis à Palou ce que tu as dessiné pour qu&apos;il l&apos;apprenne :
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                {[
                  { name: "une fleur", icon: "flower" },
                  { name: "un bateau", icon: "boat" },
                  { name: "un poisson", icon: "fish" },
                  { name: "une fusée", icon: "rocket" },
                  { name: "un bonhomme", icon: "user" },
                  { name: "un nuage", icon: "cloud" },
                  { name: "une couronne", icon: "crown" },
                  { name: "un papillon", icon: "sparkles" },
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={handleTeachPalou}
                    style={{
                      padding: "6px 12px",
                      fontSize: 14,
                      fontWeight: 800,
                      background: "#FFFBEB",
                      color: "#78350F",
                      border: "2px solid #FCD34D",
                      borderRadius: 10,
                      cursor: "pointer",
                      transition: "transform 0.1s",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
                    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    aria-label={`Apprendre à Palou : ${item.name}`}
                  >
                    <ModuleIcon name={item.icon} size={16} /> {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "nowrap",
                width: "100%",
                paddingTop: 2,
              }}
            >
              <button
                onClick={() => setPhase("drawing")}
                style={{
                  flex: 1,
                  maxWidth: 360,
                  padding: "12px 20px",
                  fontSize: 16,
                  fontWeight: 900,
                  background: "#10B981",
                  color: "#FFF",
                  borderRadius: 16,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 5px 0 #059669, 0 8px 15px rgba(16,185,129,0.25)",
                  transition: "transform 0.1s",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(5px)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <Pencil size={18} /> Ajouter des détails à mon dessin
              </button>
              <button
                onClick={analyzeDrawing}
                style={{
                  flex: 1,
                  maxWidth: 360,
                  padding: "12px 20px",
                  fontSize: 16,
                  fontWeight: 900,
                  background: "#F59E0B",
                  color: "#FFF",
                  borderRadius: 16,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 5px 0 #B45309, 0 8px 15px rgba(245,158,11,0.25)",
                  transition: "transform 0.1s",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(5px)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <Search size={18} /> Demander une autre idée à Palou
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DrawingAnalyzingPhase({ s }: { s: HookState }) {
  const { phase } = s;
  return (
    <>
      {phase === "analyzing" && (
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
            padding: "24px 20px",
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
              padding: "36px 44px",
              maxWidth: 750,
              width: "100%",
              boxSizing: "border-box",
              boxShadow: "0 20px 50px rgba(16,185,129,0.2)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <img
              src="/images/palou/game-palou-reflexion.png"
              alt="Palou réfléchit"
              style={{
                width: 160,
                display: "block",
                animation: "kiFloatSlow 2s infinite alternate",
                filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.1))",
              }}
            />
            <span
              style={{
                fontSize: 16,
                color: "#047857",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Vision par Ordinateur
            </span>
            <h2 style={{ fontSize: 36, color: "#064E3B", margin: 0, fontWeight: 900 }}>Analyse IA en cours...</h2>
            <div
              style={{
                background: "#D1FAE5",
                border: "2px solid #10B981",
                borderRadius: 20,
                padding: "20px 30px",
                color: "#065F46",
                fontSize: 22,
                lineHeight: 1.4,
                fontWeight: 700,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              Palou examine les pixels, les courbes et la géométrie de ton dessin !
            </div>
          </div>
        </div>
      )}
    </>
  );
}
