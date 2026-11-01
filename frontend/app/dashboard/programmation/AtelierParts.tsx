"use client";

import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical, ArrowRight, CornerUpLeft, CornerUpRight, Repeat, HelpCircle } from 'lucide-react';
import { randomInt, randomFloat } from "../../utils/random";
import { ASTNode, BlockType, InstructionBlock, LevelData } from "./AtelierShared";

// --- DATA ---
// RÈGLE DE DESIGN STRICTE :
// Toute la continuité du jeu se fera sur cette taille de grille (6x6).
// On n'augmentera plus la taille de la grille au cours de l'évolution du jeu,
// même lorsque de nouvelles fonctionnalités seront débloquées.
export const LEVELS: LevelData[] = [
  {
    id: 1,
    category: "Séquences",
    title: "Va vers l'étoile",
    subtitle: "Apprends à faire avancer Palou de 3 cases pour toucher l'étoile.",
    objective: "Place 3 blocs AVANCER consécutifs.",
    hint: "Dépose 3 blocs AVANCER dans le programme.",
    availableBlocks: ['AVANCER'],
    lockedBlocks: ['GAUCHE', 'DROITE', 'REPETER'],
    initialGrid: { palouPos: { x: 0, y: 3 }, palouDir: 'RIGHT', starPos: { x: 3, y: 3 }, obstacles: [], width: 6, height: 6 }, targetBlocks: 3
  },
  {
    id: 2,
    category: "Directions",
    title: "Tourne à gauche",
    subtitle: "Utilise le bloc GAUCHE pour changer de direction.",
    objective: "Avance 2 cases, tourne à GAUCHE, avance 2 cases.",
    hint: "AVANCER, AVANCER, GAUCHE, AVANCER, AVANCER.",
    availableBlocks: ['AVANCER', 'GAUCHE'],
    lockedBlocks: ['DROITE', 'REPETER'],
    initialGrid: { palouPos: { x: 1, y: 4 }, palouDir: 'RIGHT', starPos: { x: 3, y: 2 }, obstacles: [], width: 6, height: 6 }, targetBlocks: 5
  },
  {
    id: 3,
    category: "Combinaisons",
    title: "Le zigzag",
    subtitle: "Combine GAUCHE et DROITE pour un chemin en Z.",
    objective: "Avance 2, tourne à GAUCHE, avance 2, tourne à DROITE, avance 1.",
    hint: "AVANCER×2, GAUCHE, AVANCER×2, DROITE, AVANCER.",
    availableBlocks: ['AVANCER', 'GAUCHE', 'DROITE'],
    lockedBlocks: ['REPETER', 'FIN_REPETER'],
    initialGrid: { palouPos: { x: 1, y: 4 }, palouDir: 'RIGHT', starPos: { x: 4, y: 2 }, obstacles: [], width: 6, height: 6 }, targetBlocks: 6
  },
  {
    id: 4,
    category: "Boucles",
    title: "La boucle magique",
    subtitle: "Découvre le bloc REPETER pour répéter une séquence.",
    objective: "Utilise REPETER pour avancer de 4 cases d'un coup.",
    hint: "Mets un bloc REPETER contenant AVANCER×4 puis FIN REPETER.",
    availableBlocks: ['AVANCER', 'GAUCHE', 'DROITE', 'REPETER', 'FIN_REPETER'],
    lockedBlocks: ['SI', 'FIN_SI'],
    initialGrid: { palouPos: { x: 0, y: 1 }, palouDir: 'RIGHT', starPos: { x: 4, y: 1 }, obstacles: [], width: 6, height: 6 }, targetBlocks: 3
  },
  {
    id: 5,
    category: "Conditions",
    title: "Le grand défi",
    subtitle: "Tous les blocs sont débloqués, crée le chemin le plus rapide.",
    objective: "Atteindre l'étoile en évitant les obstacles.",
    hint: "Combine AVANCER, GAUCHE, DROITE, REPETER et SI pour résoudre.",
    availableBlocks: ['AVANCER', 'GAUCHE', 'DROITE', 'REPETER', 'FIN_REPETER', 'SI', 'FIN_SI'],
    lockedBlocks: [],
    initialGrid: { palouPos: { x: 0, y: 4 }, palouDir: 'UP', starPos: { x: 4, y: 0 }, obstacles: [{ x: 2, y: 2 }], width: 6, height: 6 }, targetBlocks: 8
  }
];

export const BLOCK_CONFIG: Record<BlockType, { label: string, className: string, icon: React.ReactNode }> = {
  AVANCER: { label: 'AVANCER', className: 'block-avancer', icon: <ArrowRight size={20} /> },
  GAUCHE: { label: 'TOURNER GAUCHE', className: 'block-gauche', icon: <CornerUpLeft size={20} /> },
  DROITE: { label: 'TOURNER DROITE', className: 'block-droite', icon: <CornerUpRight size={20} /> },
  REPETER: { label: 'RÉPÉTER (4x)', className: 'block-repeter', icon: <Repeat size={20} /> },
  FIN_REPETER: { label: 'FIN RÉPÉTER', className: 'block-repeter', icon: <CornerUpLeft size={20} style={{ transform: 'rotate(-90deg)' }} /> },
  SI: { label: 'SI obstacle', className: 'block-si', icon: <HelpCircle size={20} /> },
  FIN_SI: { label: 'FIN SI', className: 'block-si', icon: <CornerUpLeft size={20} style={{ transform: 'rotate(-90deg)' }} /> }
};

