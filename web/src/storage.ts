/**
 * localStorage persistence. Only coarse counters and settings are stored, and
 * nothing is ever sent anywhere.
 */
import { DEFAULT_CONFIG, TrackerState, createInitialState } from "../../src/tracker";
import { ProtocolId, isProtocolId } from "./protocols";
import { isCardPracticeId } from "./cards";
import { DEFAULT_GENTLE, GentleSettings, loadGentle } from "./gentle";
import { INTENTION_KEY } from "./intention";
import { SPOT_KEY, validClock } from "./saveSpot";

export interface WebConfig {
  idleThresholdSeconds: number;
  reminderIntervalSeconds: number;
  snoozeMinutes: number;
  chime: boolean;
  maxSnoozes: number;
  gentle: GentleSettings;
  endOfDay: boolean;
  endOfDayTime: string;
}

export const DEFAULT_WEB_CONFIG: WebConfig = {
  idleThresholdSeconds: DEFAULT_CONFIG.idleThresholdSeconds,
  reminderIntervalSeconds: DEFAULT_CONFIG.reminderIntervalSeconds,
  snoozeMinutes: 5,
  chime: true,
  maxSnoozes: 2,
  gentle: DEFAULT_GENTLE,
  endOfDay: true,
  endOfDayTime: "18:00",
};

export interface WebState {
  tracker: TrackerState;
  /** How many recovery cards have been shown; rotates their wording. */
  rotation: number;
  /** Cards marked Done today. */
  cardsDoneToday: number;
  /** Bio-Resets completed today. */
  resetsToday: number;
  snoozesInARow: number;
  lastProtocolId: ProtocolId | null;
  meetingMode: boolean;
  lastPracticeId: string | null;
  /** Epoch ms of the last save, to detect an absence across a reload. */
  savedAt: number;
}

/** Local calendar day as YYYY-MM-DD. */
export const dayKeyFor = (d: Date): string => {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const initialWebState = (dayKey: string): WebState => ({
  tracker: createInitialState(dayKey),
  rotation: 0,
  cardsDoneToday: 0,
  resetsToday: 0,
  snoozesInARow: 0,
  lastProtocolId: null,
  meetingMode: false,
  lastPracticeId: null,
  savedAt: 0,
});

const CONFIG_KEY = "anti-burnout:config";
const STATE_KEY = "anti-burnout:state";

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const read = (store: KV, key: string): Record<string, unknown> | null => {
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/**
 * Load settings, keeping only well-typed values and falling back to defaults
 * for anything missing or malformed.
 */
export const loadConfig = (store: KV): WebConfig => {
  const raw = read(store, CONFIG_KEY) ?? {};
  const out = { ...DEFAULT_WEB_CONFIG };
  for (const key of Object.keys(out) as (keyof WebConfig)[]) {
    // Idle stays fixed at 60 seconds, ignoring old user-configured values.
    if (key === "idleThresholdSeconds") continue;
    const v = raw[key];
    if (typeof out[key] === "number" && isFiniteNumber(v)) (out[key] as number) = v;
    if (typeof out[key] === "boolean" && typeof v === "boolean") (out[key] as boolean) = v;
  }
  out.gentle = loadGentle(raw.gentle);
  out.endOfDayTime = validClock(raw.endOfDayTime) ? raw.endOfDayTime : "18:00";
  return out;
};

export const saveConfig = (store: KV, config: WebConfig): void => {
  try {
    store.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    /* storage full or disabled: settings just won't persist */
  }
};

/**
 * Load saved state for `dayKey`. Daily counters reset when the saved state is
 * from an earlier day. Retired state fields are ignored.
 */
export const loadState = (store: KV, dayKey: string): WebState => {
  const fresh = initialWebState(dayKey);
  const raw = read(store, STATE_KEY);
  if (!raw) return fresh;

  const t = (raw.tracker ?? {}) as Record<string, unknown>;
  const tracker: TrackerState = {
    currentStretchSeconds: isFiniteNumber(t.currentStretchSeconds) ? t.currentStretchSeconds : 0,
    todayActiveSeconds: isFiniteNumber(t.todayActiveSeconds) ? t.todayActiveSeconds : 0,
    onBreak: typeof t.onBreak === "boolean" ? t.onBreak : false,
    lastReminderAtStretch: isFiniteNumber(t.lastReminderAtStretch) ? t.lastReminderAtStretch : 0,
    dayKey: typeof t.dayKey === "string" ? t.dayKey : dayKey,
  };
  const sameDay = tracker.dayKey === dayKey;
  const num = (v: unknown): number => (isFiniteNumber(v) ? v : 0);
  const protocol = raw.lastProtocolId;
  if (!sameDay) {
    tracker.todayActiveSeconds = 0;
    tracker.dayKey = dayKey;
  }

  return {
    tracker,
    rotation: num(raw.rotation),
    cardsDoneToday: sameDay ? num(raw.cardsDoneToday) : 0,
    resetsToday: sameDay ? num(raw.resetsToday) : 0,
    snoozesInARow: !tracker.onBreak && tracker.currentStretchSeconds > 0 && isFiniteNumber(raw.snoozesInARow)
      ? Math.max(0, Math.floor(raw.snoozesInARow)) : 0,
    lastProtocolId: isProtocolId(protocol) ? protocol : null,
    meetingMode: sameDay && raw.meetingMode === true,
    lastPracticeId: isCardPracticeId(raw.lastPracticeId) ? raw.lastPracticeId : null,
    savedAt: num(raw.savedAt),
  };
};

/**
 * Treat time since the last save as a break when it reaches the idle
 * threshold, so closing the tab for lunch doesn't continue the old stretch.
 */
export const applyAbsence = (state: WebState, now: number, idleThresholdSeconds: number): WebState =>
  state.savedAt > 0 && now - state.savedAt >= idleThresholdSeconds * 1000
    ? { ...state, snoozesInARow: 0, tracker: { ...state.tracker, currentStretchSeconds: 0, lastReminderAtStretch: 0, onBreak: true } }
    : state;

export const saveState = (store: KV, state: WebState, now = Date.now()): void => {
  try {
    state.savedAt = now;
    store.setItem(STATE_KEY, JSON.stringify(state));

  } catch {
    /* ignore */
  }
};

export const clearAll = (store: KV): void => {
  store.removeItem(CONFIG_KEY);
  store.removeItem(STATE_KEY);
  store.removeItem(INTENTION_KEY);
  store.removeItem(SPOT_KEY);
};
