/**
 * localStorage persistence. Only coarse counters and settings are stored, and
 * nothing is ever sent anywhere.
 */
import { DEFAULT_CONFIG, TrackerState, createInitialState } from "../../src/tracker";
import { ProtocolId } from "./protocols";

export interface WebConfig {
  idleThresholdSeconds: number;
  reminderIntervalSeconds: number;
  snoozeMinutes: number;
  chime: boolean;
  headsUp: boolean;
  maxSnoozes: number;
  eyeBreaks: boolean;
  eyeBreakMinutes: number;
  dailyGoalMinutes: number;
  workHours: boolean;
  workStartMinutes: number;
  workEndMinutes: number;
  /** Use the Idle Detection API when the browser supports it. */
  systemIdle: boolean;
}

export const DEFAULT_WEB_CONFIG: WebConfig = {
  idleThresholdSeconds: DEFAULT_CONFIG.idleThresholdSeconds,
  reminderIntervalSeconds: DEFAULT_CONFIG.reminderIntervalSeconds,
  snoozeMinutes: 5,
  chime: true,
  headsUp: true,
  maxSnoozes: 2,
  eyeBreaks: false,
  eyeBreakMinutes: 10,
  dailyGoalMinutes: 0,
  workHours: false,
  workStartMinutes: 540,
  workEndMinutes: 1080,
  systemIdle: false,
};

export interface HistoryEntry {
  day: string;
  activeSeconds: number;
  cardsDone: number;
  resets: number;
}

export interface WebState {
  tracker: TrackerState;
  /** How many recovery cards have been shown; rotates their wording. */
  rotation: number;
  /** Cards marked Done today. */
  cardsDoneToday: number;
  /** Bio-Resets completed today. */
  resetsToday: number;
  snoozesInARow: number;
  lastEyeBreakAtStretch: number;
  goalNoticeDay: string;
  wrapUpNoticeDay: string;
  history: HistoryEntry[];
  lastProtocolId: ProtocolId | null;
  paused: boolean;
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
  lastEyeBreakAtStretch: 0,
  goalNoticeDay: "",
  wrapUpNoticeDay: "",
  history: [],
  lastProtocolId: null,
  paused: false,
  savedAt: 0,
});

const CONFIG_KEY = "anti-burnout:config";
const STATE_KEY = "anti-burnout:state";

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const noticeDay = (value: unknown): string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
};

const isHistoryEntry = (value: unknown): value is HistoryEntry => {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return noticeDay(entry.day) !== "" && isFiniteNumber(entry.activeSeconds) && entry.activeSeconds >= 0 &&
    isFiniteNumber(entry.cardsDone) && Number.isInteger(entry.cardsDone) && entry.cardsDone >= 0 &&
    isFiniteNumber(entry.resets) && Number.isInteger(entry.resets) && entry.resets >= 0;
};

const normalizeHistory = (entries: HistoryEntry[], today: string): HistoryEntry[] => {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  const oldestDay = cutoff.toISOString().slice(0, 10);
  const days = new Map<string, HistoryEntry>();
  for (const entry of entries) {
    if (isHistoryEntry(entry) && entry.day >= oldestDay && entry.day < today &&
      (entry.activeSeconds > 0 || entry.cardsDone > 0 || entry.resets > 0)) {
      days.set(entry.day, { day: entry.day, activeSeconds: entry.activeSeconds, cardsDone: entry.cardsDone, resets: entry.resets });
    }
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day)).slice(-7);
};

export const archiveDay = (history: HistoryEntry[], entry: HistoryEntry, today: string): HistoryEntry[] =>
  normalizeHistory([...history, entry], today);

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
 * from an earlier day, archiving that day's totals first.
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
  let history = normalizeHistory(Array.isArray(raw.history)
    ? raw.history.filter(isHistoryEntry) : [], dayKey);
  if (tracker.dayKey < dayKey) {
    history = archiveDay(history, {
      day: tracker.dayKey,
      activeSeconds: Math.max(0, tracker.todayActiveSeconds),
      cardsDone: Math.max(0, Math.floor(num(raw.cardsDoneToday))),
      resets: Math.max(0, Math.floor(num(raw.resetsToday))),
    }, dayKey);
  }
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
    lastEyeBreakAtStretch: !tracker.onBreak && tracker.currentStretchSeconds > 0 && isFiniteNumber(raw.lastEyeBreakAtStretch)
      ? Math.max(0, Math.min(tracker.currentStretchSeconds, raw.lastEyeBreakAtStretch)) : 0,
    goalNoticeDay: noticeDay(raw.goalNoticeDay),
    wrapUpNoticeDay: noticeDay(raw.wrapUpNoticeDay),
    history,
    lastProtocolId:
      protocol === "water" || protocol === "posture" || protocol === "mobility" || protocol === "breathwork" || protocol === "humming" || protocol === "laughter"
        ? protocol
        : null,
    paused: raw.paused === true,
    savedAt: num(raw.savedAt),
  };
};

/**
 * Treat time since the last save as a break when it reaches the idle
 * threshold, so closing the tab for lunch doesn't continue the old stretch.
 */
export const applyAbsence = (state: WebState, now: number, idleThresholdSeconds: number): WebState =>
  state.savedAt > 0 && now - state.savedAt >= idleThresholdSeconds * 1000
    ? { ...state, snoozesInARow: 0, lastEyeBreakAtStretch: 0, tracker: { ...state.tracker, currentStretchSeconds: 0, lastReminderAtStretch: 0, onBreak: true } }
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
