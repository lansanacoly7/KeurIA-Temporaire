// Service worker de kEur IA :
// 1. Reçoit les alertes push destinées aux parents et ouvre l'app au clic.
// 2. Cache-First SEULEMENT pour les fichiers dont le nom change à chaque version (/_next/static/) et les polices ; les images passent par le réseau d'abord
//    (une image remplacée doit s'afficher), avec le cache en secours hors ligne.
// 3. AUCUNE page HTML n'est mise en cache : une page de l'espace connecté contient des données de l'enfant ou du parent, et un appareil
//    partagé (tablette de classe) ne doit jamais les resservir à quelqu'un d'autre. Hors ligne : une page neutre.
// 4. À la déconnexion, la page demande de vider tous les caches (message CLEAR_CACHES).

// v2 : les anciens caches (v1) contenaient aussi des PAGES HTML, parfois personnelles ; ils sont supprimés à l'activation.
const CACHE_STATIC_NAME = "keuria-static-v2";
const PRECACHE_ASSETS = [
  "/favicon.svg",
  "/images/keur-ia-logo.png",
];

// Installation : pré-chargement des ressources minimales
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        // En cas d'échec partiel (mode dev), continuer l'installation
      });
    }).then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_STATIC_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de mise en cache intelligente
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1. Ignorer les requêtes non-GET et les requêtes internes/API
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 2. Ignorer les appels API backend (/api/*) et WebSocket
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws/")) {
    return;
  }

  // 3. Fichiers au nom versionné (immuables) et polices : Cache-First.
  const isImmutable = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/") || /\.(woff2|woff|ttf)$/i.test(url.pathname);
  // Autres fichiers statiques (images, styles publics) : réseau d'abord, cache en secours hors ligne.
  const isOtherStatic =
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/palou/") ||
    /\.(png|jpg|jpeg|webp|svg|ico|css|js)$/i.test(url.pathname);

  const remember = (request, networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      const clone = networkResponse.clone();
      caches.open(CACHE_STATIC_NAME).then((cache) => cache.put(request, clone));
    }
    return networkResponse;
  };

  if (isImmutable) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => remember(request, networkResponse))
          .catch(() => new Response("", { status: 408, statusText: "Offline" }));
      })
    );
    return;
  }

  if (isOtherStatic) {
    event.respondWith(
      fetch(request).then((networkResponse) => remember(request, networkResponse))
        .catch(async () => (await caches.match(request)) || new Response("", { status: 408, statusText: "Offline" }))
    );
    return;
  }

  // 4. Pages (navigation) : jamais mises en cache. Hors ligne, une page neutre, sans aucune donnée de compte.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => new Response(
        "<!doctype html><html lang=\"fr\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Hors ligne</title>" +
        "<body style=\"font-family:system-ui,sans-serif;text-align:center;padding:48px 20px\"><h1>Pas de connexion</h1><p>Reconnecte-toi à Internet puis recharge la page.</p></body></html>",
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
      ))
    );
  }
});

// À la déconnexion, la page demande de tout oublier (appareil partagé).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHES") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }
});

// 5. Notifications Web Push
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "kEur IA", {
      body: data.body || "",
      icon: "/images/keur-ia-logo.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
