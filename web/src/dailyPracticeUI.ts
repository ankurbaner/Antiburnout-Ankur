import { dailyPractice } from "./dailyPractice";
import { initPracticeGroups } from "./yogaUI";

let stopTimer: (() => void) | undefined;

export const initDailyPractice = (date = new Date()): void => {
  const container = document.getElementById("daily-practice");
  if (!container) return;
  stopTimer?.();
  const practice = dailyPractice(date);
  stopTimer = initPracticeGroups("daily-practice", practice ? [{ id: "daily", title: "Practice of the day", practices: [practice] }] : [], true);
};
