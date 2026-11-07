import { describe, expect, it } from "vitest";
import { crossedWorkEnd, eyeBreakDue, formatTimeOfDay, headsUpSeconds, parseTimeOfDay, snoozeAllowed, withinWorkingHours } from "../src/schedule";
import { DEFAULT_WEB_CONFIG, applyAbsence, initialWebState, loadConfig, loadState, saveState } from "../src/storage";

const memoryStore = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
};

describe("heads-up", () => {
  it.each([[-1, null], [0, null], [0.1, 1], [9.1, 10], [10, 10], [10.1, null], [Infinity, null], [NaN, null]])(
    "handles %s seconds remaining", (remaining, expected) => {
      expect(headsUpSeconds(remaining, true)).toBe(expected);
    },
  );
  it("can be disabled", () => expect(headsUpSeconds(5, false)).toBeNull());
});

describe("snooze limit", () => {
  it("allows two snoozes by default, and none after the limit", () => {
    expect(snoozeAllowed(0, 2)).toBe(true);
    expect(snoozeAllowed(1, 2)).toBe(true);
    expect(snoozeAllowed(2, 2)).toBe(false);
    expect(snoozeAllowed(3, 2)).toBe(false);
  });
  it("allows unlimited snoozes when zero is configured", () => {
    expect(snoozeAllowed(100, 0)).toBe(true);
  });
});

describe("schedule persistence", () => {
  it("validates eye-break offsets and notice dates", () => {
    const store = memoryStore();
    const state = initialWebState("2026-11-07");
    state.tracker.currentStretchSeconds = 900;
    state.lastEyeBreakAtStretch = 600;
    state.goalNoticeDay = "2026-11-07";
    state.wrapUpNoticeDay = "2026-11-06";
    saveState(store, state);
    expect(loadState(store, "2026-11-07")).toMatchObject({ lastEyeBreakAtStretch: 600, goalNoticeDay: "2026-11-07", wrapUpNoticeDay: "2026-11-06" });
    store.setItem("anti-burnout:state", JSON.stringify({ ...state, lastEyeBreakAtStretch: -10, goalNoticeDay: "2026-02-30", wrapUpNoticeDay: 123 }));
    expect(loadState(store, "2026-11-07")).toMatchObject({ lastEyeBreakAtStretch: 0, goalNoticeDay: "", wrapUpNoticeDay: "" });
    store.setItem("anti-burnout:state", JSON.stringify({ ...state, lastEyeBreakAtStretch: 2000, goalNoticeDay: "bad", wrapUpNoticeDay: "" }));
    expect(loadState(store, "2026-11-07")).toMatchObject({ lastEyeBreakAtStretch: 900, goalNoticeDay: "", wrapUpNoticeDay: "" });
    expect(loadState(memoryStore(), "2026-11-07")).toMatchObject({ lastEyeBreakAtStretch: 0, goalNoticeDay: "", wrapUpNoticeDay: "" });
    state.savedAt = 1000;
    state.snoozesInARow = 2;
    expect(applyAbsence(state, 61_000, 60)).toMatchObject({ lastEyeBreakAtStretch: 0, snoozesInARow: 0 });
  });
  it("adds defaults to old or malformed config", () => {
    const store = memoryStore();
    store.setItem("anti-burnout:config", JSON.stringify({ snoozeMinutes: 10 }));
    expect(loadConfig(store)).toEqual({ ...DEFAULT_WEB_CONFIG, snoozeMinutes: 10 });
    store.setItem("anti-burnout:config", JSON.stringify({ chime: 1, headsUp: null, maxSnoozes: "two" }));
    expect(loadConfig(store)).toEqual(DEFAULT_WEB_CONFIG);
  });
  it("validates and restores the consecutive count", () => {
    const store = memoryStore();
    const state = initialWebState("2026-11-07");
    state.tracker.currentStretchSeconds = 100;
    state.snoozesInARow = 2;
    saveState(store, state, 1000);
    expect(loadState(store, "2026-11-07").snoozesInARow).toBe(2);
    for (const value of [null, "two", -1]) {
      store.setItem("anti-burnout:state", JSON.stringify({ ...state, snoozesInARow: value }));
      expect(loadState(store, "2026-11-07").snoozesInARow).toBe(0);
    }
    expect(loadState(memoryStore(), "2026-11-07").snoozesInARow).toBe(0);
  });
  it("clears consecutive snoozes on absence or a saved idle stretch", () => {
    const state = initialWebState("2026-11-07");
    state.savedAt = 1000;
    state.snoozesInARow = 2;
    expect(applyAbsence(state, 61_000, 60).snoozesInARow).toBe(0);
    expect(applyAbsence(state, 60_000, 60).snoozesInARow).toBe(2);
    const store = memoryStore();
    saveState(store, state);
    expect(loadState(store, "2026-11-07").snoozesInARow).toBe(0);
    state.tracker.currentStretchSeconds = 100;
    state.tracker.onBreak = true;
    saveState(store, state);
    expect(loadState(store, "2026-11-07").snoozesInARow).toBe(0);
  });
});

