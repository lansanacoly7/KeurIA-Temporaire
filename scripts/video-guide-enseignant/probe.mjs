import { chromium } from 'playwright';
const OUT = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(() => { try { localStorage.setItem('keria_display_zoom', 'standard'); } catch {} });
const p = await ctx.newPage();
await p.goto('http://localhost:3100/connexion');
await p.getByRole('button', { name: /enseignant/i }).first().click();
await p.locator('input[name=email]').fill('khady.faye@example.com');
await p.locator('input[name=password]').fill('DemoEns2026');
await p.locator('button.login-primary').click();
await p.waitForURL(/enseignant/, { timeout: 30000 });
for (const r of ['', '/classes', '/programme', '/missions', '/classement', '/analytiques', '/parametres']) {
  await p.goto('http://localhost:3100/enseignant' + r); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/p${r.replace('/', '_') || '_home'}.png` });
}
await ctx.storageState({ path: `${OUT}/state.json` });
await b.close();
