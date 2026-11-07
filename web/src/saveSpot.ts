import { LocalStore, oneLine } from "./intention";

export const SPOT_KEY = "anti-burnout:spot";
export interface SavedSpot { text: string; savedDay: string; promptDay: string }
export const validClock = (value: unknown): value is string => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const dayString = (value: unknown): string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";

export const loadSpot = (store: LocalStore): SavedSpot => {
  try {
    const raw = JSON.parse(store.getItem(SPOT_KEY) ?? "null");
    return { text: typeof raw?.text === "string" ? oneLine(raw.text, 200) : "", savedDay: dayString(raw?.savedDay), promptDay: dayString(raw?.promptDay) };
  } catch { return { text: "", savedDay: "", promptDay: "" }; }
};
export const saveSpot = (store: LocalStore, spot: SavedSpot): void => {
  try { store.setItem(SPOT_KEY, JSON.stringify(spot)); } catch { /* local storage may be unavailable */ }
};
export const spotDue = (day: string, hour: number, minute: number, enabled: boolean, clock: string, spot: SavedSpot): boolean => {
  if (!enabled || !validClock(clock) || !Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  const [endHour, endMinute] = clock.split(":").map(Number);
  return spot.savedDay !== day && spot.promptDay !== day && hour * 60 + minute >= endHour * 60 + endMinute;
};
export const morningNote = (spot: SavedSpot, day: string): string => spot.savedDay && day > spot.savedDay ? spot.text : "";
