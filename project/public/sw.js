/* Sumichem CRM - Service Worker (PWA)
 *
 * Responsabilidades:
 *  - Recibir notificaciones push (Web Push API) y mostrarlas en el dispositivo.
 *  - Abrir/enfocar la app al hacer clic en una notificación.
 *  - Cache básico del app-shell (network-first) para que la app abra rápido.
 */
const CACHE_NAME = "sumichem-crm-v1";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .catch(() => {})
  );
  self.clients.claim();
});

/* Estrategia network-first para el app-shell: usa red si hay conexión y
 * cae a la caché si no. El resto (API, imágenes externas) nunca se cachea. */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const mismoOrigen = url.origin === self.location.origin;
  const esRecursoEstatico =
    /\.(js|css|png|svg|ico|woff2?|webmanifest)$/.test(url.pathname) ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html");

  if (!mismoOrigen || !esRecursoEstatico) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match("./index.html"))
      )
  );
});

/* Notificaciones push */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }

  const titulo = data.title || "Sumichem CRM";
  const opciones = {
    body: data.body || "",
    icon: data.icon || "./icons/icon-192.png",
    badge: data.badge || "./icons/icon-192.png",
    data: { url: data.url || "./" },
    tag: data.tag || "sumichem-crm",
    renotify: data.renotify || false,
    silent: data.silent || false,
  };

  if (data.actions && Array.isArray(data.actions) && data.actions.length) {
    opciones.actions = data.actions;
  }

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

/* Al hacer clic en la notificación: abrir/enfocar la app en la ruta indicada. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "./";
  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

/* Cerrar notificación con action (opcional) */
self.addEventListener("notificationclose", (event) => {
  event.notification.close();
});
