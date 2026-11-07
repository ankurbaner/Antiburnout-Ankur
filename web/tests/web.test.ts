import { describe, expect, it } from "vitest";
import { curfewStatus, isCurfewHour } from "../src/curfew";
import { pageIdleSeconds, systemIdleSeconds } from "../src/activity";
import { PROTOCOL_ORDER, nextProtocol } from "../src/protocols";
import { formatClock, formatHour, formatMinutes } from "../src/format";
import {
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

describe("curfew", () => {
  it("wraps past midnight for the default 8pm-6am window", () => {
    expect(isCurfewHour(19)).toBe(false);
    expect(isCurfewHour(20)).toBe(true);
    expect(isCurfewHour(2)).toBe(true);
    expect(isCurfewHour(6)).toBe(false);
  });

  it("supports same-day windows and treats equal hours as disabled", () => {
    expect(isCurfewHour(13, { startHour: 13, endHour: 14 })).toBe(true);
    expect(isCurfewHour(14, { startHour: 13, endHour: 14 })).toBe(false);
    expect(isCurfewHour(3, { startHour: 5, endHour: 5 })).toBe(false);
  });

  it("counts down to the next morning during the evening", () => {
    const s = curfewStatus(new Date(2026, 10, 7, 22, 0, 0));
    expect(s.inCurfew).toBe(true);
    expect(s.unlockAt).toEqual(new Date(2026, 10, 8, 6, 0, 0));
    expect(s.secondsUntilUnlock).toBe(8 * 3600);
    expect(s.secondsUntilStart).toBe(0);
  });

  it("unlocks the same morning when it's already after midnight", () => {
    const s = curfewStatus(new Date(2026, 10, 7, 4, 30, 0));
    expect(s.unlockAt).toEqual(new Date(2026, 10, 7, 6, 0, 0));
  });

  it("reports time until the evening starts during the day", () => {
    const s = curfewStatus(new Date(2026, 10, 7, 17, 15, 0));
    expect(s.inCurfew).toBe(false);
    expect(s.secondsUntilStart).toBe(2 * 3600 + 45 * 60);
  });
});

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
    expect(formatHour(0)).toBe("12am");
    expect(formatHour(12)).toBe("12pm");
    expect(formatHour(20)).toBe("8pm");
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
    saveConfig(s, { ...DEFAULT_WEB_CONFIG, reminderIntervalSeconds: 600, autoLock: true });
    expect(loadConfig(s).reminderIntervalSeconds).toBe(600);
    expect(loadConfig(s).autoLock).toBe(true);
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
    saveState(s, st);
    expect(loadState(s, "2026-11-07")).toEqual(st);
    const next = loadState(s, "2026-11-08");
    expect(next.cardsDoneToday).toBe(0);
    expect(next.resetsToday).toBe(0);
    expect(next.rotation).toBe(7);
  });

  it("builds local day keys", () => {
    expect(dayKeyFor(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
