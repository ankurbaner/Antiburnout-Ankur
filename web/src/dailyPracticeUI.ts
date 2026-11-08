import { dailyPracticePair } from "./dailyPractice";
import { initPracticeGroups } from "./yogaUI";

let stopTimer: (() => void) | undefined;

export const initDailyPractice = (date = new Date()): void => {
  const container = document.getElementById("daily-practice");
  if (!container) return;
  stopTimer?.();
  const pair = dailyPracticePair(date);
  const groups = [
    { id: "mindfulness", title: "Mindfulness", practices: pair.mindfulness ? [pair.mindfulness] : [] },
    { id: "yoga", title: "Yoga exercise", practices: pair.yoga ? [pair.yoga] : [] },
  ].filter((group) => group.practices.length > 0);
  stopTimer = initPracticeGroups("daily-practice", groups, true);
};
