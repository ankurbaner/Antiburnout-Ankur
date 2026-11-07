import { dailyPractice } from "./dailyPractice";
import { initPracticeGroups } from "./yogaUI";
import { DEFAULT_GENTLE, GentleSettings } from "./gentle";

let stopTimer: (() => void) | undefined;

export const initDailyPractice = (date = new Date(), gentle: GentleSettings = DEFAULT_GENTLE): void => {
  const container = document.getElementById("daily-practice");
  if (!container) return;
  stopTimer?.();
  const practice = dailyPractice(date, undefined, gentle);
  stopTimer = initPracticeGroups("daily-practice", practice ? [{ id: "daily", title: "Practice of the day", practices: [practice] }] : [], true);
};
