// Lets the page show notifications on browsers that require a service worker
// (e.g. Chrome on Android). It does not cache anything or touch the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((c) => "focus" in c);
      return client ? client.focus() : self.clients.openWindow(self.registration.scope);
    }),
  );
});
