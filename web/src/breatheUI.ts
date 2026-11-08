import { BREATH_PATTERNS, breathAt } from "./breathe";
import { formatClock } from "./format";
import "./breathe.css";

export const initBreathe = (): void => {
  const root = document.getElementById("breathe");
  if (!root) return;
  const patternSelect = root.querySelector<HTMLSelectElement>("#breath-pattern")!;
  const durationSelect = root.querySelector<HTMLSelectElement>("#breath-duration")!;
  const button = root.querySelector<HTMLButtonElement>("#breath-start")!;
  const circle = root.querySelector<HTMLElement>(".breath-circle")!;
  const cue = root.querySelector<HTMLElement>("#breath-cue")!;
  const remaining = root.querySelector<HTMLElement>("#breath-remaining")!;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let startedAt: number | null = null;
  let interval: number | undefined;
  let lastPhase = "";
  const idle = (message: string): void => {
    window.clearInterval(interval);
    startedAt = null;
    patternSelect.disabled = durationSelect.disabled = false;
    button.textContent = "Start";
    cue.textContent = message;
    circle.style.transition = "none";
    circle.style.transform = "scale(0.65)";
    circle.dataset.inhale = "false";
    lastPhase = "";
  };
  const update = (): void => {
    if (startedAt === null) return;
    const pattern = BREATH_PATTERNS.find((item) => item.id === patternSelect.value)!;
    const elapsed = (Date.now() - startedAt) / 1000;
    const state = breathAt(pattern, elapsed, Number(durationSelect.value) * 60);
    if (!state) { idle("Stopped. Breathe at your own pace."); return; }
    remaining.textContent = formatClock(state.remaining);
    if (state.done || !state.phase) { idle("All done. Breathe at your own pace."); return; }
    const phaseKey = `${Math.floor(elapsed / pattern.phases.reduce((sum, phase) => sum + phase.seconds, 0))}-${state.phaseIndex}`;
    if (lastPhase === phaseKey) return;
    lastPhase = phaseKey;
    cue.textContent = state.phase.label;
    circle.dataset.inhale = String(state.phase.inhale);
    const progress = state.phaseElapsed / state.phase.seconds;
    const scale = state.phase.inhale ? 0.65 + 0.35 * progress : 1 - 0.35 * progress;
    circle.style.transition = "none";
    circle.style.transform = `scale(${scale})`;
    void circle.offsetWidth;
    circle.style.transition = `transform ${state.phase.seconds - state.phaseElapsed}s linear, opacity 0.4s linear`;
    circle.style.transform = state.phase.inhale ? "scale(1)" : "scale(0.65)";
  };
  button.addEventListener("click", () => {
    if (startedAt !== null) {
      idle("Stopped. Breathe at your own pace.");
      remaining.textContent = formatClock(Number(durationSelect.value) * 60);
      return;
    }
    startedAt = Date.now();
    patternSelect.disabled = durationSelect.disabled = true;
    button.textContent = "Stop";
    update();
    interval = window.setInterval(update, 100);
  });
  durationSelect.addEventListener("change", () => { remaining.textContent = formatClock(Number(durationSelect.value) * 60); });
  const resync = (): void => { lastPhase = ""; update(); };
  document.addEventListener("visibilitychange", resync);
  motion.addEventListener("change", resync);
  patternSelect.replaceChildren(...BREATH_PATTERNS.map((pattern) => new Option(pattern.title, pattern.id)));
};
