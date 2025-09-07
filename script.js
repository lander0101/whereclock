document.addEventListener('DOMContentLoaded', () => {
  const pages = {
    home: document.getElementById('homePage'),
    area: document.getElementById('areaPage'),
    trayecto: document.getElementById('trayectoPage'),
    alarmas: document.getElementById('alarmasPage')
  };

  let alarmaActiva = true;
  let alarmaTimeout = null;
  const audio = document.getElementById('alarmaAudio');

  let map, circle;
  let zona = { lat: 40.4168, lng: -3.7038, radius: 300 };
  let trayectoMap, trayectoPolyline, trayecto = [], trayectos = [];
  let trayectoTiempo = 0, trayectoTimer, trayectoWatcher;
  let yaDentroDeZona = false;

  // --- Cargar trayectos de localStorage ---
  const saved = localStorage.getItem("trayectos");
  if (saved) trayectos = JSON.parse(saved);

  // --- Cambio de página ---
  function cambiarPagina() {
    const hash = window.location.hash.replace('#', '') || 'home';
    Object.entries(pages).forEach(([key, div]) => {
      if (div) div.classList.toggle('hidden', key !== hash);
    });

    if (hash === 'area' && !map) setTimeout(iniciarMapa, 100);
    if (hash === 'trayecto' && !trayectoMap) setTimeout(iniciarTrayectoMapa, 100);
  }

  window.addEventListener('hashchange', cambiarPagina);
  cambiarPagina();

  // --- Mapa del área ---
  function iniciarMapa() {
    map = L.map('map').setView([zona.lat, zona.lng], 13);

    // ✅ Tiles online OSM, Leaflet local
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }).addTo(map);

    circle = L.circle([zona.lat, zona.lng], {
      radius: zona.radius,
      color: 'red',
      fillOpacity: 0.4
    }).addTo(map);

    map.on('click', e => {
      zona.lat = e.latlng.lat;
      zona.lng = e.latlng.lng;
      circle.setLatLng(e.latlng);
    });

    document.getElementById('radiusRange').addEventListener('input', e => {
      zona.radius = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = zona.radius + 'm';
      circle.setRadius(zona.radius);
    });
  }

  function buscarCiudad() {
    const ciudad = document.getElementById('searchInput').value;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ciudad)}`)
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          const loc = data[0];
          const latlng = [parseFloat(loc.lat), parseFloat(loc.lon)];
          map.setView(latlng, 13);
          zona.lat = latlng[0];
          zona.lng = latlng[1];
          circle.setLatLng(latlng);
        } else alert("Ciudad no encontrada");
      });
  }

  function centrarUbicacion() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        map.setView(coords, 14);
        zona.lat = coords[0];
        zona.lng = coords[1];
        circle.setLatLng(coords);
      });
    } else alert("Geolocalización no soportada");
  }

  function toggleAlarma() {
    alarmaActiva = !alarmaActiva;
    yaDentroDeZona = false;
    const status = document.getElementById('alarmStatus');
    const button = document.getElementById('toggleAlarmaBtn');
    if (alarmaActiva) {
      status.textContent = '✅ Alarma activa';
      status.className = 'alarm-status alarm-active';
      button.textContent = 'Desactivar alarma';
    } else {
      status.textContent = '🚫 Alarma desactivada';
      status.className = 'alarm-status alarm-inactive';
      button.textContent = 'Activar alarma';
    }
  }

  // --- Tonos ---
  function reproducirAlarma() {
    const selector = document.getElementById('tonoSelector');
    const tono = selector ? selector.value : "sounds/alarma1.mp3";
    audio.src = tono;
    audio.currentTime = 0;
    audio.loop = true;
    audio.play().catch(err => console.error("Error al reproducir alarma:", err));
  }

  function probarTono() {
    const selector = document.getElementById('tonoSelector');
    const tono = selector.value;
    audio.src = tono;
    audio.currentTime = 0;
    audio.loop = false;
    audio.play().catch(err => console.error("Error al reproducir el tono:", err));
  }

  function detenerAlarma() {
    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
    if (alarmaTimeout) clearTimeout(alarmaTimeout);
  }

  // --- Trayecto ---
  function iniciarTrayectoMapa() {
    trayectoMap = L.map('trayectoMapa').setView([zona.lat, zona.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM'
    }).addTo(trayectoMap);
    trayectoPolyline = L.polyline([], { color: 'blue' }).addTo(trayectoMap);
  }

  function iniciarTrayecto() {
    trayecto = [];
    trayectoTiempo = 0;
    trayectoPolyline.setLatLngs([]);
    document.getElementById('contadorTiempo').textContent = 0;

    trayectoTimer = setInterval(() => {
      trayectoTiempo++;
      document.getElementById('contadorTiempo').textContent = trayectoTiempo;
    }, 1000);

    if (navigator.geolocation) {
      trayectoWatcher = navigator.geolocation.watchPosition(pos => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        trayecto.push(coords);
        trayectoPolyline.addLatLng(coords);
        trayectoMap.setView(coords, 15);
      }, err => console.warn(err), { enableHighAccuracy: true });
    }
  }

  function finalizarTrayecto() {
    clearInterval(trayectoTimer);
    if (trayectoWatcher) navigator.geolocation.clearWatch(trayectoWatcher);
    trayectos.push([...trayecto]);
    localStorage.setItem("trayectos", JSON.stringify(trayectos));
    alert("Trayecto guardado");
  }

  function mostrarTrayectos() {
    const lista = document.getElementById('trayectosGuardados');
    lista.innerHTML = '';
    trayectos.forEach((t, i) => {
      const li = document.createElement('li');
      li.textContent = `Trayecto ${i + 1}: ${t.length} puntos`;
      lista.appendChild(li);
    });
  }

  // --- Verificación de ubicación ---
  function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function verificarUbicacionEnZona(pos) {
    if (!alarmaActiva || !zona) return;

    const distancia = calcularDistancia(
      pos.coords.latitude,
      pos.coords.longitude,
      zona.lat,
      zona.lng
    );

    if (distancia <= zona.radius && !yaDentroDeZona) {
      reproducirAlarma();
      yaDentroDeZona = true;

      if (Notification.permission === "default") Notification.requestPermission();
      if (Notification.permission === "granted" && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "mostrarAlarma" });
      }
    }

    if (distancia > zona.radius) yaDentroDeZona = false;
  }

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(verificarUbicacionEnZona, err => console.warn(err), { enableHighAccuracy: true });
  }

  // --- Mensajes desde SW ---
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener("message", event => {
      if (event.data && event.data.type === "detenerAlarma") {
        detenerAlarma();
        alarmaActiva = false;
        toggleAlarma();
      }
    });
  }

  // --- Exponer funciones globales ---
  window.buscarCiudad = buscarCiudad;
  window.centrarUbicacion = centrarUbicacion;
  window.toggleAlarma = toggleAlarma;
  window.reproducirAlarma = reproducirAlarma;
  window.probarTono = probarTono;
  window.detenerAlarma = detenerAlarma;
  window.iniciarTrayecto = iniciarTrayecto;
  window.finalizarTrayecto = finalizarTrayecto;
  window.mostrarTrayectos = mostrarTrayectos;
});
