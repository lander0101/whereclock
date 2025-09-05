// --- CACHES ---
const CACHE_NAME = "whereclock-v1";       // Recursos principales
const TILE_CACHE = "tiles-cache-v1";      // Tiles de Leaflet

// --- ARCHIVOS A CACHEAR ---
const urlsToCache = [
  "/",
  "/index.html",
  "/offline.html", // <-- fallback offline
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/iconos/icono-192.png",
  "/img/area.jpg",
  "/img/trayecto.jpg",
  "/img/alarmas.jpg",
  "/sounds/alarma1.mp3",
  "/sounds/alarma2.mp3",
  "/sounds/alarma3.mp3",
  "/sounds/alarma4.mp3",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

// --- INSTALACIÓN ---
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("📦 Archivos principales cacheados");
      return cache.addAll(urlsToCache);
    })
  );
});

// --- ACTIVACIÓN ---
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== TILE_CACHE)
          .map(name => caches.delete(name))
      )
    )
  );
});

// --- FETCH ---
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // --- Cache dinámico para tiles de Leaflet ---
  if (url.origin.includes("tile.openstreetmap") || url.origin.includes("tile.openstreetmap.fr")) {
    event.respondWith(
      caches.open(TILE_CACHE).then(cache =>
        cache.match(event.request).then(response => {
          return response || fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
      )
    );
    return;
  }

  // --- Cache de recursos normales ---
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

// --- MENSAJES DESDE SCRIPT.JS ---
self.addEventListener("message", event => {
  if (event.data && event.data.type === "mostrarAlarma") {
    self.registration.showNotification("¡ESTÁS DENTRO DEL ÁREA PREESTABLECIDA!", {
      body: "WHERECLOCK detectó que entraste en la zona definida.",
      icon: "icons/icon-192.png",
      vibrate: [300, 100, 300],
      tag: "alarma-ubicacion",
      renotify: true,
      actions: [
        { action: "detener", title: "🛑 Detener alarma" }
      ]
    });
  }
});

// --- CLICK EN NOTIFICACIÓN ---
self.addEventListener("notificationclick", event => {
  event.notification.close();

  if (event.action === "detener") {
    // Enviar mensaje a todos los clientes para detener alarma
    event.waitUntil(
      clients.matchAll({ type: "window" }).then(clientList => {
        clientList.forEach(client => {
          client.postMessage({ type: "detenerAlarma" });
        });
      })
    );
  } else {
    // Click normal: abrir o enfocar app
    event.waitUntil(
      clients.matchAll({ type: "window" }).then(clientList => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow("/");
      })
    );
  }
});
