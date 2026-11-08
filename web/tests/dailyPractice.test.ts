import { describe, expect, it } from "vitest";
import { DAILY_YOGA_PRACTICES, dailyPracticePair } from "../src/dailyPractice";
import { YOGA_GROUPS } from "../src/yoga";
import { MEDITATION_PRACTICES } from "../src/meditation";

describe("practice of the local day", () => {
  it("selects meditation and desk movements, never pranayama for yoga", () => {
    const breathing = YOGA_GROUPS.find((group) => group.id === "breathing")!.practices;
    expect(DAILY_YOGA_PRACTICES).toEqual(YOGA_GROUPS.filter((group) => group.id !== "breathing").flatMap((group) => group.practices));
    expect(DAILY_YOGA_PRACTICES).toHaveLength(9);
    for (let i = 0; i < 40; i++) {
      const pair = dailyPracticePair(new Date(2026, 10, 7 + i));
      expect(MEDITATION_PRACTICES).toContain(pair.mindfulness);
      expect(DAILY_YOGA_PRACTICES).toContain(pair.yoga);
      expect(breathing).not.toContain(pair.yoga);
      expect(pair.mindfulness).not.toHaveProperty("origin");
      expect(pair.yoga).not.toHaveProperty("origin");
    }
  });
  it("is stable throughout a local calendar day, without saved state", () => {
    const morning = new Date(2026, 10, 7, 0, 0);
    expect(dailyPracticePair(morning)).toEqual(dailyPracticePair(new Date(2026, 10, 7, 23, 59, 59)));
    expect(dailyPracticePair(new Date(morning.getTime()))).toEqual(dailyPracticePair(morning));
  });
  it("covers all practices and never repeats on adjacent dates, across leap days, year and DST boundaries", () => {
    const mindful = new Set();
    const yoga = new Set();
    let previous = dailyPracticePair(new Date(2023, 11, 19, 12));
    for (let i = 0; i < 800; i++) {
      const date = new Date(2023, 11, 20 + i, 12);
      const pair = dailyPracticePair(date);
      expect(pair.mindfulness!.id).not.toBe(previous.mindfulness!.id);
      expect(pair.yoga!.id).not.toBe(previous.yoga!.id);
      previous = pair;
      mindful.add(pair.mindfulness!.id);
      yoga.add(pair.yoga!.id);
    }
    expect(mindful.size).toBe(MEDITATION_PRACTICES.length);
    expect(yoga.size).toBe(DAILY_YOGA_PRACTICES.length);
  });
  it("uses local date parts, not the UTC date or elapsed 24-hour periods", () => {
    const date = new Date(2026, 0, 1);
    date.getUTCDate = () => { throw new Error("UTC day must not be read"); };
    date.toISOString = () => { throw new Error("UTC string must not be read"); };
    expect(dailyPracticePair(date)).toEqual(dailyPracticePair(new Date(2026, 0, 1, 23, 59)));
    const before = dailyPracticePair(new Date(1969, 11, 31));
    const after = dailyPracticePair(new Date(1970, 0, 1));
    expect(before.mindfulness).not.toBe(after.mindfulness);
    expect(before.yoga).not.toBe(after.yoga);
  });
  it("handles invalid dates, empty lists and a single available practice", () => {
    expect(dailyPracticePair(new Date(NaN))).toEqual({ mindfulness: null, yoga: null });
    expect(dailyPracticePair(new Date(), [], [])).toEqual({ mindfulness: null, yoga: null });
    expect(dailyPracticePair(new Date(), []).yoga).not.toBeNull();
    expect(dailyPracticePair(new Date(), undefined, []).mindfulness).not.toBeNull();
    const expected = { mindfulness: MEDITATION_PRACTICES[0], yoga: DAILY_YOGA_PRACTICES[0] };
    for (const day of [7, 8]) {
      expect(dailyPracticePair(new Date(2026, 10, day), [expected.mindfulness], [expected.yoga])).toEqual(expected);
    }
  });
});
