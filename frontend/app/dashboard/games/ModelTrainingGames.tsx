"use client";

import { useState } from "react";
import { Star, Bot, Lock, Shield, Search, Zap, Cat, PawPrint, Eye } from "lucide-react";
import { playFeedbackSound } from "./sound";

export { TrainYourModelGame, ChatbotBuilderGame } from "./ModelGamesTrain";
export { EscapeAIGame, CreativeStudioGame } from "./ModelGamesCreative";

export function DefiGame({ onComplete }: { onComplete: (stars?: number) => void }) {
  const [done, setDone] = useState(false);
  const [selections, setSelections] = useState({ power: "", companion: "", emblem: "" });

  const powers = ["Bouclier de confidentialité", "Loupe anti-fake news", "Vitesse de signalement"];
  const companions = ["Petit Robot", "Chat Volant", "Chien Gardien"];
  const emblems = ["Étoile protectrice", "Cadenas magique", "Œil vigilant"];

  const ready = selections.power && selections.companion && selections.emblem;

  const complete = () => {
    if (!ready) return;
    playFeedbackSound(true);
    setDone(true);
    setTimeout(() => onComplete(3), 2500);
  };

  return (
    <div
      className="real-stage defi-game"
      style={{
        textAlign: "center",
        padding: "20px 10px",
        maxWidth: 900,
        margin: "0 auto",
        overflow: "hidden",
      }}
    >
      <h3
        style={{
          fontSize: 32,
          color: "#0E4B3C",
          margin: "0 0 10px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <Shield size={32} /> Mon héros numérique
      </h3>
      <p style={{ fontSize: 20, color: "#0E3A2E", lineHeight: 1.4, margin: "0 0 30px 0" }}>
        Crée ton propre héros pour aider les enfants sur internet ! Choisis ses équipements :
      </p>

      {!done ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 30, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
            <div
              style={{
                background: "#F3F4F6",
                padding: 15,
                borderRadius: 20,
                border: "2px solid #E5E7EB",
                width: 250,
              }}
            >
              <h4 style={{ margin: "0 0 10px 0", color: "#374151" }}>1. Son Pouvoir</h4>
              {powers.map((p, idx) => (
                <button
                  key={p}
                  onClick={() => setSelections((s) => ({ ...s, power: p }))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "12px",
                    margin: "8px 0",
                    borderRadius: 12,
                    border: selections.power === p ? "3px solid #10B981" : "2px solid #D1D5DB",
                    background: selections.power === p ? "#D1FAE5" : "#FFF",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
                  }}
                >
                  {idx === 0 && <Shield size={18} />}
                  {idx === 1 && <Search size={18} />}
                  {idx === 2 && <Zap size={18} />}
                  <span>{p}</span>
                </button>
              ))}
            </div>

            <div
              style={{
                background: "#F3F4F6",
                padding: 15,
                borderRadius: 20,
                border: "2px solid #E5E7EB",
                width: 250,
              }}
            >
              <h4 style={{ margin: "0 0 10px 0", color: "#374151" }}>2. Son Compagnon</h4>
              {companions.map((c, idx) => (
                <button
                  key={c}
                  onClick={() => setSelections((s) => ({ ...s, companion: c }))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "12px",
                    margin: "8px 0",
                    borderRadius: 12,
                    border: selections.companion === c ? "3px solid #10B981" : "2px solid #D1D5DB",
                    background: selections.companion === c ? "#D1FAE5" : "#FFF",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
                  }}
                >
                  {idx === 0 && <Bot size={18} />}
                  {idx === 1 && <Cat size={18} />}
                  {idx === 2 && <PawPrint size={18} />}
                  <span>{c}</span>
                </button>
              ))}
            </div>

            <div
              style={{
                background: "#F3F4F6",
                padding: 15,
                borderRadius: 20,
                border: "2px solid #E5E7EB",
                width: 250,
              }}
            >
              <h4 style={{ margin: "0 0 10px 0", color: "#374151" }}>3. Son Emblème</h4>
              {emblems.map((e, idx) => (
                <button
                  key={e}
                  onClick={() => setSelections((s) => ({ ...s, emblem: e }))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "12px",
                    margin: "8px 0",
                    borderRadius: 12,
                    border: selections.emblem === e ? "3px solid #10B981" : "2px solid #D1D5DB",
                    background: selections.emblem === e ? "#D1FAE5" : "#FFF",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
                  }}
                >
                  {idx === 0 && <Star size={18} />}
                  {idx === 1 && <Lock size={18} />}
                  {idx === 2 && <Eye size={18} />}
                  <span>{e}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={complete}
            disabled={!ready}
            style={{
              padding: "18px 40px",
              fontSize: 24,
              fontWeight: 800,
              background: !ready ? "#E5E7EB" : "#C8F24D",
              color: !ready ? "#9CA3AF" : "#0E3A2E",
              borderRadius: 20,
              border: "none",
              cursor: !ready ? "not-allowed" : "pointer",
              boxShadow: !ready ? "none" : "0 8px 0 #9DC237",
              transition: "all 0.2s",
              marginTop: 10,
            }}
          >
            Invoquer mon Héros !
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: 40,
            background: "linear-gradient(135deg, #10B981, #047857)",
            borderRadius: 32,
            color: "#FFF",
            animation: "gmPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            marginTop: 20,
            boxShadow: "0 20px 40px rgba(16,185,129,0.3)",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 220,
              height: 220,
              margin: "0 auto 30px",
              background: "radial-gradient(circle, #6EE7B7 0%, #10B981 100%)",
              borderRadius: "50%",
              border: "8px solid #FFF",
              boxShadow: "0 15px 35px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={`/images/games/heroes/hero-${powers.indexOf(selections.power)}-${companions.indexOf(
                selections.companion
              )}-${emblems.indexOf(selections.emblem)}.png`}
              alt="Mon Héros"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                zIndex: 2,
                animation: "kiFloatSlow 3s infinite alternate",
              }}
            />
          </div>

          <b style={{ fontSize: 32, display: "block", marginBottom: 15 }}>
            Héros prêt pour la mission !
          </b>
          <p style={{ fontSize: 22, opacity: 0.9, marginBottom: 30 }}>
            Ton héros va protéger internet grâce à :
          </p>
          <div
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 15,
              background: "rgba(255,255,255,0.1)",
              padding: 30,
              borderRadius: 20,
            }}
          >
            <span style={{ fontSize: 22 }}>
              <strong>Pouvoir :</strong> {selections.power}
            </span>
            <span style={{ fontSize: 22 }}>
              <strong>Ami :</strong> {selections.companion}
            </span>
            <span style={{ fontSize: 22 }}>
              <strong>Signe :</strong> {selections.emblem}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
