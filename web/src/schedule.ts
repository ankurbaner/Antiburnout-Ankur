export const headsUpSeconds = (untilNext: number, enabled: boolean): number | null =>
  enabled && untilNext > 0 && untilNext <= 10 ? Math.ceil(untilNext) : null;

export const snoozeAllowed = (count: number, max: number): boolean => max === 0 || count < max;
