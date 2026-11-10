import { describe, expect, it } from "vitest";
import { YOGA_GROUPS, practiceSecondsLeft } from "../src/yoga";

describe("desk yoga practices", () => {
  it("groups twelve one-minute practices and a fifteen-minute walk", () => {
    expect(YOGA_GROUPS.map((group) => group.id)).toEqual(["breathing", "sitting", "standing"]);
    expect(YOGA_GROUPS.map((group) => group.practices.length)).toEqual([3, 6, 4]);
    const practices = YOGA_GROUPS.flatMap((group) => group.practices);
    expect(new Set(practices.map((practice) => practice.id)).size).toBe(13);
    for (const practice of practices) {
      expect(practice.seconds).toBe(practice.id === "walk-break" ? 900 : 60);
      expect(practice.title).not.toBe("");
      expect(practice.english).not.toBe("");
      expect(practice.instruction).not.toBe("");
    }
  });
  it("counts elapsed seconds, rounds up, and stops at zero", () => {
    expect(practiceSecondsLeft(61000, 1000)).toBe(60);
    expect(practiceSecondsLeft(61000, 2000)).toBe(59);
    expect(practiceSecondsLeft(61000, 60999)).toBe(1);
    expect(practiceSecondsLeft(61000, 61000)).toBe(0);
    expect(practiceSecondsLeft(61000, 90000)).toBe(0);
  });
  it("handles inactive and invalid clocks safely", () => {
    expect(practiceSecondsLeft(null, 0)).toBeNull();
    expect(practiceSecondsLeft(Infinity, 0)).toBe(0);
    for (const now of [NaN, Infinity, -Infinity]) expect(practiceSecondsLeft(60000, now)).toBeNull();
  });
});
