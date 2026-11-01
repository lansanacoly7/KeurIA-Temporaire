"use client";

import React, { useState, useEffect } from "react";

const HOVER_DELAY_MS = 4000; // 4 secondes de pause requises avant d'afficher l'explication

export default function KidTooltip() {
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
    pos: "top" | "bottom";
  } | null>(null);

  useEffect(() => {
    let hoverTimer: NodeJS.Timeout | null = null;
    let pendingTarget: HTMLElement | null = null;
    let activeTarget: HTMLElement | null = null;

    const clearPending = () => {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      pendingTarget = null;
    };

    const hideTooltip = () => {
      clearPending();
      if (activeTarget) {
        setTooltip(null);
        activeTarget = null;
      }
    };

    const updatePosition = (el: HTMLElement, text: string) => {
      const rect = el.getBoundingClientRect();
      const preferBottom = rect.top < 65;
      const targetY = preferBottom ? rect.bottom + 10 : rect.top - 10;
      const targetX = Math.max(140, Math.min(window.innerWidth - 140, rect.left + rect.width / 2));

      setTooltip({
        text,
        x: targetX,
        y: targetY,
        pos: preferBottom ? "bottom" : "top"
      });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("[data-kid-tooltip]") as HTMLElement | null;

      if (!target) {
        hideTooltip();
        return;
      }

      // Si la souris est toujours sur le même élément actif ou en attente
      if (target === pendingTarget || target === activeTarget) {
        return;
      }

      // Nouvel élément survolé : on réinitialise et on attend 4 secondes
      hideTooltip();

      const text = target.getAttribute("data-kid-tooltip");
      if (!text) return;

      pendingTarget = target;
      hoverTimer = setTimeout(() => {
        if (pendingTarget === target && document.body.contains(target)) {
          activeTarget = target;
          updatePosition(target, text);
        }
      }, HOVER_DELAY_MS);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as Node | null;

      // Si le curseur reste à l'intérieur du même élément cible, ne pas annuler
      if (pendingTarget && related && pendingTarget.contains(related)) {
        return;
      }
      if (activeTarget && related && activeTarget.contains(related)) {
        return;
      }

      hideTooltip();
    };

    const handleScroll = () => {
      // Lors du défilement, on annule l'attente ou on repositionne si déjà visible
      if (hoverTimer) {
        clearPending();
      }
      if (activeTarget) {
        const text = activeTarget.getAttribute("data-kid-tooltip");
        if (text && document.body.contains(activeTarget)) {
          updatePosition(activeTarget, text);
        } else {
          hideTooltip();
        }
      }
    };

    const handleMouseDown = () => {
      // Si l'enfant clique sur un élément, masquer immédiatement l'infobulle
      hideTooltip();
    };

    window.addEventListener("mouseover", handleMouseOver, { passive: true });
    window.addEventListener("mouseout", handleMouseOut, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousedown", handleMouseDown, { passive: true });

    return () => {
      clearPending();
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mouseout", handleMouseOut);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  if (!tooltip) return null;

  return (
    <div
      className={`kid-floating-tooltip ${tooltip.pos}`}
      style={{
        position: "fixed",
        left: tooltip.x,
        top: tooltip.y,
        transform: tooltip.pos === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
        zIndex: 999999,
        pointerEvents: "none"
      }}
    >
      <div className="kid-tooltip-content">
        {tooltip.text}
      </div>
      <div className={`kid-tooltip-arrow ${tooltip.pos}`} />
    </div>
  );
}
