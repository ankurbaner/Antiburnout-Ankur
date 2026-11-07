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
  HTMLDialogElement.prototype.close = vi.fn();
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
  it.each(["granted", "denied", "default"] as const)("shows persistent feedback for %s after clicking enable", async (outcome) => {
    permission = "default";
    const requestPermission = vi.fn().mockImplementation(async () => {
      permission = outcome;
      return outcome;
    });
    vi.stubGlobal("Notification", { get permission() { return permission; }, requestPermission });
    await import("../src/main");
    button().click();
    await vi.advanceTimersByTimeAsync(1000);
    const message = document.getElementById("notification-status")!;
    expect(requestPermission).toHaveBeenCalledOnce();
    expect(message.getAttribute("aria-live")).toBe("polite");
    expect(message.textContent).toContain(outcome === "granted" ? "Notifications are on" : outcome === "denied" ? "site settings (the lock icon" : "You can try again");
    expect(message.hidden).toBe(false);
    expect(button().hidden).toBe(outcome === "granted");
    expect(loadConfig(localStorage).notifications).toBe(outcome === "granted");
  });

  it("shows the same feedback when enabling from Settings", async () => {
    await import("../src/main");
    openSettings();
    checkbox().checked = true;
    const form = document.getElementById("settings-form")!;
    form.dispatchEvent(new SubmitEvent("submit", {
      cancelable: true,
      submitter: form.querySelector<HTMLButtonElement>('[value="save"]'),
    }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(document.getElementById("notification-status")!.textContent).toContain("Notifications are on");
    expect(button().hidden).toBe(true);
  });

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