export function buildAST(prog: InstructionBlock[]): ASTNode[] {
  const root: ASTNode[] = [];
  const stack: ASTNode[][] = [root];

  for (let i = 0; i < prog.length; i++) {
    const b = prog[i];
    if (b.type === 'REPETER' || b.type === 'SI') {
      const node: ASTNode = { type: b.type, originalIndex: i, children: [] };
      stack[stack.length - 1].push(node);
      stack.push(node.children!);
    } else if (b.type === 'FIN_REPETER' || b.type === 'FIN_SI') {
      if (stack.length > 1) stack.pop(); // Close block
    } else {
      stack[stack.length - 1].push({ type: b.type, originalIndex: i });
    }
  }
  return root;
}

// --- DND KIT COMPONENT ---
export function SortableBlock({ block, indent, onRemove }: { block: InstructionBlock; indent: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${indent * 20}px`,
  };
  const config = BLOCK_CONFIG[block.type];

  return (
    <div ref={setNodeRef} style={style} className={`prog-block ${config.className} ${isDragging ? 'dragging' : ''}`}>
      <div {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
        <GripVertical size={16} style={{ marginRight: 8, opacity: 0.7 }} />
      </div>
      {config.icon}
      <span style={{ flex: 1 }}>{config.label}</span>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }} title="Supprimer">
        <X size={16} />
      </button>
    </div>
  );
}

// --- DECORATIVE DIVIDER ---
export const DecorativeDivider = ({ mascot, buttonText, onButtonClick, style, enableHints = true }: { mascot?: string, buttonText?: React.ReactNode, onButtonClick?: () => void, style?: React.CSSProperties, enableHints?: boolean }) => {
  const [currentMascot, setCurrentMascot] = useState(mascot);
  const [activeHint, setActiveHint] = useState<string | null>(null);

  useEffect(() => {
    if (!mascot) return;

    const expressions = [
      '/images/palou/game-palou-joie.png',
      '/images/palou/game-palou-reflexion.png',
      '/images/palou/game-palou-curiosite.png',
      '/images/palou/game-palou-surprise.png',
      mascot
    ];

    const hints = [
      "Tu vas y arriver !",
      "Prends ton temps !",
      "Code comme un pro !",
      "Super !",
      "Un bug ? Cherche bien !"
    ];

    const interval = setInterval(() => {
      setCurrentMascot(expressions[randomInt(expressions.length)]);

      if (enableHints && randomFloat() > 0.5 && !activeHint) {
        setActiveHint(hints[randomInt(hints.length)]);
        setTimeout(() => setActiveHint(null), 4000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [mascot, activeHint, enableHints]);

  return (
    <div className="prog-decorative-divider" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '60px 0 30px', position: 'relative', width: '100%', ...style }}>

      {currentMascot && (
        <div className="prog-divider-mascot-wrap" style={{ position: 'absolute', left: '8%', bottom: '-26px', zIndex: 5, animation: 'kiFloatSlow 4s ease-in-out infinite' }}>
          {activeHint && (
            <div className="prog-divider-bubble" style={{
              position: 'absolute', bottom: 'calc(100% + 2px)', left: '50%', transform: 'translateX(-20%)',
              background: '#FFF', padding: '6px 10px', borderRadius: '12px 12px 12px 0',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)', border: '2px solid #C8F24D',
              color: '#144C3A', fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap',
              animation: 'kiPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', zIndex: 10
            }}>
              {activeHint}
            </div>
          )}
          <img src={currentMascot} alt="Palou" style={{ height: '62px', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.15))', transition: 'all 0.3s', display: 'block' }} />
        </div>
      )}

      <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, transparent, #DCE9AE)' }}></div>
      <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: 8, height: 8, background: '#C8F24D', transform: 'rotate(45deg)', borderRadius: '1px' }}></div>
        <div style={{ width: 14, height: 14, background: '#174E49', transform: 'rotate(45deg)', borderRadius: '2px', opacity: 0.8 }}></div>
        <div style={{ width: 8, height: 8, background: '#C8F24D', transform: 'rotate(45deg)', borderRadius: '1px' }}></div>
      </div>
      <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, #DCE9AE, transparent)' }}></div>

      {buttonText && (
        <div className="prog-divider-action" style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
          <button
            onClick={onButtonClick}
            className="prog-divider-btn"
            style={{ background: '#FEF3C7', border: '2px solid #F59E0B', borderRadius: '16px', padding: '10px 20px', color: '#92400E', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 0 #F59E0B', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.1s' }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 0 0 #F59E0B'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 #F59E0B'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 #F59E0B'; }}
          >
            {buttonText}
          </button>
        </div>
      )}
    </div>
  );
};

// Fait défiler l'écran doucement jusqu'à l'atelier de programmation (comme sur Mes modules et Jeux & défis)
export function chaseNode(el: HTMLElement, ms: number = 1500) {
  if (typeof requestAnimationFrame !== "function") return () => {};
  let scroller: HTMLElement | null = null;
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (p === document.body || p === document.documentElement) break;
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight + 1) {
      scroller = p;
      break;
    }
  }
  const end = performance.now() + ms;
  let raf = 0;
  const tick = (now: number) => {
    const r = el.getBoundingClientRect();
    const viewHeight = scroller ? scroller.clientHeight : window.innerHeight;
    const viewTop = scroller ? scroller.getBoundingClientRect().top : 0;

    // Aligne confortablement l'atelier dans le champ de vision (ou le centre)
    const targetDelta = (r.height + 60 > viewHeight)
      ? (r.top - viewTop - 30)
      : (r.top + r.height / 2 - (viewTop + viewHeight / 2));

    if (Math.abs(targetDelta) > 1) {
      const step = targetDelta * 0.15;
      if (scroller) scroller.scrollTop += step;
      window.scrollBy(0, step);
    }
    if (now < end) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
