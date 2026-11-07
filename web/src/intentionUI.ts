import { LocalStore, loadIntention, oneLine, saveIntention } from "./intention";
import { dayKeyFor } from "./storage";
import "./dayNotes.css";

export const initIntention = (store: LocalStore) => {
  const panel = document.getElementById("intention-panel");
  if (!panel) return null;
  const form = panel.querySelector<HTMLFormElement>("form")!;
  const input = panel.querySelector<HTMLInputElement>("input")!;
  const title = panel.querySelector<HTMLElement>("h2")!;
  const summary = panel.querySelector<HTMLElement>("#intention-saved")!;
  const text = panel.querySelector<HTMLElement>("#intention-text")!;
  let state = loadIntention(store, dayKeyFor(new Date()));
  let editing = false;
  const render = (): void => {
    panel.hidden = state.skipped;
    const saved = Boolean(state.text) && !editing;
    form.hidden = saved;
    title.hidden = saved;
    summary.hidden = !saved;
    text.textContent = `Today's intention: ${state.text}`;
    input.value = state.text;
    input.setCustomValidity("");
  };
  input.addEventListener("input", () => input.setCustomValidity(""));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = oneLine(input.value, 120);
    if (!value) { input.setCustomValidity("Add a few words, or choose Skip."); input.reportValidity(); return; }
    state = { day: dayKeyFor(new Date()), text: value, skipped: false };
    saveIntention(store, state);
    editing = false;
    render();
  });
  panel.querySelector("#intention-skip")!.addEventListener("click", () => {
    state = { day: dayKeyFor(new Date()), text: "", skipped: true };
    saveIntention(store, state);
    editing = false;
    render();
  });
  panel.querySelector("#intention-edit")!.addEventListener("click", () => { editing = true; render(); input.focus(); });
  for (const chip of panel.querySelectorAll<HTMLButtonElement>("[data-intention]")) {
    chip.addEventListener("click", () => { input.value = chip.textContent ?? ""; input.setCustomValidity(""); input.focus(); });
  }
  const reload = (date = new Date()): void => {
    state = loadIntention(store, dayKeyFor(date));
    editing = false;
    render();
  };
  render();
  return { reload, update: (date: Date): void => { if (state.day !== dayKeyFor(date)) reload(date); } };
};
