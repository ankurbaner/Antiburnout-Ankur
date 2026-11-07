// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { initSaveSpot } from "../src/saveSpotUI";

const setup = () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 7, 18));
  document.body.innerHTML = '<section id="save-spot" hidden><p id="spot-intention"></p><form><textarea></textarea><button type="submit">Save</button></form><button id="spot-skip">Not today</button></section><section id="morning-note"><p id="morning-text"></p><button id="morning-done">Done</button></section>';
  const data = new Map<string, string>();
  const store = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const card = document.getElementById("save-spot")!;
  card.scrollIntoView = vi.fn();
  const chime = vi.fn();
  return { store, card, chime, ui: initSaveSpot(store, chime)! };
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
