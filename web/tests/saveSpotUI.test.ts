// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { initSaveSpot } from "../src/saveSpotUI";
import { loadSpot } from "../src/saveSpot";

const setup = () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 7, 18));
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  document.body.innerHTML = '<section id="save-spot" hidden><p id="spot-intention"></p><form><textarea></textarea><button type="submit">Save</button></form><button id="spot-skip">Not today</button></section><section id="morning-note"><p id="morning-text"></p><button id="morning-done">Done</button></section>';
  const data = new Map<string, string>();
  const store = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const card = document.getElementById("save-spot")!;
  card.scrollIntoView = vi.fn();
  const chime = vi.fn();
  return { store, card, chime, visibility, ui: initSaveSpot(store, chime)! };
};
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.replaceChildren(); });

it("scrolls an automatic card into view without moving keyboard focus", () => {
  const { card, chime, ui } = setup();
  const previousFocus = document.activeElement;
  ui.update(new Date(), { endOfDay: true, endOfDayTime: "18:00" }, true);
  expect(card.hidden).toBe(false);
  expect(card.scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "instant" });
  expect(document.activeElement).toBe(previousFocus);
  expect(chime).toHaveBeenCalledOnce();
});

it("does not suppress the scheduled prompt after an unfinished manual form or reload", () => {
  const { store, card, chime, ui } = setup();
  ui.open();
  expect(loadSpot(store).promptDay).toBe("");
  ui.reload();
  ui.update(new Date(), { endOfDay: true, endOfDayTime: "18:00" }, true);
  expect(card.hidden).toBe(false);
  expect(chime).toHaveBeenCalledOnce();
  expect(loadSpot(store).promptDay).toBe("2026-11-07");
});

it("brings an unfinished manual form back into view when due without losing its draft", () => {
  const { card, chime, ui } = setup();
  ui.open();
  const input = card.querySelector("textarea")!;
  input.value = "Keep this unfinished draft";
  ui.update(new Date(), { endOfDay: true, endOfDayTime: "18:00" }, true);
  expect(input.value).toBe("Keep this unfinished draft");
  expect(card.scrollIntoView).toHaveBeenCalledTimes(2);
  expect(chime).toHaveBeenCalledOnce();
});

it.each(["save", "skip"])("suppresses the scheduled prompt after an explicit manual %s", (action) => {
  const { card, chime, ui } = setup();
  ui.open();
  if (action === "save") {
    card.querySelector("textarea")!.value = "Read the draft";
    card.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
  } else card.querySelector<HTMLButtonElement>("#spot-skip")!.click();
  ui.reload();
  ui.update(new Date(), { endOfDay: true, endOfDayTime: "18:00" }, true);
  expect(card.hidden).toBe(true);
  expect(chime).not.toHaveBeenCalled();
});

it("waits while hidden, then shows the due card once when visible the same day", () => {
  const { store, card, chime, visibility, ui } = setup();
  visibility.mockReturnValue("hidden");
  ui.update(new Date(), { endOfDay: true, endOfDayTime: "18:00" }, true);
  expect(card.hidden).toBe(true);
  expect(loadSpot(store).promptDay).toBe("");
  expect(chime).not.toHaveBeenCalled();
  visibility.mockReturnValue("visible");
  ui.update(new Date(), { endOfDay: true, endOfDayTime: "18:00" }, true);
  expect(card.hidden).toBe(false);
  expect(chime).toHaveBeenCalledOnce();
  ui.update(new Date(), { endOfDay: true, endOfDayTime: "18:00" }, true);
  expect(chime).toHaveBeenCalledOnce();
});
