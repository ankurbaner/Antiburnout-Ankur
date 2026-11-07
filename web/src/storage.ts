/**
 * localStorage persistence. Only coarse counters and settings are stored, and
 * nothing is ever sent anywhere.
 */
import { DEFAULT_CONFIG, TrackerState, createInitialState } from "../../src/tracker";
import { DEFAULT_CURFEW } from "./curfew";
import { ProtocolId } from "./protocols";

export interface WebConfig {
  idleThresholdSeconds: number;
  reminderIntervalSeconds: number;
  snoozeMinutes: number;
  curfewStartHour: number;
  curfewEndHour: number;
  /** Show the end-of-day screen automatically once curfew starts. */
  autoLock: boolean;
  /** Also raise a system notification when a card is due and the tab is in the background. */
  notifications: boolean;
  /** Use the Idle Detection API when the browser supports it. */
  systemIdle: boolean;
}

export const DEFAULT_WEB_CONFIG: WebConfig = {
  idleThresholdSeconds: DEFAULT_CONFIG.idleThresholdSeconds,
  reminderIntervalSeconds: DEFAULT_CONFIG.reminderIntervalSeconds,
  snoozeMinutes: 5,
  curfewStartHour: DEFAULT_CURFEW.startHour,
  curfewEndHour: DEFAULT_CURFEW.endHour,
  autoLock: false,
  notifications: false,
  systemIdle: false,
};

export interface WebState {
  tracker: TrackerState;
  /** How many recovery cards have been shown; rotates their wording. */
  rotation: number;
  /** Cards marked Done today. */
  cardsDoneToday: number;
  /** Bio-Resets completed today. */
  resetsToday: number;
  lastProtocolId: ProtocolId | null;
  paused: boolean;
  /** ISO time the user ended their day; cleared when the evening window ends. */
  dayEndedAt: string | null;
  /** ISO time until which auto-lock stays off after "Unlock anyway". */
  lockOverrideUntil: string | null;
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
  lastProtocolId: null,
  paused: false,
  dayEndedAt: null,
  lockOverrideUntil: null,
  savedAt: 0,
});

const CONFIG_KEY = "anti-burnout:config";
const STATE_KEY = "anti-burnout:state";

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** A string that parses to a real date, or null. */
const validIso = (v: unknown): string | null =>
  typeof v === "string" && Number.isFinite(new Date(v).getTime()) ? v : null;

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
    const v = raw[key];
    if (typeof out[key] === "number" && isFiniteNumber(v)) (out[key] as number) = v;
    if (typeof out[key] === "boolean" && typeof v === "boolean") (out[key] as boolean) = v;
  }
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
 * from an earlier day; the tracker handles its own rollover on the next tick.
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

  return {
    tracker,
    rotation: num(raw.rotation),
    cardsDoneToday: sameDay ? num(raw.cardsDoneToday) : 0,
    resetsToday: sameDay ? num(raw.resetsToday) : 0,
    lastProtocolId:
      protocol === "water" || protocol === "posture" || protocol === "mobility" || protocol === "breathwork"
        ? protocol
        : null,
    paused: raw.paused === true,
    dayEndedAt: validIso(raw.dayEndedAt),
    lockOverrideUntil: validIso(raw.lockOverrideUntil),
    savedAt: num(raw.savedAt),
  };
};

/**
 * Treat time since the last save as a break when it reaches the idle
 * threshold, so closing the tab for lunch doesn't continue the old stretch.
 */
export const applyAbsence = (state: WebState, now: number, idleThresholdSeconds: number): WebState =>
  state.savedAt > 0 && now - state.savedAt >= idleThresholdSeconds * 1000
    ? { ...state, tracker: { ...state.tracker, currentStretchSeconds: 0, lastReminderAtStretch: 0, onBreak: true } }
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
};
