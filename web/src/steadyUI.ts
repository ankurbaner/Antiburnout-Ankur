import { STEADY_SCENES, STEADY_STEPS, steadyAt } from "./steady";
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
  const next = get<HTMLButtonElement>("next");
  const back = get<HTMLButtonElement>("back");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const lastStep = STEADY_STEPS.length - 1;
  let step = -1;
  let startedAt = 0;
  let interval: number | undefined;
  let phaseKey = "";
  let scene: keyof typeof STEADY_SCENES = "child";
  const renderScene = (): void => {
    for (const choice of ["child", "sun"] as const) {
      get(choice).hidden = scene !== choice;
      get(`${choice}-choice`).setAttribute("aria-pressed", String(scene === choice));
    }
    if (step === 1) phase.textContent = STEADY_SCENES[scene];
  };
  const finish = (complete: boolean): void => {
    const focusInside = session.contains(document.activeElement);
    window.clearInterval(interval);
    step = -1;
    session.hidden = true;
    start.hidden = false;
    get("result").textContent = complete ? "Well done. Nervousness rises and passes, usually within minutes." : "Stopped. Take things at your own pace.";
    if (focusInside) start.focus();
  };
  const update = (): void => {
    if (step < 0) return;
    const state = steadyAt(step, Math.max(0, (Date.now() - startedAt) / 1000));
    if (!state) return;
    if (state.done) { if (step === lastStep) finish(true); else enter(step + 1, session.contains(document.activeElement)); return; }
    get("time").textContent = `${formatClock(state.remaining)} left${step === 0 || step === 2 ? ` · Round ${state.round} of 3` : ""}`;
    const key = `${step}-${state.round}-${state.phase}`;
    if (key === phaseKey) return;
    phaseKey = key;
    phase.textContent = step === 1 ? STEADY_SCENES[scene] : state.label;
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
    phase.dataset.smile = String(step === 1);
    get("instruction").textContent = STEADY_STEPS[step].instruction;
    get("visual").hidden = step !== 0;
    get("smile").hidden = step !== 1;
    if (step === 1) renderScene();
    back.disabled = step === 0;
    next.textContent = step === lastStep ? "Done" : "Next";
    update();
    if (focus) heading.focus({ preventScroll: true });
  };
  start.addEventListener("click", () => {
    window.clearInterval(interval);
    start.hidden = true;
    session.hidden = false;
    get("result").textContent = "";
    scene = "child";
    enter(0);
    interval = window.setInterval(update, 100);
  });
  back.addEventListener("click", () => { if (step > 0) enter(step - 1); });
  next.addEventListener("click", () => { if (step === lastStep) finish(true); else if (step >= 0) enter(step + 1); });
  get("stop").addEventListener("click", () => finish(false));
  for (const choice of ["child", "sun"] as const) {
    get(`${choice}-choice`).addEventListener("click", () => { scene = choice; renderScene(); });
  }
  const resync = (): void => { phaseKey = ""; update(); };
  document.addEventListener("visibilitychange", resync);
  reducedMotion.addEventListener("change", resync);
  initialized.add(root);
};
