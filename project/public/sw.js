/* Sumichem CRM - Service Worker (PWA)
 *
 * Responsabilidades:
 *  - Recibir notificaciones push (Web Push API) y mostrarlas en el dispositivo.
 *  - Abrir/enfocar la app al hacer clic en una notificación.
 *  - Limpiar las cachés antiguas que dejaron versiones anteriores.
 *
 * ⚠ NO interceptamos `fetch` a propósito. El CRM es online-first (todos los
 * datos viven en la base de datos/API), así que el caché del app-shell no
 * aportaba valor y SÍ era la causa de las pantallas en blanco: cuando fallaba
 * la descarga de un `.js`/`.css` (p. ej. tras un deploy que borró el chunk con
 * hash anterior), el handler devolvía `index.html` para ese recurso, el
 * navegador intentaba ejecutar HTML como JavaScript y React nunca montaba.
 * Sin handler de `fetch` el navegador maneja las peticiones normalmente y no
 * hay forma de responder con un contenido equivocado.
 */

self.addEventListener("install", () => {
  // Activa el SW nuevo sin esperar a que se cierren las pestañas.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Borra TODAS las cachés de versiones anteriores (auto-repara clientes que
  // quedaron con assets/índice viejos) y toma el control de las pestañas.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .catch(() => {})
      .then(() => self.clients.claim())
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
