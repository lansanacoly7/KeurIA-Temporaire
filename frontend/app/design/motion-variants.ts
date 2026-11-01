/**
 * ═══════════════════════════════════════════════════════════════
 * KeurIA — Motion Variants (animations React avec Motion)
 * ═══════════════════════════════════════════════════════════════
 *
 * Variants réutilisables pour les transitions de page,
 * micro-interactions et animations de composants.
 *
 * Usage :
 *   import { pageTransition, cardHover } from "@/app/design/motion-variants";
 *   <motion.div variants={pageTransition} initial="hidden" animate="visible">
 */

import type { Variants } from "motion/react";

/* ─── Transition de page (fade + slide) ─── */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.25 },
  },
};

/* ─── Hover sur carte (scale + shadow) ─── */
export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
  tap: {
    scale: 0.97,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
};

/* ─── Entrée avec rebond (badges, récompenses) ─── */
export const bounceIn: Variants = {
  hidden: { opacity: 0, scale: 0.3 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 12,
      mass: 0.8,
    },
  },
};

/* ─── Celebration badge (rotate + scale + glow) ─── */
export const celebrateBadge: Variants = {
  hidden: { opacity: 0, scale: 0, rotate: -30 },
  visible: {
    opacity: 1,
    scale: [0, 1.3, 0.9, 1.1, 1],
    rotate: [-30, 10, -5, 3, 0],
    transition: {
      duration: 0.8,
      ease: "easeOut",
      times: [0, 0.3, 0.5, 0.7, 1],
    },
  },
};

/* ─── Progress fill (barre qui se remplit) ─── */
export const progressFill = (percent: number) => ({
  hidden: { width: "0%" },
  visible: {
    width: `${percent}%`,
    transition: {
      duration: 1.2,
      ease: [0.25, 0.46, 0.45, 0.94],
      delay: 0.3,
    },
  },
});

/* ─── Stagger container (animation décalée pour les listes) ─── */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

/* ─── Stagger item (enfant dans un stagger) ─── */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

/* ─── Slide in from right ─── */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

/* ─── Modal overlay ─── */
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

/* ─── Modal content ─── */
export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 22,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 10,
    transition: { duration: 0.2 },
  },
};

/* ─── Bouton pressé (micro-interaction) ─── */
export const buttonPress = {
  rest: { scale: 1 },
  hover: { scale: 1.05, transition: { type: "spring", stiffness: 400 } },
  tap: { scale: 0.93 },
};

/* ─── Confetti piece (particule) ─── */
export const confettiPiece = (delay: number, x: number) => ({
  hidden: { opacity: 0, y: 0, x: 0, rotate: 0 },
  visible: {
    opacity: [1, 1, 0],
    y: [0, -80, 300],
    x: [0, x, x * 1.5],
    rotate: [0, 180, 720],
    transition: {
      duration: 2,
      delay,
      ease: "easeOut",
    },
  },
});

/* ─── Notification badge (shake + scale) ─── */
export const notificationBadge: Variants = {
  hidden: { scale: 0 },
  visible: {
    scale: [0, 1.3, 0.9, 1.05, 1],
    transition: { duration: 0.5, times: [0, 0.3, 0.5, 0.7, 1] },
  },
};

/* ─── XP counter (compteur animé) ─── */
export const xpCounter: Variants = {
  rest: { scale: 1 },
  bump: {
    scale: [1, 1.2, 0.95, 1.05, 1],
    transition: { duration: 0.4, times: [0, 0.2, 0.4, 0.7, 1] },
  },
};
