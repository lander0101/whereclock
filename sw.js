// Nombre de la caché
const CACHE_NAME = "whereclock-v1";

// Archivos que se van a guardar en caché
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
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

// Instalar Service Worker y guardar archivos en caché
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("📦 Archivos cacheados");
      return cache.addAll(urlsToCache);
    })
  );
});

// Activar y limpiar cachés viejas
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
});

// Interceptar peticiones
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        if (event.request.destination === "document") {
          return caches.match("/index.html");
        }
      });
    })
  );
});

// --- Escuchar mensajes desde script.js para mostrar notificación ---
self.addEventListener("message", event => {
  if (event.data && event.data.type === "mostrarAlarma") {
    self.registration.showNotification("¡ESTÁS DENTRO DEL ÁREA PREESTABLECIDA!", {
      body: "WHERECLOCK detectó que entraste en la zona definida.",
      icon: "icons/icon-192.png",
      vibrate: [300, 100, 300],
      tag: "alarma-ubicacion", // evita duplicados
      renotify: true
    });
  }
});

// --- Manejo opcional de click en notificación ---
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(clientList => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
