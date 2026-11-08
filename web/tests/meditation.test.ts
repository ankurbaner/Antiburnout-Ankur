// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { formatClock } from "../src/format";
import html from "../index.html?raw";
import { MEDITATION_PRACTICES } from "../src/meditation";
import { initPracticeGroups } from "../src/yogaUI";

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); document.body.replaceChildren(); });

const render = () => initPracticeGroups("meditation-practices", [{ id: "meditation", title: "Choose a quiet moment", practices: MEDITATION_PRACTICES }]);

it("defines six silent desk practices with their requested durations", () => {
  expect(MEDITATION_PRACTICES.map((practice) => practice.title)).toEqual(["Anapanasati", "So-Hum", "Trataka", "Sakshi Bhava", "Yoga Nidra inspired", "Body scan"]);
  expect(MEDITATION_PRACTICES.map((practice) => practice.seconds)).toEqual([120, 120, 60, 120, 180, 120]);
  expect(new Set(MEDITATION_PRACTICES.map((practice) => practice.id)).size).toBe(6);
  for (const practice of MEDITATION_PRACTICES) {
    expect(practice.english.length).toBeGreaterThan(0);
    expect(practice.instruction.split(".").filter(Boolean)).toHaveLength(2);
  }
});

it("replaces loving-kindness with a natural-breathing head-to-feet scan", () => {
  expect(MEDITATION_PRACTICES.some((practice) => practice.id === "kindness")).toBe(false);
  const scan = MEDITATION_PRACTICES.find((practice) => practice.title === "Body scan")!;
  expect(scan.seconds).toBe(120);
  expect(scan.instruction).toMatch(/top of your head.*forehead.*jaw.*shoulders.*hands.*chest and belly.*legs and feet/);
  expect(scan.instruction).toMatch(/noticing sensations and softening tension without judging/);
  expect(scan.instruction).toMatch(/Breathe naturally.*eyes may stay open with a soft gaze/);
});

it("places meditation after yoga with a working navigation target", () => {
  const page = new DOMParser().parseFromString(html, "text/html");
  expect(page.querySelector("#yoga + section")?.id).toBe("meditation");
  expect(page.querySelector('.nav a[href="#meditation"]')?.textContent).toBe("Meditation");
  expect(page.querySelector("#meditation-title")?.textContent).toBe("Meditation at work");
  expect(page.querySelector("#meditation")?.textContent).toContain("Everything here is silent");
});

it("handles an absent or empty practice container", () => {
  expect(render).not.toThrow();
  document.body.innerHTML = '<div id="meditation-practices"></div>';
  initPracticeGroups("meditation-practices", []);
  expect(document.querySelector("#meditation-practices")?.children).toHaveLength(0);
});

it.each(MEDITATION_PRACTICES)("renders and runs the $title timer, completes, closes and restarts", (practice) => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="meditation-practices"></div>';
  render();
  expect(document.querySelectorAll(".yoga-practice")).toHaveLength(6);
  const card = document.querySelector<HTMLElement>(`[data-practice="${practice.id}"]`)!;
  expect(card.querySelector(".yoga-duration")?.textContent).toBe(`${practice.seconds / 60} min`);
  const start = card.querySelector<HTMLButtonElement>("button")!;
  const timer = card.querySelector<HTMLElement>(".yoga-timer")!;
  const done = timer.querySelector<HTMLButtonElement>("button")!;
  const countdown = card.querySelector(".yoga-countdown")!;
  start.click();
  expect(countdown.textContent).toBe(formatClock(practice.seconds));
  expect(timer.hidden).toBe(false);
  vi.advanceTimersByTime(1000);
  expect(countdown.textContent).toBe(formatClock(practice.seconds - 1));
  done.click();
  expect(timer.hidden).toBe(true);
  expect(document.activeElement).toBe(start);
  start.click();
  vi.advanceTimersByTime(practice.seconds * 1000);
  expect(countdown.textContent).toBe("00:00");
  expect(card.querySelector('[role="status"]')?.textContent).toContain("All done");
  expect(vi.getTimerCount()).toBe(0);
  done.click();
  expect(start.hidden).toBe(false);
});
