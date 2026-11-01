import type { ReactNode } from "react";
import type { ModuleState } from "./types";

/**
 * Décors dessinés en SVG pour la carte du parcours 7-9. Chaque chapitre a SON île : un lieu de l'histoire, reconnaissable
 * au premier regard (l'école et son drapeau, le car rapide de Papa Ibou, le marché Kermel, les pirogues de Guet Ndar…).
 * Même trait d'encre épais et mêmes aplats que les illustrations des leçons, pour que la carte et les histoires se ressemblent.
 */

const INK = "#153b3b";
const o = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const thin = { ...o, strokeWidth: 2.5 };

const SAND: [string, string] = ["#f6ecc9", "#dccb98"];
/** Sol de chaque île (herbe, sable, terre…) : [haut, bas]. */
const GROUND: [string, string][] = [
  ["#9fe3b0", "#3fb685"], ["#a9dd8a", "#6fb446"], ["#f1e2b0", "#d9c283"], ["#f6e7b8", "#e0c987"], ["#9fe3b0", "#35b27f"],
  ["#8fe0c8", "#2fae9a"], ["#b6e388", "#78b83a"], ["#8fd9d0", "#3ba8a0"], ["#a9e09a", "#4fb561"], ["#c4ec8a", "#86bd3d"],
];

