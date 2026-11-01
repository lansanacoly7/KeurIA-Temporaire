// Capture du guide vidéo de l'Espace Enseignant kEur IA.
// Pilote Chromium (Playwright), enregistre l'écran image par image (screencast CDP en JPEG : bien plus net que l'enregistreur
// vidéo intégré, à débit variable) et note à quelle seconde commence chaque scène pour caler la voix off.
//
// Usage : node capture.mjs <dossier de travail> [--base http://localhost:3100] [--email x] [--password y] [--only 01-intro,04-missions]
//   <dossier de travail> doit contenir audio/durations.json (voir voix.py) ; il reçoit frames/, marks.json et state.json.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const WORK = path.resolve(args[0] ?? 'sortie');
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const BASE = opt('base', 'http://localhost:3100');
const EMAIL = opt('email', 'khady.faye@example.com');
const PASSWORD = opt('password', process.env.DEMO_PASSWORD ?? 'DemoEns2026');
const ONLY = opt('only', '')?.split(',').filter(Boolean);
const DEBUG = args.includes('--debug');
const W = 1920, H = 1080;

const durations = JSON.parse(fs.readFileSync(path.join(WORK, 'audio', 'durations.json'), 'utf8'));
const overlay = fs.readFileSync(new URL('./overlay.js', import.meta.url), 'utf8');
const FRAMES = path.join(WORK, 'frames');
fs.rmSync(FRAMES, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });

const browser = await chromium.launch({ args: ['--hide-scrollbars'] });

// 1) Connexion hors enregistrement : on garde seulement la session.
const loginCtx = await browser.newContext({ viewport: { width: W, height: H } });
const lp = await loginCtx.newPage();
await lp.goto(`${BASE}/connexion`);
await lp.getByRole('button', { name: /enseignant/i }).first().click();
await lp.locator('input[name=email]').fill(EMAIL);
await lp.locator('input[name=password]').fill(PASSWORD);
await lp.locator('button.login-primary').click();
await lp.waitForURL(/\/enseignant/, { timeout: 30000 });
const state = await loginCtx.storageState();
await loginCtx.close();

// 2) Contexte enregistré.
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, storageState: state });
// Densité d'affichage « Standard » : l'interface remplit tout l'écran enregistré (voir la mémoire du projet).
await context.addInitScript(() => { try { localStorage.setItem('keria_display_zoom', 'standard'); } catch {} });
await context.addInitScript(overlay);
const page = await context.newPage();
page.setDefaultTimeout(60000);

// Screencast : chaque image est écrite avec son horodatage (en secondes, même horloge que Date.now()).
const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const n = frames.length;
  fs.writeFileSync(path.join(FRAMES, `f${String(n).padStart(6, '0')}.jpg`), Buffer.from(data, 'base64'));
  frames.push(metadata.timestamp);
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await page.goto(`${BASE}/enseignant`);
await page.waitForLoadState('networkidle').catch(() => {});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1 });

// ── Outils ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
const L = sel => page.locator(sel).first();
let pos = { x: 1500, y: 700 };
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Curseur : trajectoire de Bézier cubique (courbe douce, légèrement arquée), puis micro-rebond à l'arrivée. */
async function glide(x, y, ms) {
  const dx = x - pos.x, dy = y - pos.y, dist = Math.hypot(dx, dy);
  if (dist < 2) return;
  const dur = ms ?? Math.min(1300, 420 + dist * 0.75);
  const nx = -dy / dist, ny = dx / dist, bow = Math.min(140, dist * 0.22) * (dx > 0 ? 1 : -1);
  const c1 = { x: pos.x + dx * 0.25 + nx * bow, y: pos.y + dy * 0.25 + ny * bow };
  const c2 = { x: pos.x + dx * 0.75 + nx * bow * 0.5, y: pos.y + dy * 0.75 + ny * bow * 0.5 };
  const p0 = pos, t0 = Date.now();
  for (;;) {
    const t = Math.min(1, (Date.now() - t0) / dur), e = ease(t), u = 1 - e;
    const px = u ** 3 * p0.x + 3 * u * u * e * c1.x + 3 * u * e * e * c2.x + e ** 3 * x;
    const py = u ** 3 * p0.y + 3 * u * u * e * c1.y + 3 * u * e * e * c2.y + e ** 3 * y;
    await page.mouse.move(px, py);
    if (t >= 1) break;
    await sleep(8);
  }
  // Micro-rebond : léger dépassement puis retour.
  const ox = (dx / dist) * 9, oy = (dy / dist) * 9;
  for (const [k, w] of [[1, 70], [0.35, 70], [0, 90]]) { await page.mouse.move(x + ox * k, y + oy * k); await sleep(w); }
  pos = { x, y };
}

