// Service worker : aucune page HTML mise en cache (données personnelles, appareils partagés), images fraîches, vidage à la déconnexion.
// Lancer : npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(FRONTEND, "public", "sw.js"), "utf8");

function boot() {
  const listeners = {};
  const store = new Map();   // nom du cache -> Map(url -> réponse)
  const puts = [];
  const cacheApi = {
    open: async name => {
      if (!store.has(name)) store.set(name, new Map());
      return { put: async (req, res) => { puts.push(req.url); store.get(name).set(req.url, res); }, addAll: async () => {} };
    },
    match: async req => { for (const c of store.values()) if (c.has(req.url)) return c.get(req.url); return undefined; },
    keys: async () => [...store.keys()],
    delete: async name => store.delete(name),
  };
  const state = { online: true };
  const response = body => ({ status: 200, body, clone() { return this; } });
  const self = { addEventListener: (type, fn) => { listeners[type] = fn; }, skipWaiting() {}, clients: { claim() {}, matchAll: async () => [] }, registration: {} };
  new Function("self", "caches", "fetch", "Response", "URL", source)(
    self,
    cacheApi,
    async () => { if (!state.online) throw new Error("hors ligne"); return response("réseau"); },
    class { constructor(body, init = {}) { this.body = body; this.status = init.status ?? 200; this.headers = init.headers; } clone() { return this; } },
    URL,
  );
  const fetchEvent = (url, mode = "no-cors") => {
    let answer;
    listeners.fetch({ request: { method: "GET", url, mode }, respondWith: p => { answer = p; } });
    return answer;
  };
  return { listeners, store, puts, state, fetchEvent };
}

test("une page (navigation) n'est jamais mise en cache, même connectée", async () => {
  const sw = boot();
  const result = await sw.fetchEvent("https://keuria.test/dashboard", "navigate");
  assert.equal(result.body, "réseau");
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(sw.puts, [], "aucune page ne doit être copiée dans le cache");
});

test("hors ligne, une page neutre est servie, jamais une page de compte", async () => {
  const sw = boot();
  sw.state.online = false;
  const result = await sw.fetchEvent("https://keuria.test/dashboard", "navigate");
  assert.equal(result.status, 503);
  assert.ok(!/dashboard|enfant|parent/i.test(result.body.replace("Reconnecte-toi", "")), "la page hors ligne ne contient aucune donnée de compte");
});

test("une image est demandée au réseau d'abord : une image remplacée s'affiche, et reste disponible hors ligne", async () => {
  const sw = boot();
  const first = await sw.fetchEvent("https://keuria.test/images/parcours79/lecons/m01-l1-s03.webp");
  assert.equal(first.body, "réseau");
  sw.state.online = false;
  const offline = await sw.fetchEvent("https://keuria.test/images/parcours79/lecons/m01-l1-s03.webp");
  assert.equal(offline.body, "réseau", "repli sur le cache hors ligne");
});

test("les appels /api ne passent jamais par le service worker", () => {
  const sw = boot();
  assert.equal(sw.fetchEvent("https://keuria.test/api/progress/me"), undefined);
});

test("à la déconnexion (CLEAR_CACHES), tous les caches sont vidés", async () => {
  const sw = boot();
  await sw.fetchEvent("https://keuria.test/images/x.png");
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.ok(sw.store.size > 0);
  let done;
  sw.listeners.message({ data: { type: "CLEAR_CACHES" }, waitUntil: p => { done = p; } });
  await done;
  assert.equal(sw.store.size, 0);
});

test("la déconnexion demande bien au service worker de tout oublier", () => {
  const signOut = fs.readFileSync(path.join(FRONTEND, "app", "sign-out-client.ts"), "utf8");
  assert.match(signOut, /CLEAR_CACHES/);
  assert.match(signOut, /clearServiceWorkerCaches\(\);/);
});
