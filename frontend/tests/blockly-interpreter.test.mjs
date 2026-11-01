// Interpréteur des blocs de l'atelier Blockly : résultats attendus, protections contre les boucles géantes et les blocs inconnus.
// Lancer : npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function load(relative) {
  const file = path.join(FRONTEND, relative);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const mod = { exports: {} };
  new Function("module", "exports", "require", outputText)(mod, mod.exports, require);
  return mod.exports;
}

const { runProgram, MAX_STEPS, MAX_REPEAT, STAGE_START } = load("app/dashboard/programmation/blocklyInterpreter.ts");

/** Bloc de test : champs, entrées (valeurs ou instructions) et bloc suivant. */
function block(type, fields = {}, inputs = {}, next = null) {
  return {
    type,
    getFieldValue: name => fields[name],
    getInputTargetBlock: name => inputs[name] ?? null,
    getNextBlock: () => next,
  };
}
const chain = (...blocks) => {
  // Relie les blocs dans l'ordre : chain(a, b, c) => a -> b -> c
  const linked = blocks.map(b => ({ ...b }));
  linked.forEach((b, i) => { b.getNextBlock = () => linked[i + 1] ?? null; });
  return linked[0];
};
const num = value => block("math_number", { NUM: value });

test("un programme simple : avancer, tourner, dire", () => {
  const start = chain(block("event_when_flag"), block("move_steps", { STEPS: 10 }), block("turn_degrees", { DEGREES: 90 }), block("say_text", { TEXT: "Bonjour !" }));
  const result = runProgram([start]);
  assert.equal(result.error, undefined);
  assert.equal(result.state.x, STAGE_START.x + 10 * 0.7);
  assert.equal(result.state.angle, 90);
  assert.equal(result.state.message, "Bonjour !");
});

test("« aller au centre » place le lutin au milieu de la scène", () => {
  const result = runProgram([chain(block("event_when_flag"), block("move_steps", { STEPS: 40 }), block("go_center"))]);
  assert.equal(result.state.x, 50);
});

test("répéter n fois exécute n fois les blocs intérieurs", () => {
  const inside = chain(block("move_steps", { STEPS: 10 }));
  const repeat = block("controls_repeat_ext", {}, { TIMES: num(3), DO: inside });
  const result = runProgram([chain(block("event_when_flag"), repeat)]);
  assert.equal(result.state.x, STAGE_START.x + 3 * 10 * 0.7);
});

test("un nombre de répétitions négatif ou absent n'exécute rien", () => {
  const inside = block("move_steps", { STEPS: 10 });
  assert.equal(runProgram([chain(block("event_when_flag"), block("controls_repeat_ext", {}, { TIMES: num(-5), DO: inside }))]).state.x, STAGE_START.x);
  assert.equal(runProgram([chain(block("event_when_flag"), block("controls_repeat_ext", {}, { DO: inside }))]).state.x, STAGE_START.x);
});

test("des répétitions imbriquées géantes sont arrêtées par le budget d'instructions (plus de gel de l'onglet)", () => {
  const innermost = block("move_steps", { STEPS: 1 });
  const inner = block("controls_repeat_ext", {}, { TIMES: num(MAX_REPEAT), DO: innermost });
  const outer = block("controls_repeat_ext", {}, { TIMES: num(MAX_REPEAT), DO: inner });
  const started = Date.now();
  const result = runProgram([chain(block("event_when_flag"), outer)]);
  assert.equal(result.error, "too_long");
  assert.ok(result.steps <= MAX_STEPS + 1);
  assert.ok(Date.now() - started < 1000, "l'arrêt doit être immédiat");
});

test("un seul « répéter » est plafonné à MAX_REPEAT tours", () => {
  const result = runProgram([chain(block("event_when_flag"), block("controls_repeat_ext", {}, { TIMES: num(1e9), DO: block("wait_seconds", { SECONDS: 1 }) }))]);
  assert.equal(result.error, undefined);
  assert.equal(result.steps, 1 + 1 + MAX_REPEAT);
});

