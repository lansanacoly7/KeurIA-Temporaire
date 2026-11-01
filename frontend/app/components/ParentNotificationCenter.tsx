"use client";

import { useState, useEffect, useRef } from "react";
import { AlertCircle, Bell, Clock, Check, X, Award, Sparkles, CheckCircle2, Flame, Trophy, BookOpen, Crown, Lightbulb, AlertTriangle, User } from "lucide-react";
import "./ParentNotificationCenter.css";

type NotificationItem = {
  id: number;
  type: string;
  category?: string;
  categoryLabel?: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  childName: string;
  childInitial?: string;
  status?: "pending" | "approved" | "declined" | null;
  extraMinutes?: number;
  xpGained?: number;
  score?: number;
  rank?: number;
  streakDays?: number;
  word?: string;
  inactiveDays?: number;
  badgeName?: string;
  badgeEmoji?: string;
  payload?: any;
};

const EMOJI_REGEX = /[\u{10000}-\u{10ffff}\u{2600}-\u{27bf}\u{2b50}\u{2b55}\u{231a}\u{231b}\u{23e9}-\u{23ec}\u{23f0}-\u{23f3}\u{25b6}\u{2705}\u{274c}\u{2714}\u{2716}\u{2728}\u{fe0e}\u{fe0f}\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu;

function stripEmojis(text?: string | null): string {
  if (!text) return "";
  return text.replace(EMOJI_REGEX, "").replace(/ +/g, " ").trim();
}

const CATEGORY_CONFIG: Record<string, {
  label: string;
  badgeBg: string;
  badgeBorder: string;
  badgeColor: string;
  iconBg: string;
  iconColor: string;
  icon: any;
}> = {
  badge: {
    label: "Nouveau badge",
    badgeBg: "#FEF3C7",
    badgeBorder: "#FDE68A",
    badgeColor: "#B45309",
    iconBg: "#FEF9C3",
    iconColor: "#CA8A04",
    icon: Award,
  },
  level: {
    label: "Nouveau palier",
    badgeBg: "#EEF2FF",
    badgeBorder: "#C7D2FE",
    badgeColor: "#4338CA",
    iconBg: "#E0E7FF",
    iconColor: "#4F46E5",
    icon: Sparkles,
  },
  module: {
    label: "Module terminé",
    badgeBg: "#ECFDF5",
    badgeBorder: "#A7F3D0",
    badgeColor: "#047857",
    iconBg: "#D1FAE5",
    iconColor: "#059669",
    icon: BookOpen,
  },
  new_title: {
    label: "Nouveau titre",
    badgeBg: "#FCE7F3",
    badgeBorder: "#FBCFE8",
    badgeColor: "#BE185D",
    iconBg: "#FDF2F8",
    iconColor: "#DB2777",
    icon: Crown,
  },
  streak: {
    label: "Série de connexion",
    badgeBg: "#FFEDD5",
    badgeBorder: "#FED7AA",
    badgeColor: "#C2410C",
    iconBg: "#FFF7ED",
    iconColor: "#EA580C",
    icon: Flame,
  },
  leaderboard: {
    label: "Top classement",
    badgeBg: "#FEF9C3",
    badgeBorder: "#FEF08A",
    badgeColor: "#A16207",
    iconBg: "#FEFCE8",
    iconColor: "#CA8A04",
    icon: Trophy,
  },
  vocab_word: {
    label: "Mot de vocabulaire",
    badgeBg: "#E0F2FE",
    badgeBorder: "#BAE6FD",
    badgeColor: "#0369A1",
    iconBg: "#F0F9FF",
    iconColor: "#0284C7",
    icon: Lightbulb,
  },
  inactivity: {
    label: "Alerte inactivité",
    badgeBg: "#FEF3C7",
    badgeBorder: "#FDE68A",
    badgeColor: "#B45309",
    iconBg: "#FFFBEB",
    iconColor: "#D97706",
    icon: AlertTriangle,
  },
  screen_time_request: {
    label: "Demande +15 min",
    badgeBg: "#F3E8FF",
    badgeBorder: "#E9D5FF",
    badgeColor: "#6B21A8",
    iconBg: "#FAF5FF",
    iconColor: "#9333EA",
    icon: Clock,
  },
};

function formatFrenchDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    if (isToday) {
      return `Aujourd'hui à ${timeStr}`;
    }
    if (isYesterday) {
      return `Hier à ${timeStr}`;
    }

    const months = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
    const day = date.getDate();
    const month = months[date.getMonth()];
    return `${day} ${month} à ${timeStr}`;
  } catch {
    return "";
  }
}

