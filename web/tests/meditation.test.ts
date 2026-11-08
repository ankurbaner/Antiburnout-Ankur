// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { formatClock } from "../src/format";
import html from "../index.html?raw";
import { MEDITATION_PRACTICES } from "../src/meditation";
import { initPracticeGroups } from "../src/yogaUI";

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); document.body.replaceChildren(); });

const render = () => initPracticeGroups("meditation-practices", [{ id: "meditation", title: "Choose a quiet moment", practices: MEDITATION_PRACTICES }]);

it("defines six silent desk practices with their requested durations", () => {
  expect(MEDITATION_PRACTICES.map((practice) => practice.title)).toEqual(["Anapanasati", "So-Hum", "Trataka", "Sakshi Bhava", "Yoga Nidra inspired", "Mindful listening"]);
  expect(MEDITATION_PRACTICES.map((practice) => practice.seconds)).toEqual([120, 120, 60, 120, 180, 60]);
  expect(new Set(MEDITATION_PRACTICES.map((practice) => practice.id)).size).toBe(6);
  for (const practice of MEDITATION_PRACTICES) {
    expect(practice.english.length).toBeGreaterThan(0);
    expect(practice.instruction.split(".").filter(Boolean)).toHaveLength(2);
  }
});

it("replaces retired practices with mindful listening while keeping only the original body scan", () => {
  expect(MEDITATION_PRACTICES.some((practice) => ["kindness", "head-to-toe-scan"].includes(practice.id))).toBe(false);
  expect(MEDITATION_PRACTICES.filter((practice) => /body scan/i.test(`${practice.title} ${practice.english}`))).toEqual([
    expect.objectContaining({ id: "body-scan", title: "Yoga Nidra inspired", seconds: 180 }),
  ]);
  const listening = MEDITATION_PRACTICES.find((practice) => practice.id === "mindful-listening")!;
  expect(listening.seconds).toBe(60);
  expect(listening.english).toBe("Noticing sounds near and far");
  expect(listening.instruction).toMatch(/Close your eyes or soften your gaze.*sounds near and far.*computer hum.*voices.*traffic.*your own breath/);
  expect(listening.instruction).toMatch(/letting each come and go without naming or judging it/);
  expect(listening.instruction).toMatch(/mind wanders.*return to listening/);
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
