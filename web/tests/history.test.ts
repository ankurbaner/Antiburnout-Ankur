import { describe, expect, it } from "vitest";
import { HistoryEntry, archiveDay, clearAll, initialWebState, loadState, saveState } from "../src/storage";

const entry = (day: string, activeSeconds = 3600): HistoryEntry => ({ day, activeSeconds, cardsDone: 4, resets: 2 });
const memoryStore = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
};

describe("daily history", () => {
  it("starts empty and ignores days without any activity", () => {
    expect(initialWebState("2026-11-07").history).toEqual([]);
    expect(archiveDay([], { day: "2026-11-06", activeSeconds: 0, cardsDone: 0, resets: 0 })).toEqual([]);
    expect(archiveDay([], entry("2026-11-06", 0))).toEqual([entry("2026-11-06", 0)]);
  });

  it("replaces duplicate days without mutating inputs, sorts, and keeps seven past days", () => {
    const history = Array.from({ length: 8 }, (_, i) => entry(`2026-11-${String(i + 1).padStart(2, "0")}`)).reverse();
    const snapshot = structuredClone(history);
    const result = archiveDay(history, entry("2026-11-07", 7200));
    expect(history).toEqual(snapshot);
    expect(result.map((item) => item.day)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(result.find((item) => item.day === "2026-11-07")?.activeSeconds).toBe(7200);
  });

  it("drops malformed entries, impossible dates, empty days, today and future days on load", () => {
    const store = memoryStore();
    store.setItem("anti-burnout:state", JSON.stringify({ history: [
      null, "bad", {}, entry("2026-02-30"), entry("invalid"),
      { ...entry("2026-11-01"), activeSeconds: -1 },
      { ...entry("2026-11-01"), activeSeconds: "3600" },
      { ...entry("2026-11-01"), cardsDone: 1.5 },
      { ...entry("2026-11-01"), resets: -1 },
      { ...entry("2026-11-01"), activeSeconds: null },
      { day: "2026-11-02", activeSeconds: 0, cardsDone: 0, resets: 0 },
      entry("2026-11-05"), entry("2026-11-07"), entry("2026-11-08"),
    ] }));
    expect(loadState(store, "2026-11-07").history).toEqual([entry("2026-11-05")]);
    store.setItem("anti-burnout:state", JSON.stringify({ history: {} }));
    expect(loadState(store, "2026-11-07").history).toEqual([]);
    expect(archiveDay([], entry("2026-11-06", Infinity))).toEqual([]);
  });

  it("archives yesterday's full counters on load before clearing today's totals", () => {
    const store = memoryStore();
    const state = initialWebState("2026-11-06");
    state.tracker.todayActiveSeconds = 11400;
    state.cardsDoneToday = 4;
    state.resetsToday = 2;
    state.history = [entry("2026-11-05")];
    saveState(store, state);
    const loaded = loadState(store, "2026-11-07");
    expect(loaded.history).toEqual([entry("2026-11-05"), entry("2026-11-06", 11400)]);
    expect(loaded.tracker.dayKey).toBe("2026-11-07");
    expect(loaded.tracker.todayActiveSeconds).toBe(0);
    expect(loaded.cardsDoneToday).toBe(0);
    expect(loaded.resetsToday).toBe(0);
    saveState(store, loaded);
    expect(loadState(store, "2026-11-07").history).toEqual(loaded.history);
  });

  it("does not archive live counters, invent missing days or archive inactive saved days", () => {
    const store = memoryStore();
    const state = initialWebState("2026-11-01");
    state.history = [entry("2026-10-31")];
    saveState(store, state);
    expect(loadState(store, "2026-11-07").history).toEqual(state.history);
    state.tracker.todayActiveSeconds = 7200;
    saveState(store, state);
    expect(loadState(store, "2026-11-01").history).toEqual(state.history);
    expect(loadState(store, "2026-11-07").history).toEqual([entry("2026-10-31"), { day: "2026-11-01", activeSeconds: 7200, cardsDone: 0, resets: 0 }]);
  });

  it("keeps at most seven valid days on load and clears all history with other data", () => {
    const store = memoryStore();
    const state = initialWebState("2026-11-10");
    state.history = Array.from({ length: 9 }, (_, i) => entry(`2026-11-0${i + 1}`));
    saveState(store, state);
    expect(loadState(store, "2026-11-10").history.map((item) => item.day)).toEqual(state.history.slice(-7).map((item) => item.day));
    clearAll(store);
    expect(store.getItem("anti-burnout:state")).toBeNull();
    expect(loadState(store, "2026-11-10").history).toEqual([]);
  });
});
