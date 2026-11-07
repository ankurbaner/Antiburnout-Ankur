/**
 * The evening boundary, ported from Off-Duty: between `startHour` and
 * `endHour` (default 8pm-6am) the app suggests the day is over.
 */

export interface CurfewConfig {
  startHour: number;
  endHour: number;
}

export const DEFAULT_CURFEW: CurfewConfig = { startHour: 20, endHour: 6 };

export interface CurfewStatus {
  inCurfew: boolean;
  /** When the evening window next ends. */
  unlockAt: Date;
  secondsUntilUnlock: number;
  /** When the evening window next starts (now, if already inside it). */
  nextStartAt: Date;
  secondsUntilStart: number;
}

/**
 * Whether `hour` falls inside the window. Handles windows that wrap past
 * midnight (20 -> 6) as well as same-day ones (13 -> 14).
 */
export const isCurfewHour = (hour: number, cfg: CurfewConfig = DEFAULT_CURFEW): boolean => {
  if (cfg.startHour === cfg.endHour) return false;
  return cfg.startHour < cfg.endHour
    ? hour >= cfg.startHour && hour < cfg.endHour
    : hour >= cfg.startHour || hour < cfg.endHour;
};

const atHour = (base: Date, hour: number, dayOffset = 0): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

/**
 * Compute the curfew status for a moment in time.
 *
 * @param now - The moment to evaluate.
 * @param cfg - Start/end hours of the evening window.
 * @returns Whether it is curfew, and when it next ends and starts.
 */
export const curfewStatus = (now: Date, cfg: CurfewConfig = DEFAULT_CURFEW): CurfewStatus => {
  const inCurfew = isCurfewHour(now.getHours(), cfg);

  let unlockAt = atHour(now, cfg.endHour);
  if (unlockAt.getTime() <= now.getTime()) unlockAt = atHour(now, cfg.endHour, 1);

  let nextStartAt = atHour(now, cfg.startHour);
  if (inCurfew) {
    nextStartAt = new Date(now);
  } else if (nextStartAt.getTime() <= now.getTime()) {
    nextStartAt = atHour(now, cfg.startHour, 1);
  }

  return {
    inCurfew,
    unlockAt,
    secondsUntilUnlock: Math.max(0, Math.round((unlockAt.getTime() - now.getTime()) / 1000)),
    nextStartAt,
    secondsUntilStart: Math.max(0, Math.round((nextStartAt.getTime() - now.getTime()) / 1000)),
  };
};
