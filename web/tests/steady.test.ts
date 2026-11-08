import { describe, expect, it } from "vitest";
import { GROUND_SENSES, STEADY_STEPS, steadyAt } from "../src/steady";

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
      expect(steadyAt(1, round * 15)).toMatchObject({ label: "Squeeze…", seconds: 5, round: round + 1 });
      expect(steadyAt(1, round * 15 + 5)).toMatchObject({ label: "Let go… notice the warmth", seconds: 10 });
    }
    expect(steadyAt(1, 39.5)).toMatchObject({ phase: 1, phaseElapsed: 4.5, remaining: 6, round: 3 });
  });
  it.each([0, 1, 3, 4])("completes timed step %s exactly at its duration and stays complete", (step) => {
    const duration = STEADY_STEPS[step].seconds;
    expect(steadyAt(step, duration - 0.001)?.done).toBe(false);
    expect(steadyAt(step, duration)).toMatchObject({ done: true, remaining: 0 });
    expect(steadyAt(step, duration + 300)).toMatchObject({ done: true, remaining: 0 });
  });
  it("allows grounding to take as long as needed and finish when all senses are done", () => {
    expect(GROUND_SENSES.map((sense) => sense.count)).toEqual([5, 4, 3, 2, 1]);
    expect(steadyAt(2, 0)?.done).toBe(false);
    expect(steadyAt(2, 500)?.done).toBe(false);
    expect(steadyAt(2, 3, true)?.done).toBe(true);
  });
  it("rejects invalid steps and elapsed times", () => {
    for (const step of [-1, 5, 0.5, NaN, Infinity]) expect(steadyAt(step, 0)).toBeNull();
    for (const elapsed of [-1, NaN, Infinity, -Infinity]) expect(steadyAt(0, elapsed)).toBeNull();
  });
  it("places the 20-second smile after grounding and before reframe in a five-step sequence", () => {
    expect(STEADY_STEPS).toHaveLength(5);
    expect(STEADY_STEPS[2].title).toBe("5-4-3-2-1 grounding");
    expect(STEADY_STEPS[3]).toMatchObject({ title: "Picture a smile", seconds: 20 });
    expect(STEADY_STEPS[4].title).toBe("Say quietly: “I'm excited.”");
    expect(steadyAt(3, 0)).toMatchObject({ remaining: 20, done: false, label: "Smile. All is well." });
    expect(steadyAt(3, 19.5)).toMatchObject({ remaining: 1, done: false });
  });
});
