export const headsUpSeconds = (untilNext: number, enabled: boolean): number | null =>
  enabled && untilNext > 0 && untilNext <= 10 ? Math.ceil(untilNext) : null;

export const snoozeAllowed = (count: number, max: number): boolean => max === 0 || count < max;

export const eyeBreakDue = (stretch: number, lastAt: number, intervalSec: number, untilNextCard: number): "show" | "skip" | "no" =>
  stretch - lastAt >= intervalSec ? (untilNextCard <= 120 ? "skip" : "show") : "no";

export const withinWorkingHours = (minuteOfDay: number, start: number, end: number): boolean =>
  start === end || (start < end ? minuteOfDay >= start && minuteOfDay < end : minuteOfDay >= start || minuteOfDay < end);

export const formatTimeOfDay = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const parseTimeOfDay = (value: string, fallback: number): number => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return fallback;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

export const crossedWorkEnd = (previous: number, now: number, end: number): boolean => {
  const boundary = new Date(now);
  boundary.setHours(Math.floor(end / 60), end % 60, 0, 0);
  return previous < boundary.getTime() && boundary.getTime() <= now;
};
