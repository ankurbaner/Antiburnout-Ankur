import { describe, expect, it } from "vitest";
import { BREATH_PATTERNS, breathAt } from "../src/breathe";

describe("silent breath timing", () => {
  it("uses the requested ratios without holds", () => {
    expect(BREATH_PATTERNS.map((pattern) => pattern.phases.map((phase) => phase.seconds))).toEqual([[4, 4], [4, 6], [4, 4], [4, 4, 4, 4]]);
    for (const pattern of BREATH_PATTERNS) {
      expect(pattern.phases.map((phase) => phase.inhale)).toEqual(pattern.phases.map((_, i) => i % 2 === 0));
    }
    expect(BREATH_PATTERNS[2].phases.map((phase) => phase.label)).toEqual(["So… · breathe in", "Hum… · breathe out"]);
  });
  it("computes phase boundaries and fractional progress from elapsed time", () => {
    const pattern = BREATH_PATTERNS[0];
    expect(breathAt(pattern, 0, 60)?.phaseIndex).toBe(0);
    expect(breathAt(pattern, 3.999, 60)?.phaseIndex).toBe(0);
    expect(breathAt(pattern, 4, 60)?.phaseIndex).toBe(1);
    expect(breathAt(pattern, 8, 60)?.phaseIndex).toBe(0);
    expect(breathAt(pattern, 51.5, 180)).toMatchObject({ phaseIndex: 0, phaseElapsed: 3.5, remaining: 129 });
    expect(breathAt(BREATH_PATTERNS[1], 9.5, 60)).toMatchObject({ phaseIndex: 1, phaseElapsed: 5.5 });
    expect(breathAt(BREATH_PATTERNS[1], 10, 60)?.phaseIndex).toBe(0);
  });
  it("cycles alternate-nostril cues in order, including after skipped updates", () => {
    const pattern = BREATH_PATTERNS[3];
    expect([0, 4, 8, 12, 16].map((t) => breathAt(pattern, t, 180)?.phase?.label)).toEqual([
      pattern.phases[0].label, pattern.phases[1].label, pattern.phases[2].label, pattern.phases[3].label, pattern.phases[0].label,
    ]);
    expect(breathAt(pattern, 143, 180)).toMatchObject({ phaseIndex: 3, phaseElapsed: 3, remaining: 37 });
  });
  it.each([60, 120, 180])("ends exactly at %s seconds and stays ended", (duration) => {
    for (const pattern of BREATH_PATTERNS) {
      expect(breathAt(pattern, duration - 0.01, duration)?.done).toBe(false);
      expect(breathAt(pattern, duration, duration)).toMatchObject({ phase: null, done: true, remaining: 0 });
      expect(breathAt(pattern, duration + 200, duration)?.done).toBe(true);
    }
  });
  it("rejects invalid times and empty or invalid patterns", () => {
    const pattern = BREATH_PATTERNS[0];
    for (const t of [NaN, Infinity, -Infinity, -1]) expect(breathAt(pattern, t, 60)).toBeNull();
    for (const duration of [NaN, Infinity, -1, 0]) expect(breathAt(pattern, 0, duration)).toBeNull();
    expect(breathAt({ ...pattern, phases: [] }, 0, 60)).toBeNull();
    expect(breathAt({ ...pattern, phases: [{ label: "", inhale: true, seconds: 0 }] }, 0, 60)).toBeNull();
  });
});
