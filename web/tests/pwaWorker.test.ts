import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

it("uses network-first navigations, cache-first assets, bypasses cross-origin/POST and deletes only old app caches", async () => {
  const handlers: Record<string, (event: Record<string, unknown>) => void> = {};
  const cache = { match: vi.fn(async () => new Response("cached")), put: vi.fn() };
  const network = vi.fn(async () => new Response("network"));
  const remove = vi.fn();
  runInNewContext(readFileSync("public/sw.js", "utf8").replace("__BUILD_VERSION__", "test"), {
    self: { location: { origin: "https://example.test" }, registration: { scope: "https://example.test/app/" }, clients: { claim: vi.fn() }, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; } },
    caches: { open: async () => cache, keys: async () => ["anti-burnout-v0", "anti-burnout-test", "another-app"], delete: remove },
    fetch: network, URL, Response,
  });
  const respond = vi.fn();
  handlers.fetch({ request: { method: "GET", url: "https://other.test/asset" }, respondWith: respond });
  handlers.fetch({ request: { method: "POST", url: "https://example.test/app/" }, respondWith: respond });
  expect(respond).not.toHaveBeenCalled();
  expect(network).not.toHaveBeenCalled();
  const request = async (mode: string): Promise<Response> => {
    let result!: Promise<Response>;
    handlers.fetch({ request: { method: "GET", url: "https://example.test/app/", mode }, respondWith: (promise: Promise<Response>) => { result = promise; } });
    return result;
  };
  expect(await (await request("navigate")).text()).toBe("network");
  expect(cache.put).toHaveBeenCalledOnce();
  network.mockRejectedValueOnce(new Error("offline"));
  expect(await (await request("navigate")).text()).toBe("cached");
  network.mockClear();
  expect(await (await request("cors")).text()).toBe("cached");
  expect(network).not.toHaveBeenCalled();
  expect(cache.match).toHaveBeenLastCalledWith(expect.objectContaining({ mode: "cors" }), { ignoreVary: true });
  let activation!: Promise<void>;
  handlers.activate({ waitUntil: (promise: Promise<void>) => { activation = promise; } });
  await activation;
  expect(remove).toHaveBeenCalledOnce();
  expect(remove).toHaveBeenCalledWith("anti-burnout-v0");
});

it("installs the shell despite individual asset, icon and font failures", async () => {
  const handlers: Record<string, (event: Record<string, unknown>) => void> = {};
  const put = vi.fn(), skipWaiting = vi.fn();
  const fetch = vi.fn(async (url: URL) => {
    if (url.pathname === "/app/") return new Response('<script src="missing.js"></script><link href="style.css"><link href="manifest.webmanifest"><img src="https://other.test/image.png">');
    if (url.pathname.endsWith(".css")) return new Response('a{src:url(missing.woff2)}b{src:url(good.woff2)}');
    if (url.pathname.endsWith(".webmanifest")) return Response.json({ icons: [{ src: "missing.png" }, { src: "good.png" }] });
    if (url.pathname.endsWith("missing.woff2")) throw new Error("offline font");
    if (url.pathname.includes("missing")) return new Response("missing", { status: 404 });
    return new Response("asset");
  });
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { registration: { scope: "https://example.test/app/" }, skipWaiting, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; } },
    caches: { open: async () => ({ put }) }, fetch, URL, Response,
  });
  let install!: Promise<void>;
  handlers.install({ waitUntil: (promise: Promise<void>) => { install = promise; } });
  await expect(install).resolves.toBeUndefined();
  expect(skipWaiting).toHaveBeenCalledOnce();
  expect(put.mock.calls.map(([url]) => String(url))).toEqual(expect.arrayContaining(["https://example.test/app/", "https://example.test/app/good.woff2", "https://example.test/app/good.png"]));
  expect(fetch.mock.calls.every(([url]) => url.origin === "https://example.test")).toBe(true);
});

it.each(["offline", "404"])("fails installation when the app shell is %s", async (failure) => {
  let handler!: (event: Record<string, unknown>) => void;
  const skipWaiting = vi.fn();
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { registration: { scope: "https://example.test/app/" }, skipWaiting, addEventListener: (name: string, callback: typeof handler) => { if (name === "install") handler = callback; } },
    caches: { open: async () => ({ put: vi.fn() }) },
    fetch: async () => { if (failure === "offline") throw new Error("offline"); return new Response("missing", { status: 404 }); }, URL, Response,
  });
  let install!: Promise<void>;
  handler({ waitUntil: (promise: Promise<void>) => { install = promise; } });
  await expect(install).rejects.toThrow();
  expect(skipWaiting).not.toHaveBeenCalled();
});
