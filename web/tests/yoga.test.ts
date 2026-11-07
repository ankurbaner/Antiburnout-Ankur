import { describe, expect, it } from "vitest";
import { YOGA_GROUPS, practiceSecondsLeft } from "../src/yoga";
import { PROTOCOL_ORDER, nextProtocol } from "../src/protocols";
import { initialWebState, loadState } from "../src/storage";

describe("desk yoga practices", () => {
  it("groups twelve named, one-minute practices for breathing, sitting and standing", () => {
    expect(YOGA_GROUPS.map((group) => group.id)).toEqual(["breathing", "sitting", "standing"]);
    expect(YOGA_GROUPS.map((group) => group.practices.length)).toEqual([3, 6, 3]);
    const practices = YOGA_GROUPS.flatMap((group) => group.practices);
    expect(new Set(practices.map((practice) => practice.id)).size).toBe(12);
    for (const practice of practices) {
      expect(practice.seconds).toBe(60);
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

describe("quiet reset protocols", () => {
  it("rotates through six activities including the two quiet replacements without repeats", () => {
    expect(PROTOCOL_ORDER).toHaveLength(6);
    expect(nextProtocol("mobility").title).toBe("Alternate-nostril breathing");
    expect(nextProtocol("alternate").title).toBe("Seated desk stretch");
    expect(nextProtocol("desk-stretch").id).toBe(PROTOCOL_ORDER[0]);
    expect(nextProtocol(null, []).id).toBe(PROTOCOL_ORDER[0]);
    for (const id of PROTOCOL_ORDER) expect(nextProtocol(id).id).not.toBe(id);
  });
  it.each(["alternate", "desk-stretch"] as const)("preserves %s across reload", (id) => {
    const state = { ...initialWebState("2026-11-07"), lastProtocolId: id };
    expect(loadState({ getItem: () => JSON.stringify(state), setItem: () => {}, removeItem: () => {} }, "2026-11-07").lastProtocolId).toBe(id);
  });
  it.each(["humming", "laughter"])("safely drops legacy %s while retaining other saved state", (id) => {
    const state = { ...initialWebState("2026-11-07"), lastProtocolId: id, cardsDoneToday: 3 };
    const loaded = loadState({ getItem: () => JSON.stringify(state), setItem: () => {}, removeItem: () => {} }, "2026-11-07");
    expect(loaded.lastProtocolId).toBeNull();
    expect(loaded.cardsDoneToday).toBe(3);
    expect(nextProtocol(loaded.lastProtocolId)).toBeDefined();
  });
});
