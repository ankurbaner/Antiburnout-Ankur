import { MEDITATION_PRACTICES } from "./meditation";
import { YOGA_GROUPS, YogaPractice } from "./yoga";

export const DAILY_YOGA_PRACTICES = YOGA_GROUPS
  .filter((group) => group.id !== "breathing")
  .flatMap((group) => group.practices);

const dailyPractice = (date: Date, practices: readonly YogaPractice[]): YogaPractice | null => {
  if (!Number.isFinite(date.getTime()) || practices.length === 0) return null;
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return practices[((day % practices.length) + practices.length) % practices.length];
};

export const dailyPracticePair = (
  date: Date,
  mindfulness: readonly YogaPractice[] = MEDITATION_PRACTICES,
  yoga: readonly YogaPractice[] = DAILY_YOGA_PRACTICES,
) => ({ mindfulness: dailyPractice(date, mindfulness), yoga: dailyPractice(date, yoga) });
