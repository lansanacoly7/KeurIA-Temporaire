"use client";

/**
 * Confettis du parcours 7-9 (bibliothèque canvas-confetti chargée à la demande). Silencieux s'il n'y a pas de canvas (tests)
 * ou si le chargement échoue : la fête est un bonus, jamais un blocage. Toujours active, même si Windows réduit les animations
 * (les jeux d'enfants doivent bouger) ; `disableForReducedMotion` est volontairement laissé à faux.
 */
const COLORS = ["#0f755f", "#d8f05b", "#87ceeb", "#ffd23f", "#ffffff", "#35b27f"];

function allowed(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (navigator.userAgent.includes("jsdom")) return false;
  return true;
}

type Confetti = (options: Record<string, unknown>) => unknown;

async function load(): Promise<Confetti | null> {
  try {
    const lib = await import("canvas-confetti");
    return lib.default as unknown as Confetti;
  } catch {
    return null;
  }
}

/** Petite gerbe à l'endroit touché (bonne réponse). */
export async function burstAt(element: Element | null) {
  if (!allowed() || !element) return;
  const confetti = await load();
  if (!confetti) return;
  const rect = element.getBoundingClientRect();
  confetti({
    particleCount: 26,
    spread: 70,
    startVelocity: 26,
    ticks: 60,
    scalar: 0.8,
    zIndex: 10500,
    colors: COLORS,
    origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
  });
}

/** Grande fête de fin de leçon : deux canons latéraux puis une pluie. */
export async function celebrate() {
  if (!allowed()) return;
  const confetti = await load();
  if (!confetti) return;
  const end = Date.now() + 1600;
  const frame = () => {
    confetti({ particleCount: 6, angle: 60, spread: 65, origin: { x: 0, y: 0.75 }, zIndex: 10500, colors: COLORS });
    confetti({ particleCount: 6, angle: 120, spread: 65, origin: { x: 1, y: 0.75 }, zIndex: 10500, colors: COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  window.setTimeout(() => confetti({ particleCount: 90, spread: 100, startVelocity: 38, origin: { y: 0.5 }, zIndex: 10500, colors: COLORS }), 350);
}
