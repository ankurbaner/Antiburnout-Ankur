// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { initDailyPractice } from "../src/dailyPracticeUI";
import { dailyPractice } from "../src/dailyPractice";
import { initYoga } from "../src/yogaUI";

afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });

it("handles absent markup and invalid dates", () => {
  expect(() => initDailyPractice()).not.toThrow();
  document.body.innerHTML = '<div id="daily-practice"></div>';
  initDailyPractice(new Date(NaN));
  expect(document.querySelector(".yoga-practice")).toBeNull();
});

it("reuses the timer without Roots, avoids duplicate IDs and cleans up on a new day", () => {
  vi.useFakeTimers();
  const today = new Date(2026, 10, 7);
  document.body.innerHTML = '<div id="daily-practice"></div><div id="yoga-groups"></div>';
  initYoga();
  initDailyPractice(today);
  const practice = dailyPractice(today)!;
  const card = document.querySelector<HTMLElement>("#daily-practice .yoga-practice")!;
  expect(card.dataset.practice).toBe(practice.id);
  expect(card.querySelector("h3")?.textContent).toBe(practice.title);
  expect(card.querySelector(".practice-roots")).toBeNull();
  expect(card.textContent).not.toContain("Roots");
  const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
  expect(new Set(ids).size).toBe(ids.length);
  card.querySelector<HTMLButtonElement>("button")!.click();
  vi.advanceTimersByTime(1000);
  expect(card.querySelector(".yoga-countdown")?.textContent).toBe(`${practice.seconds - 1} s`);
  card.querySelector<HTMLButtonElement>(".yoga-timer button")!.click();
  expect(card.querySelector<HTMLElement>(".yoga-timer")!.hidden).toBe(true);
  card.querySelector<HTMLButtonElement>("button")!.click();
  initDailyPractice(new Date(2026, 10, 8));
  expect(document.querySelector<HTMLElement>("#daily-practice .yoga-practice")!.dataset.practice).not.toBe(practice.id);
  const stoppedCountdown = card.querySelector(".yoga-countdown")?.textContent;
  vi.advanceTimersByTime(1000);
  expect(card.querySelector(".yoga-countdown")?.textContent).toBe(stoppedCountdown);
  expect(vi.getTimerCount()).toBe(0);
});
