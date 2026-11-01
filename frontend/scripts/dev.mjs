// `npm run dev` : lance Django (s'il ne tourne pas déjà) PUIS Next. Avant, il fallait penser à démarrer Django à la main,
// et sans lui la connexion affichait « Une difficulté temporaire est survenue ».
// L'adresse de Django vient de DJANGO_API_URL (.env.local, sinon http://127.0.0.1:8000), comme dans next.config.ts.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(frontend, "..");

function envValue(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env.local", ".env"]) {
    try {
      const line = fs.readFileSync(path.join(frontend, file), "utf8").split(/\r?\n/).find(l => l.startsWith(`${name}=`));
      if (line) return line.slice(name.length + 1).trim();
    } catch { /* fichier absent */ }
  }
  return "";
}

const api = new URL(envValue("DJANGO_API_URL") || "http://127.0.0.1:8000");
const children = [];
const stopAll = () => children.forEach(c => { try { c.kill(); } catch { /* déjà arrêté */ } });
process.on("exit", stopAll);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { stopAll(); process.exit(0); });

async function djangoAnswers() {
  try {
    const res = await fetch(new URL("/api/auth/csrf", api), { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

if (await djangoAnswers()) {
  console.log(`[dev] Django répond déjà sur ${api.origin}.`);
} else if (!["127.0.0.1", "localhost"].includes(api.hostname)) {
  console.warn(`[dev] Django (${api.origin}) ne répond pas et n'est pas local : je ne peux pas le lancer.`);
} else {
  const python = [
    path.join(root, "backend", ".venv", "Scripts", "python.exe"),
    path.join(root, "backend", ".venv", "bin", "python"),
    path.join(root, "venv", "Scripts", "python.exe"),
    path.join(root, "venv", "bin", "python"),
  ].find(p => fs.existsSync(p));
  if (!python) {
    console.warn("[dev] Aucun venv trouvé à la racine : lance Django à la main (voir README).");
  } else {
    console.log(`[dev] Je lance Django sur ${api.host}…`);
    const django = spawn(python, ["manage.py", "runserver", `${api.hostname}:${api.port || 80}`, "--noreload"], { cwd: path.join(root, "backend"), stdio: ["ignore", "inherit", "inherit"] });
    children.push(django);
    django.on("exit", code => { if (code) console.warn(`[dev] Django s'est arrêté (code ${code}) : le port est peut-être pris par un autre projet.`); });
    for (let i = 0; i < 60 && !(await djangoAnswers()); i++) await new Promise(r => setTimeout(r, 1000));
    console.log((await djangoAnswers()) ? "[dev] Django est prêt." : "[dev] Django ne répond toujours pas : regarde les messages ci-dessus.");
  }
}

const next = spawn(process.execPath, [path.join(frontend, "node_modules", "next", "dist", "bin", "next"), "dev", "-p", "3000"], { cwd: frontend, stdio: "inherit" });
children.push(next);
next.on("exit", code => { stopAll(); process.exit(code ?? 0); });
