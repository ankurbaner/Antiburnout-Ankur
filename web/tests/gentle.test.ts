import { expect, it } from "vitest";
import { DEFAULT_GENTLE, GENTLE_AREAS, filterPractices, isAllowed, loadGentle } from "../src/gentle";
import { CARD_BANDS, createPreviewSelector, practicePool, selectCardPractice } from "../src/cards";
import { DAILY_PRACTICES, dailyPractice } from "../src/dailyPractice";
import { GENTLE_PRACTICES, YOGA_GROUPS, yogaGroupsFor } from "../src/yoga";
import { allowedProtocolOrder, nextProtocol } from "../src/protocols";
import { loadConfig, saveConfig } from "../src/storage";

const combinations = Array.from({ length: 16 }, (_, bits) => loadGentle(Object.fromEntries(GENTLE_AREAS.map((area, i) => [area, Boolean(bits & (1 << i))]))));

it("defaults legacy and malformed settings to off and persists only explicit booleans", () => {
  for (const raw of [null, "true", [], { back: "true", neck: 1 }]) expect(loadGentle(raw)).toEqual(DEFAULT_GENTLE);
  let data = JSON.stringify({ gentle: { back: true, wrists: true, pregnancy: "true", unknown: true }, snoozeMinutes: 10 });
  const storage = { getItem: () => data, setItem: (_key: string, value: string) => { data = value; }, removeItem: () => {} };
  const config = loadConfig(storage);
  expect(config.gentle).toEqual({ back: true, neck: false, wrists: true, pregnancy: false });
  saveConfig(storage, config);
  expect(loadConfig(storage)).toEqual(config);
  data = "{}";
  const first = loadConfig(storage);
  first.gentle.back = true;
  expect(loadConfig(storage).gentle).toEqual(DEFAULT_GENTLE);
  expect(filterPractices([], DEFAULT_GENTLE)).toEqual([]);
});

it("conservatively hides tagged yoga with readable notes and alternatives, retaining all practices by default", () => {
  expect(yogaGroupsFor().flatMap((g) => g.practices)).toEqual(YOGA_GROUPS.flatMap((g) => g.practices));
  for (const gentle of combinations.slice(1)) {
    const groups = yogaGroupsFor(gentle);
    expect(groups.some((g) => g.hidden?.length)).toBe(true);
    expect(groups.flatMap((g) => g.practices).every((p) => isAllowed(p, gentle))).toBe(true);
    expect(groups[groups.length - 1]?.practices).toEqual(GENTLE_PRACTICES);
  }
  expect(isAllowed({ id: "twist" }, { ...DEFAULT_GENTLE, back: true })).toBe(false);
  expect(isAllowed({ id: "neck" }, { ...DEFAULT_GENTLE, neck: true })).toBe(false);
  expect(isAllowed({ id: "wrists" }, { ...DEFAULT_GENTLE, wrists: true })).toBe(false);
  expect(isAllowed({ id: "cat-cow" }, { ...DEFAULT_GENTLE, pregnancy: true })).toBe(false);
});

it("never empties a reminder pool, repeats consecutively or loses effective-pool coverage for any setting combination", () => {
  for (const gentle of combinations) for (const meeting of [false, true]) for (const time of ["morning", "afternoon", "evening"] as const) for (const stretch of [0, 3600, 6000]) {
    const pool = practicePool(stretch, meeting, time, gentle);
    expect(pool.length).toBeGreaterThanOrEqual(2);
    expect(pool.every((p) => isAllowed(p, gentle))).toBe(true);
    const preview = createPreviewSelector();
    let previous: string | null = null;
    let previousPreview: string | null = null;
    const seen = new Set();
    const seenPreview = new Set();
    for (let i = 0; i < pool.length * 3; i++) {
      const next = selectCardPractice(stretch, meeting, previous, i, time, gentle);
      const nextPreview = preview(stretch, meeting, null, i, time, gentle);
      expect(next.id).not.toBe(previous);
      expect(nextPreview.id).not.toBe(previousPreview);
      previous = next.id;
      previousPreview = nextPreview.id;
      seen.add(next.id);
      seenPreview.add(nextPreview.id);
    }
    expect(seen).toEqual(new Set(pool.map((p) => p.id)));
    expect(seenPreview).toEqual(seen);
  }
  const all = combinations[15];
  expect(filterPractices(CARD_BANDS[2], all)).toHaveLength(0);
  expect(practicePool(6000, false, "evening", all)).toEqual(GENTLE_PRACTICES);
});

it("chooses only allowed daily practices, deterministically per date and settings without adjacent-day repeats", () => {
  for (const gentle of combinations) {
    let previous = "";
    for (let i = 0; i < 80; i++) {
      const date = new Date(2026, 9, 1 + i);
      const practice = dailyPractice(date, undefined, gentle)!;
      expect(isAllowed(practice, gentle)).toBe(true);
      expect(dailyPractice(new Date(date.getTime()), undefined, { ...gentle })).toBe(practice);
      expect(practice.id).not.toBe(previous);
      previous = practice.id;
    }
  }
  const all = combinations[15];
  expect(GENTLE_PRACTICES).toContain(dailyPractice(new Date(), [DAILY_PRACTICES.find((p) => p.id === "twist")!], all));
});

it("filters reset protocols with non-repeating safe fallbacks, including meeting mode", () => {
  for (const gentle of combinations) for (const meeting of [false, true]) {
    const pool = allowedProtocolOrder(meeting, gentle);
    expect(pool.length).toBeGreaterThanOrEqual(2);
    expect(pool.every((id) => isAllowed({ id }, gentle))).toBe(true);
    for (const id of pool) {
      expect(nextProtocol(id, pool).id).not.toBe(id);
      expect(pool).toContain(nextProtocol(id, pool).id);
    }
  }
  expect(allowedProtocolOrder(false, combinations[15])).toEqual(["water", "gentle-eyes", "gentle-shoulders"]);
});
