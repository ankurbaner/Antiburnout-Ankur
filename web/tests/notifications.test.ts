// @vitest-environment jsdom
import html from "../index.html?raw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_WEB_CONFIG, loadConfig, saveConfig } from "../src/storage";

let permission: NotificationPermission;
let status: { onchange: (() => void) | null };

const checkbox = (): HTMLInputElement => document.querySelector<HTMLInputElement>('[name="notifications"]')!;
const button = (): HTMLElement => document.getElementById("enable-notify")!;
const openSettings = (): void => document.getElementById("open-settings")!.click();

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  document.documentElement.innerHTML = html;
  HTMLDialogElement.prototype.showModal = vi.fn();
  localStorage.clear();
  permission = "granted";
  status = { onchange: null };
  vi.stubGlobal("Notification", { get permission() { return permission; } });
  vi.stubGlobal("navigator", { permissions: { query: vi.fn().mockResolvedValue(status) } });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("notification permission synchronization", () => {
  it.each(["granted", "denied", "default"] as const)("reconciles saved opt-in with %s permission on load", async (value) => {
    permission = value;
    saveConfig(localStorage, { ...DEFAULT_WEB_CONFIG, notifications: true });
    await import("../src/main");
    openSettings();
    expect(checkbox().checked).toBe(value === "granted");
    expect(button().hidden).toBe(value === "granted");
    expect(loadConfig(localStorage).notifications).toBe(value === "granted");
  });

  it("does not opt in without saved preferences even when permission is granted", async () => {
    await import("../src/main");
    openSettings();
    expect(checkbox().checked).toBe(false);
    expect(button().hidden).toBe(false);
    expect(loadConfig(localStorage).notifications).toBe(false);
  });

  it("updates an open dialog and saved config when permission is revoked", async () => {
    saveConfig(localStorage, { ...DEFAULT_WEB_CONFIG, notifications: true });
    await import("../src/main");
    openSettings();
    expect(checkbox().checked).toBe(true);
    permission = "denied";
    expect(status.onchange).toBeTypeOf("function");
    status.onchange!();
    expect(checkbox().checked).toBe(false);
    expect(button().hidden).toBe(false);
    expect(loadConfig(localStorage).notifications).toBe(false);
  });

  it.each(["missing", "rejected"])("falls back to rendering when Permissions API is %s", async (mode) => {
    vi.stubGlobal("navigator", mode === "missing" ? {} : {
      permissions: { query: vi.fn().mockRejectedValue(new Error("Unsupported permission")) },
    });
    saveConfig(localStorage, { ...DEFAULT_WEB_CONFIG, notifications: true });
    await import("../src/main");
    openSettings();
    permission = "denied";
    vi.advanceTimersByTime(1000);
    expect(checkbox().checked).toBe(false);
    expect(button().hidden).toBe(false);
    expect(loadConfig(localStorage).notifications).toBe(false);
  });

  it("clears stale opt-in when notifications are unavailable", async () => {
    Reflect.deleteProperty(window, "Notification");
    saveConfig(localStorage, { ...DEFAULT_WEB_CONFIG, notifications: true });
    await import("../src/main");
    openSettings();
    expect(checkbox().checked).toBe(false);
    expect(button().hidden).toBe(true);
    expect(loadConfig(localStorage).notifications).toBe(false);
  });
});
