export type BlockType = 'AVANCER' | 'GAUCHE' | 'DROITE' | 'REPETER' | 'SI';

export interface InstructionBlock {
  id: string; // Unique identifier for dnd
  type: BlockType;
  // properties for repetition or condition could go here later
}

export type PalouExpression = 
  | 'Normal'
  | 'Reflexion'
  | 'Curiosite'
  | 'Joie'
  | 'Encouragement'
  | 'Surprise'
  | 'Triste'
  | 'Calme';

export interface Position {
  x: number;
  y: number;
}

export interface GridState {
  palouPos: Position;
  palouDir: 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';
  starPos: Position;
  obstacles: Position[];
  width: number;
  height: number;
}

export interface LevelData {
  id: number;
  title: string;
  objective: string;
  hint?: string;
  availableBlocks: BlockType[];
  initialGrid: GridState;
  expectedOutcome: 'REACH_STAR'; // could add more later
}
