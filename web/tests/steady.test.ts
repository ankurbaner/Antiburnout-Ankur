import { describe, expect, it } from "vitest";
import { STEADY_STEPS, steadyAt } from "../src/steady";

describe("Steady timing", () => {
  it("paces three double inhales and long exhales without holds", () => {
    for (const round of [0, 1, 2]) {
      expect(steadyAt(0, round * 10)).toMatchObject({ phase: 0, inhale: true, seconds: 2, round: round + 1 });
      expect(steadyAt(0, round * 10 + 2)).toMatchObject({ phase: 1, inhale: true, seconds: 1 });
      expect(steadyAt(0, round * 10 + 3)).toMatchObject({ phase: 2, inhale: false, seconds: 7 });
      expect(steadyAt(0, round * 10 + 9.99)?.done).toBe(false);
    }
    expect(steadyAt(0, 23.5)).toMatchObject({ phase: 2, phaseElapsed: 0.5, remaining: 7, round: 3 });
  });
  it("paces three 5-second squeezes and 10-second releases", () => {
    for (const round of [0, 1, 2]) {
      expect(steadyAt(2, round * 15)).toMatchObject({ label: "Squeeze feet and fists", seconds: 5, round: round + 1 });
      expect(steadyAt(2, round * 15 + 5)).toMatchObject({ label: "Release feet and fists", seconds: 10 });
    }
    expect(steadyAt(2, 39.5)).toMatchObject({ phase: 1, phaseElapsed: 4.5, remaining: 6, round: 3 });
  });
  it.each([0, 1, 2])("completes timed step %s exactly at its duration and stays complete", (step) => {
    const duration = STEADY_STEPS[step].seconds;
    expect(steadyAt(step, duration - 0.001)?.done).toBe(false);
    expect(steadyAt(step, duration)).toMatchObject({ done: true, remaining: 0 });
    expect(steadyAt(step, duration + 300)).toMatchObject({ done: true, remaining: 0 });
  });
  it("rejects invalid steps and elapsed times", () => {
    for (const step of [-1, 3, 4, 0.5, NaN, Infinity]) expect(steadyAt(step, 0)).toBeNull();
    for (const elapsed of [-1, NaN, Infinity, -Infinity]) expect(steadyAt(0, elapsed)).toBeNull();
  });
  it("orders sigh, 20-second smile, and squeeze and release in three steps", () => {
    expect(STEADY_STEPS.map(({ kind }) => kind)).toEqual(["sigh", "smile", "squeeze"]);
    expect(STEADY_STEPS.map(({ title, seconds }) => ({ title, seconds }))).toEqual([
      { title: "Physiological sigh", seconds: 30 },
      { title: "Picture a smile", seconds: 20 },
      { title: "Squeeze and release", seconds: 45 },
    ]);
    expect(steadyAt(1, 0)).toMatchObject({ remaining: 20, done: false, label: "Look at the child's smile. Smile back. All is well." });
    expect(steadyAt(1, 19.5)).toMatchObject({ remaining: 1, done: false });
    expect(STEADY_STEPS[2].instruction).toBe("Gently curl your toes and press your feet into the floor, hidden under a desk or podium, and squeeze your fists at the same time. Squeeze for 5 seconds, then release for 10. Repeat three times without straining.");
  });
});