function Base({ i }: { i: number }) {
  const [top, bottom] = GROUND[i % GROUND.length];
  return (
    <>
      <defs>
        <linearGradient id={`p79-g-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient>
        <linearGradient id={`p79-s-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={SAND[0]} /><stop offset="1" stopColor={SAND[1]} /></linearGradient>
      </defs>
      <ellipse className="p79-foam" cx="120" cy="140" rx="116" ry="30" fill="none" stroke="#fff" strokeWidth="5" />
      <ellipse className="p79-isle-shadow" cx="120" cy="164" rx="100" ry="13" />
      <path d="M16 112c0 34 48 54 104 54s104-20 104-54z" fill={`url(#p79-s-${i})`} {...o} />
      <ellipse cx="120" cy="108" rx="104" ry="42" fill={`url(#p79-g-${i})`} {...o} />
      <path d="M44 104c16-8 32-10 48-8M150 98c16-4 32-2 44 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".4" fill="none" />
    </>
  );
}

/** Une île. `variant` (0 à 9) est le numéro du chapitre moins un : chaque chapitre a son décor. */
export function Island79({ variant, state }: { variant: number; state: ModuleState }) {
  const i = variant % 10;
  const Scene = SCENES[i];
  return (
    <svg className={`p79-isle-svg ${state}`} viewBox="0 0 240 190" aria-hidden="true" focusable="false">
      <Base i={i} />
      <Scene />
    </svg>
  );
}

/* ── 1 · Bonjour, l’IA ! : la cour de l’école ─────────────────────────────── */
function School() {
  return (
    <g>
      <Bush x={52} y={116} />
      <path d="M180 112V38" {...o} strokeWidth={4} />
      <rect x="180" y="40" width="9" height="20" fill="#1fa05a" {...thin} strokeLinejoin="miter" />
      <rect x="189" y="40" width="9" height="20" fill="#ffd23f" {...thin} strokeLinejoin="miter" />
      <rect x="198" y="40" width="9" height="20" fill="#e5483a" {...thin} strokeLinejoin="miter" />
      <path d="M193.500 44.500l1.700 3.600 3.900.5-2.900 2.700.8 3.900-3.500-2-3.500 2 .8-3.900-2.900-2.700 3.900-.5z" fill="#1fa05a" />
      <rect x="68" y="72" width="96" height="40" rx="4" fill="#fff3d0" {...o} />
      <path d="M58 74L116 34l58 40z" fill="#0f755f" {...o} />
      <circle cx="116" cy="56" r="8" fill="#d8f05b" {...thin} />
      <path d="M116 51v5l3 2" stroke={INK} strokeWidth="2.500" strokeLinecap="round" fill="none" />
      <path d="M104 112V92a12 12 0 0124 0v20z" fill="#c98a4b" {...o} />
      <rect x="76" y="84" width="20" height="17" rx="3" fill="#87ceeb" {...thin} />
      <rect x="136" y="84" width="20" height="17" rx="3" fill="#87ceeb" {...thin} />
      <path d="M76 92.500h20M86 84v17M136 92.500h20M146 84v17" stroke={INK} strokeWidth="2" />
      <rect x="96" y="112" width="40" height="7" rx="2" fill="#dccb98" {...thin} />
    </g>
  );
}

/* ── 2 · L’IA autour de moi : le car rapide de Papa Ibou ──────────────────── */
function CarRapide() {
  return (
    <g>
      <path d="M26 114h188l12 14q-106 13-212 0z" fill="#6f827c" {...o} />
      <path d="M58 122h16M96 124h16M134 124h16M172 122h16" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />
      <path d="M64 76h86M70 62" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="86" cy="64" rx="13" ry="8" fill="#d8b878" {...thin} />
      <ellipse cx="110" cy="62" rx="12" ry="8" fill="#e5483a" {...thin} />
      <rect x="126" y="56" width="22" height="14" rx="3" fill="#2f6fd0" {...thin} />
      <path d="M58 106V82a8 8 0 018-8h82l20 17a10 10 0 013 7v8z" fill="#ffd23f" {...o} />
      <path d="M58 94h113v12H58z" fill="#2f6fd0" stroke="none" />
      <path d="M58 94h113" stroke={INK} strokeWidth="3" />
      <path d="M58 106h116" {...o} />
      {[66, 90, 114].map(x => <rect key={x} x={x} y="80" width="17" height="13" rx="2.500" fill="#bfeaf5" {...thin} />)}
      <path d="M140 80l14 11h-14z" fill="#bfeaf5" {...thin} />
      <g fill="#fff">{[70, 84, 98, 112, 126, 140, 154].map(x => <circle key={x} cx={x} cy="100" r="2" />)}</g>
      <circle cx="172" cy="99" r="3.500" fill="#fff" {...thin} />
      <circle cx="84" cy="108" r="11" fill={INK} />
      <circle cx="84" cy="108" r="4.500" fill="#fff" />
      <circle cx="146" cy="108" r="11" fill={INK} />
      <circle cx="146" cy="108" r="4.500" fill="#fff" />
    </g>
  );
}

/* ── 3 · La grande famille des données : le marché Kermel et la bibliothèque ─ */
function Market() {
  return (
    <g>
      <path d="M62 90V50M138 90V50" {...o} />
      <path d="M46 52l14-16h80l14 16z" fill="#ffd23f" {...o} />
      {[0, 1, 2, 3].map(k => (
        <path key={k} d={`M${50 + k * 24} 52h24v12a12 12 0 01-24 0z`} fill={k % 2 ? "#fff" : "#e5483a"} {...thin} />
      ))}
      <rect x="52" y="90" width="96" height="22" rx="3" fill="#c98a4b" {...o} />
      <circle cx="72" cy="82" r="9" fill="#ff9f1c" {...thin} />
      <ellipse cx="96" cy="83" rx="10" ry="8" fill="#f7c331" {...thin} />
      <circle cx="120" cy="82" r="9" fill="#e5483a" {...thin} />
      <circle cx="136" cy="85" r="6.500" fill="#6cc24a" {...thin} />
      <rect x="154" y="100" width="38" height="12" rx="2" fill="#2f6fd0" {...thin} />
      <rect x="157" y="88" width="32" height="12" rx="2" fill="#e5483a" {...thin} />
      <rect x="153" y="76" width="38" height="12" rx="2" fill="#0f755f" {...thin} />
      <path d="M160 76v12M160 88v12" stroke="#d8f05b" strokeWidth="3" />
      <Bush x={40} y={118} small />
    </g>
  );
}

/* ── 4 · Apprendre avec des exemples : les pirogues de Guet Ndar ───────────── */
function Pirogue() {
  const hull = "M34 78Q120 106 208 44Q200 114 120 118Q52 118 34 78z";
  return (
    <g>
      <clipPath id="p79-hull"><path d={hull} /></clipPath>
      <path d={hull} fill="#2f6fd0" />
      <g clipPath="url(#p79-hull)" fill="none">
        <path d="M24 92Q120 118 220 62" stroke="#fff" strokeWidth="9" />
        <path d="M24 104Q120 126 220 80" stroke="#e5483a" strokeWidth="9" />
        <path d="M24 116Q120 134 220 98" stroke="#ffd23f" strokeWidth="8" />
        <path d="M24 128Q120 142 220 114" stroke="#1fa05a" strokeWidth="9" />
      </g>
      <path d={hull} fill="none" {...o} />
      <path d="M34 78Q120 106 208 44" fill="none" stroke="#8a5a2b" strokeWidth="6" strokeLinecap="round" />
      <path d="M34 78Q120 106 208 44" fill="none" stroke={INK} strokeWidth="1.800" strokeLinecap="round" opacity=".5" />
      <path d="M208 44V22" {...o} strokeWidth={3} />
      <path d="M208 22l20 7-20 8z" fill="#ffd23f" {...thin} />
      <path d="M96 84l-26 34M126 90l-24 30" stroke="#8a5a2b" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="60" cy="130" rx="11" ry="5.500" fill="#9ad0e8" {...thin} />
      <path d="M71 130l9-6v12z" fill="#9ad0e8" {...thin} />
      <ellipse cx="190" cy="132" rx="10" ry="5" fill="#bfe3f2" {...thin} />
      <path d="M180 132l-8-5v10z" fill="#bfe3f2" {...thin} />
    </g>
  );
}
/* ── 5 · L’IA qui regarde : le manguier du jardin ─────────────────────────── */
const CANOPY: [number, number, number][] = [[84, 56, 25], [120, 36, 30], [158, 56, 25], [104, 70, 24], [140, 72, 24]];
function MangoTree() {
  return (
    <g>
      <path d="M108 112c2-18 0-32-6-48h36c-6 16-4 30-2 48z" fill="#a8743f" {...o} />
      <g fill="#46bd78" {...o}>{CANOPY.map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} />)}</g>
      <g fill="#46bd78">{CANOPY.map(([x, y, r]) => <circle key={`f${x}${y}`} cx={x} cy={y} r={r} />)}</g>
      <path d="M96 40c8-6 16-6 22-2M130 50c8-4 14-2 20 4" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".35" fill="none" />
      {([[92, 70], [128, 62], [152, 76], [110, 82]] as const).map(([x, y]) => (
        <g key={`${x}${y}`}>
          <ellipse cx={x} cy={y} rx="7" ry="9" fill="#ffb627" {...thin} transform={`rotate(-18 ${x} ${y})`} />
          <path d={`M${x} ${y - 9}q3-5 8-4`} stroke={INK} strokeWidth="2.500" fill="none" strokeLinecap="round" />
        </g>
      ))}
      <circle cx="176" cy="96" r="15" fill="#e8fbff" fillOpacity=".75" {...o} strokeWidth={4} />
      <path d="M168 91a9 9 0 019-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M187 107l15 15" stroke={INK} strokeWidth="11" strokeLinecap="round" />
      <path d="M187 107l15 15" stroke="#a8743f" strokeWidth="5.500" strokeLinecap="round" />
    </g>
  );
}

