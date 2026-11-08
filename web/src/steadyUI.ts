import { GROUND_SENSES, STEADY_STEPS, steadyAt } from "./steady";
import { formatClock } from "./format";
import "./steady.css";

const initialized = new WeakSet<HTMLElement>();

export const initSteady = (): void => {
  const root = document.getElementById("steady");
  if (!root || initialized.has(root)) return;
  const get = <T extends HTMLElement>(id: string): T => {
    const element = root.querySelector<T>(`#steady-${id}`);
    if (!element) throw new Error(`Missing #steady-${id}`);
    return element;
  };
  const start = get<HTMLButtonElement>("start");
  const session = get("session");
  const heading = get("step");
  const phase = get("phase");
  const circle = get("circle");
  const ground = get("ground");
  const next = get<HTMLButtonElement>("next");
  const back = get<HTMLButtonElement>("back");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const lastStep = STEADY_STEPS.length - 1;
  let step = -1;
  let startedAt = 0;
  let interval: number | undefined;
  let phaseKey = "";
  let noticed = GROUND_SENSES.map(() => 0);
  const finish = (complete: boolean): void => {
    const focusInside = session.contains(document.activeElement);
    window.clearInterval(interval);
    step = -1;
    session.hidden = true;
    start.hidden = false;
    get("result").textContent = complete ? "Well done. Nervousness rises and passes, usually within minutes." : "Stopped. Take things at your own pace.";
    if (focusInside) start.focus();
  };
  const renderGround = (): void => {
    const active = noticed.findIndex((count, index) => count < GROUND_SENSES[index].count);
    ground.replaceChildren(...GROUND_SENSES.map((sense, row) => {
      const group = document.createElement("div");
      group.className = "steady-row";
      group.dataset.active = String(row === active);
      const label = document.createElement("p");
      label.id = `steady-sense-${row}`;
      label.textContent = `${sense.label} ${sense.count} · ${noticed[row]} of ${sense.count} noticed`;
      group.setAttribute("role", "group");
      group.setAttribute("aria-labelledby", label.id);
      const dots = document.createElement("div");
      dots.className = "steady-dots";
      for (let index = 0; index < sense.count; index++) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "steady-dot";
        dot.textContent = noticed[row] > index ? "✓" : "○";
        dot.setAttribute("aria-label", `${sense.label}: notice thing ${index + 1} of ${sense.count}`);
        dot.setAttribute("aria-pressed", String(noticed[row] > index));
        dot.disabled = row !== active || index !== noticed[row];
        dot.addEventListener("click", () => {
          noticed[row]++;
          if (noticed.every((count, i) => count === GROUND_SENSES[i].count)) { enter(3); return; }
          renderGround();
          ground.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
          const current = noticed.findIndex((count, i) => count < GROUND_SENSES[i].count);
          phase.textContent = `Now ${GROUND_SENSES[current].label.toLowerCase()} ${GROUND_SENSES[current].count}.`;
        });
        dots.append(dot);
      }
      group.append(label, dots);
      return group;
    }));
  };
  const update = (): void => {
    if (step < 0) return;
    const state = steadyAt(step, Math.max(0, (Date.now() - startedAt) / 1000));
    if (!state) return;
    if (state.done) { if (step === lastStep) finish(true); else enter(step + 1, session.contains(document.activeElement)); return; }
    get("time").textContent = step === 2 ? "Take your time · Next skips this step" : `${formatClock(state.remaining)} left${step < 2 ? ` · Round ${state.round} of 3` : ""}`;
    const key = `${step}-${state.round}-${state.phase}`;
    if (key === phaseKey) return;
    phaseKey = key;
    phase.textContent = state.label;
    if (step !== 0) return;
    if (reducedMotion.matches) {
      circle.style.removeProperty("transform");
      circle.style.removeProperty("transition");
      circle.dataset.inhale = "false";
      return;
    }
    const from = state.phase === 0 ? 0.65 : state.phase === 1 ? 0.9 : 1;
    const to = state.phase === 0 ? 0.9 : state.phase === 1 ? 1 : 0.65;
    circle.dataset.inhale = String(state.inhale);
    circle.style.transition = "none";
    circle.style.transform = `scale(${from + (to - from) * state.phaseElapsed / state.seconds})`;
    void circle.offsetWidth;
    circle.style.transition = `transform ${state.seconds - state.phaseElapsed}s linear, opacity 0.4s linear`;
    circle.style.transform = `scale(${to})`;
  };
  const enter = (index: number, focus = true): void => {
    step = index;
    startedAt = Date.now();
    phaseKey = "";
    get("progress").textContent = `Step ${step + 1} of ${STEADY_STEPS.length}`;
    heading.textContent = STEADY_STEPS[step].title;
    heading.dataset.reframe = String(step === lastStep);
    get("instruction").textContent = STEADY_STEPS[step].instruction;
    get("visual").hidden = step !== 0;
    ground.hidden = step !== 2;
    back.disabled = step === 0;
    next.textContent = step === lastStep ? "Done" : "Next";
    if (step === 2) renderGround();
    update();
    if (focus) heading.focus({ preventScroll: true });
  };
  start.addEventListener("click", () => {
    window.clearInterval(interval);
    start.hidden = true;
    session.hidden = false;
    get("result").textContent = "";
    noticed = GROUND_SENSES.map(() => 0);
    enter(0);
    interval = window.setInterval(update, 100);
  });
  back.addEventListener("click", () => { if (step > 0) enter(step - 1); });
  next.addEventListener("click", () => { if (step === lastStep) finish(true); else if (step >= 0) enter(step + 1); });
  get("stop").addEventListener("click", () => finish(false));
  const resync = (): void => { phaseKey = ""; update(); };
  document.addEventListener("visibilitychange", resync);
  reducedMotion.addEventListener("change", resync);
  initialized.add(root);
};
