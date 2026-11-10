// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import html from "../index.html?raw";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 8, 23, 59, 55));
  document.body.innerHTML = new DOMParser().parseFromString(html, "text/html").body.innerHTML;
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it("cleans legacy state, retains manual resets and daily rollover, and never shows reminders", async () => {
  localStorage.setItem("anti-burnout:config", "{bad json");
  localStorage.setItem("anti-burnout:state", JSON.stringify({ tracker: { currentStretchSeconds: 7200 }, meetingMode: true }));
  await import("../src/main");
  expect(localStorage.length).toBe(0);
  expect(document.querySelectorAll('#eyes .yoga-practice')).toHaveLength(5);
  expect(document.querySelectorAll('#yoga .yoga-practice')).toHaveLength(13);
  expect(document.querySelectorAll('#meditation .yoga-practice')).toHaveLength(6);
  const dailyId = document.querySelector('#daily-practice article')?.getAttribute('data-practice');
  vi.advanceTimersByTime(6000);
  expect(document.querySelector('#daily-practice article')?.getAttribute('data-practice')).not.toBe(dailyId);
  const start = document.querySelector<HTMLButtonElement>('[data-action="start-reset"]')!;
  const end = document.querySelector<HTMLButtonElement>('#reset-end')!;
  const next = document.querySelector<HTMLButtonElement>('#reset-next')!;
  const reset = document.querySelector<HTMLElement>('#reset')!;
  start.focus();
  start.click();
  expect(reset.hidden).toBe(false);
  expect(document.querySelector('#reset-clock')?.textContent).toBe('05:00');
  expect(document.activeElement).toBe(end);
  expect(document.querySelector('main')?.inert).toBe(true);
  end.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  expect(document.activeElement).toBe(next);
  next.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
  expect(document.activeElement).toBe(end);
  const first = document.querySelector('#reset-title')?.textContent;
  next.click();
  const second = document.querySelector('#reset-title')?.textContent;
  expect(second).not.toBe(first);
  vi.advanceTimersByTime(1000);
  expect(document.querySelector('#reset-clock')?.textContent).toBe('04:59');
  vi.advanceTimersByTime(299000);
  expect(document.querySelector('#reset-clock')?.textContent).toBe('00:00');
  expect(document.querySelector<HTMLElement>('#reset-done')!.hidden).toBe(false);
  end.click();
  expect(reset.hidden).toBe(true);
  expect(document.querySelector('main')?.inert).toBe(false);
  expect(document.activeElement).toBe(start);
  start.click();
  expect(document.querySelector('#reset-title')?.textContent).not.toBe(second);
  end.click();
  window.dispatchEvent(new Event('pointermove'));
  vi.advanceTimersByTime(3 * 60 * 60 * 1000);
  expect(document.querySelector('#card, #settings, #open-settings, [data-action="preview-card"]')).toBeNull();
  expect(localStorage.length).toBe(0);
});

it("initializes without errors when localStorage is blocked", async () => {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
  await expect(import('../src/main')).resolves.toBeDefined();
  expect(document.querySelectorAll('#daily-practice article')).toHaveLength(2);
  document.querySelector<HTMLButtonElement>('[data-action="start-reset"]')!.click();
  expect(document.querySelector<HTMLElement>('#reset')!.hidden).toBe(false);
});