export default function ParentNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionIsError, setActionIsError] = useState(false);
  const flash = (message: string, isError: boolean, ms = 3500) => {
    setActionIsError(isError);
    setActionMessage(message);
    setTimeout(() => setActionMessage(null), ms);
  };
  const [processingId, setProcessingId] = useState<number | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Récupération des notifications
  const [loadFailed, setLoadFailed] = useState(false);
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/progress/notifications", { cache: "no-store" });
      if (!res.ok) {
        setLoadFailed(true);
        return;
      }
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setLoadFailed(false);
    } catch {
      // Le sondage réessaie toutes les 10 s : on garde la liste affichée et on signale simplement qu'elle n'est plus à jour.
      setLoadFailed(true);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fermer la popup lors d'un clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/progress/notifications", { method: "PATCH" });
      if (!res.ok) throw new Error("patch");
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {
      flash("Impossible de marquer les notifications comme lues. Réessayez.", true);
    }
  };

  const handleRespondRequest = async (notif: NotificationItem, decision: "approved" | "declined") => {
    setProcessingId(notif.id);
    try {
      const res = await fetch("/api/progress/parental-limits/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "respond_request",
          decision,
          notifId: notif.id,
          childId: notif.payload?.childId,
          extraMinutes: notif.extraMinutes || notif.payload?.extraMinutes || 15
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        flash(data.message || (decision === "approved" ? "+15 min accordées !" : "Demande déclinée."), false);

        // Synchronisation instantanée avec l'écran enfant
        try {
          localStorage.setItem("keria_parental_sync", Date.now().toString());
          if (typeof BroadcastChannel !== "undefined") {
            const bc = new BroadcastChannel("keria_parental_sync");
            bc.postMessage({ type: "limits_updated", decision });
            bc.close();
          }
        } catch { /* la synchronisation entre onglets est facultative (BroadcastChannel absent) */ }

        // Mettre à jour l'état local
        setNotifications(prev =>
          prev.map(n =>
            n.id === notif.id
              ? {
                  ...n,
                  isRead: true,
                  status: decision,
                  payload: { ...n.payload, status: decision }
                }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        flash(data.error || "La réponse n'a pas pu être enregistrée. Réessayez.", true);
      }
    } catch {
      flash("Erreur de connexion. Réessayez.", true);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ position: "relative" }} ref={popupRef}>
      {/* Bouton Cloche avec badge unread */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Centre de notifications"
        className="pnc-bell"
        type="button"
        style={{
          position: "relative",
          width: 44,
          height: 44,
          borderRadius: 14,
          border: "1px solid #E2E8F0",
          background: isOpen ? "#F1F5F9" : "white",
          color: isOpen ? "#0F766E" : "#475569",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
          transition: "all 0.2s ease",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent"
        }}
      >
        <Bell size={20} className={unreadCount > 0 ? "animate-bounce" : ""} />

        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: -4,
            right: -4,
            background: "#EF4444",
            color: "white",
            fontSize: 11,
            fontWeight: 800,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            padding: "0 5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)",
            border: "2px solid white"
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Pop-up dropdown ancrée à droite */}
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 12px)",
          right: 0,
          width: 440,
          maxWidth: "calc(100vw - 32px)",
          background: "white",
          borderRadius: 24,
          border: "1px solid #E2E8F0",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.15), 0 4px 12px rgba(15, 23, 42, 0.05)",
          zIndex: 99999,
          overflow: "hidden",
          animation: "notifPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          {/* Header de la fenêtre pop-up */}
          <div style={{
            padding: "18px 22px",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(15, 118, 110, 0.1)",
                color: "#0F766E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Bell size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0F172A" }}>
                  Centre de notifications
                </h4>
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est à jour"}
                </span>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#0F766E",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6
                }}
                onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Toast de confirmation d'action */}
          {actionMessage && (
            <div style={{
              background: actionIsError ? "#FEF2F2" : "#ECFDF5",
              borderBottom: actionIsError ? "1px solid #FECACA" : "1px solid #A7F3D0",
              color: actionIsError ? "#B91C1C" : "#065F46",
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
              animation: "fadeIn 0.2s ease-out"
            }}>
              {actionIsError ? <AlertCircle size={16} color="#B91C1C" /> : <CheckCircle2 size={16} color="#059669" />} {actionMessage}
            </div>
          )}

          {loadFailed && (
            <div role="status" style={{ background: "#FFFBEB", borderBottom: "1px solid #FDE68A", color: "#92400E", padding: "10px 18px", fontSize: 13, fontWeight: 700 }}>
              Impossible d'actualiser les notifications pour le moment. Nouvel essai automatique…
            </div>
          )}

          {/* Liste des notifications */}
          <div style={{ maxHeight: 460, overflowY: "auto", padding: "12px 14px" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#94A3B8" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Sparkles size={32} style={{ color: "#0d846e" }} /></div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#334155" }}>Aucune notification pour le moment</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Les exploits et demandes de vos enfants apparaîtront ici.</div>
              </div>
            ) : (
              notifications.map((notif) => {
                const catKey = notif.category || notif.type || "module";
                const config = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.module;
                const IconComponent = config.icon;
                const isRequest = catKey === "screen_time_request" || notif.payload?.type === "screen_time_request";
                const status = notif.status || notif.payload?.status || "pending";
                const formattedDate = formatFrenchDateTime(notif.createdAt);

                return (
                  <div
                    key={notif.id}
                    style={{
                      padding: "16px 18px",
                      borderRadius: 18,
                      marginBottom: 10,
                      background: isRequest
                        ? (status === "pending" ? "#FFFBEB" : "#F8FAFC")
                        : (notif.isRead ? "#FFFFFF" : "#F8FAFC"),
                      border: isRequest
                        ? (status === "pending" ? "1.5px solid #FDE68A" : "1px solid #E2E8F0")
                        : (notif.isRead ? "1px solid #F1F5F9" : "1.5px solid #E2E8F0"),
                      boxShadow: notif.isRead ? "none" : "0 2px 10px rgba(15, 23, 42, 0.04)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {/* 1. LIGNE SUPÉRIEURE : BADGE CATÉGORIE À GAUCHE & DATE/HEURE À DROITE */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                      {/* Badge de catégorie avec icône et couleur dédiée */}
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: config.badgeBg,
                        border: `1px solid ${config.badgeBorder}`,
                        color: config.badgeColor,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.02em"
                      }}>
                        <IconComponent size={13} />
                        <span>{config.label || stripEmojis(notif.categoryLabel)}</span>
                      </div>

                      {/* Date et Heure du message */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#94A3B8"
                      }}>
                        <Clock size={12} />
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    {/* 2. CORPS : NOM DE L'ENFANT & TITRE PRÉCIS DE L'EXPLOIT */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {/* Pastille Icône Principale */}
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: config.iconBg,
                        color: config.iconColor,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
                      }}>
                        <IconComponent size={20} className={isRequest && status === "pending" ? "animate-pulse" : ""} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Nom de l'enfant avec pastille stylée */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#0F766E",
                            background: "#F0FDFA",
                            padding: "2px 8px",
                            borderRadius: 6,
                            border: "1px solid #CCFBF1"
                          }}>
                            <User size={12} />
                            {stripEmojis(notif.childName)}
                          </span>
                        </div>

                        {/* Titre précis de l'exploit */}
                        <div style={{
                          fontSize: 14.5,
                          fontWeight: 800,
                          color: "#0F172A",
                          lineHeight: 1.35,
                          marginBottom: 4
                        }}>
                          {stripEmojis(notif.title)}
                        </div>

                        {/* Message descriptif détaillé */}
                        <p style={{
                          margin: 0,
                          fontSize: 13,
                          color: "#475569",
                          lineHeight: 1.5,
                          fontWeight: 500
                        }}>
                          {stripEmojis(notif.message)}
                        </p>

                        {/* Badges de détails / récompenses (si applicable) */}
                        {(notif.xpGained || notif.score !== undefined || notif.rank || notif.streakDays || notif.word || notif.badgeName) && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                            {notif.xpGained && (
                              <span style={{ fontSize: 11, fontWeight: 800, background: "#FEF3C7", color: "#B45309", padding: "2px 8px", borderRadius: 6, border: "1px solid #FDE68A" }}>
                                +{notif.xpGained} XP
                              </span>
                            )}
                            {notif.score !== undefined && notif.score !== null && (
                              <span style={{ fontSize: 11, fontWeight: 800, background: "#ECFDF5", color: "#047857", padding: "2px 8px", borderRadius: 6, border: "1px solid #A7F3D0" }}>
                                Score : {notif.score}%
                              </span>
                            )}
                            {notif.rank && (
                              <span style={{ fontSize: 11, fontWeight: 800, background: "#FEF9C3", color: "#A16207", padding: "2px 8px", borderRadius: 6, border: "1px solid #FEF08A", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <Trophy size={11} /> Top {notif.rank}
                              </span>
                            )}
                            {notif.streakDays && (
                              <span style={{ fontSize: 11, fontWeight: 800, background: "#FFEDD5", color: "#C2410C", padding: "2px 8px", borderRadius: 6, border: "1px solid #FED7AA", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <Flame size={11} /> {notif.streakDays} jours
                              </span>
                            )}
                            {notif.word && (
                              <span style={{ fontSize: 11, fontWeight: 800, background: "#E0F2FE", color: "#0369A1", padding: "2px 8px", borderRadius: 6, border: "1px solid #BAE6FD" }}>
                                Notion : {stripEmojis(notif.word)}
                              </span>
                            )}
                            {notif.badgeName && (
                              <span style={{ fontSize: 11, fontWeight: 800, background: "#FDF4FF", color: "#86198F", padding: "2px 8px", borderRadius: 6, border: "1px solid #F5D0FE", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <Award size={11} /> {stripEmojis(notif.badgeName)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 3. ACTIONS RAPIDES POUR DEMANDE DE TEMPS D'ÉCRAN : DÉCLINER & APPROUVER */}
                        {isRequest && (
                          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed rgba(245, 158, 11, 0.3)" }}>
                            {status === "pending" ? (
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                {/* Bouton Décliner */}
                                <button
                                  onClick={() => handleRespondRequest(notif, "declined")}
                                  disabled={processingId === notif.id}
                                  style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    borderRadius: 12,
                                    background: "#FEE2E2",
                                    color: "#DC2626",
                                    border: "1px solid #FECACA",
                                    fontSize: 13,
                                    fontWeight: 800,
                                    cursor: processingId === notif.id ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                    transition: "background 0.2s"
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = "#FCA5A5"}
                                  onMouseOut={e => e.currentTarget.style.background = "#FEE2E2"}
                                >
                                  <X size={15} /> Décliner
                                </button>

                                {/* Bouton Approuver */}
                                <button
                                  onClick={() => handleRespondRequest(notif, "approved")}
                                  disabled={processingId === notif.id}
                                  style={{
                                    flex: 1.4,
                                    padding: "8px 14px",
                                    borderRadius: 12,
                                    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                                    color: "white",
                                    border: "none",
                                    fontSize: 13,
                                    fontWeight: 800,
                                    cursor: processingId === notif.id ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                                    transition: "transform 0.15s, box-shadow 0.15s"
                                  }}
                                  onMouseOver={e => e.currentTarget.style.transform = "scale(1.02)"}
                                  onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                                >
                                  <Check size={16} strokeWidth={2.5} /> Approuver (+15 min)
                                </button>
                              </div>
                            ) : status === "approved" ? (
                              <div style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 8,
                                background: "#ECFDF5",
                                color: "#065F46",
                                fontSize: 12,
                                fontWeight: 800
                              }}>
                                <Check size={14} /> 15 minutes accordées avec succès
                              </div>
                            ) : (
                              <div style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 8,
                                background: "#F1F5F9",
                                color: "#64748B",
                                fontSize: 12,
                                fontWeight: 700
                              }}>
                                <X size={14} /> Demande déclinée
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes notifPopIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </div>
  );
}
