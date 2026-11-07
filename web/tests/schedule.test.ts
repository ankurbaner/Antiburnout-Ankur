import { describe, expect, it } from "vitest";
import { snoozeAllowed } from "../src/schedule";
import { DEFAULT_WEB_CONFIG, applyAbsence, initialWebState, loadConfig, loadState, saveState } from "../src/storage";

const memoryStore = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
};

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
