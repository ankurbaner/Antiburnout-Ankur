// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { initYoga } from "../src/yogaUI";

afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });

it("does nothing when the yoga container is absent", () => {
  expect(() => initYoga()).not.toThrow();
  expect(document.body.children).toHaveLength(0);
});

it("renders all groups and runs, completes, closes and restarts an inline timer", () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="yoga-groups"></div>';
  initYoga();
  expect(document.querySelectorAll(".yoga-group")).toHaveLength(3);
  expect(document.querySelectorAll(".yoga-practice")).toHaveLength(12);
  expect(document.querySelector('.yoga-hidden, [data-practice^="gentle-"]')).toBeNull();
  const card = document.querySelector<HTMLElement>(".yoga-practice")!;
  const start = card.querySelector<HTMLButtonElement>("button")!;
  const timer = card.querySelector<HTMLElement>(".yoga-timer")!;
  const done = timer.querySelector<HTMLButtonElement>("button")!;
  const countdown = card.querySelector(".yoga-countdown")!;
  start.click();
  expect(timer.hidden).toBe(false);
  expect(countdown.textContent).toBe("60 s");
  vi.advanceTimersByTime(1000);
  expect(countdown.textContent).toBe("59 s");
  done.click();
  expect(timer.hidden).toBe(true);
  expect(start.hidden).toBe(false);
  expect(document.activeElement).toBe(start);
  start.click();
  expect(countdown.textContent).toBe("60 s");
  vi.advanceTimersByTime(60000);
  expect(countdown.textContent).toBe("0 s");
  expect(card.querySelector('[role="status"]')?.textContent).toContain("All done");
  expect(vi.getTimerCount()).toBe(0);
  done.click();
  expect(timer.hidden).toBe(true);
});
