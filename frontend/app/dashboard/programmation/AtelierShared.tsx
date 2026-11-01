"use client";



// --- TYPES ---
export type BlockType = 'AVANCER' | 'GAUCHE' | 'DROITE' | 'REPETER' | 'FIN_REPETER' | 'SI' | 'FIN_SI';

export interface InstructionBlock { id: string; type: BlockType; }

export interface Position { x: number; y: number; }

export interface GridState { palouPos: Position; palouDir: 'UP' | 'RIGHT' | 'DOWN' | 'LEFT'; starPos: Position; obstacles: Position[]; width: number; height: number; }

export interface LevelData { id: number; title: string; subtitle: string; objective: string; hint?: string; availableBlocks: BlockType[]; lockedBlocks: BlockType[]; initialGrid: GridState; category: string; targetBlocks: number; }

// --- AST AND EXECUTION LOGIC ---
export interface ASTNode { type: BlockType; originalIndex: number; children?: ASTNode[]; }
