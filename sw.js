// Service worker mínimo de Skadii: solo hace que la app se pueda instalar en el celular.
// A propósito NO guarda nada en caché: cada vez que se abre, la app carga la versión más
// reciente publicada (un caché podría dejar a los asesores con una versión vieja).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* sin caché: el navegador atiende cada petición normalmente */ });
