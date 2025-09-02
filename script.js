const pages = {
  home: document.getElementById('homePage'),
  area: document.getElementById('areaPage'),
  trayecto: document.getElementById('trayectoPage'),
  alarmas: document.getElementById('alarmasPage')
};

let alarmaActiva = true;
let map, circle;
let zona = { lat: 40.4168, lng: -3.7038, radius: 300 };
let trayectoMap, trayectoPolyline, trayecto = [], trayectos = [];
let trayectoTiempo = 0, trayectoTimer, marcadorFlecha;

// --- CAMBIO DE PÁGINAS ---
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

// --- MAPA DEL ÁREA ---
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

// --- TONOS ---
function probarTono() {
  const selector = document.getElementById('tonoSelector');
  const audio = document.getElementById('alarmaAudio');
  audio.src = selector.value;
  audio.play();
}

// --- TRAYECTO ---
function iniciarTrayectoMapa() {
  trayectoMap = L.map('trayectoMapa').setView([40.4168, -3.7038], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png').addTo(trayectoMap);
}

function iniciarTrayecto() {
  trayecto = [];
  trayectoTiempo = 0;
  document.getElementById('contadorTiempo').textContent = "0";

  trayectoPolyline = L.polyline([], { color: 'blue' }).addTo(trayectoMap);
  alert("Trayecto iniciado");

  // Iniciar contador
  trayectoTimer = setInterval(() => {
    trayectoTiempo++;
    document.getElementById('contadorTiempo').textContent = trayectoTiempo;
  }, 1000);

  if (navigator.geolocation) {
    trayecto.interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(pos => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        trayecto.push(coords);
        trayectoPolyline.addLatLng(coords);
        trayectoMap.setView(coords, 15);

        // Dibujar flecha
        if (!marcadorFlecha) {
          marcadorFlecha = L.marker(coords, {
            icon: L.divIcon({ className: 'arrow-marker' })
          }).addTo(trayectoMap);
        } else {
          marcadorFlecha.setLatLng(coords);

          // Calcular ángulo de rotación
          if (trayecto.length > 1) {
            const [lat1, lon1] = trayecto[trayecto.length - 2];
            const [lat2, lon2] = trayecto[trayecto.length - 1];
            const angle = Math.atan2(lat2 - lat1, lon2 - lon1) * 180 / Math.PI;
            marcadorFlecha._icon.style.transform = `rotate(${angle}deg)`;
          }
        }
      });
    }, 3000);
  }
}

function finalizarTrayecto() {
  clearInterval(trayecto.interval);
  clearInterval(trayectoTimer);

  if (trayecto.length > 1) {
    const distancia = calcularDistanciaTotal(trayecto).toFixed(2);
    const tiempo = trayectoTiempo;
    const resumen = `📍 Trayecto finalizado. Distancia: ${distancia} km. Tiempo: ${tiempo} seg.`;
    
    trayectos.push({ coords: trayecto, resumen });
    mostrarTrayectos();
    alert(resumen);
  }

  if (marcadorFlecha) {
    trayectoMap.removeLayer(marcadorFlecha);
    marcadorFlecha = null;
  }
}

function mostrarTrayectos() {
  const lista = document.getElementById('trayectosGuardados');
  lista.innerHTML = '';
  trayectos.forEach(t => {
    const li = document.createElement('li');
    li.textContent = t.resumen;
    lista.appendChild(li);
  });
}

function calcularDistanciaTotal(puntos) {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    const [lat1, lon1] = puntos[i - 1];
    const [lat2, lon2] = puntos[i];
    total += L.latLng(lat1, lon1).distanceTo([lat2, lon2]); // metros
  }
  return total / 1000; // km
}

// --- CHEQUEO DE ENTRADA AL ÁREA ---
setInterval(() => {
  if (!alarmaActiva) return;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const distancia = L.latLng(lat, lng).distanceTo([zona.lat, zona.lng]);
      
      if (distancia <= zona.radius) {
        const audio = document.getElementById('alarmaAudio');
        if (audio.src) {
          audio.play();
          alert("¡Has llegado al área definida!");
          alarmaActiva = false; // evitar bucle
        }
      }
    });
  }
}, 5000);
