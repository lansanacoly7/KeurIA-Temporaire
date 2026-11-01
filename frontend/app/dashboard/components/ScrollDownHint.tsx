"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface ScrollDownHintProps {
  targetId?: string;
  scrollOffset?: number;
  ariaLabel?: string;
}

/**
 * Flèche flottante « fais défiler vers le bas » (mobile ≤ 900px), identique sur toutes les pages.
 * Rendue dans <body> via un portal : aucun style ni transform d'un conteneur de page ne peut l'altérer.
 */
export function ScrollDownHint({
  targetId,
  scrollOffset = 380,
  ariaLabel = "Faire défiler vers le bas"
}: ScrollDownHintProps) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(true);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setShow(window.scrollY < 60);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!mounted || !show) return null;

  const handleClick = () => {
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollBy({ top: scrollOffset, behavior: "smooth" });
  };

  return createPortal(
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className="keuria-scroll-hint-btn"
    >
      <ChevronDown size={24} strokeWidth={3} color="#D7F26B" style={{ width: 24, height: 24, flex: "none" }} />
    </button>,
    document.body
  );
}
