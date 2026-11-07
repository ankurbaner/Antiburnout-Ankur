/** Small display helpers. */

/** 0 -> "0m", 75 -> "1h 15m". */
export const formatMinutes = (totalSeconds: number): string => {
  const mins = Math.floor(Math.max(0, totalSeconds) / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/** 300 -> "05:00", 3725 -> "1:02:05". */
export const formatClock = (totalSeconds: number): string => {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number): string => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};
