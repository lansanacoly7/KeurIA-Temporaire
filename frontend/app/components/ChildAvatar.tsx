import type { ReactNode } from "react";

/**
 * Personnages de l'élève. Les identifiants sont ceux acceptés par l'API (backend/apps/accounts/serializers.py).
 * Palou vient des illustrations officielles ; le robot Nova et les jeunes explorateurs sont dessinés en SVG.
 */
export type AvatarDef = { id: string; label: string; group: "companion" | "explorer"; from: string; to: string };

export const AVATARS: AvatarDef[] = [
  // Palou : Galerie d'expressions uniques
  { id: "palou-aventurier", label: "Palou triomphant", group: "companion", from: "#fff3c4", to: "#ffd98a" },
  { id: "palou-rire", label: "Palou éclat de rire", group: "companion", from: "#fef9c3", to: "#fde047" },
  { id: "palou-clin-oeil", label: "Palou clin d'œil", group: "companion", from: "#ede9fe", to: "#c4b5fd" },
  { id: "palou-question", label: "Palou le curieux", group: "companion", from: "#e0f2fe", to: "#7dd3fc" },
  { id: "palou-genie", label: "Palou l'ingénieur", group: "companion", from: "#dcfce7", to: "#86efac" },
  { id: "palou-surpris", label: "Palou émerveillé", group: "companion", from: "#ffedd5", to: "#fed7aa" },
  { id: "palou-calme", label: "Palou zen", group: "companion", from: "#d1fae5", to: "#6ee7b7" },
  { id: "palou-determine", label: "Palou déterminé", group: "companion", from: "#fee2e2", to: "#fca5a5" },
  { id: "palou-champion", label: "Palou en fête", group: "companion", from: "#fef08a", to: "#facc15" },
  { id: "palou-lion", label: "Palou le lion", group: "companion", from: "#fef3c7", to: "#f59e0b" },
  { id: "palou-chercheur", label: "Palou l'explorateur", group: "companion", from: "#d9f2e8", to: "#9fdcc6" },
  // Compagnons robots
  { id: "robot-nova", label: "Nova le robot", group: "companion", from: "#dbeafe", to: "#93c5fd" },
  { id: "robot-spark", label: "Spark le drone", group: "companion", from: "#ccfbf1", to: "#5eead4" },
  // Jeunes explorateurs et exploratrices
  { id: "explorateur-moussa", label: "Moussa l'inventeur", group: "explorer", from: "#d8f05b", to: "#7fd1a8" },
  { id: "exploratrice-awa", label: "Awa la codeuse", group: "explorer", from: "#e9d5ff", to: "#c4a4f5" },
  { id: "explorateur-cheikh", label: "Cheikh l'astronaute", group: "explorer", from: "#1e3a8a", to: "#4f6fd0" },
  { id: "exploratrice-fatou", label: "Fatou la chercheuse", group: "explorer", from: "#cffafe", to: "#7dd3e8" },
  { id: "explorateur-idrissa", label: "Idrissa le conteur", group: "explorer", from: "#ffedd5", to: "#fdba74" },
  { id: "exploratrice-mariama", label: "Mariama l'artiste", group: "explorer", from: "#fdf4ff", to: "#f0abfc" },
  { id: "explorateur-modou", label: "Modou le gamer", group: "explorer", from: "#ecfccb", to: "#a3e635" },
  { id: "exploratrice-khady", label: "Khady l'étoile", group: "explorer", from: "#e0f2fe", to: "#38bdf8" },
  { id: "explorateur-alioune", label: "Alioune le pilote", group: "explorer", from: "#fef3c7", to: "#fbbf24" },
  { id: "exploratrice-aminata", label: "Aminata la logicienne", group: "explorer", from: "#ffe4e6", to: "#fda4af" },
];

export const DEFAULT_AVATAR_ID = AVATARS[0].id;

/** Un identifiant inconnu (ancien émoji, ancienne icône, profil sans avatar) retombe sur Palou. */
export function getAvatar(id?: string | null): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

const EYE = "#2b1810";