describe("eye breaks", () => {
  it("waits for the interval, shows when far from a card, and skips near cards", () => {
    expect(eyeBreakDue(599, 0, 600, 601)).toBe("no");
    expect(eyeBreakDue(600, 0, 600, 121)).toBe("show");
    expect(eyeBreakDue(600, 0, 600, 120)).toBe("skip");
    expect(eyeBreakDue(600, 0, 600, 0)).toBe("skip");
    expect(eyeBreakDue(601, 600, 600, 600)).toBe("no");
    expect(eyeBreakDue(NaN, 0, 600, 600)).toBe("no");
  });
});

describe("working hours", () => {
  it("includes the start and excludes the end", () => {
    expect(withinWorkingHours(539, 540, 1080)).toBe(false);
    expect(withinWorkingHours(540, 540, 1080)).toBe(true);
    expect(withinWorkingHours(1079, 540, 1080)).toBe(true);
    expect(withinWorkingHours(1080, 540, 1080)).toBe(false);
  });
  it("supports overnight ranges and treats equal endpoints as all day", () => {
    expect(withinWorkingHours(1320, 1320, 360)).toBe(true);
    expect(withinWorkingHours(359, 1320, 360)).toBe(true);
    expect(withinWorkingHours(360, 1320, 360)).toBe(false);
    expect(withinWorkingHours(800, 1320, 360)).toBe(false);
    expect(withinWorkingHours(0, 540, 540)).toBe(true);
  });
  it("formats and validates time inputs", () => {
    expect(formatTimeOfDay(540)).toBe("09:00");
    expect(formatTimeOfDay(1439)).toBe("23:59");
    expect(parseTimeOfDay("00:00", 540)).toBe(0);
    expect(parseTimeOfDay("23:59", 540)).toBe(1439);
    for (const value of ["", "24:00", "09:60", "9:00", "bad"]) expect(parseTimeOfDay(value, 540)).toBe(540);
  });
  it("detects end crossings, including overnight and suspended tabs, but not startup after the end", () => {
    const at = (day: number, hour: number, minute = 0): number => new Date(2026, 10, day, hour, minute).getTime();
    expect(crossedWorkEnd(at(7, 17, 59), at(7, 18), 1080)).toBe(true);
    expect(crossedWorkEnd(at(7, 18), at(7, 18, 1), 1080)).toBe(false);
    expect(crossedWorkEnd(at(7, 19), at(7, 19), 1080)).toBe(false);
    expect(crossedWorkEnd(at(7, 23), at(8, 6), 360)).toBe(true);
    expect(crossedWorkEnd(at(7, 17), at(8, 8), 1080)).toBe(false);
    expect(crossedWorkEnd(at(7, 23, 59), at(8, 0), 360)).toBe(false);
    expect(crossedWorkEnd(at(7, 5), at(8, 0), 360)).toBe(false);
    expect(crossedWorkEnd(at(7, 23, 59), at(8, 0), 0)).toBe(true);
    expect(crossedWorkEnd(at(8, 0), at(8, 0, 1), 0)).toBe(false);
  });
  it("never wraps up equal-endpoint all-day working hours", () => {
    const at = (day: number, hour: number): number => new Date(2026, 10, day, hour).getTime();
    expect(crossedWorkEnd(at(7, 8), at(7, 9), 540, 540)).toBe(false);
    expect(crossedWorkEnd(at(7, 23), at(8, 0), 0, 0)).toBe(false);
    expect(crossedWorkEnd(at(7, 8), at(7, 9), 540, 1320)).toBe(true);
  });
});
