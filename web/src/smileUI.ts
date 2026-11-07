import { SMILE_PRACTICES, SMILE_SCENES, nextSmileScene, practiceSecondsLeft } from "./smile";
import "./smile.css";

export const initSmile = (): void => {
  const stage = document.getElementById("smile-player")!;
  const scenes = [...stage.querySelectorAll<HTMLElement>(".smile-scene")];
  const caption = document.getElementById("smile-caption")!;
  const dots = document.getElementById("smile-dots")!;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let current = 0;
  let hovered = false;
  let rotation: number | undefined;
  dots.replaceChildren(...SMILE_SCENES.map(() => document.createElement("span")));

  const showScene = (): void => {
    scenes.forEach((scene, i) => scene.classList.toggle("is-current", i === current));
    [...dots.children].forEach((dot, i) => dot.classList.toggle("is-current", i === current));
    caption.textContent = SMILE_SCENES[current];
  };
  const schedule = (): void => {
    window.clearTimeout(rotation);
    if (reduced.matches || hovered || stage.querySelector(":focus-visible") || document.hidden) return;
    rotation = window.setTimeout(() => {
      current = nextSmileScene(current);
      showScene();
      schedule();
    }, 15_000);
  };
  document.getElementById("smile-next")!.addEventListener("click", () => {
    current = nextSmileScene(current);
    showScene();
    schedule();
  });
  stage.addEventListener("mouseenter", () => { hovered = true; schedule(); });
  stage.addEventListener("mouseleave", () => { hovered = false; schedule(); });
  stage.addEventListener("focusin", schedule);
  stage.addEventListener("focusout", () => { window.setTimeout(schedule, 0); });
  document.addEventListener("visibilitychange", schedule);
  reduced.addEventListener("change", schedule);
  showScene();
  schedule();

  document.getElementById("smile-practices")!.replaceChildren(...SMILE_PRACTICES.map((practice) => {
    const card = document.createElement("article");
    card.className = "smile-practice";
    card.dataset.practice = practice.id;
    const duration = document.createElement("p");
    duration.className = "smile-duration";
    duration.textContent = practice.seconds === 60 ? "1 min" : "30 sec";
    const title = document.createElement("h4");
    title.id = `smile-practice-${practice.id}`;
    title.textContent = practice.title;
    const instruction = document.createElement("p");
    instruction.textContent = practice.instruction;
    const start = document.createElement("button");
    start.type = "button";
    start.className = "btn btn-ghost btn-sm";
    start.textContent = "Start";
    start.setAttribute("aria-label", `Start ${practice.title}`);
    start.setAttribute("aria-expanded", "false");
    const timer = document.createElement("div");
    timer.className = "smile-timer";
    timer.id = `smile-timer-${practice.id}`;
    timer.hidden = true;
    start.setAttribute("aria-controls", timer.id);
    const countdown = document.createElement("span");
    countdown.className = "smile-countdown";
    countdown.setAttribute("role", "timer");
    countdown.setAttribute("aria-label", `${practice.title} seconds remaining`);
    const status = document.createElement("p");
    status.className = "smile-timer-status";
    status.setAttribute("role", "status");
    const done = document.createElement("button");
    done.type = "button";
    done.className = "btn btn-ghost btn-sm";
    done.textContent = "Done";
    done.setAttribute("aria-label", `Done with ${practice.title}`);
    timer.append(countdown, done);
    let interval: number | undefined;
    let endsAt: number | null = null;
    const update = (): void => {
      const left = practiceSecondsLeft(endsAt, Date.now());
      countdown.textContent = `${left ?? practice.seconds} s`;
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
    card.append(duration, title, instruction, start, timer, status);
    return card;
  }));
};
