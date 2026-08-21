// Service worker: guarda el esqueleto de la app para que abra sin conexión.
// Las llamadas a Pl@ntNet y a Wikipedia siempre van a la red (nunca se cachean).

const CACHE = 'verdin-v3';

const ESQUELETO = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/cuidados.js',
  './js/db.js',
  './js/imagen.js',
  './js/plantnet.js',
  './js/riego.js',
  './js/wiki.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ESQUELETO))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  const url = new URL(peticion.url);
  // Todo lo que no sea de nuestro origen (Pl@ntNet, imágenes de Wikipedia)
  // va directo a la red.
  if (url.origin !== self.location.origin) return;

  // Red primero y cache como respaldo: así una actualización se ve enseguida,
  // pero la app sigue abriendo en el metro sin cobertura.
  evento.respondWith(
    fetch(peticion)
      .then((respuesta) => {
        if (respuesta && respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((c) => c.put(peticion, copia));
        }
        return respuesta;
      })
      .catch(async () => {
        const guardada = await caches.match(peticion);
        if (guardada) return guardada;
        if (peticion.mode === 'navigate') return caches.match('./index.html');
        throw new Error('Sin conexión y sin copia en caché');
      })
  );
});
