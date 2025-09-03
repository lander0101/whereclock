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
let trayectoTiempo = 0, trayectoTimer, marcadorFlecha;

// --- Cambio de página ---
function cambiarPagina() {
  const hash = window.location.hash.replace('#', '') || 'home';
  Object.entries(pages).forEach(([key, div]) => {
    div.classList.toggle('hidden', key !== hash);
  });

  if (hash === 'area' && !map) setTimeout(iniciarMapa, 100);
  if (hash === 'trayecto' && !trayectoMap) setTimeout(iniciarTrayectoMapa, 100);
}
window.addEventListener('hashchange', cambiarPagina);
window.addEventListener('load', cambiarPagina);

// --- Mapa del área ---
function iniciarMapa() {
  map = L.map('map').setView([zona.lat, zona.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png').addTo(map);

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
      } else {
        alert("Ciudad no encontrada");
      }
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
  } else {
    alert("Geolocalización no soportada");
  }
}

function toggleAlarma() {
  alarmaActiva = !alarmaActiva;
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
  audio.play().catch(err => console.error("Error al reproducir la alarma:", err));
  alarmaTimeout = setTimeout(() => detenerAlarma(), 10000); // Detener tras 10 segundos
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
  if (alarmaTimeout) {
    clearTimeout(alarmaTimeout);
    alarmaTimeout = null;
  }
}

// --- Trayecto (placeholder) ---
function iniciarTrayectoMapa() {
  trayectoMap = L.map('trayectoMapa').setView([zona.lat, zona.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png').addTo(trayectoMap);
  trayectoPolyline = L.polyline([], { color: 'blue' }).addTo(trayectoMap);
}

function iniciarTrayecto() {
  trayecto = [];
  trayectoTiempo = 0;
  trayectoPolyline.setLatLngs([]);
  trayectoTimer = setInterval(() => {
    trayectoTiempo++;
    document.getElementById('contadorTiempo').textContent = trayectoTiempo;
  }, 1000);
}

function finalizarTrayecto() {
  clearInterval(trayectoTimer);
  trayectos.push([...trayecto]);
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
