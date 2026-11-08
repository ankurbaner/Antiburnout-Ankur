// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { initPracticeGroups, initYoga } from "../src/yogaUI";

afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });

it.each([
  [0, "0 s"],
  [20, "20 s"],
  [59, "59 s"],
  [60, "1 min"],
  [90, "1 min 30 s"],
  [120, "2 min"],
  [125, "2 min 5 s"],
  [600, "10 min"],
])("labels a %s-second practice as %s without fractional minutes", (seconds, label) => {
  document.body.innerHTML = '<div id="practice-groups"></div>';
  initPracticeGroups("practice-groups", [{ id: "test", title: "Practices", practices: [
    { id: "test", title: "Practice", english: "A quiet break", instruction: "Rest comfortably.", seconds: Number(seconds) },
  ] }]);
  expect(document.querySelector('.yoga-duration')?.textContent).toBe(label);
});

it("does nothing when the yoga container is absent", () => {
  expect(() => initYoga()).not.toThrow();
  expect(document.body.children).toHaveLength(0);
});

it("renders all groups and runs, completes, closes and restarts an inline timer", () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="yoga-groups"></div>';
  initYoga();
  expect(document.querySelectorAll(".yoga-group")).toHaveLength(3);
  expect(document.querySelectorAll(".yoga-practice")).toHaveLength(13);
  expect(document.querySelector('.yoga-hidden, [data-practice^="gentle-"]')).toBeNull();
  const card = document.querySelector<HTMLElement>(".yoga-practice")!;
  const start = card.querySelector<HTMLButtonElement>("button")!;
  const timer = card.querySelector<HTMLElement>(".yoga-timer")!;
  const done = timer.querySelector<HTMLButtonElement>("button")!;
  const countdown = card.querySelector(".yoga-countdown")!;
  start.click();
  expect(timer.hidden).toBe(false);
  expect(countdown.textContent).toBe("01:00");
  vi.advanceTimersByTime(1000);
  expect(countdown.textContent).toBe("00:59");
  done.click();
  expect(timer.hidden).toBe(true);
  expect(start.hidden).toBe(false);
  expect(document.activeElement).toBe(start);
  start.click();
  expect(countdown.textContent).toBe("01:00");
  vi.advanceTimersByTime(60000);
  expect(countdown.textContent).toBe("00:00");
  expect(card.querySelector('[role="status"]')?.textContent).toContain("All done");
  expect(vi.getTimerCount()).toBe(0);
  done.click();
  expect(timer.hidden).toBe(true);
});

it("starts, completes and restarts the ten-minute walk using the shared timer", () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="yoga-groups"></div>';
  initYoga();
  const card = document.querySelector<HTMLElement>('[data-practice="walk-break"]')!;
  expect(card.querySelector(".yoga-duration")?.textContent).toBe("10 min");
  const start = card.querySelector<HTMLButtonElement>("button")!;
  start.click();
  expect(card.querySelector(".yoga-countdown")?.textContent).toBe("10:00");
  vi.advanceTimersByTime(1000);
  expect(card.querySelector(".yoga-countdown")?.textContent).toBe("09:59");
  vi.advanceTimersByTime(1000);
  expect(card.querySelector(".yoga-countdown")?.textContent).toBe("09:58");
  vi.advanceTimersByTime(539000);
  expect(card.querySelector(".yoga-countdown")?.textContent).toBe("00:59");
  vi.advanceTimersByTime(59000);
  expect(card.querySelector(".yoga-countdown")?.textContent).toBe("00:00");
  expect(card.querySelector('[role="status"]')?.textContent).toContain("All done");
  card.querySelector<HTMLButtonElement>(".yoga-timer button")!.click();
  expect(document.activeElement).toBe(start);
  start.click();
  expect(card.querySelector(".yoga-countdown")?.textContent).toBe("10:00");
  card.querySelector<HTMLButtonElement>(".yoga-timer button")!.click();
});
