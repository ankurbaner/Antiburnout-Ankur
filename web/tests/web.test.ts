import { describe, expect, it } from "vitest";
import { pageIdleSeconds, systemIdleSeconds } from "../src/activity";
import { PROTOCOL_ORDER, nextProtocol } from "../src/protocols";
import { formatClock, formatMinutes } from "../src/format";
import {
  applyAbsence,
  DEFAULT_WEB_CONFIG,
  dayKeyFor,
  initialWebState,
  loadConfig,
  loadState,
  saveConfig,
  saveState,
} from "../src/storage";

const memoryStore = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
};

describe("activity", () => {
  it("measures idle from the last input while focused", () => {
    expect(pageIdleSeconds({ now: 90_000, lastInputAt: 30_000, focused: true })).toBe(60);
  });

  it("assumes work elsewhere while the page is unfocused", () => {
    expect(pageIdleSeconds({ now: 900_000, lastInputAt: 0, focused: false })).toBe(0);
  });

  it("maps Idle Detection states onto the threshold", () => {
    expect(systemIdleSeconds({ userState: "active", screenState: "unlocked", thresholdSeconds: 60 })).toBe(0);
    expect(systemIdleSeconds({ userState: "idle", screenState: "unlocked", thresholdSeconds: 60 })).toBe(60);
    expect(systemIdleSeconds({ userState: "active", screenState: "locked", thresholdSeconds: 90 })).toBe(90);
  });
});

describe("protocols", () => {
  it("starts with the first activity and never repeats back to back", () => {
    let last = nextProtocol(null);
    expect(last.id).toBe(PROTOCOL_ORDER[0]);
    const seen = new Set([last.id]);
    for (let i = 0; i < 8; i++) {
      const next = nextProtocol(last.id);
      expect(next.id).not.toBe(last.id);
      seen.add(next.id);
      last = next;
    }
    expect(seen.size).toBe(PROTOCOL_ORDER.length);
  });

  it("respects a restricted set and falls back to all when empty", () => {
    expect(nextProtocol("water", ["water", "posture"]).id).toBe("posture");
    expect(nextProtocol("mobility", ["water"]).id).toBe("water");
    expect(nextProtocol(null, []).id).toBe(PROTOCOL_ORDER[0]);
  });
});

describe("format", () => {
  it("formats durations and hours", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(75 * 60 + 59)).toBe("1h 15m");
    expect(formatClock(300)).toBe("05:00");
    expect(formatClock(3725)).toBe("1:02:05");
  });
});

describe("storage", () => {
  it("returns defaults when nothing is stored or data is corrupt", () => {
    const s = memoryStore();
    expect(loadConfig(s)).toEqual(DEFAULT_WEB_CONFIG);
    s.data.set("anti-burnout:config", "{not json");
    s.data.set("anti-burnout:state", "[]");
    expect(loadConfig(s)).toEqual(DEFAULT_WEB_CONFIG);
    expect(loadState(s, "2026-11-07")).toEqual(initialWebState("2026-11-07"));
  });

  it("round-trips config and drops wrongly typed fields", () => {
    const s = memoryStore();
    saveConfig(s, { ...DEFAULT_WEB_CONFIG, reminderIntervalSeconds: 600, notifications: true });
    expect(loadConfig(s).reminderIntervalSeconds).toBe(600);
    expect(loadConfig(s).notifications).toBe(true);
    s.data.set("anti-burnout:config", JSON.stringify({ snoozeMinutes: "ten", notifications: 1 }));
    expect(loadConfig(s).snoozeMinutes).toBe(DEFAULT_WEB_CONFIG.snoozeMinutes);
    expect(loadConfig(s).notifications).toBe(false);
  });

  it("keeps same-day counters and resets them on a new day", () => {
    const s = memoryStore();
    const st = initialWebState("2026-11-07");
    st.cardsDoneToday = 3;
    st.resetsToday = 2;
    st.rotation = 7;
    st.lastProtocolId = "posture";
    saveState(s, st, 123);
    expect(loadState(s, "2026-11-07")).toEqual({ ...st, savedAt: 123 });

    const next = loadState(s, "2026-11-08");
    expect(next.cardsDoneToday).toBe(0);
    expect(next.resetsToday).toBe(0);
    expect(next.rotation).toBe(7);
  });

  it("treats an absence across a reload as a break", () => {
    const st = initialWebState("2026-11-07");
    st.tracker = { ...st.tracker, currentStretchSeconds: 1500, lastReminderAtStretch: 1200 };
    st.savedAt = 1_000_000;
    expect(applyAbsence(st, 1_000_000 + 30_000, 60).tracker.currentStretchSeconds).toBe(1500);
    const away = applyAbsence(st, 1_000_000 + 60_000, 60);
    expect(away.tracker.currentStretchSeconds).toBe(0);
    expect(away.tracker.lastReminderAtStretch).toBe(0);
    expect(away.tracker.onBreak).toBe(true);
    expect(applyAbsence(initialWebState("2026-11-07"), 5e12, 60).tracker.onBreak).toBe(false);
  });

  it("builds local day keys", () => {
    expect(dayKeyFor(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
