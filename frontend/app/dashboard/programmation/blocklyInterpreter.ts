/**
 * Interprète les blocs de l'atelier Blockly SANS exécuter de JavaScript généré.
 *
 * Avant, le programme de l'enfant était produit en JavaScript puis lancé avec `new Function(...)` : du code exécuté dynamiquement
 * (risque d'injection si un projet devenait un jour partageable) et aucune protection contre une boucle géante qui gèle l'onglet.
 * Ici on parcourt directement l'arbre de blocs : seules les instructions connues s'exécutent, et un budget d'étapes borne la durée.
 *
 * Module pur (aucune dépendance à React ni à Blockly) : testé seul dans frontend/tests/blockly-interpreter.test.mjs.
 */

/** Ce que l'interpréteur lit d'un bloc Blockly (un vrai `Block` convient tel quel). */
export interface BlockLike {
  type: string;
  getFieldValue(name: string): unknown;
  getInputTargetBlock(name: string): BlockLike | null;
  getNextBlock(): BlockLike | null;
}

export interface StageState {
  /** Position horizontale du lutin, en % de la scène. */
  x: number;
  /** Rotation en degrés. */
  angle: number;
  /** Texte dit par le lutin. */
  message: string;
}

export type ProgramFailure = "too_long" | "unsupported_block";

export interface ProgramResult {
  state: StageState;
  /** Nombre d'instructions exécutées. */
  steps: number;
  error?: ProgramFailure;
}

/** Instructions exécutables au plus : un enfant qui imbrique « répéter 1000 » dans « répéter 1000 » n'immobilise pas l'onglet. */
export const MAX_STEPS = 5000;
/** Un seul « répéter » ne dépasse jamais ce nombre de tours. */
export const MAX_REPEAT = 1000;
export const STAGE_START: Readonly<StageState> = { x: 18, angle: 0, message: "" };
const PIXEL_PER_STEP = 0.7;
const STAGE_CENTER = 50;

class StopProgram extends Error {
  constructor(readonly failure: ProgramFailure) {
    super(failure);
  }
}

const finite = (value: number): number => (Number.isFinite(value) ? value : 0);
const asNumber = (value: unknown): number => finite(Number(value));

export function runProgram(startBlocks: readonly BlockLike[], initial: StageState = STAGE_START): ProgramResult {
  const state: StageState = { ...initial };
  const variables = new Map<string, number | boolean | string>();
  let steps = 0;

  function evaluate(block: BlockLike | null): number | boolean | string {
    if (!block) return 0;
    switch (block.type) {
      case "math_number":
        return asNumber(block.getFieldValue("NUM"));
      case "logic_boolean":
        return block.getFieldValue("BOOL") === "TRUE";
      case "text":
        return String(block.getFieldValue("TEXT") ?? "");
      case "variables_get":
        return variables.get(String(block.getFieldValue("VAR"))) ?? 0;
      case "math_arithmetic": {
        const a = asNumber(evaluate(block.getInputTargetBlock("A")));
        const b = asNumber(evaluate(block.getInputTargetBlock("B")));
        switch (block.getFieldValue("OP")) {
          case "ADD": return finite(a + b);
          case "MINUS": return finite(a - b);
          case "MULTIPLY": return finite(a * b);
          case "DIVIDE": return b === 0 ? 0 : finite(a / b);
          case "POWER": return finite(a ** Math.min(Math.max(b, -10), 10));
          default: throw new StopProgram("unsupported_block");
        }
      }
      case "logic_negate":
        return !evaluate(block.getInputTargetBlock("BOOL"));
      case "logic_operation": {
        const a = Boolean(evaluate(block.getInputTargetBlock("A")));
        const b = Boolean(evaluate(block.getInputTargetBlock("B")));
        return block.getFieldValue("OP") === "OR" ? a || b : a && b;
      }
      case "logic_compare": {
        const a = evaluate(block.getInputTargetBlock("A"));
        const b = evaluate(block.getInputTargetBlock("B"));
        switch (block.getFieldValue("OP")) {
          case "EQ": return a === b;
          case "NEQ": return a !== b;
          case "LT": return asNumber(a) < asNumber(b);
          case "LTE": return asNumber(a) <= asNumber(b);
          case "GT": return asNumber(a) > asNumber(b);
          case "GTE": return asNumber(a) >= asNumber(b);
          default: throw new StopProgram("unsupported_block");
        }
      }
      default:
        throw new StopProgram("unsupported_block");
    }
  }

  function tick() {
    steps += 1;
    if (steps > MAX_STEPS) throw new StopProgram("too_long");
  }

  function runChain(first: BlockLike | null) {
    for (let block = first; block; block = block.getNextBlock()) {
      tick();
      switch (block.type) {
        case "event_when_flag":
          break; // chapeau de départ : il ne fait rien lui-même
        case "move_steps":
          state.x += asNumber(block.getFieldValue("STEPS")) * PIXEL_PER_STEP;
          break;
        case "turn_degrees":
          state.angle += asNumber(block.getFieldValue("DEGREES"));
          break;
        case "go_center":
          state.x = STAGE_CENTER;
          break;
        case "say_text":
          state.message = String(block.getFieldValue("TEXT") ?? "");
          break;
        case "wait_seconds":
          break; // l'atelier montre l'état final : attendre ne change rien à l'écran
        case "controls_repeat_ext": {
          const times = Math.min(Math.max(Math.floor(asNumber(evaluate(block.getInputTargetBlock("TIMES")))), 0), MAX_REPEAT);
          for (let turn = 0; turn < times; turn++) runChain(block.getInputTargetBlock("DO"));
          break;
        }
        case "controls_if": {
          let branch = 0;
          let taken = false;
          // « si », « sinon si » (IF1, IF2...) puis « sinon » : les entrées existent seulement si l'enfant les a ajoutées.
          while (block.getInputTargetBlock(`IF${branch}`) || block.getInputTargetBlock(`DO${branch}`)) {
            if (Boolean(evaluate(block.getInputTargetBlock(`IF${branch}`)))) {
              runChain(block.getInputTargetBlock(`DO${branch}`));
              taken = true;
              break;
            }
            branch += 1;
          }
          if (!taken) runChain(block.getInputTargetBlock("ELSE"));
          break;
        }
        case "variables_set":
          variables.set(String(block.getFieldValue("VAR")), evaluate(block.getInputTargetBlock("VALUE")));
          break;
        case "math_change": {
          const key = String(block.getFieldValue("VAR"));
          variables.set(key, asNumber(variables.get(key)) + asNumber(evaluate(block.getInputTargetBlock("DELTA"))));
          break;
        }
        default:
          throw new StopProgram("unsupported_block");
      }
    }
  }

  try {
    for (const start of startBlocks) runChain(start);
  } catch (error) {
    if (error instanceof StopProgram) return { state, steps, error: error.failure };
    throw error;
  }
  return { state, steps };
}
