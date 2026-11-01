"use client";

import './programmation.css';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Play, RotateCcw, X, HelpCircle, Lock, Check, Code2, Laptop, Settings, ChevronDown, ArrowRight, Maximize2, Pencil } from 'lucide-react';
import { ScratchEmbed } from './ScratchEmbed';
import IsoBoard from './IsoBoard';
import { BLOCK_CONFIG, DecorativeDivider, LEVELS, SortableBlock, buildAST, chaseNode } from "./AtelierParts";
import { ASTNode, BlockType, InstructionBlock, Position } from "./AtelierShared";
import { ScrollDownHint } from "../components/ScrollDownHint";

export type PalouExpression = 'Normal' | 'Reflexion' | 'Curiosite' | 'Joie' | 'Encouragement' | 'Surprise' | 'Triste' | 'Calme';

// --- MAIN COMPONENT ---
export default function ProgrammingAtelier({ scope = "invite" }: { scope?: string }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [unlockedLevel, setUnlockedLevel] = useState(0);
  const level = LEVELS[levelIndex];

  // Références pour le défilement doux automatique vers l'atelier de programmation
  const layoutRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  const [program, setProgram] = useState<InstructionBlock[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Game State
  const [palouPos, setPalouPos] = useState<Position>(level.initialGrid.palouPos);
  const [palouDir, setPalouDir] = useState<'UP' | 'RIGHT' | 'DOWN' | 'LEFT'>(level.initialGrid.palouDir);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeInstructionIndex, setActiveInstructionIndex] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState<'success' | 'fail' | null>(null);
  const [showPalouHint, setShowPalouHint] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [showScratchStudio, setShowScratchStudio] = useState(false);

  // Progression gardée sur l'appareil (clé « keria_… », effacée à la déconnexion).
  const saveKey = `keria_prog_atelier_${scope.replace(/[^a-z0-9_-]/gi, "_").toLowerCase()}`;
  const [loaded, setLoaded] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(false);
  const [failCount, setFailCount] = useState(0);

  // État du parcours mobile (Option 1) :
  // 'explore' : observation du plateau et des obstacles en grand format
  // 'build' : plateau en miniature compacte + atelier de construction (Commandes & Programme)
  // 'play' : plateau ré-agrandi pour savourer l'exécution de Palou
  const [mobileStep, setMobileStep] = useState<'explore' | 'build' | 'play'>('explore');

  // Aucun défilement automatique forcé à l'arrivée pour laisser l'enfant explorer la page
  useEffect(() => {
    // La page reste stable en haut à l'ouverture
  }, [levelIndex]);

  // Au chargement : on reprend là où l'enfant s'était arrêté.
  useEffect(() => {
    let saved: { level?: number; unlocked?: number; tutorialSeen?: boolean } | null = null;
    try { saved = JSON.parse(window.localStorage.getItem(saveKey) || "null"); } catch { saved = null; }
    if (saved) {
      const unlocked = Math.min(Math.max(0, saved.unlocked ?? 0), LEVELS.length - 1);
      setUnlockedLevel(unlocked);
      setLevelIndex(Math.min(Math.max(0, saved.level ?? 0), unlocked));
      setTutorialSeen(!!saved.tutorialSeen);
    }
    setLoaded(true);
  }, [saveKey]);

  useEffect(() => {
    if (!loaded) return;
    try { window.localStorage.setItem(saveKey, JSON.stringify({ level: levelIndex, unlocked: unlockedLevel, tutorialSeen })); } catch { /* stockage bloqué : la visite continue sans sauvegarde */ }
  }, [loaded, saveKey, levelIndex, unlockedLevel, tutorialSeen]);

  const closeTutorial = () => {
    setShowTutorial(false);
    setTutorialSeen(true);
    const targetEl = layoutRef.current || sceneRef.current;
    if (targetEl) chaseNode(targetEl, 1200);
    // Les nouveaux blocs débloqués clignotent un instant une fois le tutoriel refermé.
    if (showUnlockAnimation) setTimeout(() => setShowUnlockAnimation(false), 4000);
  };

  // Execution queue
  const [executionHistory, setExecutionHistory] = useState<{ pos: Position, dir: 'UP' | 'RIGHT' | 'DOWN' | 'LEFT', originalIndex: number }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [palouExpression, setPalouExpression] = useState<PalouExpression>('Normal');

  const resetGrid = useCallback(() => {
    setPalouPos(level.initialGrid.palouPos);
    setPalouDir(level.initialGrid.palouDir);
    setIsPlaying(false);
    setActiveInstructionIndex(null);
    setExecutionHistory([]);
    setHistoryIndex(0);
    setPalouExpression('Normal');
    setShowOverlay(null);
    setShowPalouHint(false);
  }, [level.initialGrid.palouPos, level.initialGrid.palouDir]);

  useEffect(() => {
    resetGrid();
    setProgram([]);
    setShowOverlay(null);
    setShowPalouHint(false);
    setFailCount(0);
    setMobileStep('explore');
  }, [levelIndex, resetGrid]);

  const getBlockIndent = (index: number) => {
    let indent = 0;
    for (let i = 0; i < index; i++) {
      if (program[i].type === 'REPETER' || program[i].type === 'SI') indent++;
      if (program[i].type === 'FIN_REPETER' || program[i].type === 'FIN_SI') indent = Math.max(0, indent - 1);
    }
    return indent;
  };

  // Execution Planner
  const executeProgram = () => {
    resetGrid();
    setIsPlaying(true);

    let currentPos = { ...level.initialGrid.palouPos };
    let currentDir = level.initialGrid.palouDir;
    const history: typeof executionHistory = [];

    const ast = buildAST(program);
    let loopCount = 0; // Prevent infinite loops in simulation

    const evaluate = (nodes: ASTNode[]) => {
      if (loopCount > 100) return; // Safety

      for (const node of nodes) {
        if (node.type === 'AVANCER') {
          let nx = currentPos.x;
          let ny = currentPos.y;
          if (currentDir === 'UP') ny--;
          if (currentDir === 'DOWN') ny++;
          if (currentDir === 'LEFT') nx--;
          if (currentDir === 'RIGHT') nx++;

          // Collision check
          if (nx >= 0 && nx < level.initialGrid.width && ny >= 0 && ny < level.initialGrid.height) {
            const isObstacle = level.initialGrid.obstacles.some(o => o.x === nx && o.y === ny);
            if (!isObstacle) {
              currentPos = { x: nx, y: ny };
            }
          }
          history.push({ pos: { ...currentPos }, dir: currentDir, originalIndex: node.originalIndex });
        }
        else if (node.type === 'GAUCHE') {
          const dirs: ('UP' | 'LEFT' | 'DOWN' | 'RIGHT')[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
          currentDir = dirs[(dirs.indexOf(currentDir) + 1) % 4];
          history.push({ pos: { ...currentPos }, dir: currentDir, originalIndex: node.originalIndex });
        }
        else if (node.type === 'DROITE') {
          const dirs: ('UP' | 'RIGHT' | 'DOWN' | 'LEFT')[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
          currentDir = dirs[(dirs.indexOf(currentDir) + 1) % 4];
          history.push({ pos: { ...currentPos }, dir: currentDir, originalIndex: node.originalIndex });
        }
        else if (node.type === 'REPETER') {
          for (let i = 0; i < 4; i++) {
            loopCount++;
            if (node.children) evaluate(node.children);
          }
        }
        else if (node.type === 'SI') {
          // Check obstacle in front
          let nx = currentPos.x;
          let ny = currentPos.y;
          if (currentDir === 'UP') ny--;
          if (currentDir === 'DOWN') ny++;
          if (currentDir === 'LEFT') nx--;
          if (currentDir === 'RIGHT') nx++;
          const isObstacle = level.initialGrid.obstacles.some(o => o.x === nx && o.y === ny);
          if (isObstacle && node.children) {
            evaluate(node.children);
          }
        }
      }
    };

    evaluate(ast);

    // Add an empty step at the end for final state evaluation
    history.push({ pos: { ...currentPos }, dir: currentDir, originalIndex: -1 });

    setExecutionHistory(history);
    setHistoryIndex(0);
  };

  useEffect(() => {
    if (!isPlaying || executionHistory.length === 0) return;

    if (historyIndex >= executionHistory.length) {
      if (palouPos.x === level.initialGrid.starPos.x && palouPos.y === level.initialGrid.starPos.y) {
        setPalouExpression('Joie');
        setShowOverlay('success');
      } else {
        setPalouExpression('Surprise');
        setShowPalouHint(true);
        setFailCount(c => c + 1);
      }
      setIsPlaying(false);
      setActiveInstructionIndex(null);
      return;
    }

    const timer = setTimeout(() => {
      const step = executionHistory[historyIndex];
      setPalouPos(step.pos);
      setPalouDir(step.dir);
      setActiveInstructionIndex(step.originalIndex);
      setHistoryIndex(prev => prev + 1);
    }, 600);

    return () => clearTimeout(timer);
  }, [isPlaying, historyIndex, executionHistory, palouPos, level]);

  const getPalouImage = (expr: PalouExpression = palouExpression) => {
    switch (expr) {
      case 'Joie': return '/images/palou/game-palou-joie.png';
      case 'Reflexion': return '/images/palou/game-palou-reflexion.png';
      case 'Curiosite': return '/images/palou/game-palou-curiosite.png';
      case 'Surprise': return '/images/palou/game-palou-surprise.png';
      case 'Triste': return '/images/palou/game-palou-triste.png';
      default: return '/images/palou/game-palou-lion.png';
    }
  };




  const starDistance = Math.abs(palouPos.x - level.initialGrid.starPos.x) + Math.abs(palouPos.y - level.initialGrid.starPos.y);
  const isLastLevel = levelIndex === LEVELS.length - 1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div className="prog-container">

      {/* PAGE HEADER */}
      <section className="prog-hero-banner" style={{ position: "relative", overflow: "hidden", borderRadius: 28, background: "linear-gradient(160deg,#0E4B3C 0%,#13624E 58%,#17715A 100%)", color: "#fff", padding: "26px 30px", display: "flex", alignItems: "center", gap: 24, minHeight: 196, marginBottom: 20, boxShadow: "0 12px 0 #DCE9AE, 0 10px 30px rgba(0,0,0,0.05)", flexShrink: 0 }}>
        <svg viewBox="0 0 1100 220" preserveAspectRatio="xMidYMax slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }} aria-hidden="true">
          <circle cx="930" cy="42" r="30" fill="#F7C948" opacity={0.55} />
          <path d="M0 220 L0 158 C120 128 230 168 350 150 C480 130 560 166 700 148 C820 132 980 162 1100 140 L1100 220 Z" fill="#0A3B30" />
          <path d="M0 220 L0 190 C160 170 320 200 500 186 C680 172 900 198 1100 180 L1100 220 Z" fill="#08322a" />
        </svg>

        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".17em", color: "#D7F26B", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Laptop size={14} /> PROGRAMMATION CRÉATIVE
          </div>
          <h1 className="prog-page-header-content" style={{ fontSize: 38, fontWeight: 700, margin: "7px 0 0", lineHeight: 1.02 }}>L'Atelier de Code de Palou</h1>
          <p style={{ fontSize: 16, color: "#DCEBC2", margin: "9px 0 16px 0", maxWidth: 520, lineHeight: 1.45 }}>Assemble les blocs pour créer ton propre programme et réussir les missions !</p>
        </div>

        <div className="prog-hero-mascot" style={{ position: "relative", flex: "none", animation: "kiFloatSlow 5s ease-in-out infinite" }}>
          <img src="/palou/Joie.png" alt="Palou" style={{ width: 190, display: "block", filter: "drop-shadow(0 12px 16px rgba(0,0,0,.28))" }} />
        </div>
      </section>


      {/* PROGRESSION BAR */}
      <header className="prog-header" style={{ marginBottom: 20 }}>
        <div className="prog-progression-bar">
          {LEVELS.map((l, i) => (
            <React.Fragment key={l.id}>
              <div
                className={`prog-level-step ${levelIndex === i ? 'active' : ''} ${i > unlockedLevel ? 'locked' : ''}`}
                onClick={() => {
                  if (i <= unlockedLevel) {
                    setLevelIndex(i);
                    setShowUnlockAnimation(false);
                    setShowTutorial(true);
                  }
                }}
              >
                {i <= unlockedLevel ? <Check size={16} /> : <Lock size={16} />}
                {l.category}
              </div>
              {i < LEVELS.length - 1 && <div className="prog-level-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      </header>

      <DecorativeDivider
        mascot="/images/palou/game-palou-curiosite.png"
        buttonText={<><HelpCircle size={18} /> Besoin d'aide ?</>}
        onButtonClick={() => setShowTutorial(true)}
        enableHints={false}
      />

      {/* BANDEAU SCRATCH */}
      <div className="prog-scratch-card" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#FFFBEB',
        padding: '16px 24px',
        borderRadius: '20px',
        border: '2px solid #FDE68A',
        marginBottom: '20px',
        boxShadow: '0 4px 0 #FBBF24',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', color: '#B45309' }}><Code2 size={32} /></div>
          <div>
            <h3 style={{ margin: 0, color: '#B45309', fontSize: '18px', fontWeight: 800 }}>Tu veux créer ton propre jeu ?</h3>
            <p style={{ margin: 0, color: '#D97706', fontSize: '15px' }}>Découvre l'environnement complet de Scratch et code librement !</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowScratchStudio(true)}
          className="prog-scratch-btn"
          style={{
            background: '#F59E0B',
            color: '#FFF',
            padding: '12px 24px',
            borderRadius: '16px',
            fontWeight: 800,
            fontSize: '16px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 0 #D97706',
            transition: 'all 0.1s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'inherit'
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 0 0 #D97706'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 #D97706'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 #D97706'; }}
        >
          Ouvrir le Studio Scratch
        </button>
      </div>

      <div className={`prog-main-layout prog-mobile-step-${mobileStep}`} ref={layoutRef} id="prog-main-layout">

        {/* COL 1: PLATEAU */}
        <div className={`prog-col-scene ${mobileStep === 'build' ? 'is-mini' : ''}`} ref={sceneRef} id="prog-board-scene">
          <div className="prog-scene-header">
            <h2>Le monde de Palou</h2>
            {mobileStep === 'build' && (
              <button
                type="button"
                className="prog-scene-expand-btn"
                onClick={() => setMobileStep('explore')}
                title="Agrandir le plateau"
              >
                <Maximize2 size={16} />
                <span>Agrandir</span>
              </button>
            )}
          </div>


          <div className="prog-scene-grid-wrapper">
            <IsoBoard
              grid={level.initialGrid}
              palouPos={palouPos}
              palouDir={palouDir}
              palouImage={getPalouImage()}
              newObstacles={showUnlockAnimation && levelIndex > 0 ? level.initialGrid.obstacles.filter(obs => !LEVELS[levelIndex - 1].initialGrid.obstacles.some(o => o.x === obs.x && o.y === obs.y)) : []}
            />
          </div>

          {/* Action mobile : Bouton JOUER au bas de la miniature de Palou */}
          {mobileStep === 'build' && (
            <div className="prog-mini-play-wrapper">
              <button
                type="button"
                className="prog-play-btn prog-mini-play-btn"
                onClick={() => {
                  setMobileStep('play');
                  executeProgram();
                }}
                disabled={program.length === 0 || isPlaying}
              >
                <Play fill="currentColor" size={20} />
                <span>JOUER ({program.length} bloc{program.length > 1 ? 's' : ''})</span>
              </button>
            </div>
          )}

          {/* Action mobile : Phase 1 EXPLORATION (Observer le plateau en grand) */}
          {mobileStep === 'explore' && (
            <div className="prog-mobile-explore-actions">
              <div className="prog-mobile-explore-desc">
                <span className="prog-mobile-explore-pill">Mission {levelIndex + 1} : {level.title}</span>
                <p>{level.objective || level.subtitle || "Observe bien le plateau et les obstacles pour guider Palou jusqu'à l'étoile !"}</p>
              </div>
              <button
                type="button"
                className="prog-mobile-start-btn"
                onClick={() => setMobileStep('build')}
              >
                <span>🧩 Choisir mes commandes</span>
                <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* Action mobile : Phase 3 PLAY (fin d'animation sans succès) */}
          {mobileStep === 'play' && !isPlaying && !showOverlay && (
            <div className="prog-mobile-play-actions">
              <button
                type="button"
                className="prog-mobile-retry-btn"
                onClick={() => {
                  resetGrid();
                  setMobileStep('build');
                }}
              >
                <Pencil size={18} />
                <span>Modifier mon programme</span>
              </button>
              <button
                type="button"
                className="prog-mobile-restart-btn"
                onClick={resetGrid}
                title="Recommencer la position"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          )}

          {/* Bouton JOUER classique (Desktop & Mode Play) */}
          <div className="prog-play-btn-wrapper" style={{ padding: "0 40px", marginBottom: 20, marginTop: "auto", display: "flex", justifyContent: "center" }}>
            <button
              onClick={() => {
                setMobileStep('play');
                executeProgram();
              }}
              disabled={program.length === 0 || isPlaying}
              className={`prog-play-btn ${isPlaying ? 'playing' : ''}`}
            >
              <Play fill="currentColor" size={24} /> {isPlaying ? 'En cours...' : 'JOUER'}
            </button>
          </div>
        </div>

        {/* COL 2: MON PROGRAMME */}
        <div className="prog-col-program">
          <div className="prog-card-programme" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>Mon Programme</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Construis ta suite logique ici</p>
              </div>
              {program.length > 0 && (
                <button
                  type="button"
                  onClick={() => setProgram([])}
                  className="prog-clear-btn"
                  title="Effacer tous les blocs"
                >
                  Tout effacer
                </button>
              )}
            </div>

            {/* Version Bureau / Desktop : Drag & Drop vertical standard */}
            <div className="prog-dropzone-wrapper prog-desktop-dropzone">
              {program.length === 0 ? (
                <div className="prog-dropzone-empty">
                  Appuie sur les blocs ci-dessous pour les ajouter ici
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={(e) => {
                  setActiveId(null);
                  if (e.over && e.active.id !== e.over.id) {
                    setProgram(items => arrayMove(items, items.findIndex(i => i.id === e.active.id), items.findIndex(i => i.id === e.over?.id)));
                  }
                }}>
                  <SortableContext items={program.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {program.map((block, index) => (
                        <div key={block.id} className={`prog-program-slot ${activeInstructionIndex === index ? 'active' : ''}`}>
                          <div className="prog-slot-number">{index + 1}</div>
                          <div style={{ flex: 1 }}>
                            <SortableBlock block={block} indent={getBlockIndent(index)} onRemove={() => setProgram(program.filter(b => b.id !== block.id))} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? <SortableBlock block={program.find(b => b.id === activeId)!} indent={getBlockIndent(program.findIndex(b => b.id === activeId))} onRemove={() => { }} /> : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>

            {/* Version Mobile : Ruban compact fléché multi-lignes */}
            <div className="prog-mobile-program-tape">
              {program.length === 0 ? (
                <div className="prog-mobile-tape-empty">
                  Appuie sur les blocs ci-dessous pour construire ta suite logique !
                </div>
              ) : (
                <div className="prog-mobile-tape-list">
                  {program.map((block, index) => {
                    const config = BLOCK_CONFIG[block.type];
                    const isActive = activeInstructionIndex === index;
                    return (
                      <React.Fragment key={block.id}>
                        <div
                          className={`prog-tape-chip ${config.className} ${isActive ? 'active-pulse' : ''}`}
                          title={`Étape ${index + 1} : ${config.label}`}
                        >
                          <span className="prog-tape-number">{index + 1}</span>
                          <span className="prog-tape-icon">{config.icon}</span>
                          <button
                            type="button"
                            className="prog-tape-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProgram(program.filter((_, i) => i !== index));
                            }}
                            title={`Supprimer l'étape ${index + 1}`}
                          >
                            <X size={10} strokeWidth={3} />
                          </button>
                        </div>
                        {index < program.length - 1 && (
                          <div className="prog-tape-arrow" aria-hidden="true">
                            <ArrowRight size={14} />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COL 3: MES COMMANDES */}
        <div className="prog-col-commands">
          <div className="prog-card-commandes">
            <h2>Mes Commandes</h2>
            <div className="prog-palette">
              {(Object.keys(BLOCK_CONFIG) as BlockType[]).map(type => {
                const config = BLOCK_CONFIG[type];
                const isAvailable = level.availableBlocks.includes(type);

                let isNewlyUnlocked = false;
                if (showUnlockAnimation && levelIndex > 0) {
                  const prevLevel = LEVELS[levelIndex - 1];
                  isNewlyUnlocked = isAvailable && !prevLevel.availableBlocks.includes(type);
                }

                if (isAvailable) {
                  return (
                    <div
                      key={type}
                      onClick={() => setProgram([...program, { id: `${type}-${Date.now()}`, type }])}
                      className={`prog-block ${config.className} ${isNewlyUnlocked ? 'prog-newly-unlocked' : ''}`}
                      style={{ cursor: 'pointer' }}
                    >
                      {config.icon}
                      <span style={{ flex: 1 }}>{config.label}</span>
                    </div>
                  );
                } else {
                  return (
                    <div key={type} className={`prog-block ${config.className} locked`}>
                      {config.icon}
                      <span style={{ flex: 1 }}>{config.label}</span>
                      <Lock size={16} />
                    </div>
                  );
                }
              })}
            </div>


            <div style={{ marginTop: 'auto', paddingTop: 20 }}>
              <button
                onClick={() => setShowTutorial(true)}
                style={{
                  width: '100%', padding: '12px', borderRadius: '12px', background: '#F7C948', color: '#174E49',
                  border: 'none', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 0 #E3B332',
                  animation: levelIndex === 0 ? 'kiPulseButton 2s infinite' : 'none'
                }}
              >
                <HelpCircle size={20} />
                Comment jouer ?
              </button>
            </div>

          </div>
        </div>

      </div>

      <DecorativeDivider
        mascot="/images/palou/game-palou-reflexion.png"
        buttonText="Découvrir le Lexique ↓"
        onButtonClick={() => document.querySelector('.prog-footer')?.scrollIntoView({ behavior: 'smooth' })}
        style={{ marginTop: 65, marginBottom: 25 }}
      />

      {/* FOOTER : LES COULISSES ET LE LEXIQUE */}
      <footer className="prog-footer">
        <div className="prog-footer-underground">
          <div className="prog-gear prog-gear-1" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Settings size={28} /></div>
          <div className="prog-gear prog-gear-2" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Settings size={22} /></div>
          <div className="prog-wire"></div>

          <div className="prog-footer-content">
            <div className="prog-footer-conseil">
              <img src="/images/palou/game-palou-reflexion.png" alt="Palou bricole" />
              <div>
                <h3>Le Conseil de Palou</h3>
                <p>Un bon codeur ne se décourage jamais ! Si ça ne marche pas, c'est juste un <strong>bug</strong> qui joue à cache-cache. Essaie de lire ton programme bloc par bloc pour le trouver.</p>
              </div>
            </div>

            <div className="prog-footer-lexique">
              <h3>Le Dico du Codeur</h3>
              <div className="prog-lexique-grid">
                <div className="prog-lexique-card">
                  <h4>Séquence</h4>
                  <p>Une suite d'actions exécutées l'une après l'autre, dans l'ordre.</p>
                </div>
                <div className="prog-lexique-card">
                  <h4>Boucle</h4>
                  <p>Un bloc magique qui permet de répéter des actions plusieurs fois.</p>
                </div>
                <div className="prog-lexique-card">
                  <h4>Condition</h4>
                  <p>Une règle "SI" qui permet à Palou de faire un choix dans son code.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* OVERLAYS */}
      {showOverlay === 'success' && (
        <div className="prog-overlay" style={{ background: 'rgba(209, 250, 229, 0.9)' }}>
          <div className="prog-overlay-content">
            <img src={getPalouImage('Joie')} alt="Bravo" style={{ width: 120, animation: 'kiPop 0.5s' }} />
            <h2 style={{ color: '#047857', fontSize: 32, margin: '20px 0' }}>{isLastLevel ? "Bravo ! Tu as terminé toutes les missions !" : "Super ! Mission accomplie !"}</h2>
            {isLastLevel && <p style={{ color: '#065F46', fontSize: 18, margin: '0 0 20px' }}>Tu sais maintenant donner des ordres, répéter et faire des choix : tu es un vrai codeur !</p>}
            <button onClick={() => {
              setShowOverlay(null);
              if (levelIndex < LEVELS.length - 1) {
                const nextLevel = levelIndex + 1;
                setUnlockedLevel(prev => Math.max(prev, nextLevel));
                setLevelIndex(nextLevel);

                // Le tutoriel de la nouvelle mission s'ouvre tout de suite ; les nouveaux blocs clignotent après sa fermeture.
                setShowUnlockAnimation(true);
                setShowTutorial(true);

              } else {
                // Dernière mission : on propose de revoir les missions depuis le début.
                setLevelIndex(0);
              }
            }} style={{ padding: '15px 30px', fontSize: 20, background: '#10B981', color: '#FFF', border: 'none', borderRadius: '15px', cursor: 'pointer', fontWeight: 900 }}>
              {isLastLevel ? "Revoir les missions" : "Mission Suivante →"}
            </button>
          </div>
        </div>
      )}

      {showPalouHint && (
        <div className="prog-palou-hint-container">
          <img src={getPalouImage('Reflexion')} alt="Palou" className="prog-palou-hint-img" />
          <div className="prog-palou-hint-bubble">
            <h4>Oups, presque !</h4>
            <p>
              Palou s'est arrêté à {starDistance} case{starDistance > 1 ? 's' : ''} de l'étoile. Relis ton programme bloc par bloc.
              {failCount >= 2 && <><br /><strong>Indice :</strong> {level.hint}</>}
            </p>
            <button onClick={() => setShowPalouHint(false)}>D'accord !</button>
          </div>
        </div>
      )}

      {showTutorial && (
        <div className="prog-overlay" style={{ background: 'rgba(23, 78, 73, 0.8)', zIndex: 100 }}>
          <div className="prog-overlay-content" style={{ background: '#FFF', padding: 40, borderRadius: 24, position: 'relative', maxWidth: 400 }}>
            <button onClick={closeTutorial} aria-label="Fermer" style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', cursor: 'pointer', color: '#6C7A63' }}>
              <X size={24} />
            </button>
            <img src="/palou/Curiosite.png" alt="Palou" style={{ width: 120, animation: 'kiPop 0.5s' }} />
            <h2 style={{ color: '#174E49', fontSize: 24, margin: '15px 0' }}>Mission {level.id} : {level.title}</h2>
            <p style={{ fontSize: 18, color: '#4B5563', marginBottom: 20, lineHeight: 1.5 }}>
              {level.subtitle}
            </p>
            <div style={{ background: '#F3F4F6', padding: 15, borderRadius: 12, border: '2px solid #E5E7EB', marginBottom: 20 }}>
              <strong>Objectif :</strong><br />
              {level.objective}
            </div>
            {levelIndex === 0 && (
              <ol style={{ textAlign: 'left', fontSize: 17, color: '#374151', lineHeight: 1.5, margin: '0 0 20px', paddingLeft: 22 }}>
                <li>Touche un bloc dans « Mes Commandes » pour l'ajouter à « Mon Programme ».</li>
                <li>Appuie sur le gros bouton <strong>JOUER</strong>.</li>
                <li>Regarde Palou marcher jusqu'à l'étoile !</li>
              </ol>
            )}
            <button onClick={closeTutorial} style={{ padding: '12px 30px', fontSize: 18, background: '#C8F24D', color: '#0E3A2E', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 900, width: '100%', boxShadow: '0 4px 0 #9DBF3B' }}>
              C'est parti !
            </button>
          </div>
        </div>
      )}

      {showScratchStudio && (
        <ScratchEmbed onClose={() => setShowScratchStudio(false)} />
      )}

      {/* Indicateur de défilement mobile unifié style Keur IA */}
      <ScrollDownHint targetId="prog-main-layout" ariaLabel="Faire défiler vers le plateau de programmation" />

    </div>
  );
}
