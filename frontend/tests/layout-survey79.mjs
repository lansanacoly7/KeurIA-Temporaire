// Contrôle de mise en page des leçons du parcours 7-9 dans un vrai navigateur (Edge ou Chrome, via le protocole DevTools).
// Il joue chaque leçon choisie sur plusieurs tailles d'écran et note, à chaque écran : la réduction du contenu (scale), la taille de Palou
// et le nombre d'écrans qui défilent. Les règles à respecter : réduction jamais sous 0,85 ; Palou jamais sous ~100 px (téléphone) / ~200 px (ordinateur).
//
// Mode d'emploi (depuis frontend/, serveurs Django et Next lancés) :
//   1. créer une page d'essai TEMPORAIRE app/voice-preview/page.tsx (à supprimer après) :
//        "use client"; import { useEffect, useState } from "react";
//        import { LessonPlayer79 } from "../dashboard/parcours79/LessonPlayer79";
//        import { getLessonContent } from "../dashboard/parcours79/content";
//        export default function Page() { const [id, setId] = useState<string | null>(null);
//          useEffect(() => setId(new URLSearchParams(window.location.search).get("l") ?? "p1-1"), []);
//          const content = id ? getLessonContent(id) : undefined; if (!content) return <p>…</p>;
//          return <LessonPlayer79 content={content} firstName="Awa" scope="essai" onClose={() => {}} onComplete={() => {}} />; }
//   2. lancer Edge : msedge --headless=new --remote-debugging-port=9565 --user-data-dir=<dossier temporaire> about:blank
//   3. node tests/layout-survey79.mjs <dossier>      (variables : SURVEY_LESSONS="p3-2,p6-2" SURVEY_VIEWPORTS='[[390,844,true]]' SURVEY_OUT=resultat.json)
// Avant ce contrôle, les téléphones affichaient du contenu à 55 % (coupé) et un Palou de 71 px ; après : contenu ≥ 85 %, Palou ≥ 104 px.import fs from "node:fs"; import path from "node:path";
const targets = await (await fetch("http://127.0.0.1:9565/json")).json();
const page = targets.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async expr => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const out = process.argv[2];
async function shot(name, full) {
  const params = full ? { format: "png", captureBeyondViewport: true } : { format: "png" };
  const r = await send("Page.captureScreenshot", params);
  fs.writeFileSync(path.join(out, name + ".png"), Buffer.from(r.result.data, "base64"));
}
await send("Page.enable"); await send("Runtime.enable");
const q = s => JSON.stringify(s);
const click = sel => ev(`(() => { const e = document.querySelector(${q(sel)}); if (!e) return false; e.click(); return true; })()`);
const clickLabel = l => ev(`(() => { const b = [...document.querySelectorAll('button.p79-opt')].find(x => (x.querySelector('.p79-opt-label')?.innerText ?? '').trim() === ${q(l)}); if (!b) return false; b.click(); return true; })()`);
const DIR = "C:/Users/HP/Documents/Institut_Supérieur_d_enseignement_professionnelle_ISEP/KerIA/frontend/content/parcours79/";
const lessons = {};
for (const f of fs.readdirSync(DIR)) if (/^m\d\d\.json$/.test(f)) for (const l of JSON.parse(fs.readFileSync(DIR + f, "utf8")).lessons) lessons[l.id] = l;
const IDS = (process.env.SURVEY_LESSONS || "p2-2,p3-1,p3-2,p3-3,p4-1,p4-3,p5-1,p5-2,p6-2,p7-2,p8-2,p9-1,p9-3,p10-4").split(",");
const VIEWPORTS = JSON.parse(process.env.SURVEY_VIEWPORTS || '[[1366,768,false],[1920,1080,false],[768,1024,true],[390,844,true],[360,640,true]]');
const rows = [];
async function measure(vp, id, tag) {
  const m = await ev(`(() => {
    const fit = document.querySelector('.p79-fit'); const box = document.querySelector('.p79-l-box');
    const img = document.querySelector('.p79-l-palou img');
    const t = fit ? getComputedStyle(fit).transform : 'none';
    const scale = t && t !== 'none' ? Number(t.match(/matrix\\(([^,]+)/)?.[1] ?? 1) : 1;
    const r = img ? img.getBoundingClientRect() : null;
    const b = box ? box.getBoundingClientRect() : null;
    const pal = document.querySelector('.p79-l-pal')?.getBoundingClientRect();
    return JSON.stringify({ scale: +scale.toFixed(2), palouH: r ? Math.round(r.height) : 0, palouW: r ? Math.round(r.width) : 0, boxH: b ? Math.round(b.height) : 0, boxW: b ? Math.round(b.width) : 0, fitH: fit ? Math.round(fit.offsetHeight) : 0, fitW: fit ? Math.round(fit.offsetWidth) : 0, palCellH: pal ? Math.round(pal.height) : 0 });
  })()`);
  rows.push({ vp: vp.slice(0, 2).join("x"), id, tag, ...JSON.parse(m) });
}
async function playLesson(vp, id) {
  const lesson = lessons[id];
  await send("Emulation.setDeviceMetricsOverride", { width: vp[0], height: vp[1], deviceScaleFactor: 1, mobile: vp[2] });
  await send("Page.navigate", { url: "http://localhost:3000/voice-preview?l=" + id });
  for (let k = 0; k < 40; k++) { await sleep(1200); if (await ev("!!document.querySelector('.p79-l-bottom .p79-btn')")) break; }
  await sleep(700);
  for (const s of lesson.screens) {
    await sleep(500);
    if (s.rounds) {
      for (const [ri, r] of s.rounds.entries()) {
        await sleep(500);
        await measure(vp, id, `${s.kind}/${r.type}#${ri + 1} début`);
        if (r.type === "choose") await clickLabel(r.options.find(o => o.correct).label);
        else if (r.type === "rulesort") await clickLabel(r.rules.find(x => x.correct).label);
        else if (r.type === "whois") { const t = r.items.find(i => i.id === r.target); for (const g of r.tags.filter(g => t.tags.includes(g.id))) { await clickLabel(g.label); await sleep(150); } }
        else if (r.type === "cleanup") { for (const x of r.rows.filter(x => x.intruder)) { await clickLabel(x.label); await sleep(150); } }
        else if (r.type === "train") { for (const x of r.examples.filter(e => e.good)) { await clickLabel(x.label); await sleep(150); } }
        else if (r.type === "relabel") await clickLabel(r.cards.find(c => c.fix).label);
        else if (r.type === "probe") { await clickLabel(r.photos.find(p => p.wrong).label); await sleep(300); await clickLabel(r.fix.options.find(o => o.correct).label); }
        else if (r.type === "focus") { for (let k = 0; k < r.enough; k++) { await clickLabel(r.more ?? "Plus net"); await sleep(150); } }
        else if (r.type === "lens") await clickLabel(r.lenses.find(l => l.correct).label);
        else if (r.type === "speak") { const cf = w => r.cards.find(c => c.toLowerCase().includes(w.toLowerCase())); for (const g of r.need) { await clickLabel(g.map(cf).find(Boolean)); await sleep(100); } await clickLabel("Dire à Palou"); }
        else if (r.type === "layers") { for (const x of r.cards.filter(c => c.good).slice(0, r.need)) { await clickLabel(x.label); await sleep(150); } }
        else if (r.type === "verify") { for (const x of r.checks.filter(c => c.useful).slice(0, r.need)) { await clickLabel(x.label); await sleep(150); } await sleep(300); await clickLabel(r.stamps.find(s => s.correct).label); }
        else if (r.type === "loupe") { for (const x of r.spots.filter(c => c.clue).slice(0, r.need)) { await clickLabel(x.label); await sleep(150); } }
        else if (r.type === "shield") { for (const x of r.items.filter(i => i.secret)) { await clickLabel(x.label); await sleep(150); } }
        else if (r.type === "machine") { for (const sl of r.slots) { await clickLabel(sl.options.find(o => o.correct).label); await sleep(200); } for (const c of r.demo.cases.slice(0, r.demo.need)) { await clickLabel(c.label); await sleep(150); } await sleep(600); }
        else if (r.type === "multi") { for (const o of r.options.filter(o => o.correct)) { await clickLabel(o.label); await sleep(150); } }
        else if (r.type === "sort") { for (const it of r.items) { await click(`[data-item="${it.id}"]`); await sleep(200); await click(`[data-bin="${it.bin}"]`); await sleep(250); } }
        await sleep(500);
        await measure(vp, id, `${s.kind}/${r.type}#${ri + 1} fin`);
        await click('.p79-l-bottom .p79-btn:not(.alt)'); await sleep(500);
      }
    } else if (s.kind === "create") {
      await measure(vp, id, "create début");
      for (let si = 0; si < s.steps.length; si++) {
        for (let k = 0; k < (s.steps[si].count || 1); k++) { await ev(`document.querySelectorAll('.p79-activity button.p79-opt')[${k}]?.click()`); await sleep(200); }
        await click(".p79-activity button.p79-btn"); await sleep(600);
      }
      await click('.p79-l-bottom .p79-btn:not(.alt)'); await sleep(400);
    } else {
      await measure(vp, id, s.kind);
      await click('.p79-l-bottom .p79-btn:not(.alt)'); await sleep(400);
    }
  }
}
for (const vp of VIEWPORTS) for (const id of IDS) { try { await playLesson(vp, id); } catch (e) { rows.push({ vp: vp.slice(0, 2).join("x"), id, tag: "ERREUR " + String(e).slice(0, 80) }); } fs.writeFileSync(process.env.SURVEY_OUT || "survey.json", JSON.stringify(rows, null, 1)); }
fs.writeFileSync(process.env.SURVEY_OUT || "survey.json", JSON.stringify(rows, null, 1));
console.log("mesures :", rows.length);
process.exit(0);
