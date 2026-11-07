import { LocalStore, loadIntention, oneLine } from "./intention";
import { dayKeyFor } from "./storage";
import { loadSpot, morningNote, saveSpot, spotDue } from "./saveSpot";

export const initSaveSpot = (store: LocalStore, chime: () => void) => {
  const card = document.getElementById("save-spot");
  const note = document.getElementById("morning-note");
  if (!card || !note) return null;
  const form = card.querySelector<HTMLFormElement>("form")!;
  const input = card.querySelector<HTMLTextAreaElement>("textarea")!;
  const meant = card.querySelector<HTMLElement>("#spot-intention")!;
  const noteText = note.querySelector<HTMLElement>("#morning-text")!;
  let spot = loadSpot(store);
  const refresh = (date = new Date()): void => {
    const text = morningNote(spot, dayKeyFor(date));
    note.hidden = !text;
    noteText.textContent = `Where you left off: ${text}`;
  };
  const open = (manual = false, date = new Date()): void => {
    const day = dayKeyFor(date);
    if (!manual) {
      spot.promptDay = day;
      saveSpot(store, spot);
    }
    const intention = loadIntention(store, day).text;
    meant.textContent = intention ? `Today you meant to: ${intention}` : "";
    meant.hidden = !intention;
    if (card.hidden || card.dataset.day !== day) input.value = spot.savedDay === day ? spot.text : "";
    input.setCustomValidity("");
    card.dataset.day = day;
    card.hidden = false;
    card.scrollIntoView({ block: "center", behavior: "instant" });
    if (manual) input.focus({ preventScroll: true });
    else chime();
  };
  input.addEventListener("input", () => input.setCustomValidity(""));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = oneLine(input.value, 200);
    if (!text) { input.setCustomValidity("Add a starting point, or choose Not today."); input.reportValidity(); return; }
    const day = dayKeyFor(new Date());
    spot = { text, savedDay: day, promptDay: day };
    saveSpot(store, spot);
    card.hidden = true;
    refresh();
  });
  card.querySelector("#spot-skip")!.addEventListener("click", () => {
    spot.promptDay = dayKeyFor(new Date());
    saveSpot(store, spot);
    card.hidden = true;
  });
  note.querySelector("#morning-done")!.addEventListener("click", () => { spot.text = ""; saveSpot(store, spot); refresh(); });
  const reload = (): void => { spot = loadSpot(store); card.hidden = true; refresh(); };
  refresh();
  return {
    open: (): void => open(true), reload,
    update: (date: Date, config: { endOfDay: boolean; endOfDayTime: string }, canPrompt: boolean): void => {
      refresh(date);
      const day = dayKeyFor(date);
      if (!card.hidden && card.dataset.day !== day) card.hidden = true;
      if (canPrompt && spotDue(day, date.getHours(), date.getMinutes(), config.endOfDay, config.endOfDayTime, spot)) open(false, date);
    },
  };
};
