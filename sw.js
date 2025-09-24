// --- Nombres de caches ---
const CACHE_NAME = "whereclock-v3";       // App shell
const TILE_CACHE = "tiles-cache-v1";      // Tiles de OSM
const MAX_TILES = 300;                     // Máximo de tiles a cachear

// --- Archivos de la aplicación ---
const urlsToCache = [
  "/", "/index.html", "/offline.html",
  "/style.css", "/script.js",
  "/manifest.json",
  "/icons/icon192.png", "/icons/icon512.png",
  "/img/area.jpg", "/img/trayecto.jpg", "/img/alarmas.jpg",
  "/sounds/alarma1.mp3", "/sounds/alarma2.mp3", "/sounds/alarma3.mp3", "/sounds/alarma4.mp3",
  "/libs/leaflet/leaflet.css", "/libs/leaflet/leaflet.js"
];

// --- Instalación ---
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// --- Activación ---
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== TILE_CACHE)
            .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// --- Fetch ---
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // --- Tiles de OSM dinámicos ---
  if (url.origin === "https://tile.openstreetmap.org") {
    event.respondWith(
      caches.open(TILE_CACHE).then(cache =>
        cache.match(event.request).then(response => {
          return response || fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            // Limitar cantidad de tiles
            cache.keys().then(keys => {
              if (keys.length > MAX_TILES) cache.delete(keys[0]);
            });
            return networkResponse;
          });
        })
      )
    );
    return;
  }

  // --- App shell y otros recursos ---
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        // Offline fallback
        if (event.request.destination === "document") {
          return caches.match("/offline.html");
        }
      });
    })
  );
});

// --- Mensajes de script.js ---
self.addEventListener("message", event => {
  if (event.data && event.data.type === "mostrarAlarma") {
    self.registration.showNotification("¡ENTRAS EN EL ÁREA!", {
      body: "WHERECLOCK detectó que entraste en la zona definida.",
      icon: "icons/icon192.png",
      vibrate: [300, 100, 300],
      tag: "alarma-ubicacion",
      renotify: true,
      actions: [{ action: "detener", title: "🛑 Detener alarma" }]
    });
  }
});

// --- Click en notificación ---
self.addEventListener("notificationclick", event => {
  event.notification.close();

  if (event.action === "detener") {
    event.waitUntil(
      clients.matchAll({ type: "window" }).then(clientsList => {
        clientsList.forEach(client => client.postMessage({ type: "detenerAlarma" }));
      })
    );
  } else {
    event.waitUntil(
      clients.matchAll({ type: "window" }).then(clientsList => {
        for (const client of clientsList) if ("focus" in client) return client.focus();
        if (clients.openWindow) return clients.openWindow("/");
      })
    );
  }
});
