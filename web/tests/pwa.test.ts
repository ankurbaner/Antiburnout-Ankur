// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initInstall } from "../src/pwa";

afterEach(() => { document.body.replaceChildren(); });
it("keeps install hidden until a prompt and handles dismissal and installation", async () => {
  document.body.innerHTML = '<button id="install-app" hidden>Install app</button>';
  initInstall();
  const button = document.querySelector<HTMLButtonElement>("button")!;
  expect(button.hidden).toBe(true);
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: "dismissed" }) });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(button.hidden).toBe(false);
  button.click();
  await Promise.resolve();
  expect(prompt).toHaveBeenCalledOnce();
  expect(button.hidden).toBe(true);
  window.dispatchEvent(event);
  window.dispatchEvent(new Event("appinstalled"));
  expect(button.hidden).toBe(true);
});
it("uses relative app URLs and real PNG icons of the declared sizes", () => {
  const manifest = JSON.parse(readFileSync(resolve("public/manifest.webmanifest"), "utf8"));
  expect(manifest.start_url).toBe("./");
  expect(manifest.scope).toBe("./");
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    const bytes = readFileSync(resolve("public", icon.src));
    expect(bytes.subarray(1, 4).toString()).toBe("PNG");
    expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(icon.sizes);
  }
});
