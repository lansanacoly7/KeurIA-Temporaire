"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, PanelRightClose, PanelRightOpen } from "lucide-react";

/*
 * Messagerie familiale (parent ↔ enfants). Le serveur (/api/famille/messages)
 * exige une session, déduit la famille du compte connecté et fixe
 * l'expéditeur : le navigateur n'envoie que le texte.
 */
type Message = {
  id: number;
  text: string;
  senderName: string;
  senderRole: "parent" | "enfant";
  mine: boolean;
  createdAt: string;
};

const REFRESH_MS = 5000;
const MAX_LENGTH = 1000;

export default function FamilyChatWidget({ viewerRole }: { viewerRole: "parent" | "enfant" }) {
  const [available, setAvailable] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number | null>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("keria_family_chat_docked");
      if (saved === "true") setIsDocked(true);
    } catch {}
  }, []);

  function toggle(open: boolean) {
    isOpenRef.current = open;
    setIsOpen(open);
    if (open) setUnread(false);
  }

  useEffect(() => {
    let active = true;

    const fetchMessages = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const after = lastIdRef.current;
        const res = await fetch(`/api/famille/messages${after ? `?after=${after}` : ""}`, { credentials: "same-origin" });
        if (!res.ok || !active) return;
        const data: { available: boolean; messages: Message[] } = await res.json();
        setAvailable(data.available);
        if (!data.messages.length) return;
        lastIdRef.current = data.messages[data.messages.length - 1].id;
        setMessages(prev => {
          const known = new Set(prev.map(m => m.id));
          return [...prev, ...data.messages.filter(m => !known.has(m.id))];
        });
        if (after && !isOpenRef.current && data.messages.some(m => !m.mine)) setUnread(true);
      } catch {
        // Réseau indisponible : nouvel essai au prochain rafraîchissement.
      }
    };

    // Onglet caché : pas de requêtes ; au retour sur l'onglet, mise à jour immédiate.
    const onVisible = () => { if (document.visibilityState === "visible") fetchMessages(); };
    fetchMessages();
    const interval = setInterval(fetchMessages, REFRESH_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/famille/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 429 ? "Trop de messages d'un coup : patiente un instant." : data.error || "Message non envoyé.");
        return;
      }
      const sent: Message = data.message;
      lastIdRef.current = Math.max(lastIdRef.current ?? 0, sent.id);
      setMessages(prev => (prev.some(m => m.id === sent.id) ? prev : [...prev, sent]));
      setInputText("");
    } catch {
      setError("Serveur injoignable. Réessaie dans un instant.");
    } finally {
      setSending(false);
    }
  };

  // Pas de famille reliée (enseignant, parent sans enfant…) : pas de messagerie.
  if (!available) return null;

  const isParent = viewerRole === "parent";
  const widgetColor = isParent ? "#8b5cf6" : "#0ea5e9"; // Violet pour parent, bleu pour enfant

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .family-chat-btn {
            bottom: calc(74px + env(safe-area-inset-bottom, 0px)) !important;
            right: 12px !important;
            width: 40px !important;
            height: 40px !important;
          }
          body:has(.p79-ar-title) .family-chat-btn {
            bottom: calc(134px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .family-chat-window {
            left: 10px !important;
            right: 10px !important;
            bottom: calc(74px + env(safe-area-inset-bottom, 0px)) !important;
            width: auto !important;
            max-width: calc(100vw - 20px) !important;
            height: min(500px, calc(100dvh - 86px)) !important;
            border-radius: 20px !important;
          }
        }
      `}} />

      {/* Bouton d'ouverture subtil & discret */}
      {!isOpen && (
        <button
          onClick={() => toggle(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label="Ouvrir la messagerie familiale"
          title={isDocked ? "Messagerie familiale (ancrée au bord)" : "Messagerie familiale"}
          className="family-chat-btn"
          style={{
            position: "fixed",
            bottom: isDocked ? 90 : 20,
            right: isDocked ? 0 : 20,
            width: isDocked ? 36 : 44,
            height: isDocked ? 38 : 44,
            borderRadius: isDocked ? "14px 0 0 14px" : "50%",
            borderRight: isDocked ? "none" : undefined,
            background: "rgba(255, 255, 255, 0.88)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: widgetColor,
            border: `1.5px solid ${isParent ? "rgba(139, 92, 246, 0.35)" : "rgba(14, 165, 233, 0.35)"}`,
            boxShadow: isDocked
              ? "-2px 4px 14px rgba(0,0,0,0.08)"
              : isHovered
                ? `0 6px 20px ${isParent ? "rgba(124, 58, 237, 0.2)" : "rgba(2, 132, 199, 0.2)"}`
                : "0 4px 14px rgba(0,0,0,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 900,
            opacity: unread || isHovered ? 1 : 0.75,
            transform: isDocked
              ? isHovered ? "translateX(0)" : "translateX(8px)"
              : isHovered ? "translateY(-2px)" : "none",
            transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <MessageCircle size={isDocked ? 18 : 20} strokeWidth={2.2} />
          {unread && (
            <div
              aria-label="Nouveau message"
              style={{
                position: "absolute",
                top: 3,
                right: isDocked ? 6 : 3,
                background: "#ef4444",
                width: 9,
                height: 9,
                borderRadius: "50%",
                border: "1.5px solid white",
                boxShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
              }}
            />
          )}
        </button>
      )}

      {/* Fenêtre de Chat */}
      {isOpen && (
        <div
          className="anim-scale-up family-chat-window"
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            width: 350,
            height: 480,
            background: "white",
            borderRadius: 22,
            boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9500,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: `linear-gradient(135deg, ${widgetColor}, ${isParent ? "#6d28d9" : "#0284c7"})`,
              color: "white",
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: "rgba(255,255,255,0.2)", padding: 7, borderRadius: 10 }}>
                <MessageCircle size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Chat Familial</h3>
                <p style={{ margin: 0, fontSize: 11, opacity: 0.88 }}>{isParent ? "Vos enfants" : "Vos parents et fratrie"}</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={() => {
                  const next = !isDocked;
                  setIsDocked(next);
                  try { localStorage.setItem("keria_family_chat_docked", next ? "true" : "false"); } catch {}
                }}
                aria-label={isDocked ? "Détacher du bord de l'écran" : "Ancrer discrètement au bord"}
                title={isDocked ? "Détacher du bord" : "Ancrer discrètement au bord"}
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "none",
                  borderRadius: 8,
                  padding: "5px 7px",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s",
                }}
              >
                {isDocked ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
              </button>
              <button
                type="button"
                onClick={() => toggle(false)}
                aria-label="Fermer la messagerie"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "none",
                  borderRadius: 8,
                  padding: "5px 7px",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s",
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, padding: 20, overflowY: "auto", background: "#f8fafc", display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", marginTop: 40 }}>
                <MessageCircle size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                <p>Aucun message. Envoyez un petit coucou !</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.mine;
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                    {!isMe && (
                      <span style={{ fontSize: 11, color: "#64748b", marginBottom: 4, marginLeft: 4 }}>
                        {msg.senderName} • {msg.senderRole === "parent" ? "Parent" : "Enfant"}
                      </span>
                    )}
                    <div
                      style={{
                        background: isMe ? widgetColor : "white",
                        color: isMe ? "white" : "#334155",
                        padding: "12px 16px",
                        borderRadius: 20,
                        borderBottomRightRadius: isMe ? 4 : 20,
                        borderBottomLeftRadius: !isMe ? 4 : 20,
                        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                        maxWidth: "85%",
                        fontSize: 14,
                        lineHeight: 1.5,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && <p role="alert" style={{ margin: 0, padding: "8px 16px", background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{error}</p>}

          {/* Input Area */}
          <form
            onSubmit={sendMessage}
            style={{ padding: "16px", background: "white", borderTop: "1px solid #e2e8f0", display: "flex", gap: 12 }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              maxLength={MAX_LENGTH}
              aria-label="Message"
              placeholder="Écrivez un message..."
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "1px solid #e2e8f0",
                borderRadius: 99,
                outline: "none",
                fontSize: 14,
                background: "#f1f5f9",
              }}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              aria-label="Envoyer"
              style={{
                background: inputText.trim() ? widgetColor : "#cbd5e1",
                color: "white",
                border: "none",
                width: 44,
                height: 44,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: inputText.trim() ? "pointer" : "not-allowed",
                transition: "0.2s",
              }}
            >
              <Send size={18} style={{ marginLeft: -2 }} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
