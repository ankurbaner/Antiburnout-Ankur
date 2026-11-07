import { expect, it } from "vitest";
import { loadSpot, morningNote, saveSpot, spotDue, validClock } from "../src/saveSpot";
import { loadConfig } from "../src/storage";

it("defaults legacy settings to 18:00 and validates saved clocks", () => {
  for (const endOfDayTime of [undefined, "25:00", "18:60", "8:00", null]) {
    expect(loadConfig({ getItem: () => JSON.stringify({ endOfDayTime }), setItem: () => {}, removeItem: () => {} })).toMatchObject({ endOfDay: true, endOfDayTime: "18:00" });
  }
  expect(validClock("00:00")).toBe(true);
  expect(validClock("23:59")).toBe(true);
});
it("shows at or after the local time once daily, unless already saved, dismissed or disabled", () => {
  const empty = { text: "", savedDay: "", promptDay: "" };
  expect(spotDue("2026-11-07", 17, 59, true, "18:00", empty)).toBe(false);
  expect(spotDue("2026-11-07", 18, 0, true, "18:00", empty)).toBe(true);
  expect(spotDue("2026-11-07", 23, 59, true, "18:00", empty)).toBe(true);
  expect(spotDue("2026-11-07", 18, 0, false, "18:00", empty)).toBe(false);
  expect(spotDue("2026-11-07", 18, 0, true, "bad", empty)).toBe(false);
  expect(spotDue("2026-11-07", NaN, 0, true, "18:00", empty)).toBe(false);
  for (const state of [{ ...empty, savedDay: "2026-11-07" }, { ...empty, promptDay: "2026-11-07" }]) expect(spotDue("2026-11-07", 18, 0, true, "18:00", state)).toBe(false);
  expect(spotDue("2026-11-08", 18, 0, true, "18:00", { ...empty, promptDay: "2026-11-07" })).toBe(true);
});
it("restores one-line notes only on later days and tolerates broken storage", () => {
  let data = "broken";
  const store = { getItem: () => data, setItem: (_key: string, value: string) => { data = value; }, removeItem: () => {} };
  expect(loadSpot(store)).toEqual({ text: "", savedDay: "", promptDay: "" });
  saveSpot(store, { text: "Read the draft", savedDay: "2026-11-07", promptDay: "2026-11-07" });
  const spot = loadSpot(store);
  expect(morningNote(spot, "2026-11-07")).toBe("");
  expect(morningNote(spot, "2026-11-08")).toBe("Read the draft");
  expect(morningNote(spot, "2026-11-06")).toBe("");
  data = JSON.stringify({ text: "x".repeat(300), savedDay: 5, promptDay: null });
  expect(loadSpot(store)).toMatchObject({ savedDay: "", promptDay: "" });
  expect(loadSpot(store).text).toHaveLength(200);
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => {} };
  expect(loadSpot(blocked).text).toBe("");
  expect(() => saveSpot(blocked, spot)).not.toThrow();
});