async function center(l, mode = 'center') {
  await l.waitFor({ state: 'visible' });
  let b = await l.boundingBox();
  const hidden = b.y < 90 || b.y + b.height > H - 70;
  if (hidden || mode === 'start') {
    // Le halo est en position fixe : on l'éteint avant de faire défiler la page pour qu'il ne reste pas flotter.
    await clear();
    await l.evaluate((e, m) => { e.style.scrollMarginTop = '180px'; e.scrollIntoView({ behavior: 'smooth', block: m === 'start' ? 'start' : 'center' }); }, mode);
    await sleep(1000);
    b = await l.boundingBox();
  }
  return { b, x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Le curseur rejoint l'élément, qui reçoit le halo (projecteur) et, si demandé, une infobulle. */
async function show(l, { tip, icon = 'sparkles', side = 'bottom', pad = 10, scale = 1.03, radius = 18, cursor = true, dx = 0.5, dy = 0.5, scroll = 'center' } = {}) {
  const { b } = await center(l, scroll);
  if (cursor) await glide(b.x + b.width * dx, b.y + b.height * dy);
  const rect = await l.evaluate((e, o) => window.__kv.spot(e, o), { pad, scale, radius });
  if (tip) await page.evaluate(([r, t, i, s]) => { window.__kv.clearTips(); window.__kv.tip(r, t, i, s); }, [rect, tip, icon, side]);
  else await page.evaluate(() => window.__kv.clearTips());
  if (DEBUG) await page.screenshot({ path: path.join(WORK, `dbg-${Date.now()}.png`) });
}
const clear = () => page.evaluate(() => { window.__kv.unspot(); window.__kv.clearTips(); });

async function click(l, { waitNav = true } = {}) {
  const { x, y } = await center(l);
  await glide(x, y);
  await sleep(140);
  await page.mouse.down(); await sleep(110); await page.mouse.up();
  if (waitNav) await settle();
}
async function settle() {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForFunction(() => !document.querySelector('[class*="skeleton" i]'), null, { timeout: 15000 }).catch(() => {});
  await sleep(450);
}
async function type(l, text, delay = 45) {
  await click(l, { waitNav: false });
  await page.keyboard.type(text, { delay });
}

// ── Déroulé ──────────────────────────────────────────────────────────────────
const marks = {};
async function scene(id, fn) {
  if (ONLY?.length && !ONLY.includes(id)) return;
  const dur = durations[id] * 1000, start = Date.now();
  marks[id] = start / 1000;
  const at = async frac => {
    const d = start + frac * dur - Date.now();
    if (d > 0) await sleep(d); else if (d < -700) console.log(`  ! ${id} : temps ${frac} atteint avec ${(-d / 1000).toFixed(1)} s de retard`);
  };
  await fn(at);
  await clear();
  const rest = start + dur + 700 - Date.now();
  if (rest > 0) await sleep(rest);
  console.log(`${id}: ${(dur / 1000).toFixed(1)} s de voix, ${((Date.now() - start) / 1000).toFixed(1)} s d'image`);
}
const nav = href => click(L(`.ec-nav a[href="${href}"]`));

await sleep(1200);

await scene('01-intro', async at => {
  await page.evaluate(() => window.__kv.banner('Espace Enseignant<small>Guide complet de la plateforme kEur IA</small>'));
  await at(0.07);
  await page.evaluate(() => window.__kv.banner(''));
  await show(L('.ec-greeting'), { tip: 'Accueil personnalisé', icon: 'sparkles', pad: 12, scale: 1.08, side: 'right' });
  await at(0.16);
  await show(L('section.ec-card:has(h2:has-text("Suivez la progression"))'), { tip: 'Accompagnement pédagogique', icon: 'sparkles', side: 'bottom' });
  await at(0.30);
  await show(L('section.ec-grid-stats'), { tip: 'Vos chiffres clés de la semaine', icon: 'chart', side: 'bottom', scale: 1.02 });
  await at(0.50);
  await show(L('section.ec-card:has(h2:has-text("Élèves à accompagner"))'), { tip: 'Repérez inactifs et retards', icon: 'alert', side: 'inside', scale: 1.02 });
  await at(0.68);
  await show(L('section.ec-card:has(h2:has-text("Devoirs & Missions"))'), { tip: 'Avancement en temps réel', icon: 'target', side: 'inside', scale: 1.02 });
  await at(0.84);
  await show(L('a.ec-btn--primary:has-text("Donner un devoir")'), { tip: 'Un devoir en quelques clics', icon: 'send', side: 'bottom', pad: 8, scale: 1.1, radius: 14 });
});

let classHref = '';
await scene('02-classes', async at => {
  await nav('/enseignant/classes');
  await at(0.08);
  const card = L('a.ec-class-card');
  classHref = await card.getAttribute('href');
  await show(card, { tip: 'Vos classes, en un coup d\'œil', icon: 'users', side: 'right', scale: 1.06 });
  await at(0.17);
  await clear();
  await click(card);
  await at(0.30);
  await show(L('#podium-titre').locator('xpath=ancestor::section[1]'), { tip: 'Podium de la classe', icon: 'trophy', side: 'left' });
  await at(0.44);
  await show(L('table thead'), { tip: 'Statut, connexion, leçons, XP par élève', icon: 'users', side: 'bottom', scale: 1.01, pad: 8, radius: 12, scroll: 'start' });
  await at(0.62);
  await clear();
  await page.goto(`${BASE}${classHref}/fiches`);
  await settle();
  await page.evaluate(([x, y]) => window.__kv.cursorTo(x, y), [pos.x, pos.y]);
  await at(0.72);
  await show(L('.ec-main .ec-card'), { tip: 'Fiches de connexion à imprimer', icon: 'print', side: 'bottom', scale: 1.015 });
});

await scene('03-programme', async at => {
  await nav('/enseignant/programme');
  await at(0.14);
  await show(L('.ec-prog-track-header'), { tip: 'Parcours selon l\'âge de la classe', icon: 'book', side: 'bottom', pad: 12 });
  await at(0.34);
  await show(L('.ec-prog-module-header'), { tip: 'Modules et leçons guidées', icon: 'book', side: 'bottom', scale: 1.015 });
  await at(0.52);
  await show(L('article.ec-mission-card'), { tip: 'Type d\'activité et durée', icon: 'clock', side: 'right', scale: 1.05 });
  await at(0.72);
  await show(L('article.ec-mission-card a.ec-btn--primary'), { tip: 'Fiche pédagogique de la leçon', icon: 'check', side: 'top', pad: 8, scale: 1.1, radius: 14 });
});

await scene('04-missions', async at => {
  await nav('/enseignant/missions');
  await at(0.06);
  await show(L('select.ec-select'), { tip: 'Choisissez votre classe', icon: 'users', side: 'right', pad: 8, scale: 1.04, radius: 14 });
  await at(0.13);
  const assign = L('article.ec-mission-card button:has-text("Assigner")');
  await show(assign, { tip: 'Des devoirs prêts à l\'emploi', icon: 'target', side: 'top', pad: 8, scale: 1.1, radius: 14 });
  await at(0.20);
  await clear();
  await click(assign, { waitNav: false });
  await sleep(700);
  await at(0.27);
  await show(L('.ec-assign-modal'), { tip: 'Assigner en quelques secondes', icon: 'send', side: 'left', pad: 8, scale: 1.0, cursor: false, radius: 22 });
  await at(0.33);
  const date = L('.ec-assign-modal input[type=date]');
  await click(date, { waitNav: false });
  const d = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  await date.fill(d);
  await show(date, { tip: 'Date limite', icon: 'clock', side: 'left', pad: 8, scale: 1.0, cursor: false, radius: 12 });
  await at(0.40);
  await clear();
  await type(L('.ec-assign-modal textarea'), 'Faites l\'activité avant le cours de jeudi.', 28);
  await show(L('.ec-assign-modal textarea'), { tip: 'Consigne personnalisée', icon: 'sparkles', side: 'left', pad: 8, scale: 1.0, cursor: false, radius: 12 });
  await at(0.52);
  await clear();
  await click(L('.ec-assign-modal .ec-confirm'), { waitNav: false });
  await sleep(900);
  await page.evaluate(() => { const r = document.querySelector('.ec-assign-modal').getBoundingClientRect(); window.__kv.tip({ x: r.left, y: r.top, w: r.width, h: r.height }, 'Devoir envoyé à la classe', 'check', 'right'); });
  await at(0.58);
  await clear();
  await click(L('.ec-assign-modal .ec-cancel'), { waitNav: false });
  await sleep(500);
  await click(L('button[role=tab]:has-text("Devoirs donnés")'), { waitNav: false });
  await sleep(700);
  await at(0.70);
  await show(L('.ec-main .ec-card:has(.ec-progress, [role=progressbar])'), { tip: 'Taux de rendu en direct', icon: 'chart', side: 'right', scale: 1.025 });
});

await scene('05-classement', async at => {
  await nav('/enseignant/classement');
  await at(0.12);
  await show(L('.ec-main select'), { tip: 'Filtrez par période', icon: 'clock', side: 'right', pad: 8, scale: 1.05, radius: 14 });
  await at(0.30);
  await show(L('.ec-grid-stats'), { tip: 'Points d\'expérience gagnés', icon: 'star', side: 'bottom', scale: 1.02 });
  await at(0.50);
  await show(L('table tbody tr'), { tip: 'Un titre encourageant pour chacun', icon: 'trophy', side: 'bottom', pad: 6, scale: 1.02, radius: 12 });
  await at(0.78);
  await show(L('table tbody tr:nth-child(4)'), { tip: 'L\'effort continu valorisé', icon: 'sparkles', side: 'bottom', pad: 6, scale: 1.02, radius: 12 });
});

await scene('06-analytiques', async at => {
  await nav('/enseignant/analytiques');
  await at(0.12);
  await show(L('section.ec-grid-stats[aria-label^="Chiffres clés de"]'), { tip: 'Ponctualité et score moyen', icon: 'clock', side: 'bottom', scale: 1.02 });
  await at(0.36);
  await clear();
  const notions = L('section[aria-labelledby="categories-titre"]');
  await page.evaluate(() => {});
  await center(notions);
  await page.evaluate(() => window.__kv.zoom(document.querySelector('[aria-labelledby="categories-titre"]'), 1.08));
  await sleep(1300);
  await show(notions, { tip: 'Notions maîtrisées ou à consolider', icon: 'chart', side: 'top', scale: 1.02 });
  await at(0.62);
  await show(L('section[aria-labelledby="progression-titre"]'), { tip: 'Progression dans le parcours', icon: 'chart', side: 'top', scale: 1.02 });
  await at(0.80);
  await page.evaluate(() => window.__kv.unzoom());
  await sleep(1300);
  await show(L('button:has-text("Exporter / Imprimer")'), { tip: 'Bilan prêt à imprimer', icon: 'print', side: 'bottom', pad: 8, scale: 1.1, radius: 14 });
});

await scene('07-parametres', async at => {
  await nav('/enseignant/parametres');
  await at(0.14);
  await show(L('section[aria-labelledby="infos-titre"]'), { tip: 'Vos coordonnées', icon: 'users', side: 'bottom', scale: 1.03 });
  await at(0.36);
  await show(L('section[aria-labelledby="ecole-titre"]'), { tip: 'Votre école de rattachement', icon: 'book', side: 'right', scale: 1.03 });
  await at(0.55);
  await show(L('.ec-readonly, .ec-main [class*="info" i]'), { tip: 'Informations gérées par la direction', icon: 'shield', side: 'bottom', scale: 1.01, pad: 8, radius: 14 });
  await at(0.76);
  await show(L('.ec-logout'), { tip: 'Déconnexion sécurisée', icon: 'key', side: 'right', pad: 8, scale: 1.06, radius: 14 });
});

await scene('08-cloture', async at => {
  await clear();
  await nav('/enseignant');
  await glide(1500, 800, 900);
  const logo = await L('.ec-brand-logo img').getAttribute('src');
  await page.evaluate(src => window.__kv.endCard(src, '/palou/Joie.png'), logo);
});

await sleep(1500);
await cdp.send('Page.stopScreencast');
await sleep(300);
await browser.close();

fs.writeFileSync(path.join(WORK, 'marks.json'), JSON.stringify({ frames, marks }, null, 0));
console.log(`${frames.length} images, ${((frames.at(-1) - frames[0])).toFixed(1)} s`);
