const CACHE = "anti-burnout-__BUILD_VERSION__";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const root = new URL("./", self.registration.scope);
    const page = await fetch(root, { redirect: "error" });
    if (!page.ok) throw new Error("App shell unavailable");
    await cache.put(root, page.clone());
    const html = await page.text();
    const required = new Set([...html.matchAll(/<(script|link)\b[^>]*>/gi)].flatMap(([tag, kind]) => {
      if (kind.toLowerCase() === "link" && !/\brel\s*=\s*["'][^"']*\bstylesheet\b[^"']*["']/i.test(tag)) return [];
      const path = tag.match(kind.toLowerCase() === "script" ? /\bsrc\s*=\s*["']([^"']+)["']/i : /\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
      return path ? [path] : [];
    }));
    const assets = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
    const results = await Promise.allSettled(assets.map(async (path) => {
      const url = new URL(path, root);
      if (url.origin !== root.origin || url.hash) return;
      const response = await fetch(url, { redirect: "error" });
      if (!response.ok) throw new Error("App asset unavailable");
      await cache.put(url, response.clone());
      if (url.pathname.endsWith(".webmanifest")) {
        const manifest = await response.clone().json();
        await Promise.allSettled(manifest.icons.map(async (icon) => {
          const image = new URL(icon.src, url);
          if (image.origin !== root.origin) return;
          const file = await fetch(image, { redirect: "error" });
          if (!file.ok) throw new Error("Icon unavailable");
          await cache.put(image, file);
        }));
      }
      if (url.pathname.endsWith(".css")) {
        const css = await response.text();
        const fonts = [...css.matchAll(/url\(["']?([^\s)'"]+)["']?\)/g)].map((match) => match[1]);
        await Promise.allSettled(fonts.map(async (path) => {
          const font = new URL(path, url);
          if (font.origin !== root.origin) return;
          const file = await fetch(font, { redirect: "error" });
          if (!file.ok) throw new Error("Font unavailable");
          await cache.put(font, file);
        }));
      }
    }));
    for (let i = 0; i < results.length; i++) {
      if (required.has(assets[i]) && results[i].status === "rejected") throw results[i].reason;
    }
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