/* ── 6 · L’IA qui parle : l’appel vidéo avec Ziguinchor ───────────────────── */
function VideoCall() {
  return (
    <g>
      <Palm x={42} y={116} />
      <path d="M108 112h32l6 10h-44z" fill="#c7d3cc" {...o} />
      <rect x="68" y="48" width="104" height="66" rx="9" fill={INK} {...o} />
      <rect x="75" y="55" width="90" height="52" rx="4" fill="#bfeaf5" />
      <circle cx="102" cy="76" r="11" fill="#8a5a3c" {...thin} />
      <path d="M86 107a16 16 0 0132 0z" fill="#e5483a" {...thin} />
      <circle cx="138" cy="76" r="11" fill="#c98a5a" {...thin} />
      <path d="M122 107a16 16 0 0132 0z" fill="#2f6fd0" {...thin} />
      <circle cx="98.500" cy="75" r="1.600" fill={INK} /><circle cx="105.500" cy="75" r="1.600" fill={INK} />
      <circle cx="134.500" cy="75" r="1.600" fill={INK} /><circle cx="141.500" cy="75" r="1.600" fill={INK} />
      <path d="M99 81q3 3 6 0M135 81q3 3 6 0" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      <rect x="62" y="12" width="50" height="26" rx="13" fill="#fff" {...o} />
      <path d="M78 38l-4 9 12-9z" fill="#fff" {...o} stroke="none" />
      <path d="M78 37.500l-4 8 11-8" fill="none" {...thin} />
      <g fill={INK}><circle cx="78" cy="25" r="3" /><circle cx="87" cy="25" r="3" /><circle cx="96" cy="25" r="3" /></g>
      <rect x="128" y="8" width="52" height="28" rx="14" fill="#d8f05b" {...o} />
      <path d="M160 36l6 9-14-9z" fill="#d8f05b" stroke="none" />
      <path d="M158 36l7 8-13-8" fill="none" {...thin} />
      <path d="M142 22v0M148 17v10M154 14v16M160 17v10M166 20v4" stroke={INK} strokeWidth="3.500" strokeLinecap="round" />
    </g>
  );
}

