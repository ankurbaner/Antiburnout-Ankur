// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { EYE_PRACTICES } from "../src/eyes";
import { initPracticeGroups } from "../src/yogaUI";
import { formatClock } from "../src/format";
import { CARD_BANDS } from "../src/cards";
import { MEETING_PRACTICES } from "../src/yoga";
import { DAILY_YOGA_PRACTICES } from "../src/dailyPractice";
import { MEDITATION_PRACTICES } from "../src/meditation";

afterEach(() => { vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers(); document.body.replaceChildren(); });

const render = () => initPracticeGroups("eye-practices", [{ id: "eyes", title: "Choose a gentle eye break", practices: EYE_PRACTICES }]);

it("defines five eye practices with the requested durations, separate from existing pools", () => {
  expect(EYE_PRACTICES.map(({ title, seconds }) => ({ title, seconds }))).toEqual([
    { title: "20-20-20", seconds: 20 },
    { title: "Palming", seconds: 60 },
    { title: "Slow blinking", seconds: 30 },
    { title: "Near and far focus", seconds: 60 },
    { title: "Netra Vyayama", seconds: 60 },
  ]);
  expect(new Set(EYE_PRACTICES.map(({ id }) => id)).size).toBe(5);
  for (const practice of EYE_PRACTICES) {
    expect(practice.instruction.length).toBeGreaterThan(0);
    for (const pool of [...CARD_BANDS, MEETING_PRACTICES, DAILY_YOGA_PRACTICES, MEDITATION_PRACTICES]) {
      expect(pool.some(({ id }) => id === practice.id)).toBe(false);
    }
  }
});

it("handles a missing container and an empty practice list", () => {
  expect(render).not.toThrow();
  document.body.innerHTML = '<div id="eye-practices"></div>';
  initPracticeGroups("eye-practices", [{ id: "eyes", title: "Eye breaks", practices: [] }]);
  expect(document.querySelectorAll('.yoga-practice')).toHaveLength(0);
});

it.each(EYE_PRACTICES)("renders and runs $title in mm:ss, stops, completes and restarts", (practice) => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="eye-practices"></div>';
  render();
  expect(document.querySelectorAll('.yoga-practice')).toHaveLength(5);
  const card = document.querySelector<HTMLElement>(`[data-practice="${practice.id}"]`)!;
  expect(card.querySelector('h4')?.textContent).toBe(practice.title);
  expect(card.querySelector('.yoga-duration')?.textContent).toBe(practice.seconds < 60 ? `${practice.seconds} s` : `${practice.seconds / 60} min`);
  const start = card.querySelector<HTMLButtonElement>('button')!;
  const timer = card.querySelector<HTMLElement>('.yoga-timer')!;
  const done = timer.querySelector<HTMLButtonElement>('button')!;
  const countdown = timer.querySelector('[role="timer"]')!;
  const intervals = vi.spyOn(window, 'setInterval');
  const clearInterval = vi.spyOn(window, 'clearInterval');
  expect(timer.hidden).toBe(true);
  start.click();
  expect(timer.hidden).toBe(false);
  expect(countdown.textContent).toBe(formatClock(practice.seconds));
  expect(document.activeElement).toBe(done);
  vi.advanceTimersByTime(1000);
  expect(countdown.textContent).toBe(formatClock(practice.seconds - 1));
  done.click();
  expect(timer.hidden).toBe(true);
  expect(document.activeElement).toBe(start);
  expect(clearInterval).toHaveBeenCalledWith(intervals.mock.results[0].value);
  start.click();
  vi.advanceTimersByTime(practice.seconds * 1000);
  expect(countdown.textContent).toBe('00:00');
  expect(card.querySelector('[role="status"]')?.textContent).toContain('All done');
  expect(clearInterval).toHaveBeenCalledWith(intervals.mock.results[1].value);
  done.click();
  start.click();
  expect(countdown.textContent).toBe(formatClock(practice.seconds));
  done.click();
});
