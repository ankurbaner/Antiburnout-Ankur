// Lets the page show notifications on browsers that require a service worker
// (e.g. Chrome on Android). It does not cache anything or touch the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const ours = clients.filter((c) => c.url.startsWith(self.registration.scope));
      const client = ours.find((c) => c.visibilityState === "visible") ?? ours[0];
      return client ? client.focus() : self.clients.openWindow(self.registration.scope);
    }),
  );
});
