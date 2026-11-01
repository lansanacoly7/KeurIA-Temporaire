"use client";

import { useState } from "react";
import { Brain, Circle, Triangle, Star, MessageSquare, Bot } from "lucide-react";
import { playFeedbackSound } from "./sound";

export function TrainYourModelGame({ onComplete }: { onComplete: (stars?: number) => void }) {
  const [counts, setCounts] = useState([0, 0, 0]);
  const [tested, setTested] = useState(false);
  const labels = ["Rond", "Triangle", "Étoile"];
  const total = counts.reduce((a, b) => a + b, 0);
  const accuracy = Math.min(96, 30 + total * 5);

  const add = (i: number) => {
    if (counts[i] < 5) {
      setCounts((c) => c.map((v, n) => (n === i ? v + 1 : v)));
      playFeedbackSound(true);
    }
  };

  const test = () => {
    setTested(true);
    playFeedbackSound(true);
    setTimeout(() => onComplete(3), 1500);
  };

  return (
    <div
      className="real-stage train-model"
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
        <Brain size={36} />
        Mon premier modèle
      </h3>
      <div
        className="stage-help"
        style={{ fontSize: 18, color: "#6C7A63", marginBottom: 30, fontWeight: 600 }}
      >
        Entraîne l'IA en ajoutant des exemples dans chaque catégorie.
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
        <div
          className="model-categories"
          style={{
            display: "flex",
            gap: 20,
            marginBottom: 40,
            width: "100%",
            justifyContent: "center",
          }}
        >
          {labels.map((x, i) => (
            <article
              key={x}
              style={{
                background: "#FFF",
                borderRadius: 24,
                padding: "30px",
                border: "4px solid #E4DEC6",
                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <b style={{ fontSize: 24, color: "#0E3A2E", marginBottom: 15 }}>{x}</b>
              <div
                style={{
                  height: 60,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 15,
                }}
              >
                {i === 0 && <Circle size={52} fill="#EF4444" color="#EF4444" />}
                {i === 1 && <Triangle size={52} fill="#3B82F6" color="#3B82F6" />}
                {i === 2 && <Star size={52} fill="#F59E0B" color="#F59E0B" />}
              </div>
              <small
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#64748B",
                  marginBottom: 20,
                }}
              >
                {counts[i]}/5 exemples
              </small>
              <button
                disabled={counts[i] >= 5}
                onClick={() => add(i)}
                style={{
                  padding: "12px 24px",
                  fontSize: 18,
                  fontWeight: 700,
                  borderRadius: 16,
                  background: counts[i] >= 5 ? "#F1F5F9" : "#C8F24D",
                  color: counts[i] >= 5 ? "#94A3B8" : "#0E3A2E",
                  border: "none",
                  cursor: counts[i] >= 5 ? "default" : "pointer",
                  transition: "all 0.2s",
                  boxShadow: counts[i] >= 5 ? "none" : "0 4px 0 #9DC237",
                }}
              >
                {counts[i] >= 5 ? "Max atteint" : "Ajouter +"}
              </button>
            </article>
          ))}
        </div>

        <div
          className="model-accuracy"
          style={{
            width: "100%",
            maxWidth: 600,
            background: "#F1F5F9",
            borderRadius: 20,
            height: 40,
            position: "relative",
            marginBottom: 40,
            overflow: "hidden",
            border: "4px solid #E2E8F0",
          }}
        >
          <div
            style={{
              width: `${accuracy}%`,
              height: "100%",
              background: "linear-gradient(90deg, #3B82F6, #60A5FA)",
              transition: "width 0.3s ease-out",
            }}
          />
          <b
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accuracy > 50 ? "#FFF" : "#475569",
              fontSize: 18,
              textShadow: accuracy > 50 ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
            }}
          >
            Fiabilité estimée : {accuracy}%
          </b>
        </div>

        <button
          className="mission-next"
          disabled={counts.some((x) => x < 3) || tested}
          onClick={test}
          style={{
            padding: "18px 40px",
            fontSize: 22,
            fontWeight: 800,
            background: counts.some((x) => x < 3) || tested ? "#E2E8F0" : "#0E4B3C",
            color: counts.some((x) => x < 3) || tested ? "#94A3B8" : "#FFF",
            borderRadius: 20,
            border: "none",
            cursor: counts.some((x) => x < 3) || tested ? "not-allowed" : "pointer",
            boxShadow: counts.some((x) => x < 3) || tested ? "none" : "0 6px 0 #062B22",
            transition: "all 0.2s",
          }}
        >
          {tested
            ? "Modèle validé"
            : counts.some((x) => x < 3)
            ? "Ajoute au moins 3 exemples partout"
            : "Tester le modèle →"}
        </button>

        {tested && (
          <div
            className="stage-result"
            style={{
              marginTop: 20,
              fontSize: 18,
              color: "#065F46",
              fontWeight: 700,
              animation: "kiPop 0.3s",
            }}
          >
            Des catégories équilibrées améliorent la fiabilité.
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatbotBuilderGame({ onComplete }: { onComplete: (stars?: number) => void }) {
  const [rules, setRules] = useState<Record<string, string>>({});
  const [reply, setReply] = useState("Programme mes réponses.");
  const options = {
    bonjour: "Bonjour ! Comment puis-je t'aider ?",
    devoir: "Je peux donner un indice, pas faire le devoir.",
    secret: "Ne partage jamais une donnée privée.",
  };
  const ready = Object.keys(rules).length === 3;
  const ask = (key: string) => {
    setReply(rules[key] || "Je ne comprends pas encore cette phrase.");
    playFeedbackSound(Boolean(rules[key]));
    if (ready) setTimeout(() => onComplete(3), 2000);
  };

  return (
    <div
      className="real-stage chatbot-game"
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
        <MessageSquare size={36} />
        Fabrique ton chatbot
      </h3>
      <div
        className="stage-help"
        style={{ fontSize: 18, color: "#6C7A63", marginBottom: 30, fontWeight: 600 }}
      >
        Programme les trois règles, puis teste le chatbot.
      </div>

      <div
        style={{
          display: "flex",
          gap: 30,
          width: "100%",
          maxWidth: 1000,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <div
          className="chatbot-builder"
          style={{ flex: 1, minWidth: "min(350px, 100%)", display: "flex", flexDirection: "column", gap: 15 }}
        >
          {Object.entries(options).map(([k, v]) => (
            <button
              className={rules[k] ? "done" : ""}
              key={k}
              onClick={() => {
                setRules((r) => ({ ...r, [k]: v }));
                playFeedbackSound(true);
              }}
              style={{
                padding: "20px",
                borderRadius: 20,
                background: rules[k] ? "#D1FAE5" : "#FFF",
                border: `4px solid ${rules[k] ? "#10B981" : "#E4DEC6"}`,
                textAlign: "left",
                cursor: rules[k] ? "default" : "pointer",
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                transform: rules[k] ? "scale(0.98)" : "scale(1)",
              }}
            >
              <b style={{ display: "block", fontSize: 20, color: "#0E3A2E", marginBottom: 8 }}>
                SI « {k} »
              </b>
              <span style={{ fontSize: 16, color: "#475569" }}>ALORS {v}</span>
            </button>
          ))}
        </div>

        <div
          className="chat-window"
          style={{
            flex: 1,
            minWidth: "min(350px, 100%)",
            background: "#F1F5F9",
            borderRadius: 24,
            padding: "30px",
            border: "4px solid #CBD5E1",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="bot-reply"
            style={{
              background: "#FFF",
              padding: "20px",
              borderRadius: "20px 20px 20px 0",
              fontSize: 20,
              fontWeight: 600,
              color: "#0E3A2E",
              marginBottom: 30,
              boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
              alignSelf: "flex-start",
              animation: "kiPop 0.3s",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Bot size={22} /> Palou : {reply}
          </div>

          <div style={{ marginTop: "auto" }}>
            <p style={{ fontSize: 14, color: "#64748B", marginBottom: 15, fontWeight: 600 }}>
              Teste ces mots :
            </p>
            <div className="chat-tests" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["bonjour", "devoir", "secret", "météo"].map((k) => (
                <button
                  key={k}
                  onClick={() => ask(k)}
                  style={{
                    padding: "12px 20px",
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 12,
                    background: "#0E4B3C",
                    color: "#FFF",
                    border: "none",
                    cursor: "pointer",
                    transition: "transform 0.1s",
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  Dire « {k} »
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {ready && (
        <p
          className="camera-status"
          style={{
            marginTop: 30,
            fontSize: 18,
            color: "#D97706",
            fontWeight: 700,
            background: "#FEF3C7",
            padding: "10px 20px",
            borderRadius: 16,
          }}
        >
          Remarque : Un chatbot à règles ne comprend que les mots exacts programmés.
        </p>
      )}
    </div>
  );
}
