// Crée le dossier de la couverture de tests avant `npm run test:coverage` (remplace `node -e "..."`, que les Node récents
// interprètent comme du TypeScript et qui plante dans la CI avec « The "id" argument must be of type string »).
import { mkdirSync } from "node:fs";

mkdirSync("coverage", { recursive: true });
