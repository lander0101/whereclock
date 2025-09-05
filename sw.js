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
      // Devuelve del caché si existe, sino de la red
      return response || fetch(event.request).catch(() => {
        // Si falla la red y no está en caché, devolver fallback (opcional)
        if (event.request.destination === "document") {
          return caches.match("/index.html");
        }
      });
    })
  );
});
