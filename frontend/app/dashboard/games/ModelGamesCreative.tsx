"use client";

import { useState } from "react";
import { Lock, Unlock, DoorOpen, Gamepad2, Lightbulb, Sparkles } from "lucide-react";
import { playFeedbackSound } from "./sound";

export function EscapeAIGame({ onComplete }: { onComplete: (stars?: number) => void }) {
  const rooms = [
    { q: "Une photo secrète débloque la porte. Que faire ?", a: ["L'envoyer", "Choisir une donnée non privée"], c: 1 },
    { q: "Quelle preuve ouvre la deuxième porte ?", a: ["Une source officielle datée", "La réponse de l'IA seule"], c: 0 },
    { q: "Quel prompt ouvre la sortie ?", a: ["Aide-moi", "Explique en 4 étapes comment vérifier une image, pour un élève de 14 ans"], c: 1 },
  ];
  const [room, setRoom] = useState(0);
  const [message, setMessage] = useState("Trouve la bonne clé.");
  const [done, setDone] = useState(false);

  const choose = (i: number) => {
    if (done) return;
    if (i !== rooms[room].c) {
      setMessage("Mauvaise clé. Analyse puis réessaie.");
      playFeedbackSound(false);
      return;
    }
    playFeedbackSound(true);
    if (room === 2) {
      setDone(true);
      setMessage("Toutes les portes sont ouvertes !");
      setTimeout(() => onComplete(3), 1500);
    } else {
      setRoom((r) => r + 1);
      setMessage("Porte ouverte !");
    }
  };

  return (
    <div
      className="real-stage escape-game"
      style={{
        textAlign: "center",
        padding: "10px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
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
          gap: 12,
        }}
      >
        <Lock size={36} />
        Escape game IA
      </h3>
      <div
        className="stage-help"
        style={{ fontSize: 18, color: "#6C7A63", marginBottom: 30, fontWeight: 600 }}
      >
        Trois salles, une sortie responsable.
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 800,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div className="escape-map" style={{ display: "flex", gap: 20, marginBottom: 40 }}>
          {rooms.map((_, i) => (
            <span
              className={i < room ? "open" : i === room ? "current" : ""}
              key={i}
              style={{
                padding: "12px 24px",
                fontSize: 18,
                fontWeight: 800,
                borderRadius: 20,
                background: i < room ? "#10B981" : i === room ? "#F59E0B" : "#E2E8F0",
                color: i < room ? "#FFF" : i === room ? "#FFF" : "#94A3B8",
                transition: "all 0.3s",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {i < room ? <Unlock size={18} /> : i === room ? <Lock size={18} /> : <DoorOpen size={18} />}{" "}
              Salle {i + 1}
            </span>
          ))}
        </div>

        <div
          style={{
            background: "#FFF",
            borderRadius: 24,
            padding: "40px",
            border: "4px solid #E4DEC6",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            marginBottom: 30,
            width: "100%",
          }}
        >
          <h3 style={{ fontSize: 28, color: "#0E3A2E", margin: "0 0 30px" }}>
            {rooms[Math.min(room, 2)].q}
          </h3>
          <div className="mission-choices" style={{ display: "flex", gap: 20, flexDirection: "column" }}>
            {rooms[Math.min(room, 2)].a.map((a, i) => (
              <button
                disabled={done}
                key={a}
                onClick={() => choose(i)}
                style={{
                  padding: "20px 30px",
                  fontSize: 22,
                  fontWeight: 700,
                  borderRadius: 16,
                  background: "#FBFAF3",
                  border: "4px solid #C8F24D",
                  color: "#0E3A2E",
                  cursor: done ? "default" : "pointer",
                  transition: "transform 0.1s, box-shadow 0.1s",
                }}
                onMouseDown={(e) => !done && (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseUp={(e) => !done && (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => !done && (e.currentTarget.style.transform = "scale(1)")}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <p
          className="camera-status"
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: done ? "#10B981" : message.includes("Mauvaise") ? "#EF4444" : "#0E3A2E",
            animation: "kiPop 0.3s",
            background: done ? "#D1FAE5" : message.includes("Mauvaise") ? "#FEE2E2" : "#F1F5F9",
            padding: "15px 30px",
            borderRadius: 20,
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}

export function CreativeStudioGame({ onComplete }: { onComplete: (stars?: number) => void }) {
  const [choices, setChoices] = useState<string[]>([]);
  const steps = [
    { title: "Problème local", items: ["Déchets", "Transport", "Apprentissage"] },
    { title: "Mécanique", items: ["Classification", "Prédiction", "Chatbot"] },
    { title: "Protection", items: ["Données anonymes", "Validation humaine", "Test d'équité"] },
  ];
  const pick = (i: number, v: string) => {
    playFeedbackSound(true);
    setChoices((c) => {
      const n = [...c];
      n[i] = v;
      return n;
    });
  };
  const ready = choices.filter(Boolean).length === 3;

  return (
    <div
      className="real-stage creative-studio"
      style={{
        textAlign: "center",
        padding: "10px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
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
          gap: 12,
        }}
      >
        <Gamepad2 size={36} />
        Studio mini-jeu IA
      </h3>
      <div
        className="stage-help"
        style={{ fontSize: 18, color: "#6C7A63", marginBottom: 30, fontWeight: 600 }}
      >
        Assemble trois briques pour concevoir ton application.
      </div>

      <div
        className="studio-steps"
        style={{
          display: "flex",
          gap: 20,
          width: "100%",
          maxWidth: 1000,
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: 30,
        }}
      >
        {steps.map((s, i) => (
          <article
            key={s.title}
            style={{
              flex: 1,
              minWidth: 250,
              background: "#FFF",
              borderRadius: 24,
              padding: "20px",
              border: "4px solid #E4DEC6",
              boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
            }}
          >
            <b
              style={{
                display: "block",
                fontSize: 20,
                color: "#0E3A2E",
                marginBottom: 15,
                background: "#F1F5F9",
                padding: "8px",
                borderRadius: 12,
              }}
            >
              {i + 1}. {s.title}
            </b>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {s.items.map((x) => (
                <button
                  className={choices[i] === x ? "selected" : ""}
                  key={x}
                  onClick={() => pick(i, x)}
                  style={{
                    padding: "12px",
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 12,
                    background: choices[i] === x ? "#0E4B3C" : "#F8FAFC",
                    color: choices[i] === x ? "#FFF" : "#334155",
                    border: choices[i] === x ? "none" : "2px solid #CBD5E1",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {x}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      {ready && (
        <div
          className="project-pitch"
          style={{
            background: "#D1FAE5",
            borderRadius: 24,
            padding: "30px",
            border: "4px solid #10B981",
            maxWidth: 800,
            width: "100%",
            animation: "kiPop 0.4s",
          }}
        >
          <b
            style={{
              fontSize: 24,
              color: "#065F46",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 15,
            }}
          >
            <Lightbulb size={24} /> Notre idée
          </b>
          <p style={{ fontSize: 20, color: "#047857", marginBottom: 25, lineHeight: 1.5 }}>
            Créer une solution de{" "}
            <strong
              style={{
                color: "#0E4B3C",
                background: "#A7F3D0",
                padding: "2px 8px",
                borderRadius: 8,
              }}
            >
              {choices[1]}
            </strong>{" "}
            pour améliorer{" "}
            <strong
              style={{
                color: "#0E4B3C",
                background: "#A7F3D0",
                padding: "2px 8px",
                borderRadius: 8,
              }}
            >
              {choices[0]}
            </strong>
            , avec{" "}
            <strong
              style={{
                color: "#0E4B3C",
                background: "#A7F3D0",
                padding: "2px 8px",
                borderRadius: 8,
              }}
            >
              {choices[2]}
            </strong>
            .
          </p>
          <button
            onClick={() => {
              playFeedbackSound(true);
              setTimeout(() => onComplete(3), 1500);
            }}
            style={{
              padding: "16px 40px",
              fontSize: 22,
              fontWeight: 800,
              background: "#0E4B3C",
              color: "#FFF",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 6px 0 #062B22",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Sparkles size={20} /> Valider le concept
          </button>
        </div>
      )}
    </div>
  );
}
