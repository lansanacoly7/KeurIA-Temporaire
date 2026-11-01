import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const prefix = process.argv[2] || "apres";
const outDir = path.resolve("docs/verif-visuelle");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const tempProfile = path.join(process.env.TEMP || "C:/temp", "chrome-cdp-" + Date.now());
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--user-data-dir=${tempProfile}`,
  "--remote-debugging-port=9222",
  "about:blank"
], { stdio: "ignore" });

process.on("exit", () => {
  try { chrome.kill(); } catch {}
  try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch {}
});

let version = null;
for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch("http://127.0.0.1:9222/json/version");
    if (res.ok) { version = await res.json(); break; }
  } catch {}
  await new Promise(r => setTimeout(r, 300));
}

if (!version) {
  console.error("Chrome failed to start");
  process.exit(1);
}

const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
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

async function capture(name, url, isMobile, waitSelector = null, action = null) {
  const vp = isMobile ? [390, 844, true] : [1440, 900, false];
  const vpName = isMobile ? "mobile" : "bureau";
  const fileName = `${prefix}-${name}-${vpName}.png`;
  const filePath = path.join(outDir, fileName);

  await send("Emulation.setDeviceMetricsOverride", {
    width: vp[0],
    height: vp[1],
    deviceScaleFactor: isMobile ? 2 : 1,
    mobile: vp[2]
  });

  await send("Page.navigate", { url });
  
  for (let k = 0; k < 30; k++) {
    await sleep(400);
    if (waitSelector) {
      const found = await ev(`!!document.querySelector("${waitSelector}")`);
      if (found) break;
    } else {
      const ready = await ev("document.readyState === 'complete'");
      if (ready && k > 4) break;
    }
  }

  // Activer immédiatement tous les reveal-on-scroll pour stabiliser le rendu
  await ev(`(() => {
    document.querySelectorAll('.reveal-on-scroll, .anim-fade-up, .anim-fade-down, .anim-fade-left, .anim-fade-right, .anim-scale-up').forEach(el => {
      el.classList.add('reveal-active');
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.transition = 'none';
      el.style.animation = 'none';
    });
  })()`);

  await sleep(1500);

  if (action) {
    await action();
    await sleep(1000);
  }

  const res = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
  console.log(`Saved: ${fileName}`);
}

console.log(`=== START CAPTURING (${prefix.toUpperCase()}) ===`);

for (const isMobile of [false, true]) {
  console.log(`--- Viewport: ${isMobile ? "Mobile (390px)" : "Bureau (1440px)"} ---`);
  
  // 1. Accueil
  await send("Network.clearBrowserCookies");
  await capture("01-accueil", "http://localhost:3000/", isMobile, ".landing-hero, .landing-topbar");

  // 2. Connexion
  await capture("02-connexion", "http://localhost:3000/connexion", isMobile, "input, form, .login-box, button");

  // 3. École (avec compte demo.ecole@keuria.test)
  await loginUser("demo.ecole@keuria.test", "Ecole2026!");
    await capture("03-ecole", "http://localhost:3000/ecole", isMobile, ".school-layout, .school-content, h1, h2", async () => {
    for (let w = 0; w < 15; w++) {
      const loaded = await ev(`(() => document.body.innerText.includes('Les Baobabs') || document.body.innerText.includes('Podium'))()`);
      if (loaded) break;
      await sleep(500);
    }
  });

  // 4. Enseignant (avec theeminence07@gmail.com)
  await loginUser("theeminence07@gmail.com", "Enseignant2026!");
  await capture("04-enseignant", "http://localhost:3000/enseignant", isMobile, ".teacher-layout, h1, h2", async () => {
    // Wait for the teacher dashboard data to populate
    for (let w = 0; w < 10; w++) {
      const loaded = await ev(`(() => {
        return !!document.querySelector('.school-summary-card, .teacher-header, h1');
      })()`);
      if (loaded) break;
      await sleep(500);
    }
  });

  // 5. Dashboard / Modules (Archipel 7-9 avec dev.test@keria.dev)
  await loginUser("dev.test@keria.dev", "DevTest2026!");
  await capture("05-dashboard-modules", "http://localhost:3000/dashboard/modules?dev=1", isMobile, ".archipel, .track-map, .dash-content");

  // 6. Leçon parcours 7-9 : écran d'histoire
  await capture("06-lecon-histoire", "http://localhost:3000/lesson-preview?l=p1-1", isMobile, ".p79-l-box, .p79-fit");

  // 7. Leçon parcours 7-9 : défi de Palou (avancer avec Continuer)
  await capture("07-lecon-defi-palou", "http://localhost:3000/lesson-preview?l=p1-1", isMobile, ".p79-l-box, .p79-fit", async () => {
    for (let step = 0; step < 12; step++) {
      const isQuiz = await ev("!!document.querySelector('.p79-opt, .p79-screen-quiz, .p79-screen-play, .p79-options')");
      if (isQuiz) break;
      const clicked = await ev(`(() => {
        const btn = [...document.querySelectorAll('button')].find(b => b.textContent && b.textContent.includes('Continuer'));
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
      if (!clicked) break;
      await sleep(600);
    }
  });
}

console.log("=== CAPTURE COMPLETE ===");
ws.close();
chrome.kill();
process.exit(0);