/** Visage commun aux jeunes explorateurs : oreilles, tête, yeux, sourcils, nez, joues. */
function Face({ skin, shade, mouth = "smile" }: { skin: string; shade: string; mouth?: "smile" | "grin" }) {
  return (
    <>
      <rect x="28" y="39" width="8" height="9" rx="3" fill={shade} />
      <circle cx="19.6" cy="30" r="3" fill={skin} />
      <circle cx="44.4" cy="30" r="3" fill={skin} />
      <ellipse cx="32" cy="29" rx="12.5" ry="14" fill={skin} />
      <ellipse cx="27" cy="30" rx="1.9" ry="2.3" fill={EYE} />
      <ellipse cx="37" cy="30" rx="1.9" ry="2.3" fill={EYE} />
      <circle cx="27.7" cy="29.2" r=".7" fill="#fff" />
      <circle cx="37.7" cy="29.2" r=".7" fill="#fff" />
      <path d="M24.3 25.6 Q27 24.2 29.6 25.4 M34.4 25.4 Q37 24.2 39.7 25.6" stroke={EYE} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <path d="M31 32.5 Q32 34 33.2 33" stroke={shade} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <circle cx="23.8" cy="34.3" r="2.4" fill="#ff7a6b" opacity=".3" />
      <circle cx="40.2" cy="34.3" r="2.4" fill="#ff7a6b" opacity=".3" />
      {mouth === "grin" ? (
        <>
          <path d="M27.2 36 Q32 43 36.8 36 Z" fill="#7a2e1f" />
          <path d="M28.6 36 H35.4 V37.3 H28.6 Z" fill="#fff" />
        </>
      ) : (
        <path d="M28 36.6 Q32 40 36 36.6" stroke="#7a2e1f" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      )}
    </>
  );
}

const Shoulders = ({ fill }: { fill: string }) => <path d="M6 64 C6 51 18 46.5 32 46.5 C46 46.5 58 51 58 64 Z" fill={fill} />;

