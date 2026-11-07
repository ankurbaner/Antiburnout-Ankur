import { MEDITATION_PRACTICES } from "./meditation";
import { GENTLE_PRACTICES, YOGA_GROUPS, YogaPractice } from "./yoga";
import { DEFAULT_GENTLE, GentleSettings, filterPractices, hasGentleSettings } from "./gentle";

export const DAILY_PRACTICES: YogaPractice[] = [
  ...YOGA_GROUPS.flatMap((group) => group.practices),
  ...MEDITATION_PRACTICES,
];

export const dailyPractice = (date: Date, practices: readonly YogaPractice[] = DAILY_PRACTICES, gentle: GentleSettings = DEFAULT_GENTLE): YogaPractice | null => {
  const pool = filterPractices(practices, gentle);
  if (hasGentleSettings(gentle)) pool.push(...GENTLE_PRACTICES.filter((practice) => !pool.some((item) => item.id === practice.id)));
  if (!Number.isFinite(date.getTime()) || pool.length === 0) return null;
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return pool[((day % pool.length) + pool.length) % pool.length];
};
