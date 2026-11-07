import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

it("uses network-first navigations, cache-first assets, bypasses cross-origin/POST and deletes only old app caches", async () => {
  const handlers: Record<string, (event: Record<string, unknown>) => void> = {};
  const cache = { match: vi.fn(async () => new Response("cached")), put: vi.fn() };
  const network = vi.fn(async () => new Response("network"));
  const remove = vi.fn();
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { location: { origin: "https://example.test" }, registration: { scope: "https://example.test/app/" }, clients: { claim: vi.fn() }, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; } },
    caches: { open: async () => cache, keys: async () => ["anti-burnout-v0", "anti-burnout-v1", "another-app"], delete: remove },
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
