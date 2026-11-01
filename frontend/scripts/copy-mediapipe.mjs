// Copie le moteur WebAssembly de MediaPipe (installé par npm, même version que le code JavaScript) dans public/mediapipe/wasm,
// pour que le jeu de reconnaissance de gestes ne dépende d'aucun CDN : pas de requête vers un tiers depuis l'appareil de l'enfant, et
// fonctionnement dans une école à connexion instable. Le dossier copié est ignoré par git (il vient de node_modules à chaque build).
// Lancé automatiquement avant `npm run dev` et `npm run build`.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const target = join(root, "public", "mediapipe", "wasm");

if (!existsSync(source)) {
  console.warn("copy-mediapipe : @mediapipe/tasks-vision n'est pas installé, le jeu de gestes ne fonctionnera pas.");
  process.exit(0);
}
mkdirSync(target, { recursive: true });
// Les variantes avec « module » servent aux navigateurs à scripts ES dans les workers ; celles sans SIMD aux très anciens appareils.
for (const name of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) {
  copyFileSync(join(source, name), join(target, name));
}
console.log("copy-mediapipe : moteur copié dans public/mediapipe/wasm");
