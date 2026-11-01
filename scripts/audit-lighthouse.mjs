import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const outDir = path.resolve("docs/lighthouse-raw");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

process.env.CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function getAuthCookie() {
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  const cookiesHeader = csrfRes.headers.get("set-cookie") || "";
  
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
      "Cookie": cookiesHeader
    },
    body: JSON.stringify({ email: "dev.test@keria.dev", password: "DevTest2026!" })
  });
  
  const setCookie = loginRes.headers.get("set-cookie") || "";
  const match = setCookie.match(/keur_ia_session=([^;]+)/);
  return match ? match[1] : null;
}

const cookie = await getAuthCookie();
console.log("Auth cookie dev.test:", cookie ? "OK" : "FAILED");

const pages = [
  { name: "accueil", url: "http://localhost:3000/" },
  { name: "connexion", url: "http://localhost:3000/connexion" },
  { name: "school-baobabs", url: "http://localhost:3000/school/les-baobabs" },
  { name: "dashboard-79", url: "http://localhost:3000/dashboard/modules", auth: true }
];

const results = [];

for (const p of pages) {
  console.log(`\n========================================`);
  console.log(`Auditing: ${p.name} (${p.url})`);
  const finalFile = path.join(outDir, `${p.name}.json`);
  const extraFlags = [];
  
  if (p.auth && cookie) {
    const headersFile = path.join(outDir, `${p.name}-headers.json`);
    fs.writeFileSync(headersFile, JSON.stringify({ Cookie: `keur_ia_session=${cookie}` }), "utf8");
    extraFlags.push(`--extra-headers="${headersFile.replace(/\\/g, "/")}"`);
  }

  const tmpDir = path.join(process.env.TEMP || "C:/temp", "lh-" + Date.now() + "-" + Math.random().toString(36).slice(2)).replace(/\\/g, "/");
  const chromeFlags = `--headless --disable-gpu --no-sandbox --user-data-dir=${tmpDir}`;
  const cmd = `npx --yes lighthouse "${p.url}" --output=json --output-path="${finalFile}" --chrome-flags="${chromeFlags}" --only-categories=performance,accessibility,best-practices --quiet ${extraFlags.join(" ")}`;

  try {
    execSync(cmd, { stdio: "inherit", timeout: 120000 });
  } catch (err) {
    console.error(`Error on ${p.name}:`, err.message.split("\n")[0]);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }

  if (fs.existsSync(finalFile)) {
    const raw = JSON.parse(fs.readFileSync(finalFile, "utf8"));
    const perf = Math.round((raw.categories.performance?.score || 0) * 100);
    const a11y = Math.round((raw.categories.accessibility?.score || 0) * 100);
    const bp = Math.round((raw.categories["best-practices"]?.score || 0) * 100);

    // Collect failing audits
    const failedAudits = [];
    for (const [auditId, audit] of Object.entries(raw.audits || {})) {
      if (audit.score !== null && audit.score < 0.9 && audit.title) {
        failedAudits.push({
          id: auditId,
          title: audit.title,
          score: audit.score,
          displayValue: audit.displayValue || "",
          details: audit.details?.items?.slice(0, 5) || []
        });
      }
    }

    results.push({ name: p.name, url: p.url, perf, a11y, bp, failedAuditsCount: failedAudits.length, failedAudits });
    console.log(`-> ${p.name}: Perf: ${perf}, A11y: ${a11y}, BP: ${bp} (${failedAudits.length} issues < 0.9)`);
  }
}

fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(results, null, 2), "utf8");
console.log("\nAll audits successfully saved to docs/lighthouse-raw/summary.json!");