/** Dessin du personnage (fond exclu), dans un repère 64x64. */
function Character({ id }: { id: string }): ReactNode {
  switch (id) {
    case "palou-aventurier":
      return (
        <svg width="64" height="64" viewBox="162 49 722 722" preserveAspectRatio="xMidYMid slice">
          <image href="/images/palou/palou-officiel-cheer.png" width="985" height="1024" />
        </svg>
      );
    case "palou-chercheur":
      return (
        <svg width="64" height="64" viewBox="37 46 727 727" preserveAspectRatio="xMidYMid slice">
          <image href="/images/palou/palou-officiel-stand.png" width="796" height="1024" />
        </svg>
      );
    case "palou-rire":
      return (
        <svg width="64" height="64" viewBox="208 63 887 887" preserveAspectRatio="xMidYMid slice">
          <image href="/images/palou/Palou_Rire.png" width="1230" height="1278" />
        </svg>
      );
    case "palou-clin-oeil":
    case "palou-malin":
      return (
        <svg width="64" height="64" viewBox="233 77 869 869" preserveAspectRatio="xMidYMid slice">
          <image href="/images/palou/game-palou-clin-oeil.png" width="1230" height="1278" />
        </svg>
      );
    case "palou-question":
      return (
        <svg width="64" height="64" viewBox="127 67 889 889" preserveAspectRatio="xMidYMid slice">
          <image href="/images/palou/Palou_Question.png" width="1104" height="1280" />
        </svg>
      );
    case "palou-surpris":
      return (
        <svg width="64" height="64" viewBox="98 56 894 894" preserveAspectRatio="xMidYMid slice">
          <image href="/images/palou/Palou_Surpris.png" width="1071" height="1280" />
        </svg>
      );
    case "palou-calme":
      return (
        <svg width="64" height="64" viewBox="143 51 920 920" preserveAspectRatio="xMidYMid slice">
          <image href="/images/palou/Palou_Calme.png" width="1200" height="1280" />
        </svg>
      );
    case "palou-determine":
    case "palou-hero":
      return (
        <svg width="64" height="64" viewBox="527 202 1239 1239" preserveAspectRatio="xMidYMid slice">
          <image href="/images/palou/Palou_Determine.png" width="2048" height="2048" />
        </svg>
      );
    case "palou-genie":
      return (
        <svg width="64" height="64" viewBox="197 89 846 846" preserveAspectRatio="xMidYMid slice">
          <image href="/images/palou/Palou_Intelligent.png" width="1254" height="1254" />
        </svg>
      );
    case "palou-champion":
      return (
        <svg width="64" height="64" viewBox="179 55 881 881" preserveAspectRatio="xMidYMid slice">
          <image href="/images/palou/Palou_Celebration.png" width="1230" height="1278" />
        </svg>
      );
    case "palou-lion":
      return (
        <svg width="64" height="64" viewBox="37 46 727 727" preserveAspectRatio="xMidYMid slice">
          <image href="/images/palou/game-palou-lion.png" width="796" height="1024" />
        </svg>
      );
    case "robot-nova":
      return (
        <>
          <Shoulders fill="#2563eb" />
          <circle cx="32" cy="55" r="3.2" fill="#fde047" />
          <rect x="28" y="40" width="8" height="8" rx="2" fill="#94a3b8" />
          <path d="M32 15 V9" stroke="#e2e8f0" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="32" cy="8" r="2.8" fill="#fde047" />
          <rect x="12.5" y="23" width="4" height="11" rx="2" fill="#1d4ed8" />
          <rect x="47.5" y="23" width="4" height="11" rx="2" fill="#1d4ed8" />
          <rect x="15.5" y="14.5" width="33" height="27" rx="11" fill="#60a5fa" />
          <rect x="15.5" y="14.5" width="33" height="10" rx="8" fill="#fff" opacity=".22" />
          <rect x="20" y="20.5" width="24" height="16.5" rx="7.5" fill="#0b2a5b" />
          <circle cx="27" cy="28" r="3.4" fill="#7dd3fc" />
          <circle cx="37" cy="28" r="3.4" fill="#7dd3fc" />
          <circle cx="28" cy="27" r="1" fill="#fff" />
          <circle cx="38" cy="27" r="1" fill="#fff" />
          <path d="M28 33.4 Q32 36.4 36 33.4" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </>
      );
    case "explorateur-moussa":
      return (
        <>
          <Shoulders fill="#f59e0b" />
          <path d="M26 46.6 Q32 51 38 46.6" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <Face skin="#8d5a3b" shade="#774a30" />
          <rect x="18.6" y="24" width="2.6" height="7" rx="1.3" fill="#1b1410" />
          <rect x="42.8" y="24" width="2.6" height="7" rx="1.3" fill="#1b1410" />
          <path d="M19 25.5 C19 14 26 10 32 10 C38 10 45 14 45 25.5 Z" fill="#0f755f" />
          <path d="M16.5 26 Q32 21.5 47.5 26 L50 28.6 Q32 25.8 14 28.6 Z" fill="#d8f05b" />
          <circle cx="32" cy="10.2" r="1.7" fill="#d8f05b" />
          <circle cx="32" cy="18" r="3" fill="#d8f05b" opacity=".9" />
          <path d="M30.6 18 H33.4 M32 16.6 V19.4" stroke="#0f755f" strokeWidth="1" strokeLinecap="round" />
        </>
      );
    case "exploratrice-awa":
      return (
        <>
          <path d="M20.5 31 C17.5 38 17 45 16.5 54" stroke="#1b1410" strokeWidth="3.6" strokeLinecap="round" fill="none" />
          <path d="M43.5 31 C46.5 38 47 45 47.5 54" stroke="#1b1410" strokeWidth="3.6" strokeLinecap="round" fill="none" />
          <circle cx="16.4" cy="56" r="2" fill="#f59e0b" />
          <circle cx="47.6" cy="56" r="2" fill="#f59e0b" />
          <Shoulders fill="#7c3aed" />
          <Face skin="#6f4428" shade="#5b361f" />
          <path d="M19.4 28.5 C18.6 13.5 26 11.6 32 11.6 C38 11.6 45.4 13.5 44.6 28.5 C42.4 21 38 19 32 19 C26 19 21.6 21 19.4 28.5 Z" fill="#1b1410" />
          <path d="M32 11.8 V19" stroke="#3a2a20" strokeWidth="1" />
          <path d="M18.6 30 C17 6.5 47 6.5 45.4 30" stroke="#153b3b" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <rect x="15.4" y="26.4" width="5" height="9.4" rx="2.4" fill="#d8f05b" stroke="#153b3b" strokeWidth="1.3" />
          <rect x="43.6" y="26.4" width="5" height="9.4" rx="2.4" fill="#d8f05b" stroke="#153b3b" strokeWidth="1.3" />
        </>
      );
    case "explorateur-cheikh":
      return (
        <>
          <Shoulders fill="#f1f5f9" />
          <rect x="22" y="53" width="8" height="4" rx="1.5" fill="#f97316" />
          <circle cx="42" cy="55" r="2" fill="#38bdf8" />
          <Face skin="#a0683f" shade="#875532" />
          <path d="M19.8 26 C20 15.5 26 14 32 14 C38 14 44 15.5 44.2 26 C41 20.5 37 19.6 32 19.6 C27 19.6 23 20.5 19.8 26 Z" fill="#1b1410" />
          <ellipse cx="32" cy="47" rx="16" ry="4.2" fill="#cbd5e1" />
          <circle cx="32" cy="28.5" r="19.6" fill="#bfe3ff" opacity=".28" stroke="#f8fafc" strokeWidth="3.2" />
          <path d="M18.4 20 A16.5 16.5 0 0 1 28 12.4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".85" />
          <circle cx="11" cy="30" r="1.6" fill="#f97316" />
          <circle cx="53" cy="30" r="1.6" fill="#f97316" />
        </>
      );
    case "exploratrice-fatou":
      return (
        <>
          <circle cx="32" cy="19" r="17" fill="#1f1410" />
          <Shoulders fill="#ffffff" />
          <path d="M25.6 46.6 L32 57 L38.4 46.6 Z" fill="#2563eb" />
          <path d="M32 47 V64" stroke="#e2e8f0" strokeWidth="1" />
          <Face skin="#7b4a2e" shade="#663b22" />
          <path d="M19.8 25 C21 17.5 26 15.6 32 15.6 C38 15.6 43 17.5 44.2 25 C40.5 20.5 36.5 19.8 32 19.8 C27.5 19.8 23.5 20.5 19.8 25 Z" fill="#1f1410" />
          <circle cx="27" cy="30" r="4.9" fill="#fff" opacity=".22" stroke="#153b3b" strokeWidth="1.5" />
          <circle cx="37" cy="30" r="4.9" fill="#fff" opacity=".22" stroke="#153b3b" strokeWidth="1.5" />
          <path d="M31.9 29.6 H32.1 M19.8 29.2 L22.1 29.8 M44.2 29.2 L41.9 29.8" stroke="#153b3b" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="44" cy="53" r="2.3" fill="#22c55e" />
        </>
      );
    case "explorateur-idrissa":
      return (
        <>
          {[[20.5, 18.5], [26, 14.6], [32, 13.6], [38, 14.6], [43.5, 18.5], [18.6, 24], [45.4, 24]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="5.4" fill="#2a1b12" />
          ))}
          <Shoulders fill="#ea580c" />
          <path d="M32 50 L33.4 53.2 L36.8 53.5 L34.2 55.7 L35 59 L32 57.2 L29 59 L29.8 55.7 L27.2 53.5 L30.6 53.2 Z" fill="#fde047" />
          <Face skin="#b27a50" shade="#996340" mouth="grin" />
          <path d="M19.8 25 C21 18.6 26 17 32 17 C38 17 43 18.6 44.2 25 C41 21.4 37 20.6 32 20.6 C27 20.6 23 21.4 19.8 25 Z" fill="#2a1b12" />
          <path d="M45.6 24 L50.4 16.6" stroke="#f59e0b" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M50.4 16.6 L51.4 15.1" stroke="#153b3b" strokeWidth="2.3" strokeLinecap="round" />
        </>
      );
    case "robot-spark":
      return (
        <>
          <Shoulders fill="#0f766e" />
          <circle cx="32" cy="11" r="2.8" fill="#a7f3d0" />
          <path d="M32 18 V12" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="13" y="24" width="4" height="10" rx="2" fill="#0d9488" />
          <rect x="47" y="24" width="4" height="10" rx="2" fill="#0d9488" />
          <rect x="16" y="16" width="32" height="26" rx="12" fill="#14b8a6" />
          <rect x="16" y="16" width="32" height="9" rx="8" fill="#fff" opacity=".25" />
          <rect x="20" y="21" width="24" height="16" rx="7" fill="#042f2e" />
          <path d="M25 27 Q28 24 31 27" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M33 27 Q36 24 39 27" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="32" cy="32" r="1.6" fill="#34d399" />
        </>
      );
    case "exploratrice-mariama":
      return (
        <>
          <Shoulders fill="#c026d3" />
          <Face skin="#7c4a2e" shade="#663b22" mouth="grin" />
          <circle cx="20" cy="27" r="4.5" fill="#1b1410" />
          <circle cx="44" cy="27" r="4.5" fill="#1b1410" />
          <ellipse cx="32" cy="18" rx="17" ry="7.5" fill="#9333ea" transform="rotate(-10 32 18)" />
          <circle cx="28" cy="11" r="2.2" fill="#d946ef" />
          <path d="M26 47 L32 55 L38 47 Z" fill="#fde047" />
        </>
      );
    case "explorateur-modou":
      return (
        <>
          <Shoulders fill="#0f172a" />
          <Face skin="#96603a" shade="#804e2b" mouth="grin" />
          <path d="M19.5 25 C19 14 26 12 32 12 C38 12 45 14 44.5 25 Z" fill="#1b1410" />
          <path d="M15 28 C14 11 50 11 49 28" stroke="#334155" strokeWidth="3" strokeLinecap="round" fill="none" />
          <rect x="13" y="25" width="5.5" height="12" rx="2.5" fill="#84cc16" stroke="#1e293b" strokeWidth="1" />
          <rect x="45.5" y="25" width="5.5" height="12" rx="2.5" fill="#84cc16" stroke="#1e293b" strokeWidth="1" />
          <path d="M16 35 Q18 43 27 41" stroke="#334155" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <circle cx="27" cy="41" r="1.6" fill="#84cc16" />
        </>
      );
    case "exploratrice-khady":
      return (
        <>
          <circle cx="16" cy="18" r="8.5" fill="#1b1410" />
          <circle cx="48" cy="18" r="8.5" fill="#1b1410" />
          <ellipse cx="20" cy="22" rx="3.5" ry="1.8" fill="#eab308" transform="rotate(30 20 22)" />
          <ellipse cx="44" cy="22" rx="3.5" ry="1.8" fill="#eab308" transform="rotate(-30 44 22)" />
          <Shoulders fill="#0284c7" />
          <Face skin="#5a341e" shade="#472815" mouth="grin" />
          <path d="M19.6 25 C22 17 26 16 32 16 C38 16 42 17 44.4 25 C40 21 36 20 32 20 C28 20 24 21 19.6 25 Z" fill="#1b1410" />
          <circle cx="19.5" cy="34" r="1.8" fill="#facc15" />
          <circle cx="44.5" cy="34" r="1.8" fill="#facc15" />
        </>
      );
    case "explorateur-alioune":
      return (
        <>
          <Shoulders fill="#78350f" />
          <path d="M22 47 Q32 54 42 47" stroke="#fef3c7" strokeWidth="4" strokeLinecap="round" fill="none" />
          <Face skin="#8d5a3b" shade="#774a30" />
          <path d="M19.8 25 C20 15 26 13 32 13 C38 13 44 15 44.2 25 Z" fill="#1b1410" />
          <path d="M18 20 H46" stroke="#451a03" strokeWidth="1.8" />
          <rect x="22" y="16" width="9" height="7" rx="2.5" fill="#fde047" stroke="#78350f" strokeWidth="1.2" opacity=".9" />
          <rect x="33" y="16" width="9" height="7" rx="2.5" fill="#fde047" stroke="#78350f" strokeWidth="1.2" opacity=".9" />
          <path d="M31 19.5 H33" stroke="#78350f" strokeWidth="1.2" />
        </>
      );
    case "exploratrice-aminata":
      return (
        <>
          <Shoulders fill="#4338ca" />
          <ellipse cx="32" cy="18" rx="14" ry="5" fill="#fb7185" />
          <Face skin="#6f4428" shade="#5b361f" mouth="smile" />
          <path d="M19.6 25 C20 14 26 12 32 12 C38 12 44 14 44.4 25 C41 19 37 18 32 18 C27 18 23 19 19.6 25 Z" fill="#1b1410" />
          <circle cx="26.5" cy="30" r="4.6" fill="#fff" opacity=".2" stroke="#06b6d4" strokeWidth="1.4" />
          <circle cx="37.5" cy="30" r="4.6" fill="#fff" opacity=".2" stroke="#06b6d4" strokeWidth="1.4" />
          <path d="M31.1 29.5 H32.9" stroke="#06b6d4" strokeWidth="1.4" />
          <circle cx="19.5" cy="33.5" r="1.5" fill="#fb7185" />
          <circle cx="44.5" cy="33.5" r="1.5" fill="#fb7185" />
        </>
      );
    default:
      return null;
  }
}

/** Portrait rond d'un personnage. Les jeunes explorateurs et Nova sont dessinés en SVG, Palou vient de ses illustrations officielles. */
export default function ChildAvatar({ id, size = 64, title }: { id?: string | null; size?: number; title?: string }) {
  const a = getAvatar(id);
  const bg = `av-bg-${a.id}`;
  const clip = `av-clip-${a.id}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title ?? a.label} style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a.from} />
          <stop offset="1" stopColor={a.to} />
        </linearGradient>
        <clipPath id={clip}><circle cx="32" cy="32" r="32" /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="64" height="64" fill={`url(#${bg})`} />
        <Character id={a.id} />
      </g>
    </svg>
  );
}
