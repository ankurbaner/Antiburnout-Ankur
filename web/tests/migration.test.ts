import { expect, it } from "vitest";
import { clearAll, initialWebState, loadConfig, loadState, saveConfig, saveState } from "../src/storage";
import { DEFAULT_GENTLE } from "../src/gentle";

const store = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
};

it("ignores legacy idle thresholds while keeping other settings", () => {
  for (const idleThresholdSeconds of [30, 900, "120", null]) {
    const storage = store();
    storage.setItem("anti-burnout:config", JSON.stringify({ idleThresholdSeconds, snoozeMinutes: 10 }));
    const config = loadConfig(storage);
    expect(config.idleThresholdSeconds).toBe(60);
    expect(config.snoozeMinutes).toBe(10);
    saveConfig(storage, config);
    expect(loadConfig(storage)).toEqual(config);
  }
});

it("drops retired config and paused state without losing reminders or quiet mode", () => {
  const storage = store();
  storage.setItem("anti-burnout:config", JSON.stringify({
    reminderIntervalSeconds: 60, snoozeMinutes: 10, maxSnoozes: 3, chime: false,
    systemIdle: true, eyeBreaks: true, eyeBreakMinutes: 5, headsUp: true,
    workHours: true, workStartMinutes: 540, workEndMinutes: 1080,
  }));
  const config = loadConfig(storage);
  expect(config).toEqual({ idleThresholdSeconds: 60, reminderIntervalSeconds: 60, snoozeMinutes: 10, maxSnoozes: 3, chime: false, gentle: DEFAULT_GENTLE });
  saveConfig(storage, config);
  expect(storage.getItem("anti-burnout:config")).not.toMatch(/systemIdle|eyeBreak|headsUp|work/);
  storage.setItem("anti-burnout:state", JSON.stringify({
    ...initialWebState("2026-11-07"), meetingMode: true, paused: true,
    lastEyeBreakAtStretch: 600, wrapUpNoticeDay: "2026-11-07",
  }));
  const state = loadState(storage, "2026-11-07");
  expect(state.meetingMode).toBe(true);
  expect(state).not.toHaveProperty("paused");
  saveState(storage, state);
  expect(storage.getItem("anti-burnout:state")).not.toMatch(/paused|lastEyeBreak|wrapUp/);
  expect(loadState(storage, "2026-11-08").meetingMode).toBe(false);
});

it("loads legacy goal/history data without recording it again", () => {
  const storage = store();
  storage.setItem("anti-burnout:config", JSON.stringify({ dailyGoalMinutes: 360, snoozeMinutes: 10 }));
  const config = loadConfig(storage);
  expect(config.snoozeMinutes).toBe(10);
  expect(config).not.toHaveProperty("dailyGoalMinutes");
  saveConfig(storage, config);
  expect(storage.getItem("anti-burnout:config")).not.toContain("dailyGoalMinutes");
  const old = { ...initialWebState("2026-11-06"), history: [{ day: "2026-11-05", activeSeconds: 600 }], goalNoticeDay: "2026-11-06", cardsDoneToday: 4 };
  storage.setItem("anti-burnout:state", JSON.stringify(old));
  const state = loadState(storage, "2026-11-07");
  expect(state).not.toHaveProperty("history");
  expect(state).not.toHaveProperty("goalNoticeDay");
  expect(state.tracker.dayKey).toBe("2026-11-07");
  expect(state.cardsDoneToday).toBe(0);
  expect(state.meetingMode).toBe(false);
  saveState(storage, state);
  expect(storage.getItem("anti-burnout:state")).not.toMatch(/history|goalNoticeDay/);
  clearAll(storage);
  expect(loadState(storage, "2026-11-07")).toEqual(initialWebState("2026-11-07"));
});

it("persists meeting mode and the previous card/reset without letting malformed fields enable it", () => {
  const storage = store();
  const state = { ...initialWebState("2026-11-07"), meetingMode: true, lastPracticeId: "meeting-equal", lastProtocolId: "meeting-ankles" as const };
  saveState(storage, state);
  expect(loadState(storage, "2026-11-07")).toMatchObject({ meetingMode: true, lastPracticeId: "meeting-equal", lastProtocolId: "meeting-ankles" });
  expect(loadState(storage, "2026-11-08")).toMatchObject({ meetingMode: false, lastPracticeId: "meeting-equal", lastProtocolId: "meeting-ankles" });
  storage.setItem("anti-burnout:state", JSON.stringify({ meetingMode: "true", lastPracticeId: "unknown", lastProtocolId: "__proto__" }));
  expect(loadState(storage, "2026-11-07")).toMatchObject({ meetingMode: false, lastPracticeId: null, lastProtocolId: null });
});

it("ignores retired day-note data, drops its config/state fields on save and clears legacy keys", () => {
  for (const retired of [null, "broken", { text: "A previous note", day: "2026-11-07" }]) {
    const storage = store();
    storage.setItem("anti-burnout:config", JSON.stringify({ endOfDay: true, endOfDayTime: "00:00", intention: retired, snoozeMinutes: 7 }));
    storage.setItem("anti-burnout:state", JSON.stringify({ ...initialWebState("2026-11-07"), intention: retired, spot: retired, promptDay: "2026-11-07", meetingMode: true }));
    storage.setItem("anti-burnout:intention", JSON.stringify(retired));
    storage.setItem("anti-burnout:spot", JSON.stringify(retired));
    const config = loadConfig(storage);
    expect(config.snoozeMinutes).toBe(7);
    expect(config).not.toHaveProperty("endOfDay");
    expect(config).not.toHaveProperty("endOfDayTime");
    expect(config).not.toHaveProperty("intention");
    const state = loadState(storage, "2026-11-07");
    expect(state.meetingMode).toBe(true);
    expect(state).not.toHaveProperty("intention");
    expect(state).not.toHaveProperty("spot");
    expect(state).not.toHaveProperty("promptDay");
    saveConfig(storage, config);
    saveState(storage, state);
    expect(storage.getItem("anti-burnout:config")).not.toMatch(/endOfDay|intention/);
    expect(storage.getItem("anti-burnout:state")).not.toMatch(/intention|spot|promptDay/);
    clearAll(storage);
    for (const key of ["config", "state", "intention", "spot"]) expect(storage.getItem(`anti-burnout:${key}`)).toBeNull();
  }
});