/* ── 7 · Créer avec l’IA : la fresque de Set Setal ────────────────────────── */
function Mural() {
  return (
    <g>
      <rect x="60" y="44" width="116" height="68" rx="3" fill="#fff3d0" {...o} />
      <rect x="56" y="40" width="124" height="9" rx="2" fill="#c98a4b" {...o} />
      <circle cx="86" cy="68" r="11" fill="#ffd23f" {...thin} />
      <path d="M86 50v5M70 58l4 3M102 58l-4 3" stroke="#ff9f1c" strokeWidth="3" strokeLinecap="round" />
      <path d="M66 100q9-9 18 0t18 0t18 0t18 0t18 0" stroke="#2f6fd0" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M150 100v-14" stroke="#8a5a2b" strokeWidth="5" strokeLinecap="round" />
      <circle cx="150" cy="78" r="12" fill="#1fa05a" {...thin} />
      <ellipse cx="118" cy="80" rx="12" ry="7" fill="#ff7a3d" {...thin} />
      <path d="M130 80l9-7v14z" fill="#ff7a3d" {...thin} />
      <circle cx="113" cy="78.500" r="1.800" fill={INK} />
      <path d="M44 100l-3 14h28l-3-14z" fill="#e5483a" {...o} transform="translate(-6 0)" />
      <path d="M36 100h28" stroke="#d8f05b" strokeWidth="6" strokeLinecap="round" />
      <path d="M58 100l26-30" stroke={INK} strokeWidth="9" strokeLinecap="round" transform="translate(-6 0)" />
      <path d="M52 100l26-30" stroke="#d8b878" strokeWidth="4" strokeLinecap="round" />
      <path d="M78 70l7-9 5 4-7 9z" fill="#2f6fd0" {...thin} />
      <g {...thin}><circle cx="190" cy="106" r="5" fill="#e5483a" /><circle cx="204" cy="100" r="4" fill="#ffd23f" /><circle cx="198" cy="116" r="4" fill="#2f6fd0" /></g>
    </g>
  );
}

