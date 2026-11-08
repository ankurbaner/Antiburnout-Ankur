// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import html from "../index.html?raw";
import { initSteady } from "../src/steadyUI";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ addEventListener: vi.fn() }));
  document.body.innerHTML = new DOMParser().parseFromString(html, "text/html").querySelector("#steady")!.outerHTML;
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.replaceChildren(); });
const element = (id: string) => document.getElementById(`steady-${id}`)!;
const click = (id: string) => element(id).click();

it("handles an absent section", () => {
  document.body.replaceChildren();
  expect(() => initSteady()).not.toThrow();
});

it("reports a descriptive error for a missing required control", () => {
  element("start").remove();
  expect(() => initSteady()).toThrow("Missing #steady-start");
});

it("keeps reduced-motion cues without inline animation, including preference changes", () => {
  const motion = { matches: true, addEventListener: vi.fn<(type: string, callback: () => void) => void>() };
  vi.stubGlobal("matchMedia", () => motion);
  initSteady();
  click("start");
  const circle = element("circle");
  expect(circle.style.transform).toBe("");
  expect(circle.style.transition).toBe("");
  vi.advanceTimersByTime(2000);
  expect(element("phase").textContent).toContain("second inhale");
  expect(circle.style.transform).toBe("");
  motion.matches = false;
  motion.addEventListener.mock.calls[0][1]();
  expect(circle.style.transform).toContain("scale");
  motion.matches = true;
  motion.addEventListener.mock.calls[0][1]();
  expect(circle.style.transform).toBe("");
  expect(circle.style.transition).toBe("");
  click("stop");
});

it("auto-advances sigh and hands, completes keyboard-friendly sensory dots and finishes", () => {
  const schedule = vi.spyOn(window, "setInterval");
  const clear = vi.spyOn(window, "clearInterval");
  initSteady();
  click("start");
  expect(element("progress").textContent).toBe("Step 1 of 4");
  expect(element("back").hasAttribute("disabled")).toBe(true);
  vi.advanceTimersByTime(2000);
  expect(element("phase").textContent).toContain("second inhale");
  vi.advanceTimersByTime(28000);
  expect(element("progress").textContent).toBe("Step 2 of 4");
  vi.advanceTimersByTime(5000);
  expect(element("phase").textContent).toBe("Let go… notice the warmth");
  vi.advanceTimersByTime(40000);
  expect(element("progress").textContent).toBe("Step 3 of 4");
  expect(element("ground").querySelectorAll("button")).toHaveLength(15);
  vi.advanceTimersByTime(60000);
  expect(element("progress").textContent).toBe("Step 3 of 4");
  for (let i = 0; i < 15; i++) {
    const dot = element("ground").querySelector<HTMLButtonElement>("button:not(:disabled)")!;
    if (i > 0) expect(document.activeElement).toBe(dot);
    dot.click();
  }
  expect(element("progress").textContent).toBe("Step 4 of 4");
  expect(element("next").textContent).toBe("Done");
  click("next");
  expect(element("result").textContent).toBe("Well done. Nervousness rises and passes, usually within minutes.");
  expect(element("session").hidden).toBe(true);
  expect(document.activeElement).toBe(element("start"));
  expect(clear).toHaveBeenLastCalledWith(schedule.mock.results[0].value);
  vi.advanceTimersByTime(120000);
  expect(element("session").hidden).toBe(true);
});

it("supports Next, Back, Stop, restart and automatic final completion without stale timers", () => {
  const schedule = vi.spyOn(window, "setInterval");
  const clear = vi.spyOn(window, "clearInterval");
  initSteady();
  click("start");
  click("next");
  click("back");
  expect(element("progress").textContent).toBe("Step 1 of 4");
  expect(element("time").textContent).toContain("00:30");
  click("stop");
  vi.advanceTimersByTime(120000);
  expect(element("session").hidden).toBe(true);
  expect(element("result").textContent).toContain("Stopped");
  expect(clear).toHaveBeenLastCalledWith(schedule.mock.results[0].value);
  click("start");
  click("next"); click("next"); click("next");
  vi.advanceTimersByTime(10000);
  expect(element("result").textContent).toContain("Well done");
  expect(clear).toHaveBeenLastCalledWith(schedule.mock.results[1].value);
});

it("does not steal focus after the user leaves the guide", () => {
  const outside = document.createElement("button");
  document.body.append(outside);
  initSteady();
  click("start");
  outside.focus();
  vi.advanceTimersByTime(30000);
  expect(element("progress").textContent).toBe("Step 2 of 4");
  expect(document.activeElement).toBe(outside);
  click("next"); click("next");
  outside.focus();
  vi.advanceTimersByTime(10000);
  expect(element("result").textContent).toContain("Well done");
  expect(document.activeElement).toBe(outside);
});