test("variables : affecter puis modifier, utilisées dans un calcul", () => {
  const double = block("math_arithmetic", { OP: "MULTIPLY" }, { A: block("variables_get", { VAR: "score" }), B: num(2) });
  const program = chain(
    block("event_when_flag"),
    block("variables_set", { VAR: "score" }, { VALUE: num(4) }),
    block("math_change", { VAR: "score" }, { DELTA: num(6) }),
    block("variables_set", { VAR: "double" }, { VALUE: double }),
    block("controls_repeat_ext", {}, { TIMES: block("variables_get", { VAR: "double" }), DO: block("move_steps", { STEPS: 1 }) }),
  );
  const result = runProgram([program]);
  assert.equal(result.error, undefined);
  // (4 + 6) * 2 = 20 tours d'un pas (0,7 point chacun) ; les additions décimales ne sont pas exactes : on compare à 1e-9 près.
  assert.ok(Math.abs(result.state.x - (STAGE_START.x + 20 * 0.7)) < 1e-9);
});
test("« si » exécute la branche vraie, sinon la branche « sinon »", () => {
  const yes = block("move_steps", { STEPS: 10 });
  const no = block("move_steps", { STEPS: 20 });
  const condition = value => block("logic_compare", { OP: "EQ" }, { A: num(1), B: num(value) });
  const ifBlock = value => block("controls_if", {}, { IF0: condition(value), DO0: yes, ELSE: no });
  assert.equal(runProgram([chain(block("event_when_flag"), ifBlock(1))]).state.x, STAGE_START.x + 10 * 0.7);
  assert.equal(runProgram([chain(block("event_when_flag"), ifBlock(2))]).state.x, STAGE_START.x + 20 * 0.7);
});

test("un « si » sans condition ne s'exécute pas", () => {
  const result = runProgram([chain(block("event_when_flag"), block("controls_if", {}, { DO0: block("move_steps", { STEPS: 10 }) }))]);
  assert.equal(result.state.x, STAGE_START.x);
});

test("la division par zéro et les valeurs infinies donnent 0, jamais NaN ou Infinity", () => {
  const divide = block("math_arithmetic", { OP: "DIVIDE" }, { A: num(5), B: num(0) });
  const result = runProgram([chain(block("event_when_flag"), block("variables_set", { VAR: "v" }, { VALUE: divide }), block("controls_repeat_ext", {}, { TIMES: block("variables_get", { VAR: "v" }), DO: block("move_steps", { STEPS: 1 }) }))]);
  assert.equal(result.state.x, STAGE_START.x);
  assert.ok(Number.isFinite(runProgram([chain(block("event_when_flag"), block("move_steps", { STEPS: "abc" }))]).state.x));
});

test("un bloc inconnu arrête le programme au lieu d'être exécuté", () => {
  const result = runProgram([chain(block("event_when_flag"), block("move_steps", { STEPS: 10 }), block("procedures_callnoreturn"))]);
  assert.equal(result.error, "unsupported_block");
});

test("les blocs détachés du drapeau ne sont pas exécutés", () => {
  // Seules les chaînes passées à runProgram (celles qui partent du drapeau) comptent.
  const flag = chain(block("event_when_flag"), block("move_steps", { STEPS: 10 }));
  const loose = block("move_steps", { STEPS: 100 });
  assert.equal(loose.type, "move_steps");
  assert.equal(runProgram([flag]).state.x, STAGE_START.x + 10 * 0.7);
});

test("l'état de départ fourni n'est jamais modifié", () => {
  const initial = { x: 18, angle: 0, message: "" };
  runProgram([chain(block("event_when_flag"), block("move_steps", { STEPS: 10 }))], initial);
  assert.deepEqual(initial, { x: 18, angle: 0, message: "" });
});
