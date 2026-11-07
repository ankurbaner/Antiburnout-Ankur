import { describe, expect, it } from "vitest";
import { SMILE_PRACTICES, SMILE_SCENES, nextSmileScene, practiceSecondsLeft } from "../src/smile";
import { PROTOCOL_ORDER, nextProtocol } from "../src/protocols";
import { initialWebState, loadState } from "../src/storage";

describe("smile scenes and practices", () => {
  it("has six distinct captions and cycles through them without skipping", () => {
    expect(new Set(SMILE_SCENES).size).toBe(6);
    let current = 0;
    const seen = [];
    for (let i = 0; i < 6; i++) {
      seen.push(current);
      current = nextSmileScene(current);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5]);
    expect(current).toBe(0);
  });
  it("handles an empty scene list or malformed scene index safely", () => {
    expect(nextSmileScene(0, 0)).toBe(0);
    expect(nextSmileScene(NaN)).toBe(0);
    expect(nextSmileScene(0, -1)).toBe(0);
  });
  it("offers five short practices with unique IDs, guidance and the right durations", () => {
    expect(SMILE_PRACTICES).toHaveLength(5);
    expect(new Set(SMILE_PRACTICES.map((practice) => practice.id)).size).toBe(5);
    for (const practice of SMILE_PRACTICES) {
      expect(practice.title).not.toBe("");
      expect(practice.instruction).not.toBe("");
      expect(practice.seconds).toBe(practice.id === "laugh" ? 30 : 60);
    }
  });
  it("counts down using elapsed time, rounds up and stops at zero", () => {
    expect(practiceSecondsLeft(61000, 1000)).toBe(60);
    expect(practiceSecondsLeft(61000, 2000)).toBe(59);
    expect(practiceSecondsLeft(61000, 60999)).toBe(1);
    expect(practiceSecondsLeft(61000, 61000)).toBe(0);
    expect(practiceSecondsLeft(61000, 90000)).toBe(0);
  });
  it("handles inactive and invalid timers without displaying NaN", () => {
    expect(practiceSecondsLeft(null, 0)).toBeNull();
    expect(practiceSecondsLeft(Infinity, 0)).toBe(0);
    expect(practiceSecondsLeft(60000, NaN)).toBe(0);
  });
});

describe("extra web reset protocols", () => {
  it("includes humming and laughter in the never-repeat rotation", () => {
    expect(PROTOCOL_ORDER).toContain("humming");
    expect(PROTOCOL_ORDER).toContain("laughter");
    expect(nextProtocol("mobility").title).toBe("Humming bee breath");
    expect(nextProtocol("humming").title).toBe("Laugh it out");
    expect(nextProtocol("laughter").id).toBe(PROTOCOL_ORDER[0]);
  });
  it.each(["humming", "laughter"] as const)("preserves %s as the previous protocol on reload", (id) => {
    const state = { ...initialWebState("2026-11-07"), lastProtocolId: id };
    const loaded = loadState({ getItem: () => JSON.stringify(state), setItem: () => {}, removeItem: () => {} }, "2026-11-07");
    expect(loaded.lastProtocolId).toBe(id);
    expect(nextProtocol(loaded.lastProtocolId).id).not.toBe(id);
  });
});
