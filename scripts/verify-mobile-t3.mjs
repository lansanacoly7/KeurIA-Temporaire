import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const outDir = path.resolve("docs/verif-mobile-390");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const tempProfile = path.join(process.env.TEMP || "C:/temp", "chrome-cdp-t3-" + Date.now());
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--user-data-dir=${tempProfile}`,
  "--remote-debugging-port=9223",
  "about:blank"
], { stdio: "ignore" });

process.on("exit", () => {
  try { chrome.kill(); } catch {}
  try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch {}
});

let version = null;
for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch("http://127.0.0.1:9223/json/version");
    if (res.ok) { version = await res.json(); break; }
  } catch {}
  await new Promise(r => setTimeout(r, 300));
}

if (!version) {
  console.error("Chrome failed to start on port 9223");
  process.exit(1);
}

const targets = await (await fetch("http://127.0.0.1:9223/json")).json();
const page = targets.find(t => t.type === "page") || targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => (ws.onopen = r));

let msgId = 0;
const pending = new Map();
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++msgId;
  pending.set(id, m => {
    if (m.error) reject(m.error);
    else resolve(m.result);
  });
  ws.send(JSON.stringify({ id, method, params }));
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async expr => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  return r.result?.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");

await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true
});

async function loginUser(email, password) {
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
    body: JSON.stringify({ email, password })
  });
  
  const setCookie = loginRes.headers.get("set-cookie") || "";
  const match = setCookie.match(/keur_ia_session=([^;]+)/);
  if (match) {
    await send("Network.setCookie", {
      name: "keur_ia_session",
      value: match[1],
      domain: "localhost",
      path: "/",
      httpOnly: true
    });
  }
}

async function captureScreenshot(name) {
  const filePath = path.join(outDir, `${name}.png`);
  const res = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
  console.log(`[Captured] ${name}.png`);
}

async function checkOverflow() {
  return await ev(`(() => {
    const docWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const winWidth = window.innerWidth;
    const overflowingElements = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > winWidth + 2) {
        overflowingElements.push({
          tag: el.tagName,
          class: (el.className || '').toString().slice(0, 50),
          right: Math.round(rect.right),
          width: Math.round(rect.width)
        });
      }
    });
    return {
      docWidth,
      bodyWidth,
      winWidth,
      hasHorizontalOverflow: docWidth > winWidth || bodyWidth > winWidth,
      overflowingElements: overflowingElements.slice(0, 10)
    };
  })()`);
}

console.log("=== VERIFICATION MOBILE RESPONSIVENESS (390px) ===");
const diagnostic = {};

// 1. Archipel
console.log("\n--- 1. Écran Archipel (390px) ---");
await send("Network.clearBrowserCookies");
await loginUser("dev.test@keria.dev", "DevTest2026!");
await send("Page.navigate", { url: "http://localhost:3000/dashboard/modules?dev=1" });

for (let i = 0; i < 25; i++) {
  await sleep(400);
  const found = await ev(`!!document.querySelector(".p79-ar-stage, .p79-ar-map")`);
  if (found) break;
}
await sleep(1500);

diagnostic.archipel = await checkOverflow();
console.log("Archipel overflow status:", diagnostic.archipel);
await captureScreenshot("01-archipel-portrait-map");

// Ouvrir modale île 1
const modalOpened = await ev(`(() => {
  const isle1 = document.querySelector(".p79-ar-isle");
  if (isle1) {
    isle1.click();
    return true;
  }
  return false;
})()`);
console.log("Clicked Isle 1:", modalOpened);
await sleep(1000);

diagnostic.archipelModal = await checkOverflow();
console.log("Archipel Modal overflow status:", diagnostic.archipelModal);
await captureScreenshot("02-archipel-module-modal");

// 2. Lancer la leçon depuis le bouton Play dans la modale
console.log("\n--- 2. Lecteur de leçon (390px) ---");
const clickedPlay = await ev(`(() => {
  const playBtn = document.querySelector(".p79-ar-play");
  if (playBtn) {
    playBtn.click();
    return true;
  }
  return false;
})()`);
console.log("Clicked Play on Lesson 1:", clickedPlay);

for (let i = 0; i < 25; i++) {
  await sleep(400);
  const found = await ev(`!!document.querySelector(".p79-lp, .p79-l-box, .p79-fit, .p79-dialogue")`);
  if (found) {
    console.log("Found lesson player!");
    break;
  }
}
await sleep(1500);

diagnostic.lessonIntro = await checkOverflow();
console.log("Lesson Intro overflow status:", diagnostic.lessonIntro);
await captureScreenshot("03-lecteur-lecon-histoire");

// Avancer vers l'étape suivante (histoire / dialogue / activité)
for (let step = 0; step < 8; step++) {
  const nextClicked = await ev(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => {
      const txt = (b.textContent || '').trim();
      return txt.includes('Continuer') || txt.includes('Suivant') || txt.includes('Écouter');
    });
    if (btn) { btn.click(); return true; }
    return false;
  })()`);
  console.log(`Step ${step + 1} clicked next:`, nextClicked);
  await sleep(1000);
  const hasInteractive = await ev(`!!document.querySelector('.p79-opt, .p79-screen-quiz, .p79-screen-play, .p79-options, .p79-vf, .p79-interactive')`);
  if (hasInteractive) {
    console.log("Interactive / quiz element reached!");
    break;
  }
}
await sleep(1000);

diagnostic.lessonInteractive = await checkOverflow();
console.log("Lesson Interactive overflow status:", diagnostic.lessonInteractive);
await captureScreenshot("04-lecteur-lecon-interactif");

// 3. Tableau de bord parent
console.log("\n--- 3. Tableau de bord parent (390px) ---");
await send("Network.clearBrowserCookies");
await loginUser("parent1.les-baobabs@example.com", "DevTest2026!");
await send("Page.navigate", { url: "http://localhost:3000/dashboard" });

for (let i = 0; i < 25; i++) {
  await sleep(400);
  const found = await ev(`!!document.querySelector(".p-hero, h1, .p-card, .p-passport-card")`);
  if (found) break;
}
await sleep(1500);

diagnostic.parentDashboard = await checkOverflow();
console.log("Parent Dashboard overflow status:", diagnostic.parentDashboard);
await captureScreenshot("05-tableau-de-bord-parent-haut");

await ev(`window.scrollBy({ top: 500, behavior: 'instant' })`);
await sleep(800);
await captureScreenshot("06-tableau-de-bord-parent-enfants");

await ev(`window.scrollBy({ top: 600, behavior: 'instant' })`);
await sleep(800);
await captureScreenshot("07-tableau-de-bord-parent-conseils");

console.log("\n=== SUMMARY DIAGNOSTIC ===");
console.log(JSON.stringify(diagnostic, null, 2));

fs.writeFileSync(path.join(outDir, "diagnostic-390.json"), JSON.stringify(diagnostic, null, 2), "utf8");

ws.close();
chrome.kill();
process.exit(0);
