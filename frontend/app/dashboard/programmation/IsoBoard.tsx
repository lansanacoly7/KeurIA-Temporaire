"use client";

import React from "react";

/**
 * Plateau de l'Atelier : une grille simple aux couleurs de la page (lime, vert profond, crème, ambre),
 * avec un léger relief (chaque case a une tranche) et une ombre douce. Droite = vers la droite, bas = vers l'enfant.
 */

export interface Pos { x: number; y: number }
type Dir = "UP" | "RIGHT" | "DOWN" | "LEFT";

const CELL = 100;
const EDGE = 10; // épaisseur visible de chaque case
const GRID = 6;
const PAD = 22;  // marge du socle crème

const px = (x: number) => PAD + x * CELL + CELL / 2;
const py = (y: number) => PAD + y * CELL + (CELL - EDGE) / 2;

interface BoardProps {
  grid: { palouPos: Pos; starPos: Pos; obstacles: Pos[]; width: number; height: number };
  palouPos: Pos;
  palouDir: Dir;
  palouImage: string;
  /** Obstacles apparus avec cette mission : ils clignotent un instant. */
  newObstacles?: Pos[];
}

const same = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;
const STAR = "M0 -26L8 -9L27 -7L13 6L17 25L0 15L-17 25L-13 6L-27 -7L-8 -9Z";

export default function IsoBoard({ grid, palouPos, palouDir, palouImage, newObstacles = [] }: BoardProps) {
  const size = PAD * 2 + GRID * CELL;
  const front = {
    x: palouPos.x + (palouDir === "RIGHT" ? 1 : palouDir === "LEFT" ? -1 : 0),
    y: palouPos.y + (palouDir === "DOWN" ? 1 : palouDir === "UP" ? -1 : 0),
  };
  const showFront = front.x >= 0 && front.y >= 0 && front.x < GRID && front.y < GRID;
  const angle = palouDir === "RIGHT" ? 0 : palouDir === "DOWN" ? 90 : palouDir === "LEFT" ? 180 : 270;

  return (
    <svg className="iso-board" viewBox={`0 0 ${size} ${size + 16}`} role="img" aria-label="Le plateau de Palou" style={{ width: "100%", maxWidth: 560, height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="ib-top-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D6F55F" /><stop offset="1" stopColor="#C2EB45" /></linearGradient>
        <linearGradient id="ib-top-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#CBF04E" /><stop offset="1" stopColor="#B7E43C" /></linearGradient>
        <linearGradient id="ib-block" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FBBF24" /><stop offset="1" stopColor="#F59E0B" /></linearGradient>
        <linearGradient id="ib-star" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE680" /><stop offset="1" stopColor="#F5A70B" /></linearGradient>
        <filter id="ib-drop" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#0E3A2E" floodOpacity=".22" /></filter>
      </defs>

      {/* socle crème, comme les cartes de la page */}
      <g filter="url(#ib-drop)">
        <rect x={0} y={14} width={size} height={size} rx={28} fill="#CFC6A3" />
        <rect x={0} y={0} width={size} height={size} rx={28} fill="#F4EFDC" stroke="#E4DEC6" strokeWidth={4} />
      </g>

      {/* cases */}
      {Array.from({ length: GRID * GRID }, (_, i) => {
        const x = i % GRID;
        const y = Math.floor(i / GRID);
        const left = PAD + x * CELL + 3;
        const top = PAD + y * CELL + 3;
        const w = CELL - 6;
        const h = CELL - 6 - EDGE;
        const start = same({ x, y }, grid.palouPos);
        return (
          <g key={i}>
            <rect x={left} y={top + EDGE} width={w} height={h} rx={14} fill="#86B027" />
            <rect x={left} y={top} width={w} height={h} rx={14} fill={start ? "#FEF3C7" : (x + y) % 2 ? "url(#ib-top-b)" : "url(#ib-top-a)"} />
            <rect x={left + 2} y={top + 2} width={w - 4} height={h - 4} rx={12} fill="none" stroke="#FFFFFF" strokeOpacity=".4" strokeWidth={2} />
          </g>
        );
      })}

      {/* départ */}
      <g transform={`translate(${px(grid.palouPos.x) - 26} ${py(grid.palouPos.y) + 18})`}>
        <rect x={-2} y={-34} width={4} height={36} rx={2} fill="#174E49" />
        <path d="M2 -34l22 7-22 9z" fill="#174E49" />
      </g>

      {/* flèche : là où Palou regarde */}
      {showFront && (
        <g transform={`translate(${px(front.x)} ${py(front.y)}) rotate(${angle})`}>
          {/* L'animation est sur un groupe intérieur : sur le même groupe, elle écraserait la position et la rotation. */}
          <g className="iso-arrow">
            <path d="M-14 -13L12 0 -14 13 -7 0Z" fill="#174E49" opacity=".55" />
          </g>
        </g>
      )}

      {/* étoile d'arrivée */}
      <ellipse className="iso-ring" cx={px(grid.starPos.x)} cy={py(grid.starPos.y) + 16} rx={34} ry={13} fill="#174E49" opacity=".18" />
      <g className="iso-star" style={{ transformOrigin: `${px(grid.starPos.x)}px ${py(grid.starPos.y)}px` }}>
        <g transform={`translate(${px(grid.starPos.x)} ${py(grid.starPos.y) - 4})`}>
          <path d={STAR} transform="translate(0 5)" fill="#B45309" />
          <path d={STAR} fill="url(#ib-star)" stroke="#F5A70B" strokeWidth={2} strokeLinejoin="round" />
        </g>
      </g>

      {/* obstacles : des blocs d'ambre */}
      {grid.obstacles.map(o => (
        <g key={`${o.x}-${o.y}`} className={newObstacles.some(n => same(n, o)) ? "iso-flash" : undefined} transform={`translate(${px(o.x)} ${py(o.y)})`}>
          <ellipse cx={0} cy={30} rx={34} ry={9} fill="#0E3A2E" opacity=".22" />
          <rect x={-33} y={-8} width={66} height={36} rx={10} fill="#D97706" />
          <rect x={-33} y={-26} width={66} height={30} rx={10} fill="url(#ib-block)" />
          <rect x={-29} y={-23} width={58} height={8} rx={4} fill="#FFFFFF" opacity=".35" />
        </g>
      ))}

      {/* Palou */}
      <g className="iso-palou" style={{ transform: `translate(${px(palouPos.x)}px, ${py(palouPos.y) + 26}px)` }}>
        <ellipse cx={0} cy={2} rx={30} ry={9} fill="#0E3A2E" opacity=".3" />
        <g transform={palouDir === "LEFT" ? "scale(-1 1)" : undefined}>
          <image href={palouImage} x={-42} y={-102} width={84} height={108} preserveAspectRatio="xMidYMax meet" />
        </g>
      </g>
    </svg>
  );
}
