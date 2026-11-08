// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { initDailyPractice } from "../src/dailyPracticeUI";
import { dailyPracticePair } from "../src/dailyPractice";
import { initYoga } from "../src/yogaUI";
import { formatClock } from "../src/format";

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
  const practice = dailyPracticePair(today).mindfulness!;
  const card = document.querySelector<HTMLElement>("#daily-practice .yoga-practice")!;
  expect(card.dataset.practice).toBe(practice.id);
  expect(card.querySelector("h4")?.textContent).toBe(practice.title);
  expect([...document.querySelectorAll("#daily-practice h3")].map((heading) => heading.textContent)).toEqual(["Mindfulness", "Yoga exercise"]);
  expect(document.querySelectorAll("#daily-practice .yoga-practice")).toHaveLength(2);
  expect(card.querySelector(".practice-roots")).toBeNull();
  expect(card.textContent).not.toContain("Roots");
  const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
  expect(new Set(ids).size).toBe(ids.length);
  card.querySelector<HTMLButtonElement>("button")!.click();
  vi.advanceTimersByTime(1000);
  expect(card.querySelector(".yoga-countdown")?.textContent).toBe(formatClock(practice.seconds - 1));
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

it("runs both timers independently and cleans both up on a new day", () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="daily-practice"></div>';
  const today = new Date(2026, 10, 7);
  initDailyPractice(today);
  const practices = Object.values(dailyPracticePair(today));
  const cards = [...document.querySelectorAll<HTMLElement>("#daily-practice .yoga-practice")];
  cards.forEach((card, index) => {
    expect(card.dataset.practice).toBe(practices[index]!.id);
    expect(card.textContent).toContain(practices[index]!.instruction);
    card.querySelector<HTMLButtonElement>("button")!.click();
  });
  vi.advanceTimersByTime(1000);
  cards.forEach((card, index) => expect(card.querySelector(".yoga-countdown")?.textContent).toBe(formatClock(practices[index]!.seconds - 1)));
  cards[0].querySelector<HTMLButtonElement>(".yoga-timer button")!.click();
  expect(cards[0].querySelector<HTMLElement>(".yoga-timer")!.hidden).toBe(true);
  vi.advanceTimersByTime(1000);
  expect(cards[1].querySelector(".yoga-countdown")?.textContent).toBe(formatClock(practices[1]!.seconds - 2));
  cards[0].querySelector<HTMLButtonElement>("button")!.click();
  vi.advanceTimersByTime(180000);
  cards.forEach((card) => {
    expect(card.querySelector(".yoga-countdown")?.textContent).toBe("00:00");
    expect(card.querySelector(".yoga-timer-status")?.textContent).toBe("All done. Take your time coming back.");
    card.querySelector<HTMLButtonElement>(".yoga-timer button")!.click();
    card.querySelector<HTMLButtonElement>("button")!.click();
  });
  const countdowns = cards.map((card) => card.querySelector(".yoga-countdown")!.textContent);
  initDailyPractice(new Date(2026, 10, 8));
  [...document.querySelectorAll<HTMLElement>("#daily-practice .yoga-practice")].forEach((card, index) => {
    expect(card.dataset.practice).not.toBe(cards[index].dataset.practice);
    expect(card.querySelector<HTMLElement>(".yoga-timer")!.hidden).toBe(true);
  });
  vi.advanceTimersByTime(1000);
  expect(cards.map((card) => card.querySelector(".yoga-countdown")!.textContent)).toEqual(countdowns);
  expect(vi.getTimerCount()).toBe(0);
});
