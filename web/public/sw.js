const CACHE = "anti-burnout-v1";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const root = new URL("./", self.registration.scope);
    const page = await fetch(root, { redirect: "error" });
    if (!page.ok) throw new Error("App shell unavailable");
    await cache.put(root, page.clone());
    const html = await page.text();
    const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => new URL(match[1], root)).filter((url) => url.origin === root.origin && !url.hash);
    await Promise.all(assets.map(async (url) => {
      const response = await fetch(url, { redirect: "error" });
      if (!response.ok) throw new Error("App asset unavailable");
      await cache.put(url, response.clone());
      if (url.pathname.endsWith(".webmanifest")) {
        const manifest = await response.clone().json();
        await Promise.all(manifest.icons.map(async (icon) => {
          const image = new URL(icon.src, url);
          if (image.origin !== root.origin) return;
          const file = await fetch(image, { redirect: "error" });
          if (!file.ok) throw new Error("Icon unavailable");
          await cache.put(image, file);
        }));
      }
      if (url.pathname.endsWith(".css")) {
        const css = await response.text();
        const fonts = [...css.matchAll(/url\(["']?([^\s)'"\s]+)["']?\)/g)].map((match) => new URL(match[1], url)).filter((font) => font.origin === root.origin);
        await Promise.all(fonts.map(async (font) => {
          const file = await fetch(font, { redirect: "error" });
          if (!file.ok) throw new Error("Font unavailable");
          await cache.put(font, file);
        }));
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("anti-burnout-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = async () => {
      const response = await fetch(request, { redirect: "error" });
      if (!response.ok) throw new Error("Offline or unavailable");
      await cache.put(request, response.clone());
      return response;
    };
    if (request.mode === "navigate") {
      try { return await network(); }
      catch { return await cache.match(request) || await cache.match(new URL("./", self.registration.scope)) || Response.error(); }
    }
    return await cache.match(request, { ignoreVary: true }) || await network();
  })());
});