/* ── 8 · Mon bouclier numérique : le groupe WhatsApp de la classe ─────────── */
function Spark({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <path d={`M${x} ${y - 9 * s}q1.500 7.500 9 9-7.500 1.500-9 9-1.500-7.500-9-9 7.500-1.500 9-9z`} fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />;
}
function Shield() {
  return (
    <g>
      <path d="M86 112h68l-5-13H91z" fill="#c7d3cc" {...o} />
      <path d="M120 16c14 10 30 12 42 12 0 38-10 56-42 68-32-12-42-30-42-68 12 0 28-2 42-12z" fill="#0f755f" {...o} />
      <path d="M120 27c10 7 21 9 31 9-1 28-9 42-31 52-22-10-30-24-31-52 10 0 21-2 31-9z" fill="#35b27f" />
      <path d="M111 55v-7a9 9 0 0118 0v7" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="106" y="54" width="28" height="22" rx="5" fill="#d8f05b" {...o} />
      <circle cx="120" cy="63" r="3.500" fill={INK} />
      <path d="M120 64v6" stroke={INK} strokeWidth="3.500" strokeLinecap="round" />
      <Spark x={64} y={40} />
      <Spark x={182} y={62} s={0.8} />
      <Spark x={176} y={22} s={0.6} />
      <rect x="170" y="86" width="40" height="22" rx="11" fill="#fff" {...thin} />
      <g fill={INK}><circle cx="182" cy="97" r="2.600" /><circle cx="190" cy="97" r="2.600" /><circle cx="198" cy="97" r="2.600" /></g>
    </g>
  );
}

/* ── 9 · Vrai, faux… vérifions ! : le message vocal et la loupe ───────────── */
function TrueFalse() {
  return (
    <g>
      <path d="M62 112V70M178 112V70" {...o} strokeWidth={5} />
      <rect x="40" y="38" width="46" height="36" rx="6" fill="#35b27f" {...o} />
      <path d="M52 56l9 9 16-18" stroke="#fff" strokeWidth="6.500" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="154" y="38" width="46" height="36" rx="6" fill="#e5483a" {...o} />
      <path d="M166 48l22 18M188 48l-22 18" stroke="#fff" strokeWidth="6.500" strokeLinecap="round" />
      <rect x="86" y="8" width="68" height="28" rx="14" fill="#fff" {...o} />
      <path d="M118 36l-2 9 11-9z" fill="#fff" stroke="none" />
      <path d="M117 35.500l-2 8 10-8" fill="none" {...thin} />
      <path d="M98 22v0M104 18v8M110 14v16M116 19v6M122 12v20M128 17v10M134 20v4M140 16v12" stroke="#0f755f" strokeWidth="3.500" strokeLinecap="round" />
      <circle cx="120" cy="84" r="19" fill="#e8fbff" fillOpacity=".7" {...o} strokeWidth={4.500} />
      <path d="M110 80a11 11 0 0110-7" stroke="#fff" strokeWidth="3.500" strokeLinecap="round" fill="none" />
      <path d="M133 98l16 16" stroke={INK} strokeWidth="12" strokeLinecap="round" />
      <path d="M133 98l16 16" stroke="#ffd23f" strokeWidth="6" strokeLinecap="round" />
    </g>
  );
}

/* ── 10 · Une IA pour mon quartier : la place le jour de la fête ──────────── */
function Quartier() {
  const flags = Array.from({ length: 7 }, (_, k) => {
    const t = (k + 1) / 8;
    return { x: 36 + 168 * t, y: 52 + 48 * t * (1 - t), c: ["#e5483a", "#ffd23f", "#1fa05a", "#2f6fd0", "#ff7a3d"][k % 5] };
  });
  return (
    <g>
      <g stroke="#ffd23f" strokeWidth="3.500" strokeLinecap="round"><path d="M120 6v10M120 32v10M96 18h10M134 18h10M103 1l7 7M137 1l-7 7M103 35l7-7M137 35l-7-7" /></g>
      <g stroke="#e5483a" strokeWidth="3" strokeLinecap="round"><path d="M196 18v6M196 38v6M184 31h6M202 31h6" /></g>
      <rect x="40" y="78" width="46" height="34" rx="3" fill="#f4a259" {...o} />
      <path d="M34 80L63 58l29 22z" fill="#0f755f" {...o} />
      <rect x="54" y="92" width="16" height="20" rx="8" fill="#8a5a2b" {...thin} />
      <rect x="156" y="82" width="46" height="30" rx="3" fill="#87ceeb" {...o} />
      <path d="M150 84L179 64l29 20z" fill="#e5483a" {...o} />
      <rect x="168" y="92" width="14" height="20" rx="7" fill="#8a5a2b" {...thin} />
      <rect x="92" y="64" width="56" height="48" rx="3" fill="#fff3d0" {...o} />
      <path d="M86 66L120 40l34 26z" fill="#2f6fd0" {...o} />
      <path d="M110 112V94a10 10 0 0120 0v18z" fill="#c98a4b" {...thin} />
      <rect x="98" y="72" width="14" height="12" rx="2" fill="#bfeaf5" {...thin} />
      <rect x="128" y="72" width="14" height="12" rx="2" fill="#bfeaf5" {...thin} />
      <path d="M36 52Q120 100 204 52" fill="none" stroke={INK} strokeWidth="2.500" />
      {flags.map(f => <path key={f.x} d={`M${f.x - 6} ${f.y - 1}h12l-6 13z`} fill={f.c} {...thin} strokeWidth={2} />)}
    </g>
  );
}

const SCENES: (() => ReactNode)[] = [School, CarRapide, Market, Pirogue, MangoTree, VideoCall, Mural, Shield, TrueFalse, Quartier];

function Palm({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <path d="M0 0c2-16 4-28 12-42" stroke={INK} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M0 0c2-16 4-28 12-42" stroke="#d8b878" strokeWidth="4.500" strokeLinecap="round" fill="none" />
      <g fill="#2fae7a" {...thin} strokeWidth={3}>
        <path d="M12-42c-10-12-26-10-32 0 12-4 22-2 32 0z" />
        <path d="M12-42c10-12 26-10 32 0-12-4-22-2-32 0z" />
        <path d="M12-42c-2-16 6-26 16-26-2 12-6 20-16 26z" />
      </g>
    </g>
  );
}

function Bush({ x, y, small = false }: { x: number; y: number; small?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${small ? 0.7 : 1})`} fill="#2fae7a" stroke={INK} strokeWidth="3" strokeLinejoin="round">
      <circle cx="-8" cy="-2" r="9" />
      <circle cx="7" cy="-3" r="10" />
    </g>
  );
}

/** Nuage doux, posé sur une île verrouillée. */
export function Cloud79({ className = "" }: { className?: string }) {
  return (
    <svg className={`p79-cloud ${className}`} viewBox="0 0 120 60" aria-hidden="true" focusable="false">
      <path d="M22 52a16 16 0 01-1-31 24 24 0 0146-6 20 20 0 0115 37H22z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
