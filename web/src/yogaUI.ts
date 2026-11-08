import { YogaGroup, YOGA_GROUPS, practiceSecondsLeft } from "./yoga";
import { formatClock } from "./format";
import "./yoga.css";

export const initPracticeGroups = (containerId: string, groups: YogaGroup[], featured = false): (() => void) => {
  const container = document.getElementById(containerId);
  if (!container) return () => {};
  const stopTimers: (() => void)[] = [];
  container.replaceChildren(...groups.map((group) => {
    const section = document.createElement("div");
    section.className = "yoga-group";
    const heading = document.createElement("h3");
    heading.id = `${containerId}-group-${group.id}`;
    heading.textContent = group.title;
    section.setAttribute("role", "group");
    section.setAttribute("aria-labelledby", heading.id);
    const cards = document.createElement("div");
    cards.className = featured ? "yoga-practices daily-practices" : "yoga-practices";
    cards.replaceChildren(...group.practices.map((practice) => {
      const card = document.createElement("article");
      card.className = "yoga-practice";
      card.dataset.practice = practice.id;
      const duration = document.createElement("p");
      duration.className = "yoga-duration";
      duration.textContent = practice.seconds < 60 ? `${practice.seconds} s` : `${practice.seconds / 60} min`;
      const title = document.createElement("h4");
      title.id = `${containerId}-practice-${practice.id}`;
      title.textContent = practice.title;
      const english = document.createElement("p");
      english.className = "yoga-english";
      english.textContent = practice.english;
      const instruction = document.createElement("p");
      instruction.textContent = practice.instruction;
      const start = document.createElement("button");
      start.type = "button";
      start.className = "btn btn-ghost btn-sm";
      start.textContent = "Start";
      start.setAttribute("aria-label", `Start ${practice.title}`);
      start.setAttribute("aria-expanded", "false");
      const timer = document.createElement("div");
      timer.className = "yoga-timer";
      timer.id = `${containerId}-timer-${practice.id}`;
      timer.hidden = true;
      start.setAttribute("aria-controls", timer.id);
      const countdown = document.createElement("span");
      countdown.className = "yoga-countdown";
      countdown.setAttribute("role", "timer");
      countdown.setAttribute("aria-label", `${practice.title} time remaining`);
      const status = document.createElement("p");
      status.className = "yoga-timer-status";
      status.setAttribute("role", "status");
      const done = document.createElement("button");
      done.type = "button";
      done.className = "btn btn-ghost btn-sm";
      done.textContent = "Done";
      done.setAttribute("aria-label", `Done with ${practice.title}`);
      timer.append(countdown, done);
      let interval: number | undefined;
      stopTimers.push(() => window.clearInterval(interval));
      let endsAt: number | null = null;
      const update = (): void => {
        const left = practiceSecondsLeft(endsAt, Date.now());
        countdown.textContent = formatClock(left ?? practice.seconds);
        if (left === 0) {
          window.clearInterval(interval);
          status.textContent = "All done. Take your time coming back.";
        }
      };
      start.addEventListener("click", () => {
        endsAt = Date.now() + practice.seconds * 1000;
        timer.hidden = false;
        start.hidden = true;
        start.setAttribute("aria-expanded", "true");
        status.textContent = "Go gently. You can stop whenever you like.";
        update();
        interval = window.setInterval(update, 250);
        done.focus();
      });
      done.addEventListener("click", () => {
        window.clearInterval(interval);
        endsAt = null;
        timer.hidden = true;
        start.hidden = false;
        start.setAttribute("aria-expanded", "false");
        status.textContent = "";
        start.focus();
      });
      card.setAttribute("aria-labelledby", title.id);
      card.append(duration, title, english, instruction, start, timer, status);
      return card;
    }));
    section.append(heading);
    section.append(cards);
    return section;
  }));
  return () => stopTimers.forEach((stop) => stop());
};

let stopYogaTimers: (() => void) | undefined;
export const initYoga = (): void => {
  stopYogaTimers?.();
  stopYogaTimers = initPracticeGroups("yoga-groups", YOGA_GROUPS);
};
