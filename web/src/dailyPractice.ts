import { MEDITATION_PRACTICES } from "./meditation";
import { YOGA_GROUPS, YogaPractice } from "./yoga";

export const DAILY_PRACTICES: YogaPractice[] = [
  ...YOGA_GROUPS.flatMap((group) => group.practices),
  ...MEDITATION_PRACTICES,
];

export const dailyPractice = (date: Date, practices: readonly YogaPractice[] = DAILY_PRACTICES): YogaPractice | null => {
  if (!Number.isFinite(date.getTime()) || practices.length === 0) return null;
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return practices[((day % practices.length) + practices.length) % practices.length];
};
