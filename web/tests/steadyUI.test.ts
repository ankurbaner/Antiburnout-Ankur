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

it("registers listeners and a running interval only once on repeated initialization", () => {
  const motion = { matches: false, addEventListener: vi.fn() };
  vi.stubGlobal("matchMedia", () => motion);
  const listen = vi.spyOn(document, "addEventListener");
  const schedule = vi.spyOn(window, "setInterval");
  initSteady();
  initSteady();
  expect(listen.mock.calls.filter(([type]) => type === "visibilitychange")).toHaveLength(1);
  expect(motion.addEventListener).toHaveBeenCalledTimes(1);
  click("start");
  expect(schedule).toHaveBeenCalledTimes(1);
  click("stop");
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

it("auto-advances through all three steps and finishes when squeeze and release completes", () => {
  const schedule = vi.spyOn(window, "setInterval");
  const clear = vi.spyOn(window, "clearInterval");
  initSteady();
  click("start");
  expect(element("progress").textContent).toBe("Step 1 of 3");
  expect(element("back").hasAttribute("disabled")).toBe(true);
  vi.advanceTimersByTime(2000);
  expect(element("phase").textContent).toContain("second inhale");
  vi.advanceTimersByTime(28000);
  expect(element("progress").textContent).toBe("Step 2 of 3");
  expect(element("step").textContent).toBe("Picture a smile");
  expect(element("smile").hidden).toBe(false);
  expect(element("smile").querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  expect(element("phase").textContent).toBe("Look at the child's smile. Smile back. All is well.");
  expect(element("phase").dataset.smile).toBe("true");
  expect(element("time").textContent).toContain("00:20");
  expect(element("next").textContent).toBe("Next");
  vi.advanceTimersByTime(19900);
  expect(element("time").textContent).toContain("00:01");
  expect(element("progress").textContent).toBe("Step 2 of 3");
  vi.advanceTimersByTime(100);
  expect(element("progress").textContent).toBe("Step 3 of 3");
  expect(element("smile").hidden).toBe(true);
  expect(element("phase").dataset.smile).toBe("false");
  expect(element("step").textContent).toBe("Squeeze and release");
  expect(element("phase").textContent).toBe("Squeeze feet and fists");
  expect(element("time").textContent).toContain("00:45 left · Round 1 of 3");
  vi.advanceTimersByTime(5000);
  expect(element("phase").textContent).toBe("Release feet and fists");
  vi.advanceTimersByTime(40000);
  expect(element("result").textContent).toBe("Well done. Nervousness rises and passes, usually within minutes.");
  expect(element("session").hidden).toBe(true);
  expect(document.activeElement).toBe(element("start"));
  expect(clear).toHaveBeenLastCalledWith(schedule.mock.results[0].value);
  vi.advanceTimersByTime(120000);
  expect(element("session").hidden).toBe(true);
});

it("supports Next, Back, Stop, restart and Done without stale timers", () => {
  const schedule = vi.spyOn(window, "setInterval");
  const clear = vi.spyOn(window, "clearInterval");
  initSteady();
  click("start");
  click("next");
  click("back");
  expect(element("progress").textContent).toBe("Step 1 of 3");
  expect(element("time").textContent).toContain("00:30");
  click("stop");
  vi.advanceTimersByTime(120000);
  expect(element("session").hidden).toBe(true);
  expect(element("result").textContent).toContain("Stopped");
  expect(clear).toHaveBeenLastCalledWith(schedule.mock.results[0].value);
  click("start");
  click("next"); click("next");
  expect(element("next").textContent).toBe("Done");
  click("next");
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
  expect(element("progress").textContent).toBe("Step 2 of 3");
  expect(document.activeElement).toBe(outside);
  click("next");
  outside.focus();
  vi.advanceTimersByTime(45000);
  expect(element("result").textContent).toContain("Well done");
  expect(document.activeElement).toBe(outside);
});

it("switches decorative scenes and announces cues without resetting the countdown", () => {
  initSteady();
  click("start"); click("next");
  expect(element("child-choice").getAttribute("aria-pressed")).toBe("true");
  expect(element("child").hidden).toBe(false);
  expect(element("sun").hidden).toBe(true);
  vi.advanceTimersByTime(3000);
  click("sun-choice");
  expect(element("sun-choice").getAttribute("aria-pressed")).toBe("true");
  expect(element("child-choice").getAttribute("aria-pressed")).toBe("false");
  expect(element("sun").hidden).toBe(false);
  expect(element("child").hidden).toBe(true);
  expect(element("phase").textContent).toBe("Rest your gaze on the sun. Breathe slowly. All is well.");
  expect(element("phase").getAttribute("aria-live")).toBe("polite");
  expect(element("time").textContent).toContain("00:17");
  vi.advanceTimersByTime(7000);
  expect(element("phase").textContent).toBe("Rest your gaze on the sun. Breathe slowly. All is well.");
  click("child-choice");
  expect(element("phase").textContent).toBe("Look at the child's smile. Smile back. All is well.");
  expect(element("child").hidden).toBe(false);
  expect(element("sun").hidden).toBe(true);
  click("sun-choice");
  click("next"); click("back");
  expect(element("sun-choice").getAttribute("aria-pressed")).toBe("true");
  click("stop"); click("start");
  click("next");
  expect(element("child-choice").getAttribute("aria-pressed")).toBe("true");
  expect(element("sun-choice").getAttribute("aria-pressed")).toBe("false");
  vi.advanceTimersByTime(20000);
  expect(element("progress").textContent).toBe("Step 3 of 3");
  click("stop");
});
