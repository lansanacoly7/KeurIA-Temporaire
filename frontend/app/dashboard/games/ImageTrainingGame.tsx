"use client";

import { sayUi } from "../parcours79/uiVoice";
import { useEffect, useState } from "react";
import { Hand, Volume2 } from "lucide-react";
import { playFeedbackSound } from "./sound";

export function ImageTrainingGame({
  onComplete,
}: {
  onComplete: (stars?: number, feedback?: React.ReactNode) => void;
}) {
  const data = [
    { v: "/images/games/chien-vrai-1.jpg", c: "Chien", n: "Chien" },
    { v: "/images/games/chien-vrai-2.jpg", c: "Chien", n: "Chien mignon" },
    { v: "/images/games/chat-vrai-1.jpg", c: "Chat", n: "Chat tigré" },
    { v: "/images/games/robot-vrai-1.jpg", c: "Robot", n: "Robot bleu" },
    { v: "/images/games/chat-vrai-2.jpg", c: "Chat", n: "Autre chat" },
    { v: "/images/games/robot-vrai-2.jpg", c: "Robot", n: "Robot orange" },
    { v: "/images/games/oiseau-vrai-1.jpg", c: "Oiseau", n: "Oiseau rose" },
    { v: "/images/games/oiseau-vrai-2.jpg", c: "Oiseau", n: "Perroquet vert" },
  ];

  const catIcons: Record<string, string> = {
    Chien: "/images/games/famille_chien.jpg",
    Chat: "/images/games/famille_chat.jpg",
    Oiseau: "/images/games/famille_oiseau.jpg",
    Robot: "/images/games/famille_robot.jpg",
  };

  const [items, setItems] = useState(data);
  const [selected, setSelected] = useState<number | null>(null);
  const [shake, setShake] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("levelProgress", { detail: (8 - items.length) / 8 }));
  }, [items.length]);

  const sort = (cat: string, index = selected) => {
    if (index === null || index < 0) return;
    const ok = items[index].c === cat;
    playFeedbackSound(ok);
    if (ok) {
      const next = items.filter((_, i) => i !== index);
      setItems(next);
      setSelected(null);
      if (!next.length) {
        const stars = mistakes === 0 ? 3 : mistakes < 3 ? 2 : 1;
        onComplete(stars, mistakes > 0 ? "Fais bien attention à la famille de chaque image !" : undefined);
      }
    } else {
      setShake(index);
      setMistakes((m) => m + 1);
      setTimeout(() => setShake(null), 450);
    }
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url('/images/games/niveau3_bg.jpg') center/cover",
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
          padding: "10px",
        }}
      >
        {/* Mascotte Palou */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 320 }}>
          <div
            style={{
              position: "relative",
              background: "#FFF",
              borderRadius: 24,
              padding: "16px 24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
              width: "100%",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: -20,
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "20px solid transparent",
                borderRight: "20px solid transparent",
                borderTop: "20px solid #FFF",
              }}
            />
            <h3
              style={{
                fontSize: 22,
                color: "#144C3A",
                margin: 0,
                lineHeight: 1.3,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Hand size={20} /> Trie les images par famille !
            </h3>
          </div>
          <img
            src="/images/palou/game-palou-reflexion.png"
            alt="Palou"
            style={{ width: 160, animation: "kiFloatSlow 2.5s infinite alternate" }}
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
              void sayUi("jeu-trier-images", { force: true });
            }}
            aria-label="Écouter les consignes de Palou"
          >
            <Volume2 size={18} /> Écouter Palou
          </button>
        </div>

        {/* Zone de contenu et paniers */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 15,
            maxWidth: 1000,
            overflow: "visible",
          }}
        >
          <div
            className="training-items"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 15,
              flexWrap: "wrap",
              minHeight: 140,
              alignItems: "center",
              width: "100%",
              padding: "10px 0",
            }}
          >
            {items.map((x, i) => (
              <button
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
                className={`${selected === i && shake !== i ? "selected" : ""}${shake === i ? " shake" : ""}`}
                style={{
                  padding: 10,
                  borderRadius: 24,
                  backgroundColor: "#FFF",
                  border: "4px solid #E4DEC6",
                  cursor: "grab",
                  transition: "all 0.2s",
                  boxShadow:
                    selected === i && shake !== i
                      ? "0 0 0 4px #C8F24D"
                      : "0 8px 16px rgba(0,0,0,0.1)",
                  transform: selected === i ? "scale(1.1)" : "scale(1)",
                  minWidth: 130,
                  height: 130,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  ...(shake === i
                    ? {
                        border: "4px solid #ef4444",
                        backgroundColor: "#fee2e2",
                        boxShadow: "0 0 20px rgba(239, 68, 68, 0.5)",
                      }
                    : {}),
                }}
                key={`${x.n}-${i}`}
                onClick={() => setSelected(i)}
                aria-label={`Sélectionner l'image ${x.n}`}
              >
                <img
                  src={x.v}
                  alt={x.n}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }}
                />
              </button>
            ))}
          </div>

          <div
            className="training-bins"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 20,
              flexWrap: "wrap",
              flexShrink: 0,
              width: "100%",
              padding: "10px 0",
            }}
          >
            {["Chien", "Chat", "Oiseau", "Robot"].map((cat) => (
              <button
                key={cat}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => sort(cat, Number(e.dataTransfer.getData("text/plain")))}
                onClick={() => sort(cat)}
                style={{
                  padding: "20px",
                  fontSize: 22,
                  fontWeight: 700,
                  borderRadius: 24,
                  border: "4px dashed #0E4B3C",
                  background: "#FBFAF3",
                  color: "#0E3A2E",
                  minWidth: 160,
                  flexShrink: 0,
                  transition: "all 0.2s",
                  cursor: selected !== null ? "pointer" : "default",
                  opacity: selected !== null ? 1 : 0.7,
                }}
                onMouseEnter={(e) => {
                  if (selected !== null) {
                    e.currentTarget.style.background = "#D1FAE5";
                    e.currentTarget.style.borderStyle = "solid";
                    e.currentTarget.style.borderColor = "#10B981";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#FBFAF3";
                  e.currentTarget.style.borderStyle = "dashed";
                  e.currentTarget.style.borderColor = "#0E4B3C";
                }}
                aria-label={`Placer dans la catégorie ${cat}`}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    margin: "0 auto 10px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2px solid #0E4B3C",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <img
                    src={catIcons[cat]}
                    alt={cat}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
