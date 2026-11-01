import type { ReactNode, SVGProps } from "react";

/**
 * Pictogrammes du parcours 7-9 : petits SVG « trait épais arrondi » (aucun emoji dans l'interface).
 * Décoratifs par défaut (aria-hidden) ; le bouton ou le texte voisin porte le sens.
 */
export type IconName =
  | "close" | "sound" | "mute" | "check" | "lock" | "play" | "star" | "sprout" | "trophy" | "sparkles" | "bulb" | "book"
  | "arrow-right" | "arrow-left" | "graduation" | "flame" | "shield" | "clock" | "map" | "back" | "help" | "cloud" | "flag" | "replay" | "undo";

const PATHS: Record<IconName, ReactNode> = {
  close: <path d="M6 6l12 12M18 6L6 18" />,
  sound: <><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4z" fill="currentColor" /><path d="M15.5 9a4.2 4.2 0 010 6M18 6.5a8 8 0 010 11" /></>,
  mute: <><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4z" fill="currentColor" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor" /><path d="M8 10.5V8a4 4 0 018 0v2.5" /></>,
  play: <path d="M8 5.5v13l11-6.5L8 5.5z" fill="currentColor" />,
  star: <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8L12 3.2z" fill="currentColor" />,
  sprout: <><path d="M12 21v-9" /><path d="M12 13c0-4 2.5-6 7-6 0 4-2.5 6-7 6zM12 15c0-3-2-5-6-5 0 3.500 2 5 6 5z" fill="currentColor" /></>,
  trophy: <><path d="M7 4h10v5a5 5 0 01-10 0V4z" fill="currentColor" /><path d="M7 6H4v1.500a3.500 3.500 0 003.500 3.500M17 6h3v1.500a3.500 3.500 0 01-3.500 3.500M12 14v4M8.500 20h7" /></>,
  sparkles: <><path d="M10 3.500l1.700 4.800 4.800 1.700-4.800 1.700L10 16.500l-1.700-4.800L3.500 10l4.800-1.700L10 3.500z" fill="currentColor" /><path d="M18 14l.9 2.400 2.400.9-2.400.9L18 20.600l-.9-2.400-2.400-.9 2.400-.9L18 14z" fill="currentColor" /></>,
  bulb: <><path d="M9 17.500h6M10 21h4M12 3a6 6 0 00-3.500 10.900c.6.500 1 1.200 1 2V16.500h5v-.6c0-.8.400-1.500 1-2A6 6 0 0012 3z" /></>,
  book: <><path d="M4 5.500A2.500 2.500 0 016.500 3H20v15H6.500A2.500 2.500 0 004 20.500v-15z" /><path d="M4 20.500A2.500 2.500 0 006.500 18H20v3H6.500A2.500 2.500 0 014 20.500z" /></>,
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  graduation: <><path d="M2 9l10-5 10 5-10 5L2 9z" fill="currentColor" /><path d="M6 11.500V16c0 1.500 2.700 3 6 3s6-1.500 6-3v-4.500" /></>,
  flame: <path d="M12 3c1 3.500 5 5.500 5 10a5 5 0 01-10 0c0-2 1-3.500 2-4.500.2 1.500.8 2.300 1.500 2.500C10 8 10.500 5 12 3z" fill="currentColor" />,
  shield: <path d="M12 3l7 3v5.500c0 4.500-3 8-7 9.500-4-1.500-7-5-7-9.500V6l7-3z" fill="currentColor" />,
  clock: <><circle cx="12" cy="12" r="8.500" /><path d="M12 7v5l3 2" /></>,
  map: <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6zM9 4v14M15 6v14" />,
  back: <path d="M15 5l-7 7 7 7" />,
  help: <><circle cx="12" cy="12" r="8.500" /><path d="M9.500 9.500a2.500 2.500 0 114 2c-.9.600-1.500 1.100-1.500 2.200M12 17h.01" /></>,
  cloud: <path d="M7 18a4 4 0 01-.5-8 5.500 5.500 0 0110.600 1.500A3.300 3.300 0 0117 18H7z" fill="currentColor" />,
  flag: <path d="M6 21V4M6 5h11l-2 4 2 4H6" fill="currentColor" />,
  replay: <><path d="M4 12a8 8 0 108-8H8" /><path d="M11 1.500L8 4l3 2.500" /></>,
  undo: <><path d="M9 7L4 12l5 5" /><path d="M4 12h10a5 5 0 010 10h-3" /></>,
};

export function Icon79({ name, size = 24, className = "", ...rest }: { name: IconName; size?: number; className?: string } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      className={`p79-ico ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.400}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

/** Étoile de récompense (pleine ou vide), dessinée avec un dégradé doré et un liseré : elle brille à l'écran de fin. */
export function StarBig79({ on, delay = 0, size = 76 }: { on: boolean; delay?: number; size?: number }) {
  return (
    <svg className={`p79-starbig ${on ? "on" : "off"}`} style={{ animationDelay: `${delay}s` }} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="p79-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3a3" />
          <stop offset=".55" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#f29d0a" />
        </linearGradient>
      </defs>
      <path
        d="M24 4.500l5.700 11.700 12.800 1.800-9.300 9 2.300 12.800L24 33.700 12.500 39.800l2.300-12.800-9.300-9 12.800-1.800L24 4.500z"
        fill={on ? "url(#p79-gold)" : "#dbe6df"}
        stroke={on ? "#b86e00" : "#b7c7bd"}
        strokeWidth="2.500"
        strokeLinejoin="round"
      />
      {on && <path d="M17 15l4-5" stroke="#fff" strokeWidth="2.500" strokeLinecap="round" opacity=".8" />}
    </svg>
  );
}
